import type { ColumnId, JobCard, TimelineEvent, Tone } from "@/lib/dashboard-data";
import {
  ApplicationEventType,
  JobApplicationStatus,
  type Application,
  type ApplicationEvent,
  type ApplicationWithEvents,
} from "@shared/jobApplications.type";
import { parseDbDate } from "@shared/utils";
import { compactNumber } from "@/lib/utils";

export const STATUS_META: Record<JobApplicationStatus, { label: string; tone: Tone; column: ColumnId }> = {
  [JobApplicationStatus.DRAFT]: { label: "Backlog", tone: "muted", column: "backlog" },
  [JobApplicationStatus.REVIEW]: { label: "AI Review", tone: "info", column: "ai-review" },
  [JobApplicationStatus.APPLIED]: { label: "Applied", tone: "info", column: "applied" },
  [JobApplicationStatus.INTERVIEW]: { label: "Interview", tone: "warn", column: "interviewing" },
  [JobApplicationStatus.OFFER]: { label: "Offer", tone: "ok", column: "offer" },
  [JobApplicationStatus.ACCEPTED]: { label: "Accepted", tone: "ok", column: "archived" },
  [JobApplicationStatus.REJECTED]: { label: "Rejected", tone: "danger", column: "archived" },
  [JobApplicationStatus.WITHDRAWN]: { label: "Withdrawn", tone: "muted", column: "archived" },
  [JobApplicationStatus.ARCHIVED]: { label: "Archived", tone: "muted", column: "archived" },
};

/** Status a card takes when dropped on a column. */
export const columnToStatusMap: Record<ColumnId, JobApplicationStatus> = {
  "backlog": JobApplicationStatus.DRAFT,
  "ai-review": JobApplicationStatus.REVIEW,
  "applied": JobApplicationStatus.APPLIED,
  "interviewing": JobApplicationStatus.INTERVIEW,
  "offer": JobApplicationStatus.OFFER,
  "archived": JobApplicationStatus.ARCHIVED,
};

const fileName = (filePath?: string | null) => (filePath ? filePath.split(/[\\/]/).pop() : undefined);

const initials = (company: string) =>
  company
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

export function mapApplicationToJobCard(application: Application): JobCard {
  const meta = STATUS_META[application.status] ?? STATUS_META[JobApplicationStatus.DRAFT];
  return {
    id: application.id,
    title: application.job_title,
    company: application.company_name,
    logo: initials(application.company_name),
    status: application.status,
    statusLabel: meta.label,
    tone: meta.tone,
    column: meta.column,
    stack: application.keywords || [],
    appliedAt: parseDbDate(application.applied_at),
    updatedAt: parseDbDate(application.updated_at),
    url: application.url || undefined,
    salary: application.salary != null ? `${compactNumber(application.salary)} / year` : undefined,
    resume: fileName(application.pdf_file_path),
    coverLetter: fileName(application.motivation_letter_file_path),
    notes: application.notes ?? "",
    recruiterContact: application.recruiter_contact ?? "",
    timeline: [],
  };
}

function describeEvent(event: ApplicationEvent): Pick<TimelineEvent, "label" | "detail" | "file"> {
  switch (event.event_type) {
    case ApplicationEventType.STATUS_CHANGE: {
      const status = event.to_status ? STATUS_META[event.to_status]?.label ?? event.to_status : null;
      const isCreation = event.description?.startsWith("Created");
      // "New status: X : my note" -> keep only the note part
      const note = event.description?.split(" : ").slice(1).join(" : ").trim();
      return {
        label: isCreation ? `Added to the pipeline${status ? ` as ${status}` : ""}` : `Moved to ${status ?? "a new stage"}`,
        detail: note || undefined,
      };
    }
    case ApplicationEventType.INTERVIEW_SCHEDULED:
      return { label: "Interview scheduled", detail: event.description || undefined };
    case ApplicationEventType.FOLLOW_UP:
      return { label: "Followed up", detail: event.description || undefined };
    case ApplicationEventType.DOCUMENT_EXPORTED:
      return { label: "Document exported", file: event.description || undefined };
    case ApplicationEventType.NOTE_ADDED:
    default:
      return { label: "Note", detail: event.description || undefined };
  }
}

const REMOVABLE_EVENTS = new Set<ApplicationEventType>([
  ApplicationEventType.NOTE_ADDED,
  ApplicationEventType.INTERVIEW_SCHEDULED,
  ApplicationEventType.FOLLOW_UP,
]);

export function mapApplicationWithEventsToJobCard(application: ApplicationWithEvents): JobCard {
  return {
    ...mapApplicationToJobCard(application),
    timeline: application.events.map((event) => ({
      id: event.id,
      type: event.event_type,
      at: parseDbDate(event.event_date),
      scheduledAt: parseDbDate(event.scheduled_at),
      removable: REMOVABLE_EVENTS.has(event.event_type),
      ...describeEvent(event),
    })),
  };
}
