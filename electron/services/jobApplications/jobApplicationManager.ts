import path from "node:path";
import { CreateApplicationDto, CVSessionDataDTO, JobApplicationStatus } from "../../../shared/jobApplications.type";
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

        const stmt = rawDb.prepare(`
            INSERT INTO applications (id, job_title, company_name, status, json_file_path)
            VALUES (?, ?, ?, ?, ?)
        `);

        const eventStmt = rawDb.prepare(`
            INSERT INTO application_events (application_id, event_type, description)
            VALUES (?, 'STATUS_CHANGE', ?)
        `);

        try {
            const transaction = rawDb.transaction(() => {
                stmt.run(id, jobTitle, companyName, initialStatus, relativeJsonPath);
                eventStmt.run(id, `Created with status ${initialStatus}`);
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
            VALUES (?, 'STATUS_CHANGE', ?)
        `);

        const transaction = rawDb.transaction(() => {
            updateStmt.run(newStatus, id);
            const desc = note ? `New status: ${newStatus} : ${note}` : `New status: ${newStatus}`;
            eventStmt.run(id, desc);
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

        const updateStmt = rawDb.prepare(`
            UPDATE applications 
            SET job_title = ?, company_name = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        `);

        updateStmt.run(jobTitle, companyName, sessionData.id);
    }

    private getDb() {
        if (!this.jobApplicationDb) {
            throw new Error("Database not connected. Call connect() first.");
        }
        return this.jobApplicationDb.getDbInstance();
    }
}