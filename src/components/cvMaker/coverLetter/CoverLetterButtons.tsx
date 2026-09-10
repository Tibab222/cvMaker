import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Sparkles } from "lucide-react";
import useCoverLetterContext from "../CoverLetterProvider/hook";
import { Spinner } from "@/components/ui/spinner";

export default function CoverLetterButtons() {
    const { generateCoverLetter, isGenerating } = useCoverLetterContext();
    return (
        <TooltipProvider>
            <div className="fixed bottom-4 right-4 flex gap-2">
                <Tooltip>
                    <TooltipTrigger>
                        <Button 
                            onClick={generateCoverLetter}
                            disabled={isGenerating}
                            className="group rounded-xl w-10 h-10 p-2 hover:bg-slate-100 hover:spin-out hover:text-primary"
                        >
                            {isGenerating ? (
                                <Spinner className="h-full w-full transition-transform" />
                            ) : (
                                <Sparkles className="h-full w-full transition-transform group-hover:animate-spin" />
                            )}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Generate Cover Letter</p>
                    </TooltipContent>
                </Tooltip>
            </div>
        </TooltipProvider>
    )
}