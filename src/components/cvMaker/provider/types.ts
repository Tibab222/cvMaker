import type { AIAnalysisStatus } from "@shared/AIAnalysisStatus";

export interface AIAnalysisState {
    status: AIAnalysisStatus;
    isCurrentJob: boolean;
    error?: string;
}