import path from "node:path";
import fs from "node:fs";
import {
    ACTIVE_STATUSES,
    Application,
    ApplicationDetailsDto,
    ApplicationEvent,
    ApplicationEventType,
    ApplicationWithEvents,
    CLOSED_STATUSES,
    CreateApplicationDto,
    CVSessionDataDTO,
    JobApplicationStatus,
    KeyStats,
    NewApplicationEventDto,
    Reminder,
} from "../../../shared/jobApplications.type";
import { parseDbDate, parseSalary } from "../../../shared/utils";
import { JobApplicationDb } from "./jobApplicationDb";

/** Statuses that imply the application was sent: reaching one of them stamps applied_at if it is still empty. */
const SUBMITTED_STATUSES: JobApplicationStatus[] = [
    JobApplicationStatus.APPLIED,
    JobApplicationStatus.INTERVIEW,
    JobApplicationStatus.OFFER,
    JobApplicationStatus.ACCEPTED,
    JobApplicationStatus.REJECTED,
];

/** Status changes that count as an answer from the company. */
const RESPONSE_STATUSES: JobApplicationStatus[] = [
    JobApplicationStatus.INTERVIEW,
    JobApplicationStatus.OFFER,
    JobApplicationStatus.ACCEPTED,
    JobApplicationStatus.REJECTED,
];

/** Event types the user can log (and delete) from the application drawer. */
const USER_EVENT_TYPES: ApplicationEventType[] = [
    ApplicationEventType.NOTE_ADDED,
    ApplicationEventType.INTERVIEW_SCHEDULED,
    ApplicationEventType.FOLLOW_UP,
];

const FOLLOW_UP_AFTER_DAYS = 7;
const STALE_DRAFT_AFTER_DAYS = 10;
const INTERVIEW_LOOKAHEAD_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

const sqlList = (values: string[]) => values.map((value) => `'${value}'`).join(", ");

const splitKeywords = (raw: unknown): string[] =>
    typeof raw === "string" && raw.trim() ? raw.split(",").map((k) => k.trim()).filter(Boolean) : [];

export class JobApplicationManager {
    private static instance: JobApplicationManager | null = null;
    private jobApplicationDb: JobApplicationDb | null = null;
    private sessionsDir: string | null = null;

    private constructor() {}

    public static getInstance(): JobApplicationManager {
        if (!JobApplicationManager.instance) {
            JobApplicationManager.instance = new JobApplicationManager();
        }
        return JobApplicationManager.instance;
    }

    public connect(profilePath: string): void {
        if (!this.jobApplicationDb) {
            this.jobApplicationDb = new JobApplicationDb();
        }
        this.jobApplicationDb.connect(profilePath);

        const sessionsDir = path.join(profilePath, "sessions");
        if (!fs.existsSync(sessionsDir)) {
            fs.mkdirSync(sessionsDir, { recursive: true });
        }
        this.sessionsDir = sessionsDir;
    }

    /* ------------------------------------------------------------------ */
    /* Reads                                                               */
    /* ------------------------------------------------------------------ */

    public getAllApplications(): Application[] {
        const rows = this.getDb().prepare(`SELECT * FROM applications ORDER BY created_at DESC`).all() as Record<string, unknown>[];
        return rows.map((row) => ({ ...row, keywords: splitKeywords(row.keywords) }) as Application);
    }

    public getApplicationWithTimeline(applicationId: string): ApplicationWithEvents | null {
        const rawDb = this.getDb();
        const row = rawDb.prepare(`SELECT * FROM applications WHERE id = ?`).get(applicationId) as Record<string, unknown> | undefined;
        if (!row) return null;

        const events = rawDb.prepare(`
            SELECT *
            FROM application_events
            WHERE application_id = ?
            ORDER BY event_date DESC, id DESC
        `).all(applicationId) as ApplicationEvent[];

        return { ...(row as unknown as Application), keywords: splitKeywords(row.keywords), events };
    }

    public getCVSession(id: string): CVSessionDataDTO | null {
        if (!this.sessionsDir) throw new Error("Sessions path not set. Call connect() first.");

        const row = this.getDb().prepare(`SELECT json_file_path, status FROM applications WHERE id = ?`).get(id) as { json_file_path: string | null; status: string } | undefined;
        if (!row?.json_file_path) return null;

        const fullPath = path.join(this.sessionsDir, row.json_file_path);
        if (!fs.existsSync(fullPath)) {
            console.warn(`[JobApplicationManager] Session file not found: ${fullPath}`);
            return null;
        }

        const content = fs.readFileSync(fullPath, "utf-8");
        return { ...JSON.parse(content), status: row.status as JobApplicationStatus } as CVSessionDataDTO;
    }

    /**
     * Absolute path of the exported resume PDF, or null if none was exported or the file is no longer on disk.
     */
    public getPdfFilePath(id: string): string | null {
        const row = this.getDb().prepare(`SELECT pdf_file_path FROM applications WHERE id = ?`).get(id) as { pdf_file_path: string | null } | undefined;
        if (!row?.pdf_file_path || !fs.existsSync(row.pdf_file_path)) {
            return null;
        }
        return row.pdf_file_path;
    }

    /* ------------------------------------------------------------------ */
    /* Writes                                                              */
    /* ------------------------------------------------------------------ */

    public createApplication(dto: CreateApplicationDto): string {
        if (!this.sessionsDir) throw new Error("Sessions path not set. Call connect() first.");
        const id = `app_${crypto.randomUUID()}`;
        const rawDb = this.getDb();

        const relativeJsonPath = `cv_${id}.json`;
        const fullJsonPath = path.join(this.sessionsDir, relativeJsonPath);

        const { status: statusFromSession, ...sessionDataWithoutStatus } = { ...dto, id } as CVSessionDataDTO;
        const status = statusFromSession || JobApplicationStatus.DRAFT;

        fs.writeFileSync(fullJsonPath, JSON.stringify(sessionDataWithoutStatus, null, 2), "utf-8");

        const insert = rawDb.prepare(`
            INSERT INTO applications (id, job_title, company_name, status, keywords, salary, url, json_file_path, applied_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ${SUBMITTED_STATUSES.includes(status) ? "CURRENT_TIMESTAMP" : "NULL"})
        `);

        try {
            rawDb.transaction(() => {
                insert.run(
                    id,
                    dto.jobInfos?.title || dto.title || "Unknown",
                    dto.jobInfos?.company || "Unknown",
                    status,
                    (dto.jobInfos?.keywords || []).join(","),
                    parseSalary(dto.jobInfos?.salary),
                    dto.jobInfos?.url || "",
                    relativeJsonPath,
                );
                this.insertEvent(id, ApplicationEventType.STATUS_CHANGE, `Created with status ${status}`, { toStatus: status });
            })();
            return id;
        } catch (error) {
            if (fs.existsSync(fullJsonPath)) {
                fs.unlinkSync(fullJsonPath);
            }
            throw error;
        }
    }

    /**
     * Moves an application to a new status and records it on the timeline.
     * Re-applying the current status is a no-op, so dropping a card back on its own column does not pollute the history.
     */
    public updateStatus(id: string, newStatus: JobApplicationStatus, note?: string): JobApplicationStatus {
        if (!Object.values(JobApplicationStatus).includes(newStatus)) {
            throw new Error(`Unknown status: ${newStatus}`);
        }
        const rawDb = this.getDb();
        const current = rawDb.prepare(`SELECT status FROM applications WHERE id = ?`).get(id) as { status: JobApplicationStatus } | undefined;
        if (!current) throw new Error(`Application ${id} not found`);
        if (current.status === newStatus && !note) return newStatus;

        // applied_at is the first submission date: keep it when moving back and forth between stages
        const appliedAtClause = SUBMITTED_STATUSES.includes(newStatus) ? `, applied_at = COALESCE(applied_at, CURRENT_TIMESTAMP)` : "";

        rawDb.transaction(() => {
            rawDb.prepare(`UPDATE applications SET status = ? ${appliedAtClause} WHERE id = ?`).run(newStatus, id);
            const description = note ? `New status: ${newStatus} : ${note}` : `New status: ${newStatus}`;
            this.insertEvent(id, ApplicationEventType.STATUS_CHANGE, description, { toStatus: newStatus });
        })();

        return newStatus;
    }

    /**
     * Logs a user event (note, interview, follow-up). Scheduling an interview on an application that is not
     * yet in the interview stage moves it there, which keeps the board and the stats in sync.
     */
    public addEvent(applicationId: string, dto: NewApplicationEventDto): ApplicationEvent {
        if (!USER_EVENT_TYPES.includes(dto.event_type)) {
            throw new Error(`Event type ${dto.event_type} cannot be added manually`);
        }
        const rawDb = this.getDb();
        const app = rawDb.prepare(`SELECT status FROM applications WHERE id = ?`).get(applicationId) as { status: JobApplicationStatus } | undefined;
        if (!app) throw new Error(`Application ${applicationId} not found`);

        const scheduledAt = dto.scheduled_at ? new Date(dto.scheduled_at) : null;
        if (scheduledAt && Number.isNaN(scheduledAt.getTime())) {
            throw new Error(`Invalid date: ${dto.scheduled_at}`);
        }
        if (dto.event_type === ApplicationEventType.INTERVIEW_SCHEDULED && !scheduledAt) {
            throw new Error("An interview needs a date");
        }

        const description = dto.description?.trim() || null;
        if (dto.event_type === ApplicationEventType.NOTE_ADDED && !description) {
            throw new Error("A note cannot be empty");
        }

        let eventId = 0;
        rawDb.transaction(() => {
            eventId = this.insertEvent(applicationId, dto.event_type, description, { scheduledAt: scheduledAt?.toISOString() ?? null });

            const preInterview = [JobApplicationStatus.DRAFT, JobApplicationStatus.REVIEW, JobApplicationStatus.APPLIED];
            if (dto.event_type === ApplicationEventType.INTERVIEW_SCHEDULED && preInterview.includes(app.status)) {
                this.updateStatus(applicationId, JobApplicationStatus.INTERVIEW);
            }
        })();

        return rawDb.prepare(`SELECT * FROM application_events WHERE id = ?`).get(eventId) as ApplicationEvent;
    }

    /**
     * Deletes an event the user logged. Status changes and exports are history and stay.
     */
    public deleteEvent(eventId: number): boolean {
        const result = this.getDb()
            .prepare(`DELETE FROM application_events WHERE id = ? AND event_type IN (${sqlList(USER_EVENT_TYPES)})`)
            .run(eventId);
        return result.changes > 0;
    }

    public updateDetails(id: string, details: ApplicationDetailsDto): boolean {
        const updates: string[] = [];
        const params: unknown[] = [];

        if (details.notes !== undefined) {
            updates.push("notes = ?");
            params.push(details.notes?.trim() ? details.notes : null);
        }
        if (details.recruiter_contact !== undefined) {
            updates.push("recruiter_contact = ?");
            params.push(details.recruiter_contact?.trim() || null);
        }
        if (updates.length === 0) return true;

        const result = this.getDb().prepare(`UPDATE applications SET ${updates.join(", ")} WHERE id = ?`).run(...params, id);
        return result.changes > 0;
    }

    /**
     * @param promoteTo Optional stage to move a draft to after saving (e.g. REVIEW once the AI rewrote the resume).
     *                  Applications already past the draft stage are never moved backwards.
     */
    public saveOrUpdateApplication(data: Partial<CVSessionDataDTO>, promoteTo?: JobApplicationStatus): { id: string; success: boolean; error?: string } {
        try {
            if (data.id && this.applicationExists(data.id)) {
                this.saveCVSession(data as CVSessionDataDTO);
                if (promoteTo) {
                    const row = this.getDb().prepare(`SELECT status FROM applications WHERE id = ?`).get(data.id) as { status: JobApplicationStatus };
                    if (row.status === JobApplicationStatus.DRAFT) this.updateStatus(data.id, promoteTo);
                }
                return { id: data.id, success: true };
            }
            const initialStatus = data.status && data.status !== JobApplicationStatus.DRAFT ? data.status : (promoteTo ?? data.status);
            return { id: this.createApplication({ ...data, status: initialStatus } as CreateApplicationDto), success: true };
        } catch (error) {
            console.error("[JobApplicationManager] Save failed:", error);
            return { id: data.id ?? "", success: false, error: (error as Error).message };
        }
    }

    public updateExportedDocuments(applicationId: string, paths: { pdfFilePath?: string; coverFilePath?: string }): void {
        const rawDb = this.getDb();
        const updates: string[] = [];
        const params: unknown[] = [];
        const exported: string[] = [];

        if (paths.pdfFilePath !== undefined) {
            updates.push("pdf_file_path = ?");
            params.push(paths.pdfFilePath);
            exported.push(paths.pdfFilePath);
        }
        if (paths.coverFilePath !== undefined) {
            updates.push("motivation_letter_file_path = ?");
            params.push(paths.coverFilePath);
            exported.push(paths.coverFilePath);
        }
        if (updates.length === 0 || !this.applicationExists(applicationId)) return;

        rawDb.transaction(() => {
            rawDb.prepare(`UPDATE applications SET ${updates.join(", ")} WHERE id = ?`).run(...params, applicationId);
            for (const file of exported) {
                this.insertEvent(applicationId, ApplicationEventType.DOCUMENT_EXPORTED, path.basename(file));
            }
        })();
    }

    /**
     * Deletes an application, its events and its session JSON file.
     * @returns True if the application was found and deleted.
     */
    public deleteApplication(id: string): boolean {
        if (!this.sessionsDir) throw new Error("Sessions path not set. Call connect() first.");
        const rawDb = this.getDb();
        const row = rawDb.prepare(`SELECT json_file_path FROM applications WHERE id = ?`).get(id) as { json_file_path: string | null } | undefined;
        if (!row) {
            console.warn(`[JobApplicationManager] Application not found: ${id}`);
            return false;
        }

        rawDb.transaction(() => {
            rawDb.prepare(`DELETE FROM application_events WHERE application_id = ?`).run(id);
            rawDb.prepare(`DELETE FROM applications WHERE id = ?`).run(id);
        })();

        // the file goes last: if the database step failed, nothing was lost
        if (row.json_file_path) {
            const fullPath = path.join(this.sessionsDir, row.json_file_path);
            if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
        }
        return true;
    }

    /* ------------------------------------------------------------------ */
    /* Reminders                                                           */
    /* ------------------------------------------------------------------ */

    /**
     * What needs attention today: upcoming interviews, applications to follow up on, drafts left behind.
     */
    public getReminders(limit = 8): Reminder[] {
        const rawDb = this.getDb();
        const now = Date.now();
        const reminders: Reminder[] = [];

        const interviews = rawDb.prepare(`
            SELECT e.id, e.application_id, e.scheduled_at, e.description, a.job_title, a.company_name
            FROM application_events e
            JOIN applications a ON a.id = e.application_id
            WHERE e.event_type = '${ApplicationEventType.INTERVIEW_SCHEDULED}'
              AND e.scheduled_at IS NOT NULL
              AND a.status NOT IN (${sqlList(CLOSED_STATUSES)})
        `).all() as { id: number; application_id: string; scheduled_at: string; description: string | null; job_title: string; company_name: string }[];

        for (const interview of interviews) {
            const date = parseDbDate(interview.scheduled_at);
            if (!date) continue;
            const diff = date.getTime() - now;
            // keep today's interviews visible for a few hours after they started
            if (diff < -6 * 60 * 60 * 1000 || diff > INTERVIEW_LOOKAHEAD_DAYS * DAY_MS) continue;
            reminders.push({
                id: `interview_${interview.id}`,
                kind: "interview",
                application_id: interview.application_id,
                job_title: interview.job_title,
                company_name: interview.company_name,
                date: date.toISOString(),
                // calendar days, so an interview the day after tomorrow reads "in 2 days" whatever the hour
                days: Math.max(0, Math.round((startOfDay(date) - startOfDay(new Date(now))) / DAY_MS)),
                detail: interview.description,
            });
        }

        // last sign of life on an application: the submission, a follow-up or any answer, whichever is latest
        const waiting = rawDb.prepare(`
            SELECT a.id, a.job_title, a.company_name, a.applied_at,
                   (SELECT MAX(e.event_date) FROM application_events e
                     WHERE e.application_id = a.id
                       AND e.event_type IN ('${ApplicationEventType.FOLLOW_UP}', '${ApplicationEventType.INTERVIEW_SCHEDULED}')) AS last_contact,
                   (SELECT COUNT(*) FROM application_events e
                     WHERE e.application_id = a.id AND e.event_type = '${ApplicationEventType.FOLLOW_UP}') AS follow_ups
            FROM applications a
            WHERE a.status = '${JobApplicationStatus.APPLIED}' AND a.applied_at IS NOT NULL
        `).all() as { id: string; job_title: string; company_name: string; applied_at: string; last_contact: string | null; follow_ups: number }[];

        for (const app of waiting) {
            const applied = parseDbDate(app.applied_at);
            const lastContact = parseDbDate(app.last_contact);
            const reference = lastContact && applied && lastContact > applied ? lastContact : applied;
            if (!reference) continue;
            const days = Math.floor((now - reference.getTime()) / DAY_MS);
            if (days < FOLLOW_UP_AFTER_DAYS) continue;
            reminders.push({
                id: `follow_up_${app.id}`,
                kind: "follow_up",
                application_id: app.id,
                job_title: app.job_title,
                company_name: app.company_name,
                date: reference.toISOString(),
                days,
                detail: app.follow_ups > 0 ? `${app.follow_ups} follow-up${app.follow_ups > 1 ? "s" : ""} sent` : null,
            });
        }

        const drafts = rawDb.prepare(`
            SELECT id, job_title, company_name, updated_at
            FROM applications
            WHERE status IN ('${JobApplicationStatus.DRAFT}', '${JobApplicationStatus.REVIEW}')
              AND updated_at <= datetime('now', '-${STALE_DRAFT_AFTER_DAYS} days')
        `).all() as { id: string; job_title: string; company_name: string; updated_at: string }[];

        for (const draft of drafts) {
            const updated = parseDbDate(draft.updated_at);
            if (!updated) continue;
            reminders.push({
                id: `stale_${draft.id}`,
                kind: "stale_draft",
                application_id: draft.id,
                job_title: draft.job_title,
                company_name: draft.company_name,
                date: updated.toISOString(),
                days: Math.floor((now - updated.getTime()) / DAY_MS),
            });
        }

        const rank: Record<Reminder["kind"], number> = { interview: 0, follow_up: 1, stale_draft: 2 };
        return reminders
            .sort((a, b) => rank[a.kind] - rank[b.kind] || (a.kind === "interview" ? a.date.localeCompare(b.date) : b.days - a.days))
            .slice(0, limit);
    }

    /* ------------------------------------------------------------------ */
    /* Stats                                                               */
    /* ------------------------------------------------------------------ */

    public getKeyStats(): KeyStats {
        return {
            activeApplications: this.getActiveApplicationsCount(),
            activitySpark: this.getActivitySpark(),
            applicationsLastWeek: this.getApplicationsLastWeekCount(),
            avgResponseTimeDays: this.getAvgResponseTimeDays(),
            interviewRate: this.getInterviewRate(),
            ghostingRate: this.getGhostingRate(),
            offerRate: this.getOfferRate(),
        };
    }

    /** Applications still waiting on the company: applied, interviewing or holding an offer. */
    private getActiveApplicationsCount(): number {
        const result = this.getDb().prepare(`
            SELECT COUNT(*) AS count FROM applications WHERE status IN (${sqlList(ACTIVE_STATUSES)})
        `).get() as { count: number };
        return result.count;
    }

    /** Applications submitted per week over the last 8 weeks (oldest first). */
    private getActivitySpark(): number[] {
        const rows = this.getDb().prepare(`
            SELECT CAST((julianday('now') - julianday(applied_at)) / 7 AS INTEGER) AS weeks_ago, COUNT(*) AS count
            FROM applications
            WHERE applied_at IS NOT NULL AND applied_at >= datetime('now', '-56 days')
            GROUP BY weeks_ago
        `).all() as Array<{ weeks_ago: number; count: number }>;

        const sparkline = new Array(8).fill(0);
        for (const row of rows) {
            if (row.weeks_ago >= 0 && row.weeks_ago < 8) {
                sparkline[7 - row.weeks_ago] = row.count;
            }
        }
        return sparkline;
    }

    private getApplicationsLastWeekCount(): number {
        const result = this.getDb().prepare(`
            SELECT COUNT(*) AS count FROM applications WHERE applied_at >= datetime('now', '-7 days')
        `).get() as { count: number };
        return result.count;
    }

    /** Average days between submission and the first answer (interview, offer, rejection...). */
    private getAvgResponseTimeDays(): number {
        const result = this.getDb().prepare(`
            SELECT ROUND(AVG(julianday(first_answer) - julianday(applied_at)), 1) AS avg_days
            FROM (
                SELECT a.applied_at, MIN(e.event_date) AS first_answer
                FROM applications a
                JOIN application_events e ON e.application_id = a.id
                WHERE a.applied_at IS NOT NULL
                  AND e.event_date > a.applied_at
                  AND (
                    e.event_type = '${ApplicationEventType.INTERVIEW_SCHEDULED}'
                    OR (e.event_type = '${ApplicationEventType.STATUS_CHANGE}' AND e.to_status IN (${sqlList(RESPONSE_STATUSES)}))
                  )
                GROUP BY a.id
            )
        `).get() as { avg_days: number | null };
        return result?.avg_days ?? 0;
    }

    /** Share of submitted applications that reached an interview at some point. */
    private getInterviewRate(): number {
        const reached = [JobApplicationStatus.INTERVIEW, JobApplicationStatus.OFFER, JobApplicationStatus.ACCEPTED];
        const result = this.getDb().prepare(`
            SELECT ROUND(
                SUM(CASE WHEN a.status IN (${sqlList(reached)}) OR EXISTS (
                    SELECT 1 FROM application_events e
                    WHERE e.application_id = a.id
                      AND (e.event_type = '${ApplicationEventType.INTERVIEW_SCHEDULED}'
                           OR (e.event_type = '${ApplicationEventType.STATUS_CHANGE}' AND e.to_status IN (${sqlList(reached)})))
                ) THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0), 1) AS rate
            FROM applications a
            WHERE a.applied_at IS NOT NULL
        `).get() as { rate: number | null };
        return result?.rate ?? 0;
    }

    /** Share of submitted applications still without any answer 30 days later. */
    private getGhostingRate(): number {
        const result = this.getDb().prepare(`
            SELECT ROUND(
                SUM(CASE WHEN status = '${JobApplicationStatus.APPLIED}' AND applied_at <= datetime('now', '-30 days') THEN 1 ELSE 0 END) * 100.0
                / NULLIF(COUNT(*), 0), 1) AS rate
            FROM applications
            WHERE applied_at IS NOT NULL
        `).get() as { rate: number | null };
        return result?.rate ?? 0;
    }

    /** Share of submitted applications that got an offer, even if it was later declined. */
    private getOfferRate(): number {
        const offered = [JobApplicationStatus.OFFER, JobApplicationStatus.ACCEPTED];
        const result = this.getDb().prepare(`
            SELECT ROUND(
                SUM(CASE WHEN a.status IN (${sqlList(offered)}) OR EXISTS (
                    SELECT 1 FROM application_events e
                    WHERE e.application_id = a.id
                      AND e.event_type = '${ApplicationEventType.STATUS_CHANGE}' AND e.to_status IN (${sqlList(offered)})
                ) THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0), 1) AS rate
            FROM applications a
            WHERE a.applied_at IS NOT NULL
        `).get() as { rate: number | null };
        return result?.rate ?? 0;
    }

    /* ------------------------------------------------------------------ */
    /* Internals                                                           */
    /* ------------------------------------------------------------------ */

    private insertEvent(
        applicationId: string,
        type: ApplicationEventType,
        description: string | null,
        extra: { toStatus?: JobApplicationStatus; scheduledAt?: string | null } = {},
    ): number {
        const result = this.getDb().prepare(`
            INSERT INTO application_events (application_id, event_type, description, to_status, scheduled_at)
            VALUES (?, ?, ?, ?, ?)
        `).run(applicationId, type, description, extra.toStatus ?? null, extra.scheduledAt ?? null);
        return Number(result.lastInsertRowid);
    }

    private applicationExists(id: string): boolean {
        return Boolean(this.getDb().prepare(`SELECT 1 FROM applications WHERE id = ?`).get(id));
    }

    /**
     * Saves the resume session of an existing application. The status is deliberately left alone:
     * it is owned by updateStatus(), so a stale editor can never roll back a move made on the board.
     */
    private saveCVSession(sessionData: CVSessionDataDTO): void {
        if (!this.sessionsDir) throw new Error("Sessions path not set. Call connect() first.");
        const rawDb = this.getDb();
        const row = rawDb.prepare(`SELECT json_file_path FROM applications WHERE id = ?`).get(sessionData.id) as { json_file_path: string | null } | undefined;
        if (!row?.json_file_path) {
            throw new Error(`Application with ID ${sessionData.id} not found in database.`);
        }

        const sessionDataWithoutStatus: Partial<CVSessionDataDTO> = { ...sessionData };
        delete sessionDataWithoutStatus.status;
        fs.writeFileSync(path.join(this.sessionsDir, row.json_file_path), JSON.stringify(sessionDataWithoutStatus, null, 2), "utf-8");

        rawDb.prepare(`
            UPDATE applications
            SET job_title = ?, company_name = ?, keywords = ?, salary = ?, url = ?
            WHERE id = ?
        `).run(
            sessionData.jobInfos?.title || sessionData.title || "Unknown",
            sessionData.jobInfos?.company || "Unknown",
            (sessionData.jobInfos?.keywords || []).join(","),
            parseSalary(sessionData.jobInfos?.salary),
            sessionData.jobInfos?.url || "",
            sessionData.id,
        );
    }

    /** The profile database, shared with job discovery (same file, so offers can be joined with applications). */
    public getDb() {
        if (!this.jobApplicationDb) {
            throw new Error("Database not connected. Call connect() first.");
        }
        return this.jobApplicationDb.getDbInstance();
    }

    public isConnected(): boolean {
        return this.sessionsDir !== null;
    }
}
