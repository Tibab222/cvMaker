import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { formatDistanceToNowStrict } from "date-fns";
import { Check, Globe, Loader2, MessageSquareText, Pencil, Plus, Search, ShieldCheck, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import type { SavedAnswer, SavedAnswerDto, SavedAnswerResult } from "@shared/answers.types";
import { MAX_ANSWER_LENGTH, MAX_QUESTION_LENGTH } from "@shared/answers.types";
import { api } from "@/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";
import EmptyState from "../general/EmptyState";

const rowMotion = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6, scale: 0.98 },
};

function lastUse(answer: SavedAnswer): string {
  const date = answer.last_used_at ?? answer.updated_at;
  const parsed = date ? new Date(date.includes("T") ? date : `${date.replace(" ", "T")}Z`) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? formatDistanceToNowStrict(parsed, { addSuffix: true }) : "";
}

interface AnswerFormProps {
  initial: SavedAnswerDto;
  /** Choices the question offered on the form: the answer is picked among them. */
  options?: string[];
  submitLabel: string;
  onSubmit: (dto: SavedAnswerDto) => Promise<SavedAnswerResult>;
  onCancel: () => void;
}

/** Question + answer, for a new answer or an edited one. */
function AnswerForm({ initial, options = [], submitLabel, onSubmit, onCancel }: AnswerFormProps) {
  const [question, setQuestion] = useState(initial.question);
  const [answer, setAnswer] = useState(initial.answer);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // the saved answer may not be one of the options any more (the user typed it in another form): keep it pickable
  const choices = options.length > 0 ? [...new Set([...options, ...(initial.answer ? [initial.answer] : [])])] : [];

  const submit = async () => {
    setSaving(true);
    setError(null);
    const result = await onSubmit({ question, answer });
    setSaving(false);
    if (!result.ok) setError(result.error);
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
        <label className="text-xs font-medium text-muted-foreground" htmlFor="answer-question">Question</label>
        <Textarea
          id="answer-question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          maxLength={MAX_QUESTION_LENGTH}
          rows={2}
          placeholder="Are you legally eligible to work in Canada?"
          className="min-h-0 resize-none"
          autoFocus
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground" htmlFor="answer-value">Answer</label>
        {choices.length > 0 ? (
          <Select value={answer} onValueChange={setAnswer}>
            <SelectTrigger id="answer-value" className="w-full">
              <SelectValue placeholder="Pick the answer" />
            </SelectTrigger>
            <SelectContent>
              {choices.map((choice) => (
                <SelectItem key={choice} value={choice}>{choice}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Textarea
            id="answer-value"
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            maxLength={MAX_ANSWER_LENGTH}
            rows={answer.length > 80 ? 4 : 2}
            placeholder="Yes"
            className="min-h-0"
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) void submit();
            }}
          />
        )}
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

interface AnswerRowProps {
  answer: SavedAnswer;
  onSaved: (answer: SavedAnswer) => void;
  onRemoved: (id: string) => void;
}

function AnswerRow({ answer, onSaved, onRemoved }: AnswerRowProps) {
  const [editing, setEditing] = useState(false);
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
    const removed = await api.answers.remove(answer.id).catch(() => false);
    setRemoving(false);
    if (removed) {
      onRemoved(answer.id);
      toast.success("Answer deleted. The extension will leave this question to you.");
    } else toast.error("This answer could not be deleted.");
  };

  const when = lastUse(answer);
  const uses = answer.uses === 0 ? "Added by you" : `Seen ${answer.uses} time${answer.uses > 1 ? "s" : ""}`;

  return (
    <motion.li layout {...rowMotion} transition={{ duration: 0.24, ease: EASE_OUT }}>
      <Card className={cn("gap-0 rounded-xl border-border/60 px-4 py-3.5 shadow-xs transition-colors", editing && "border-brand/40")}>
        {editing ? (
          <AnswerForm
            initial={{ question: answer.question, answer: answer.answer }}
            options={answer.kind === "choice" ? answer.options : []}
            submitLabel="Save"
            onCancel={() => setEditing(false)}
            onSubmit={async (dto) => {
              const result = await api.answers.update(answer.id, dto);
              if (result.ok) {
                onSaved(result.answer);
                setEditing(false);
                toast.success("Answer saved. The extension uses it on the next forms.");
              }
              return result;
            }}
          />
        ) : (
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1 space-y-1.5">
              <p className="text-sm font-medium leading-snug text-foreground">{answer.question}</p>
              <p className="whitespace-pre-wrap break-words text-sm text-brand">{answer.answer}</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5 text-xs text-muted-foreground">
                <span>{uses}{when ? ` · ${when}` : ""}</span>
                {answer.source_host && (
                  <span className="inline-flex min-w-0 items-center gap-1" title={`First answered on ${answer.source_host}`}>
                    <Globe className="size-3 shrink-0" />
                    <span className="truncate">{answer.source_host}</span>
                  </span>
                )}
                {answer.kind === "choice" && answer.options.length > 0 && (
                  <span className="flex flex-wrap items-center gap-1">
                    {answer.options.slice(0, 5).map((option) => (
                      <Badge key={option} variant="outline" className={cn("px-1.5 py-0 text-[11px] font-normal", option === answer.answer && "border-brand/50 text-brand")}>
                        {option}
                      </Badge>
                    ))}
                    {answer.options.length > 5 && <span>+{answer.options.length - 5}</span>}
                  </span>
                )}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button variant="ghost" size="icon" className="size-8" onClick={() => setEditing(true)} aria-label="Edit this answer" title="Edit">
                <Pencil className="size-4" />
              </Button>
              <Button
                variant={confirming ? "destructive" : "ghost"}
                size={confirming ? "sm" : "icon"}
                className={cn(confirming ? "h-8" : "size-8")}
                onClick={() => void remove()}
                disabled={removing}
                aria-label={confirming ? "Confirm delete" : "Delete this answer"}
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

interface SavedAnswersPanelProps {
  /** The add form is open (the "Add an answer" button lives in the page header). */
  adding: boolean;
  onAddingChange: (adding: boolean) => void;
}

/**
 * Answer bank: the answers given on application forms, kept by the browser extension and filled in again on the next
 * forms asking the same thing. Here the user checks them, corrects them, adds some, or deletes those to answer each time.
 * A panel of the questions library.
 */
export default function SavedAnswersPanel({ adding, onAddingChange: setAdding }: SavedAnswersPanelProps) {
  const [answers, setAnswers] = useState<SavedAnswer[] | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const load = () =>
      api.answers.list().then(setAnswers).catch(() => {
        setAnswers((list) => list ?? []);
        toast.error("Your saved answers could not be read.");
      });
    void load();
    // the extension keeps answers while the app is in the background: back to the window shows them
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const shown = useMemo(() => {
    const words = query.trim().toLowerCase();
    if (!answers || !words) return answers ?? [];
    return answers.filter((answer) => [answer.question, answer.answer, answer.source_host ?? ""].some((text) => text.toLowerCase().includes(words)));
  }, [answers, query]);

  const replace = (saved: SavedAnswer) => setAnswers((list) => list?.map((answer) => (answer.id === saved.id ? saved : answer)) ?? [saved]);
  const drop = (id: string) => setAnswers((list) => list?.filter((answer) => answer.id !== id) ?? []);

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-surface/70 px-3.5 py-3 text-xs leading-relaxed text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand" />
        <p>
          When you move on from a step of an application ("Next", "Submit"), the extension keeps your answers here.
          When you click <span className="font-medium text-foreground">Prefill the form</span>, it fills the questions you
          already answered, even when they are worded a little differently, and lists them so you can check them.
          Questions about identity (gender, origin, disability…), passwords and consents are never kept.
        </p>
      </div>

      <AnimatePresence initial={false}>
        {adding && (
          <motion.div key="add" {...rowMotion} transition={{ duration: 0.22, ease: EASE_OUT }}>
            <Card className="gap-0 rounded-xl border-brand/40 px-4 py-3.5">
              <AnswerForm
                initial={{ question: "", answer: "" }}
                submitLabel="Add"
                onCancel={() => setAdding(false)}
                onSubmit={async (dto) => {
                  const result = await api.answers.add(dto);
                  if (result.ok) {
                    setAnswers((list) => [result.answer, ...(list ?? [])]);
                    setAdding(false);
                    toast.success("Answer added.");
                  }
                  return result;
                }}
              />
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {answers === null ? (
        <div className="flex justify-center py-16 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : answers.length === 0 && !adding ? (
        <EmptyState
          icon={MessageSquareText}
          title="No saved answers yet"
          description="Apply somewhere with the browser extension on: the questions you answer (work permit, notice period, how you heard about the job…) show up here, ready for the next forms."
          action={
            <Button size="sm" variant="outline" onClick={() => setAdding(true)} className="gap-1.5">
              <Plus className="size-4" /> Add one yourself
            </Button>
          }
        />
      ) : answers.length > 0 ? (
        <>
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search a question, an answer or a site" className="pl-9" aria-label="Search saved answers" />
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">
              {shown.length === answers.length ? `${answers.length} answer${answers.length > 1 ? "s" : ""}` : `${shown.length} of ${answers.length}`}
            </span>
          </div>
          {shown.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No saved answer matches “{query.trim()}”.</p>
          ) : (
            <ul className="space-y-2.5">
              <AnimatePresence initial={false}>
                {shown.map((answer) => (
                  <AnswerRow key={answer.id} answer={answer} onSaved={replace} onRemoved={drop} />
                ))}
              </AnimatePresence>
            </ul>
          )}
        </>
      ) : null}
    </div>
  );
}
