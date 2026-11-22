import type { CVSessionDataDTO } from "./jobApplications.type";
import { Language } from "./profile.interface";

export interface BulletToRewrite {
  bullet_id: string;
  text: string;
}

export interface ExperienceToRewrite {
  experience_id: string;
  role: string;
  company: string;
  description: string | undefined;
  keywords: string[];
}

export interface ProjectToRewrite {
  project_id: string;
  title: string;
  /** company / role of the experience the project was done in, when linked */
  company?: string;
  role?: string;
  /** e.g. "2022 — 2023", when the project has dates */
  period?: string;
  bullets: BulletToRewrite[];
  keywords: string[];
}

export interface RewriteResumeOptions {
  language: Language;
  experiences: ExperienceToRewrite[];
  projects: ProjectToRewrite[];
  resumeData: Partial<CVSessionDataDTO>;
}