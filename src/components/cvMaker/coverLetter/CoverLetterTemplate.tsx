// import useCoverLetterContext from "../CoverLetterProvider/hook";

import CoverLetterFooter from "./CoverFooter";
import CoverLetterHeader from "./CoverHeader";
import CoverLetterMeta from "./CoverMeta";

export default function CoverLetterTemplate() {
    // all infos required for the cover letter are pulled from the profileInfo in the CoverLetterProvider
    // const { profileInfo, coverLetter, setCoverLetter} = useCoverLetterContext();
    return (
        <div 
        id="cover-letter-content" 
        className="w-[210mm] min-h-[297mm] bg-white p-[15mm] relative text-slate-900 shadow-sm flex flex-col gap-3 font-sans antialiased"
        style={{ boxSizing: 'border-box' }}
        >
            <div>
                <CoverLetterHeader />
                <CoverLetterMeta />
                <div className="flex flex-col gap-3 my-4">
                    {/* TODO: Sort blocks by position and map over CoverLetterBlockItem */}
                    {/* blocks.sort((a,b) => a.position - b.position).map(b => <CoverLetterBlockItem key={b.id} block={b} />) */}
                </div>
            </div>

            <CoverLetterFooter />
        </div>
    )
}