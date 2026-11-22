import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { format, formatDistanceToNow, isFuture } from "date-fns";
import {
  Building2,
  CalendarClock,
  CalendarDays,
  Check,
  ExternalLink,
  Eye,
  FileText,
  FileX,
  FolderOpen,
  Ghost,
  Loader2,
  MessageSquareText,
  Pencil,
  Send,
  Trash2,
  UserRound,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/api";
import { TONE_CLASSES, type JobCard, type TimelineEvent } from "@/lib/dashboard-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn, relativeDay } from "@/lib/utils";
import { listItem } from "@/lib/motion";
import { ApplicationEventType, JobApplicationStatus } from "@shared/jobApplications.type";
import { useDashboard } from "./provider/hook";
import { mapApplicationWithEventsToJobCard, STATUS_META } from "./mapApplicationToJabCard";
import ResumePreviewDialog from "./ResumePreviewDialog";
import AddApplicationDialog from "./AddApplicationDialog";
import EmptyState from "../general/EmptyState";
import ApplicationInterviewQuestions from "../answers/ApplicationInterviewQuestions";
import { Tabs as AppTabs, useUiStore } from "@/store/ui";

const ALL_STATUSES = Object.values(JobApplicationStatus);

type ComposerKind = ApplicationEventType.NOTE_ADDED | ApplicationEventType.INTERVIEW_SCHEDULED | ApplicationEventType.FOLLOW_UP;

const COMPOSER_OPTIONS: { kind: ComposerKind; label: string; icon: typeof Pencil; placeholder: string }[] = [
  { kind: ApplicationEventType.NOTE_ADDED, label: "Note", icon: Pencil, placeholder: "What happened? A call, a feeling, a detail to remember…" },
  { kind: ApplicationEventType.INTERVIEW_SCHEDULED, label: "Interview", icon: CalendarClock, placeholder: "Round, people you'll meet, format (optional)" },
  { kind: ApplicationEventType.FOLLOW_UP, label: "Follow-up", icon: Send, placeholder: "How you followed up: email, LinkedIn… (optional)" },
];

const EVENT_STYLE: Record<ApplicationEventType, { icon: typeof Pencil; dot: string }> = {
  [ApplicationEventType.STATUS_CHANGE]: { icon: Check, dot: "bg-brand text-brand-foreground" },
  [ApplicationEventType.INTERVIEW_SCHEDULED]: { icon: CalendarClock, dot: "bg-amber-500 text-white" },
  [ApplicationEventType.FOLLOW_UP]: { icon: Send, dot: "bg-sky-500 text-white" },
  [ApplicationEventType.NOTE_ADDED]: { icon: MessageSquareText, dot: "bg-zinc-500 text-white" },
  [ApplicationEventType.DOCUMENT_EXPORTED]: { icon: FileText, dot: "bg-emerald-500 text-white" },
};

/** Value for <input type="datetime-local"> one day from now at 10:00, a sensible default for an interview. */
const defaultInterviewDate = () => {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  date.setHours(10, 0, 0, 0);
  return format(date, "yyyy-MM-dd'T'HH:mm");
};

function InfoTile({ icon: Icon, label, value, hint }: { icon: typeof Wallet; label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-border/70 bg-surface-elevated px-3 py-2">
      <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
        <Icon className="size-3" /> {label}
      </p>
      <p className="mt-0.5 truncate text-sm font-medium text-foreground" title={value}>{value}</p>
      {hint && <p className="truncate text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function TimelineItem({ event, onDelete }: { event: TimelineEvent; onDelete: (id: number) => void }) {
  const style = EVENT_STYLE[event.type] ?? EVENT_STYLE[ApplicationEventType.NOTE_ADDED];
  const Icon = style.icon;
  const upcoming = event.scheduledAt && isFuture(event.scheduledAt);

  return (
    <motion.li layout variants={listItem} initial="hidden" animate="show" exit="exit" className="group relative">
      <span className={cn("absolute -left-[2.15rem] top-0.5 flex size-6 items-center justify-center rounded-full ring-4 ring-background", style.dot)}>
        <Icon className="size-3" />
      </span>
      <div className={cn(
        "rounded-lg border px-3 py-2 transition-colors",
        upcoming ? "border-amber-500/40 bg-amber-500/8" : "border-transparent group-hover:border-border/70 group-hover:bg-surface-elevated",
      )}>
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-foreground">{event.label}</p>
          <div className="flex shrink-0 items-center gap-1">
            <span className="text-[11px] text-muted-foreground" title={event.at ? format(event.at, "PPpp") : undefined}>
              {event.at ? formatDistanceToNow(event.at, { addSuffix: true }) : ""}
            </span>
            {event.removable && (
              <button
                type="button"
                onClick={() => onDelete(event.id)}
                className="rounded p-0.5 text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                aria-label="Delete entry"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>
        {event.scheduledAt && (
          <p className={cn("mt-1 inline-flex items-center gap-1 text-xs font-medium", upcoming ? "text-amber-700" : "text-muted-foreground")}>
            <CalendarClock className="size-3" />
            {format(event.scheduledAt, "EEEE d MMMM, HH:mm")}
            {upcoming && <span className="font-normal">· {relativeDay(event.scheduledAt)}</span>}
          </p>
        )}
        {event.detail && <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{event.detail}</p>}
        {event.file && (
          <span className="mt-1.5 inline-flex max-w-full items-center gap-1.5 rounded-md border border-border/70 bg-background px-2 py-1 text-xs text-brand">
            <FileText className="size-3 shrink-0" />
            <span className="truncate">{event.file}</span>
          </span>
        )}
      </div>
    </motion.li>
  );
}

function Composer({ onSubmit }: { onSubmit: (kind: ComposerKind, text: string, date: string | null) => Promise<boolean> }) {
  const [kind, setKind] = useState<ComposerKind>(ApplicationEventType.NOTE_ADDED);
  const [text, setText] = useState("");
  const [date, setDate] = useState(defaultInterviewDate);
  const [busy, setBusy] = useState(false);
  const option = COMPOSER_OPTIONS.find((o) => o.kind === kind)!;
  const needsText = kind === ApplicationEventType.NOTE_ADDED;
  const canSubmit = !busy && (!needsText || text.trim().length > 0) && (kind !== ApplicationEventType.INTERVIEW_SCHEDULED || !!date);

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    const iso = kind === ApplicationEventType.INTERVIEW_SCHEDULED ? new Date(date).toISOString() : null;
    const ok = await onSubmit(kind, text, iso);
    setBusy(false);
    if (ok) {
      setText("");
      setDate(defaultInterviewDate());
    }
  };

  return (
    <div className="rounded-xl border border-border/70 bg-surface-elevated p-3 shadow-xs">
      <div className="relative mb-2 flex gap-1 rounded-lg bg-muted p-1">
        {COMPOSER_OPTIONS.map(({ kind: k, label, icon: Icon }) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={cn(
              "relative z-10 flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors",
              kind === k ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {kind === k && (
              <motion.span
                layoutId="composer-kind"
                className="absolute inset-0 -z-10 rounded-md bg-background shadow-sm"
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
            <Icon className="size-3.5" />
            {label}
          </button>
        ))}
      </div>

      <AnimatePresence initial={false}>
        {kind === ApplicationEventType.INTERVIEW_SCHEDULED && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <Input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mb-2 bg-background"
              aria-label="Interview date"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            void submit();
          }
        }}
        placeholder={option.placeholder}
        className="min-h-16 resize-none bg-background text-sm"
      />
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-[11px] text-muted-foreground">Ctrl + Enter to add</span>
        <Button size="sm" onClick={submit} disabled={!canSubmit}>
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <option.icon className="size-3.5" />}
          Add {option.label.toLowerCase()}
        </Button>
      </div>
    </div>
  );
}

function NotesPanel({ job }: { job: JobCard }) {
  const { updateDetails } = useDashboard();
  const [notes, setNotes] = useState(job.notes);
  const [contact, setContact] = useState(job.recruiterContact);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  // what the database holds, so "dirty" clears as soon as a save succeeds
  const [saved, setSaved] = useState({ notes: job.notes, contact: job.recruiterContact });
  const dirty = notes !== saved.notes || contact !== saved.contact;

  const save = useCallback(async () => {
    if (!dirty) return;
    setState("saving");
    const snapshot = { notes, contact };
    const ok = await updateDetails(job.id, { notes: snapshot.notes, recruiter_contact: snapshot.contact });
    if (ok) setSaved(snapshot);
    setState(ok ? "saved" : "idle");
  }, [contact, dirty, job.id, notes, updateDetails]);

  // autosave a moment after the user stops typing
  useEffect(() => {
    if (!dirty) return;
    const timer = window.setTimeout(() => void save(), 900);
    return () => window.clearTimeout(timer);
  }, [dirty, save]);

  useEffect(() => {
    if (state !== "saved") return;
    const timer = window.setTimeout(() => setState("idle"), 1600);
    return () => window.clearTimeout(timer);
  }, [state]);

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-foreground" htmlFor="recruiter-contact">
          <UserRound className="size-3.5 text-muted-foreground" /> Recruiter contact
        </label>
        <Input
          id="recruiter-contact"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          onBlur={() => void save()}
          placeholder="Name, email, phone…"
          className="bg-surface-elevated"
        />
      </div>
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="flex items-center gap-1.5 text-sm font-medium text-foreground" htmlFor="prep-notes">
            <Pencil className="size-3.5 text-muted-foreground" /> Notes & interview prep
          </label>
          <AnimatePresence mode="wait">
            {state !== "idle" && (
              <motion.span
                key={state}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"
              >
                {state === "saving" ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3 text-emerald-600" />}
                {state === "saving" ? "Saving…" : "Saved"}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <Textarea
          id="prep-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => void save()}
          placeholder={"Questions to ask, salary expectations, what you know about the team…"}
          className="min-h-56 bg-surface-elevated text-sm leading-relaxed"
        />
      </div>
      {job.description && (
        <details className="group rounded-lg border border-border/70 bg-surface-elevated">
          <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-sm font-medium text-foreground">
            The offer
            <span className="text-xs font-normal text-muted-foreground group-open:hidden">Show</span>
            <span className="hidden text-xs font-normal text-muted-foreground group-open:inline">Hide</span>
          </summary>
          <p className="max-h-72 overflow-y-auto whitespace-pre-line border-t border-border/60 px-3 py-2.5 text-sm leading-relaxed text-foreground/90">{job.description}</p>
        </details>
      )}
      {job.stack.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Keywords to prepare</p>
          <div className="flex flex-wrap gap-1.5">
            {job.stack.map((tag) => (
              <Badge key={tag} variant="secondary">{tag}</Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function JobDrawer() {
  const {
    selectedApplicationId,
    openApplication,
    getApplicationInfos,
    deleteApplication,
    updateApplicationStatus,
    addEvent,
    deleteEvent,
    revision,
    silentApplications,
    markNoResponse,
    applications,
  } = useDashboard();
  const [job, setJob] = useState<JobCard | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  // id of the application waiting for the second "delete" click, so the confirmation never leaks to another card
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const setSelectedTab = useUiStore((state) => state.setSelectedTab);

  const openQuestionsLibrary = () => {
    openApplication(null);
    setSelectedTab(AppTabs.QUESTIONS_LIBRARY);
  };

  useEffect(() => {
    let cancelled = false;
    if (!selectedApplicationId) {
      return;
    }
    getApplicationInfos(selectedApplicationId).then((details) => {
      if (!cancelled) setJob(details ? mapApplicationWithEventsToJobCard(details) : null);
    });
    return () => {
      cancelled = true;
    };
  }, [getApplicationInfos, selectedApplicationId, revision]);

  const isOpen = !!selectedApplicationId;
  const isLoading = isOpen && (!job || job.id !== selectedApplicationId);
  const confirmDelete = !!job && confirmDeleteId === job.id;
  const silent = job ? silentApplications.find((app) => app.id === job.id) : undefined;
  const application = job ? applications.find((app) => app.id === job.id) ?? null : null;

  const handleDelete = async () => {
    if (!job) return;
    if (!confirmDelete) {
      setConfirmDeleteId(job.id);
      return;
    }
    setIsDeleting(true);
    try {
      await deleteApplication(job.id);
    } finally {
      setIsDeleting(false);
      setConfirmDeleteId(null);
    }
  };

  const handleOpenFolder = async (applicationId: string) => {
    const opened = await api.openResumeFolder(applicationId);
    if (!opened) toast.error("Resume file not found. It may have been moved or deleted.");
  };

  const upcomingInterview = job?.timeline
    .filter((e) => e.type === ApplicationEventType.INTERVIEW_SCHEDULED && e.scheduledAt && isFuture(e.scheduledAt))
    .sort((a, b) => a.scheduledAt!.getTime() - b.scheduledAt!.getTime())[0];

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && openApplication(null)}>
      <SheetContent
        side="right"
        // the sheet's own data-[side=right] width classes are more specific than plain sm:max-w-*, so match them
        className="flex flex-col gap-0 border-border/70 bg-background/95 p-0 text-foreground backdrop-blur-xl data-[side=right]:w-full data-[side=right]:sm:max-w-xl"
      >
        {isLoading || !job ? (
          <div className="flex h-full w-full flex-col gap-4 p-6">
            <SheetTitle className="sr-only">Loading application</SheetTitle>
            <div className="flex items-center gap-3">
              <div className="size-12 animate-pulse rounded-xl bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />)}
            </div>
            <div className="h-40 animate-pulse rounded-xl bg-muted" />
          </div>
        ) : (
          <>
            <SheetHeader className="gap-4 border-b border-border/70 p-6 pr-12">
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-3"
              >
                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-violet-400 text-sm font-semibold text-brand-foreground shadow-sm shadow-brand/30">
                  {job.logo}
                </div>
                <div className="min-w-0 flex-1">
                  <SheetTitle className="text-lg leading-tight">{job.title}</SheetTitle>
                  <SheetDescription className="mt-1 flex items-center gap-1 text-sm">
                    <Building2 className="size-3.5" />
                    {job.company}
                  </SheetDescription>
                </div>
              </motion.div>

              <div className="flex flex-wrap items-center gap-2">
                <Select value={job.status} onValueChange={(value) => void updateApplicationStatus(job.id, value as JobApplicationStatus)}>
                  <SelectTrigger
                    size="sm"
                    className={cn("h-8 w-auto gap-2 rounded-full border-0 px-3 text-xs font-medium ring-1 ring-inset", TONE_CLASSES[job.tone])}
                    aria-label="Application status"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>{STATUS_META[status].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {job.url && (
                  <Button asChild variant="outline" size="sm" className="h-8 rounded-full">
                    <a href={job.url} target="_blank" rel="noreferrer">
                      <ExternalLink className="size-3.5" /> Job posting
                    </a>
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-full"
                  onClick={() => setIsEditing(true)}
                  disabled={!application}
                  title="Fix the company, the position, the link…"
                >
                  <Pencil className="size-3.5" /> Edit
                </Button>
                <Button
                  variant={confirmDelete ? "destructive" : "ghost"}
                  size="sm"
                  className="ml-auto h-8 rounded-full text-muted-foreground hover:text-destructive data-[confirm=true]:text-white"
                  data-confirm={confirmDelete}
                  onClick={handleDelete}
                  onBlur={() => setConfirmDeleteId(null)}
                  disabled={isDeleting}
                  aria-label="Delete application"
                >
                  {isDeleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                  {confirmDelete ? "Click again to delete" : "Delete"}
                </Button>
              </div>

              {silent && job.status === JobApplicationStatus.APPLIED && (
                <div className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2.5">
                  <Ghost className="size-4 shrink-0 text-muted-foreground" />
                  <p className="min-w-0 flex-1 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">No sign of life for {silent.days} days.</span> Followed up or heard back? Log it below.
                    Otherwise it is probably a no.
                  </p>
                  <Button size="sm" variant="outline" className="h-7 shrink-0 text-xs" onClick={() => void markNoResponse([job.id])}>
                    Close as No response
                  </Button>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2">
                <InfoTile
                  icon={CalendarDays}
                  label="Applied"
                  value={job.appliedAt ? format(job.appliedAt, "d MMM yyyy") : "Not yet"}
                  hint={job.appliedAt ? `${formatDistanceToNow(job.appliedAt, { addSuffix: true })}${job.channel ? ` · via ${job.channel}` : ""}` : job.channel ? `via ${job.channel}` : undefined}
                />
                <InfoTile icon={Wallet} label="Salary" value={job.salary || "Not set"} />
                <InfoTile
                  icon={upcomingInterview ? CalendarClock : UserRound}
                  label={upcomingInterview ? "Next interview" : "Recruiter"}
                  value={upcomingInterview?.scheduledAt ? format(upcomingInterview.scheduledAt, "d MMM, HH:mm") : job.recruiterContact || "Not set"}
                  hint={upcomingInterview?.scheduledAt ? relativeDay(upcomingInterview.scheduledAt) : undefined}
                />
              </div>
            </SheetHeader>

            <Tabs defaultValue="timeline" className="flex min-h-0 flex-1 flex-col gap-0">
              <div className="px-6 pt-4">
                <TabsList className="w-full">
                  <TabsTrigger value="timeline" className="flex-1">Timeline</TabsTrigger>
                  <TabsTrigger value="notes" className="flex-1">Notes & Prep</TabsTrigger>
                  <TabsTrigger value="documents" className="flex-1">Documents</TabsTrigger>
                </TabsList>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-6">
                <TabsContent value="timeline" className="mt-0 space-y-6">
                  <Composer
                    onSubmit={(kind, text, date) => addEvent(job.id, { event_type: kind, description: text, scheduled_at: date })}
                  />
                  <ol className="relative ml-3 space-y-3 border-l border-border/70 pl-6">
                    <AnimatePresence initial={false}>
                      {job.timeline.map((event) => (
                        <TimelineItem key={event.id} event={event} onDelete={(id) => void deleteEvent(id)} />
                      ))}
                    </AnimatePresence>
                  </ol>
                </TabsContent>

                <TabsContent value="notes" className="mt-0 space-y-6">
                  <NotesPanel key={job.id} job={job} />
                  <ApplicationInterviewQuestions key={`questions-${job.id}`} applicationId={job.id} onOpenLibrary={openQuestionsLibrary} />
                </TabsContent>

                <TabsContent value="documents" className="mt-0 space-y-4">
                  {job.resume ? (
                    <>
                      <motion.button
                        type="button"
                        whileHover={{ y: -2 }}
                        onClick={() => setIsPreviewOpen(true)}
                        className="group flex h-56 w-full flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface-elevated text-center transition-colors hover:border-brand/50"
                      >
                        <span className="flex size-12 items-center justify-center rounded-xl bg-brand-muted text-brand transition-transform group-hover:scale-110">
                          <FileText className="size-6" />
                        </span>
                        <p className="mt-3 max-w-full truncate px-4 text-sm font-medium text-foreground">{job.resume}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Click to preview the exported resume</p>
                      </motion.button>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => setIsPreviewOpen(true)}>
                          <Eye className="size-3.5" /> Preview
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleOpenFolder(job.id)}>
                          <FolderOpen className="size-3.5" /> Show in folder
                        </Button>
                      </div>
                    </>
                  ) : (
                    <EmptyState
                      icon={FileX}
                      title="No resume exported yet"
                      description={job.hasResumeSession ? "Export a PDF from the resume editor and it will show up here." : "Sent outside CVMaker: no resume made in the app for this one."}
                    />
                  )}
                  {job.coverLetter && (
                    <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-surface-elevated px-3 py-2 text-sm">
                      <FileText className="size-4 text-emerald-600" />
                      <span className="truncate">{job.coverLetter}</span>
                      <span className="ml-auto text-xs text-muted-foreground">Cover letter</span>
                    </div>
                  )}
                </TabsContent>
              </div>
            </Tabs>

            <AddApplicationDialog open={isEditing && !!application} onOpenChange={setIsEditing} application={application} />
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
