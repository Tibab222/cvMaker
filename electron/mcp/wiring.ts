import { ProfileService } from '../services/ProfileService';
import { VectorDatabase } from '../services/vectorDatabase';
import { VectorService } from '../services/VectorService';
import { bufferToFloat32Array } from '../utils/math';
import type { McpDeps } from './core/deps';

/** The one file of the MCP module that knows the app's services. */
export function createAppDeps(): McpDeps {
  const profiles = ProfileService.getInstance();
  const vectors = VectorDatabase.getInstance();
  return {
    getProfile: () => profiles.getCurrentProfile(),
    embed: (text) => VectorService.getInstance().generateEmbedding(text),
    profileVectors: () => ({
      experiences: vectors.getAllExperiences().map((row) => ({ id: row.local_id, vector: bufferToFloat32Array(row.vector) })),
      bullets: vectors.getAllProjectBullets().map((row) => ({ id: row.local_bullet_id, vector: bufferToFloat32Array(row.vector) })),
    }),
  };
}
