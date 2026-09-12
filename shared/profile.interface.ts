export enum Language {
    FRENCH = 'fr',
    ENGLISH = 'en',
}

export interface CustomLink {
  label: string;
  url: string;
}

export interface Profile {
    firstName: string;
    lastName: string;
    mail?: string;
    phone?: string;
    portfolio?: string;
    // Social media links
    linkedin?: string;
    github?: string;
    twitter?: string;
    instagram?: string;
    tiktok?: string;
    youtube?: string;
    facebook?: string;
    customLinks?: CustomLink[];
    // others
    language: Language; // langue du profil (va générer le CV dans cette langue), ex: Language.FRENCH ou Language.ENGLISH
    photo?: string; // cropped profile photo as a JPEG data URL (kept inline so it survives the data: URL PDF export)
}