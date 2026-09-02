import { useState } from "react";
import { motion } from "framer-motion";
import { CalendarDays, CircleCheck, GripVertical, TriangleAlert, Sparkles } from "lucide-react";
import { COLUMNS, JOBS, type ColumnId, type JobCard } from "@/lib/dashboard-data";
import { Badge } from "@/components/ui/badge";
import JobDrawer from "./JobDrawer";

function matchTone(match: number) {
  if (match >= 85) return "bg-success/12 text-success border-success/25";
  if (match >= 70) return "bg-warning/12 text-warning border-warning/25";
  return "bg-muted text-muted-foreground border-border";
}

function StatusChip({ label, tone }: { label: string; tone: "info" | "warn" | "ok" }) {
  const Icon = tone === "warn" ? TriangleAlert : tone === "ok" ? CircleCheck : Sparkles;
  const cls =
    tone === "warn"
      ? "text-warning bg-warning/10"
      : tone === "ok"
        ? "text-success bg-success/10"
        : "text-brand bg-brand-muted";
  return (
    <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] ${cls}`}>
      <Icon className="size-3" />
      {label}
    </span>
  );
}

export default function KanbanBoard() {
  const [jobs, setJobs] = useState<JobCard[]>(JOBS);
  const [active, setActive] = useState<JobCard | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<ColumnId | null>(null);

  const drop = (column: ColumnId) => {
    if (dragId) {
      setJobs((prev) => prev.map((j) => (j.id === dragId ? { ...j, column } : j)));
    }
    setDragId(null);
    setOverColumn(null);
  };

  return (
    <>
      <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-3">
        {COLUMNS.map((col, colIndex) => {
          const items = jobs.filter((j) => j.column === col.id);
          return (
            <motion.div
              key={col.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: colIndex * 0.05, duration: 0.35 }}
              onDragOver={(e) => {
                e.preventDefault();
                setOverColumn(col.id);
              }}
              onDragLeave={() => setOverColumn((c) => (c === col.id ? null : c))}
              onDrop={() => drop(col.id)}
              className={`flex w-72 shrink-0 flex-col rounded-xl border bg-surface/60 p-3 backdrop-blur transition-colors ${
                overColumn === col.id ? "border-brand/60 bg-brand-muted/40" : "border-border/70"
              }`}
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">{col.label}</p>
                  <p className="text-[11px] text-muted-foreground">{col.hint}</p>
                </div>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {items.length}
                </span>
              </div>

              <div className="flex min-h-24 flex-col gap-2.5">
                {items.map((job) => (
                  <motion.article
                    key={job.id}
                    layout
                    draggable
                    onDragStart={() => setDragId(job.id)}
                    onDragEnd={() => setDragId(null)}
                    onClick={() => setActive(job)}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: dragId === job.id ? 0.5 : 1, scale: 1 }}
                    whileHover={{ y: -2 }}
                    className="group cursor-pointer rounded-lg border border-border/70 bg-surface-elevated/80 p-3 transition-colors hover:border-brand/50"
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-brand-muted text-[11px] font-semibold text-brand">
                        {job.logo}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{job.title}</p>
                        <p className="truncate text-xs text-muted-foreground">{job.company}</p>
                      </div>
                      <GripVertical className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-60" />
                    </div>

                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${matchTone(job.match)}`}
                      >
                        {job.match}% Match
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                        <CalendarDays className="size-3" />
                        {job.dateTag}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1">
                      {job.stack.map((tag) => (
                        <Badge key={tag} variant="secondary" className="px-1.5 py-0 text-[10px]">
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1">
                      {job.status.map((s) => (
                        <StatusChip key={s.label} label={s.label} tone={s.tone} />
                      ))}
                    </div>
                  </motion.article>
                ))}

                {items.length === 0 && (
                  <div className="rounded-lg border border-dashed border-border/70 py-6 text-center text-xs text-muted-foreground">
                    Drop a job here
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      <JobDrawer job={active} onOpenChange={(open) => !open && setActive(null)} />
    </>
  );
}
