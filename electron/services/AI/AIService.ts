import { ConfigurationManager } from "../config/ConfigurationManager";
import { UserConfig } from "../config/UserConfig.interface";
import { OllamaSetup } from "../ollama/setup";

interface CloudProvider {
    provider: 'openai' | 'gemini' | 'claude';
    apiKey: string;
}

interface LocalProvider {
    provider: 'ollama';
    modelName: string;
}

export class AIService {
    private static instance: AIService | null = null;
    private AIProvider: CloudProvider | LocalProvider | null = null;
    private AIAvailable: boolean = false;

    private constructor() {
        // Private constructor to prevent direct instantiation
    }

    public static getInstance(): AIService {
        if (!AIService.instance) {
            AIService.instance = new AIService();
        }
        return AIService.instance;
    }

    public getAvalability(): boolean {
        return this.AIAvailable;
    }

    public getOllamaInfos() {
        const configManager = ConfigurationManager.getInstance();
        const ollamaConfig = configManager.get('ollama');
        if (!ollamaConfig) return null;
        return ollamaConfig;
    }

    public async detectOllama(uri: string): Promise<boolean> {
        const ollamaSetup = new OllamaSetup(ConfigurationManager.getInstance());
        return ollamaSetup.detectOllama(uri);
    }

    public async getAvailableOllamaModels(): Promise<{modelName: string, preferred: boolean}[]> {
        const ollamaSetup = new OllamaSetup(ConfigurationManager.getInstance());
        return ollamaSetup.getAvailableModels();
    }

    public setPreferredOllamaModel(modelName: string): void {
        const ollamaSetup = new OllamaSetup(ConfigurationManager.getInstance());
        ollamaSetup.setPreferredModel(modelName);
    }

    public start() {
        this.initializeProvider();
        // if a provider exist, setup the provider, if not, we will wait for the user to select a provider in the settings and set AI not available
        if (this.AIProvider) {
            this.AIAvailable = true;
            switch (this.AIProvider.provider) {
                case 'ollama':
                    // Ollama is a local provider, setup with the OllamaSetup class, and keep the OllamaManager instance in the AIService class for future use
                    break;
                case 'openai':
                    // TODO
                    break;
                case 'gemini':
                    // TODO
                    break;
                case 'claude':
                    // TODO
                    break;
            }
        }
    }

    private initializeProvider(): void {
        const configManager = ConfigurationManager.getInstance();
        const config = configManager.getConfig();
        const preferredProvider = config.preferredAiProvider;
        switch (preferredProvider) {
            case 'ollama': 
            { 
                const ollamaConfig = config.ollama as UserConfig['ollama'];
                if (ollamaConfig && ollamaConfig.localModels.length > 0) {
                    const preferredModel = ollamaConfig.localModels.find(model => model.preferred);
                    if (preferredModel) {
                        this.AIProvider = {
                            provider: 'ollama',
                            modelName: preferredModel.modelName,
                        };
                    }
                }
                break; 
            }
            case 'openai':
                // TODO
                break;
            case 'gemini':
                // TODO
                break;
            case 'claude':
                // TODO
                break;
            default:
                this.AIProvider = null;
                break;
        }
    }
}