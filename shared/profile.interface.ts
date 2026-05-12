export enum Language {
    FRENCH = 'fr',
    ENGLISH = 'en',
}

export interface Profile {
    firstName: string;
    lastName: string;
    mail: string;
    phone: string;
    portfolio: string;
    linkedin: string;
    github: string;
    language: Language; // langue du profil (va générer le CV dans cette langue), ex: Language.FRENCH ou Language.ENGLISH
}