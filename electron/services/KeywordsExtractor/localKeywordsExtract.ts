import nlp from 'compromise';
import { Language } from '../../../shared/profile.interface';
import { EN_STOP_WORDS, FR_STOP_WORDS, TECH_WHITELIST } from './stopWords.const';
import { KeywordsAffinityDatabase } from './KeywordsAffinityDatabase';

export class LocalkeywordsExtractor {
    private static STOP_WORDS = new Set();
    private static language: Language = Language.ENGLISH;

    public static setStopWords(language: Language) {
        this.language = language;
        if (language === Language.FRENCH) {
            this.STOP_WORDS = new Set([
                ...FR_STOP_WORDS.fillers,
                ...FR_STOP_WORDS.jobContext,
                ...FR_STOP_WORDS.structural,
                ...FR_STOP_WORDS.verbs
            ].map(word => word.trim().toLowerCase()));
        }
        else if (language === Language.ENGLISH) {
            this.STOP_WORDS = new Set([
                ...EN_STOP_WORDS.fillers,
                ...EN_STOP_WORDS.jobContext,
                ...EN_STOP_WORDS.structural,
                ...EN_STOP_WORDS.verbs
            ].map(word => word.trim().toLowerCase()));
        }
    }

    public static extractKeywords(text: string, language: Language = Language.ENGLISH): string[] {
        if (!text || text.trim().length === 0) return [];
        if (language) this.setStopWords(language);
        const dbAffinity = KeywordsAffinityDatabase.getInstance();
        const normalizedText = this.normalizeText(text);
        console.log('Normalized Text:', normalizedText);

        const acronyms = this.extractAcronyms(normalizedText);
        console.log('Extracted Acronyms:', acronyms);

        const nouns = this.extractNouns(normalizedText);
        console.log('Extracted Nouns:', nouns);

        const rakeChunks = this.extractRakeChunks(normalizedText);
        console.log('Extracted RAKE Chunks:', rakeChunks);

        const allCandidates = [...acronyms, ...nouns, ...rakeChunks];
        const candidateScores: Map<string, { original: string; clean: string; count: number }> = new Map();

        for(const rawCandidate of allCandidates) {
            const candidate = rawCandidate.trim();
            const cleaned = candidate.toLowerCase();
            const candidateWords = cleaned.split(' ').filter(w => w.length > 0);
            const isPureStopWords = candidateWords.every(word => this.STOP_WORDS.has(word.trim().toLowerCase()));
            const globalCount = dbAffinity.getKeywordGlobalCount(cleaned);
            const affinityMultiplier = 1 + Math.log(globalCount + 1);

            if (
                (!TECH_WHITELIST.has(cleaned) && cleaned.length <= 2) || 
                cleaned.length > 30 ||
                this.STOP_WORDS.has(cleaned) || 
                isPureStopWords ||
                /^\d+$/.test(cleaned) || 
                candidateScores.has(cleaned)
            ) {
                continue;
            }

            const words = cleaned.split(' ').filter(w => w.length > 0);

            if (words.length > 0) {
                const firstWord = words[0];
                const lastWord = words[words.length - 1];

                if (
                    this.STOP_WORDS.has(firstWord) || 
                    this.STOP_WORDS.has(lastWord) ||
                    /^\d+$/.test(firstWord) ||
                    /^\d+$/.test(lastWord) ||
                    words.some(w => /^\d+$/.test(w))
                ) {
                    continue;
                }
            }

            try {
                const escaped = this.escapeRegExp(candidate);
                let count = (normalizedText.match(new RegExp(`\\b${escaped}\\b`, 'gi')) || []).length;

                if (count === 0) {
                    count = (normalizedText.match(new RegExp(escaped, 'gi')) || []).length;
                }
                const finalScore = count * affinityMultiplier;
                if (count > 0) {
                    candidateScores.set(cleaned, {
                        original: candidate,
                        clean: cleaned,
                        count: finalScore
                    });
                }
            } catch (error) {
                console.warn(`Error processing candidate "${candidate}":`, error);
            }
        }

        const finalCandidates = Array.from(candidateScores.values())
        const filteredCandidates = finalCandidates.filter((itemA) => {
            const isSubset = finalCandidates.some(itemB => 
                itemB.clean !== itemA.clean && 
                itemB.clean.includes(itemA.clean)
                // itemB.count >= itemA.count
            );
            return !isSubset; 
        });

        const result = filteredCandidates
            .sort((a, b) => b.count - a.count)
            .map(item => item.original)
            .slice(0, 25);
        console.log('Final Extracted Keywords:', result);

        dbAffinity.incrementKeywords(result);
        dbAffinity.runEvictionPolicy();
        return result;
    }

    private static extractRakeChunks(text: string): string[] {
        const sortedStopWords = Array.from(this.STOP_WORDS)
            .sort((a, b) => (b as string).length - (a as string).length);
        const regexStopWords = new RegExp(`\\b(${sortedStopWords.join('|')})\\b`, 'gi');
        const cleanText = text.replace(/\s+/g, ' ');

        const chunks = cleanText
            .replace(regexStopWords, '.')
            .split(/[.,;:!?\n()[\]{}]/)
            .map(chunk => chunk.trim())
            .filter(chunk => {
                const wordCount = chunk.split(/\s+/).length;
                return chunk.length > 1 && wordCount <= 3 && !/^\d+$/.test(chunk);
            })
        
        const cleanedChunks = chunks.map(chunk => {
            return chunk.replace(/^[^a-zA-Z0-9+#]+|[^a-zA-Z0-9+#]+$/g, '').trim();
        }).filter(chunk => chunk.length > 1);

        return Array.from(new Set(cleanedChunks));
    }

    private static extractAcronyms(text: string): string[] {
        const doc = nlp(text);
        return (doc.acronyms().out('array') as string[])
            .map(a => a.replace(/[^a-zA-Z0-9+#]/g, '').trim())
            .filter(a => a.length > 1);
    }

    private static extractNouns(text: string): string[] {
        const sentences = text.split(/[.?!;\n]+/).map(s => s.trim()).filter(s => s.length > 0);
        const nouns: string[] = [];
        for (const sentence of sentences) {
            const sentDoc = nlp(sentence);
            const sentNouns = sentDoc.nouns().out('array');

            for (const noun of sentNouns) {
                const cleanNoun = noun
                    .replace(/[()[\]{}:;,!?•*-]/g, ' ')
                    .replace(/\s+/g, ' ')
                    .replace(/\b[dlsstcm]\b$/gi, '')
                    .replace(/^\b[dlsstcm]\b/gi, '')
                    .trim();
                const words = cleanNoun.split(' ');
                if (cleanNoun.length <= 1 || words.length >= 5) continue;
                const finalWords = [...words];
                while (finalWords.length > 0 && this.STOP_WORDS.has(finalWords[0].toLowerCase())) {
                    finalWords.shift();
                }
                while (finalWords.length > 0 && this.STOP_WORDS.has(finalWords[finalWords.length - 1].toLowerCase())) {
                    finalWords.pop();
                }
                const finalNoun = finalWords.join(' ').trim();
                if (
                    finalNoun.length > 1 && 
                    !this.STOP_WORDS.has(finalNoun.toLowerCase()) && 
                    !/^\d+$/.test(finalNoun)
                ) {
                    nouns.push(finalNoun);
                }
            }
        }
        return nouns;
    }

    private static escapeRegExp(string: string): string {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    private static normalizeText(text: string): string {
        // remove accents
        const accentsMap: Record<string, string> = {
            'á': 'a', 'à': 'a', 'ä': 'a', 'â': 'a',
            'é': 'e', 'è': 'e', 'ë': 'e', 'ê': 'e',
            'í': 'i', 'ì': 'i', 'ï': 'i', 'î': 'i',
            'ó': 'o', 'ò': 'o', 'ö': 'o', 'ô': 'o',
            'ú': 'u', 'ù': 'u', 'ü': 'u', 'û': 'u',
            'ç': 'c', 'Ç': 'C', 'À': 'A', 'Á': 'A', 'Ä': 'A', 'Â': 'A',
            'ñ': 'n', 'Ñ': 'N', 'É': 'E', 'È': 'E', 'Ë': 'E', 'Ê': 'E',
            'Í': 'I', 'Ì': 'I', 'Ï': 'I', 'Î': 'I',
            'Ó': 'O', 'Ò': 'O', 'Ö': 'O', 'Ô': 'O',
            'Ú': 'U', 'Ù': 'U', 'Ü': 'U', 'Û': 'U'
        };
        let normalized = text;
        normalized = normalized.replace(/^[•\s]+/gm, '')
            .replace(/lÔÇÖ/gi, "l'")
            .replace(/dÔÇÖ/gi, "d'")
            .replace(/jÔÇÖ/gi, "j'")
            .replace(/nÔÇÖ/gi, "n'")
            .replace(/cÔÇÖ/gi, "c'")
            .replace(/sÔÇÖ/gi, "s'")
            .replace(/├Ç/gi, 'A')
            .replace(/ÔÇÖ/g, "'")
            .replace(/[’'`]/g, "'")
            .replace(/┬½/g, ' ')
            .replace(/┬╗/g, ' ')
            .replace(/[«»“”·–]/g, ' ');
        if (this.language === Language.FRENCH) {
            normalized = normalized.replace(/\b[ldcjnmtst]\b'/gi, ' ');
        } else if (this.language === Language.ENGLISH) {
            normalized = normalized.replace(/'[st]\b/gi, ' ');
        }
        for (const [accent, replacement] of Object.entries(accentsMap)) {
            normalized = normalized.replace(new RegExp(this.escapeRegExp(accent), 'g'), replacement);
        }
        normalized = normalized.replace(/'/g, ' ');
        normalized = normalized.replace(/\s+/g, ' ');
        return normalized;
    }
}