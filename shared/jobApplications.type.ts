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
  headerInfos: selectedHeaderInfos;
  selectedExpIds: string[];
  selectedProjectIds: string[];
  selectedBullets: Record<string, string[]>;
  selectedSkillsIds: string[];
  selectedEducationIds: string[];
  includePhoto?: boolean; // show the profile photo on this resume; undefined means "yes if the profile has one"
}

export interface selectedHeaderInfos {
  title?: string; // title under the name on the resume
  mail?: boolean; // show the mail on the resume
  phone?: boolean; // show the phone on the resume
  portfolio?: boolean; // show the portfolio on the resume
  linkedin?: boolean; // show the linkedin on the resume
  github?: boolean; // show the github on the resume
  twitter?: boolean; // show the twitter on the resume
  instagram?: boolean; // show the instagram on the resume
  tiktok?: boolean; // show the tiktok on the resume
  youtube?: boolean; // show the youtube on the resume
  facebook?: boolean; // show the facebook on the resume
  customLinks: Record<string, boolean>; // show/hide each custom link on the resume (key is label, value is true/false)
}

export interface CVSessionDataDTO {
  id: string;
  title: string;
  topResumeSummary?: string[];
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

export interface Application {
    id: string;                      // PRIMARY KEY (UUID)
    job_title: string;               // NOT NULL
    company_name: string;            // NOT NULL
    status: JobApplicationStatus;    // CHECK (status IN (...))
    keywords: string[];
    url?: string | null;             // NULLABLE
    json_file_path?: string | null;  // NULLABLE
    pdf_file_path?: string | null;   // NULLABLE
    applied_at?: string | null;      // DATETIME (Format ISO/string en JS)
    created_at: string;              // DATETIME DEFAULT CURRENT_TIMESTAMP
    updated_at: string;              // DATETIME DEFAULT CURRENT_TIMESTAMP
}

export interface ApplicationEvent {
  id: number;                      // PRIMARY KEY AUTOINCREMENT
  application_id: string;          // FOREIGN KEY -> applications(id)
  event_type: ApplicationEventType; // CHECK (event_type IN (...))
  description?: string | null;     // TEXT
  event_date: string;              // DATETIME DEFAULT CURRENT_TIMESTAMP
}

export interface ApplicationWithEvents extends Application {
  events: ApplicationEvent[];
}