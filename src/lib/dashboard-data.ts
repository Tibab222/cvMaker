import type { ApplicationEventType, JobApplicationStatus } from "@shared/jobApplications.type";

export type ColumnId =
  | "backlog"
  | "ai-review"
  | "applied"
  | "interviewing"
  | "offer"
  | "archived";

export type Tone = "info" | "warn" | "ok" | "muted" | "danger";

export interface TimelineEvent {
  id: number;
  type: ApplicationEventType;
  at: Date | null;          // when the event was logged
  scheduledAt: Date | null; // when it happens (interviews)
  label: string;
  detail?: string;
  file?: string;
  removable: boolean;       // user-logged events can be deleted
}

export interface JobCard {
  id: string;
  title: string;
  company: string;
  logo: string;
  status: JobApplicationStatus;
  statusLabel: string;
  tone: Tone;
  column: ColumnId;
  stack: string[];
  appliedAt: Date | null;
  updatedAt: Date | null;
  salary?: string;
  url?: string;
  resume?: string;
  coverLetter?: string;
  notes: string;
  recruiterContact: string;
  timeline: TimelineEvent[];
}

export const COLUMNS: { id: ColumnId; label: string; hint: string; accent: string }[] = [
  { id: "backlog", label: "Backlog", hint: "Offers to work on", accent: "bg-slate-400" },
  { id: "ai-review", label: "AI Review", hint: "Needs your validation", accent: "bg-violet-500" },
  { id: "applied", label: "Applied", hint: "Waiting for an answer", accent: "bg-sky-500" },
  { id: "interviewing", label: "Interviewing", hint: "In the process", accent: "bg-amber-500" },
  { id: "offer", label: "Offer", hint: "Negotiation", accent: "bg-emerald-500" },
  { id: "archived", label: "Closed", hint: "Accepted, rejected or archived", accent: "bg-zinc-400" },
];

/** Pill colors per tone, shared by the board, the drawer and the status select. */
export const TONE_CLASSES: Record<Tone, string> = {
  info: "bg-sky-500/10 text-sky-700 ring-sky-500/20",
  warn: "bg-amber-500/12 text-amber-700 ring-amber-500/25",
  ok: "bg-emerald-500/12 text-emerald-700 ring-emerald-500/25",
  danger: "bg-rose-500/10 text-rose-700 ring-rose-500/20",
  muted: "bg-zinc-500/10 text-zinc-600 ring-zinc-500/15",
};
