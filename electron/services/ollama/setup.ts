import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'stream';
import { finished } from 'stream/promises';
import { spawn } from 'child_process';

import si from 'systeminformation';
import { OLLAMA_LINUX_DL_URL, OLLAMA_MAC_DL_URL, OLLAMA_WINDOWS_DL_URL } from './constants';
import { downloadFolder } from '../../main.dev';
import AdmZip from 'adm-zip';
import { ConfigurationManager } from '../config/ConfigurationManager';
import { OnProgressCallback } from '../../../shared/OllamaDownloadStatus';

interface SystemHardwareConfig {
    os: string;
    arch: string;
    cpuModel: string;
    ramTotalGB: number;
    hasDedicatedGPU: boolean; 
    gpuModel: string;
}

interface SystemRecommendations {
    ollamaFriendly: boolean;
    recommendedModel: string;
    systemHardware?: SystemHardwareConfig;
}

/**
 * This class is responsible for setting up the Ollama service.
 * It provides methods to initialize and configure the service as needed.
 * It can also download and install ollama with a model
 */
export class OllamaSetup {
    constructor(private configManager: ConfigurationManager) {}

    async fullSetup(modelName: string, onProgress?: OnProgressCallback): Promise<void> {
        const ollamaBinaryPath = await this.installOllama(onProgress);

        if (!ollamaBinaryPath) {
            throw new Error("Ollama binary path is undefined after installation.");
        }
        console.log(`Ollama binary is located at: ${ollamaBinaryPath}`);

        if (os.platform() === 'darwin') {
            try {
                fs.chmodSync(ollamaBinaryPath, '755');
            } catch (err) {
                console.warn("Error occurred while changing permissions: ", err);
            }
        }

        console.log(`Starting Ollama in background...`);

        const ollamaProcess = spawn(ollamaBinaryPath, ['serve'], {
            env: {
                ...process.env,
            }
        });

        // TODO: remove that in prod  /////////////////////////////
        ollamaProcess.stdout.on('data', (data) => console.log(`[Ollama stdout]: ${data}`));
        ollamaProcess.stderr.on('data', (data) => console.error(`[Ollama stderr]: ${data}`));
        // //////////////////////////////////////////////////////*/

        process.on('exit', () => ollamaProcess.kill());

        await new Promise((resolve) => setTimeout(resolve, 2000));

        if (modelName) {
            console.log(`Starting model download: ${modelName}...`);
            await this.pullModel(modelName);
            console.log(`The model ${modelName} is installed and ready!`);
        }
    }

    /**
     * Pulls the specified model from the Ollama service.
     * @param modelName - The name of the model to pull.
     * @throws Will throw an error if the fetch request fails or if the response is not OK.
     */
    async pullModel(modelName: string, onProgress?: OnProgressCallback): Promise<void> {
        const response = await fetch('http://localhost:11434/api/pull', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: modelName,
                stream: true
            })
        });

        if (!response.ok || !modelName || !response.body) {
            throw new Error(`Error occurred while fetching the model: ${response.statusText}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            
            buffer = lines.pop() || "";

            for (const line of lines) {
                if (!line.trim()) continue;
                try {
                    const parsed = JSON.parse(line);
                    
                    if (parsed.total && parsed.completed && onProgress) {
                        const percent = Math.round((parsed.completed / parsed.total) * 100);
                        onProgress({
                            type: 'model_pull',
                            percent,
                            completedBytes: parsed.completed,
                            totalBytes: parsed.total,
                            statusText: parsed.status
                        });
                    }
                } catch (e) {
                    console.warn(e)
                }
            }
        }

        const currentPath = this.configManager.get('ollama')?.baseUrl;
        const isInstalledViaOfficialInstaller = this.configManager.get('ollama')?.installedViaOfficialInstaller || false;
        if (!currentPath) {
            throw new Error("Ollama path is not set in the configuration.");
        }

        this.configManager.updateConfig({
            ollama: {
                baseUrl: currentPath,
                installedViaOfficialInstaller: isInstalledViaOfficialInstaller,
                localModels: [
                    ...(this.configManager.get('ollama')?.localModels || []),
                    {
                        modelName: modelName,
                        preferred: true
                    }
                ]
            }
        });

        console.log(`Model download status: ${response.status}`);
    }

    /**
     * Function made to detect if Ollama is installed on the system. It sends a request to the local Ollama server and checks if it responds correctly.
     */
    async detectOllama(uri: string): Promise<boolean> {
        try {
            const response = await fetch(uri+'/api/tags');
            if (response.ok) {
                const data = await response.json();
                console.log(data);
                const models = data.models.map((m: { name: string | string[] }) => m.name);
                console.log("Ollama detected with models:", models);
                this.configManager.updateConfig({
                    ollama: {
                        localModels: models.map((modelName: string) => ({
                            modelName,
                            preferred: false
                        })),
                        baseUrl: uri,
                        installedViaOfficialInstaller: true
                    }
                });
                return true;
            }
        } catch (e: Error | unknown) {
            console.warn("Ollama n'est pas détecté au démarrage.", e instanceof Error ? e.message : e);
            return false;
        }
        return false;
    }

    getAvailableModels(): {modelName: string, preferred: boolean}[] {
        const ollamaConfig = this.configManager.get('ollama');
        if (!ollamaConfig) return [];
        return ollamaConfig.localModels;
    }

    setPreferredModel(modelName: string): void {
        const ollamaConfig = this.configManager.get('ollama');
        if (!ollamaConfig) {
            throw new Error("Ollama configuration is not set.");
        }
        const updatedModels = ollamaConfig.localModels.map(model => ({
            ...model,
            preferred: model.modelName === modelName
        }));
        this.configManager.updateConfig({
            ollama: {
                ...ollamaConfig,
                localModels: updatedModels
            }
        });
    }

    private async installOllama(onProgress?: OnProgressCallback): Promise<void | string> {
        return this.downloadOllama(onProgress).then((downloadedFilePath) => {
            console.log(`Ollama downloaded to: ${downloadedFilePath}`);
            const ext = path.extname(downloadedFilePath).toLowerCase();
            if (ext === '.zip') {
                console.log(`Extracting ZIP archive : ${downloadedFilePath}...`);
                const zip = new AdmZip(downloadedFilePath);
                const zipEntries = zip.getEntries();

                const targetEntry = zipEntries.find(entry => 
                    entry.entryName.toLowerCase().endsWith('ollama.exe') || 
                    entry.entryName.toLowerCase() === 'ollama'
                );

                if (!targetEntry) {
                    throw new Error("Error: impossible to find the Ollama binary in zip file");
                }

                const isWin = os.platform() === 'win32';
                const finalBinaryName = isWin ? 'ollama-local.exe' : 'ollama-local';
                const finalBinaryPath = path.join(downloadFolder, finalBinaryName);

                const fileBuffer = zip.readFile(targetEntry);
                if (!fileBuffer) throw new Error("Erreur lors de la lecture du binaire dans le ZIP.");

                fs.writeFileSync(finalBinaryPath, fileBuffer);
                console.log(`Extraction done in : ${finalBinaryPath}`);
                this.configManager.updateConfig({
                    ollama: {
                        localModels: [],
                        baseUrl: finalBinaryPath,
                        installedViaOfficialInstaller: false
                    }
                });
                return finalBinaryPath;
            } else if (downloadedFilePath.endsWith('.tar.zst')) {
                throw new Error("This extraction method for .tar.zst is not implemented yet.");
            } else {
                throw new Error(`Unsupported archive format : ${ext}`);
            }
        }).catch((error) => {
            console.error("Error downloading Ollama:", error);
            throw error;
        });
    }

    async getSystemRecommendations(): Promise<SystemRecommendations> {
        const systemHardware = await this.getSystemHardware();
        if (!systemHardware) throw new Error("Failed to retrieve system hardware information.");
        const { ramTotalGB, hasDedicatedGPU, os, arch } = systemHardware;

        let ollamaFriendly = false;
        let recommendedModel = "";
        
        const isAppleSilicon = os === 'darwin' && arch === 'arm64';
        if (ramTotalGB > 7) {
            ollamaFriendly = true;
        } else return {
            ollamaFriendly: false,
            recommendedModel: "",
            systemHardware: systemHardware
        }

        if (ramTotalGB >= 16 && (hasDedicatedGPU || isAppleSilicon)) {
            recommendedModel = "llama3.1:8b";
        } else if (ramTotalGB >= 8 && (hasDedicatedGPU || isAppleSilicon)) {
            recommendedModel = "llama3.2:3b";
        } else {
            recommendedModel = "gemma2:2b"; // or "phi3:mini" / "llama3.2:1b"
        }

        return {
            ollamaFriendly: ollamaFriendly,
            recommendedModel: recommendedModel,
            systemHardware: systemHardware
        }
    }

    private async downloadOllama(onProgress?: OnProgressCallback): Promise<string> {
        const platform = os.platform();
        let downloadUrl = '';
        let fileName = '';
        switch (platform) {
            case 'win32':
                downloadUrl = OLLAMA_WINDOWS_DL_URL;
                fileName = 'ollama-windows.zip';
                break;
            case 'darwin':
                downloadUrl = OLLAMA_MAC_DL_URL;
                fileName = 'ollama-mac.zip';
                break;
            case 'linux':
                downloadUrl = OLLAMA_LINUX_DL_URL;
                fileName = 'ollama-linux.tar.zst';
                break;
            default:
                throw new Error(`OS not supported : ${platform}`);
        }
        if (!downloadUrl || !fileName) throw new Error(`Download URL or file name not set for platform: ${platform}`);
        const destinationPath = path.join(downloadFolder, fileName);

        if (!fs.existsSync(downloadFolder)) {
            fs.mkdirSync(downloadFolder, { recursive: true });
        }

        console.log(`Downloading Ollama from ${downloadUrl} to ${destinationPath}`);

        const response = await fetch(downloadUrl);
        if(!response.ok) {
            throw new Error(`HTTP Error : ${response.status} ${response.statusText}`);
        }

        if (!response.body) {
            throw new Error("Response body is null");
        }

        const totalBytes = parseInt(response.headers.get('content-length') || '0', 10);
        let completedBytes = 0;

        const fileStream = fs.createWriteStream(destinationPath);

        const webStream = response.body;
        const reader = webStream.getReader();

        const customReadable = new Readable({
            async read() {
                const { done, value } = await reader.read();
                if (done) {
                    this.push(null);
                } else {
                    completedBytes += value.length;
                    if (onProgress && totalBytes > 0) {
                        const percent = Math.round((completedBytes / totalBytes) * 100);
                        onProgress({
                            type: 'binary_download',
                            percent,
                            completedBytes,
                            totalBytes,
                            statusText: 'downloading_binary'
                        });
                    }
                    this.push(Buffer.from(value));
                }
            }
        });

        customReadable.pipe(fileStream);
        await finished(fileStream);
        console.log(`Downloaded Ollama to ${destinationPath}`);
        return destinationPath;
    }

    async getSystemHardware(): Promise<SystemHardwareConfig> {
        try {
            const ramTotalGB = Math.round(os.totalmem() / (1024 * 1024 * 1024));
            const cpuModel = os.cpus()[0]?.model || 'Unknown';
            const platform = os.platform();
            const arch = os.arch();

            const gpuData = await si.graphics();
            
            const gpus = gpuData.controllers;
            let hasDedicatedGPU = false;
            let gpuModel = 'Integrated / CPU';

            if (gpus && gpus.length > 0) {
                const mainGPU = gpus.find(g => 
                    g.vendor.toLowerCase().includes('nvidia') || 
                    g.vendor.toLowerCase().includes('amd') ||
                    g.model.toLowerCase().includes('apple')
                ) || gpus[0];

                gpuModel = `${mainGPU.vendor} ${mainGPU.model}`;
                
                if (platform === 'darwin' && arch === 'arm64') {
                    hasDedicatedGPU = true;
                } else if (mainGPU.vendor.toLowerCase().includes('nvidia') || mainGPU.vendor.toLowerCase().includes('amd')) {
                    hasDedicatedGPU = true;
                }
            }

            return {
                os: platform,
                arch: arch,
                cpuModel: cpuModel,
                ramTotalGB: ramTotalGB,
                hasDedicatedGPU: hasDedicatedGPU,
                gpuModel: gpuModel
            };

        } catch (error) {
            console.error("Error when searching hardware :", error);
            return {
                os: os.platform(),
                arch: os.arch(),
                cpuModel: 'Unknown',
                ramTotalGB: 8,
                hasDedicatedGPU: false,
                gpuModel: 'Unknown'
            };
        }
    }
}