import { ProfilesData } from '../shared/profilesData.interface';
import { UserConfig } from '../electron/services/config/UserConfig.interface';
import { SystemRecommendations } from '../shared/SystemRecommendation';
import { OnProgressCallback } from '../shared/OllamaDownloadStatus';
import { RewriteResumeOptions } from '../shared/RewriteResume.type';

export {};

declare global {
  interface Window {
    api: {
      minimize: () => void;
      maximize: () => void;
      close: () => void;
      getProfilesList: () => Promise<string[]>;
      addProfile: (firstname: string, lastname: string, language: Language) => Promise<{ success: boolean; error?: string }>;
      loadProfile: (profileId: string) => Promise<ProfilesData>;
      checkAIAvailability: () => Promise<boolean>;
      updateSection: (id: string, section: keyof ProfilesData, newData: ProfilesData[keyof ProfilesData]) => Promise<ProfilesData[keyof ProfilesData]>;
      generatePDF: (html: string, fileName: string) => Promise<boolean>;
      syncDb: (profileId: string, experiences: Experience[], projects: Project[]) => Promise<boolean>;
      analyseMandate: (rawMandate: string, language: Language, useAi: boolean) => Promise<{ success: boolean; error?: string }>;
      onAnalysisStatus: (callback: (data: { status: AIAnalysisStatus; message?: string; data?: unknown }) => void) => () => void;
      reduceKeywordCount: (keyword: string, amount?: number) => void;
      getOllamaInfos: () => Promise<NonNullable<UserConfig['ollama']> | null>;
      detectOllama: (uri: string) => Promise<boolean>;
      getAvailableOllamaModels: () => Promise<{modelName: string, preferred: boolean}[]>;
      setPreferredOllamaModel: (modelName: string) => Promise<void>;
      getOllamaSystemRecommendations: () => Promise<SystemRecommendations>;
      installOllama: (modelName: string) => Promise<void>;
      onOllamaProgress: (callback: (status: Parameters<OnProgressCallback>[0]) => void) => () => void;
      getApiKey: () => Promise<string | null>;
      setupGemini: (apiKey: string) => Promise<void>;
      onError: (callback: (error: string) => void) => () => void;
      getDefaultExportPath: () => Promise<string | null>;
      selectExportFolder: () => Promise<string | null>;
      setDefaultExportPath: (path: string) => Promise<void>;
      rewriteResume: (options: RewriteResumeOptions) => Promise<{ success?: boolean; error?: string }>;
    };
  }
}