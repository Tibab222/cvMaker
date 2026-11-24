import type { ProfilesData } from '../../../shared/profilesData.interface';

export interface IndexedVector {
  id: string;
  vector: Float32Array;
}

/**
 * The only part of the app the MCP tools can use. electron/mcp/wiring.ts adapts the real services to it,
 * so the MCP code stays out of the business logic.
 */
export interface McpDeps {
  /** Re-read from disk; null when no profile is open. */
  getProfile: () => Promise<ProfilesData | null>;
  /** Local embedding model. Throws when it cannot load: tools then fall back to keywords. */
  embed: (text: string) => Promise<Float32Array>;
  /** The profile's vector index, built by the editor; may be stale or empty. */
  profileVectors: () => { experiences: IndexedVector[]; bullets: IndexedVector[] };
}
