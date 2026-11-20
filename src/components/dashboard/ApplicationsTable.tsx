import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { format, formatDistanceToNowStrict } from "date-fns";
import { ArrowDown, ArrowUp, ArrowUpDown, BellRing, CalendarClock, ExternalLink, Ghost, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COLUMNS, TONE_CLASSES, type JobCard } from "@/lib/dashboard-data";
import { cn } from "@/lib/utils";
import { JobApplicationStatus, type Reminder } from "@shared/jobApplications.type";
import { STATUS_META } from "./mapApplicationToJabCard";
import { useDashboard } from "./provider/hook";

type SortKey = "company" | "title" | "status" | "applied" | "activity";
type Sort = { key: SortKey; direction: "asc" | "desc" };

const PAGE_SIZE = 50;
const ALL_STATUSES = Object.values(JobApplicationStatus);
const STAGE_ORDER = new Map(COLUMNS.map((column, index) => [column.id, index]));
const lastActivity = (job: JobCard) => Math.max(job.updatedAt?.getTime() ?? 0, job.appliedAt?.getTime() ?? 0);

const COMPARE: Record<SortKey, (a: JobCard, b: JobCard) => number> = {
  company: (a, b) => a.company.localeCompare(b.company, undefined, { sensitivity: "base" }),
  title: (a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }),
  status: (a, b) => (STAGE_ORDER.get(a.column) ?? 0) - (STAGE_ORDER.get(b.column) ?? 0) || ALL_STATUSES.indexOf(a.status) - ALL_STATUSES.indexOf(b.status),
  // never applied (drafts) go last whatever the direction
  applied: (a, b) => (a.appliedAt?.getTime() ?? -Infinity) - (b.appliedAt?.getTime() ?? -Infinity),
  activity: (a, b) => lastActivity(a) - lastActivity(b),
};

function SortHeader({ label, sortKey, sort, onSort, className }: { label: string; sortKey: SortKey; sort: Sort; onSort: (key: SortKey) => void; className?: string }) {
  const active = sort.key === sortKey;
  const Icon = !active ? ArrowUpDown : sort.direction === "asc" ? ArrowUp : ArrowDown;
  return (
    <th scope="col" aria-sort={active ? (sort.direction === "asc" ? "ascending" : "descending") : "none"} className={cn("px-3 py-2.5 text-left font-medium", className)}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn("group inline-flex items-center gap-1 rounded transition-colors hover:text-foreground", active && "text-foreground")}
      >
        {label}
        <Icon className={cn("size-3", !active && "opacity-0 transition-opacity group-hover:opacity-60")} />
      </button>
    </th>
  );
}

function ReminderIcon({ reminder }: { reminder: Reminder }) {
  if (reminder.kind === "no_response") {
    return (
      <span title={`No sign of life for ${reminder.days} days: close it as No response?`} className="text-zinc-500">
        <Ghost className="size-4" />
      </span>
    );
  }
  return reminder.kind === "interview" ? (
    <span title={reminder.days === 0 ? "Interview today" : `Interview in ${reminder.days} days`} className="text-amber-600">
      <CalendarClock className="size-4" />
    </span>
  ) : (
    <span title={reminder.kind === "follow_up" ? `No answer for ${reminder.days} days: follow up?` : "Draft untouched for a while"} className="text-rose-600">
      <BellRing className="size-4" />
    </span>
  );
}

/** Every application on one screen: sortable, status editable in place, a click opens the full history. */
export default function ApplicationsTable({ jobs }: { jobs: JobCard[] }) {
  const { attentionByApp: reminderByApp, updateApplicationStatus, openApplication, isLoading } = useDashboard();
  const [sort, setSort] = useState<Sort>({ key: "activity", direction: "desc" });
  const [shown, setShown] = useState(PAGE_SIZE);


  const rows = useMemo(() => {
    const compare = COMPARE[sort.key];
    const sign = sort.direction === "asc" ? 1 : -1;
    return [...jobs].sort((a, b) => sign * compare(a, b) || lastActivity(b) - lastActivity(a));
  }, [jobs, sort]);

  const onSort = (key: SortKey) => {
    setSort((current) => (current.key === key
      ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
      // text sorts start A-Z, dates start with the most recent
      : { key, direction: key === "company" || key === "title" || key === "status" ? "asc" : "desc" }));
  };

  if (isLoading && jobs.length === 0) {
    return <div className="space-y-2">{[0, 1, 2, 3].map((i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/70" />)}</div>;
  }
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border/80 py-12 text-center text-sm text-muted-foreground">
        <Inbox className="size-5 opacity-60" />
        No application matches.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border border-border/70 bg-card shadow-xs">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-border/70 bg-surface/70 text-xs text-muted-foreground">
            <tr>
              <SortHeader label="Company" sortKey="company" sort={sort} onSort={onSort} className="pl-4" />
              <SortHeader label="Position" sortKey="title" sort={sort} onSort={onSort} />
              <SortHeader label="Status" sortKey="status" sort={sort} onSort={onSort} />
              <SortHeader label="Applied" sortKey="applied" sort={sort} onSort={onSort} />
              <th scope="col" className="hidden px-3 py-2.5 text-left font-medium lg:table-cell">Via</th>
              <SortHeader label="Last activity" sortKey="activity" sort={sort} onSort={onSort} className="hidden md:table-cell" />
              <th scope="col" className="w-16 px-3 py-2.5"><span className="sr-only">Reminders and link</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, shown).map((job, index) => {
              const reminder = reminderByApp.get(job.id);
              const activity = lastActivity(job);
              return (
                <motion.tr
                  key={job.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(index, 20) * 0.012 }}
                  tabIndex={0}
                  onClick={() => openApplication(job.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") openApplication(job.id);
                  }}
                  className="group cursor-pointer border-b border-border/50 outline-none transition-colors last:border-0 hover:bg-brand-muted/30 focus-visible:bg-brand-muted/40"
                >
                  <td className="max-w-56 py-2 pl-4 pr-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-brand/20 to-violet-400/20 text-[10px] font-semibold text-brand">{job.logo}</span>
                      <span className="truncate font-medium text-foreground" title={job.company}>{job.company}</span>
                    </div>
                  </td>
                  <td className="max-w-64 px-3 py-2">
                    <span className="block truncate text-foreground/90" title={job.title}>{job.title}</span>
                  </td>
                  {/* the status changes in place: the row click must not open the drawer then */}
                  <td className="px-3 py-2" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
                    <Select value={job.status} onValueChange={(value) => void updateApplicationStatus(job.id, value as JobApplicationStatus)}>
                      <SelectTrigger
                        size="sm"
                        aria-label={`Status of ${job.title} at ${job.company}`}
                        className={cn("h-7 w-auto gap-1.5 rounded-full border-0 px-2.5 text-xs font-medium ring-1 ring-inset", TONE_CLASSES[job.tone])}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ALL_STATUSES.map((status) => <SelectItem key={status} value={status}>{STATUS_META[status].label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-muted-foreground" title={job.appliedAt ? format(job.appliedAt, "PPP") : undefined}>
                    {job.appliedAt ? format(job.appliedAt, "d MMM yyyy") : <span className="text-muted-foreground/60">Not yet</span>}
                  </td>
                  <td className="hidden whitespace-nowrap px-3 py-2 text-muted-foreground lg:table-cell">{job.channel ?? <span className="text-muted-foreground/50">-</span>}</td>
                  <td className="hidden whitespace-nowrap px-3 py-2 text-muted-foreground md:table-cell">
                    {activity ? formatDistanceToNowStrict(activity, { addSuffix: true }) : "-"}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-2">
                      {reminder && <ReminderIcon reminder={reminder} />}
                      {job.url && (
                        <a
                          href={job.url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(event) => event.stopPropagation()}
                          className="text-muted-foreground transition-colors hover:text-brand"
                          aria-label={`Open the offer of ${job.title}`}
                          title="Open the offer"
                        >
                          <ExternalLink className="size-4" />
                        </a>
                      )}
                    </div>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {rows.length > shown && (
        <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
          Showing {shown} of {rows.length}
          <Button size="sm" variant="outline" className="h-7" onClick={() => setShown((current) => current + PAGE_SIZE)}>
            Show {Math.min(PAGE_SIZE, rows.length - shown)} more
          </Button>
        </div>
      )}
    </div>
  );
}
