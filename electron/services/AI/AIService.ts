import { OnProgressCallback } from "../../../shared/OllamaDownloadStatus";
import { ConfigurationManager } from "../config/ConfigurationManager";
import { UserConfig } from "../config/UserConfig.interface";
import { IAIManager } from "./contract-interfaces/IAIManager.contract";
import { GeminiSetup } from "./gemini/setup";
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

    public async getOllamaSystemRecommendations() {
        const ollamaSetup = new OllamaSetup(ConfigurationManager.getInstance());
        return await ollamaSetup.getSystemRecommendations();
    }

    public async installOllama(modelName: string, onProgress: OnProgressCallback): Promise<void> {
        const ollamaSetup = new OllamaSetup(ConfigurationManager.getInstance());
        await ollamaSetup.fullSetup(modelName, onProgress);
        this.start(); // Start the AI service after installation
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
                case 'gemini': {
                    const geminiSetup = new GeminiSetup(ConfigurationManager.getInstance());
                    this.AIManager = geminiSetup.getManager();
                    break;
                }
                case 'claude':
                    // TODO
                    break;
            }
        }
    }

    public async prompt(promptText: string, onError?: (error: Error) => void): Promise<string> {
        if (!this.AIManager) {
            throw new Error("AI Manager is not initialized.");
        }
        return await this.AIManager.prompt(promptText, onError);
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
        console.log(`[AIService] Preferred AI Provider: ${preferredProvider}`);
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
                        console.log(`[AIService] Using Ollama with model: ${preferredModel.modelName}`);
                    }
                }
                break; 
            }
            case 'openai':
                // TODO
                break;
            case 'gemini': {
                const geminiConfig = config.gemini as UserConfig['gemini'];
                if (geminiConfig && geminiConfig.apiKey) {
                    this.AIProvider = {
                        provider: 'gemini',
                        apiKey: geminiConfig.apiKey,
                    };
                    console.log(`[AIService] Using Gemini with API Key: ${geminiConfig.apiKey}`);
                }
                break; }
            case 'claude':
                // TODO
                break;
            default:
                this.AIProvider = null;
                break;
        }
    }

    getApiKey() {
        if (!this.AIProvider) {
            throw new Error("AI Provider is not initialized.");
        }
        if ('apiKey' in this.AIProvider) {
            return this.AIProvider.apiKey;
        } else {
            return null; // Ollama does not use an API key
        }
    }

    // setup Gemini API key
    public async setupGemini(apiKey: string): Promise<boolean> {
        const geminiSetup = new GeminiSetup(ConfigurationManager.getInstance());
        const detected = await geminiSetup.detect(apiKey);
        if (detected) this.start();
        return detected;
    }
}