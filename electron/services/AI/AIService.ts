import { ConfigurationManager } from "../config/ConfigurationManager";
import { UserConfig } from "../config/UserConfig.interface";
import { IAIManager } from "./contract-interfaces/IAIManager.contract";
import { OllamaSetup } from "./ollama/setup";

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
    private AIManager: IAIManager | null = null; // This will hold the instance of the AI manager (e.g., OllamaManager)

    private constructor() {
        // Private constructor to prevent direct instantiation
    }

    public static getInstance(): AIService {
        if (!AIService.instance) {
            AIService.instance = new AIService();
        }
        return AIService.instance;
    }

    public getAvailability(): boolean {
        return this.AIAvailable && this.AIManager !== null;
    }

    /********************************* Ollama (start) ******************************/
    public getOllamaInfos() {
        const configManager = ConfigurationManager.getInstance();
        const ollamaConfig = configManager.get('ollama');
        if (!ollamaConfig) return null;
        return ollamaConfig;
    }

    public async detectOllama(uri: string): Promise<boolean> {
        const ollamaSetup = new OllamaSetup(ConfigurationManager.getInstance());
        const detected = await ollamaSetup.detect(uri);
        if (detected) this.start(); // Start the AI service if Ollama is detected
        return detected;
    }

    public async getAvailableOllamaModels(): Promise<{modelName: string, preferred: boolean}[]> {
        const ollamaSetup = new OllamaSetup(ConfigurationManager.getInstance());
        return ollamaSetup.getAvailableModels();
    }

    public setPreferredOllamaModel(modelName: string): void {
        const ollamaSetup = new OllamaSetup(ConfigurationManager.getInstance());
        ollamaSetup.setPreferredModel(modelName);
        this.start();
    }
    /********************************* Ollama (end) ******************************/

    public start() {
        this.initializeProvider();
        if (this.AIProvider) {
            this.AIAvailable = true;
            switch (this.AIProvider.provider) {
                case 'ollama': { 
                    const ollamaSetup = new OllamaSetup(ConfigurationManager.getInstance());
                    this.AIManager = ollamaSetup.getManager();
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
            }
        }
    }

    public async prompt(promptText: string): Promise<string> {
        if (!this.AIManager) {
            throw new Error("AI Manager is not initialized.");
        }
        return await this.AIManager.prompt(promptText);
    }

    public async promptStream(promptText: string, onChunk: (chunk: string) => void): Promise<void> {
        if (!this.AIManager) {
            throw new Error("AI Manager is not initialized.");
        }
        return await this.AIManager.promptStream(promptText, onChunk);
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