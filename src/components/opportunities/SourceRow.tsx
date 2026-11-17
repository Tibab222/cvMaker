import { forwardRef } from "react";
import { motion } from "framer-motion";
import { formatDistanceToNowStrict } from "date-fns";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { listItem } from "@/lib/motion";
import { KIND_STYLE } from "@/lib/opportunities";
import { JobSourceKind, type JobSource } from "@shared/discovery.types";
import { parseDbDate } from "@shared/utils";

interface SourceRowProps {
  source: JobSource;
  /** Shown before the kind badge, e.g. the country of a keyword search. */
  extra?: string;
  onToggle: (id: number, enabled: boolean) => void;
  onRemove: (id: number) => void;
}

/** One followed company or saved search: on/off, last result, remove. */
export const SourceRow = forwardRef<HTMLLIElement, SourceRowProps>(function SourceRow({ source, extra, onToggle, onRemove }, ref) {
  const lastRun = parseDbDate(source.last_run_at);
  const kind = KIND_STYLE[source.kind];
  const isSearch = source.kind === JobSourceKind.ADZUNA;
  return (
    <motion.li
      ref={ref}
      layout
      variants={listItem}
      initial="hidden"
      animate="show"
      exit="exit"
      className={cn("flex items-center gap-3 rounded-lg border border-border/70 bg-card px-3 py-2", !source.enabled && "opacity-60")}
    >
      <Switch checked={source.enabled} onCheckedChange={(checked) => onToggle(source.id, checked)} aria-label={`Search ${source.label}`} />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-sm font-medium text-foreground">
          <span className="truncate">{source.label}</span>
          {extra && <span className="shrink-0 text-[11px] font-normal text-muted-foreground">{extra}</span>}
          <span className={cn("shrink-0 rounded px-1.5 py-px text-[10px] font-medium", kind.className)}>{kind.label}</span>
        </p>
        <p className={cn("truncate text-[11px]", source.last_error ? "text-rose-600" : "text-muted-foreground")}>
          {source.last_error
            ? source.last_error
            : lastRun
              ? `${source.last_found} ${isSearch ? "recent offers" : "open roles"} · checked ${formatDistanceToNowStrict(lastRun, { addSuffix: true })}`
              : "Not searched yet"}
        </p>
      </div>
      <Button
        size="icon"
        variant="ghost"
        className="size-7 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600"
        aria-label={`Remove ${source.label}`}
        onClick={() => onRemove(source.id)}
      >
        <Trash2 className="size-3.5" />
      </Button>
    </motion.li>
  );
});
