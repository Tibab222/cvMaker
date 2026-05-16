import { ipcMain, BrowserWindow } from 'electron';
import { profilesDir } from './main.dev';
import * as fs from 'fs';
import { createProfile } from './functions/createProfile';
import { ProfilesData } from '../shared/profilesData.interface';
import { updateSection } from './functions/updateSection';
import { generatePdf } from './functions/generatePdf';
import { VectorDatabase } from './services/database';
import { VectorService } from './services/VectorService';
import path from 'path';
import { Experience } from '../shared/Experience.interface';
import { Project } from '../shared/projects.interface';
import { MistralService } from './services/MistralService';
import { FRENCH_PROMPTS } from './prompts/fr';
import { ENGLISH_PROMPTS } from './prompts/en';
import { AIAnalysisStatus } from '../shared/AIAnalysisStatus';
import { Language } from '../shared/profile.interface';

export const vectorDb = VectorDatabase.getInstance();
export const vectorService = VectorService.getInstance();
export const mistralService = MistralService.getInstance();

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

    ipcMain.handle('checkMistral', async () => {
        return await mistralService.checkAvailability();
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
            console.log('Starting sync for:', profileId);

            await vectorService.rebuildVectorIndex(profilePath, experiences, projects);

            return { success: true };
        } catch (error) {
            console.error('Sync failed:', error);
            throw error;
        }
    });

    ipcMain.handle('analyseMandate', async (event, rawMandate: string, language: Language) => {
        const mistral = MistralService.getInstance();
        const isAvailable = await mistral.checkAvailability();
        if (!isAvailable) {
            return { error: "Mistral is not available" };
        }

        try {
            event.sender.send('analysis-status', { status: AIAnalysisStatus.Analyzing, message: 'Analysing the mandate...' });
            const prompt = language === Language.FRENCH ? FRENCH_PROMPTS.ANALYZING(rawMandate) : ENGLISH_PROMPTS.ANALYZING(rawMandate);
            const analysisResult = (await mistral.analyze(prompt)) as { job_title: string; skills: string[]; key_focus: string };
            event.sender.send('analysis-status', { status: AIAnalysisStatus.Analyze_Result, data: analysisResult });
            event.sender.send('analysis-status', { status: AIAnalysisStatus.Matching, message: 'Matching experiences and projects...' });
            const queryText = `${analysisResult.job_title} ${analysisResult.skills.join(' ')} ${analysisResult.key_focus}`;
            const matchesExp = await vectorService.rankExperiences(queryText);
            event.sender.send('analysis-status', {status: AIAnalysisStatus.MatchesExperiences, data: matchesExp});
            
            const matchesProj = await vectorService.rankProjectsByBullets(queryText);
            event.sender.send('analysis-status', {status: AIAnalysisStatus.MatchesProjects, data: matchesProj});
            event.sender.send('analysis-status', { status: AIAnalysisStatus.Success, message: 'Analysis completed' });
            return { success: true };
        } catch (error) {
            console.error('Analysis failed:', error);
            event.sender.send('analysis-status', { status: 'error', message: 'Analysis failed' });
            return { error: 'Analysis failed' };
        }
    });

}