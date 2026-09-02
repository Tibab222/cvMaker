import { useState } from "react";
import { CVSelectionProvider } from "./provider/provider";
import CvPicker from "./cvPicker/CvPicker";
import CVTemplate from "./cvTemplate/cvTemplate";
import ResumeTitle from "./ResumeTitle";
import ToolsButtons from "./ToolsButtons";

export default function Maker() {
    const [pickerOpen, setPickerOpen] = useState(false);

    return (
        <CVSelectionProvider>
            <div className="w-full flex flex-col h-full relative p-2">
                <div className="m-auto w-full">
                    <ResumeTitle />
                </div>
                <div className="flex-1 overflow-y-auto p-12 flex justify-center">
                    {/* On peut ajouter un wrapper de zoom ici plus tard */}
                    <div className="shadow-2xl">
                        <CVTemplate />
                    </div>
                </div>
                <ToolsButtons openPicker={() => setPickerOpen(true)} />
                {pickerOpen && <CvPicker onClose={() => setPickerOpen(false)} />}
            </div>
        </CVSelectionProvider>
    )
}