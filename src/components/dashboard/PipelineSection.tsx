import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Columns3, Rows3, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { EASE_OUT } from "@/lib/motion";
import { fold } from "@/lib/suggest";
import type { ColumnId, JobCard } from "@/lib/dashboard-data";
import { mapApplicationToJobCard } from "./mapApplicationToJabCard";
import { useDashboard } from "./provider/hook";
import KanbanBoard from "./KanbanBoard";
import ApplicationsTable from "./ApplicationsTable";

type View = "board" | "table";
type Stage = "all" | "active" | "drafts" | "closed";

/** Board columns of each stage filter: "Active" keeps only what waits on companies. */
const STAGES: { id: Stage; label: string; columns: ColumnId[] | null }[] = [
  { id: "all", label: "All", columns: null },
  { id: "active", label: "Active", columns: ["applied", "interviewing", "offer"] },
  { id: "drafts", label: "To send", columns: ["backlog", "ai-review"] },
  { id: "closed", label: "Closed", columns: ["archived"] },
];

const VIEW_KEY = "cvmaker.dashboard.view";
const STAGE_KEY = "cvmaker.dashboard.stage";

/** Per-viewer conveniences: they may be unavailable (private storage), the defaults then apply. */
function readSetting<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return allowed.includes(value as T) ? (value as T) : fallback;
  } catch {
    return fallback;
  }
}
function saveSetting(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* not remembered, nothing else */
  }
}

function Segmented<T extends string>({ value, options, onChange, layoutId, label }: {
  value: T;
  options: { id: T; label: string; icon?: typeof Rows3; count?: number }[];
  onChange: (value: T) => void;
  layoutId: string;
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="flex shrink-0 rounded-lg bg-muted p-1">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="tab"
          aria-selected={value === option.id}
          onClick={() => onChange(option.id)}
          className={cn(
            "relative flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors",
            value === option.id ? "text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {value === option.id && (
            <motion.span layoutId={layoutId} className="absolute inset-0 rounded-md bg-background shadow-sm" transition={{ duration: 0.22, ease: EASE_OUT }} />
          )}
          {option.icon && <option.icon className="relative size-3.5" />}
          <span className="relative">{option.label}</span>
          {option.count !== undefined && <span className="relative tabular-nums text-muted-foreground">{option.count}</span>}
        </button>
      ))}
    </div>
  );
}

/** The application pipeline, as a board (drag between stages) or a table (everything at a glance). */
export default function PipelineSection() {
  const { applications } = useDashboard();
  const [view, setView] = useState<View>(() => readSetting(VIEW_KEY, ["board", "table"] as const, "board"));
  const [stage, setStage] = useState<Stage>(() => readSetting(STAGE_KEY, ["all", "active", "drafts", "closed"] as const, "all"));
  const [search, setSearch] = useState("");

  const jobs = useMemo(() => applications.map(mapApplicationToJobCard), [applications]);
  const needle = fold(search);
  const matching = useMemo(
    () => (needle ? jobs.filter((job) => [job.company, job.title, job.channel ?? "", ...job.stack].some((value) => fold(value).includes(needle))) : jobs),
    [jobs, needle],
  );
  const stageOf = (id: Stage) => STAGES.find((s) => s.id === id)!;
  const inStage = (job: JobCard, id: Stage) => {
    const columns = stageOf(id).columns;
    return !columns || columns.includes(job.column);
  };
  const visible = matching.filter((job) => inStage(job, stage));

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Application pipeline</h2>
          <p className="text-xs text-muted-foreground">
            {view === "board" ? "Drag cards between stages · click a card for its full history" : "Click a row for its full history · change the status in place"}
          </p>
        </div>
        <Segmented
          label="Pipeline view"
          layoutId="pipeline-view"
          value={view}
          onChange={(next) => {
            setView(next);
            saveSetting(VIEW_KEY, next);
          }}
          options={[
            { id: "board", label: "Board", icon: Columns3 },
            { id: "table", label: "Table", icon: Rows3 },
          ]}
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Segmented
          label="Stage filter"
          layoutId="pipeline-stage"
          value={stage}
          onChange={(next) => {
            setStage(next);
            saveSetting(STAGE_KEY, next);
          }}
          options={STAGES.map((s) => ({ id: s.id, label: s.label, count: matching.filter((job) => inStage(job, s.id)).length }))}
        />
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => event.key === "Escape" && setSearch("")}
            placeholder="Company, position, skill…"
            aria-label="Filter applications"
            className="h-9 bg-surface-elevated pl-8 pr-8 text-sm"
          />
          {search && (
            <button type="button" onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground" aria-label="Clear the filter">
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      <motion.div key={view} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: EASE_OUT }}>
        {view === "board" ? (
          <KanbanBoard jobs={visible} filtered={needle.length > 0} columns={stageOf(stage).columns} />
        ) : (
          <ApplicationsTable jobs={visible} />
        )}
      </motion.div>
    </section>
  );
}
