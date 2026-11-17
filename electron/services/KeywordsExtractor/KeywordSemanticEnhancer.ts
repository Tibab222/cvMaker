import { cosineSimilarity } from '../../utils/math';
import { ScoredCandidate } from './localKeywordsExtract';

export type EmbedFn = (text: string) => Promise<Float32Array>;

export class KeywordSemanticEnhancer {
    /**
     * Cluster keywords based on semantic similarity using embeddings.
     * @param candidates - Array of scored candidate keywords.
     * @param embed - Function to generate embeddings for a given text.
     */
    public static async cluster(
        candidates: ScoredCandidate[],
        embed: EmbedFn,
        threshold = 0.85,
        limit = 25
    ): Promise<string[]> {
        if (candidates.length === 0) return [];

        const sorted = [...candidates].sort((a, b) => b.count - a.count);

        const vectors: Float32Array[] = [];
        for (const c of sorted) {
            vectors.push(await embed(c.clean));
        }

        const representatives: { candidate: ScoredCandidate; vector: Float32Array; mergedCount: number }[] = [];

        for (let i = 0; i < sorted.length; i++) {
            const candidate = sorted[i];
            const vector = vectors[i];

            const match = representatives.find(rep => cosineSimilarity(vector, rep.vector) >= threshold);

            if (match) {
                match.mergedCount += candidate.count;
            } else {
                representatives.push({ candidate, vector, mergedCount: candidate.count });
            }
        }

        return representatives
            .sort((a, b) => b.mergedCount - a.mergedCount)
            .slice(0, limit)
            .map(r => r.candidate.original);
    }
}