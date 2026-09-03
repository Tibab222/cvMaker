import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { KeywordStat } from '../../../shared/Keywords.types';

export class KeywordsAffinityDatabase {
  private static instance: KeywordsAffinityDatabase | null = null;
  private db: Database.Database | null = null;
  private dbPath: string | null = null;

  private constructor() {}

  public static getInstance(): KeywordsAffinityDatabase {
    if (!KeywordsAffinityDatabase.instance) {
      KeywordsAffinityDatabase.instance = new KeywordsAffinityDatabase();
    }
    return KeywordsAffinityDatabase.instance;
  }

  public static reduceCountForKeyword(keyword: string, amount: number = 1): void {
    const instance = this.getInstance();
    if (!instance.db) throw new Error("Affinity Database not connected");
    const stmt = instance.db.prepare(`
      UPDATE local_skills_affinity SET global_count = global_count - ? WHERE keyword = ?
    `);
    stmt.run(amount, keyword.toLowerCase().trim());
  }

  public connect(profilePath: string): void {
    this.initDatabase(profilePath);
  }

  /**
   * Init the SQLite database in a global app data folder, ensuring persistence across sessions and security (no user access to raw files).
   */
  private initDatabase(profilePath: string): void {
    if (!fs.existsSync(profilePath)) {
      fs.mkdirSync(profilePath, { recursive: true });
    }

    const dbPath = path.join(profilePath, 'keywords_affinity.db');
    if (this.dbPath === dbPath && this.db) {
      return;
    }
    this.dbPath = dbPath;
    this.db = new Database(dbPath);

    this.initSchema();
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

    if (noise_total > 2000) {
        
        this.db.exec(`
            DELETE FROM local_skills_affinity WHERE global_count <= 1;
            VACUUM;
        `);
    }
  }

  /**
   * Get the top N keywords by global count, useful for displaying trending skills or for analytics.
   */
  public getTopKeywords(limit: number = 10): KeywordStat[] {
    if (!this.db) return [];

    const stmt = this.db.prepare(`
      SELECT keyword, global_count 
      FROM local_skills_affinity 
      ORDER BY global_count DESC 
      LIMIT ?
    `);

    return stmt.all(limit) as KeywordStat[];
  }

  /**
   * Get the maximum global count across all keywords, useful for normalizing scores or for analytics.
   */
  public getTotalAnalysesCount(): number {
    if (!this.db) return 0;

    const stmt = this.db.prepare(`
      SELECT MAX(global_count) as max_count FROM local_skills_affinity
    `);
    
    const res = stmt.get() as { max_count: number } | undefined;
    return res && res.max_count ? res.max_count : 1;
  }

  public close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}