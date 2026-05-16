import nlp from 'compromise';

const EN_STOP_WORDS = [
    'the', 'and', 'is', 'in', 'at', 'of', 'a', 'to', 'for', 'with', 'on', 'by', 'as', 'an', 'from',
    'experience', 'years', 'team', 'profil', 'candidate', 'mission', 'project', 'knowledge', 'skills'
];

const FR_STOP_WORDS = [
    'le', 'la', 'les', 'des', 'un', 'une', 'en', 'pour', 'dans', 'par', 'sur', 'avec', 'pour', 'qui',
    'expérience', 'années', 'équipe', 'profil', 'candidat', 'mission', 'projet', 'connaissance', 'compétences'
];

export class LocalkeywordsExtractor {
    private static STOP_WORDS = new Set([...EN_STOP_WORDS, ...FR_STOP_WORDS]);

    public static extractKeywords(text: string): string[] {
        if (!text || text.trim().length === 0) return [];

        const candidateScores: Map<string, { original: string; clean: string; count: number }> = new Map();
        const sanitizedText = this.normalizeText(text);
        const doc = nlp(sanitizedText);

        // POS tagging
        const nouns = doc.nouns().out('array'); // groups of words that are nouns
        const acronyms = doc.acronyms().out('array'); // terms with all capital letters or acronyms

        // RAKE
        const regexStopWords = new RegExp(`\\b(${Array.from(this.STOP_WORDS).join('|')})\\b`, 'gi');
        const rakeChunks = sanitizedText
            .replace(regexStopWords, '.')
            .split(/[.,;:!?\n]/)
            .map(chunk => chunk.trim())
            .filter(chunk => chunk.length > 1);

        const candidates = [...nouns, ...acronyms, ...rakeChunks] as string[];
        console.log('extracted nouns:', nouns);
        console.log('extracted acronyms:', acronyms);
        console.log('extracted rake chunks:', rakeChunks);

        for (const rawCandidate of candidates) {
            const candidate = rawCandidate.trim().replace(/^[^a-zA-Z0-9+#]+|[^a-zA-Z0-9+#]+$/g, '');
            const cleaned = candidate.toLowerCase();

            if (cleaned.length < 1 || cleaned.length > 35 ||
                this.STOP_WORDS.has(cleaned) ||
                /^\d+$/.test(cleaned) ||
                candidateScores.has(cleaned)
            ) continue;

            // delete candidates with more than 3 words
            const wordCount = cleaned.split(/\s+/).length;
            if (wordCount > 3) continue;

            const words = candidate.split(/\s+/);
            const filteredWords = words.filter(w => !this.STOP_WORDS.has(w.toLowerCase()));
            if (filteredWords.length === 0) continue;

            try {
                const escaped = this.escapeRegExp(candidate.trim());
                const matchCount = (sanitizedText.match(new RegExp(`\\b${escaped}\\b`, 'gi')) || []).length;

                const count = matchCount > 0 ? matchCount : (sanitizedText.match(new RegExp(escaped, 'gi')) || []).length;

                if (count > 0) {
                    candidateScores.set(cleaned, { 
                        original: candidate, 
                        clean: cleaned, 
                        count: count
                    });
                }
            } catch (err) {
                console.error(`Error processing candidate "${candidate}":`, err);
            }
        }

        const finalCandidates = Array.from(candidateScores.values());
        // delete candidates that are subsets of other candidates with equal or higher count
        const filteredCandidates = finalCandidates.filter((itemA) => {
            const isSubset = finalCandidates.some(itemB => 
                itemB.clean !== itemA.clean && 
                itemB.clean.includes(itemA.clean) && 
                itemB.count >= itemA.count
            );
            return !isSubset;
        });

        return filteredCandidates.sort((a, b) => b.count - a.count).slice(0, 20).map(item => item.original);
    }

    private static escapeRegExp(string: string): string {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    private static normalizeText(text: string): string {
        return text
            .replace(/['’'’`]/g, " ")
            .replace(/[()[\]{}:;,!?•\-*]/g, " ");
    }
}