import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  Building2,
  CalendarDays,
  ExternalLink,
  Eye,
  FileText,
  FileX,
  FolderOpen,
  Loader2,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/api";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import ResumePreviewDialog from "./ResumePreviewDialog";

interface Props {
  rawJob: JobCard | null;
  onOpenChange: (open: boolean) => void;
}

export default function JobDrawer({ rawJob, onOpenChange }: Props) {
  const { getApplicationInfos } = useDashboard();
  const [jobDetails, setJobDetails] = useState<ApplicationWithEvents | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handleOpenFolder = async (applicationId: string) => {
    const opened = await api.openResumeFolder(applicationId);
    if (!opened) toast.error("Resume file not found. It may have been moved or deleted.");
  };

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
                    <Wallet className="size-3" /> Salary
                  </p>
                  <p className="mt-0.5 font-medium text-foreground">{job.salary || "Not set"}</p>
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
                <TooltipProvider>
                  <TabsList className="w-full">
                    <TabsTrigger value="timeline" className="flex-1">
                      Timeline
                    </TabsTrigger>

                    <TabsTrigger value="resume" className="flex-1">
                      Tailored Resume
                    </TabsTrigger>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="flex-1 cursor-not-allowed">
                          <TabsTrigger value="notes" className="flex-1" disabled title="Coming soon...">
                            Notes & Prep
                          </TabsTrigger>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Coming soon...</p>
                      </TooltipContent>
                    </Tooltip>
                  </TabsList>
                </TooltipProvider>
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
                  {job.resume ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setIsPreviewOpen(true)}
                        className="flex h-64 w-full flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface-elevated/50 text-center transition-colors hover:border-brand/50"
                      >
                        <FileText className="size-8 text-muted-foreground" />
                        <p className="mt-3 max-w-full truncate px-4 text-sm font-medium text-foreground">{job.resume}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Click to preview the exported PDF
                        </p>
                      </button>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => setIsPreviewOpen(true)}>
                          <Eye className="size-3.5" /> Preview
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleOpenFolder(job.id)}>
                          <FolderOpen className="size-3.5" /> Open in Folder
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface-elevated/50 text-center">
                      <FileX className="size-8 text-muted-foreground" />
                      <p className="mt-3 text-sm font-medium text-foreground">No resume available</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Export a PDF from the resume editor to see it here
                      </p>
                    </div>
                  )}
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

            <ResumePreviewDialog
              applicationId={isPreviewOpen ? job.id : null}
              fileName={job.resume}
              onOpenChange={setIsPreviewOpen}
            />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
