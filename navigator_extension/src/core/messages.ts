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

export interface AutofillReport {
  filled: FilledField[];
  attention: AttentionField[];
  /** Recognized fields that already had a value: left untouched. */
  alreadyFilled: number;
}

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
  report: AutofillReport;
}

export type ContentMessage = ExtractRequestMessage | AutofillRequestMessage | ClearAutofillMessage;
