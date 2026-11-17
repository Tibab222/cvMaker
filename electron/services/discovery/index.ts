import { JobApplicationManager } from "../jobApplications/jobApplicationManager";
import { LocalkeywordsExtractor } from "../KeywordsExtractor/localKeywordsExtract";
import { ProfileService } from "../ProfileService";
import { VectorService } from "../VectorService";
import { DiscoveryManager } from "./DiscoveryManager";
import { ConfigurationManager } from "../config/ConfigurationManager";

let instance: DiscoveryManager | null = null;

/** App-wide discovery manager, wired to the profile database, the keyword extractor and the local embedding model. */
export function getDiscoveryManager(): DiscoveryManager {
    if (!instance) {
        const jobs = JobApplicationManager.getInstance();
        instance = new DiscoveryManager({
            getDb: () => jobs.getDb(),
            isReady: () => jobs.isConnected(),
            getProfile: () => ProfileService.getInstance().getCurrentProfile(),
            extractKeywords: (text, language) => LocalkeywordsExtractor.extractKeywords(text, language, { recordAffinity: false }),
            embed: (text) => VectorService.getInstance().generateEmbedding(text),
            adzuna: {
                get: () => ConfigurationManager.getInstance().get("adzuna") ?? null,
                set: (credentials) => {
                    const config = ConfigurationManager.getInstance();
                    if (credentials) config.updateConfig({ adzuna: credentials });
                    else config.remove("adzuna");
                },
            },
        });
    }
    return instance;
}
