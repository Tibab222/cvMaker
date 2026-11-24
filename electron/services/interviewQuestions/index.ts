import { JobApplicationManager } from "../jobApplications/jobApplicationManager";
import { InterviewQuestionsManager } from "./InterviewQuestionsManager";

let instance: InterviewQuestionsManager | null = null;

/** App-wide interview questions library, stored in the open profile's database. */
export function getInterviewQuestions(): InterviewQuestionsManager {
    if (!instance) {
        const jobs = JobApplicationManager.getInstance();
        instance = new InterviewQuestionsManager({
            getDb: () => jobs.getDb(),
            isReady: () => jobs.isConnected(),
        });
    }
    return instance;
}
