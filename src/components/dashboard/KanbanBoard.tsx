import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { formatDistanceToNowStrict } from "date-fns";
import { BellRing, CalendarClock, CalendarDays, ChevronDown, Ghost, GripVertical, Inbox } from "lucide-react";
import { COLUMNS, type ColumnId, type JobCard } from "@/lib/dashboard-data";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/motion";
import type { Reminder } from "@shared/jobApplications.type";
import { useDashboard } from "./provider/hook";
import { columnToStatusMap } from "./mapApplicationToJabCard";
import StatusPill from "./StatusPill";

/** Cards shown per column before "Show more": long columns made the whole page scroll. Closed ones matter less. */
const COLUMN_LIMIT = 5;
const CLOSED_LIMIT = 3;

const lastActivity = (job: JobCard) => Math.max(job.updatedAt?.getTime() ?? 0, job.appliedAt?.getTime() ?? 0);

function dateLabel(job: JobCard) {
  if (job.appliedAt) return `Applied ${formatDistanceToNowStrict(job.appliedAt, { addSuffix: true })}`;
  if (job.updatedAt) return `Updated ${formatDistanceToNowStrict(job.updatedAt, { addSuffix: true })}`;
  return "Not applied yet";
}

function ReminderBadge({ reminder }: { reminder: Reminder }) {
  if (reminder.kind === "interview") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/12 px-2 py-0.5 text-[11px] font-medium text-amber-700">
        <CalendarClock className="size-3" />
        {reminder.days === 0 ? "Interview today" : `Interview in ${reminder.days}d`}
      </span>
    );
  }
  if (reminder.kind === "no_response") {
    return (
      <span title={`No sign of life for ${reminder.days} days: close it as No response?`} className="inline-flex items-center gap-1 rounded-full bg-zinc-500/12 px-2 py-0.5 text-[11px] font-medium text-zinc-600 dark:text-zinc-300">
        <Ghost className="size-3" />
        No answer · {reminder.days}d
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium text-rose-700">
      <BellRing className="size-3" />
      {reminder.kind === "follow_up" ? "Follow-up due" : "Stale draft"}
    </span>
  );
}

function KanbanCard({ job, reminder, dragging, onDragStart, onDragEnd, onOpen }: {
  job: JobCard;
  reminder?: Reminder;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onOpen: () => void;
}) {
  return (
    <motion.article
      layout
      layoutId={`card-${job.id}`}
      transition={spring}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: dragging ? 0.45 : 1, y: 0, scale: dragging ? 0.97 : 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -2 }}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className="group relative cursor-pointer rounded-lg border border-border/70 bg-card p-3 shadow-xs outline-none transition-[border-color,box-shadow] hover:border-brand/40 hover:shadow-md hover:shadow-brand/5 focus-visible:ring-2 focus-visible:ring-brand/50"
    >
      {/* native drag & drop lives on an inner wrapper: framer-motion's own drag props would conflict on motion.article */}
      <div draggable onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="flex items-start gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-brand/20 to-violet-400/20 text-[11px] font-semibold text-brand">
            {job.logo}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground" title={job.title}>{job.title}</p>
            <p className="truncate text-xs text-muted-foreground">{job.company}</p>
          </div>
          <GripVertical className="size-4 shrink-0 cursor-grab text-muted-foreground opacity-0 transition-opacity group-hover:opacity-60" />
        </div>

        <p className="mt-2.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
          <CalendarDays className="size-3" />
          {dateLabel(job)}
        </p>

        {job.stack.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {job.stack.slice(0, 4).map((tag) => (
              <Badge key={tag} variant="secondary" className="px-1.5 py-0 text-[10px]">
                {tag}
              </Badge>
            ))}
            {job.stack.length > 4 && (
              <Badge variant="outline" className="px-1.5 py-0 text-[10px] text-muted-foreground">
                +{job.stack.length - 4}
              </Badge>
            )}
          </div>
        )}

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <StatusPill label={job.statusLabel} tone={job.tone} />
          {reminder && <ReminderBadge reminder={reminder} />}
        </div>
      </div>
    </motion.article>
  );
}

/** Pipeline as columns. Gets the (already filtered) cards from the pipeline section. */
export default function KanbanBoard({ jobs, filtered, columns }: { jobs: JobCard[]; filtered: boolean; columns?: ColumnId[] | null }) {
  const shownColumns = columns ? COLUMNS.filter((col) => columns.includes(col.id)) : COLUMNS;
  const { attentionByApp: reminderByApp, updateApplicationStatus, isLoading, openApplication } = useDashboard();
  const [dragId, setDragId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<ColumnId | null>(null);
  const [expanded, setExpanded] = useState<Set<ColumnId>>(() => new Set());

  const drop = (column: ColumnId) => {
    const job = jobs.find((j) => j.id === dragId);
    // dropping a card back on its own column is not a status change
    if (job && job.column !== column) {
      void updateApplicationStatus(job.id, columnToStatusMap[column]);
    }
    setDragId(null);
    setOverColumn(null);
  };

  if (isLoading && jobs.length === 0) {
    return (
      <div className="-mx-1 flex gap-4 overflow-hidden px-1 pb-3">
        {shownColumns.map((col) => (
          <div key={col.id} className="w-72 shrink-0 space-y-2.5 rounded-xl border border-border/70 bg-surface/60 p-3">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="h-24 animate-pulse rounded-lg bg-muted/70" />
            <div className="h-24 animate-pulse rounded-lg bg-muted/50" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="-mx-1 flex snap-x gap-4 overflow-x-auto px-1 pb-3">
      {shownColumns.map((col, colIndex) => {
        // what needs action first (interview, follow-up), then the most recently active
        const items = jobs
          .filter((j) => j.column === col.id)
          .sort((a, b) => Number(reminderByApp.has(b.id)) - Number(reminderByApp.has(a.id)) || lastActivity(b) - lastActivity(a));
        const limit = col.id === "archived" ? CLOSED_LIMIT : COLUMN_LIMIT;
        // a search shows every match: hiding some would look like they were not found
        const isExpanded = filtered || expanded.has(col.id);
        const visible = isExpanded ? items : items.slice(0, limit);
        const hidden = items.length - visible.length;
        const isOver = overColumn === col.id && dragId !== null;
        const toggle = () => setExpanded((current) => {
          const next = new Set(current);
          if (next.has(col.id)) next.delete(col.id);
          else next.add(col.id);
          return next;
        });
        return (
          <motion.section
            key={col.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: colIndex * 0.05, duration: 0.35 }}
            onDragOver={(e) => {
              e.preventDefault();
              if (overColumn !== col.id) setOverColumn(col.id);
            }}
            onDragLeave={(e) => {
              // ignore leave events fired when moving over a child element
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverColumn((c) => (c === col.id ? null : c));
            }}
            onDrop={() => drop(col.id)}
            className={cn(
              "flex w-72 shrink-0 snap-start flex-col rounded-xl border bg-surface/70 p-3 backdrop-blur transition-[background-color,border-color,box-shadow] duration-200",
              isOver ? "border-brand/60 bg-brand-muted/50 shadow-lg shadow-brand/10" : "border-border/70",
            )}
          >
            <header className="mb-3 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <span className={cn("size-2 rounded-full", col.accent)} />
                  {col.label}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{col.hint}</p>
              </div>
              <motion.span
                key={items.length}
                initial={{ scale: 1.3 }}
                animate={{ scale: 1 }}
                className="rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground"
              >
                {items.length}
              </motion.span>
            </header>

            <div className="flex min-h-28 flex-1 flex-col gap-2.5">
              <AnimatePresence initial={false}>
                {visible.map((job) => (
                  <KanbanCard
                    key={job.id}
                    job={job}
                    reminder={reminderByApp.get(job.id)}
                    dragging={dragId === job.id}
                    onDragStart={() => setDragId(job.id)}
                    onDragEnd={() => {
                      setDragId(null);
                      setOverColumn(null);
                    }}
                    onOpen={() => openApplication(job.id)}
                  />
                ))}
              </AnimatePresence>

              {(hidden > 0 || (expanded.has(col.id) && !filtered && items.length > limit)) && (
                <button
                  type="button"
                  onClick={toggle}
                  className="group/more flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border/80 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-brand/40 hover:bg-brand-muted/40 hover:text-brand"
                >
                  {hidden > 0 ? `Show ${hidden} more` : "Show less"}
                  <ChevronDown className={cn("size-3.5 transition-transform", hidden === 0 && "rotate-180")} />
                </button>
              )}

              {items.length === 0 && (
                <div
                  className={cn(
                    "flex flex-1 flex-col items-center justify-center gap-1 rounded-lg border border-dashed py-6 text-center text-xs transition-colors",
                    isOver ? "border-brand/60 text-brand" : "border-border/70 text-muted-foreground",
                  )}
                >
                  <Inbox className="size-4 opacity-60" />
                  {isOver ? "Release to move here" : "Drop a card here"}
                </div>
              )}
            </div>
          </motion.section>
        );
      })}
    </div>
  );
}
