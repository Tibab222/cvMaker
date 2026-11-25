import { ApplicationEventType, JobApplicationStatus } from '../../shared/jobApplications.type';
import { addPastApplication, announceApplicationsChanged, recordSentApplication } from '../functions/recordApplication';
import { offerKeywords } from '../functions/offerKeywords';
import { getDiscoveryManager } from '../services/discovery';
import { editorSession } from '../services/editorSession';
import { getAnswerBank } from '../services/answers';
import { getInterviewQuestions } from '../services/interviewQuestions';
import { getVaultManager } from '../services/vault';
import { CLAUDE_SOURCE, JobApplicationManager } from '../services/jobApplications/jobApplicationManager';
import { KeywordsAffinityDatabase } from '../services/KeywordsExtractor/KeywordsAffinityDatabase';
import { ProfileService } from '../services/ProfileService';
import { VectorDatabase } from '../services/vectorDatabase';
import { VectorService } from '../services/VectorService';
import { broadcast } from '../utils/broadcast';
import { bufferToFloat32Array } from '../utils/math';
import type { McpDeps } from './core/deps';
import { mcpPermissions } from './settings';

const REACHED_INTERVIEW = [JobApplicationStatus.INTERVIEW, JobApplicationStatus.OFFER, JobApplicationStatus.ACCEPTED];

/** The one file of the MCP module that knows the app's services. */
export function createAppDeps(): McpDeps {
  const profiles = ProfileService.getInstance();
  const vectors = VectorDatabase.getInstance();
  const jobs = JobApplicationManager.getInstance();
  return {
    permissions: mcpPermissions,
    getProfile: () => profiles.getCurrentProfile(),
    embed: (text) => VectorService.getInstance().generateEmbedding(text),
    profileVectors: () => ({
      experiences: vectors.getAllExperiences().map((row) => ({ id: row.local_id, vector: bufferToFloat32Array(row.vector) })),
      bullets: vectors.getAllProjectBullets().map((row) => ({ id: row.local_bullet_id, vector: bufferToFloat32Array(row.vector) })),
    }),
    applications: {
      isReady: () => jobs.isConnected(),
      list: () => jobs.getAllApplications(),
      get: (id) => jobs.getApplicationWithTimeline(id),
      session: (id) => jobs.getCVSession(id),
      stats: () => jobs.getKeyStats(),
      reminders: (limit) => jobs.getReminders(limit),
      silent: () => jobs.getSilentApplications(),
      interviewedIds: () => {
        const statuses = REACHED_INTERVIEW.map(() => '?').join(', ');
        const rows = jobs.getDb().prepare(`
          SELECT DISTINCT application_id AS id FROM application_events WHERE event_type = ? OR to_status IN (${statuses})
          UNION SELECT id FROM applications WHERE status IN (${statuses})
        `).all(ApplicationEventType.INTERVIEW_SCHEDULED, ...REACHED_INTERVIEW, ...REACHED_INTERVIEW) as { id: string }[];
        return new Set(rows.map((row) => row.id));
      },
      record: (dto) => recordSentApplication(dto, CLAUDE_SOURCE),
      recordPast: (dto) => addPastApplication(dto, CLAUDE_SOURCE.origin),
      setStatus: (id, status, note) => jobs.updateStatus(id, status, note),
      addEvent: (id, event) => jobs.addEvent(id, event),
      updateDetails: (id, details) => jobs.updateDetails(id, details),
      saveDraft: (session) => jobs.saveOrUpdateApplication(session, JobApplicationStatus.REVIEW),
      openInEditor: editorSession,
      announce: announceApplicationsChanged,
    },
    marketKeywords: (limit) => KeywordsAffinityDatabase.getInstance().getTopKeywords(limit),
    offerKeywords,
    interview: {
      list: () => getInterviewQuestions().list(),
      forApplication: (applicationId) => getInterviewQuestions().forApplication(applicationId),
      add: (dto) => getInterviewQuestions().add(dto),
      update: (id, dto) => getInterviewQuestions().update(id, dto),
      announce: () => broadcast('interview-questions:changed'),
      formAnswers: () => getAnswerBank().list(),
    },
    opportunities: {
      list: () => getDiscoveryManager().listJobs(),
      add: (offer) => getDiscoveryManager().addSavedOffer(offer, { origin: 'external_ai', addedBy: 'claude' }),
      setStatus: (id, status) => getDiscoveryManager().setJobStatus(id, status),
      score: (offer) => getDiscoveryManager().scoreOffer(offer),
    },
    vaultMatch: (offer, limit) => getVaultManager().match(offer, limit),
  };
}
