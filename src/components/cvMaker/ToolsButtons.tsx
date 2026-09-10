import { Download, Save, SidebarClose } from "lucide-react";
import { Button } from "../ui/button";
import { exportToPdf } from "./cvTemplate/exportCV";
import { exportCoverLetterToPdf } from "./coverLetter/exportCoverLetter";
import { useState } from "react";
import { useCVSelection } from "./provider/hook";
import useCoverLetterContext from "./CoverLetterProvider/hook";
import { useUiStore } from "@/store/ui";

interface ToolsButtonsProps {
    openPicker: () => void;
    coverLetterActive?: boolean;
}

export default function ToolsButtons({ openPicker, coverLetterActive = false }: ToolsButtonsProps) {
    const [isExporting, setIsExporting] = useState(false);
    const { save, isSaving } = useCVSelection();
    const { coverLetter } = useCoverLetterContext();
    const { activeCvSessionId } = useUiStore()

    const handleExport = async () => {
        setIsExporting(true);
        const exporting = coverLetterActive
            ? exportCoverLetterToPdf(coverLetter?.companyName, coverLetter?.roleName, activeCvSessionId || undefined)
            : exportToPdf(coverLetter?.companyName, coverLetter?.roleName, activeCvSessionId || undefined);
        exporting.finally(() => setIsExporting(false));
    };
    
    return (
        <div className="absolute top-4 right-4 flex gap-2">
            <Button 
                variant="secondary" 
                className="bg-primary/70 hover:bg-green-700 text-primary-foreground/90 transition-all duration-200 transform hover:scale-105"
                onClick={save}
                disabled={isSaving}
            >
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Saving..." : "Save"}
            </Button>
            <Button 
                variant="secondary" 
                onClick={handleExport}
                disabled={isExporting}
            >
                <Download className="mr-2 h-4 w-4" /> 
                {isExporting ? "Generating..." : "Export PDF"}
            </Button>
            
            <Button onClick={openPicker}>
                <SidebarClose />
            </Button>
        </div>
    )
}
