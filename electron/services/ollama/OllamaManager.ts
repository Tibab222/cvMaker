/**
 * Class responsible for prompt to an ollama model and managing the response, not the setup of ollama, which is handled by the OllamaSetup class.
 */
export class OllamaManager {
    private modelName: string;
    private baseUrl: string = '';
    constructor(modelName: string, baseUrl: string) {
        this.modelName = modelName;
        this.baseUrl = baseUrl;
    }

    
}