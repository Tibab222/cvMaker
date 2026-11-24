import type { ToolDef } from '../core/types';
import { getApplication, listApplications, pipelineInsights } from './applications';
import { recordApplication, updateApplication } from './applicationWrites';
import { interviewPrep, savePrep } from './interviews';
import { analyzeOffer, listOpportunities, updateOpportunities } from './opportunities';
import { draftResume } from './resume';
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
  listOpportunities,
  analyzeOffer,
  updateOpportunities,
  draftResume,
  interviewPrep,
  savePrep,
];
