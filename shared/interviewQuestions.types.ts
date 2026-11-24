import type { JobApplicationStatus } from "./jobApplications.type";

/**
 * Interview questions: questions a recruiter could ask, or did ask, in an interview, with the answer the user prepares
 * for them. Optionally linked to the applications whose interviews asked them.
 */

/** An application a question was asked for, as shown on the question. */
export interface LinkedApplication {
    id: string;
    company_name: string;
    job_title: string;
    status: JobApplicationStatus;
}

export interface InterviewQuestion {
    id: string;
    question: string;
    /** The prepared answer; empty until the user writes it. */
    answer: string;
    /** Interviews that asked it, most recent application first. Deleted applications are left out. */
    applications: LinkedApplication[];
    created_at: string;
    updated_at: string;
}

export interface InterviewQuestionDto {
    question: string;
    answer: string;
    applicationIds: string[];
}

export type InterviewQuestionResult = { ok: true; question: InterviewQuestion } | { ok: false; error: string };

export const MAX_INTERVIEW_QUESTION_LENGTH = 500;
export const MAX_INTERVIEW_ANSWER_LENGTH = 5000;

/** Files the library exports to: a prep sheet to read or print, an editable document, a table. */
export type QuestionsExportFormat = 'pdf' | 'docx' | 'xlsx';

export interface QuestionsExportRequest {
    format: QuestionsExportFormat;
    /** The questions to export, in the order shown. */
    questionIds: string[];
    /** What the selection is ("Acme · Frontend developer"), in the title and the file name; none for the whole library. */
    scope?: string;
}

export type QuestionsExportResult =
    | { ok: true; fileName: string }
    | { ok: false; cancelled: true }
    | { ok: false; cancelled?: false; error: string };
