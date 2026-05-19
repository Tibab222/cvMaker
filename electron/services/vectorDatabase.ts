import Database from 'better-sqlite3';
import path from 'node:path';

export class VectorDatabase {
  private static instance: VectorDatabase | null = null;
  private db: Database.Database | null = null;
  private currentProfilePath: string | null = null;

  private constructor() {}

// singleton
  public static getInstance(): VectorDatabase {
    if (!VectorDatabase.instance) {
      VectorDatabase.instance = new VectorDatabase();
    }
    return VectorDatabase.instance;
  }

  /**
   * Initialise or change the database connection based on the profile
   */
  public connect(profilePath: string): void {
    if (this.currentProfilePath === profilePath && this.db) return;

    if (this.db) {
      this.db.close();
      console.log('[VectorDatabase] Old database connection closed');
    }

    const dbPath = path.join(profilePath, 'vector_index.db');
    this.db = new Database(dbPath);
    this.currentProfilePath = profilePath;

    this.db.pragma('foreign_keys = ON');
    this.initSchema();
    console.log(`[VectorDatabase] Connected to vector database: ${dbPath}`);
  }

  public clearAll(): void {
    if (!this.db) return;
    this.db.exec(`
      DELETE FROM idx_project_bullets; 
      DELETE FROM idx_projects;
      DELETE FROM idx_experiences;
      VACUUM;
    `);
    console.log('[VectorDatabase] All vector data cleared from the database');
  }

  private initSchema(): void {
    if (!this.db) return;

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS idx_experiences (
        id TEXT PRIMARY KEY, 
        local_id TEXT UNIQUE,
        vector BLOB,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS idx_projects (
        id TEXT PRIMARY KEY,
        local_id TEXT UNIQUE,
        vector BLOB, -- title + subtitle (if exists)
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS idx_project_bullets (
            id TEXT PRIMARY KEY,
            project_id TEXT,           -- FK vers idx_projects.id
            local_bullet_id TEXT UNIQUE,      -- ID du bullet dans le JSON
            vector BLOB,               -- Vecteur du texte du bullet + tags
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(project_id) REFERENCES idx_projects(id) ON DELETE CASCADE
        );
    `);
  }

  /**
   * Upsert a project vector using local_id to detect conflicts. Returns the database ID of the project.
   */
  public upsertProject(localId: string, vector: Buffer): string {
    if (!this.db) throw new Error("Database not connected");

    const stmt = this.db.prepare(`
      INSERT INTO idx_projects (id, local_id, vector)
      VALUES (lower(hex(randomblob(16))), ?, ?)
      ON CONFLICT(local_id) DO UPDATE SET 
        vector = excluded.vector,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `);
    
    const res = stmt.get(localId, vector) as { id: string };
    return res.id;
  }

  /**
   * Upsert a bullet linked to a project
   */
  public upsertProjectBullet(sqlProjectId: string, localBulletId: string, vector: Buffer): void {
    if (!this.db) throw new Error("Database not connected");

    const stmt = this.db.prepare(`
      INSERT INTO idx_project_bullets (id, project_id, local_bullet_id, vector)
      VALUES (lower(hex(randomblob(16))), ?, ?, ?)
      ON CONFLICT(local_bullet_id) DO UPDATE SET 
        vector = excluded.vector,
        updated_at = CURRENT_TIMESTAMP
    `);
    
    stmt.run(sqlProjectId, localBulletId, vector);
  }

  /**
   * Get all project bullets with their vectors and associated local project ID
   */
  public getAllProjectBullets(): { local_bullet_id: string, vector: Buffer, local_project_id: string }[] {
    if (!this.db) return [];
    return this.db.prepare(`
      SELECT b.local_bullet_id, b.vector, p.local_id as local_project_id 
      FROM idx_project_bullets b
      JOIN idx_projects p ON b.project_id = p.id
    `).all() as { local_bullet_id: string, vector: Buffer, local_project_id: string }[];
  }

  /**
   * Upsert d'une expérience (bloc unique)
   */
  public upsertExperience(localId: string, vector: Buffer): void {
    if (!this.db) throw new Error("Database not connected");

    const stmt = this.db.prepare(`
      INSERT INTO idx_experiences (id, local_id, vector)
      VALUES (lower(hex(randomblob(16))), ?, ?)
      ON CONFLICT(local_id) DO UPDATE SET 
        vector = excluded.vector,
        updated_at = CURRENT_TIMESTAMP
    `);
    
    stmt.run(localId, vector);
  }

  /**
   * Récupère tous les vecteurs d'expériences pour le matching
   */
  public getAllExperiences(): { local_id: string, vector: Buffer }[] {
    if (!this.db) return [];
    return this.db.prepare(`
      SELECT local_id, vector FROM idx_experiences
    `).all() as { local_id: string, vector: Buffer }[];
  }

  public close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}