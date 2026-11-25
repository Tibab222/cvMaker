import type { DiscoveredJob, DiscoveredJobStatus } from '../../../shared/discovery.types';
import type { JobOfferPayload } from '../../../shared/Extension.types';
import type { SavedAnswer } from '../../../shared/answers.types';
import type { InterviewQuestion, InterviewQuestionDto } from '../../../shared/interviewQuestions.types';
import type { VaultMatch, VaultOffer } from '../../../shared/vault.types';
import type {
  Application, ApplicationDetailsDto, ApplicationEvent, ApplicationsChangedEvent, ApplicationWithEvents, BrowserApplicationDto, BrowserApplicationResult,
  CVSessionDataDTO, JobApplicationStatus, KeyStats, NewApplicationEventDto, PastApplicationDto, Reminder, SilentApplication,
} from '../../../shared/jobApplications.type';
import type { JobScore } from '../../services/discovery/scoring';
import type { KeywordStat } from '../../../shared/Keywords.types';
import type { McpPermissions } from '../../../shared/mcp.types';
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
  /** What the user lets the assistant read and write (Settings → Claude). */
  permissions: () => McpPermissions;
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

    /** Same path as the browser extension: merged with a prepared resume or a recent duplicate, linked to its queue offer. */
    record: (dto: BrowserApplicationDto) => Promise<BrowserApplicationResult & { offer: { id: number } | null }>;
    /** An application already at its final stage: the status is dated on the day it was sent, like the app's own form. */
    recordPast: (dto: PastApplicationDto) => Promise<{ application: Application; offerId: number | null }>;
    setStatus: (id: string, status: JobApplicationStatus, note?: string) => JobApplicationStatus;
    addEvent: (id: string, event: NewApplicationEventDto) => ApplicationEvent;
    updateDetails: (id: string, details: ApplicationDetailsDto) => boolean;
    /** Creates or saves a tailored resume like the editor does; a new or DRAFT one lands in AI Review. */
    saveDraft: (session: Partial<CVSessionDataDTO>) => { id: string; success: boolean; error?: string };
    /** The application whose resume is loaded in the editor, if any: saving there would replace a draft changed meanwhile. */
    openInEditor: () => string | null;
    /** Refreshes the dashboard if it is open. */
    announce: (event: ApplicationsChangedEvent) => void;
  };
  /** Terms of the offers the user analysed or applied to, most frequent first. */
  marketKeywords: (limit: number) => KeywordStat[];
  /** Terms of an offer, counted in the market stats: once per new resume, as the editor does. */
  offerKeywords: (description: string) => Promise<string[]>;

  /** Interview questions library: questions recruiters ask, the user's prepared answers, the interviews that asked them. */
  interview: {
    list: () => InterviewQuestion[];
    forApplication: (applicationId: string) => InterviewQuestion[];
    /** Throw with a readable message (duplicate question, too long). */
    add: (dto: InterviewQuestionDto) => InterviewQuestion;
    update: (id: string, dto: InterviewQuestionDto) => InterviewQuestion;
    /** Refreshes the library if it is open. */
    announce: () => void;
    /** Answers the user gave in application forms, kept by the browser extension. */
    formAnswers: () => SavedAnswer[];
  };

  /** The Opportunities queue (offers found by the daily search or saved while browsing). */
  opportunities: {
    list: () => DiscoveredJob[];
    /** Scored against the profile and shortlisted; an offer already queued is shortlisted again instead. */
    add: (offer: JobOfferPayload) => Promise<{ id: number; score: number | null; duplicate: boolean }>;
    setStatus: (id: number, status: DiscoveredJobStatus) => boolean;
    /** Same 0-100 score as the queue; null when the profile is empty. */
    score: (offer: { title: string; description: string }) => Promise<JobScore | null>;
  };
  /** Finished PDF resumes of the vault, ranked for an offer. */
  vaultMatch: (offer: VaultOffer, limit: number) => Promise<VaultMatch[]>;
}
