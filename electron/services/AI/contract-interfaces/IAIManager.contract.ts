export interface IAIManager {
    readonly providerName: string;
    
    /** Send a prompt and return the complete response as a string */
    prompt(promptText: string): Promise<string>;
    
    /**
     * Send a prompt in stream mode. 
     */
    promptStream(promptText: string, onChunk: (chunk: string) => void): Promise<void>;
}