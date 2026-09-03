import { CreateApplicationDto, JobApplicationStatus } from "../../../shared/jobApplications.type";
import { JobApplicationDb } from "./jobApplicationDb";

export class JobApplicationManager {
    private static instance: JobApplicationManager | null = null;
    private jobApplicationDb: JobApplicationDb | null = null;

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
    }

    public createApplication(dto: CreateApplicationDto) {
        const id = `app_${crypto.randomUUID()}`;
        const initialStatus = JobApplicationStatus.DRAFT;

        const rawDb = this.getDb();

        const stmt = rawDb.prepare(`
            INSERT INTO applications (id, job_title, company_name, status, json_file_path, pdf_file_path)
            VALUES (?, ?, ?, ?, ?, ?)
        `);

        const eventStmt = rawDb.prepare(`
            INSERT INTO application_events (application_id, event_type, description)
            VALUES (?, 'STATUS_CHANGE', ?)
        `);

        const transaction = rawDb.transaction(() => {
            stmt.run(id, dto.jobTitle, dto.companyName, initialStatus, dto.jsonFilePath || null, dto.pdfFilePath || null);
            eventStmt.run(id, `Candidature créée avec le statut ${initialStatus}`);
        });

        transaction();
        return id;
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

    private getDb() {
        if (!this.jobApplicationDb) {
            throw new Error("Database not connected. Call connect() first.");
        }
        return this.jobApplicationDb.getDbInstance();
    }
}