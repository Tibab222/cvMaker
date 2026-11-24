import crypto from "node:crypto";
import type Database from "better-sqlite3";
import {
    MAX_INTERVIEW_ANSWER_LENGTH,
    MAX_INTERVIEW_QUESTION_LENGTH,
    type InterviewQuestion,
    type InterviewQuestionDto,
    type LinkedApplication,
} from "../../../shared/interviewQuestions.types";
import { JobApplicationStatus } from "../../../shared/jobApplications.type";
import { questionKey } from "../answers/AnswerBankManager";

/**
 * Interview questions library: questions asked (or likely to be asked) in interviews, the answer the user prepares, and
 * the applications whose interviews asked them. Stored in the open profile's database, next to the answer bank.
 *
 * Electron-free on purpose (dependencies are injected), so it can be exercised from plain Node.
 */

export interface InterviewQuestionsDeps {
    getDb: () => Database.Database;
    isReady: () => boolean;
}

const MAX_LINKS = 50;

interface QuestionRow {
    id: string;
    question: string;
    answer: string;
    created_at: string;
    updated_at: string;
}

interface LinkRow extends LinkedApplication {
    question_id: string;
}

/** One line, single spaces. */
const cleanQuestion = (text: unknown) => (typeof text === "string" ? text.replace(/\s+/g, " ").trim() : "");
/** Line breaks kept: a prepared answer is often a few paragraphs or a list. */
const cleanAnswer = (text: unknown) => (typeof text === "string" ? text.replace(/\r\n/g, "\n").replace(/[ \t]+$/gm, "").trim() : "");

export class InterviewQuestionsManager {
    private readonly deps: InterviewQuestionsDeps;

    constructor(deps: InterviewQuestionsDeps) {
        this.deps = deps;
    }

    private db(): Database.Database {
        if (!this.deps.isReady()) throw new Error("Open a profile first.");
        return this.deps.getDb();
    }

    /** Links to applications that still exist (the join drops any dangling one), grouped by question. */
    private links(questionIds?: string[]): Map<string, LinkedApplication[]> {
        const where = questionIds ? `WHERE l.question_id IN (${questionIds.map(() => "?").join(", ")})` : "";
        const rows = this.db().prepare(`
            SELECT l.question_id, a.id, a.company_name, a.job_title, a.status
            FROM interview_question_applications l
            JOIN applications a ON a.id = l.application_id
            ${where}
            ORDER BY COALESCE(a.applied_at, a.created_at) DESC
        `).all(...(questionIds ?? [])) as LinkRow[];
        const byQuestion = new Map<string, LinkedApplication[]>();
        for (const row of rows) {
            const list = byQuestion.get(row.question_id) ?? [];
            list.push({ id: row.id, company_name: row.company_name, job_title: row.job_title, status: row.status as JobApplicationStatus });
            byQuestion.set(row.question_id, list);
        }
        return byQuestion;
    }

    private toQuestion(row: QuestionRow, links: Map<string, LinkedApplication[]>): InterviewQuestion {
        return {
            id: row.id,
            question: row.question,
            answer: row.answer,
            applications: links.get(row.id) ?? [],
            created_at: row.created_at,
            updated_at: row.updated_at,
        };
    }

    private one(id: string): InterviewQuestion {
        const row = this.db().prepare(`SELECT * FROM interview_questions WHERE id = ?`).get(id) as QuestionRow | undefined;
        if (!row) throw new Error("This question no longer exists.");
        return this.toQuestion(row, this.links([id]));
    }

    /** Most recently edited first. */
    public list(): InterviewQuestion[] {
        if (!this.deps.isReady()) return [];
        const rows = this.db().prepare(`SELECT * FROM interview_questions ORDER BY updated_at DESC, created_at DESC`).all() as QuestionRow[];
        const links = this.links();
        return rows.map((row) => this.toQuestion(row, links));
    }

    /** Questions asked in the interviews of one application. */
    public forApplication(applicationId: string): InterviewQuestion[] {
        if (!this.deps.isReady() || typeof applicationId !== "string") return [];
        const rows = this.db().prepare(`
            SELECT q.* FROM interview_questions q
            JOIN interview_question_applications l ON l.question_id = q.id
            WHERE l.application_id = ?
            ORDER BY q.updated_at DESC, q.created_at DESC
        `).all(applicationId) as QuestionRow[];
        if (!rows.length) return [];
        const links = this.links(rows.map((row) => row.id));
        return rows.map((row) => this.toQuestion(row, links));
    }

    private checked(dto: InterviewQuestionDto, except?: string): { question: string; answer: string; applicationIds: string[] } {
        const question = cleanQuestion(dto?.question);
        const answer = cleanAnswer(dto?.answer);
        if (question.length < 3) throw new Error("Write the question, as the interviewer asked it.");
        if (question.length > MAX_INTERVIEW_QUESTION_LENGTH) throw new Error(`Keep the question under ${MAX_INTERVIEW_QUESTION_LENGTH} characters.`);
        if (answer.length > MAX_INTERVIEW_ANSWER_LENGTH) throw new Error(`Keep the answer under ${MAX_INTERVIEW_ANSWER_LENGTH} characters.`);
        const key = questionKey(question);
        if (!key) throw new Error("Write the question, as the interviewer asked it.");
        const others = this.db().prepare(`SELECT id, question FROM interview_questions WHERE id != ?`).all(except ?? "") as { id: string; question: string }[];
        if (others.some((other) => questionKey(other.question) === key)) throw new Error("This question is already in your library: edit that one.");
        const ids = Array.isArray(dto?.applicationIds) ? dto.applicationIds.filter((id): id is string => typeof id === "string" && id.length > 0) : [];
        return { question, answer, applicationIds: [...new Set(ids)].slice(0, MAX_LINKS) };
    }

    /** Replaces the question's links; ids of applications that no longer exist are skipped. */
    private link(questionId: string, applicationIds: string[]): void {
        const db = this.db();
        db.prepare(`DELETE FROM interview_question_applications WHERE question_id = ?`).run(questionId);
        const insert = db.prepare(`
            INSERT OR IGNORE INTO interview_question_applications (question_id, application_id)
            SELECT ?, id FROM applications WHERE id = ?
        `);
        for (const applicationId of applicationIds) insert.run(questionId, applicationId);
    }

    public add(dto: InterviewQuestionDto, now = new Date()): InterviewQuestion {
        const { question, answer, applicationIds } = this.checked(dto);
        const id = crypto.randomUUID();
        const at = now.toISOString();
        const db = this.db();
        db.transaction(() => {
            db.prepare(`INSERT INTO interview_questions (id, question, answer, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`)
                .run(id, question, answer, at, at);
            this.link(id, applicationIds);
        })();
        return this.one(id);
    }

    public update(id: string, dto: InterviewQuestionDto, now = new Date()): InterviewQuestion {
        this.one(id);
        const { question, answer, applicationIds } = this.checked(dto, id);
        const db = this.db();
        db.transaction(() => {
            db.prepare(`UPDATE interview_questions SET question = ?, answer = ?, updated_at = ? WHERE id = ?`)
                .run(question, answer, now.toISOString(), id);
            this.link(id, applicationIds);
        })();
        return this.one(id);
    }

    public remove(id: string): boolean {
        if (!this.deps.isReady()) return false;
        const db = this.db();
        return db.transaction(() => {
            // explicit, in case foreign keys were off for this connection
            db.prepare(`DELETE FROM interview_question_applications WHERE question_id = ?`).run(id);
            return db.prepare(`DELETE FROM interview_questions WHERE id = ?`).run(id).changes > 0;
        })();
    }
}
