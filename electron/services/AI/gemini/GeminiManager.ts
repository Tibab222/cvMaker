import { GoogleGenAI } from "@google/genai";
import { IAIManager } from "../contract-interfaces/IAIManager.contract";

export class GeminiManager implements IAIManager {
    readonly providerName: string = 'gemini';
    private ai: GoogleGenAI;

    constructor(private apiKey: string, private modelName: string) {
        if (!apiKey) {
            throw new Error("[GeminiManager] API key is required for GeminiManager.");
        }
        if (!modelName) {
            throw new Error("[GeminiManager] Model name is required for GeminiManager.");
        }

        this.ai = new GoogleGenAI({ apiKey: this.apiKey });
    }

    async prompt(promptText: string, onError?: (error: Error) => void): Promise<string> {
        try {
            const response = await this.ai.models.generateContent({
                model: this.modelName,
                contents: promptText,
            });

            console.log(`[GeminiManager] Raw response: ${response.text}`);

            return this.parseGeminiJson(response.text || "");
        } catch (error) {
            console.error("[GeminiManager] Error in prompt:", error);
            if (onError) {
                onError(error instanceof Error ? error : new Error(String(error)));
            }
            throw error;
        }
    }

    parseGeminiJson<T = unknown>(rawText: string): T {
        let cleaned = rawText.trim();
        cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
        return JSON.parse(cleaned) as T;
    }

    async promptStream(promptText: string, onChunk: (chunk: string) => void): Promise<void> {
        try {
            const responseStream = await this.ai.models.generateContentStream({
                model: this.modelName,
                contents: promptText,
            });

            for await (const chunk of responseStream) {
                if (chunk.text) {
                    onChunk(chunk.text);
                }
            }
        } catch (error) {
            console.error("[GeminiManager] Error in promptStream:", error);
            throw error;
        }
    }
}