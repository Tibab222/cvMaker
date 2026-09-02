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
  bullets: BulletToRewrite[];
  keywords: string[];
}

export interface RewriteResumeOptions {
  language: Language;
  experiences: ExperienceToRewrite[];
  projects: ProjectToRewrite[];
}