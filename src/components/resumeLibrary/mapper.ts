import type { Application } from "@shared/jobApplications.type";

export interface Resume {
  id: string;
  title: string;
  kind: string;
  targetRole?: string;
  company?: string;
  match?: number;
  updated: string;
  tags: string[];
}

export function mapApplicationToResume(application: Application): Resume {
    return {
        id: application.id,
        title: application.job_title,
        kind: application.status,
        updated: application.updated_at,
        tags: []
    }
}