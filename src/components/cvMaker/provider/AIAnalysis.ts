import type { AIAnalysisStatus } from "@shared/AIAnalysisStatus";

export interface AIAnalysis {
    rawMandate: string;
    jobTitle: string;
    focus: string;
    keywords: string[];
    status: AIAnalysisStatus;
    isCurrentJob: boolean;
}