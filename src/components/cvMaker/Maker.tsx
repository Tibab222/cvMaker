import { useState } from "react";
import { CVSelectionProvider } from "./provider/provider";
import CvPicker from "./cvPicker/CvPicker";
import CVTemplate from "./cvTemplate/cvTemplate";
import ResumeTitle from "./ResumeTitle";
import ToolsButtons from "./ToolsButtons";
import NewDialog from "./NewDialog";
import { CoverLetterProvider } from "./CoverLetterProvider/provider";
import CoverLetterTemplate from "./coverLetter/CoverLetterTemplate";
import { Button } from "../ui/button";
import { useKeyboardShortcut } from "@/hooks/use-keyboard-shortcut";
import CoverLetterButtons from "./coverLetter/CoverLetterButtons";

export default function Maker() {
    const [pickerOpen, setPickerOpen] = useState(false);
    const [coverLetterActive, setCoverLetterActive] = useState(false);

    useKeyboardShortcut("k", () => {
        setPickerOpen((prev) => !prev);
    });

    return (
        <CVSelectionProvider>
            <CoverLetterProvider>
                <NewDialog defaultOpen={true} />
                <div className="w-full flex flex-col h-full relative p-2">
                    <div className="m-auto w-full flex flex-row justify-start gap-5 items-baseline">
                        <ResumeTitle />
                        <div className="flex flex-row justify-center mt-4 mb-0 gap-2">
                            <Button onClick={() => setCoverLetterActive(!coverLetterActive)} className="rounded" variant="outline" disabled={!coverLetterActive}>
                                Resume
                            </Button>
                            <Button onClick={() => setCoverLetterActive(!coverLetterActive)} className="rounded" variant="outline" disabled={coverLetterActive}>
                                Cover Letter
                            </Button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-12 flex justify-center">
                        <div className="shadow-2xl">
                            {/* TODO: conditionally render the cover letter or the CV template */}
                            {coverLetterActive ? <CoverLetterTemplate /> : <CVTemplate />}
                        </div>
                    </div>
                    <ToolsButtons openPicker={() => setPickerOpen(true)} coverLetterActive={coverLetterActive} />
                    {pickerOpen && <CvPicker onClose={() => setPickerOpen(false)} />}
                    { coverLetterActive && <CoverLetterButtons />}
                </div>
            </CoverLetterProvider>
        </CVSelectionProvider>
    )
}