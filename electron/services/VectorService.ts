import { pipeline, FeatureExtractionPipeline, env } from '@xenova/transformers';
import { VectorDatabase } from './vectorDatabase';
import { cosineSimilarity, bufferToFloat32Array } from '../utils/math';
import { Experience } from '../../shared/Experience.interface';
import { Project } from '../../shared/projects.interface';
import path from 'path';
import { app } from 'electron';

env.localModelPath = ''; 
env.allowRemoteModels = true;
env.allowLocalModels = true;
env.useBrowserCache = false;

export class VectorService {
  private static instance: VectorService | null = null;
  private embedder: FeatureExtractionPipeline | null = null;
  private db: VectorDatabase;

  private constructor() {
    this.db = VectorDatabase.getInstance();
  }

  public static getInstance(): VectorService {
    if (!VectorService.instance) {
      VectorService.instance = new VectorService();
    }
    return VectorService.instance;
  }

  /**
   * Initialize the embedding model
   */
  private async initModel() {
    if (!this.embedder) {
      env.cacheDir = path.join(app.getPath('userData'), '.cache');
      env.allowRemoteModels = true;
      this.embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    }
  }

  /**
   * text to vector using the embedding model
   */
  public async generateEmbedding(text: string): Promise<Float32Array> {
    await this.initModel();
    if (!this.embedder) throw new Error('Embedder not initialized');
    const output = await this.embedder(text, { pooling: 'mean', normalize: true });
    return output.data as Float32Array;
  }

  /**
   * Experiences ranking (Simple)
   */
  public async rankExperiences(jobDescription: string, topK: number = 3) {
    const queryVector = await this.generateEmbedding(jobDescription);
    const exps = this.db.getAllExperiences();

    const scored = exps.map(exp => ({
      local_id: exp.local_id,
      score: cosineSimilarity(queryVector, bufferToFloat32Array(exp.vector))
    }));

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  /**
   * Project ranking
   */
  public async rankProjectsByBullets(jobDescription: string, topKBullets: number = 10) {
    const queryVector = await this.generateEmbedding(jobDescription);
    const bullets = this.db.getAllProjectBullets();

    const scoredBullets = bullets.map(b => ({
      local_bullet_id: b.local_bullet_id,
      local_project_id: b.local_project_id,
      score: cosineSimilarity(queryVector, bufferToFloat32Array(b.vector))
    }));

    const topBullets = scoredBullets
      .sort((a, b) => b.score - a.score)
      .slice(0, topKBullets);

    const projectRelevance: Record<string, number> = {};
    topBullets.forEach(b => {
      projectRelevance[b.local_project_id] = (projectRelevance[b.local_project_id] || 0) + b.score;
    });

    return {
      bestBullets: topBullets,
      suggestedProjects: Object.entries(projectRelevance)
        .sort(([, a], [, b]) => b - a)
        .map(([id]) => id)
    };
  }

  /**
   * Clear and rebuild the entire vector index for a profile (used during sync)
   * @param profilePath Path to the profile's data directory
   * @param experiences to index
   * @param projects to index
   */
  async rebuildVectorIndex(profilePath: string, experiences: Experience[], projects: Project[]) {
    const db = VectorDatabase.getInstance();

    db.connect(profilePath);
    db.clearAll();
    
    for (const exp of experiences) {
      const text = `${exp.jobTitle}: ${exp.description || ''}`;
      const vector = await this.generateEmbedding(text);
      db.upsertExperience(exp.id, Buffer.from(vector.buffer));
    }

    for (const proj of projects) {
      const projText = `${proj.title} ${proj.subtitle ? '- '+proj.subtitle : ''}`;
      const projVector = await this.generateEmbedding(projText);
      
      const sqlProjId = db.upsertProject(proj.id, Buffer.from(projVector.buffer));

      for (const bullet of proj.bullets) {
        const bulletText = `${bullet.text} (${bullet.tags.join(' ')})`;
        const bulletVector = await this.generateEmbedding(bulletText);
        db.upsertProjectBullet(sqlProjId, bullet.id, Buffer.from(bulletVector.buffer));
      }
    }
  }

  /**
   * Sync experiences (used when modifying an experience)
   * @param profilePath path to the profile's data directory
   * @param experiences to index
   */
  async syncExperiences(profilePath: string, experiences: Experience[]) {
    const db = VectorDatabase.getInstance();
    db.connect(profilePath);
    
    db.clearExperiences();

    for (const exp of experiences) {
        const text = `${exp.jobTitle}: ${exp.description || ''}`;
        const vector = await this.generateEmbedding(text);
        db.upsertExperience(exp.id, Buffer.from(vector.buffer));
    }
  }

  /**
   * Sync projects and bullets (used when modifying a project or a bullet)
   * @param profilePath path to the profile's data directory
   * @param projects to index
   */
  async syncProjects(profilePath: string, projects: Project[]) {
    const db = VectorDatabase.getInstance();
    db.connect(profilePath);
    
    db.clearProjectsAndBullets();

    for (const proj of projects) {
        const projText = `${proj.title} ${proj.subtitle ? '- '+proj.subtitle : ''}`;
        const projVector = await this.generateEmbedding(projText);
        
        const sqlProjId = db.upsertProject(proj.id, Buffer.from(projVector.buffer));

        for (const bullet of proj.bullets) {
            const bulletText = `${bullet.text} (${bullet.tags.join(' ')})`;
            const bulletVector = await this.generateEmbedding(bulletText);
            db.upsertProjectBullet(sqlProjId, bullet.id, Buffer.from(bulletVector.buffer));
        }
    }
  }
}