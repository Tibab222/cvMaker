import { Experience } from "../shared/Experience.interface";
import { OnProgressCallback, SetupProgressStatus } from "../shared/OllamaDownloadStatus";
import { Language } from "../shared/profile.interface";
import { ProfilesData } from "../shared/profilesData.interface";
import { Project } from "../shared/projects.interface";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  minimize: () => ipcRenderer.send('minimize'),
  maximize: () => ipcRenderer.send('maximize'),
  close: () => ipcRenderer.send('close'),
  getProfilesList: () => ipcRenderer.invoke('getProfilesList'),
  addProfile: (firstname: string, lastname: string, language: Language) => ipcRenderer.invoke('addProfile', firstname, lastname, language),
  loadProfile: (profileId: string) => ipcRenderer.invoke('loadProfile', profileId),
  checkAIAvailability: () => ipcRenderer.invoke('checkAIAvailability'),
  updateSection: (id: string, section: keyof ProfilesData, newData: ProfilesData[keyof ProfilesData]) => ipcRenderer.invoke('updateSection', id, section, newData),
  generatePDF: (html: string, fileName: string) => ipcRenderer.invoke('generatePdf', html, fileName),
  syncDb: (profileId: string, experiences: Experience[], projects: Project[]) => ipcRenderer.invoke('syncDb', profileId, experiences, projects),
  analyseMandate: (rawMandate: string, language: Language, useAi: boolean) => ipcRenderer.invoke('analyseMandate', { rawMandate, language, useAi }),
  onAnalysisStatus: (callback: (status: unknown) => void) => {
    const listener = (_event: unknown, value: unknown) => callback(value);
    ipcRenderer.on('analysis-status', listener);
    return () => ipcRenderer.removeListener('analysis-status', listener);
  },
  reduceKeywordCount: (keyword: string, amount?: number) => ipcRenderer.send('reduceKeywordCount', keyword, amount),
  getOllamaInfos: () => ipcRenderer.invoke('getOllamaInfos'),
  detectOllama: (uri: string) => ipcRenderer.invoke('detectOllama', uri),
  getAvailableOllamaModels: () => ipcRenderer.invoke('getAvailableOllamaModels'),
  setPreferredOllamaModel: (modelName: string) => ipcRenderer.invoke('setPreferredOllamaModel', modelName),
  getOllamaSystemRecommendations: () => ipcRenderer.invoke('getOllamaSystemRecommendations'),
  installOllama: (modelName: string) => ipcRenderer.invoke('ollama:install', modelName),
  onOllamaProgress: (callback: (status: Parameters<OnProgressCallback>[0]) => void) => {
    const subscription = (_event: unknown, data: SetupProgressStatus) => callback(data);
    ipcRenderer.on('ollama:progress', subscription);
    return () => {
      ipcRenderer.removeListener('ollama:progress', subscription);
    };
  },
  getApiKey: () => ipcRenderer.invoke('getApiKey'),
  setupGemini: (apiKey: string) => ipcRenderer.invoke('setupGemini', apiKey),
  onError: (callback: (error: string) => void) => {
    const subscription = (_event: unknown, error: string) => callback(error);
    ipcRenderer.on('error', subscription);
    return () => {
      ipcRenderer.removeListener('error', subscription);
    };
  },
  getDefaultExportPath: () => ipcRenderer.invoke('get-default-export-path'),
  selectExportFolder: () => ipcRenderer.invoke('select-export-folder'),
  setDefaultExportPath: (path: string) => ipcRenderer.invoke('set-default-export-path', path),
});