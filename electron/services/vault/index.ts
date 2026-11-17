import { Language } from "../../../shared/profile.interface";
import { JobApplicationManager } from "../jobApplications/jobApplicationManager";
import { LocalkeywordsExtractor } from "../KeywordsExtractor/localKeywordsExtract";
import { ProfileService } from "../ProfileService";
import { VectorService } from "../VectorService";
import { VaultManager } from "./VaultManager";

let instance: VaultManager | null = null;

/** App-wide resume vault, stored in the open profile (database row + PDF in <profile>/vault/). */
export function getVaultManager(): VaultManager {
    if (!instance) {
        const jobs = JobApplicationManager.getInstance();
        const profiles = ProfileService.getInstance();
        instance = new VaultManager({
            getDb: () => jobs.getDb(),
            isReady: () => jobs.isConnected(),
            getProfileDir: () => profiles.getCurrentProfilePath(),
            getProfileLanguage: async () => (await profiles.getCurrentProfile())?.profile.language ?? Language.ENGLISH,
            // reading a resume must not teach the affinity model: it learns from offers the user works on
            extractKeywords: (text, language) => LocalkeywordsExtractor.extractKeywords(text, language, { recordAffinity: false }),
            embed: (text) => VectorService.getInstance().generateEmbedding(text),
        });
    }
    return instance;
}
