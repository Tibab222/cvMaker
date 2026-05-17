import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';

export class KeywordsAffinityDatabase {
  private static instance: KeywordsAffinityDatabase | null = null;
  private db: Database.Database | null = null;

  private constructor() {
    this.initDatabase();
  }

  public static getInstance(): KeywordsAffinityDatabase {
    if (!KeywordsAffinityDatabase.instance) {
      KeywordsAffinityDatabase.instance = new KeywordsAffinityDatabase();
    }
    return KeywordsAffinityDatabase.instance;
  }

  /**
   * Init the SQLite database in a global app data folder, ensuring persistence across sessions and security (no user access to raw files).
   */
  private initDatabase(): void {
    const appDataPath = process.env.APPDATA || 
                        (process.platform === 'darwin' ? path.join(process.env.HOME || '', 'Library/Application Support') : path.join(process.env.HOME || '', '.config'));
    
    const globalAppFolder = path.join(appDataPath, 'cv-maker'); 
    
    if (!fs.existsSync(globalAppFolder)) {
      fs.mkdirSync(globalAppFolder, { recursive: true });
    }

    const dbPath = path.join(globalAppFolder, 'keywords_affinity.db');
    this.db = new Database(dbPath);

    this.initSchema();
    console.log(`[AffinityDB] Connected to global database: ${dbPath}`);
  }

  private initSchema(): void {
    if (!this.db) return;

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS local_skills_affinity (
        keyword TEXT PRIMARY KEY,
        global_count INTEGER DEFAULT 1,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  /**
   * Get the global count of a keyword across all analyses. 
   * This can be used to boost keywords that have been frequently validated by users, or to filter out noise.
   */
  public getKeywordGlobalCount(keyword: string): number {
    if (!this.db) return 0;

    const stmt = this.db.prepare(`
      SELECT global_count FROM local_skills_affinity WHERE keyword = ?
    `);
    
    const res = stmt.get(keyword.toLowerCase()) as { global_count: number } | undefined;
    return res ? res.global_count : 0;
  }

  /**
   * Increment or insert the keyword after validation of an offer (Upsert)
   */
  public incrementKeywords(keywords: string[]): void {
    if (!this.db) throw new Error("Affinity Database not connected");

    const upsertStmt = this.db.prepare(`
      INSERT INTO local_skills_affinity (keyword, global_count, updated_at)
      VALUES (?, 1, CURRENT_TIMESTAMP)
      ON CONFLICT(keyword) DO UPDATE SET 
        global_count = global_count + 1,
        updated_at = CURRENT_TIMESTAMP
    `);

    const transaction = this.db.transaction((list: string[]) => {
      for (const kw of list) {
        upsertStmt.run(kw.toLowerCase().trim());
      }
    });

    transaction(keywords);
  }

  /**
   * Eviction Policy
   * Removes noisy keywords that have only been crossed once if the table grows too large.
   */
  public runEvictionPolicy(): void {
    if (!this.db) return;

    const noiseStmt = this.db.prepare(`
        SELECT COUNT(*) as noise_total FROM local_skills_affinity WHERE global_count <= 1
    `);
    const { noise_total } = noiseStmt.get() as { noise_total: number };

    if (noise_total > 1000) {
        console.log(`[AffinityDB] Cleaning up ${noise_total} noisy keywords from database...`);
        
        this.db.exec(`
            DELETE FROM local_skills_affinity WHERE global_count <= 1;
            VACUUM;
        `);
    }
  }

  public close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}