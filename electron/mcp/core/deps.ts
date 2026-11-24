import type { ProfilesData } from '../../../shared/profilesData.interface';

/**
 * The only part of the app the MCP tools can use. electron/mcp/wiring.ts adapts the real services to it,
 * so the MCP code stays out of the business logic.
 */
export interface McpDeps {
  /** Re-read from disk; null when no profile is open. */
  getProfile: () => Promise<ProfilesData | null>;
}
