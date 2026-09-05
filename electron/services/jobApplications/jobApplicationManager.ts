import path from "node:path";
import { Application, ApplicationEvent, ApplicationEventType, ApplicationWithEvents, CreateApplicationDto, CVSessionDataDTO, JobApplicationStatus, KeyStats } from "../../../shared/jobApplications.type";
import { JobApplicationDb } from "./jobApplicationDb";
import fs from "node:fs";

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

    public getAllApplications(): Application[] {
        const rawDb = this.getDb();

        const sql = `
            SELECT *
            FROM applications
            ORDER BY created_at DESC
        `;

        const rows = rawDb.prepare(sql).all() as Partial<Application>[];

        return rows.map((row) => ({
            ...row,
            keywords: row.keywords ? (row.keywords as unknown as string).split(',') : []
        } as Application));
    }

    public getApplicationWithTimeline(applicationId: string): ApplicationWithEvents | null {
        const rawDb = this.getDb();
        const appSql = `
            SELECT *
            FROM applications
            WHERE id = ?
        `;
        const application = rawDb.prepare(appSql).get(applicationId) as Application | undefined;
        if (!application) return null;
        application.keywords = application.keywords ? (application.keywords as unknown as string).split(',') : [];

        const eventsSql = `
            SELECT *
            FROM application_events
            WHERE application_id = ?
            ORDER BY event_date DESC
        `;
        const events = rawDb.prepare(eventsSql).all(applicationId) as ApplicationEvent[];

        return { ...application, events };
    }

    public createApplication(dto: CreateApplicationDto) {
        if (!this.sessionsDir) throw new Error("Sessions path not set. Call connect() first.");
        const id = `app_${crypto.randomUUID()}`; // I hope it's unique enough for our use case. If not, we can add like jobTitle + companyName + timestamp or something like that.
        const initialStatus = JobApplicationStatus.DRAFT;

        const rawDb = this.getDb();

        const jobTitle = dto.jobInfos?.title || dto.title || "Unknown";
        const companyName = dto.jobInfos?.company || "Unknown";

        const relativeJsonPath = `cv_${id}.json`;
        const fullJsonPath = path.join(this.sessionsDir, relativeJsonPath);

        const fullSessionData: CVSessionDataDTO = {
            ...dto,
            id
        };

        fs.writeFileSync(fullJsonPath, JSON.stringify(fullSessionData, null, 2), "utf-8");

        const keywords = dto.jobInfos?.keywords || [];
        const url = dto.jobInfos?.url || "";

        const stmt = rawDb.prepare(`
            INSERT INTO applications (id, job_title, company_name, status, keywords, url, json_file_path)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        const eventStmt = rawDb.prepare(`
            INSERT INTO application_events (application_id, event_type, description)
            VALUES (?, ?, ?)
        `);

        try {
            const transaction = rawDb.transaction(() => {
                stmt.run(id, jobTitle, companyName, initialStatus, keywords.join(','), url, relativeJsonPath);
                eventStmt.run(id, ApplicationEventType.STATUS_CHANGE, `Created with status ${initialStatus}`);
            });
            transaction();
            return id;
        } catch (error) {
            if (fs.existsSync(fullJsonPath)) {
                fs.unlinkSync(fullJsonPath);
            }
            throw error;
        }
    }

    public getCVSession(id: string): CVSessionDataDTO | null {
        if (!this.sessionsDir) throw new Error("Sessions path not set. Call connect() first.");

        const rawDb = this.getDb();
        const row = rawDb.prepare(`SELECT json_file_path FROM applications WHERE id = ?`).get(id) as { json_file_path: string | null } | undefined;

        if (!row || !row.json_file_path) {
            return null;
        }

        const fullPath = path.join(this.sessionsDir, row.json_file_path);
        if (!fs.existsSync(fullPath)) {
            console.warn(`[JobApplicationManager] JSON file not found at: ${fullPath}`);
            return null;
        }

        const content = fs.readFileSync(fullPath, "utf-8");
        return JSON.parse(content) as CVSessionDataDTO;
    }

    public updateStatus(id: string, newStatus: JobApplicationStatus, note?: string) {
        const rawDb = this.getDb();

        const isApplied = newStatus === JobApplicationStatus.APPLIED;
        const appliedAtClause = isApplied ? `, applied_at = CURRENT_TIMESTAMP` : '';

        const updateStmt = rawDb.prepare(`
            UPDATE applications 
            SET status = ?, updated_at = CURRENT_TIMESTAMP ${appliedAtClause}
            WHERE id = ?
        `);

        const eventStmt = rawDb.prepare(`
            INSERT INTO application_events (application_id, event_type, description)
            VALUES (?, ?, ?)
        `);

        const transaction = rawDb.transaction(() => {
            updateStmt.run(newStatus, id);
            const desc = note ? `New status: ${newStatus} : ${note}` : `New status: ${newStatus}`;
            eventStmt.run(id, ApplicationEventType.STATUS_CHANGE, desc);
        });

        transaction();
    }

    public saveOrUpdateApplication(data: Partial<CVSessionDataDTO>): { id: string; success: boolean; error?: string } {
        if (data.id && this.applicationExists(data.id)) {
            this.saveCVSession(data as CVSessionDataDTO);
            return { id: data.id, success: true };
        }
        
        return { id: this.createApplication(data as CreateApplicationDto), success: true };
    }

    public getKeyStats(): KeyStats {
        const activeApplications = this.getActiveApplicationsCount();
        const activitySpark = this.getActivitySpark();
        const applicationsLastWeek = this.getApplicationsLastWeekCount();
        const avgResponseTimeDays = this.getAvgResponseTimeDays();
        const interviewRate = this.getInterviewRate();
        const ghostingRate = this.getGhostingRate();
        const offerRate = this.getOfferRate();

        return {
            activeApplications,
            activitySpark,
            applicationsLastWeek,
            avgResponseTimeDays,
            interviewRate,
            ghostingRate,
            offerRate
        };
    }

    /**
     * Number of active applications
     */
    private getActiveApplicationsCount(): number {
        const rawDb = this.getDb();
        const query = `
            SELECT COUNT(*) AS count 
            FROM applications 
            WHERE status NOT IN ('${JobApplicationStatus.DRAFT}', '${JobApplicationStatus.REJECTED}', '${JobApplicationStatus.OFFER}', '${JobApplicationStatus.WITHDRAWN}', '${JobApplicationStatus.ARCHIVED}', '${JobApplicationStatus.REVIEW}');
        `;
        const result = rawDb.prepare(query).get() as { count: number };
        return result.count;
    }

    /**
     * Generates a sparkline data array representing the number of applications submitted per week 
     * over the last 8 weeks (including the current week).
     */
    private getActivitySpark(): number[] {
        const rawDb = this.getDb();

        const query = `
            SELECT CAST((julianday('now') - julianday(applied_at)) / 7 AS INTEGER) AS weeks_ago,
                COUNT(*) AS count
            FROM applications
            WHERE applied_at >= datetime('now', '-56 days')
            AND applied_at IS NOT NULL
            GROUP BY weeks_ago;
        `;

        const rows = rawDb.prepare(query).all() as Array<{ weeks_ago: number; count: number }>;

        const sparkline = new Array(8).fill(0);
        for (const row of rows) {
            if (row.weeks_ago >= 0 && row.weeks_ago < 8) {
                sparkline[7 - row.weeks_ago] = row.count;
            }
        }

        return sparkline;
    }

    /**
     * Number of applications submitted in the last 7 days (including today).
     */
    private getApplicationsLastWeekCount(): number {
        const rawDb = this.getDb();
        const query = `
            SELECT COUNT(*) AS count 
            FROM applications 
            WHERE applied_at >= datetime('now', '-7 days');
        `;
        const result = rawDb.prepare(query).get() as { count: number };
        return result.count;
    }

    /**
     * Average response time in days for applications that have received a response (status change or interview scheduled) after being applied.
     */
    private getAvgResponseTimeDays(): number {
        const rawDb = this.getDb();
        const query = `
            SELECT ROUND(AVG(julianday(e.first_event) - julianday(a.applied_at)), 1) AS avg_days
            FROM applications a
            INNER JOIN (
                SELECT ae.application_id, MIN(ae.event_date) AS first_event
                FROM application_events ae
                INNER JOIN applications ap ON ap.id = ae.application_id
                WHERE (
                    ae.event_type = '${ApplicationEventType.INTERVIEW_SCHEDULED}'
                    OR (ae.event_type = '${ApplicationEventType.STATUS_CHANGE}' AND ae.description NOT LIKE 'New status: APPLIED%')
                )
                AND ap.applied_at IS NOT NULL
                AND ae.event_date > ap.applied_at
                GROUP BY ae.application_id
            ) e ON a.id = e.application_id
            WHERE a.applied_at IS NOT NULL;
        `;
        const result = rawDb.prepare(query).get() as { avg_days: number | null };
        return result?.avg_days ?? 0;
    }

    /**
     * interview rate: percentage of applications that have led to an interview (status 'INTERVIEW' or event 'INTERVIEW_SCHEDULED') out of all applications that have been applied (status not 'DRAFT' and applied_at is not null).
     */
    private getInterviewRate(): number {
        const rawDb = this.getDb();
        const query = `
            SELECT 
                ROUND(
                    (COUNT(DISTINCT CASE WHEN e.event_type = '${ApplicationEventType.INTERVIEW_SCHEDULED}' OR a.status = '${JobApplicationStatus.INTERVIEW}' THEN a.id END) * 100.0) / 
                    NULLIF(COUNT(DISTINCT CASE WHEN a.status != '${JobApplicationStatus.DRAFT}' AND a.applied_at IS NOT NULL THEN a.id END), 0), 1
                ) AS rate
            FROM applications a
            LEFT JOIN application_events e ON a.id = e.application_id;
        `;
        const result = rawDb.prepare(query).get() as { rate: number | null };
        return result?.rate ?? 0;
    }

    /**
     * Ghosting rate: percentage of applications that have been applied (status not 'DRAFT' and applied_at is not null) but have not received any response (no status change or interview scheduled) within 30 days of being applied.
     */
    private getGhostingRate(): number {
        const rawDb = this.getDb();
        const query = `
            SELECT 
                ROUND(
                    (COUNT(CASE WHEN status = '${JobApplicationStatus.APPLIED}' AND applied_at <= datetime('now', '-30 days') THEN 1 END) * 100.0) / 
                    NULLIF(COUNT(CASE WHEN status != '${JobApplicationStatus.DRAFT}' AND applied_at IS NOT NULL THEN 1 END), 0), 1
                ) AS rate
            FROM applications;
        `;
        const result = rawDb.prepare(query).get() as { rate: number | null };
        return result?.rate ?? 0;
    }

    /**
     * Conversion rate: percentage of applications that have received an offer (status 'OFFER_RECEIVED', 'OFFER_ACCEPTED', or 'OFFER_DECLINED') out of all applications that have been applied (status not 'DRAFT' and applied_at is not null).
     */
    private getOfferRate(): number {
        const rawDb = this.getDb();
        const query = `
            SELECT 
                ROUND(
                    (COUNT(CASE WHEN status IN ('${JobApplicationStatus.OFFER}', '${JobApplicationStatus.ACCEPTED}', '${JobApplicationStatus.WITHDRAWN}') THEN 1 END) * 100.0) / 
                    NULLIF(COUNT(CASE WHEN status != '${JobApplicationStatus.DRAFT}' AND applied_at IS NOT NULL THEN 1 END), 0), 1
                ) AS rate
            FROM applications;
        `;
        const result = rawDb.prepare(query).get() as { rate: number | null };
        return result?.rate ?? 0;
    }

    private applicationExists(id: string): boolean {
        const rawDb = this.getDb();
        const row = rawDb.prepare(`SELECT 1 FROM applications WHERE id = ?`).get(id);
        return Boolean(row);
    }

    private saveCVSession(sessionData: CVSessionDataDTO): void {
        if (!this.sessionsDir) throw new Error("Sessions path not set. Call connect() first.");

        const rawDb = this.getDb();
        const row = rawDb.prepare(`SELECT json_file_path FROM applications WHERE id = ?`).get(sessionData.id) as { json_file_path: string | null } | undefined;

        if (!row || !row.json_file_path) {
            throw new Error(`Application with ID ${sessionData.id} not found in database.`);
        }

        const fullPath = path.join(this.sessionsDir, row.json_file_path);

        fs.writeFileSync(fullPath, JSON.stringify(sessionData, null, 2), "utf-8");

        const jobTitle = sessionData.jobInfos?.title || sessionData.title || "Unknown";
        const companyName = sessionData.jobInfos?.company || "Unknown";
        const keywords = sessionData.jobInfos?.keywords || [];
        const url = sessionData.jobInfos?.url || "";

        const updateStmt = rawDb.prepare(`
            UPDATE applications 
            SET job_title = ?, company_name = ?, keywords = ?, url = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        `);

        updateStmt.run(jobTitle, companyName, keywords.join(','), url, sessionData.id);
    }

    private getDb() {
        if (!this.jobApplicationDb) {
            throw new Error("Database not connected. Call connect() first.");
        }
        return this.jobApplicationDb.getDbInstance();
    }
}