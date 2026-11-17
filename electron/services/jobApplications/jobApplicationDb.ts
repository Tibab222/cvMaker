import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { ApplicationEventType, JobApplicationStatus } from "../../../shared/jobApplications.type";
import { addColumnIfMissing, Migration, runMigrations } from "../db/migrations";

const statusList = (statuses: string[]) => statuses.map((status) => `'${status}'`).join(", ");

/**
 * Schema history of job_applications.db. Append new steps at the end, never rewrite a shipped one.
 */
const MIGRATIONS: Migration[] = [
    {
        version: 1,
        name: "baseline applications + events",
        up: (db) => {
            // Same shape as the pre-migration schema, so databases created by older versions are adopted as-is.
            db.exec(`
                CREATE TABLE IF NOT EXISTS applications (
                    id TEXT PRIMARY KEY,
                    job_title TEXT NOT NULL,
                    company_name TEXT NOT NULL,
                    status TEXT NOT NULL CHECK (status IN (${statusList(Object.values(JobApplicationStatus))})),
                    keywords TEXT,
                    salary INTEGER,
                    recruiter_contact TEXT,
                    url TEXT,
                    json_file_path TEXT,
                    pdf_file_path TEXT,
                    motivation_letter_file_path TEXT,
                    notes TEXT,
                    applied_at DATETIME,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TRIGGER IF NOT EXISTS update_applications_timestamp
                AFTER UPDATE ON applications
                BEGIN
                    UPDATE applications SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
                END;

                CREATE TABLE IF NOT EXISTS application_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    application_id TEXT NOT NULL,
                    event_type TEXT NOT NULL CHECK (event_type IN ('STATUS_CHANGE', 'INTERVIEW_SCHEDULED', 'NOTE_ADDED')),
                    description TEXT,
                    event_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
                );
            `);
            // Columns that were added by hand before migrations existed.
            addColumnIfMissing(db, "applications", "salary", "INTEGER");
            addColumnIfMissing(db, "applications", "recruiter_contact", "TEXT");
            addColumnIfMissing(db, "applications", "motivation_letter_file_path", "TEXT");
            addColumnIfMissing(db, "applications", "notes", "TEXT");
        },
    },
    {
        version: 2,
        name: "structured events (to_status, scheduled_at, new event types)",
        up: (db) => {
            // SQLite cannot alter a CHECK constraint, so the events table is rebuilt.
            db.exec(`
                CREATE TABLE application_events_new (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    application_id TEXT NOT NULL,
                    event_type TEXT NOT NULL CHECK (event_type IN (${statusList(Object.values(ApplicationEventType))})),
                    description TEXT,
                    to_status TEXT, -- new status for STATUS_CHANGE events, so stats no longer parse descriptions
                    scheduled_at DATETIME, -- when the interview / follow-up happens (ISO string), not when it was logged
                    event_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
                );

                INSERT INTO application_events_new (id, application_id, event_type, description, to_status, event_date)
                SELECT
                    id,
                    application_id,
                    event_type,
                    description,
                    CASE
                        WHEN event_type = 'STATUS_CHANGE' AND description LIKE 'Created with status %'
                            THEN TRIM(SUBSTR(description, LENGTH('Created with status ') + 1))
                        WHEN event_type = 'STATUS_CHANGE' AND description LIKE 'New status: %'
                            THEN TRIM(SUBSTR(
                                SUBSTR(description, LENGTH('New status: ') + 1),
                                1,
                                CASE
                                    WHEN INSTR(SUBSTR(description, LENGTH('New status: ') + 1), ' ') > 0
                                        THEN INSTR(SUBSTR(description, LENGTH('New status: ') + 1), ' ') - 1
                                    ELSE LENGTH(description)
                                END
                            ))
                        ELSE NULL
                    END,
                    event_date
                FROM application_events;

                DROP TABLE application_events;
                ALTER TABLE application_events_new RENAME TO application_events;

                CREATE INDEX IF NOT EXISTS idx_application_events_application ON application_events(application_id, event_date);
                CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
            `);
        },
    },
];

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
    * Init the SQLite database in the profile folder and bring its schema up to date.
    */
    private initDatabase(profilePath: string): void {
        if (!fs.existsSync(profilePath)) {
            fs.mkdirSync(profilePath, { recursive: true });
        }

        const dbPath = path.join(profilePath, 'job_applications.db');
        if (this.dbPath === dbPath && this.db) {
            return;
        }
        // switching profile: release the previous file handle
        this.db?.close();

        this.dbPath = dbPath;
        this.db = new Database(dbPath);

        runMigrations(this.db, MIGRATIONS, "job_applications");
        // enabled after migrations: the pragma is a no-op inside a transaction, and table rebuilds are easier without it
        this.db.pragma("foreign_keys = ON");
    }
}
