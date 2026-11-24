import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { ApplicationEventType, JobApplicationStatus } from "../../../shared/jobApplications.type";
import { DiscoveredJobStatus, JobSourceKind } from "../../../shared/discovery.types";
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
    {
        version: 3,
        name: "job discovery (sources, discovered offers, settings)",
        up: (db) => {
            db.exec(`
                CREATE TABLE job_sources (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    kind TEXT NOT NULL CHECK (kind IN (${statusList(Object.values(JobSourceKind))})),
                    token TEXT NOT NULL,
                    label TEXT NOT NULL,
                    enabled INTEGER NOT NULL DEFAULT 1,
                    last_run_at DATETIME,
                    last_error TEXT,
                    last_found INTEGER NOT NULL DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE (kind, token)
                );

                CREATE TABLE discovered_jobs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    source_id INTEGER REFERENCES job_sources(id) ON DELETE SET NULL,
                    origin TEXT NOT NULL DEFAULT 'board' CHECK (origin IN ('board', 'extension')),
                    external_key TEXT NOT NULL UNIQUE, -- dedup key: same offer seen twice is stored once
                    company TEXT NOT NULL,
                    title TEXT NOT NULL,
                    location TEXT,
                    remote INTEGER NOT NULL DEFAULT 0,
                    url TEXT,
                    description TEXT NOT NULL DEFAULT '',
                    salary TEXT,
                    posted_at DATETIME,
                    discovered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    score REAL,
                    matched_keywords TEXT,
                    missing_keywords TEXT,
                    status TEXT NOT NULL DEFAULT 'NEW' CHECK (status IN (${statusList(Object.values(DiscoveredJobStatus))}))
                );
                CREATE INDEX idx_discovered_jobs_status ON discovered_jobs(status, score);

                CREATE TABLE app_settings (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                );
            `);
        },
    },
    {
        version: 4,
        name: "keyword searches as job sources (adzuna)",
        up: (db) => {
            // SQLite cannot alter a CHECK constraint: job_sources is rebuilt with the new kind list.
            // Foreign keys are off during migrations, so discovered_jobs.source_id keeps pointing at the same ids.
            db.exec(`
                CREATE TABLE job_sources_new (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    kind TEXT NOT NULL CHECK (kind IN (${statusList(Object.values(JobSourceKind))})),
                    token TEXT NOT NULL,
                    label TEXT NOT NULL,
                    enabled INTEGER NOT NULL DEFAULT 1,
                    last_run_at DATETIME,
                    last_error TEXT,
                    last_found INTEGER NOT NULL DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE (kind, token)
                );
                INSERT INTO job_sources_new (id, kind, token, label, enabled, last_run_at, last_error, last_found, created_at)
                SELECT id, kind, token, label, enabled, last_run_at, last_error, last_found, created_at FROM job_sources;
                DROP TABLE job_sources;
                ALTER TABLE job_sources_new RENAME TO job_sources;
                CREATE INDEX IF NOT EXISTS idx_discovered_jobs_company_title ON discovered_jobs(company COLLATE NOCASE, title COLLATE NOCASE);
            `);
        },
    },
    {
        version: 5,
        name: "resume vault",
        up: (db) => {
            // the PDF itself lives in <profile>/vault/; the row keeps what is needed to match it without reopening it
            db.exec(`
                CREATE TABLE vault_resumes (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    file_name TEXT NOT NULL,
                    stored_file TEXT NOT NULL,
                    sha256 TEXT NOT NULL UNIQUE, -- same file imported twice is stored once
                    size INTEGER NOT NULL,
                    pages INTEGER NOT NULL DEFAULT 0,
                    language TEXT NOT NULL,
                    text TEXT NOT NULL DEFAULT '',
                    keywords TEXT NOT NULL DEFAULT '[]',
                    thumbnail TEXT,
                    embedding BLOB, -- local MiniLM vector of the text, null when the model is unavailable
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
            `);
        },
    },
    {
        version: 6,
        name: "applications added by hand (how the user applied, offer text)",
        up: (db) => {
            // no CHECK on channel: new channels must not need a table rebuild; the manager validates it
            addColumnIfMissing(db, "applications", "channel", "TEXT");
            // offer text of applications made outside the app (the others keep it in their resume session)
            addColumnIfMissing(db, "applications", "description", "TEXT");
            db.exec(`CREATE INDEX IF NOT EXISTS idx_applications_company ON applications(company_name COLLATE NOCASE)`);
        },
    },
    {
        version: 7,
        name: "No response status",
        up: (db) => {
            // SQLite cannot alter a CHECK constraint: applications is rebuilt with the new status list. Foreign keys
            // are off during migrations, so the events keep pointing at the same ids; the trigger and indexes go with
            // the old table and are recreated.
            db.exec(`
                CREATE TABLE applications_new (
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
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    channel TEXT,
                    description TEXT
                );
                INSERT INTO applications_new (id, job_title, company_name, status, keywords, salary, recruiter_contact, url, json_file_path,
                                              pdf_file_path, motivation_letter_file_path, notes, applied_at, created_at, updated_at, channel, description)
                SELECT id, job_title, company_name, status, keywords, salary, recruiter_contact, url, json_file_path,
                       pdf_file_path, motivation_letter_file_path, notes, applied_at, created_at, updated_at, channel, description
                FROM applications;
                DROP TABLE applications;
                ALTER TABLE applications_new RENAME TO applications;

                CREATE TRIGGER IF NOT EXISTS update_applications_timestamp
                AFTER UPDATE ON applications
                BEGIN
                    UPDATE applications SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
                END;
                CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
                CREATE INDEX IF NOT EXISTS idx_applications_company ON applications(company_name COLLATE NOCASE);
            `);
        },
    },
    {
        version: 8,
        name: "answer bank (application-form questions and the answers given)",
        up: (db) => {
            // question_key: the question without case, accents or punctuation, so a form asking it again finds it
            db.exec(`
                CREATE TABLE form_answers (
                    id TEXT PRIMARY KEY,
                    question TEXT NOT NULL,
                    question_key TEXT NOT NULL UNIQUE,
                    answer TEXT NOT NULL,
                    kind TEXT NOT NULL DEFAULT 'text',
                    options TEXT NOT NULL DEFAULT '[]',
                    source_host TEXT,
                    uses INTEGER NOT NULL DEFAULT 1,
                    embedding BLOB, -- local MiniLM vector of the question, computed on the first match
                    last_used_at DATETIME,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
            `);
        },
    },
    {
        version: 9,
        name: "offers linked to the applications made from them (opened, applied)",
        up: (db) => {
            // new APPLIED status: discovered_jobs is rebuilt for its CHECK (nothing points at it). opened_at: the user
            // opened the offer's link from the app; application_id: the application it turned into.
            db.exec(`
                CREATE TABLE discovered_jobs_new (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    source_id INTEGER REFERENCES job_sources(id) ON DELETE SET NULL,
                    origin TEXT NOT NULL DEFAULT 'board' CHECK (origin IN ('board', 'extension')),
                    external_key TEXT NOT NULL UNIQUE,
                    company TEXT NOT NULL,
                    title TEXT NOT NULL,
                    location TEXT,
                    remote INTEGER NOT NULL DEFAULT 0,
                    url TEXT,
                    description TEXT NOT NULL DEFAULT '',
                    salary TEXT,
                    posted_at DATETIME,
                    discovered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    score REAL,
                    matched_keywords TEXT,
                    missing_keywords TEXT,
                    status TEXT NOT NULL DEFAULT 'NEW' CHECK (status IN (${statusList(Object.values(DiscoveredJobStatus))})),
                    opened_at DATETIME,
                    application_id TEXT
                );
            `);
            // the queue's offers move over (a database without the table, which migration 3 creates, has none to move)
            const hasQueue = db.prepare(`SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'discovered_jobs'`).get();
            if (hasQueue) {
                db.exec(`
                    INSERT INTO discovered_jobs_new (id, source_id, origin, external_key, company, title, location, remote, url, description, salary,
                                                     posted_at, discovered_at, score, matched_keywords, missing_keywords, status)
                    SELECT id, source_id, origin, external_key, company, title, location, remote, url, description, salary,
                           posted_at, discovered_at, score, matched_keywords, missing_keywords, status
                    FROM discovered_jobs;
                    DROP TABLE discovered_jobs;
                `);
            }
            db.exec(`
                ALTER TABLE discovered_jobs_new RENAME TO discovered_jobs;
                CREATE INDEX idx_discovered_jobs_status ON discovered_jobs(status, score);
                CREATE INDEX idx_discovered_jobs_company_title ON discovered_jobs(company COLLATE NOCASE, title COLLATE NOCASE);
                CREATE INDEX idx_discovered_jobs_opened ON discovered_jobs(opened_at);
            `);
        },
    },
    {
        version: 10,
        name: "interview questions (prepared answers, linked to the applications that asked them)",
        up: (db) => {
            // links go with a deleted application or question (ON DELETE CASCADE); reads join on applications as well
            db.exec(`
                CREATE TABLE interview_questions (
                    id TEXT PRIMARY KEY,
                    question TEXT NOT NULL,
                    answer TEXT NOT NULL DEFAULT '',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE interview_question_applications (
                    question_id TEXT NOT NULL REFERENCES interview_questions(id) ON DELETE CASCADE,
                    application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
                    PRIMARY KEY (question_id, application_id)
                );
                CREATE INDEX idx_interview_question_applications_application ON interview_question_applications(application_id);
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
        // runMigrations turns enforcement off while it rebuilds tables; it is on for everything else
        this.db.pragma("foreign_keys = ON");
    }
}
