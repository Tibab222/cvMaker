import type { ColumnId, JobCard } from "@/lib/dashboard-data";
import { JobApplicationStatus, type Application, type ApplicationWithEvents } from "@shared/jobApplications.type";

const statusToColumnMap: Record<JobApplicationStatus, {
    label: string;
    tone: "info" | "warn" | "ok";
    column: ColumnId;
}> = {
    [JobApplicationStatus.DRAFT]: { label: "Backlog", tone: "info", column: "backlog" },
    [JobApplicationStatus.REVIEW]: { label: "AI Review", tone: "warn", column: "ai-review" },
    [JobApplicationStatus.APPLIED]: { label: "Applied", tone: "info", column: "applied" },
    [JobApplicationStatus.INTERVIEW]: { label: "Interview", tone: "warn", column: "interviewing" },
    [JobApplicationStatus.OFFER]: { label: "Offer", tone: "ok", column: "offer" },
    [JobApplicationStatus.ACCEPTED]: { label: "Accepted", tone: "ok", column: "archived" },
    [JobApplicationStatus.REJECTED]: { label: "Rejected", tone: "warn", column: "archived" },
    [JobApplicationStatus.WITHDRAWN]: { label: "Withdrawn", tone: "warn", column: "archived" },
    [JobApplicationStatus.ARCHIVED]: { label: "Archived", tone: "info", column: "archived" },
};

export function mapApplicationToJobCard(application: Application): JobCard {
    const dateTag = application.applied_at ? `Applied ${new Date(application.applied_at).toLocaleDateString()}` : "Not applied yet";
    const status = statusToColumnMap[application.status];
    const logo = application.company_name.split(" ").map(word => word[0]).join("").toUpperCase().slice(0, 2);
    return {
        id: application.id,
        title: application.job_title,
        company: application.company_name,
        dateTag: dateTag,
        stack: application.keywords || [],
        status: [{ label: status.label, tone: status.tone }],
        column: status.column,
        appliedAt: application.applied_at || "",
        timeline: [],
        logo: logo,
        url: application.url || undefined,
    }
}

export const columnToStatusMap: Record<ColumnId, JobApplicationStatus> = {
  "backlog": JobApplicationStatus.DRAFT,
  "ai-review": JobApplicationStatus.REVIEW,
  "applied": JobApplicationStatus.APPLIED,
  "interviewing": JobApplicationStatus.INTERVIEW,
  "offer": JobApplicationStatus.OFFER,
  "archived": JobApplicationStatus.ARCHIVED,
};

export function mapApplicationWithEventsToJobCard(application: ApplicationWithEvents): JobCard {
    const applicationAlone = mapApplicationToJobCard(application);
    const timeline = application.events.map(event => ({
            at: new Date(event.event_date).toLocaleDateString(),
            label: event.event_type,
            file: event.description || undefined,
        }));
    return {
        ...applicationAlone,
        timeline: timeline,
    };
}