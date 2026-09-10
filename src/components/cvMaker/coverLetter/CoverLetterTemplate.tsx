import useCoverLetterContext from "../CoverLetterProvider/hook";
import CoverLetterFooter from "./CoverFooter";
import CoverLetterHeader from "./CoverHeader";

export default function CoverLetterTemplate() {
    const { profileInfo } = useCoverLetterContext();
    // all infos required for the cover letter are pulled from the profileInfo in the CoverLetterProvider
    // const { profileInfo, coverLetter, setCoverLetter} = useCoverLetterContext();
    return (
        <div 
        id="cover-letter-content" 
        className="w-[210mm] min-h-[297mm] bg-white p-[15mm] relative text-slate-900 shadow-sm flex flex-col gap-3 font-sans antialiased"
        style={{ boxSizing: 'border-box' }}
        >
            <div>
                <CoverLetterHeader lang={profileInfo?.language} />
                <div className="flex flex-col gap-3 my-4">
                    {/* TODO: Sort blocks by position and map over CoverLetterBlockItem */}
                    {/* blocks.sort((a,b) => a.position - b.position).map(b => <CoverLetterBlockItem key={b.id} block={b} />) */}
                </div>
            </div>

            <CoverLetterFooter />

            <div className="absolute top-[297mm] left-0 w-full hidden-print border-t border-red-600">
                <span className="italic text-[8px] text-shadow-xs text-red-600/50 text-left">End of page</span>
            </div>
        </div>
    )
}