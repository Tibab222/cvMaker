import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Wand2 } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { AIAnalysisStatus } from "@shared/AIAnalysisStatus";
import { useCVSelection } from "../provider/hook";

export default function ResumeTools() {
    const { runAIRewrite, aiState } = useCVSelection();
    const isRewriting = aiState.status === AIAnalysisStatus.Rewriting;
    // a full mandate analysis is also running on the same AI, so don't start a rewrite on top of it
    const isBusy = isRewriting || aiState.isCurrentJob;

    return (
        <TooltipProvider>
            <div className="fixed bottom-4 right-4 flex gap-2">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span>
                            <Button
                                onClick={runAIRewrite}
                                disabled={isBusy}
                                aria-label="Rewrite Resume"
                                className="group rounded-xl w-10 h-10 p-2 hover:bg-slate-100 hover:text-primary"
                            >
                                {isRewriting ? (
                                    <Spinner className="h-full w-full transition-transform" />
                                ) : (
                                    <Wand2 className="h-full w-full transition-transform group-hover:rotate-12" />
                                )}
                            </Button>
                        </span>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{isRewriting ? "Rewriting resume..." : "Rewrite Resume"}</p>
                    </TooltipContent>
                </Tooltip>
            </div>
        </TooltipProvider>
    )
}
