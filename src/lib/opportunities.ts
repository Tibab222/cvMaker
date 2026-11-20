import { DiscoveredJobStatus, JobSourceKind } from "@shared/discovery.types";

/** Colour of a match score: green for strong, amber for partial, grey for weak. */
export function scoreTone(score: number | null) {
  if (score === null) return { stroke: "stroke-zinc-300", text: "text-muted-foreground", label: "Not scored" };
  if (score >= 70) return { stroke: "stroke-emerald-500", text: "text-emerald-700", label: "Strong match" };
  if (score >= 45) return { stroke: "stroke-amber-500", text: "text-amber-700", label: "Partial match" };
  return { stroke: "stroke-zinc-400", text: "text-zinc-600", label: "Weak match" };
}

/** Queue views, in the order the user works through them. */
export const QUEUE_VIEWS = [
  { status: DiscoveredJobStatus.NEW, label: "To review", empty: "Nothing new to review." },
  { status: DiscoveredJobStatus.SHORTLISTED, label: "Shortlist", empty: "Offers you keep (or send from the browser extension) land here." },
  { status: DiscoveredJobStatus.PREPARED, label: "Prepared", empty: "Offers you opened in the resume editor." },
  { status: DiscoveredJobStatus.APPLIED, label: "Applied", empty: "Offers you applied to. Open an offer from here and apply in your browser: the extension links the two." },
  { status: DiscoveredJobStatus.DISMISSED, label: "Dismissed", empty: "Dismissed offers stay here for 30 days." },
] as const;

/** Comma-separated text <-> list, for the filter inputs. */
export const splitList = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean);
export const joinList = (values: string[]) => values.join(", ");

/** Badge of each kind of source. */
export const KIND_STYLE: Record<JobSourceKind, { label: string; className: string }> = {
  [JobSourceKind.GREENHOUSE]: { label: "Greenhouse", className: "bg-emerald-500/10 text-emerald-700" },
  [JobSourceKind.LEVER]: { label: "Lever", className: "bg-sky-500/10 text-sky-700" },
  [JobSourceKind.ASHBY]: { label: "Ashby", className: "bg-violet-500/10 text-violet-700" },
  [JobSourceKind.ADZUNA]: { label: "Adzuna", className: "bg-orange-500/10 text-orange-700" },
};
