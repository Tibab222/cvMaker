export interface ExtractRequestMessage {
  action: 'EXTRACT_AND_HIGHLIGHT';
}

export interface ExtractResponseMessage {
  title: string;
  company: string;
  salary: string;
  mandate: string;
  url: string;
  _debug?: Record<string, unknown>;
}

export interface CVMakerPayload {
  title: string;
  company: string;
  salary: string;
  url: string;
  mandate: string;
  extractedAt: string;
  /** 'open' (default) opens the resume editor, 'queue' keeps the offer for later review. */
  mode?: 'open' | 'queue';
}

/** Same shape as AutofillProfile in the desktop app (shared/discovery.types.ts). */
export interface AutofillProfile {
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  linkedin: string;
  github: string;
  portfolio: string;
  location: string;
  currentTitle: string;
  currentCompany: string;
}

export type FieldKind = keyof AutofillProfile;

/** Why a field is left to the user. */
export type AttentionReason = 'file' | 'sensitive' | 'question' | 'choice' | 'required';

export interface FilledField {
  label: string;
  kind: FieldKind;
  value: string;
}

export interface AttentionField {
  label: string;
  reason: AttentionReason;
}

/** A question answered with one of the user's saved answers. */
export interface AnsweredField {
  label: string;
  value: string;
  /** The saved question it comes from (worded differently when score < 1). */
  savedQuestion: string;
  score: number;
}

export interface AutofillReport {
  filled: FilledField[];
  attention: AttentionField[];
  /** Recognized fields that already had a value: left untouched. */
  alreadyFilled: number;
  /** Questions answered from the answer bank. */
  answered: AnsweredField[];
}

/* Answer bank: same shapes as shared/answers.types.ts in the desktop app. */

export type AnswerKind = 'text' | 'choice';

/** An answer read from a form the user filled and moved on from. */
export interface CapturedAnswer {
  question: string;
  answer: string;
  kind: AnswerKind;
  options?: string[];
  host?: string;
}

/** A question of a form being filled, sent to find a saved answer. */
export interface AnswerQuestion {
  ref: string;
  question: string;
  kind: AnswerKind;
  options?: string[];
}

export interface AnswerMatch {
  ref: string;
  answerId: string;
  answer: string;
  savedQuestion: string;
  score: number;
}

/** Content scripts -> background (which talks to the app). */
export type AnswerMessage =
  | { action: 'ANSWERS_CAPTURED'; answers: CapturedAnswer[] }
  | { action: 'MATCH_ANSWERS'; questions: AnswerQuestion[] };

export interface AutofillRequestMessage {
  action: 'AUTOFILL';
  runId: string;
  profile: AutofillProfile;
}

export interface ClearAutofillMessage {
  action: 'CLEAR_AUTOFILL';
}

/** Sent by every frame that holds form fields (application forms often live in an iframe). */
export interface AutofillReportMessage {
  action: 'AUTOFILL_REPORT';
  runId: string;
  frame: string;
  /** One per frame: a frame reports again once its saved answers are in, replacing its first report. */
  frameKey: string;
  /** False while saved answers are still being looked for: another report follows. */
  final: boolean;
  report: AutofillReport;
}

/** Reads the offer on the page without highlighting or scrolling (to rank resumes from an application page). */
export interface ExtractOfferMessage {
  action: 'EXTRACT_OFFER';
}

export interface ExtractOfferResponse {
  title: string;
  mandate: string;
}

/** A resume of the desktop app's vault (shared/vault.types.ts ExtensionVaultResume). */
export interface VaultResume {
  id: string;
  name: string;
  file_name: string;
  pages: number;
  language: string;
  has_text: boolean;
  keywords: string[];
}

/** How well a vault resume fits an offer (shared/vault.types.ts VaultMatch). */
export interface VaultMatch {
  resume_id: string;
  name: string;
  score: number;
  matched: string[];
  missing: string[];
}

export interface VaultFile {
  fileName: string;
  mime: string;
  /** Base64 of the PDF. */
  data: string;
}

/** Puts a resume in the resume/CV file field of the form. Never submits. */
export interface AttachResumeMessage extends VaultFile {
  action: 'ATTACH_RESUME';
  runId: string;
}

/** Sent by every frame that has file fields. */
export interface AttachReportMessage {
  action: 'ATTACH_REPORT';
  runId: string;
  /** Label of the field the resume went in, null when no field looked like the resume one. */
  attached: string | null;
  fileFields: number;
}

export type ContentMessage = ExtractRequestMessage | ExtractOfferMessage | AutofillRequestMessage | ClearAutofillMessage | AttachResumeMessage;

/* ------------------------------------------------------------------ */
/* Application tracking: content scripts and panel <-> background       */
/* ------------------------------------------------------------------ */

/** An offer as a page reads it (the background adds when it was seen). */
export interface SeenOffer {
  title: string;
  company: string;
  url: string;
  mandate: string;
  salary: string;
  strength: 'strong' | 'medium';
}

/** A question waiting for the user: "did you apply for … at …?". */
export interface ApplyPrompt {
  id: string;
  tabId: number;
  createdAt: number;
  /** The page said the application went through ("Thank you for applying"). */
  confirmed: boolean;
  title: string;
  company: string;
  url: string;
  /** How the offer was found, for a short "from …" line. */
  by: 'this-tab' | 'opener' | 'referrer' | 'company-site' | 'guess' | 'none';
  confidence: 'high' | 'medium' | 'low';
  /** Host of the page where the posting was read. */
  offerHost: string;
  /** Host of the form. */
  formHost: string;
  hasDescription: boolean;
  /** Other recent offers the user may have meant. */
  candidates: { index: number; title: string; company: string; host: string }[];
  /** Hidden from the page ("not now"); still listed in the panel. */
  snoozed: boolean;
}

export type TrackMessage =
  /** Every top frame on load and on in-page navigation; answers whether tracking is on and any open question. */
  | { action: 'TRACK_HELLO'; url: string; title: string; referrer: string }
  | { action: 'OFFER_SEEN'; offer: SeenOffer; atApply: boolean }
  /** A form was sent ('submit') or the page thanks the user for applying ('confirmation'). */
  | { action: 'APPLY_SIGNAL'; kind: 'submit' | 'confirmation'; hints: string[] }
  /** The form came back with errors: it was not sent. */
  | { action: 'APPLY_CANCEL' }
  | { action: 'APPLY_ANSWER'; promptId: string; answer: 'yes' | 'no' | 'later'; title?: string; company?: string; candidate?: number }
  | { action: 'LIST_PROMPTS' }
  | { action: 'GET_TRACKING' }
  | { action: 'SET_TRACKING'; enabled: boolean };

export interface TrackHelloResponse {
  enabled: boolean;
  prompt: ApplyPrompt | null;
}

export interface ApplyAnswerResponse {
  ok: boolean;
  /** What the user reads: "Saved to CVMaker", "Already in your pipeline", "Saved once CVMaker is open"… */
  message: string;
  state: 'saved' | 'updated' | 'duplicate' | 'queued' | 'dismissed' | 'snoozed' | 'error';
}

/** Background -> top frame of a tab. */
export type TabTrackMessage =
  | { action: 'SHOW_APPLY_PROMPT'; prompt: ApplyPrompt }
  | { action: 'HIDE_APPLY_PROMPT'; promptId: string }
  /** Reads the offer on screen right now (a tab is opening from this one). */
  | { action: 'SNAPSHOT_OFFER' };

/** Background -> panel. */
export interface PromptsChangedMessage {
  action: 'PROMPTS_CHANGED';
}
