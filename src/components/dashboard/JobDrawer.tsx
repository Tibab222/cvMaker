import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  Building2,
  CalendarDays,
  Clipboard,
  ExternalLink,
  FileText,
  FolderOpen,
  Loader2,
  RefreshCw,
  Wallet,
} from "lucide-react";
import type { JobCard } from "@/lib/dashboard-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useDashboard } from "./provider/hook";
import { mapApplicationWithEventsToJobCard } from "./mapApplicationToJabCard";
import type { ApplicationWithEvents } from "@shared/jobApplications.type";

interface Props {
  rawJob: JobCard | null;
  onOpenChange: (open: boolean) => void;
}

export default function JobDrawer({ rawJob, onOpenChange }: Props) {
  const { getApplicationInfos } = useDashboard();
  const [jobDetails, setJobDetails] = useState<ApplicationWithEvents | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const updateJobDetails = async () => {
      if (!rawJob) {
        setJobDetails(null);
        return;
      }
  
      setIsLoading(true);
      try {
        const details = await getApplicationInfos(rawJob.id);
        if (!cancelled) {
          setJobDetails(details);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    updateJobDetails();
    
    return () => {
      cancelled = true;
    };
  }, [getApplicationInfos, rawJob]);

  const isOpen = !!rawJob;
  const job = jobDetails ? mapApplicationWithEventsToJobCard(jobDetails) : null;
  
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 border-border/70 bg-surface/95 p-0 text-foreground backdrop-blur-xl sm:max-w-xl"
      >
        {isLoading || !job ? (
          <div className="flex h-full w-full items-center justify-center">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <SheetHeader className="gap-3 border-b border-border/70 p-6">
              <div className="flex items-start gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand-muted text-sm font-semibold text-brand">
                  {job.logo}
                </div>
                <div className="min-w-0 flex-1">
                  <SheetTitle className="text-lg leading-tight">{job.title}</SheetTitle>
                  <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                    <Building2 className="size-3.5" />
                    {job.company}
                    {/* <Dot className="size-4" /> */}
                    {/* <span className="text-brand">{job.match}% match</span> */}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-md border border-border/70 bg-surface-elevated/60 px-3 py-2">
                  <p className="flex items-center gap-1 text-muted-foreground">
                    <CalendarDays className="size-3" /> Applied
                  </p>
                  <p className="mt-0.5 font-medium text-foreground">{job.appliedAt}</p>
                </div>
                <div className="rounded-md border border-border/70 bg-surface-elevated/60 px-3 py-2">
                  <p className="flex items-center gap-1 text-muted-foreground">
                    <Wallet className="size-3" /> Salary range
                  </p>
                  <p className="mt-0.5 font-medium text-foreground">{job.salary}</p>
                </div>
              </div>

              { job.url &&
                <Button asChild variant="outline" size="sm" className="w-fit">
                <a href={job.url} target="_blank" rel="noreferrer">
                  <ExternalLink className="size-3.5" /> Open job posting
                </a>
              </Button>}
            </SheetHeader>

            <Tabs defaultValue="timeline" className="flex min-h-0 flex-1 flex-col">
              <div className="px-6 pt-4">
                <TabsList className="w-full">
                  <TabsTrigger value="timeline" className="flex-1">
                    Timeline
                  </TabsTrigger>
                  <TabsTrigger value="resume" className="flex-1">
                    Tailored Resume
                  </TabsTrigger>
                  <TabsTrigger value="notes" className="flex-1">
                    Notes & Prep
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-6">
                <TabsContent value="timeline" className="mt-0">
                  <ol className="relative space-y-5 border-l border-border/70 pl-6">
                    {job.timeline.map((event, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="relative"
                      >
                        <span className="absolute left-[-1.9rem] top-1 size-2.5 rounded-full bg-brand ring-4 ring-brand-muted" />
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {event.at}
                        </p>
                        <p className="mt-1 text-sm text-foreground">{event.label}</p>
                        {event.file && (
                          <button className="mt-1.5 inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-surface-elevated/60 px-2 py-1 text-xs text-brand transition-colors hover:border-brand/50">
                            <FileText className="size-3" />
                            {event.file}
                          </button>
                        )}
                      </motion.li>
                    ))}
                  </ol>
                </TabsContent>

                <TabsContent value="resume" className="mt-0 space-y-4">
                  <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface-elevated/50 text-center">
                    <FileText className="size-8 text-muted-foreground" />
                    <p className="mt-3 text-sm font-medium text-foreground">{job.resume}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Local PDF preview — generated on-device
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm">
                      <RefreshCw className="size-3.5" /> Re-generate with AI
                    </Button>
                    <Button size="sm" variant="outline">
                      <FolderOpen className="size-3.5" /> Open in Folder
                    </Button>
                    <Button size="sm" variant="outline">
                      <Clipboard className="size-3.5" /> Copy Plain Text
                    </Button>
                  </div>
                  <Separator />
                  <div className="flex flex-wrap gap-1.5">
                    {job.stack.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="notes" className="mt-0 space-y-4">
                  <div>
                    <p className="mb-2 text-sm font-medium text-foreground">Interview notes</p>
                    <Textarea
                      defaultValue={job.notes}
                      placeholder="Recruiter contacts, salary expectations, questions to ask…"
                      className="min-h-40 bg-surface-elevated/60"
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-md border border-border/70 bg-surface-elevated/60 p-3">
                      <p className="text-xs text-muted-foreground">Salary expectation</p>
                      <p className="mt-1 text-sm font-medium text-foreground">{job.salary}</p>
                    </div>
                    <div className="rounded-md border border-border/70 bg-surface-elevated/60 p-3">
                      <p className="text-xs text-muted-foreground">Recruiter contact</p>
                      <p className="mt-1 text-sm font-medium text-foreground">Not set</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline">
                    Save notes
                  </Button>
                </TabsContent>
              </div>
            </Tabs>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
