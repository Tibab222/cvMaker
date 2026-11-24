import { ProfilesData } from '../shared/profilesData.interface';
import { UserConfig } from '../electron/services/config/UserConfig.interface';
import { SystemRecommendations } from '../shared/SystemRecommendation';
import { OnProgressCallback } from '../shared/OllamaDownloadStatus';
import { RewriteResumeOptions } from '../shared/RewriteResume.type';
import { KeywordStat } from '../shared/Keywords.types';
import { Application, ApplicationEditDto, ApplicationsChangedEvent, ApplicationDetailsDto, ApplicationEvent, ApplicationWithEvents, CVSessionDataDTO, JobApplicationStatus, KeyStats, NewApplicationEventDto, PastApplicationDto, PastApplicationResult, Reminder, SilentApplication } from '../shared/jobApplications.type';
import { JobOfferPayload } from '../shared/Extension.types';
import { Language } from '../shared/profile.interface';
import { Experience } from '../shared/Experience.interface';
import { Project } from '../shared/projects.interface';
import { AIAnalysisStatus } from '../shared/AIAnalysisStatus';
import { CoverLetterStatusPayload, GenerateCoverLetterDTO } from '../shared/CoverLetter.types';
import type { VaultImportPayload, VaultImportResult, VaultMatch, VaultOffer, VaultResume } from '../shared/vault.types';
import type { SavedAnswer, SavedAnswerDto, SavedAnswerResult } from '../shared/answers.types';
import type { TemplateImportResult, UserTemplateFile } from '../shared/cvm/ipc.types';
import type { InterviewQuestion, InterviewQuestionDto, InterviewQuestionResult, QuestionsExportRequest, QuestionsExportResult } from '../shared/interviewQuestions.types';
import { AddSourceResult, AdzunaConnectResult, AdzunaQuery, AdzunaStatus, DiscoveredJob, DiscoveredJobStatus, DiscoveryRunStatus, DiscoverySettings, JobSource, ProfileFilterSuggestion } from '../shared/discovery.types';

export {};

declare global {
  interface Window {
    api: {
      minimize: () => void;
      maximize: () => void;
      close: () => void;
      openFolder: (folderPath: string) => Promise<boolean>;
      getProfilesList: () => Promise<string[]>;
      addProfile: (firstname: string, lastname: string, language: Language) => Promise<{ success: boolean; error?: string }>;
      loadProfile: (profileId: string) => Promise<ProfilesData>;
      checkAIAvailability: () => Promise<boolean>;
      updateSection: (id: string, section: keyof ProfilesData, newData: ProfilesData[keyof ProfilesData]) => Promise<ProfilesData[keyof ProfilesData]>;
      generatePDF: (html: string, fileName: string, applicationId?: string) => Promise<string | null>;
      syncDb: (profileId: string, experiences: Experience[], projects: Project[]) => Promise<boolean>;
      analyseMandate: (rawMandate: string, language: Language, useAi: boolean, jobTitle?: string) => Promise<{ success: boolean; error?: string }>;
      onAnalysisStatus: (callback: (data: { status: AIAnalysisStatus; message?: string; data?: unknown }) => void) => () => void;
      reduceKeywordCount: (keyword: string, amount?: number) => Promise<void>;
      getOllamaInfos: () => Promise<NonNullable<UserConfig['ollama']> | null>;
      detectOllama: (uri: string) => Promise<boolean>;
      getAvailableOllamaModels: () => Promise<{modelName: string, preferred: boolean}[]>;
      setPreferredOllamaModel: (modelName: string) => Promise<void>;
      getOllamaSystemRecommendations: () => Promise<SystemRecommendations>;
      installOllama: (modelName: string) => Promise<void>;
      onOllamaProgress: (callback: (status: Parameters<OnProgressCallback>[0]) => void) => () => void;
      getApiKey: () => Promise<string | null>;
      setupGemini: (apiKey: string) => Promise<void>;
      onError: (callback: (error: string) => void) => () => void;
      getDefaultExportPath: () => Promise<string | null>;
      selectExportFolder: () => Promise<string | null>;
      setDefaultExportPath: (path: string) => Promise<void>;
      rewriteResume: (options: RewriteResumeOptions) => Promise<{ success?: boolean; error?: string }>;
      getTopKeywords: (limit?: number) => Promise<KeywordStat[]>;
      saveCVSession: (data: Partial<CVSessionDataDTO>) => Promise<{ success: boolean; id?: string; error?: string }>;
      getKeyStats: () => Promise<KeyStats>;
      getApplications: () => Promise<Application[]>;
      addPastApplication: (dto: PastApplicationDto) => Promise<PastApplicationResult>;
      /** The browser extension recorded an application. Returns the unsubscribe function. */
      onApplicationsChanged: (callback: (event: ApplicationsChangedEvent) => void) => () => void;
      updateApplicationStatus: (id: string, newStatus: JobApplicationStatus) => Promise<JobApplicationStatus | null>;
      getApplicationWithTimeline: (applicationId: string) => Promise<ApplicationWithEvents | null>;
      getCVSession: (applicationId: string) => Promise<CVSessionDataDTO | null>;
      openResumeFolder: (applicationId: string) => Promise<boolean>; // false when no resume file exists
      getResumePdf: (applicationId: string) => Promise<Uint8Array | null>;
      generateCoverLetter: (options: GenerateCoverLetterDTO) => Promise<{ success: boolean; error?: string }>;
      onCoverLetterStatusUpdate: (callback: (payload: CoverLetterStatusPayload) => void) => () => void;
      deleteApplication: (applicationId: string) => Promise<boolean>;
      addApplicationEvent: (applicationId: string, dto: NewApplicationEventDto) => Promise<ApplicationEvent>;
      deleteApplicationEvent: (eventId: number) => Promise<boolean>;
      updateApplicationDetails: (applicationId: string, details: ApplicationDetailsDto) => Promise<boolean>;
      /** Corrects the offer an application is for; validation errors come back in the result. */
      editApplication: (applicationId: string, dto: ApplicationEditDto) => Promise<PastApplicationResult>;
      getReminders: (limit?: number) => Promise<Reminder[]>;
      /** Applications marked Applied without any sign of life for NO_RESPONSE_AFTER_DAYS or more. */
      getSilentApplications: () => Promise<SilentApplication[]>;
      /** Closes them as No response; returns the ids actually closed (still Applied). */
      markNoResponse: (ids: string[]) => Promise<string[]>;
      undoNoResponse: (ids: string[]) => Promise<number>;
      onJobReceived: (callback: (jobData: JobOfferPayload) => void) => () => void;
      vault: {
        list: () => Promise<VaultResume[]>;
        import: (payload: VaultImportPayload) => Promise<VaultImportResult>;
        rename: (id: string, name: string) => Promise<VaultResume>;
        remove: (id: string) => Promise<boolean>;
        open: (id: string) => Promise<boolean>;
        reveal: (id: string) => Promise<boolean>;
        match: (offer: VaultOffer, limit?: number) => Promise<VaultMatch[]>;
      };
      /** Resume templates (.cvm) imported by the user. */
      templates: {
        list: () => Promise<UserTemplateFile[]>;
        /** Asks for .cvm files and copies the valid ones into the templates folder. */
        import: (reservedIds: string[]) => Promise<TemplateImportResult>;
        remove: (fileName: string) => Promise<boolean>;
        /** Asks where to save, then writes the template; null when cancelled. */
        export: (source: string, suggestedName: string) => Promise<string | null>;
        openFolder: () => Promise<void>;
      };
      /** Answers given to application-form questions, kept by the browser extension. */
      answers: {
        list: () => Promise<SavedAnswer[]>;
        add: (dto: SavedAnswerDto) => Promise<SavedAnswerResult>;
        update: (id: string, dto: SavedAnswerDto) => Promise<SavedAnswerResult>;
        remove: (id: string) => Promise<boolean>;
      };
      /** Interview questions with prepared answers, linked to the applications whose interviews asked them. */
      interviewQuestions: {
        list: () => Promise<InterviewQuestion[]>;
        forApplication: (applicationId: string) => Promise<InterviewQuestion[]>;
        add: (dto: InterviewQuestionDto) => Promise<InterviewQuestionResult>;
        update: (id: string, dto: InterviewQuestionDto) => Promise<InterviewQuestionResult>;
        remove: (id: string) => Promise<boolean>;
        /** Asks where to save, then writes the questions as a PDF, Word or Excel file. */
        export: (request: QuestionsExportRequest) => Promise<QuestionsExportResult>;
        /** Opens the file exported last. */
        openExport: () => Promise<boolean>;
      };
      discovery: {
        listSources: () => Promise<JobSource[]>;
        addSource: (input: string) => Promise<AddSourceResult>;
        removeSource: (id: number) => Promise<boolean>;
        setSourceEnabled: (id: number, enabled: boolean) => Promise<boolean>;
        getSettings: () => Promise<DiscoverySettings>;
        saveSettings: (settings: DiscoverySettings) => Promise<DiscoverySettings>;
        suggestFilters: () => Promise<ProfileFilterSuggestion | null>;
        addSearch: (query: AdzunaQuery) => Promise<AddSourceResult>;
        adzunaStatus: () => Promise<AdzunaStatus>;
        connectAdzuna: (appId: string, appKey: string) => Promise<AdzunaConnectResult>;
        disconnectAdzuna: () => Promise<AdzunaStatus>;
        listJobs: () => Promise<DiscoveredJob[]>;
        setJobStatus: (id: number, status: DiscoveredJobStatus) => Promise<boolean>;
        prepareJob: (id: number) => Promise<JobOfferPayload | null>;
        /** The user opened the offer's link: a new offer moves to the shortlist (true when it did). */
        markOpened: (id: number) => Promise<boolean>;
        start: () => Promise<DiscoveryRunStatus>;
        cancel: () => Promise<void>;
        getStatus: () => Promise<DiscoveryRunStatus>;
        onStatus: (callback: (status: DiscoveryRunStatus) => void) => () => void;
        onJobsChanged: (callback: () => void) => () => void;
      };
    };
  }
}