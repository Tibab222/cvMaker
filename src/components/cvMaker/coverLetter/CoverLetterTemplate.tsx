import { Sparkles } from "lucide-react";
import useCoverLetterContext from "../CoverLetterProvider/hook";
import { TemplateSkeleton } from "../cvTemplate/templateFields/TemplateSkeleton";
import CoverLetterBlockItem from "./CoverBlockItem";
import CoverLetterFooter from "./CoverFooter";
import CoverLetterHeader from "./CoverHeader";

export default function CoverLetterTemplate() {
    const { profileInfo, coverLetter, isGenerating } = useCoverLetterContext();
    return (
        <div 
        id="cover-letter-content" 
        className="w-[210mm] min-h-[297mm] bg-white p-[15mm] relative text-slate-900 shadow-sm flex flex-col gap-3 font-sans antialiased"
        style={{ boxSizing: 'border-box' }}
        >
            <div>
                <CoverLetterHeader lang={profileInfo?.language} />
                <div className="flex flex-col gap-3 my-4">
                    {
                        coverLetter?.blocks
                        .sort((a, b) => a.position - b.position)
                        .map((block) => (
                            <CoverLetterBlockItem key={block.id} block={block} />
                        ))
                    }
                    {
                        isGenerating && (
                            <div className="flex items-center gap-2 py-0.5">
                                <Sparkles size={13} className="animate-spin text-amber-500 shrink-0" />
                                <TemplateSkeleton lines={3} />
                            </div>
                        )
                    }
                </div>
            </div>

            <CoverLetterFooter />

            <div className="absolute top-[297mm] left-0 w-full hidden-print border-t border-red-600">
                <span className="italic text-[8px] text-shadow-xs text-red-600/50 text-left">End of page</span>
            </div>
        </div>
    )
}