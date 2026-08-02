export interface UserConfig {
    preferredAiProvider: 'ollama' | 'openai' | 'gemini' | 'claude' | null;
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
    },
    gemini?: {
        apiKey: string;
    },
    claude?: {
        apiKey: string;
    },
}