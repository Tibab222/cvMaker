import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageSquareText, MessagesSquare, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EASE_OUT } from "@/lib/motion";
import PageHeader from "../general/PageHeader";
import InterviewQuestionsPanel from "./InterviewQuestions";
import SavedAnswersPanel from "./SavedAnswers";

type Panel = "interview" | "answers";

const PANELS: Record<Panel, { description: string; add: string }> = {
  interview: {
    description: "Questions asked in interviews, and the answers you prepare for them.",
    add: "Add a question",
  },
  answers: {
    description: "What you answered on application forms. The extension fills it in when another form asks the same.",
    add: "Add an answer",
  },
};

/**
 * Questions library: interview questions with prepared answers (shown first), and the answers given on application
 * forms that the browser extension fills in again.
 */
export default function QuestionsLibrary() {
  const [panel, setPanel] = useState<Panel>("interview");
  // each panel keeps its own add form, so switching panels never loses a half-written question
  const [adding, setAdding] = useState<Record<Panel, boolean>>({ interview: false, answers: false });
  const setPanelAdding = (which: Panel) => (value: boolean) => setAdding((current) => ({ ...current, [which]: value }));

  return (
    <div className="min-h-full">
      <PageHeader
        title="Questions library"
        icon={MessagesSquare}
        description={PANELS[panel].description}
        actions={
          <Button size="sm" onClick={() => setPanelAdding(panel)(true)} disabled={adding[panel]} className="gap-1.5">
            <Plus className="size-4" /> {PANELS[panel].add}
          </Button>
        }
      />

      <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6 md:px-6">
        <Tabs value={panel} onValueChange={(value) => setPanel(value as Panel)}>
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="interview" className="gap-1.5 px-3">
              <MessagesSquare /> Interview questions
            </TabsTrigger>
            <TabsTrigger value="answers" className="gap-1.5 px-3">
              <MessageSquareText /> Saved answers
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={panel}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: EASE_OUT }}
          >
            {panel === "interview" ? (
              <InterviewQuestionsPanel adding={adding.interview} onAddingChange={setPanelAdding("interview")} />
            ) : (
              <SavedAnswersPanel adding={adding.answers} onAddingChange={setPanelAdding("answers")} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
