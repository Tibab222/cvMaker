import { ProfilesData } from '../shared/profilesData.interface';

export {};

declare global {
  interface Window {
    api: {
      minimize: () => void;
      maximize: () => void;
      close: () => void;
      getProfilesList: () => Promise<string[]>;
      addProfile: (firstname: string, lastname: string) => Promise<{ success: boolean; error?: string }>;
      loadProfile: (profileId: string) => Promise<ProfilesData>;
      updateSection: (id: string, section: keyof ProfilesData, newData: ProfilesData[keyof ProfilesData]) => Promise<ProfilesData[keyof ProfilesData]>;
      generatePDF: (html: string, fileName: string) => Promise<boolean>;
    };
  }
}