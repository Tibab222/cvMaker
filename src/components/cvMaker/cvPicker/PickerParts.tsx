import type { ReactNode } from "react";
import { Check, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Tabs, useUiStore } from "@/store/ui";

/** Match with the job description, from the analysis. */
export function ScoreBadge({ score, className }: { score: number | undefined; className?: string }) {
  if (score === undefined) return null;
  const percent = Math.round(score * 100);
  return (
    <span
      title="Match with the job description"
      className={cn(
        "inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
        percent >= 80 ? "bg-emerald-500/10 text-emerald-700" : percent >= 50 ? "bg-amber-500/10 text-amber-700" : "bg-muted text-muted-foreground",
        className,
      )}
    >
      <Sparkles className="size-2.5" />
      {percent}%
    </span>
  );
}

/**
 * The box of a selectable item. With `order`, a picked item shows its position instead of a check: for lists
 * shown on the resume in the order they were picked.
 */
export function PickBox({ selected, order, round }: { selected: boolean; order?: number; round?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-5 shrink-0 items-center justify-center border text-[10px] font-bold transition-all",
        round ? "rounded-full" : "rounded-md",
        selected ? "border-brand bg-brand text-brand-foreground" : "border-muted-foreground/30 bg-background group-hover:border-brand/60",
      )}
    >
      {selected && (order !== undefined ? order + 1 : <Check className="size-3" strokeWidth={3} />)}
    </span>
  );
}

interface PickRowProps {
  selected: boolean;
  onToggle: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  score?: number;
  order?: number;
  children?: ReactNode;
}

/** One item of a picker: click anywhere to put it on the resume or take it off. */
export function PickRow({ selected, onToggle, title, subtitle, meta, score, order, children }: PickRowProps) {
  return (
    <div
      role="checkbox"
      aria-checked={selected}
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(event) => {
        if (event.key === " " || event.key === "Enter") {
          event.preventDefault();
          onToggle();
        }
      }}
      className={cn(
        "group flex cursor-pointer select-none gap-3 rounded-xl border p-3 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50",
        selected ? "border-brand/40 bg-brand/5" : "border-border bg-background hover:border-brand/30 hover:bg-muted/40",
      )}
    >
      <div className="pt-0.5">
        <PickBox selected={selected} order={order} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className={cn("text-sm font-semibold leading-snug", !selected && "text-foreground/80")}>{title}</p>
          <ScoreBadge score={score} className="mt-0.5" />
        </div>
        {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
        {meta && <p className="mt-0.5 text-[11px] text-muted-foreground/80">{meta}</p>}
        {children}
      </div>
    </div>
  );
}

/** "2 of 5 on the resume" with select all / none. */
export function SelectionBar({ selected, total, onAll, onNone, children }: {
  selected: number;
  total: number;
  onAll: () => void;
  onNone: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <p className="text-xs text-muted-foreground">
        <span className="font-semibold text-foreground tabular-nums">{selected}</span> of {total} on the resume
      </p>
      <div className="flex items-center gap-1">
        {children}
        <Button variant="ghost" size="xs" onClick={onAll} disabled={selected === total}>All</Button>
        <Button variant="ghost" size="xs" onClick={onNone} disabled={selected === 0}>None</Button>
      </div>
    </div>
  );
}

/** Shown when the profile has nothing of this kind yet: the way to add some. */
export function EmptyProfile({ what, tab }: { what: string; tab: Tabs }) {
  const { setSelectedTab } = useUiStore();
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-4 py-8 text-center">
      <p className="text-sm text-muted-foreground">Your profile has no {what} yet.</p>
      <Button size="sm" variant="outline" onClick={() => setSelectedTab(tab)} className="gap-1.5">
        <Plus className="size-3.5" /> Add {what}
      </Button>
    </div>
  );
}
