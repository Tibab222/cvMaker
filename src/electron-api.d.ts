import { ProfilesData } from '../shared/profilesData.interface';
import { UserConfig } from '../electron/services/config/UserConfig.interface';

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
    };
  }
}