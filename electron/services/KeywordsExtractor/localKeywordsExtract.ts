import nlp from 'compromise';
import { Language } from '../../../shared/profile.interface';
import { EN_STOP_WORDS, FR_STOP_WORDS, TECH_WHITELIST } from './stopWords.const';
import { KeywordsAffinityDatabase } from './KeywordsAffinityDatabase';

export interface ScoredCandidate {
    original: string;
    clean: string;
    count: number;
}

export class LocalkeywordsExtractor {
    private static STOP_WORDS = new Set<string>();
    // Subset of STOP_WORDS used only to define RAKE phrase *boundaries* (true
    // function words: articles, prepositions, pronouns). jobContext/verbs words
    // like "experience" or "skilled" are real content words that happen to be
    // resume-irrelevant — treating them as hard delimiters mid-phrase shreds
    // otherwise-good compounds (e.g. "extensive experience in integrating with
    // vendors" becomes orphan fragments "extensive" / "integrating"). They're
    // still rejected, just at the final validity-filter stage instead, which
    // discards the whole candidate rather than mangling it into pieces.
    private static BOUNDARY_WORDS = new Set<string>();
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
            this.BOUNDARY_WORDS = new Set([
                ...FR_STOP_WORDS.fillers,
                ...FR_STOP_WORDS.structural
            ].map(word => word.trim().toLowerCase()));
        }
        else if (language === Language.ENGLISH) {
            this.STOP_WORDS = new Set([
                ...EN_STOP_WORDS.fillers,
                ...EN_STOP_WORDS.jobContext,
                ...EN_STOP_WORDS.structural,
                ...EN_STOP_WORDS.verbs
            ].map(word => word.trim().toLowerCase()));
            this.BOUNDARY_WORDS = new Set([
                ...EN_STOP_WORDS.fillers,
                ...EN_STOP_WORDS.structural
            ].map(word => word.trim().toLowerCase()));
        }
    }

    /**
     * Checks a single word against STOP_WORDS, tolerant of simple plural/singular
     * mismatches (e.g. "team" is listed but "teams" appears in the text).
     * This is intentionally a cheap heuristic, not real lemmatization: it only
     * strips a single trailing "s" on words long enough that doing so is safe.
     */
    private static isStopWord(word: string): boolean {
        const w = word.trim().toLowerCase();
        if (!w) return true;
        if (this.STOP_WORDS.has(w)) return true;
        if (w.length > 3 && w.endsWith('s') && this.STOP_WORDS.has(w.slice(0, -1))) return true;
        if (w.length > 2 && this.STOP_WORDS.has(w + 's')) return true;
        return false;
    }

    private static isPureStopPhrase(cleaned: string): boolean {
        const words = cleaned.split(' ').filter(w => w.length > 0);
        return words.length > 0 && words.every(w => this.isStopWord(w));
    }

    private static hasStopWord(words: string[]): boolean {
        return words.some(w => this.isStopWord(w));
    }

    /**
     * Runs extraction + scoring only, without the final substring-based subset
     * filter or truncation to 25. Use this when you want to plug in a smarter
     * dedup strategy downstream (see KeywordSemanticEnhancer) instead of the
     * plain-string dedup that extractKeywords() applies below.
     */
    // Common section markers that bound the actual requirements/duties content
    // in most ATS-generated postings (Greenhouse, Lever, etc.). This is a
    // heuristic, not a parser: postings that don't follow this shape are left
    // untouched (see stripBoilerplate). It won't catch every case — e.g. a
    // mission statement worked INTO the requirements section won't be trimmed
    // — but it removes the two biggest, most reliable sources of boilerplate
    // noise: the company pitch before the role is described, and the
    // benefits/EEO/legal block after it.
    private static LEADING_CUTOFF_MARKERS = [
        /what you('|')ll do/i, /what you will do/i, /what we('|')re looking for/i,
        /what we look for/i, /responsibilities/i, /requirements/i, /qualifications/i,
        /the role/i, /about the role/i
    ];
    private static TRAILING_CUTOFF_MARKERS = [
        /benefits\s*&?\s*perks/i, /compensation\s*&?\s*benefits/i, /equal opportunity employer/i,
        /notice to (candidates|applicants)/i, /how to apply/i, /about the company/i,
        /diversity,?\s*equity/i
    ];

    /**
     * Trims the company-mission-blurb intro and the benefits/EEO/legal tail
     * when a recognizable marker is found, since neither ever contains
     * resume-relevant skill signal but both inflate word-frequency scoring
     * uniformly with the rest of the text. Conservative by design: if no
     * marker is found, the text is returned unchanged rather than guessing.
     */
    private static stripBoilerplate(text: string): string {
        let result = text;

        let earliestLeadIdx = -1;
        for (const marker of this.LEADING_CUTOFF_MARKERS) {
            const match = result.match(marker);
            if (match && match.index !== undefined) {
                if (earliestLeadIdx === -1 || match.index < earliestLeadIdx) {
                    earliestLeadIdx = match.index;
                }
            }
        }
        // Only cut if there's a meaningful intro before the marker — avoids
        // trimming postings that open directly with "Responsibilities:".
        if (earliestLeadIdx > 80) {
            result = result.slice(earliestLeadIdx);
        }

        let earliestTailIdx = -1;
        for (const marker of this.TRAILING_CUTOFF_MARKERS) {
            const match = result.match(marker);
            if (match && match.index !== undefined) {
                if (earliestTailIdx === -1 || match.index < earliestTailIdx) {
                    earliestTailIdx = match.index;
                }
            }
        }
        if (earliestTailIdx > 0) {
            result = result.slice(0, earliestTailIdx);
        }

        return result;
    }

    public static extractCandidates(text: string, language: Language = Language.ENGLISH): ScoredCandidate[] {
        if (!text || text.trim().length === 0) return [];
        this.setStopWords(language);
        const dbAffinity = KeywordsAffinityDatabase.getInstance();
        const normalizedText = this.normalizeText(this.stripBoilerplate(text));

        const acronyms = this.extractAcronyms(normalizedText);
        const nouns = this.extractNouns(normalizedText);
        const rakeChunks = this.extractRakeChunks(normalizedText);

        const acronymSet = new Set(acronyms.map(a => a.trim().toLowerCase()));
        const nounSet = new Set(nouns.map(n => n.trim().toLowerCase()));

        const allCandidates = [...acronyms, ...nouns, ...rakeChunks];
        const candidateScores: Map<string, ScoredCandidate> = new Map();

        for (const rawCandidate of allCandidates) {
            const candidate = rawCandidate.trim();
            const cleaned = candidate.toLowerCase();
            const words = cleaned.split(' ').filter(w => w.length > 0);
            const isWhitelisted = this.isLegitimateTechMatch(cleaned, candidate);

            if (
                (!isWhitelisted && cleaned.length <= 2) ||
                cleaned.length > 30 ||
                this.isStopWord(cleaned) ||
                this.isPureStopPhrase(cleaned) ||
                this.hasStopWord(words) ||
                /^\d+$/.test(cleaned) ||
                words.some(w => /^\d+$/.test(w)) ||
                candidateScores.has(cleaned)
            ) {
                continue;
            }

            const globalCount = dbAffinity.getKeywordGlobalCount(cleaned);
            const affinityMultiplier = 1 + Math.log(globalCount + 1);

            let typeMultiplier = 1.0;
            if (isWhitelisted) {
                typeMultiplier = 3.0;
            }
            else if (acronymSet.has(cleaned)) {
                typeMultiplier = 1.8;
            } else if (nounSet.has(cleaned)) {
                typeMultiplier = 1.3;
            }

            try {
                const escaped = this.escapeRegExp(candidate);
                let count = (normalizedText.match(new RegExp(`\\b${escaped}\\b`, 'gi')) || []).length;

                if (count === 0) {
                    count = (normalizedText.match(new RegExp(escaped, 'gi')) || []).length;
                }

                const finalScore = count * affinityMultiplier * typeMultiplier;

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

        return Array.from(candidateScores.values());
    }

    private static isLegitimateTechMatch(cleaned: string, original: string): boolean {
        if (!cleaned || cleaned.trim().length === 0) return false;
        if (TECH_WHITELIST.has(cleaned)) {
                if (cleaned.length === 1) {
                return original === original.toUpperCase();
            }
            return true;
        }

        const wordsCleaned = cleaned.split(/[\s,;:()/-]+/).filter(w => w.length > 0);
        const wordsOriginal = original.split(/[\s,;:()/-]+/).filter(w => w.length > 0);

        for (let i = 0; i < wordsCleaned.length; i++) {
            const word = wordsCleaned[i];
            const origWord = wordsOriginal[i] || word;

            if (TECH_WHITELIST.has(word)) {
                if (word.length === 1) {
                    if (origWord === origWord.toUpperCase()) {
                        return true;
                    }
                } else {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Convenience wrapper for the purely-offline, no-embedding path: applies a
     * plain substring-based subset filter (same behavior as before) on top of
     * extractCandidates(), truncates to 25, and updates the affinity DB. Prefer
     * KeywordSemanticEnhancer.cluster() on extractCandidates() when an embedder
     * is available — it catches paraphrase-level duplicates this can't.
     */
    public static extractKeywords(text: string, language: Language = Language.ENGLISH): string[] {
        const dbAffinity = KeywordsAffinityDatabase.getInstance();
        const finalCandidates = this.extractCandidates(text, language);

        // Drop a candidate only if it's wholly contained (as whole words) inside a
        // longer candidate that scores at least as well — e.g. drop "management"
        // in favor of "project management", but never drop "java" just because
        // "javascript" also appears (plain substring containment was doing that).
        const filteredCandidates = finalCandidates.filter((itemA) => {
            const isSubset = finalCandidates.some(itemB => {
                if (itemB.clean === itemA.clean) return false;
                const boundaryRe = new RegExp(`\\b${this.escapeRegExp(itemA.clean)}\\b`);
                return boundaryRe.test(itemB.clean) && itemB.count >= itemA.count;
            });
            return !isSubset;
        });

        const result = filteredCandidates
            .sort((a, b) => b.count - a.count)
            .map(item => item.original)
            .slice(0, 25);

        dbAffinity.incrementKeywords(result);
        dbAffinity.runEvictionPolicy();
        return result;
    }

    private static extractRakeChunks(text: string): string[] {
        const sortedStopWords = Array.from(this.BOUNDARY_WORDS)
            .map(w => this.escapeRegExp(w as string))
            .sort((a, b) => b.length - a.length);
        const regexStopWords = new RegExp(`\\b(${sortedStopWords.join('|')})\\b`, 'gi');
        const cleanText = text.replace(/\s+/g, ' ');

        const chunks = cleanText
            .replace(regexStopWords, '.')
            .split(/[.,;:!?\n()[\]{}]/)
            .map(chunk => chunk.trim())
            .filter(chunk => {
                const wordCount = chunk.split(/\s+/).length;
                return chunk.length > 1 && wordCount <= 3 && !/^\d+$/.test(chunk);
            });

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
                    .replace(/\b[dlsstcmjn]\b$/gi, '')
                    .replace(/^\b[dlsstcmjn]\b/gi, '')
                    .trim();
                const words = cleanNoun.split(' ').filter((w: string) => w.length > 0);
                if (cleanNoun.length <= 1 || words.length >= 5) continue;

                // Strip stop words wherever they occur, not just at the edges.
                const finalWords = words.filter((w: string) => !this.isStopWord(w) && !/^\d+$/.test(w));
                const finalNoun = finalWords.join(' ').trim();

                if (
                    finalNoun.length > 1 &&
                    !this.isStopWord(finalNoun) &&
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
            // Covers 's, 't (don't), 'd (we'd), 'll (you'll), 're (you're), 've (I've), 'm (I'm)
            // Previously only 's/'t were handled, leaving orphan letters like the "d" in
            // "we'd love" to survive as their own token and glue onto the next word.
            normalized = normalized.replace(/'(s|t|d|ll|re|ve|m)\b/gi, ' ');
        }
        for (const [accent, replacement] of Object.entries(accentsMap)) {
            normalized = normalized.replace(new RegExp(this.escapeRegExp(accent), 'g'), replacement);
        }
        normalized = normalized.replace(/'/g, ' ');
        normalized = normalized.replace(/\s+/g, ' ');
        return normalized;
    }
}