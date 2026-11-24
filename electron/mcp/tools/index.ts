import type { ToolDef } from '../core/types';
import { getProfileItems, profileOverview, searchProfile } from './profile';

export const MCP_TOOLS: ToolDef[] = [
  profileOverview,
  searchProfile,
  getProfileItems,
];
