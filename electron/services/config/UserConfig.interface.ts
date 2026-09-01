export interface UserConfig {
    preferredAiProvider: 'ollama' | 'openai' | 'gemini' | 'claude' | null;
    exportPath?: string;
    ollama?: {
        localModels: {
            modelName: string;
            preferred: boolean;
        }[];
        baseUrl: string;
        installedViaOfficialInstaller: boolean; // true if installed via official installer, false if installed via custom path
    },
    openai?: {
        apiKey: string;
        preferredModel: string;
    },
    gemini?: {
        apiKey: string;
        preferredModel: string;
    },
    claude?: {
        apiKey: string;
        preferredModel: string;
    },
}