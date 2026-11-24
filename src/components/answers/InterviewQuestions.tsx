import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { formatDistanceToNowStrict } from "date-fns";
import { Building2, Check, ChevronsUpDown, Download, FileSpreadsheet, FileText, FileType2, Lightbulb, Link2, Loader2, MessagesSquare, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import type { InterviewQuestion, InterviewQuestionDto, InterviewQuestionResult, LinkedApplication, QuestionsExportFormat, QuestionsExportResult } from "@shared/interviewQuestions.types";
import { MAX_INTERVIEW_ANSWER_LENGTH, MAX_INTERVIEW_QUESTION_LENGTH } from "@shared/interviewQuestions.types";
import { api } from "@/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";
import EmptyState from "../general/EmptyState";
import { STATUS_META } from "../dashboard/mapApplicationToJabCard";
import { applicationLabel, useApplications } from "./interviewQuestions.shared";

const rowMotion = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6, scale: 0.98 },
};

/** Filter values that are not an application id. */
const ALL = "__all__";
const UNLINKED = "__unlinked__";

/** The part of an application a question shows. */
type ApplicationLabel = Pick<LinkedApplication, "id" | "company_name" | "job_title" | "status">;

function edited(question: InterviewQuestion): string {
  const parsed = new Date(question.updated_at.includes("T") ? question.updated_at : `${question.updated_at.replace(" ", "T")}Z`);
  return Number.isNaN(parsed.getTime()) ? "" : formatDistanceToNowStrict(parsed, { addSuffix: true });
}

interface ApplicationPickerProps {
  applications: ApplicationLabel[];
  value: string[];
  onChange: (ids: string[]) => void;
}

/** Interviews a question was asked in: zero, one or more applications. */
function ApplicationPicker({ applications, value, onChange }: ApplicationPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = new Set(value);
  const byId = new Map(applications.map((application) => [application.id, application]));
  const words = query.trim().toLowerCase();
  const shown = words
    ? applications.filter((application) => applicationLabel(application).toLowerCase().includes(words))
    : applications;

  const toggle = (id: string) => onChange(selected.has(id) ? value.filter((other) => other !== id) : [...value, id]);

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {value.map((id) => {
            const application = byId.get(id);
            if (!application) return null;
            return (
              <li key={id}>
                <Badge variant="secondary" className="gap-1 py-0.5 pr-1 font-normal">
                  <Building2 className="size-3" />
                  <span className="max-w-64 truncate">{applicationLabel(application)}</span>
                  <button
                    type="button"
                    onClick={() => toggle(id)}
                    className="rounded-sm p-0.5 text-muted-foreground hover:bg-background hover:text-foreground"
                    aria-label={`Unlink ${applicationLabel(application)}`}
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              </li>
            );
          })}
        </ul>
      )}
      <Popover open={open} onOpenChange={(next) => { setOpen(next); if (!next) setQuery(""); }}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-xs" disabled={applications.length === 0}>
            <Link2 className="size-3.5" />
            {applications.length === 0 ? "No application to link yet" : value.length > 0 ? "Link another interview" : "Link an interview"}
            <ChevronsUpDown className="size-3.5 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 gap-2 p-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search a company or a position"
              className="h-8 pl-8 text-sm"
              aria-label="Search applications"
              autoFocus
            />
          </div>
          <ul className="max-h-64 space-y-0.5 overflow-y-auto">
            {shown.length === 0 ? (
              <li className="px-2 py-4 text-center text-xs text-muted-foreground">No application matches “{query.trim()}”.</li>
            ) : (
              shown.map((application) => (
                <li key={application.id}>
                  <label className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-muted">
                    <Checkbox checked={selected.has(application.id)} onCheckedChange={() => toggle(application.id)} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">{application.company_name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{application.job_title}</span>
                    </span>
                    <span className="shrink-0 text-[11px] text-muted-foreground">{STATUS_META[application.status]?.label}</span>
                  </label>
                </li>
              ))
            )}
          </ul>
        </PopoverContent>
      </Popover>
    </div>
  );
}

interface QuestionFormProps {
  initial: InterviewQuestionDto;
  applications: ApplicationLabel[];
  submitLabel: string;
  onSubmit: (dto: InterviewQuestionDto) => Promise<InterviewQuestionResult>;
  onCancel: () => void;
  /** Field to focus first: the answer when the user came to write it. */
  focus?: "question" | "answer";
}

/** Question, prepared answer and interviews, for a new question or an edited one. */
function QuestionForm({ initial, applications, submitLabel, onSubmit, onCancel, focus = "question" }: QuestionFormProps) {
  const [question, setQuestion] = useState(initial.question);
  const [answer, setAnswer] = useState(initial.answer);
  const [applicationIds, setApplicationIds] = useState(initial.applicationIds);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    setError(null);
    const result = await onSubmit({ question, answer, applicationIds });
    setSaving(false);
    if (!result.ok) setError(result.error);
  };
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) void submit();
  };

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground" htmlFor="interview-question">Question</label>
        <Textarea
          id="interview-question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          maxLength={MAX_INTERVIEW_QUESTION_LENGTH}
          rows={2}
          placeholder="Tell me about a time you disagreed with your manager."
          className="min-h-0 resize-none"
          autoFocus={focus === "question"}
          onKeyDown={onKeyDown}
        />
      </div>
      <div className="space-y-1.5">
        <label className="flex items-baseline justify-between text-xs font-medium text-muted-foreground" htmlFor="interview-answer">
          Prepared answer <span className="font-normal">optional</span>
        </label>
        <Textarea
          id="interview-answer"
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          maxLength={MAX_INTERVIEW_ANSWER_LENGTH}
          rows={answer.length > 240 ? 8 : 4}
          placeholder="The story you will tell, the points to hit, the numbers to remember… You can write it later."
          className="min-h-0 text-sm leading-relaxed"
          autoFocus={focus === "answer"}
          onKeyDown={onKeyDown}
        />
      </div>
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">Asked in these interviews</p>
        <ApplicationPicker applications={applications} value={applicationIds} onChange={setApplicationIds} />
      </div>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
          <X /> Cancel
        </Button>
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? <Loader2 className="animate-spin" /> : <Check />} {submitLabel}
        </Button>
      </div>
    </form>
  );
}

/** Long prepared answers are folded to a few lines. */
function PreparedAnswer({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const long = text.length > 320 || text.split("\n").length > 5;
  return (
    <div>
      <p className={cn("whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/85", long && !open && "line-clamp-4")}>{text}</p>
      {long && (
        <button type="button" onClick={() => setOpen((value) => !value)} className="mt-0.5 text-xs font-medium text-brand hover:underline">
          {open ? "Show less" : "Show the whole answer"}
        </button>
      )}
    </div>
  );
}

interface QuestionRowProps {
  question: InterviewQuestion;
  applications: ApplicationLabel[];
  onSaved: (question: InterviewQuestion) => void;
  onRemoved: (id: string) => void;
  onPickApplication: (id: string) => void;
}

function QuestionRow({ question, applications, onSaved, onRemoved, onPickApplication }: QuestionRowProps) {
  const [editing, setEditing] = useState<false | "question" | "answer">(false);
  const [confirming, setConfirming] = useState(false);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    if (!confirming) return;
    const timer = window.setTimeout(() => setConfirming(false), 3000);
    return () => window.clearTimeout(timer);
  }, [confirming]);

  const remove = async () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setRemoving(true);
    const removed = await api.interviewQuestions.remove(question.id).catch(() => false);
    setRemoving(false);
    if (removed) {
      onRemoved(question.id);
      toast.success("Question deleted.");
    } else toast.error("This question could not be deleted.");
  };

  const when = edited(question);

  return (
    <motion.li layout {...rowMotion} transition={{ duration: 0.24, ease: EASE_OUT }}>
      <Card className={cn("gap-0 rounded-xl border-border/60 px-4 py-3.5 shadow-xs transition-colors", editing && "border-brand/40")}>
        {editing ? (
          <QuestionForm
            initial={{ question: question.question, answer: question.answer, applicationIds: question.applications.map((application) => application.id) }}
            applications={applications}
            submitLabel="Save"
            focus={editing}
            onCancel={() => setEditing(false)}
            onSubmit={async (dto) => {
              const result = await api.interviewQuestions.update(question.id, dto);
              if (result.ok) {
                onSaved(result.question);
                setEditing(false);
                toast.success("Question saved.");
              }
              return result;
            }}
          />
        ) : (
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-sm font-medium leading-snug text-foreground">{question.question}</p>
              {question.answer ? (
                <PreparedAnswer text={question.answer} />
              ) : (
                <button
                  type="button"
                  onClick={() => setEditing("answer")}
                  className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-brand/50 hover:text-brand"
                >
                  <Pencil className="size-3" /> No answer prepared yet: write one
                </button>
              )}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-xs text-muted-foreground">
                {question.applications.map((application) => (
                  <button
                    key={application.id}
                    type="button"
                    onClick={() => onPickApplication(application.id)}
                    title={`Asked in your interview at ${application.company_name}: show the questions of this interview`}
                  >
                    <Badge variant="outline" className="gap-1 px-1.5 py-0 text-[11px] font-normal transition-colors hover:border-brand/50 hover:text-brand">
                      <Building2 className="size-3" />
                      <span className="max-w-56 truncate">{applicationLabel(application)}</span>
                    </Badge>
                  </button>
                ))}
                {when && <span className="ml-0.5">Edited {when}</span>}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button variant="ghost" size="icon" className="size-8" onClick={() => setEditing("question")} aria-label="Edit this question" title="Edit">
                <Pencil className="size-4" />
              </Button>
              <Button
                variant={confirming ? "destructive" : "ghost"}
                size={confirming ? "sm" : "icon"}
                className={cn(confirming ? "h-8" : "size-8")}
                onClick={() => void remove()}
                disabled={removing}
                aria-label={confirming ? "Confirm delete" : "Delete this question"}
                title="Delete"
              >
                {removing ? <Loader2 className="animate-spin" /> : <Trash2 className="size-4" />}
                {confirming && "Delete?"}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </motion.li>
  );
}

const EXPORT_FORMATS: { format: QuestionsExportFormat; label: string; hint: string; icon: typeof FileText }[] = [
  { format: "pdf", label: "PDF", hint: "A prep sheet to read or print before the interview", icon: FileText },
  { format: "docx", label: "Word", hint: "A document to rework and add to", icon: FileType2 },
  { format: "xlsx", label: "Excel", hint: "A table, one row per question", icon: FileSpreadsheet },
];

interface ExportMenuProps {
  questions: InterviewQuestion[];
  /** What the shown questions are, for the title and the file name; none for the whole library. */
  scope?: string;
}

/** Exports the questions shown (the filter and the search apply) to a PDF, Word or Excel file. */
function ExportMenu({ questions, scope }: ExportMenuProps) {
  const [exporting, setExporting] = useState<QuestionsExportFormat | null>(null);

  const run = async (format: QuestionsExportFormat) => {
    setExporting(format);
    const result = await api.interviewQuestions
      .export({ format, questionIds: questions.map((question) => question.id), scope })
      .catch((): QuestionsExportResult => ({ ok: false, error: "The questions could not be exported." }));
    setExporting(null);
    if (result.ok) {
      toast.success(`Exported to ${result.fileName}`, {
        action: { label: "Open", onClick: () => void api.interviewQuestions.openExport().then((opened) => { if (!opened) toast.error("The file could not be opened."); }) },
      });
    } else if (!result.cancelled) toast.error(result.error);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-1.5" disabled={questions.length === 0 || exporting !== null}>
          {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} Export to…
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          {questions.length} question{questions.length > 1 ? "s" : ""}{scope ? ` · ${scope}` : ""}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {EXPORT_FORMATS.map(({ format, label, hint, icon: Icon }) => (
          <DropdownMenuItem key={format} onSelect={() => void run(format)} className="items-start gap-2.5 py-1.5">
            <Icon className="mt-0.5 text-brand" />
            <span className="min-w-0">
              <span className="block font-medium">{label}</span>
              <span className="block text-xs text-muted-foreground">{hint}</span>
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface InterviewQuestionsPanelProps {
  /** The add form is open (the "Add a question" button lives in the page header). */
  adding: boolean;
  onAddingChange: (adding: boolean) => void;
}

/**
 * Interview questions library: questions recruiters could ask or did ask, the answers the user prepares for them, and
 * the interviews (applications) that asked them. A panel of the questions library.
 */
export default function InterviewQuestionsPanel({ adding, onAddingChange: setAdding }: InterviewQuestionsPanelProps) {
  const [questions, setQuestions] = useState<InterviewQuestion[] | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState(ALL);
  const applications = useApplications();

  const load = useCallback(
    () =>
      api.interviewQuestions.list().then(setQuestions).catch(() => {
        setQuestions((list) => list ?? []);
        toast.error("Your interview questions could not be read.");
      }),
    [],
  );

  useEffect(() => {
    void load();
    // an application renamed or deleted elsewhere: its links follow
    const offApplications = api.onApplicationsChanged(() => void load());
    const offQuestions = api.interviewQuestions.onChanged(() => void load());
    return () => {
      offApplications();
      offQuestions();
    };
  }, [load]);

  /** Applications some question is linked to, with how many questions, for the filter. */
  const linked = useMemo(() => {
    const counts = new Map<string, { application: LinkedApplication; count: number }>();
    for (const question of questions ?? []) {
      for (const application of question.applications) {
        const entry = counts.get(application.id) ?? { application, count: 0 };
        entry.count++;
        counts.set(application.id, entry);
      }
    }
    return [...counts.values()].sort((a, b) => a.application.company_name.localeCompare(b.application.company_name));
  }, [questions]);

  // the filtered application lost its last question (or was deleted): back to all
  const activeFilter = filter === ALL || filter === UNLINKED || linked.some((entry) => entry.application.id === filter) ? filter : ALL;

  const shown = useMemo(() => {
    const words = query.trim().toLowerCase();
    return (questions ?? []).filter((question) => {
      if (activeFilter === UNLINKED && question.applications.length > 0) return false;
      if (activeFilter !== ALL && activeFilter !== UNLINKED && !question.applications.some((application) => application.id === activeFilter)) return false;
      if (!words) return true;
      return [question.question, question.answer, ...question.applications.map(applicationLabel)].some((text) => text.toLowerCase().includes(words));
    });
  }, [questions, query, activeFilter]);

  const replace = (saved: InterviewQuestion) =>
    setQuestions((list) => [saved, ...(list ?? []).filter((question) => question.id !== saved.id)]);
  const drop = (id: string) => setQuestions((list) => list?.filter((question) => question.id !== id) ?? []);
  const unanswered = (questions ?? []).filter((question) => !question.answer).length;
  const filtered = shown.length !== (questions?.length ?? 0);
  const filteredApplication = linked.find((entry) => entry.application.id === activeFilter)?.application;
  const exportScope = filteredApplication
    ? applicationLabel(filteredApplication)
    : activeFilter === UNLINKED ? "not linked to an interview" : query.trim() ? `matching “${query.trim()}”` : undefined;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-surface/70 px-3.5 py-3 text-xs leading-relaxed text-muted-foreground">
        <Lightbulb className="mt-0.5 size-4 shrink-0 text-brand" />
        <p>
          Keep the questions you expect, and the ones you were really asked, with the answer you want to give. Link a question to
          the interviews that asked it: before the next round with that company, you see what came up, and the
          application shows them in its <span className="font-medium text-foreground">Notes & Prep</span> tab.
        </p>
      </div>

      <AnimatePresence initial={false}>
        {adding && (
          <motion.div key="add" {...rowMotion} transition={{ duration: 0.22, ease: EASE_OUT }}>
            <Card className="gap-0 rounded-xl border-brand/40 px-4 py-3.5">
              <QuestionForm
                initial={{
                  question: "",
                  answer: "",
                  // adding while looking at one interview's questions: the new one belongs to it too
                  applicationIds: activeFilter !== ALL && activeFilter !== UNLINKED ? [activeFilter] : [],
                }}
                applications={applications}
                submitLabel="Add"
                onCancel={() => setAdding(false)}
                onSubmit={async (dto) => {
                  const result = await api.interviewQuestions.add(dto);
                  if (result.ok) {
                    setQuestions((list) => [result.question, ...(list ?? [])]);
                    setAdding(false);
                    toast.success("Question added.");
                  }
                  return result;
                }}
              />
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {questions === null ? (
        <div className="flex justify-center py-16 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : questions.length === 0 && !adding ? (
        <EmptyState
          icon={MessagesSquare}
          title="No interview questions yet"
          description="Add the questions you were asked (or expect to be: “Why do you want to leave?”, “Your biggest failure?”) and prepare your answers before the next interview."
          action={
            <Button size="sm" variant="outline" onClick={() => setAdding(true)} className="gap-1.5">
              <Plus className="size-4" /> Add your first question
            </Button>
          }
        />
      ) : questions.length > 0 ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-48 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search a question, an answer or a company"
                className="pl-9"
                aria-label="Search interview questions"
              />
            </div>
            <Select value={activeFilter} onValueChange={setFilter}>
              <SelectTrigger className="w-full sm:w-56" aria-label="Filter by interview">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All interviews</SelectItem>
                <SelectItem value={UNLINKED}>Not linked to an interview</SelectItem>
                {linked.length > 0 && <SelectSeparator />}
                {linked.map(({ application, count }) => (
                  <SelectItem key={application.id} value={application.id}>
                    <span className="truncate">{applicationLabel(application)}</span>
                    <span className="text-muted-foreground">({count})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="shrink-0 text-xs text-muted-foreground">
              {filtered ? `${shown.length} of ${questions.length}` : `${questions.length} question${questions.length > 1 ? "s" : ""}`}
              {!filtered && unanswered > 0 && ` · ${unanswered} to prepare`}
            </span>
            <ExportMenu questions={shown} scope={exportScope} />
          </div>
          {shown.length === 0 ? (
            <div className="space-y-2 py-10 text-center text-sm text-muted-foreground">
              <p>{query.trim() ? `No interview question matches “${query.trim()}”.` : "No question here yet."}</p>
              {activeFilter !== ALL && (
                <Button variant="ghost" size="sm" onClick={() => setFilter(ALL)}>Show all the questions</Button>
              )}
            </div>
          ) : (
            <ul className="space-y-2.5">
              <AnimatePresence initial={false}>
                {shown.map((question) => (
                  <QuestionRow
                    key={question.id}
                    question={question}
                    applications={applications}
                    onSaved={replace}
                    onRemoved={drop}
                    onPickApplication={setFilter}
                  />
                ))}
              </AnimatePresence>
            </ul>
          )}
        </>
      ) : null}
    </div>
  );
}
