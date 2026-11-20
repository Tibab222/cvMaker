import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Building2, Inbox, Moon, Radar, Search, SlidersHorizontal, Sparkles, Telescope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { fadeUp, staggerContainer } from "@/lib/motion";
import { QUEUE_VIEWS } from "@/lib/opportunities";
import { DiscoveredJobStatus, type DiscoveredJob } from "@shared/discovery.types";
import PageHeader from "../general/PageHeader";
import EmptyState from "../general/EmptyState";
import OpportunityCard from "./OpportunityCard";
import OpportunityDetailSheet from "./OpportunityDetailSheet";
import RunBanner from "./RunBanner";
import SearchSetupSheet, { StarterBoards } from "./SearchSetupSheet";
import { useDiscovery } from "./useDiscovery";

const STEPS = [
  { icon: Building2, title: "Say where to look", text: "Keyword searches over the whole market (\"devops · Montréal\"), and the companies you would love to join." },
  { icon: Moon, title: "Search at night", text: "CV Maker reads their open roles, gently, keeps the ones that fit your profile and scores them." },
  { icon: Sparkles, title: "Review in the morning", text: "Keep the good ones, prepare a tailored CV in one click, apply yourself." },
];

export default function Opportunities() {
  const discovery = useDiscovery();
  const { jobs, sources, settings, status } = discovery;
  const [view, setView] = useState<DiscoveredJobStatus>(DiscoveredJobStatus.NEW);
  const [query, setQuery] = useState("");
  const [setupOpen, setSetupOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const counts = useMemo(() => {
    const result = Object.fromEntries(QUEUE_VIEWS.map((v) => [v.status, 0])) as Record<DiscoveredJobStatus, number>;
    jobs?.forEach((job) => { result[job.status] += 1; });
    return result;
  }, [jobs]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (jobs ?? []).filter((job) =>
      job.status === view &&
      (!needle || `${job.title} ${job.company} ${job.location ?? ""} ${job.matched_keywords.join(" ")}`.toLowerCase().includes(needle)),
    );
  }, [jobs, view, query]);

  const selected: DiscoveredJob | null = jobs?.find((job) => job.id === selectedId) ?? null;
  const running = !!status?.running;
  const onboarding = sources.length === 0 && (jobs?.length ?? 0) === 0;
  const schedule = settings?.schedule;

  const description = onboarding
    ? "Let CV Maker look for offers while you sleep"
    : `${counts[DiscoveredJobStatus.NEW]} to review · ${sources.length} ${sources.length > 1 ? "companies" : "company"} followed${schedule?.enabled ? ` · daily search at ${String(schedule.hour).padStart(2, "0")}:00` : ""}`;

  return (
    <div className="flex min-h-full w-full flex-col">
      <PageHeader
        icon={Telescope}
        title="Opportunities"
        description={description}
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setSetupOpen(true)}>
              <SlidersHorizontal className="size-4" /> <span className="hidden sm:inline">Search setup</span>
            </Button>
            {!onboarding && (
              <Button size="sm" className="gap-1.5" onClick={() => void discovery.start()} disabled={running}>
                <Radar className={cn("size-4", running && "animate-spin [animation-duration:3s]")} />
                {running ? "Searching…" : "Search now"}
              </Button>
            )}
          </>
        }
      />

      <div className="mx-auto w-full max-w-5xl space-y-4 px-4 py-5 md:px-6">
        <RunBanner status={status} onCancel={discovery.cancel} />

        {onboarding ? (
          <motion.div variants={staggerContainer(0.08)} initial="hidden" animate="show" className="space-y-5">
            <motion.div variants={fadeUp} className="relative overflow-hidden rounded-2xl border border-border/70 bg-card p-6 md:p-8">
              <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-brand/10 blur-3xl" />
              <h2 className="text-lg font-semibold tracking-tight text-foreground">Your morning queue of job offers</h2>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                Instead of scrolling job sites every evening, follow the companies you like. Every night CV Maker checks their open roles and ranks them against your profile. Nothing is ever sent on your behalf.
              </p>
              <div className="mt-6 grid gap-3 md:grid-cols-3">
                {STEPS.map(({ icon: Icon, title, text }, index) => (
                  <motion.div key={title} variants={fadeUp} className="rounded-xl border border-border/70 bg-surface/70 p-4">
                    <span className="flex size-8 items-center justify-center rounded-lg bg-brand-muted text-brand">
                      <Icon className="size-4" />
                    </span>
                    <p className="mt-3 text-sm font-medium text-foreground">
                      <span className="mr-1.5 text-muted-foreground">{index + 1}.</span>{title}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{text}</p>
                  </motion.div>
                ))}
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                <Button className="gap-1.5" onClick={() => setSetupOpen(true)}>
                  <Search className="size-4" /> Search by keywords
                </Button>
                <Button variant="outline" className="gap-1.5" onClick={() => setSetupOpen(true)}>
                  <Building2 className="size-4" /> Follow a company
                </Button>
              </div>
              <div className="mt-6 border-t border-border/70 pt-5">
                <p className="mb-3 text-xs text-muted-foreground">
                  Or start with one click. What to look for comes from your profile; you can adjust it in the search setup.
                </p>
                <StarterBoards discovery={discovery} />
              </div>
            </motion.div>
          </motion.div>
        ) : (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <nav className="flex gap-1 overflow-x-auto rounded-lg bg-muted p-1" aria-label="Queue views">
                {QUEUE_VIEWS.map(({ status: id, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setView(id)}
                    aria-current={view === id ? "page" : undefined}
                    className={cn(
                      "relative z-10 flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                      view === id ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {view === id && (
                      <motion.span layoutId="queue-view" className="absolute inset-0 -z-10 rounded-md bg-background shadow-sm" transition={{ type: "spring", stiffness: 500, damping: 35 }} />
                    )}
                    {label}
                    <span className={cn("rounded-full px-1.5 text-[10px] tabular-nums", view === id ? "bg-brand-muted text-brand" : "bg-background/60")}>{counts[id]}</span>
                  </button>
                ))}
              </nav>
              <div className="relative sm:w-64">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter by title, company, skill" className="h-8 pl-8 text-xs" />
              </div>
            </div>

            {jobs === null ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
              </div>
            ) : visible.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title={query ? "No offer matches this filter" : view === DiscoveredJobStatus.NEW && !running ? "You are all caught up" : "Nothing here"}
                description={query ? "Try another word." : QUEUE_VIEWS.find((v) => v.status === view)?.empty}
                action={view === DiscoveredJobStatus.NEW && !query && !running ? (
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => void discovery.start()}>
                    <Radar className="size-4" /> Search now
                  </Button>
                ) : undefined}
              />
            ) : (
              <div className="space-y-2.5">
                <AnimatePresence initial={false} mode="popLayout">
                  {visible.map((job) => (
                    <OpportunityCard
                      key={job.id}
                      job={job}
                      onOpen={(j) => setSelectedId(j.id)}
                      onStatus={discovery.setJobStatus}
                      onPrepare={discovery.prepareJob}
                      onOpenLink={discovery.markOpened}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </>
        )}
      </div>

      <OpportunityDetailSheet job={selected} onClose={() => setSelectedId(null)} onStatus={discovery.setJobStatus} onPrepare={discovery.prepareJob} onOpenLink={discovery.markOpened} />
      <SearchSetupSheet open={setupOpen} onOpenChange={setSetupOpen} discovery={discovery} />
    </div>
  );
}
