import { ProfileService } from '../services/ProfileService';
import type { McpDeps } from './core/deps';

/** The one file of the MCP module that knows the app's services. */
export function createAppDeps(): McpDeps {
  const profiles = ProfileService.getInstance();
  return {
    getProfile: () => profiles.getCurrentProfile(),
  };
}
