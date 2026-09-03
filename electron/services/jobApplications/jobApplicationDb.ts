import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { JobApplicationStatus } from "../../../shared/jobApplications.type";

export class JobApplicationDb {
    private db: Database.Database | null = null;
    private dbPath: string | null = null;

    public connect(profilePath: string): void {
        this.initDatabase(profilePath);
    }

    public getDbInstance(): Database.Database {
        if (!this.db) {
            throw new Error("Database not connected. Call connect() first.");
        }
        return this.db;
    }

    /**
    * Init the SQLite database in a global app data folder, ensuring persistence across sessions and security (no user access to raw files).
    */
    private initDatabase(profilePath: string): void {
        if (!fs.existsSync(profilePath)) {
            fs.mkdirSync(profilePath, { recursive: true });
        }

        const dbPath = path.join(profilePath, 'job_applications.db');
        if (this.dbPath === dbPath && this.db) {
            return;
        }
        this.dbPath = dbPath;
        this.db = new Database(dbPath);

        this.initSchema();
    }

    private initSchema(): void {
        if (!this.db) return;

        const statusString = Object.values(JobApplicationStatus).map(status => `'${status}'`).join(', ');
        const applicationTable = `
            CREATE TABLE IF NOT EXISTS applications (
                id TEXT PRIMARY KEY, -- UUID unique
                job_title TEXT NOT NULL,
                company_name TEXT NOT NULL,
                status TEXT NOT NULL CHECK (status IN (${statusString})),
                json_file_path TEXT, -- .json local
                pdf_file_path TEXT, -- exported PDF
                applied_at DATETIME, -- Date when the application was submitted
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `;

        const applicationEventsTable = `
            CREATE TABLE IF NOT EXISTS application_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                application_id TEXT NOT NULL,
                event_type TEXT NOT NULL,          -- 'STATUS_CHANGE', 'INTERVIEW_SCHEDULED', 'NOTE_ADDED'
                description TEXT,                  -- Ex: "Entrevue RH passée avec succès"
                event_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
            );
        `;

        this.db.exec(applicationTable);
        this.db.exec(applicationEventsTable);
    }
}