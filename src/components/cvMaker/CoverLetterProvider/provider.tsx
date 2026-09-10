import { type CoverLetterData, type GenerateCoverLetterDTO, COVER_LETTER_EVENTS } from "@shared/CoverLetter.types";
import React, { useEffect, useState } from "react";
import { CoverLetterContext } from "./Context";
import { Language, type Profile } from "@shared/profile.interface";
import { useProfileStore } from "@/store/profile";
import { api } from "@/api";
import { useCVSelection } from "../provider/hook";
import { toast } from "sonner";

export interface CoverLetterContextType {
  isGenerating: boolean;
  profileInfo: Profile | null;
  coverLetter: CoverLetterData | null;
  generateCoverLetter: () => void;
  setCoverLetter: (coverLetter: CoverLetterData) => void;
}

export function CoverLetterProvider({ children }: { children: React.ReactNode }) {
    const [coverLetter, setCoverLetter] = React.useState<CoverLetterData>({
        id: "",
        roleName: "",
        companyName: "",
        date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
        blocks: [],
        createdAt: new Date(),
        updatedAt: new Date(),
    });
    const { profile, experience, projects, education } = useProfileStore();
    const { selection, jobInfos } = useCVSelection();
    const [isGenerating, setIsGenerating] = useState(false);

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

    useEffect(() => {
        const unsubscribe = api.onCoverLetterStatusUpdate(({ status, message, data }) => {
            switch (status) {
                case COVER_LETTER_EVENTS.START: {
                    toast.info(message);
                    setIsGenerating(true);
                    setCoverLetter((prev) => ({
                        ...prev!,
                        blocks: [],
                    }));
                    break;
                }

                case COVER_LETTER_EVENTS.BLOCK_GENERATED: {
                    toast.info(message);
                    if (!data || !data.block) break;
                    setCoverLetter((prev) => ({
                        ...prev,
                        blocks: [...prev.blocks, data.block!],
                    }));
                    break;
                }

                case COVER_LETTER_EVENTS.COMPLETE: {
                    setIsGenerating(false);
                    toast.success(message);
                    break;
                }

                case COVER_LETTER_EVENTS.ERROR: {
                    setIsGenerating(false);
                    toast.error(message);
                    break;
                }
            }
        });
        return () => unsubscribe();
    }, []);

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
            setCoverLetter, 
            generateCoverLetter, 
            isGenerating, 
            coverLetter, 
            profileInfo: profile }}>
            {children}
        </CoverLetterContext.Provider>
    );
}