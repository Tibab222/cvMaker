import type { Language } from "./profile.interface";

/**
 * Resume vault: finished resumes (PDF) the user already has, kept with the profile, read once for their keywords,
 * so the right one can be picked for an offer without generating a new resume.
 */

export interface VaultResume {
  id: string;
  /** Editable name, from the file name at first ("Resume - DevOps 2026"). */
  name: string;
  file_name: string;
  /** Bytes. */
  size: number;
  pages: number;
  language: Language;
  /** Most telling skills and terms of the resume, best first. */
  keywords: string[];
  /** JPEG data URL of the first page, small. */
  thumbnail: string | null;
  /** False for scanned PDFs (images only): stored, but no keyword could be read. */
  has_text: boolean;
  created_at: string;
  updated_at: string;
}

/** What the window sends after reading a PDF (pdf.js runs there, next to the canvas for the thumbnail). */
export interface VaultImportPayload {
  fileName: string;
  bytes: Uint8Array;
  text: string;
  pages: number;
  thumbnail: string | null;
}

export type VaultImportResult = { ok: true; resume: VaultResume } | { ok: false; error: string };

/** An offer to match resumes against. */
export interface VaultOffer {
  title: string;
  description: string;
}

export interface VaultMatch {
  resume_id: string;
  name: string;
  /** 0-100, same scale as the Opportunities scores. */
  score: number;
  matched: string[];
  missing: string[];
}

/** Largest PDF accepted (a resume is rarely over 2 MB; this leaves room for photos). */
export const VAULT_MAX_BYTES = 15 * 1024 * 1024;
