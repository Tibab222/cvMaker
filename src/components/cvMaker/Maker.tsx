import { useState } from "react";
import { CVSelectionProvider } from "./provider/provider";
import CVTemplate from "./cvTemplate/cvTemplate";
import NewDialog from "./NewDialog";
import { CoverLetterProvider } from "./CoverLetterProvider/provider";
import CoverLetterTemplate from "./coverLetter/CoverLetterTemplate";
import { useKeyboardShortcut } from "@/hooks/use-keyboard-shortcut";
import EditorTopBar, { type EditorView } from "./editor/EditorTopBar";
import ContentSidebar from "./editor/ContentSidebar";
import PaperCanvas from "./editor/PaperCanvas";

/** The last panel open, kept between visits: people tend to come back to the same part. */
const PANEL_KEY = "cvEditor.panel";
const readPanel = (): string | null => {
    const saved = localStorage.getItem(PANEL_KEY);
    // first visit: start on the experiences, the part almost every resume needs
    if (saved === null) return "experience";
    return saved || null;
};

export default function Maker() {
    const [view, setView] = useState<EditorView>("resume");
    const [panel, setPanel] = useState<string | null>(readPanel);
    // the panel last open on the resume, to come back to it after the cover letter
    const [resumePanel, setResumePanel] = useState<string | null>(panel);

    const openPanel = (id: string | null) => {
        setPanel(id);
        if (view === "resume") {
            setResumePanel(id);
            localStorage.setItem(PANEL_KEY, id ?? "");
        }
    };

    const changeView = (next: EditorView) => {
        setView(next);
        // the cover letter only has the job panel
        setPanel(next === "resume" ? resumePanel : panel === "job" ? "job" : null);
    };

    useKeyboardShortcut("k", () => openPanel(panel ? null : (view === "resume" ? resumePanel ?? "experience" : "job")));

    return (
        <CVSelectionProvider>
            <CoverLetterProvider>
                <NewDialog defaultOpen={true} />
                <div className="flex h-full min-h-0 w-full flex-col bg-canvas">
                    <EditorTopBar view={view} onViewChange={changeView} />
                    <div className="flex min-h-0 flex-1">
                        <PaperCanvas>
                            {view === "coverLetter" ? <CoverLetterTemplate /> : <CVTemplate />}
                        </PaperCanvas>
                        <ContentSidebar view={view} active={panel} onActiveChange={openPanel} />
                    </div>
                </div>
            </CoverLetterProvider>
        </CVSelectionProvider>
    );
}
