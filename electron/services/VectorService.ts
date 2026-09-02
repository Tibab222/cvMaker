import { pipeline, FeatureExtractionPipeline, env } from '@xenova/transformers';
import { VectorDatabase } from './vectorDatabase';
import { cosineSimilarity, bufferToFloat32Array } from '../utils/math';
import { Experience } from '../../shared/Experience.interface';
import { Project } from '../../shared/projects.interface';
import path from 'path';
import { app } from 'electron';
import { ProfileService } from './ProfileService';
import { Language } from '../../shared/profile.interface';

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
  public async rankExperiences(keywords: string[], language: Language, topK: number = 3) {
    const languageQuery = language === Language.FRENCH ? "Maîtrise de " : "Proficient in ";
    const queryText = `${languageQuery}${keywords.join(', ')}`;
    const queryVector = await this.generateEmbedding(queryText);
    const exps = this.db.getAllExperiences();
    const rawExps = await ProfileService.getInstance().getExperiences();

    const scored = exps.map(exp => {
      const similarity = cosineSimilarity(queryVector, bufferToFloat32Array(exp.vector));
    
      const rawExp = rawExps.find(rawExp => rawExp.id === exp.local_id);
      if (!rawExp) return { local_id: exp.local_id, score: 0, matchedKeywords: [], missingKeywords: [] };
      const rawText = `${rawExp?.jobTitle+' - ' || ''} ${rawExp?.description || ''}`.toLowerCase();
      const matchedKeywords = keywords.filter(kw => rawText.includes(kw.toLowerCase()));
      const missingKeywords = keywords.filter(kw => !rawText.includes(kw.toLowerCase()));

      return {
        local_id: exp.local_id,
        score: similarity,
        matchedKeywords,
        missingKeywords
      };
    });

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  /**
   * Project ranking
   */
  public async rankProjectsByBullets(keywords: string[], language: Language, topKBullets: number = 10) {
    const languageQuery = language === Language.FRENCH ? "Maîtrise de " : "Proficient in ";
    const queryText = `${languageQuery}${keywords.join(', ')}`;
    const queryVector = await this.generateEmbedding(queryText);
    const bullets = this.db.getAllProjectBullets();
    const rawProjects = await ProfileService.getInstance().getProjects();

    const projectMap = new Map(rawProjects.map(p => [p.id, p]));

    const scoredBullets = bullets.map(b => {
      const similarity = cosineSimilarity(queryVector, bufferToFloat32Array(b.vector));
      
      const project = projectMap.get(b.local_project_id);
      const bulletObj = project?.bullets.find(bullet => bullet.id === b.local_bullet_id);
      const bulletText = bulletObj ? `${bulletObj.text} ${(bulletObj.tags || []).join(' ')}`.toLowerCase() : '';

      const matchedKeywords = keywords.filter(kw => bulletText.includes(kw.toLowerCase()));

      return {
        local_bullet_id: b.local_bullet_id,
        local_project_id: b.local_project_id,
        score: similarity,
        matchedKeywords
      };
    });

    const topBullets = scoredBullets
      .sort((a, b) => b.score - a.score)
      .slice(0, topKBullets);

    const projectScores: Record<string, number> = {};
    topBullets.forEach(b => {
      projectScores[b.local_project_id] = (projectScores[b.local_project_id] || 0) + b.score;
    });

    const rankedProjects = Object.entries(projectScores)
      .sort(([, a], [, b]) => b - a)
      .map(([projectId, accumulatedScore]) => {
        const proj = projectMap.get(projectId);
        if (!proj) {
          return {
            id: projectId,
            score: accumulatedScore,
            matchedKeywords: [],
            missingKeywords: keywords
          };
        }

        const bulletsContent = proj.bullets.map(b => `${b.text} ${(b.tags || []).join(' ')}`).join(' ');
        const fullProjText = `${proj.title} ${proj.subtitle || ''} ${bulletsContent}`.toLowerCase();

        const matchedKeywords = keywords.filter(kw => fullProjText.includes(kw.toLowerCase()));
        const missingKeywords = keywords.filter(kw => !fullProjText.includes(kw.toLowerCase()));

        return {
          id: projectId,
          score: accumulatedScore,
          matchedKeywords,
          missingKeywords
        };
      });

    return {
      bestBullets: topBullets,
      suggestedProjects: rankedProjects
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