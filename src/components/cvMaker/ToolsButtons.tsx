import { Download, Save, SidebarClose, UserRound, UserRoundX } from "lucide-react";
import { Button } from "../ui/button";
import { exportToPdf } from "./cvTemplate/exportCV";
import { useState } from "react";
import { useCVSelection } from "./provider/hook";
import { useProfileStore } from "@/store/profile";

interface ToolsButtonsProps {
    openPicker: () => void;
    coverLetterActive?: boolean;
}

export default function ToolsButtons({ openPicker, coverLetterActive = false }: ToolsButtonsProps) {
    const [isExporting, setIsExporting] = useState(false);
    const { title, save, isSaving, includePhoto, setIncludePhoto } = useCVSelection();
    const hasPhoto = useProfileStore((state) => Boolean(state.profile?.photo));
    const handleExport = async () => {
        setIsExporting(true);
        exportToPdf(title).finally(() => setIsExporting(false));
    };
    
    return (
        <div className="absolute top-4 right-4 flex gap-2">
            {/* The photo only exists on the resume, so the toggle is hidden in the cover letter view */}
            {hasPhoto && !coverLetterActive && (
                <Button
                    variant={includePhoto ? "secondary" : "outline"}
                    onClick={() => setIncludePhoto(!includePhoto)}
                    aria-pressed={includePhoto}
                    title={includePhoto ? "Hide the photo on this resume" : "Show the photo on this resume"}
                >
                    {includePhoto ? <UserRound className="mr-2 h-4 w-4" /> : <UserRoundX className="mr-2 h-4 w-4" />}
                    Photo
                </Button>
            )}
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