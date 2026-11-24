import { ipcMain, BrowserWindow, shell } from 'electron';
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
import { ProfileService } from './services/ProfileService';
import { rewriteResume } from './functions/rewriteResume';
import { JobApplicationManager } from './services/jobApplications/jobApplicationManager';
import { ApplicationDetailsDto, ApplicationEditDto, CVSessionDataDTO, JobApplicationStatus, NewApplicationEventDto, PastApplicationDto, PastApplicationResult } from '../shared/jobApplications.type';
import { offerKeywords, offerKeywordsIn, profileLanguage } from './functions/offerKeywords';
import { generateCoverLetter } from './functions/generateCoverLetter';
import { getDiscoveryManager } from './services/discovery';
import { getVaultManager } from './services/vault';
import { getAnswerBank } from './services/answers';
import type { SavedAnswer, SavedAnswerDto, SavedAnswerResult } from '../shared/answers.types';
import { getInterviewQuestions } from './services/interviewQuestions';
import type { InterviewQuestion, InterviewQuestionDto, InterviewQuestionResult, QuestionsExportRequest } from '../shared/interviewQuestions.types';
import { exportQuestions, openLastExport } from './services/interviewQuestions/exportQuestions';
import type { VaultImportPayload, VaultImportResult, VaultOffer } from '../shared/vault.types';
import { AddSourceResult, AdzunaConnectResult, AdzunaQuery, DiscoveredJobStatus, DiscoverySettings } from '../shared/discovery.types';

/** Pushes an event to every open window (the discovery runs in the background, not for one request). */
const broadcast = (channel: string, payload?: unknown) => {
    BrowserWindow.getAllWindows().forEach((window) => {
        if (!window.isDestroyed()) window.webContents.send(channel, payload);
    });
};

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

    ipcMain.handle("open-folder", async (_event, folderPath: string) => {
        if (!folderPath) return false;

        try {
            // Only folders are opened: for a file, reveal it instead of launching it with its default program.
            const stats = await fs.promises.stat(folderPath).catch(() => null);
            if (!stats) return false;
            if (!stats.isDirectory()) {
                shell.showItemInFolder(folderPath);
                return true;
            }
            const errorMessage = await shell.openPath(folderPath);
            if (errorMessage) {
                console.error("Error opening folder:", errorMessage);
                return false;
            }
            return true;
        } catch (error) {
            console.error("Error opening folder:", error);
            return false;
        }
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
        const profileService = ProfileService.getInstance();
        const jobApplicationManager = JobApplicationManager.getInstance();

        vectorDb.connect(profilePath);
        keywordsAffinityDb.connect(profilePath);
        jobApplicationManager.connect(profilePath);
        const profile = await profileService.loadProfile(profilePath);

        return profile;
    });

    ipcMain.handle('checkAIAvailability', async () => {
        return await aiService.getAvailability();
    });

    ipcMain.handle('updateSection', async (event, id: string, section: keyof ProfilesData, newData: ProfilesData[keyof ProfilesData]) => {
        return updateSection(id, section, newData);
    });

    ipcMain.handle('generatePdf', async (event, htmlContent, fileName, applicationId?: string) => {
        return await generatePdf(htmlContent, fileName, applicationId);
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
    ipcMain.handle('rewrite-resume', (event, options) => rewriteResume({ event, options }));
    ipcMain.handle('get-top-keywords', (event, limit: number = 10) => keywordsAffinityDb.getTopKeywords(limit));
    ipcMain.handle('save-CV-session', (event, data: Partial<CVSessionDataDTO>) => {
        const jobApplicationManager = JobApplicationManager.getInstance();
        return jobApplicationManager.saveOrUpdateApplication(data);
    });
    ipcMain.handle('get-key-stats', () => { return JobApplicationManager.getInstance().getKeyStats(); });
    ipcMain.handle('get-applications', () => { return JobApplicationManager.getInstance().getAllApplications(); });
    // an application sent outside the app; validation errors come back as a result, not as a thrown IPC error
    ipcMain.handle('edit-application', async (event, id: string, dto: ApplicationEditDto): Promise<PastApplicationResult> => {
        try {
            const language = await profileLanguage();
            // keywords are read only when an offer text arrives on an application that had none
            return { ok: true, application: JobApplicationManager.getInstance().editApplication(id, dto, (text) => offerKeywordsIn(text, language)) };
        } catch (error) {
            return { ok: false, error: error instanceof Error ? error.message : String(error) };
        }
    });
    ipcMain.handle('add-past-application', async (event, dto: PastApplicationDto): Promise<PastApplicationResult> => {
        try {
            // a real application: it belongs in the market stats like the offers tailored in the editor
            const keywords = await offerKeywords(dto?.description);
            const application = JobApplicationManager.getInstance().addPastApplication(dto, keywords);
            // made for an offer of the Opportunities queue: it leaves the queue
            try {
                const offer = getDiscoveryManager().findOfferFor({ url: dto.url, company: dto.company, title: dto.title });
                if (offer) getDiscoveryManager().markApplied(offer.id, application.id);
            } catch (error) {
                console.warn("[applications] Could not link the offer:", error);
            }
            return { ok: true, application };
        } catch (error) {
            return { ok: false, error: error instanceof Error ? error.message : String(error) };
        }
    });
    ipcMain.handle('get-application-with-timeline', (event, applicationId: string) => {
        return JobApplicationManager.getInstance().getApplicationWithTimeline(applicationId);
    });
    ipcMain.handle('update-application-status', (event, applicationId: string, newStatus: JobApplicationStatus, note?: string) => {
        return JobApplicationManager.getInstance().updateStatus(applicationId, newStatus as JobApplicationStatus, note);
    });
    ipcMain.handle('get-CV-session', (event, applicationId: string) => {
        return JobApplicationManager.getInstance().getCVSession(applicationId);
    });
    ipcMain.handle('generate-cover-letter', async (event, options) => generateCoverLetter(event, options));
    // Resume files are resolved from the application id, so the renderer never passes raw file paths
    ipcMain.handle('open-resume-folder', (event, applicationId: string) => {
        const pdfFilePath = JobApplicationManager.getInstance().getPdfFilePath(applicationId);
        if (!pdfFilePath) return false;
        shell.showItemInFolder(pdfFilePath);
        return true;
    });
    ipcMain.handle('get-resume-pdf', async (event, applicationId: string) => {
        const pdfFilePath = JobApplicationManager.getInstance().getPdfFilePath(applicationId);
        return pdfFilePath ? await fs.promises.readFile(pdfFilePath) : null;
    });
    ipcMain.handle('delete-application', (event, applicationId: string) => {
        return JobApplicationManager.getInstance().deleteApplication(applicationId);
    });
    ipcMain.handle('add-application-event', (event, applicationId: string, dto: NewApplicationEventDto) => {
        return JobApplicationManager.getInstance().addEvent(applicationId, dto);
    });
    ipcMain.handle('delete-application-event', (event, eventId: number) => {
        return JobApplicationManager.getInstance().deleteEvent(eventId);
    });
    ipcMain.handle('update-application-details', (event, applicationId: string, details: ApplicationDetailsDto) => {
        return JobApplicationManager.getInstance().updateDetails(applicationId, details);
    });
    ipcMain.handle('get-reminders', (event, limit?: number) => {
        return JobApplicationManager.getInstance().getReminders(limit);
    });
    ipcMain.handle('get-silent-applications', () => {
        return JobApplicationManager.getInstance().getSilentApplications();
    });
    ipcMain.handle('mark-no-response', (event, ids: string[]) => {
        return JobApplicationManager.getInstance().markNoResponse(Array.isArray(ids) ? ids.filter((id) => typeof id === 'string') : []);
    });
    ipcMain.handle('undo-no-response', (event, ids: string[]) => {
        return JobApplicationManager.getInstance().undoNoResponse(Array.isArray(ids) ? ids.filter((id) => typeof id === 'string') : []);
    });

    // Job discovery (morning queue)
    const discovery = getDiscoveryManager();
    discovery.onStatus((status) => broadcast('discovery:status', status));
    discovery.onJobsChanged(() => broadcast('discovery:jobs-changed'));
    ipcMain.handle('discovery:list-sources', () => discovery.listSources());
    // a typo in a company name is not an app error: answer with a result instead of throwing (and logging) in the handler
    ipcMain.handle('discovery:add-source', async (event, input: string): Promise<AddSourceResult> => {
        try {
            return { ok: true, source: await discovery.addSource(input) };
        } catch (error) {
            return { ok: false, error: error instanceof Error ? error.message : String(error) };
        }
    });
    ipcMain.handle('discovery:suggest-filters', () => discovery.suggestFilters());
    ipcMain.handle('discovery:add-search', async (event, query: AdzunaQuery): Promise<AddSourceResult> => {
        try {
            return { ok: true, source: discovery.addSearch(query) };
        } catch (error) {
            return { ok: false, error: error instanceof Error ? error.message : String(error) };
        }
    });
    ipcMain.handle('discovery:adzuna-status', () => discovery.getAdzunaStatus());
    ipcMain.handle('discovery:adzuna-connect', async (event, appId: string, appKey: string): Promise<AdzunaConnectResult> => {
        try {
            return { ok: true, status: await discovery.connectAdzuna(appId, appKey) };
        } catch (error) {
            return { ok: false, error: error instanceof Error ? error.message : String(error) };
        }
    });
    ipcMain.handle('discovery:adzuna-disconnect', () => discovery.disconnectAdzuna());

    // Resume vault (finished PDF resumes, ranked against offers)
    const vault = getVaultManager();
    ipcMain.handle('vault:list', () => vault.list());
    // an unreadable or duplicate file is not an app error: answer with a result instead of throwing in the handler
    ipcMain.handle('vault:import', async (event, payload: VaultImportPayload): Promise<VaultImportResult> => {
        try {
            return { ok: true, resume: await vault.import(payload) };
        } catch (error) {
            return { ok: false, error: error instanceof Error ? error.message : String(error) };
        }
    });
    ipcMain.handle('vault:rename', (event, id: string, name: string) => vault.rename(id, name));
    ipcMain.handle('vault:remove', (event, id: string) => vault.remove(id));
    ipcMain.handle('vault:open', async (event, id: string) => {
        const error = await shell.openPath(vault.filePath(id));
        if (error) throw new Error(error);
        return true;
    });
    ipcMain.handle('vault:reveal', (event, id: string) => {
        shell.showItemInFolder(vault.filePath(id));
        return true;
    });
    ipcMain.handle('vault:match', (event, offer: VaultOffer, limit?: number) => vault.match(offer, Math.min(Math.max(Number(limit) || 10, 1), 50)));

    // Answer bank (application-form questions kept by the extension, edited here)
    const answers = getAnswerBank();
    const answerResult = (write: () => SavedAnswer): SavedAnswerResult => {
        try {
            return { ok: true, answer: write() };
        } catch (error) {
            return { ok: false, error: error instanceof Error ? error.message : String(error) };
        }
    };
    ipcMain.handle('answers:list', () => answers.list());
    ipcMain.handle('answers:add', (event, dto: SavedAnswerDto) => answerResult(() => answers.add(dto)));
    ipcMain.handle('answers:update', (event, id: string, dto: SavedAnswerDto) => answerResult(() => answers.update(id, dto)));
    ipcMain.handle('answers:remove', (event, id: string) => answers.remove(id));

    // Interview questions library (prepared answers, linked to the applications whose interviews asked them)
    const interviewQuestions = getInterviewQuestions();
    const interviewQuestionResult = (write: () => InterviewQuestion): InterviewQuestionResult => {
        try {
            return { ok: true, question: write() };
        } catch (error) {
            return { ok: false, error: error instanceof Error ? error.message : String(error) };
        }
    };
    ipcMain.handle('interview-questions:list', () => interviewQuestions.list());
    ipcMain.handle('interview-questions:for-application', (event, applicationId: string) => interviewQuestions.forApplication(applicationId));
    ipcMain.handle('interview-questions:add', (event, dto: InterviewQuestionDto) => interviewQuestionResult(() => interviewQuestions.add(dto)));
    ipcMain.handle('interview-questions:update', (event, id: string, dto: InterviewQuestionDto) => interviewQuestionResult(() => interviewQuestions.update(id, dto)));
    ipcMain.handle('interview-questions:remove', (event, id: string) => interviewQuestions.remove(id));
    ipcMain.handle('interview-questions:export', (event, request: QuestionsExportRequest) =>
        exportQuestions(interviewQuestions, request, BrowserWindow.fromWebContents(event.sender)));
    ipcMain.handle('interview-questions:open-export', () => openLastExport());
    ipcMain.handle('discovery:remove-source', (event, id: number) => discovery.removeSource(id));
    ipcMain.handle('discovery:set-source-enabled', (event, id: number, enabled: boolean) => discovery.setSourceEnabled(id, enabled));
    ipcMain.handle('discovery:get-settings', () => discovery.getSettings());
    ipcMain.handle('discovery:save-settings', (event, settings: DiscoverySettings) => discovery.saveSettings(settings));
    ipcMain.handle('discovery:list-jobs', () => discovery.listJobs());
    ipcMain.handle('discovery:set-job-status', (event, id: number, status: DiscoveredJobStatus) => discovery.setJobStatus(id, status));
    ipcMain.handle('discovery:prepare-job', (event, id: number) => discovery.prepareJob(id));
    ipcMain.handle('discovery:mark-opened', (event, id: number) => discovery.markOpened(id));
    ipcMain.handle('discovery:start', () => discovery.start('manual'));
    ipcMain.handle('discovery:cancel', () => discovery.cancel());
    ipcMain.handle('discovery:get-status', () => discovery.getStatus());
}