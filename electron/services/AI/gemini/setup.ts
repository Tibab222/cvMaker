import { ConfigurationManager } from "../../config/ConfigurationManager";
import { IAIProviderSetup } from "../contract-interfaces/IAIProviderSetup.contract";
import { GeminiManager } from "./GeminiManager";
import { GoogleGenAI } from "@google/genai";
import { DEFAULT_MODEL } from "./constants";

export class GeminiSetup implements IAIProviderSetup<GeminiManager> {
    readonly providerName: string = 'gemini';
    constructor(private configManager: ConfigurationManager) {}
    
    async detect(apiKey?: string): Promise<boolean> {
        const keyToTest = apiKey || this.configManager.get("gemini")?.apiKey;

        if (!keyToTest) {
            return false;
        }

        try {
            const genAI = new GoogleGenAI({ apiKey: keyToTest });
            const response = await genAI.models.list();

            if (!response || response.pageLength === 0 || !response.getItem(0).name) {
                console.warn("[GeminiSetup] No models returned from Gemini API. The API key might be invalid or there are no available models.");
                return false;
            }
            const existingConfig = this.configManager.get("gemini");
            const defaultModel = existingConfig?.preferredModel || DEFAULT_MODEL;

            this.configManager.updateConfig({
                gemini: {
                    apiKey: keyToTest,
                    preferredModel: defaultModel,
                },
                preferredAiProvider: "gemini",
            });

            return true;
        } catch (error) {
            console.warn(`[GeminiSetup] Failed to detect Gemini with provided API key. Error: ${error}`, error instanceof Error ? error.message : error);
            return false;
        }
    }

    getPreferredModel(): string {
        return this.configManager.get("gemini")?.preferredModel || DEFAULT_MODEL;
    }

    setPreferredModel(modelName: string): void {
        const geminiConfig = this.configManager.get("gemini");
        if (!geminiConfig?.apiKey) {
            throw new Error("[GeminiSetup] Cannot set preferred model for Gemini because the API key is not configured.");
        }

        this.configManager.updateConfig({
            gemini: {
                ...geminiConfig,
                preferredModel: modelName,
            },
            preferredAiProvider: "gemini",
        });
    }
    getManager(): GeminiManager {
        const geminiConfig = this.configManager.get("gemini");

        if (!geminiConfig?.apiKey) {
            throw new Error("[GeminiSetup] Gemini configuration is incomplete: missing API key.");
        }

        const preferredModel = geminiConfig.preferredModel || DEFAULT_MODEL;
        return new GeminiManager(geminiConfig.apiKey, preferredModel);
    }
}