export enum JobApplicationStatus {
    DRAFT = 'DRAFT',         // First draft
    REVIEW = 'REVIEW',       // AI generation done, need a human review
    APPLIED = 'APPLIED',     // Application sent to the company
    INTERVIEW = 'INTERVIEW', // Interview scheduled with the company
    OFFER = 'OFFER',         // received an offer from the company
    ACCEPTED = 'ACCEPTED',   // Offer accepted by the user
    REJECTED = 'REJECTED',   // Rejected by the company
    WITHDRAWN = 'WITHDRAWN', // Offer declined by the user
    ARCHIVED = 'ARCHIVED',   // Application archived by the user
}

export enum ApplicationEventType {
    STATUS_CHANGE = 'STATUS_CHANGE',       // Status change event
    INTERVIEW_SCHEDULED = 'INTERVIEW_SCHEDULED', // Interview scheduled event
    NOTE_ADDED = 'NOTE_ADDED',             // Note added event
}

export type CreateApplicationDto = Omit<CVSessionDataDTO, "id">;

export interface CVSelection {
  selectedExpIds: string[];
  selectedProjectIds: string[];
  selectedBullets: Record<string, string[]>;
  selectedSkillsIds: string[];
  selectedEducationIds: string[];
}

export interface CVSessionDataDTO {
  id: string;
  title: string;
  selection: CVSelection;
  jobInfos: JobInfos | null;
  customTexts?: Record<string, string>;
  scores?: Record<string, number>;
}

export interface JobInfos {
    title: string;
    company: string;
    url: string;
    description: string;
    focus?: string;
    keywords?: string[];
}

export interface KeyStats {
    activeApplications: number;
    activitySpark: number[];
    applicationsLastWeek: number;
    avgResponseTimeDays: number;
    interviewRate: number; // Ex: 25.5 (for 25.5%)
    ghostingRate: number;  // Ex: 12.0 (for 12.0%)
    offerRate: number;     // Ex: 5.0  (for 5.0%)
}