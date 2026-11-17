import type Database from "better-sqlite3";

/**
 * A single schema step. `up` runs inside a transaction, so a failing migration leaves the database untouched.
 * Versions must start at 1 and increase by one; never edit a migration that has already shipped, add a new one instead.
 */
export interface Migration {
    version: number;
    name: string;
    up: (db: Database.Database) => void;
}

/**
 * Brings the database up to the latest version, tracking progress with SQLite's built-in `PRAGMA user_version`.
 * Databases created before migrations existed report version 0, so the first migration of each database
 * must be idempotent (CREATE ... IF NOT EXISTS, guarded ALTERs) to adopt them safely.
 */
export function runMigrations(db: Database.Database, migrations: Migration[], label: string): void {
    const sorted = [...migrations].sort((a, b) => a.version - b.version);
    sorted.forEach((migration, index) => {
        if (migration.version !== index + 1) {
            throw new Error(`[${label}] Migration versions must be consecutive from 1 (got ${migration.version} at position ${index + 1})`);
        }
    });

    const currentVersion = db.pragma("user_version", { simple: true }) as number;
    const latestVersion = sorted.length;

    if (currentVersion > latestVersion) {
        // Database written by a newer version of the app: refuse to guess, but keep working with what we know.
        console.warn(`[${label}] Database version ${currentVersion} is newer than this app (${latestVersion}).`);
        return;
    }

    for (const migration of sorted) {
        if (migration.version <= currentVersion) continue;

        const apply = db.transaction(() => {
            migration.up(db);
            db.pragma(`user_version = ${migration.version}`);
        });
        apply();
        console.log(`[${label}] Applied migration ${migration.version}: ${migration.name}`);
    }
}

/**
 * True when `table` already has `column`. Used to make the baseline migrations safe on older databases.
 */
export function hasColumn(db: Database.Database, table: string, column: string): boolean {
    const columns = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
    return columns.some((c) => c.name === column);
}

/**
 * Adds a column only if it does not exist yet.
 */
export function addColumnIfMissing(db: Database.Database, table: string, column: string, definition: string): void {
    if (!hasColumn(db, table, column)) {
        db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    }
}
