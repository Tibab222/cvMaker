import { CoverLetterStatusPayload, GenerateCoverLetterDTO } from "../shared/CoverLetter.types";
import { Experience } from "../shared/Experience.interface";
import { JobOfferPayload } from "../shared/Extension.types";
import { Application, ApplicationEditDto, ApplicationsChangedEvent, PastApplicationDto, PastApplicationResult, ApplicationDetailsDto, ApplicationEvent, ApplicationWithEvents, CVSessionDataDTO, JobApplicationStatus, KeyStats, NewApplicationEventDto, Reminder, SilentApplication } from "../shared/jobApplications.type";
import { OnProgressCallback, SetupProgressStatus } from "../shared/OllamaDownloadStatus";
import { Language } from "../shared/profile.interface";
import { ProfilesData } from "../shared/profilesData.interface";
import { Project } from "../shared/projects.interface";
import { RewriteResumeOptions } from "../shared/RewriteResume.type";
import type { VaultImportPayload, VaultOffer } from "../shared/vault.types";
import type { SavedAnswerDto } from "../shared/answers.types";
import type { InterviewQuestionDto, QuestionsExportRequest } from "../shared/interviewQuestions.types";
import { AdzunaQuery, DiscoveredJobStatus, DiscoveryRunStatus, DiscoverySettings } from "../shared/discovery.types";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  minimize: () => ipcRenderer.send('minimize'),
  maximize: () => ipcRenderer.send('maximize'),
  close: () => ipcRenderer.send('close'),
  openFolder: (folderPath: string) => ipcRenderer.invoke('open-folder', folderPath),
  getProfilesList: () => ipcRenderer.invoke('getProfilesList'),
  addProfile: (firstname: string, lastname: string, language: Language) => ipcRenderer.invoke('addProfile', firstname, lastname, language),
  loadProfile: (profileId: string) => ipcRenderer.invoke('loadProfile', profileId),
  checkAIAvailability: () => ipcRenderer.invoke('checkAIAvailability'),
  updateSection: (id: string, section: keyof ProfilesData, newData: ProfilesData[keyof ProfilesData]) => ipcRenderer.invoke('updateSection', id, section, newData),
  generatePDF: (html: string, fileName: string, applicationId?: string) => ipcRenderer.invoke('generatePdf', html, fileName, applicationId),
  syncDb: (profileId: string, experiences: Experience[], projects: Project[]) => ipcRenderer.invoke('syncDb', profileId, experiences, projects),
  analyseMandate: (rawMandate: string, language: Language, useAi: boolean, jobTitle?: string) => ipcRenderer.invoke('analyseMandate', { rawMandate, language, useAi, jobTitle }),
  onAnalysisStatus: (callback: (status: unknown) => void) => {
    const listener = (_event: unknown, value: unknown) => callback(value);
    ipcRenderer.on('analysis-status', listener);
    return () => ipcRenderer.removeListener('analysis-status', listener);
  },
  // must be invoke(): the main process registers it with ipcMain.handle, which never sees send()
  reduceKeywordCount: (keyword: string, amount?: number) => ipcRenderer.invoke('reduceKeywordCount', keyword, amount),
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
  rewriteResume: (options: RewriteResumeOptions) => ipcRenderer.invoke('rewrite-resume', options),
  getTopKeywords: (limit: number = 10) => ipcRenderer.invoke('get-top-keywords', limit),
  saveCVSession: (data: Partial<CVSessionDataDTO>) => ipcRenderer.invoke('save-CV-session', data) as Promise<{ id: string; success: boolean; error?: string }>, // return the id of the saved session or an error message if it fails
  getKeyStats: () => ipcRenderer.invoke('get-key-stats') as Promise<KeyStats>,
  getApplications: () => ipcRenderer.invoke('get-applications') as Promise<Application[]>,
  addPastApplication: (dto: PastApplicationDto) => ipcRenderer.invoke('add-past-application', dto) as Promise<PastApplicationResult>,
  onApplicationsChanged: (callback: (event: ApplicationsChangedEvent) => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, value: ApplicationsChangedEvent) => callback(value);
    ipcRenderer.on('applications:changed', subscription);
    return () => ipcRenderer.removeListener('applications:changed', subscription);
  },
  getApplicationWithTimeline: (applicationId: string) => ipcRenderer.invoke('get-application-with-timeline', applicationId) as Promise<ApplicationWithEvents | null>,
  updateApplicationStatus: (applicationId: string, newStatus: JobApplicationStatus, note?: string) => ipcRenderer.invoke('update-application-status', applicationId, newStatus, note) as Promise<void>,
  setEditorSession: (applicationId: string | null) => ipcRenderer.send('editor-session', applicationId),
  getCVSession: (applicationId: string) => ipcRenderer.invoke('get-CV-session', applicationId) as Promise<CVSessionDataDTO | null>,
  openResumeFolder: (applicationId: string) => ipcRenderer.invoke('open-resume-folder', applicationId) as Promise<boolean>,
  getResumePdf: (applicationId: string) => ipcRenderer.invoke('get-resume-pdf', applicationId) as Promise<Uint8Array | null>,
  generateCoverLetter: (options: GenerateCoverLetterDTO) => ipcRenderer.invoke('generate-cover-letter', options),
  onCoverLetterStatusUpdate: (callback: (payload: CoverLetterStatusPayload) => void) => {
        const subscription = (_event: Electron.IpcRendererEvent, payload: CoverLetterStatusPayload) => callback(payload);
        ipcRenderer.on('cover-status', subscription);
        return () => {
            ipcRenderer.removeListener('cover-status', subscription);
        };
    },
  deleteApplication: (applicationId: string) => ipcRenderer.invoke('delete-application', applicationId) as Promise<boolean>,
  addApplicationEvent: (applicationId: string, dto: NewApplicationEventDto) => ipcRenderer.invoke('add-application-event', applicationId, dto) as Promise<ApplicationEvent>,
  deleteApplicationEvent: (eventId: number) => ipcRenderer.invoke('delete-application-event', eventId) as Promise<boolean>,
  updateApplicationDetails: (applicationId: string, details: ApplicationDetailsDto) => ipcRenderer.invoke('update-application-details', applicationId, details) as Promise<boolean>,
  editApplication: (applicationId: string, dto: ApplicationEditDto) => ipcRenderer.invoke('edit-application', applicationId, dto) as Promise<PastApplicationResult>,
  getReminders: (limit?: number) => ipcRenderer.invoke('get-reminders', limit) as Promise<Reminder[]>,
  getSilentApplications: () => ipcRenderer.invoke('get-silent-applications') as Promise<SilentApplication[]>,
  markNoResponse: (ids: string[]) => ipcRenderer.invoke('mark-no-response', ids) as Promise<string[]>,
  undoNoResponse: (ids: string[]) => ipcRenderer.invoke('undo-no-response', ids) as Promise<number>,
  vault: {
    list: () => ipcRenderer.invoke('vault:list'),
    import: (payload: VaultImportPayload) => ipcRenderer.invoke('vault:import', payload),
    rename: (id: string, name: string) => ipcRenderer.invoke('vault:rename', id, name),
    remove: (id: string) => ipcRenderer.invoke('vault:remove', id),
    open: (id: string) => ipcRenderer.invoke('vault:open', id),
    reveal: (id: string) => ipcRenderer.invoke('vault:reveal', id),
    match: (offer: VaultOffer, limit?: number) => ipcRenderer.invoke('vault:match', offer, limit),
  },
  templates: {
    list: () => ipcRenderer.invoke('templates:list'),
    import: (reservedIds: string[]) => ipcRenderer.invoke('templates:import', reservedIds),
    remove: (fileName: string) => ipcRenderer.invoke('templates:remove', fileName),
    export: (source: string, suggestedName: string) => ipcRenderer.invoke('templates:export', source, suggestedName),
    openFolder: () => ipcRenderer.invoke('templates:open-folder'),
  },
  answers: {
    list: () => ipcRenderer.invoke('answers:list'),
    add: (dto: SavedAnswerDto) => ipcRenderer.invoke('answers:add', dto),
    update: (id: string, dto: SavedAnswerDto) => ipcRenderer.invoke('answers:update', id, dto),
    remove: (id: string) => ipcRenderer.invoke('answers:remove', id),
  },
  interviewQuestions: {
    list: () => ipcRenderer.invoke('interview-questions:list'),
    forApplication: (applicationId: string) => ipcRenderer.invoke('interview-questions:for-application', applicationId),
    add: (dto: InterviewQuestionDto) => ipcRenderer.invoke('interview-questions:add', dto),
    update: (id: string, dto: InterviewQuestionDto) => ipcRenderer.invoke('interview-questions:update', id, dto),
    remove: (id: string) => ipcRenderer.invoke('interview-questions:remove', id),
    export: (request: QuestionsExportRequest) => ipcRenderer.invoke('interview-questions:export', request),
    openExport: () => ipcRenderer.invoke('interview-questions:open-export'),
    onChanged: (callback: () => void) => {
      const subscription = () => callback();
      ipcRenderer.on('interview-questions:changed', subscription);
      return () => ipcRenderer.removeListener('interview-questions:changed', subscription);
    },
  },
  discovery: {
    listSources: () => ipcRenderer.invoke('discovery:list-sources'),
    addSource: (input: string) => ipcRenderer.invoke('discovery:add-source', input),
    removeSource: (id: number) => ipcRenderer.invoke('discovery:remove-source', id),
    setSourceEnabled: (id: number, enabled: boolean) => ipcRenderer.invoke('discovery:set-source-enabled', id, enabled),
    getSettings: () => ipcRenderer.invoke('discovery:get-settings'),
    saveSettings: (settings: DiscoverySettings) => ipcRenderer.invoke('discovery:save-settings', settings),
    suggestFilters: () => ipcRenderer.invoke('discovery:suggest-filters'),
    addSearch: (query: AdzunaQuery) => ipcRenderer.invoke('discovery:add-search', query),
    adzunaStatus: () => ipcRenderer.invoke('discovery:adzuna-status'),
    connectAdzuna: (appId: string, appKey: string) => ipcRenderer.invoke('discovery:adzuna-connect', appId, appKey),
    disconnectAdzuna: () => ipcRenderer.invoke('discovery:adzuna-disconnect'),
    listJobs: () => ipcRenderer.invoke('discovery:list-jobs'),
    setJobStatus: (id: number, status: DiscoveredJobStatus) => ipcRenderer.invoke('discovery:set-job-status', id, status),
    prepareJob: (id: number) => ipcRenderer.invoke('discovery:prepare-job', id),
    markOpened: (id: number) => ipcRenderer.invoke('discovery:mark-opened', id),
    start: () => ipcRenderer.invoke('discovery:start'),
    cancel: () => ipcRenderer.invoke('discovery:cancel'),
    getStatus: () => ipcRenderer.invoke('discovery:get-status'),
    onStatus: (callback: (status: DiscoveryRunStatus) => void) => {
      const subscription = (_event: Electron.IpcRendererEvent, status: DiscoveryRunStatus) => callback(status);
      ipcRenderer.on('discovery:status', subscription);
      return () => ipcRenderer.removeListener('discovery:status', subscription);
    },
    onJobsChanged: (callback: () => void) => {
      const subscription = () => callback();
      ipcRenderer.on('discovery:jobs-changed', subscription);
      return () => ipcRenderer.removeListener('discovery:jobs-changed', subscription);
    },
  },
  onJobReceived: (callback: (jobData: JobOfferPayload) => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, value: JobOfferPayload) => callback(value);
    ipcRenderer.on('JOB_RECEIVED_FROM_EXTENSION', subscription);
    return () => {
      ipcRenderer.removeListener('JOB_RECEIVED_FROM_EXTENSION', subscription);
    };
  }
});