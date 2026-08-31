import { ChildProcess, spawn } from "child_process";
import { IAIManager } from "../contract-interfaces/IAIManager.contract";
import treeKill from "tree-kill";
import * as os from 'node:os';

/**
 * Class responsible for prompt to an ollama model and managing the response, not the setup of ollama, which is handled by the OllamaSetup class.
 */
export class OllamaManager implements IAIManager {
  readonly providerName = 'ollama';
  private binaryMode: boolean = false;
  private modelName: string;
  private binaryPath: string = '';
  private httpUrl: string = 'http://127.0.0.1:11434';
  private ollamaProcess: ChildProcess | null = null;
  
  constructor(modelName: string, baseUrl: string) {
      this.modelName = modelName;

      if (baseUrl.endsWith('.exe') || baseUrl.includes('ollama-engine')) {
        this.binaryMode = true;
        this.binaryPath = baseUrl;
      } else {
        this.httpUrl = baseUrl || 'http://127.0.0.1:11434';
      }
  }

  public async turnOnBinaryMode() : Promise<void> {
    this.binaryMode = true;
    this.startBinaryProcess();
  }

  public async prompt(prompt: string, onError?: (error: Error) => void, retries = 1): Promise<string> {
    await this.ensureServerRunning();

    try {
      const response = await fetch(`${this.httpUrl}/api/generate`, {
          method: 'POST',
          body: JSON.stringify({
              model: this.modelName,
              prompt: prompt,
              stream: false,
              format: 'json',
              options: {
                temperature: retries < 1 ? 0.1 : 0.7
              }
          })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log(`[OllamaManager] Raw response: ${JSON.stringify(data)}`);
      const cleanedText = this.cleanJsonResponse(data.response);
      console.log(`[OllamaManager] Received response: ${cleanedText}`);
      return JSON.parse(cleanedText);
    } catch (error) {
      console.warn(`[OllamaManager] Failed to parse JSON response. Retries left: ${retries}`, error);

      if (retries > 0) {
        console.log('[OllamaManager] Retrying prompt with lower temperature...');
        return this.prompt(prompt, onError, retries - 1);
      }

      throw new Error(`Ollama JSON Parsing Error: ${(error as Error).message}`);
    }
  }

  public async promptStream(prompt: string, onChunk: (chunk: string) => void): Promise<void> {
    await this.ensureServerRunning();
    const response = await fetch(`${this.httpUrl}/api/generate`, {
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

  private async ensureServerRunning(): Promise<void> {
    if (this.binaryMode && !this.ollamaProcess) {
      await this.startBinaryProcess();
    }
  }

  cleanJsonResponse(rawText: string) {
    if (!rawText) return '{}';
    let cleaned = rawText.replace(/```(?:json)?([\s\S]*?)```/gi, '$1').trim();

    const match = rawText.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (match) {
      cleaned = match[0];
    }
    cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');
    return cleaned;
  }

  private async startBinaryProcess(): Promise<void> {
    if (this.ollamaProcess) return;

    console.log(`[OllamaManager] Starting standalone binary: ${this.binaryPath}`);

    this.ollamaProcess = spawn(this.binaryPath, ['serve'], {
      env: {
        ...process.env,
        OLLAMA_HOST: '127.0.0.1:11434'
      }
    });

    this.ollamaProcess.stdout?.on('data', (data) => console.log(`[Ollama process stdout]: ${data}`));
    this.ollamaProcess.stderr?.on('data', (data) => console.error(`[Ollama process stderr]: ${data}`));

    this.ollamaProcess.on('exit', (code) => {
      console.log(`[OllamaManager] Process exited with code ${code}`);
      this.ollamaProcess = null;
    });

    // Attente active que le serveur soit prêt à répondre aux requêtes HTTP
    await this.waitForServerReady();
  }

  private async waitForServerReady(maxRetries = 15, delayMs = 500): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const res = await fetch(`${this.httpUrl}/api/tags`);
        if (res.ok) return;
      } catch {
        console.log(`[OllamaManager] Waiting for server to be ready... (${i + 1}/${maxRetries})`);
      }
      await new Promise((r) => setTimeout(r, delayMs));
    }
    throw new Error("Ollama standalone process failed to start in time.");
  }

  public stop(): void {
    if (!this.ollamaProcess || !this.ollamaProcess.pid) return;

    console.log("[OllamaManager] Stopping Ollama binary process...");
    if (os.platform() === 'win32') {
      treeKill(this.ollamaProcess.pid, 'SIGTERM');
    } else {
      this.ollamaProcess.kill('SIGTERM');
    }
    this.ollamaProcess = null;
  }
}