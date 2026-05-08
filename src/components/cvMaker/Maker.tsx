import { useState } from "react";
import { CVSelectionProvider } from "./provider/provider";
import CvPicker from "./cvPicker/CvPicker";
import { Button } from "../ui/button";
import { Download, SidebarClose } from "lucide-react";
import CVTemplate from "./cvTemplate/cvTemplate";
import { exportToPdf } from "./cvTemplate/exportCV";

export default function Maker() {
    const [pickerOpen, setPickerOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async () => {
        setIsExporting(true);
        exportToPdf().finally(() => setIsExporting(false));
    };

    return (
        <CVSelectionProvider>
            <div className="w-full flex flex-row h-full relative">
                <div className="flex-1 overflow-y-auto p-12 flex justify-center bg-zinc-200/50">
                    {/* On can ajouter un wrapper de zoom ici plus tard */}
                    <div className="shadow-2xl">
                        <CVTemplate />
                    </div>
                </div>
                <div className="absolute top-4 right-4 flex gap-2">
                    <Button 
                        variant="secondary" 
                        onClick={handleExport}
                        disabled={isExporting}
                    >
                        <Download className="mr-2 h-4 w-4" /> 
                        {isExporting ? "Generating..." : "Export PDF"}
                    </Button>
                    
                    <Button onClick={() => setPickerOpen(true)}>
                        <SidebarClose />
                    </Button>
                </div>
                {pickerOpen && <CvPicker onClose={() => setPickerOpen(false)} />}
            </div>
        </CVSelectionProvider>
    )
}