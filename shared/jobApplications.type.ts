import type { CoverLetterData } from "./CoverLetter.types";

export enum JobApplicationStatus {
    DRAFT = 'DRAFT',         // First draft
    REVIEW = 'REVIEW',       // AI generation done, need a human review
    APPLIED = 'APPLIED',     // Application sent to the company
    INTERVIEW = 'INTERVIEW', // Interview scheduled with the company
    OFFER = 'OFFER',         // received an offer from the company
    ACCEPTED = 'ACCEPTED',   // Offer accepted by the user
    REJECTED = 'REJECTED',   // Rejected by the company
    NO_RESPONSE = 'NO_RESPONSE', // The company never answered (closed after a long silence)
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

/** How the user sent an application. Stored as text: adding a channel needs no migration. */
export enum ApplicationChannel {
    LINKEDIN = 'LINKEDIN',
    COMPANY_SITE = 'COMPANY_SITE',
    INDEED = 'INDEED',
    JOB_BOARD = 'JOB_BOARD',
    REFERRAL = 'REFERRAL',
    RECRUITER = 'RECRUITER',
    EMAIL = 'EMAIL',
    IN_PERSON = 'IN_PERSON',
    OTHER = 'OTHER',
}

export const APPLICATION_CHANNELS: { value: ApplicationChannel; label: string }[] = [
    { value: ApplicationChannel.LINKEDIN, label: 'LinkedIn' },
    { value: ApplicationChannel.COMPANY_SITE, label: 'Company website' },
    { value: ApplicationChannel.INDEED, label: 'Indeed' },
    { value: ApplicationChannel.JOB_BOARD, label: 'Other job board' },
    { value: ApplicationChannel.REFERRAL, label: 'Referral' },
    { value: ApplicationChannel.RECRUITER, label: 'Recruiter / agency' },
    { value: ApplicationChannel.EMAIL, label: 'Email' },
    { value: ApplicationChannel.IN_PERSON, label: 'In person / job fair' },
    { value: ApplicationChannel.OTHER, label: 'Other' },
];

/** Where an application added by hand can stand: it was sent, so never a draft. */
export const PAST_APPLICATION_STATUSES: JobApplicationStatus[] = [
    JobApplicationStatus.APPLIED,
    JobApplicationStatus.INTERVIEW,
    JobApplicationStatus.OFFER,
    JobApplicationStatus.REJECTED,
    JobApplicationStatus.NO_RESPONSE,
    JobApplicationStatus.ACCEPTED,
    JobApplicationStatus.WITHDRAWN,
];

/** An application sent outside the app (or before using it). */
export interface PastApplicationDto {
    company: string;
    title: string;
    /** Local calendar day it was sent, "YYYY-MM-DD". */
    appliedOn: string;
    status: JobApplicationStatus;
    channel: ApplicationChannel | null;
    url?: string;
    description?: string;
}

/** An application the browser extension saw being sent, confirmed by the user (POST /api/applications). */
export interface BrowserApplicationDto {
    company: string;
    title: string;
    /** The user's calendar day, YYYY-MM-DD. */
    appliedOn: string;
    url?: string;
    description?: string;
    salary?: string;
    channel?: ApplicationChannel | null;
}

/**
 * created: a new application; promoted: the one already prepared in CVMaker for this offer moved to Applied;
 * duplicate: already in the pipeline as sent, nothing changed.
 */
export interface BrowserApplicationResult {
    action: "created" | "promoted" | "duplicate";
    application: Application;
}

/** Main -> renderer: applications changed outside the renderer (the extension recorded one). */
export interface ApplicationsChangedEvent {
    source: "extension";
    action: BrowserApplicationResult["action"];
    title: string;
    company: string;
    /** Made for an offer of the Opportunities queue (now marked applied there). */
    fromOffer?: boolean;
}

export type PastApplicationResult = { ok: true; application: Application } | { ok: false; error: string };

/** Statuses that close an application. */
export const CLOSED_STATUSES: JobApplicationStatus[] = [
    JobApplicationStatus.ACCEPTED,
    JobApplicationStatus.REJECTED,
    JobApplicationStatus.NO_RESPONSE,
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
  templateId?: string; // .cvm template of this resume; undefined means the default template
  collections?: Record<string, string[]>; // ids picked for the extra lists a template declares (e.g. a project appendix), by list name
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
    channel?: ApplicationChannel | null; // How it was sent; null when unknown (applications made in the app)
    description?: string | null;     // Offer text of applications added by hand (others keep it in their session)
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

/** What the user can correct on an application: the offer it is for, and when and how it was sent. */
export interface ApplicationEditDto {
  company: string;
  title: string;
  url?: string;
  channel?: ApplicationChannel | null;
  /** Local calendar day it was sent, "YYYY-MM-DD". Ignored on applications not sent yet. */
  appliedOn?: string | null;
  /** Yearly amount as typed ("85000", "85k"); empty clears it. Left out: unchanged. */
  salary?: string | null;
  /** Offer text. Left out: unchanged. */
  description?: string | null;
}

export type ReminderKind = 'follow_up' | 'interview' | 'stale_draft' | 'no_response';

/** Days without any sign of life after which an application is suggested to close as "No response". */
export const NO_RESPONSE_AFTER_DAYS = 45;

/** An application still marked Applied, silent for NO_RESPONSE_AFTER_DAYS or more. */
export interface SilentApplication {
    id: string;
    job_title: string;
    company_name: string;
    channel: ApplicationChannel | null;
    applied_at: string;
    /** Last sign of life: the submission, a follow-up, an interview or an answer, whichever is latest (ISO). */
    last_sign: string;
    /** Whole days since last_sign. */
    days: number;
    follow_ups: number;
}

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