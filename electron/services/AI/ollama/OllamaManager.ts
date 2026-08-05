import { IAIManager } from "../contract-interfaces/IAIManager.contract";

/**
 * Class responsible for prompt to an ollama model and managing the response, not the setup of ollama, which is handled by the OllamaSetup class.
 */
export class OllamaManager implements IAIManager {
  readonly providerName = 'ollama';
  private modelName: string;
  private baseUrl: string = '';
  constructor(modelName: string, baseUrl: string) {
      this.modelName = modelName;
      this.baseUrl = baseUrl;
  }

  public async prompt(prompt: string): Promise<string> {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
          method: 'POST',
          body: JSON.stringify({
              model: this.modelName,
              prompt: prompt,
              stream: false,
              format: 'json'
          })
      });
      const data = await response.json();
      return JSON.parse(data.response);
  }

  public async promptStream(prompt: string, onChunk: (chunk: string) => void): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      body: JSON.stringify({
        model: this.modelName,
        prompt: prompt,
        stream: true
      })
    });

    if (!response.body) return;

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
            const json = JSON.parse(line);
            if (json.response) {
                onChunk(json.response);
            }
            if (json.done) break;
        } catch (e) {
            console.warn("Chunk error:", e);
        }
      }
    }
  }
}