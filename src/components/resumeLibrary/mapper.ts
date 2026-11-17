import type { Application, JobApplicationStatus } from "@shared/jobApplications.type";
import { parseDbDate } from "@shared/utils";

export interface Resume {
  id: string;
  company: string;
  targetRole: string;
  status: JobApplicationStatus;
  updated: Date | null;
  tags: string[];
  hasPdf: boolean;
}

export function mapApplicationToResume(application: Application): Resume {
  return {
    id: application.id,
    company: application.company_name,
    targetRole: application.job_title,
    status: application.status,
    updated: parseDbDate(application.updated_at),
    tags: application.keywords ?? [],
    hasPdf: Boolean(application.pdf_file_path),
  };
}
