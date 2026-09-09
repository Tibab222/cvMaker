import type { CoverLetterData, GenerateCoverLetterDTO } from "@shared/CoverLetter.types";
import React, { useEffect } from "react";
import { CoverLetterContext } from "./Context";
import { Language, type Profile } from "@shared/profile.interface";
import { useProfileStore } from "@/store/profile";
import { api } from "@/api";
import { useCVSelection } from "../provider/hook";

export interface CoverLetterContextType {
  profileInfo: Profile | null;
  coverLetter: CoverLetterData | null;
  generateCoverLetter: () => void;
  setCoverLetter: (coverLetter: CoverLetterData | null) => void;
}

export function CoverLetterProvider({ children }: { children: React.ReactNode }) {
    const [coverLetter, setCoverLetter] = React.useState<CoverLetterData | null>(null);
    const { profile, experience, projects, education } = useProfileStore();
    const { selection, jobInfos } = useCVSelection();

    useEffect(() => {
        const updateCoverLetter = () => {
            setCoverLetter((prev) => {
                return {
                    id: prev?.id || crypto.randomUUID(),
                    roleName: jobInfos?.title || prev?.roleName || "",
                    companyName: jobInfos?.company || prev?.companyName || "",
                    date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
                    blocks: prev?.blocks || [],
                    createdAt: prev?.createdAt || new Date(),
                    updatedAt: new Date(),
                }
            })
        }
        updateCoverLetter();
    }, [jobInfos?.company, jobInfos?.title]);

    const generateCoverLetter = () => {
        const selectedExps = experience.filter(exp => selection.selectedExpIds.includes(exp.id));
        const selectedProjects = projects.filter(proj => selection.selectedProjectIds.includes(proj.id));
        const selectedEducation = education.filter(edu => selection.selectedEducationIds.includes(edu.id));
        const dto: GenerateCoverLetterDTO = {
            coverLetterData: coverLetter!,
            experiences: selectedExps,
            projects: selectedProjects,
            education: selectedEducation,
            targetKeywords: jobInfos?.keywords || [],
            language: profile?.language || Language.ENGLISH
        }
        api.generateCoverLetter(dto)
    };

    return (
        <CoverLetterContext.Provider value={{ 
            generateCoverLetter, coverLetter, setCoverLetter, profileInfo: profile }}>
            {children}
        </CoverLetterContext.Provider>
    );
}