import { useEffect, useState } from "react";
import type { LinkedApplication } from "@shared/interviewQuestions.types";
import type { Application } from "@shared/jobApplications.type";
import { api } from "@/api";

/** "Acme · Frontend developer" */
export const applicationLabel = (application: Pick<LinkedApplication, "company_name" | "job_title">) =>
    `${application.company_name} · ${application.job_title}`;

/** Applications to link, kept fresh when one is added, edited or deleted elsewhere. */
export function useApplications(): Application[] {
    const [applications, setApplications] = useState<Application[]>([]);
    useEffect(() => {
        const load = () => api.getApplications().then(setApplications).catch(() => setApplications((list) => list));
        void load();
        return api.onApplicationsChanged(() => void load());
    }, []);
    return applications;
}
