import type { ToolDef } from '../core/types';
import { getApplication, listApplications, pipelineInsights } from './applications';
import { recordApplication, updateApplication } from './applicationWrites';
import { getProfileItems, profileOverview, searchProfile } from './profile';

export const MCP_TOOLS: ToolDef[] = [
  profileOverview,
  searchProfile,
  getProfileItems,
  listApplications,
  getApplication,
  pipelineInsights,
  updateApplication,
  recordApplication,
];
