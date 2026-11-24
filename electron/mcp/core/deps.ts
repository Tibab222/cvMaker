import type { InterviewQuestion } from '../../../shared/interviewQuestions.types';
import type { Application, ApplicationWithEvents, CVSessionDataDTO, KeyStats, Reminder, SilentApplication } from '../../../shared/jobApplications.type';
import type { KeywordStat } from '../../../shared/Keywords.types';
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

  applications: {
    /** False until a profile is open (its database is connected then). */
    isReady: () => boolean;
    list: () => Application[];
    get: (id: string) => ApplicationWithEvents | null;
    /** The tailored resume of an application made in the editor; null for ones added by hand. */
    session: (id: string) => CVSessionDataDTO | null;
    stats: () => KeyStats;
    reminders: (limit: number) => Reminder[];
    silent: () => SilentApplication[];
    /** Applications that reached an interview at some point, whatever their status now. */
    interviewedIds: () => Set<string>;
    questions: (applicationId: string) => InterviewQuestion[];
  };
  /** Terms of the offers the user analysed or applied to, most frequent first. */
  marketKeywords: (limit: number) => KeywordStat[];
}
