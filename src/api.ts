import type { AIAnalysisStatus } from "@shared/AIAnalysisStatus";
import type { Experience } from "@shared/Experience.interface";
import type { Language } from "@shared/profile.interface";
import type { ProfilesData } from "@shared/profilesData.interface";
import type { Project } from "@shared/projects.interface";

export const api = {
    minimize: () => window.api.minimize(),
    maximize: () => window.api.maximize(),
    close: () => window.api.close(),
    getProfilesList: async () => await window.api.getProfilesList(),
    addProfile: async (firstname: string, lastname: string, language: Language) => await window.api.addProfile(firstname, lastname, language),
    loadProfile: async (id: string) => await window.api.loadProfile(id),
    checkMistral: async () => await window.api.checkMistral(),
    updateSection: async (id: string, section: keyof ProfilesData, newData: ProfilesData[keyof ProfilesData]) => await window.api.updateSection(id, section, newData),
    generatePDF: async (html: string, fileName: string) => await window.api.generatePDF(html, fileName),
    syncDb: async (profileId: string, experiences: Experience[], projects: Project[]) => await window.api.syncDb(profileId, experiences, projects),
    analyseMandate: async (rawMandate: string, language: Language, useAi: boolean) => await window.api.analyseMandate(rawMandate, language, useAi),
    onAnalysisStatus: (callback: (data: { status: AIAnalysisStatus; message?: string; data?: unknown }) => void) => window.api.onAnalysisStatus(callback),
    reduceKeywordCount: (keyword: string, amount?: number) => window.api.reduceKeywordCount(keyword, amount),
    getOllamaInfos: async () => await window.api.getOllamaInfos(),
    detectOllama: async (uri: string) => await window.api.detectOllama(uri),
    getAvailableOllamaModels: async () => await window.api.getAvailableOllamaModels(),
    setPreferredOllamaModel: async (modelName: string) => await window.api.setPreferredOllamaModel(modelName),
}