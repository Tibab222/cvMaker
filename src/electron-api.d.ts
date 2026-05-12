import { ProfilesData } from '../shared/profilesData.interface';

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
      checkMistral: () => Promise<boolean>;
      updateSection: (id: string, section: keyof ProfilesData, newData: ProfilesData[keyof ProfilesData]) => Promise<ProfilesData[keyof ProfilesData]>;
      generatePDF: (html: string, fileName: string) => Promise<boolean>;
      syncDb: (profileId: string, experiences: Experience[], projects: Project[]) => Promise<boolean>;
      analyseMandate: (rawMandate: string, language: Language) => Promise<{ success: boolean; error?: string }>;
      onAnalysisStatus: (callback: (data: { status: AIAnalysisStatus; message?: string; data?: unknown }) => void) => () => void;
    };
  }
}