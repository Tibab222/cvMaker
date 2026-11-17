import type { CoverLetterData } from "./CoverLetter.types";

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
    STATUS_CHANGE = 'STATUS_CHANGE',             // Status change event (to_status holds the new status)
    INTERVIEW_SCHEDULED = 'INTERVIEW_SCHEDULED', // Interview scheduled (scheduled_at holds the interview date)
    NOTE_ADDED = 'NOTE_ADDED',                   // Free-form log entry
    FOLLOW_UP = 'FOLLOW_UP',                     // The user followed up with the company
    DOCUMENT_EXPORTED = 'DOCUMENT_EXPORTED',     // A resume or cover letter PDF was exported for this application
}

/** Statuses that mean the application is still in progress on the company side. */
export const ACTIVE_STATUSES: JobApplicationStatus[] = [
    JobApplicationStatus.APPLIED,
    JobApplicationStatus.INTERVIEW,
    JobApplicationStatus.OFFER,
];

/** Statuses that close an application. */
export const CLOSED_STATUSES: JobApplicationStatus[] = [
    JobApplicationStatus.ACCEPTED,
    JobApplicationStatus.REJECTED,
    JobApplicationStatus.WITHDRAWN,
    JobApplicationStatus.ARCHIVED,
];

export type CreateApplicationDto = Omit<CVSessionDataDTO, "id">;

export interface CVSelection {
  headerInfos: selectedHeaderInfos;
  selectedExpIds: string[];
  selectedProjectIds: string[];
  selectedBullets: Record<string, string[]>;
  selectedSkillsIds: string[];
  selectedEducationIds: string[];
  includePhoto?: boolean; // show the profile photo on this resume; undefined means "yes if the profile has one"
  showSummary?: boolean; // show the summary section on this resume; undefined means "yes if it has bullets"
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
  coverLetter?: CoverLetterData;
  status?: JobApplicationStatus;
}

export interface JobInfos {
    title: string;
    company: string;
    url: string;
    description: string;
    focus?: string;
    keywords?: string[];
    salary?: number | null; // yearly amount as an integer, e.g. 85000
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
    salary?: number | null;          // INTEGER NULLABLE
    url?: string | null;             // NULLABLE
    json_file_path?: string | null;  // NULLABLE
    pdf_file_path?: string | null;   // NULLABLE
    motivation_letter_file_path?: string | null; // NULLABLE, exported cover letter
    notes?: string | null;           // Free-form "Notes & Prep"
    recruiter_contact?: string | null; // Free-form recruiter name / email / phone
    applied_at?: string | null;      // DATETIME (Format ISO/string en JS)
    created_at: string;              // DATETIME DEFAULT CURRENT_TIMESTAMP
    updated_at: string;              // DATETIME DEFAULT CURRENT_TIMESTAMP
}

export interface ApplicationEvent {
  id: number;                      // PRIMARY KEY AUTOINCREMENT
  application_id: string;          // FOREIGN KEY -> applications(id)
  event_type: ApplicationEventType; // CHECK (event_type IN (...))
  description?: string | null;     // TEXT
  to_status?: JobApplicationStatus | null; // new status, for STATUS_CHANGE events
  scheduled_at?: string | null;    // ISO date of the interview / follow-up, when relevant
  event_date: string;              // DATETIME DEFAULT CURRENT_TIMESTAMP (UTC, "YYYY-MM-DD HH:MM:SS")
}

/** Payload to log an event from the UI. */
export interface NewApplicationEventDto {
  event_type: ApplicationEventType.NOTE_ADDED | ApplicationEventType.INTERVIEW_SCHEDULED | ApplicationEventType.FOLLOW_UP;
  description?: string;
  scheduled_at?: string | null; // ISO string
}

/** Editable fields of an application that are not part of the resume session. */
export interface ApplicationDetailsDto {
  notes?: string | null;
  recruiter_contact?: string | null;
}

export type ReminderKind = 'follow_up' | 'interview' | 'stale_draft';

export interface Reminder {
  id: string;
  kind: ReminderKind;
  application_id: string;
  job_title: string;
  company_name: string;
  date: string;     // ISO date the reminder is about (application date, interview date, last update)
  days: number;     // days since (follow_up, stale_draft) or until (interview) that date
  detail?: string | null;
}

export interface ApplicationWithEvents extends Application {
  events: ApplicationEvent[];
}