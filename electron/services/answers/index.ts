import { JobApplicationManager } from "../jobApplications/jobApplicationManager";
import { VectorService } from "../VectorService";
import { AnswerBankManager } from "./AnswerBankManager";

let instance: AnswerBankManager | null = null;

/** App-wide answer bank, stored in the open profile's database. */
export function getAnswerBank(): AnswerBankManager {
    if (!instance) {
        const jobs = JobApplicationManager.getInstance();
        instance = new AnswerBankManager({
            getDb: () => jobs.getDb(),
            isReady: () => jobs.isConnected(),
            embed: (text) => VectorService.getInstance().generateEmbedding(text),
        });
    }
    return instance;
}
