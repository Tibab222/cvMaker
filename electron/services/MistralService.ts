export class MistralService {
  private static instance: MistralService | null = null;
  private isAvailable: boolean = false;
  private readonly baseUrl = 'http://127.0.0.1:11434/api/generate';

  private constructor() {}

  public static getInstance(): MistralService {
    if (!MistralService.instance) {
      MistralService.instance = new MistralService();
    }
    return MistralService.instance;
  }

  public async checkAvailability(): Promise<boolean> {
    try {
      const response = await fetch('http://127.0.0.1:11434/api/tags');
      if (response.ok) {
        const data = await response.json();
        this.isAvailable = data.models.some((m: { name: string | string[] }) => m.name.includes('mistral'));
        console.log(this.isAvailable ? "Mistral via Ollama est prêt." : "Ollama tourne mais 'mistral' n'est pas installé.");
      }
    } catch (e: Error | unknown) {
      this.isAvailable = false;
      console.warn("Ollama n'est pas détecté au démarrage.", e instanceof Error ? e.message : e);
    }
    return this.isAvailable;
  }

  public getStatus() {
    return this.isAvailable;
  }

  /**
   * Analyse mode, stream deactivated, answer returned in one go at the end of the process
   */
  public async analyze(prompt: string): Promise<unknown> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      body: JSON.stringify({
        model: 'mistral',
        prompt: prompt,
        stream: false,
        format: 'json'
      })
    });
    const data = await response.json();
    return JSON.parse(data.response);
  }

  /**
   * Stream mode, answer streamed in chunks via IPC to the Renderer
   */
  public async generateStream(prompt: string, event: Electron.IpcMainInvokeEvent) {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      body: JSON.stringify({
        model: 'mistral',
        prompt: prompt,
        stream: true
      })
    });

    if (!response.body) return;

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      try {
        const json = JSON.parse(chunk);
        event.sender.send('ai-chunk', json.response);
        
        if (json.done) break;
      } catch (e: Error | unknown) {
        console.warn("Chunk JSON mal formé ignoré.", e instanceof Error ? e.message : e);
      }
    }
  }
}