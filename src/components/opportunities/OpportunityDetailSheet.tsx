import { format } from "date-fns";
import { ArrowRight, Building2, CalendarDays, ExternalLink, Globe2, MapPin, RotateCcw, Star, WandSparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { scoreTone } from "@/lib/opportunities";
import { DiscoveredJobStatus, type DiscoveredJob } from "@shared/discovery.types";
import { parseDbDate } from "@shared/utils";
import AdzunaAttribution from "./AdzunaAttribution";
import ScoreRing from "./ScoreRing";
import VaultSuggestion from "../resumeLibrary/vault/VaultSuggestion";
import { STATUS_META } from "../dashboard/mapApplicationToJabCard";
import StatusPill from "../dashboard/StatusPill";
import { JobApplicationStatus } from "@shared/jobApplications.type";
import { Tabs, useUiStore } from "@/store/ui";

interface Props {
  job: DiscoveredJob | null;
  onClose: () => void;
  onStatus: (id: number, status: DiscoveredJobStatus) => void;
  onPrepare: (id: number) => void;
  /** The offer's link was opened: the user is probably about to apply. */
  onOpenLink: (id: number) => void;
}

/** Full offer, with why it matches and what it asks that the profile does not show. */
export default function OpportunityDetailSheet({ job, onClose, onStatus, onPrepare, onOpenLink }: Props) {
  const posted = job ? parseDbDate(job.posted_at) : null;
  const applicationMeta = job?.application_status ? STATUS_META[job.application_status as JobApplicationStatus] : null;
  const setSelectedTab = useUiStore((state) => state.setSelectedTab);
  const tone = scoreTone(job?.score ?? null);

  return (
    <Sheet open={!!job} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="flex flex-col gap-0 border-border/70 bg-background/95 p-0 text-foreground backdrop-blur-xl data-[side=right]:w-full data-[side=right]:sm:max-w-xl"
      >
        {job && (
          <>
            <SheetHeader className="border-b border-border/70 px-5 py-4">
              <div className="flex items-start gap-4 pr-8">
                <ScoreRing score={job.score} size={60} />
                <div className="min-w-0">
                  <SheetTitle className="text-base leading-snug">{job.title}</SheetTitle>
                  <SheetDescription className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
                    <span className="inline-flex items-center gap-1"><Building2 className="size-3" /> {job.company}</span>
                    {job.location && <span className="inline-flex items-center gap-1"><MapPin className="size-3" /> {job.location}</span>}
                    {job.remote && <span className="inline-flex items-center gap-1 text-sky-700"><Globe2 className="size-3" /> Remote</span>}
                    {posted && <span className="inline-flex items-center gap-1"><CalendarDays className="size-3" /> {format(posted, "d MMM yyyy")}</span>}
                  </SheetDescription>
                  <p className={`mt-1.5 flex flex-wrap items-center gap-2 text-xs font-medium ${tone.text}`}>
                    {tone.label}
                    {applicationMeta && <StatusPill label={applicationMeta.label} tone={applicationMeta.tone} />}
                  </p>
                </div>
              </div>
            </SheetHeader>

            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
              {job.salary && (
                <p className="rounded-lg border border-border/70 bg-surface-elevated px-3 py-2 text-sm">
                  <span className="text-xs text-muted-foreground">Salary · </span>{job.salary}
                </p>
              )}

              {(job.matched_keywords.length > 0 || job.missing_keywords.length > 0) && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="mb-1.5 text-xs font-medium text-emerald-700">You have</p>
                    <div className="flex flex-wrap gap-1">
                      {job.matched_keywords.length === 0 && <span className="text-xs text-muted-foreground">Nothing obvious</span>}
                      {job.matched_keywords.map((keyword) => <span key={keyword} className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[11px] text-emerald-700">{keyword}</span>)}
                    </div>
                  </div>
                  <div>
                    <p className="mb-1.5 text-xs font-medium text-amber-700">They also ask</p>
                    <div className="flex flex-wrap gap-1">
                      {job.missing_keywords.length === 0 && <span className="text-xs text-muted-foreground">Nothing missing</span>}
                      {job.missing_keywords.map((keyword) => <span key={keyword} className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[11px] text-amber-700">{keyword}</span>)}
                    </div>
                  </div>
                </div>
              )}

              <VaultSuggestion key={job.id} offer={{ title: job.title, description: job.description ?? "" }} />

              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">Offer</p>
                {job.description ? (
                  <div className="whitespace-pre-line rounded-lg border border-border/70 bg-card p-4 text-sm leading-relaxed text-foreground/90">{job.description}</div>
                ) : (
                  <p className="text-sm text-muted-foreground">No description kept for this offer.</p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-border/70 px-5 py-3">
              {job.url && (
                <Button variant="ghost" size="sm" asChild className="gap-1.5">
                  <a href={job.url} target="_blank" rel="noreferrer" onClick={() => onOpenLink(job.id)}><ExternalLink className="size-3.5" /> Open the offer</a>
                </Button>
              )}
              <AdzunaAttribution job={job} />
              {job.status === DiscoveredJobStatus.APPLIED ? (
                <div className="ml-auto flex gap-2">
                  <Button size="sm" className="gap-1.5" onClick={() => { onClose(); setSelectedTab(Tabs.DASHBOARD); }}>
                    See the application <ArrowRight className="size-3.5" />
                  </Button>
                </div>
              ) : (
              <div className="ml-auto flex gap-2">
                {job.status === DiscoveredJobStatus.DISMISSED ? (
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onStatus(job.id, DiscoveredJobStatus.NEW)}>
                    <RotateCcw className="size-3.5" /> Restore
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" className="gap-1.5 hover:bg-rose-500/10 hover:text-rose-600" onClick={() => { onStatus(job.id, DiscoveredJobStatus.DISMISSED); onClose(); }}>
                    <X className="size-3.5" /> Dismiss
                  </Button>
                )}
                {job.status === DiscoveredJobStatus.NEW && (
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onStatus(job.id, DiscoveredJobStatus.SHORTLISTED)}>
                    <Star className="size-3.5" /> Keep
                  </Button>
                )}
                <Button size="sm" className="gap-1.5" onClick={() => onPrepare(job.id)}>
                  <WandSparkles className="size-3.5" /> Prepare CV
                </Button>
              </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
