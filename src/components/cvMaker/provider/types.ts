import type { AIAnalysisStatus } from "@shared/AIAnalysisStatus";

export interface AIAnalysisState {
    status: AIAnalysisStatus;
    isCurrentJob: boolean;
    error?: string;
}

export interface JobInfos {
    title: string;
    company: string;
    url: string;
    description: string;
    focus?: string;
    keywords?: string[];
}