import { ipcMain, BrowserWindow } from 'electron';
import { profilesDir } from './main.dev';
import * as fs from 'fs';
import { createProfile } from './functions/createProfile';
import { ProfilesData } from '../shared/profilesData.interface';
import { updateSection } from './functions/updateSection';
import { generatePdf } from './functions/generatePdf';
import { VectorDatabase } from './services/vectorDatabase';
import { VectorService } from './services/VectorService';
import path from 'path';
import { Experience } from '../shared/Experience.interface';
import { Project } from '../shared/projects.interface';
import { Language } from '../shared/profile.interface';
import { analyzeMandate } from './functions/mandateAnalysis';
import { KeywordsAffinityDatabase } from './services/KeywordsExtractor/KeywordsAffinityDatabase';
import { AIService } from './services/AI/AIService';
import { ConfigurationManager } from './services/config/ConfigurationManager';
import { selectExportFolder, setDefaultExportPath } from './functions/exportPathSetting';

export const vectorDb = VectorDatabase.getInstance();
export const vectorService = VectorService.getInstance();
export const keywordsAffinityDb = KeywordsAffinityDatabase.getInstance();
export const aiService = AIService.getInstance();
export const configManager = ConfigurationManager.getInstance();
aiService.start();

export function registerIpcHandlers() {
    ipcMain.on('minimize', (event) => {
        BrowserWindow.fromWebContents(event.sender)?.minimize();
    });

    ipcMain.on('maximize', (event) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        const isMaximized = win?.isMaximized();
        if (isMaximized) {
            win?.unmaximize();
        } else {
            win?.maximize();
        }
    });

    ipcMain.on('close', (event) => {
        BrowserWindow.fromWebContents(event.sender)?.close();
    });

    ipcMain.handle('getProfilesList', async () => {
        const profiles = [];
        try {
            const files = await fs.promises.readdir(profilesDir, { withFileTypes: true });
            for (const file of files) {
                if (file.isDirectory()) {
                    profiles.push(file.name);
                }
            }
        } catch (err) {
            console.error('Error reading profiles directory:', err);
        }
        return profiles;
    });

    ipcMain.handle('addProfile', async (event, firstname: string, lastname: string, language: Language) => createProfile(firstname, lastname, language));

    ipcMain.handle('loadProfile', async (event, profileId: string) => {
        const profilePath = path.join(profilesDir, profileId);

        vectorDb.connect(profilePath);
        keywordsAffinityDb.connect(profilePath);

        const profileData = await fs.promises.readFile(`${profilePath}/infos.json`, 'utf-8');
        const educationData = await fs.promises.readFile(`${profilePath}/edu.json`, 'utf-8');
        const experienceData = await fs.promises.readFile(`${profilePath}/exp.json`, 'utf-8');
        const resumeData = await fs.promises.readFile(`${profilePath}/header_resume.json`, 'utf-8');
        const projectsData = await fs.promises.readFile(`${profilePath}/projects.json`, 'utf-8');
        const skillsData = await fs.promises.readFile(`${profilePath}/skills.json`, 'utf-8');
        const profile = {
            profile: JSON.parse(profileData),
            education: JSON.parse(educationData) || [],
            experience: JSON.parse(experienceData) || [],
            resume: JSON.parse(resumeData) || [],
            projects: JSON.parse(projectsData) || [],
            skills: JSON.parse(skillsData) || []
        } as ProfilesData;

        return profile;
    });

    ipcMain.handle('checkAIAvailability', async () => {
        return await aiService.getAvailability();
    });

    ipcMain.handle('updateSection', async (event, id: string, section: keyof ProfilesData, newData: ProfilesData[keyof ProfilesData]) => {
        return updateSection(id, section, newData);
    });

    ipcMain.handle('generatePdf', async (event, htmlContent, fileName) => {
        return await generatePdf(htmlContent, fileName);
    });

    ipcMain.handle('syncDb', async (event, profileId: string, experiences: Experience[], projects: Project[]) => {
        try {
            const profilePath = path.join(profilesDir, profileId);
            vectorDb.connect(profilePath);

            await vectorService.rebuildVectorIndex(profilePath, experiences, projects);

            return { success: true };
        } catch (error) {
            console.error('Sync failed:', error);
            throw error;
        }
    });

    ipcMain.handle('analyseMandate', (event, options) => analyzeMandate({ event, options }));
    ipcMain.handle('reduceKeywordCount', (event, keyword: string, amount: number = 1) => {
        try {
            KeywordsAffinityDatabase.reduceCountForKeyword(keyword, amount);
        }
        catch (error) {
            console.error('Error reducing keyword count:', error);
            throw error;
        }
    });
    ipcMain.handle('getOllamaInfos', () => {
        return aiService.getOllamaInfos();
    });
    ipcMain.handle('detectOllama', async (event, uri: string) => {
        return await aiService.detectOllama(uri);
    });
    ipcMain.handle('getAvailableOllamaModels', async () => {
        return await aiService.getAvailableOllamaModels();
    });
    ipcMain.handle('setPreferredOllamaModel', (event, modelName: string) => {
        aiService.setPreferredOllamaModel(modelName);
    });
    ipcMain.handle('getOllamaSystemRecommendations', async () => {
        return await aiService.getOllamaSystemRecommendations();
    });
    ipcMain.handle('ollama:install', async (event, modelName: string) => {
        await aiService.installOllama(modelName, (status) => {
            event.sender.send('ollama:progress', status);
        });
    });
    ipcMain.handle('setupGemini', async (event, apiKey: string) => {
        return await aiService.setupGemini(apiKey);
    });
    // getApiKey for all providers
    ipcMain.handle('getApiKey', () => {
        return aiService.getApiKey();
    });
    ipcMain.handle('get-default-export-path', async () => {
      return configManager.getExportPath();
    });
    ipcMain.handle('select-export-folder', selectExportFolder);
    ipcMain.handle('set-default-export-path', (_, path: string) => setDefaultExportPath(path));
}