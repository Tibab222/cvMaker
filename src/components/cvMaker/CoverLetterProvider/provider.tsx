import type { CoverLetterData } from "@shared/CoverLetter.types";
import React from "react";
import { CoverLetterContext } from "./Context";
import type { Profile } from "@shared/profile.interface";
import { useProfileStore } from "@/store/profile";

export interface CoverLetterContextType {
  profileInfo: Profile | null;
  coverLetter: CoverLetterData | null;
  setCoverLetter: (coverLetter: CoverLetterData | null) => void;
}

export function CoverLetterProvider({ children }: { children: React.ReactNode }) {
    const [coverLetter, setCoverLetter] = React.useState<CoverLetterData | null>(null);
    const { profile } = useProfileStore();

    return (
        <CoverLetterContext.Provider value={{ coverLetter, setCoverLetter, profileInfo: profile }}>
            {children}
        </CoverLetterContext.Provider>
    );
}