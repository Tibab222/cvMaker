import { forwardRef } from "react";
import { motion } from "framer-motion";
import { formatDistanceToNowStrict } from "date-fns";
import { Building2, ExternalLink, Puzzle, Globe2, MapPin, RotateCcw, Star, WandSparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { listItem } from "@/lib/motion";
import { DiscoveredJobStatus, type DiscoveredJob } from "@shared/discovery.types";
import { JobApplicationStatus } from "@shared/jobApplications.type";
import { parseDbDate } from "@shared/utils";
import AdzunaAttribution from "./AdzunaAttribution";
import { STATUS_META } from "../dashboard/mapApplicationToJabCard";
import StatusPill from "../dashboard/StatusPill";
import ScoreRing from "./ScoreRing";

interface OpportunityCardProps {
  job: DiscoveredJob;
  onOpen: (job: DiscoveredJob) => void;
  onStatus: (id: number, status: DiscoveredJobStatus) => void;
  onPrepare: (id: number) => void;
  /** The offer's link was opened: the user is probably about to apply. */
  onOpenLink: (id: number) => void;
}

/** One offer of the queue: who, where, how well it matches, and the next move. */
const OpportunityCard = forwardRef<HTMLDivElement, OpportunityCardProps>(function OpportunityCard({ job, onOpen, onStatus, onPrepare, onOpenLink }, ref) {
  const posted = parseDbDate(job.posted_at) ?? parseDbDate(job.discovered_at);
  const applicationMeta = job.application_status ? STATUS_META[job.application_status as JobApplicationStatus] : null;
  const stop = (fn: () => void) => (event: React.MouseEvent) => {
    event.stopPropagation();
    fn();
  };

  return (
    <motion.div
      ref={ref}
      layout
      variants={listItem}
      initial="hidden"
      animate="show"
      exit="exit"
      role="button"
      tabIndex={0}
      onClick={() => onOpen(job)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(job);
        }
      }}
      className={cn(
        "group flex cursor-pointer items-start gap-4 rounded-xl border border-border/70 bg-card p-4 text-left shadow-xs outline-none transition-[border-color,box-shadow,transform] duration-200",
        "hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lg hover:shadow-brand/5 focus-visible:ring-2 focus-visible:ring-brand/40",
        job.status === DiscoveredJobStatus.DISMISSED && "opacity-70",
      )}
    >
      <ScoreRing score={job.score} />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="truncate text-sm font-semibold text-foreground">{job.title}</h3>
          {job.remote && (
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2 py-0.5 text-[11px] font-medium text-sky-700">
              <Globe2 className="size-3" /> Remote
            </span>
          )}
          {job.origin === "extension" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2 py-0.5 text-[11px] font-medium text-violet-700" title="Sent from the browser extension">
              <Puzzle className="size-3" /> Saved while browsing
            </span>
          )}
          <AdzunaAttribution job={job} />
          {applicationMeta && <StatusPill label={applicationMeta.label} tone={applicationMeta.tone} />}
        </div>

        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Building2 className="size-3" /> {job.company}</span>
          {job.location && <span className="inline-flex items-center gap-1"><MapPin className="size-3" /> {job.location}</span>}
          {posted && <span>{formatDistanceToNowStrict(posted, { addSuffix: true })}</span>}
          {job.salary && <span className="font-medium text-foreground/80">{job.salary}</span>}
        </p>

        {(job.matched_keywords.length > 0 || job.missing_keywords.length > 0) && (
          <div className="mt-2.5 flex flex-wrap gap-1">
            {job.matched_keywords.slice(0, 5).map((keyword) => (
              <span key={`m-${keyword}`} className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[11px] text-emerald-700">{keyword}</span>
            ))}
            {job.missing_keywords.slice(0, 3).map((keyword) => (
              <span key={`x-${keyword}`} className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[11px] text-amber-700" title="Asked by the offer, not found in your profile">
                {keyword}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1.5 opacity-90 transition-opacity group-hover:opacity-100">
        {job.url && (
          <Button size="icon" variant="ghost" className="size-8 text-muted-foreground hover:text-foreground" asChild>
            <a
              href={job.url}
              target="_blank"
              rel="noreferrer"
              aria-label="Open the offer"
              title="Open the offer"
              onClick={(event) => {
                event.stopPropagation();
                onOpenLink(job.id);
              }}
            >
              <ExternalLink className="size-4" />
            </a>
          </Button>
        )}
        {job.status === DiscoveredJobStatus.NEW && (
          <Button size="sm" variant="outline" className="gap-1.5" onClick={stop(() => onStatus(job.id, DiscoveredJobStatus.SHORTLISTED))}>
            <Star className="size-3.5" /> Keep
          </Button>
        )}
        {(job.status === DiscoveredJobStatus.SHORTLISTED || job.status === DiscoveredJobStatus.PREPARED) && (
          <Button size="sm" className="gap-1.5" onClick={stop(() => onPrepare(job.id))}>
            <WandSparkles className="size-3.5" /> {job.status === DiscoveredJobStatus.PREPARED ? "Open again" : "Prepare CV"}
          </Button>
        )}
        {job.status === DiscoveredJobStatus.APPLIED ? null : job.status === DiscoveredJobStatus.DISMISSED ? (
          <Button size="sm" variant="ghost" className="gap-1.5" onClick={stop(() => onStatus(job.id, DiscoveredJobStatus.NEW))}>
            <RotateCcw className="size-3.5" /> Restore
          </Button>
        ) : (
          <Button
            size="icon"
            variant="ghost"
            className="size-8 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600"
            aria-label="Dismiss"
            title="Dismiss"
            onClick={stop(() => onStatus(job.id, DiscoveredJobStatus.DISMISSED))}
          >
            <X className="size-4" />
          </Button>
        )}
      </div>
    </motion.div>
  );
});

export default OpportunityCard;
