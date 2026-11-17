import type { AIAnalysisStatus } from "@shared/AIAnalysisStatus";
import type { selectedHeaderInfos } from "@shared/jobApplications.type";

export interface AIAnalysisState {
    status: AIAnalysisStatus;
    isCurrentJob: boolean;
    error?: string;
}

export const INITIAL_HEADER: selectedHeaderInfos = {
    title: undefined,
    mail: true,
    phone: true,
    portfolio: true,
    linkedin: true,
    github: true,
    twitter: false,
    instagram: false,
    tiktok: false,
    youtube: false,
    facebook: false,
    customLinks: {},
};