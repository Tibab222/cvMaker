import { useState } from "react";
import { Briefcase, Download, FileText, LoaderCircle, Mail, Save, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getModifierKeyLabel } from "@/hooks/use-keyboard-shortcut";
import { useUiStore } from "@/store/ui";
import { AIAnalysisStatus } from "@shared/AIAnalysisStatus";
import { useCVSelection } from "../provider/hook";
import useCoverLetterContext from "../CoverLetterProvider/hook";
import { exportToPdf } from "../cvTemplate/exportCV";
import { exportCoverLetterToPdf } from "../coverLetter/exportCoverLetter";
import TemplatePicker from "../cvTemplate/TemplatePicker";
import StatusMenu from "./StatusMenu";

export type EditorView = "resume" | "coverLetter";

/** Name of the resume, with the job it is made for under it. */
function TitleField() {
  const { title, setTitle, jobInfos } = useCVSelection();
  const job = [jobInfos?.title, jobInfos?.company].filter(Boolean).join(" · ");
  return (
    <div className="min-w-0 flex-1">
      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Untitled resume"
        aria-label="Resume name"
        title="Rename this resume"
        className="-ml-1.5 w-full max-w-md truncate rounded-md bg-transparent px-1.5 py-0.5 text-[15px] font-semibold tracking-tight outline-none transition-colors hover:bg-muted focus:bg-muted focus:ring-2 focus:ring-ring/40"
      />
      {job && (
        <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
          <Briefcase className="size-3 shrink-0" />
          <span className="truncate">{job}</span>
        </p>
      )}
    </div>
  );
}

function ViewSwitch({ view, onChange }: { view: EditorView; onChange: (view: EditorView) => void }) {
  const options = [
    { value: "resume" as const, label: "Resume", icon: FileText },
    { value: "coverLetter" as const, label: "Cover letter", icon: Mail },
  ];
  return (
    <div role="tablist" aria-label="Document" className="flex shrink-0 items-center rounded-full bg-muted p-1">
      {options.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          role="tab"
          aria-selected={view === value}
          onClick={() => onChange(value)}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-all",
            view === value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Icon className="size-4" />
          {label}
        </button>
      ))}
    </div>
  );
}

/** The AI action of the current document: rewrite the resume for the job, or write the cover letter. */
function AiButton({ view }: { view: EditorView }) {
  const { runAIRewrite, aiState } = useCVSelection();
  const { generateCoverLetter, isGenerating } = useCoverLetterContext();
  const isRewriting = aiState.status === AIAnalysisStatus.Rewriting;

  const resume = view === "resume";
  // a full job analysis is also running on the same AI, so nothing is started on top of it
  const busy = resume ? isRewriting || aiState.isCurrentJob : isGenerating;
  const working = resume ? isRewriting : isGenerating;
  const label = resume ? "AI rewrite" : "Write with AI";
  const hint = resume
    ? "Rewrite the resume texts to fit the job description"
    : "Write the cover letter from the job description and your resume";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline" onClick={resume ? runAIRewrite : generateCoverLetter} disabled={busy} className="gap-2">
          {working ? <LoaderCircle className="size-4 animate-spin" /> : resume ? <Wand2 className="size-4 text-brand" /> : <Sparkles className="size-4 text-brand" />}
          <span className="hidden xl:inline">{working ? (resume ? "Rewriting…" : "Writing…") : label}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{hint}</TooltipContent>
    </Tooltip>
  );
}

export default function EditorTopBar({ view, onViewChange }: { view: EditorView; onViewChange: (view: EditorView) => void }) {
  const { save, isSaving } = useCVSelection();
  const { coverLetter } = useCoverLetterContext();
  const { activeCvSessionId } = useUiStore();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = () => {
    setIsExporting(true);
    const exporting = view === "coverLetter"
      ? exportCoverLetterToPdf(coverLetter?.companyName, coverLetter?.roleName, activeCvSessionId || undefined)
      : exportToPdf(coverLetter?.companyName, coverLetter?.roleName, activeCvSessionId || undefined);
    exporting.finally(() => setIsExporting(false));
  };

  return (
    <header className="z-10 flex h-16 shrink-0 items-center gap-4 border-b bg-background/90 px-4 backdrop-blur">
      <TitleField />
      <ViewSwitch view={view} onChange={onViewChange} />
      <div className="flex flex-1 items-center justify-end gap-2">
        {view === "resume" && <TemplatePicker />}
        <StatusMenu />
        <div className="mx-1 h-6 w-px bg-border" />
        <AiButton view={view} />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" onClick={save} disabled={isSaving} className="gap-2">
              {isSaving ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
              <span className="hidden lg:inline">{isSaving ? "Saving…" : "Save"}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Save ({getModifierKeyLabel()}+S)</TooltipContent>
        </Tooltip>
        <Button onClick={handleExport} disabled={isExporting} className="gap-2 shadow-sm shadow-brand/20">
          {isExporting ? <LoaderCircle className="size-4 animate-spin" /> : <Download className="size-4" />}
          {isExporting ? "Exporting…" : "Export PDF"}
        </Button>
      </div>
    </header>
  );
}
