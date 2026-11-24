import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Link2, Loader2, MessagesSquare, Plus } from "lucide-react";
import { toast } from "sonner";
import type { InterviewQuestion } from "@shared/interviewQuestions.types";
import { MAX_INTERVIEW_QUESTION_LENGTH } from "@shared/interviewQuestions.types";
import { api } from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listItem } from "@/lib/motion";

interface ApplicationInterviewQuestionsProps {
  applicationId: string;
  /** Opens the questions library, to write or polish the answers. */
  onOpenLibrary: () => void;
}

/**
 * The interview questions linked to one application, with their prepared answers, shown in its "Notes & Prep" tab.
 * A question asked in this interview is added (or picked from the library) right here.
 */
export default function ApplicationInterviewQuestions({ applicationId, onOpenLibrary }: ApplicationInterviewQuestionsProps) {
  const [all, setAll] = useState<InterviewQuestion[] | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = () => api.interviewQuestions.list()
      .then((list) => { if (!cancelled) setAll(list); })
      .catch(() => { if (!cancelled) setAll([]); });
    void load();
    const off = api.interviewQuestions.onChanged(() => void load());
    return () => {
      cancelled = true;
      off();
    };
  }, [applicationId]);

  const linked = useMemo(
    () => (all ?? []).filter((question) => question.applications.some((application) => application.id === applicationId)),
    [all, applicationId],
  );
  // library questions not linked yet that match what is being typed: linking one beats adding it twice
  const suggestions = useMemo(() => {
    const words = draft.trim().toLowerCase();
    if (words.length < 3) return [];
    return (all ?? [])
      .filter((question) => !question.applications.some((application) => application.id === applicationId))
      .filter((question) => question.question.toLowerCase().includes(words))
      .slice(0, 4);
  }, [all, draft, applicationId]);

  const replace = (saved: InterviewQuestion) =>
    setAll((list) => [saved, ...(list ?? []).filter((question) => question.id !== saved.id)]);

  const link = async (question: InterviewQuestion) => {
    setSaving(true);
    const result = await api.interviewQuestions.update(question.id, {
      question: question.question,
      answer: question.answer,
      applicationIds: [...question.applications.map((application) => application.id), applicationId],
    });
    setSaving(false);
    if (!result.ok) return toast.error(result.error);
    replace(result.question);
    setDraft("");
    toast.success("Question linked to this interview.");
  };

  const add = async () => {
    if (!draft.trim()) return;
    setSaving(true);
    const result = await api.interviewQuestions.add({ question: draft, answer: "", applicationIds: [applicationId] });
    setSaving(false);
    if (!result.ok) return toast.error(result.error);
    replace(result.question);
    setDraft("");
    toast.success("Question added to your library.");
  };

  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <MessagesSquare className="size-3.5 text-muted-foreground" /> Questions asked in this interview
        </p>
        <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs text-muted-foreground" onClick={onOpenLibrary}>
          Questions library <ArrowUpRight className="size-3.5" />
        </Button>
      </div>

      {all === null ? (
        <div className="flex justify-center py-4 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
        </div>
      ) : (
        <>
          {linked.length > 0 && (
            <ul className="space-y-1.5">
              <AnimatePresence initial={false}>
                {linked.map((question) => (
                  <motion.li key={question.id} variants={listItem} initial="hidden" animate="show" exit="exit" layout>
                    <details className="group rounded-lg border border-border/70 bg-surface-elevated">
                      <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-3 py-2 text-sm text-foreground">
                        <span className="min-w-0 flex-1 leading-snug">{question.question}</span>
                        <span className="shrink-0 pt-0.5 text-[11px] text-muted-foreground">
                          {question.answer ? <><span className="group-open:hidden">Answer</span><span className="hidden group-open:inline">Hide</span></> : "To prepare"}
                        </span>
                      </summary>
                      <p className="whitespace-pre-wrap break-words border-t border-border/60 px-3 py-2.5 text-sm leading-relaxed text-foreground/85">
                        {question.answer || <span className="text-muted-foreground">No answer prepared yet: write it in the questions library.</span>}
                      </p>
                    </details>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}

          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void add();
            }}
          >
            <Input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={MAX_INTERVIEW_QUESTION_LENGTH}
              placeholder={linked.length ? "Another question they asked…" : "A question they asked, or that you expect…"}
              className="h-8 bg-surface-elevated text-sm"
              aria-label="Add a question asked in this interview"
              disabled={saving}
            />
            <Button type="submit" size="sm" variant="outline" className="h-8 shrink-0" disabled={saving || draft.trim().length < 3}>
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />} Add
            </Button>
          </form>
          {suggestions.length > 0 && (
            <ul className="space-y-1">
              <li className="text-[11px] text-muted-foreground">Already in your library:</li>
              {suggestions.map((question) => (
                <li key={question.id}>
                  <button
                    type="button"
                    onClick={() => void link(question)}
                    disabled={saving}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs text-foreground/85 transition-colors hover:bg-muted"
                  >
                    <Link2 className="size-3 shrink-0 text-brand" />
                    <span className="truncate">{question.question}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
