import React, { useState, useCallback, useEffect, useRef } from 'react';
import { CVSelectionContext } from './context';
import { INITIAL_HEADER, type AIAnalysisState } from './types';
import { api } from '@/api';
import { AIAnalysisStatus } from '@shared/AIAnalysisStatus';
import { useProfileStore } from '@/store/profile';
import { Language } from '@shared/profile.interface';
import { type EntityType, buildCustomKey, buildScoreKey } from '@shared/utils';
import { JobApplicationStatus, type CVSelection, type CVSessionDataDTO, type JobInfos } from '@shared/jobApplications.type';
import { toast } from 'sonner';
import { useUiStore } from '@/store/ui';
import { useKeyboardShortcut } from '@/hooks/use-keyboard-shortcut';

export interface CVSelectionContextType {
  id: string | null; // application id, null until the session is saved
  title: string;
  selection: CVSelection;
  includePhoto: boolean; // resolved selection.includePhoto: shown by default when the profile has a photo
  showSummary: boolean; // resolved selection.showSummary: shown by default when there are bullets
  jobInfos: JobInfos | null;
  aiState: AIAnalysisState;
  customTexts: CustomTextMap;
  scores: ScoreMap;
  entityKeywords: KeywordMap;
  rewritingKeys: string[];
  isSaving: boolean;
  summaryBullets: string[];
  applicationStatus: JobApplicationStatus;
  save: () => Promise<string | null>;
  isItemRewriting: (entityType: EntityType, id: string) => boolean;
  setTitle: (title: string) => void;
  toggleExperience: (id: string) => void;
  toggleProject: (id: string) => void;
  toggleBullet: (parentId: string, bulletId: string) => void;
  isBulletSelected: (parentId: string, bulletId: string) => boolean;
  toggleSkill: (id: string) => void;
  toggleEducation: (id: string) => void;
  setHeaderInfo: (field: keyof CVSelection['headerInfos'], value: boolean | string, customLinkLabel?: string) => void;
  setIncludePhoto: (include: boolean) => void;
  setShowSummary: (show: boolean) => void;
  runFullAIAnalysis: (rawMandate: string) => Promise<void>;
  runLocalAnalysis: (rawMandate: string) => Promise<void>;
  removeKeyword: (keyword: string) => void;
  getCustomField: (entityType: EntityType, id: string, field: string, defaultValue?: string) => string;
  updateCustomField: (entityType: EntityType, id: string, field: string, value: string) => void;
  resetCustomField: (entityType: EntityType, id: string, field: string) => void;
  getScore: (entityType: EntityType, id: string) => number | undefined;
  getKeywords: (entityType: EntityType, id: string) => KeywordMatch;
  runAIRewrite: () => Promise<void>;
  initJobMandate: (infos: Partial<JobInfos>) => void;
  updateJobInfos: (infos: Partial<JobInfos>) => void;
  setSummaryBullets: (bullets: string[]) => void;
  registerSaveContributor: (key: string, getData: () => unknown) => () => void;
  registerLoadHandler: (handler: (sessionData: CVSessionDataDTO) => void) => () => void;
  updateApplicationStatus: (newStatus: JobApplicationStatus) => void;
}

export type CustomTextMap = Record<string, string>;
export type ScoreMap = Record<string, number>;
export type KeywordMatch = { matched: string[]; missing: string[] };
export type KeywordMap = Record<string, KeywordMatch>;

const EMPTY_KEYWORDS: KeywordMatch = { matched: [], missing: [] };

export function CVSelectionProvider({ children }: { children: React.ReactNode }) {
  const { education, profile, experience, projects } = useProfileStore();
  const { activeCvSessionId, loadCvSession } = useUiStore();
  const [applicationStatus, setApplicationStatus] = useState<JobApplicationStatus>(JobApplicationStatus.DRAFT);
  const [title, setTitle] = useState<string>(() => "Resume - " + (profile?.firstName || "Draft") + " - " + Date.now());
  const [selection, setSelection] = useState<CVSelection>({
    headerInfos: INITIAL_HEADER,
    selectedExpIds: [],
    selectedProjectIds: [],
    selectedBullets: {},
    selectedSkillsIds: [],
    selectedEducationIds: []
  });
  const [aiState, setAiState] = useState<AIAnalysisState>({
    status: AIAnalysisStatus.Idle,
    isCurrentJob: false
  });
  const [jobInfos, setJobInfos] = useState<JobInfos>({
    title: "",
    company: "",
    url: "",
    description: "",
    focus: "",
    keywords: [],
  });
  const [customTexts, setCustomTexts] = useState<CustomTextMap>({});
  const [scores, setScores] = useState<ScoreMap>({});
  const [entityKeywords, setEntityKeywords] = useState<KeywordMap>({});
  const [rewritingKeys, setRewritingKeys] = useState<string[]>([]);
  const [id, setId] = useState<string | null>(null); // can be null or undefined at the beginning!
  const [isSaving, setIsSaving] = useState(false);
  const [summaryBullets, setSummaryBullets] = useState<string[]>([]);
  const saveContributorsRef = useRef<Map<string, () => unknown>>(new Map());
  const loadHandlersRef = useRef<Set<(sessionData: CVSessionDataDTO) => void>>(new Set());

  const registerSaveContributor = useCallback((key: string, getData: () => unknown) => {
    saveContributorsRef.current.set(key, getData);
    return () => { saveContributorsRef.current.delete(key); };
  }, []);

  const registerLoadHandler = useCallback((handler: (sessionData: CVSessionDataDTO) => void) => {
    loadHandlersRef.current.add(handler);
    return () => { loadHandlersRef.current.delete(handler); };
  }, []);

  const runFullAIAnalysis = useCallback(async (rawMandate: string) => {
    setAiState(prev => ({ ...prev, status: AIAnalysisStatus.Loading, isCurrentJob: true }));
    setJobInfos(prev => ({ ...prev, description: rawMandate }));

    const analysisResult = await api.analyseMandate(rawMandate, profile?.language || Language.ENGLISH, true, jobInfos.title || undefined);
    if ('error' in analysisResult) {
      console.error('AI Analysis Error:', analysisResult.error);
      setAiState(prev => ({ ...prev, status: AIAnalysisStatus.Error }));
    }
  }, [jobInfos.title, profile?.language]);

  const runLocalAnalysis = useCallback(async (rawMandate: string) => {
    setAiState(prev => ({ ...prev, status: AIAnalysisStatus.Loading, isCurrentJob: false }));
    setJobInfos(prev => ({ ...prev, description: rawMandate }));
    await api.analyseMandate(rawMandate, profile?.language || Language.ENGLISH, false, jobInfos.title || undefined);
  }, [jobInfos.title, profile?.language]);

  const cleanUpProvider = useCallback(() => {
    console.log("Cleaning up CVSelectionProvider state...");
    setId(null);
    setTitle("Resume - " + (profile?.firstName || "Draft") + " - " + Date.now());
    setSelection({
      headerInfos: INITIAL_HEADER,
      selectedExpIds: [],
      selectedProjectIds: [],
      selectedBullets: {},
      selectedSkillsIds: [],
      selectedEducationIds: []
    });
    setAiState({
      status: AIAnalysisStatus.Idle,
      isCurrentJob: false
    });
    setJobInfos({
      title: "",
      company: "",
      url: "",
      description: "",
      focus: "",
      keywords: [],
    });
    setCustomTexts({});
    setScores({});
    setRewritingKeys([]);
    setIsSaving(false);
    setSummaryBullets([]);
    setApplicationStatus(JobApplicationStatus.DRAFT);
  }, [profile?.firstName]);

  const initJobMandate = useCallback((infos: Partial<JobInfos>) => {
    cleanUpProvider();
    setJobInfos(prev => ({
      ...prev,
      ...infos,
    }));

    if (infos.title && infos.company) {
      setTitle(`CV - ${infos.title} (${infos.company})`);
    } else if (infos.title) {
      setTitle(`CV - ${infos.title}`);
    }

    if (infos.description?.trim()) {
      runLocalAnalysis(infos.description.trim());
    }
  }, [cleanUpProvider, runLocalAnalysis]);

  const runAIRewrite = useCallback(async () => {
    setAiState(prev => ({ ...prev, status: AIAnalysisStatus.Rewriting }));

    const expKeys = experience
      .filter(e => selection.selectedExpIds.includes(e.id))
      .map(e => `${'experience'}:${e.id}`);

    const bulletKeys: string[] = [];
    projects
      .filter(p => selection.selectedProjectIds.includes(p.id))
      .forEach(p => {
        const selectedBulletIds = selection.selectedBullets[p.id] || [];
        p.bullets
          .filter(b => selectedBulletIds.includes(b.id))
          .forEach(b => bulletKeys.push(`${'bullet'}:${b.id}`));
      });
    setRewritingKeys([...expKeys, ...bulletKeys]);
    const expsToRewrite = experience
      .filter(e => selection.selectedExpIds.includes(e.id))
      .map(e => ({
        experience_id: e.id,
        role: e.jobTitle,
        company: e.company,
        description: e.description,
        keywords: jobInfos.keywords || []
      }));

    const projsToRewrite = projects
      .filter(p => selection.selectedProjectIds.includes(p.id))
      .map(p => {
        const selectedBulletIds = selection.selectedBullets[p.id] || [];
        return {
          project_id: p.id,
          title: p.title,
          keywords: jobInfos.keywords || [],
          bullets: p.bullets
            .filter(b => selectedBulletIds.includes(b.id))
            .map(b => ({ bullet_id: b.id, text: b.text }))
        };
      })
      .filter(p => p.bullets.length > 0);

      const cvSessionData: Partial<CVSessionDataDTO> = {
        id: id || undefined,
        title,
        selection,
        jobInfos,
        customTexts,
        scores,
      };

    const result = await api.rewriteResume({
      language: profile?.language || Language.ENGLISH,
      experiences: expsToRewrite,
      projects: projsToRewrite,
      resumeData: cvSessionData
    });

    // some failures (e.g. AI unavailable) return before any status is emitted, so reset the state here
    if (result?.error) {
      setAiState(prev => ({ ...prev, status: AIAnalysisStatus.Error, error: result.error }));
      setRewritingKeys([]);
      toast.error("Failed to rewrite resume", { description: result.error });
    }
  }, [experience, projects, id, title, selection, jobInfos, customTexts, scores, profile?.language]);

  const updateCustomField = useCallback((entityType: EntityType, id: string, field: string, value: string) => {
    const key = buildCustomKey(entityType, id, field);
    setCustomTexts(prev => ({ ...prev, [key]: value }));
  }, []);

  const loadSession = useCallback((sessionData: CVSessionDataDTO) => {
    if (!sessionData) return;
    setId(sessionData.id);
    setTitle(sessionData.title);
    if(!sessionData.selection.headerInfos) sessionData.selection.headerInfos = INITIAL_HEADER;
    setSelection(sessionData.selection);
    if (sessionData.jobInfos) {
      setJobInfos(sessionData.jobInfos);
    }
    setApplicationStatus(sessionData.status ?? JobApplicationStatus.DRAFT);
    setCustomTexts(sessionData.customTexts || {});
    setScores(sessionData.scores || {});
    setSummaryBullets(sessionData.topResumeSummary || []);

    loadHandlersRef.current.forEach(handler => handler(sessionData));

  }, []);

  const setHeaderInfo = useCallback((field: keyof CVSelection['headerInfos'], value: boolean | string, customLinkLabel?: string) => {
    setSelection(prev => {
      const newHeaderInfos = {
        ...prev.headerInfos,
        ...(field !== 'customLinks' ? { [field]: value } : {}),
      };
      if (customLinkLabel && field === 'customLinks' && typeof value === 'boolean') {
        newHeaderInfos.customLinks[customLinkLabel] = value;
      }
      return { ...prev, headerInfos: newHeaderInfos };
    });
  }, []);

  useEffect(() => {
    async function fetchAndHydrate() {
      if (!activeCvSessionId) return;
      try {
        const sessionData = await api.getCVSession(activeCvSessionId); 
        if (sessionData) {
          loadSession(sessionData);
        }
      } catch (error) {
        toast.error("Erreur lors du chargement de la session CV :" + (error instanceof Error ? error.message : ""));
      }
    }

    fetchAndHydrate();
  }, [activeCvSessionId, loadSession]);

  useEffect(() => {
    const removeStatus = api.onAnalysisStatus((data: { status: AIAnalysisStatus; message?: string; data?: unknown }) => {
      switch (data.status) {
        case AIAnalysisStatus.Analyzing:
          setAiState(prev => ({ ...prev, status: AIAnalysisStatus.Analyzing }));
          break;

        case AIAnalysisStatus.Analyze_Result:
          { 
            const analysisData = data.data as { job_title: string; skills: string[]; key_focus: string };
            setJobInfos(prev => ({
                ...prev,
                focus: analysisData.key_focus || "",
                keywords: analysisData.skills || []
              }));

            setAiState(prev => ({ ...prev, status: AIAnalysisStatus.Analyze_Result, }));
            break; 
          }

        case AIAnalysisStatus.MatchesExperiences:{
          const matches = data.data as { local_id: string; score: number; matchedKeywords: string[], missingKeywords: string[] }[]; // localId corresponds to experiences id

          const expScores: ScoreMap = {};
          const expKeywords: KeywordMap = {};
          matches.forEach(m => {
            const key = buildScoreKey('experience', m.local_id);
            expScores[key] = m.score;
            expKeywords[key] = { matched: m.matchedKeywords || [], missing: m.missingKeywords || [] };
          });
          setScores(prev => ({ ...prev, ...expScores }));
          setEntityKeywords(prev => ({ ...prev, ...expKeywords }));
          setSelection(prev => ({
            ...prev,
            selectedExpIds: matches.map(m => m.local_id)
          }));
          setAiState(prev => ({ ...prev, status: AIAnalysisStatus.MatchesExperiences }));
          break;
        }

        case AIAnalysisStatus.MatchesProjects:{
          const matches = data.data as { 
            bestBullets: {
              local_bullet_id: string;
              local_project_id: string;
              score: number;
              matchedKeywords: string[];
            }[];
            suggestedProjects: {
                id: string;
                score: number;
                matchedKeywords: string[];
                missingKeywords: string[];
            }[];
          };
          
          const newBulletsMap: Record<string, string[]> = {};
          const newScores: ScoreMap = {};
          const newKeywords: KeywordMap = {};

          matches.bestBullets.forEach(bullet => {
            if (!newBulletsMap[bullet.local_project_id]) {
              newBulletsMap[bullet.local_project_id] = [];
            }
            newBulletsMap[bullet.local_project_id].push(bullet.local_bullet_id);
            const bulletKey = buildScoreKey('bullet', bullet.local_bullet_id);
            newScores[bulletKey] = bullet.score;
            // bullets only report matches: a single bullet isn't expected to cover every keyword
            newKeywords[bulletKey] = { matched: bullet.matchedKeywords || [], missing: [] };
          });

          matches.suggestedProjects.forEach(proj => {
            const projKey = buildScoreKey('project', proj.id);
            newScores[projKey] = proj.score;
            newKeywords[projKey] = { matched: proj.matchedKeywords || [], missing: proj.missingKeywords || [] };
          });

          setScores(prev => ({ ...prev, ...newScores }));
          setEntityKeywords(prev => ({ ...prev, ...newKeywords }));
          const projectIds = matches.suggestedProjects.map(p => p.id);

          setSelection(prev => ({
            ...prev,
            selectedProjectIds: projectIds,
            selectedBullets: newBulletsMap
          }));
          setAiState(prev => ({ ...prev, status: AIAnalysisStatus.MatchesProjects }));
          break;
        }

        case AIAnalysisStatus.Success:{
          const item = data.data as { id: string };
          if (item?.id) {
            setId(item.id);
            loadCvSession(item.id);
          }
          setAiState(prev => ({ ...prev, status: AIAnalysisStatus.Success, isCurrentJob: false }));
          setSelection(prev => ({
            ...prev,
            selectedEducationIds: education.map(e => e.id)
          }));
          setRewritingKeys([]);
          toast.success("Task completed successfully!");
          break;
        }

        case AIAnalysisStatus.Local_Analyze_Result:{
          const localAnalysisData = data.data as { keywords: string[] };
          setAiState(prev => ({ ...prev, status: AIAnalysisStatus.Local_Analyze_Result }));
          setJobInfos(prev => ({
            ...prev,
            keywords: localAnalysisData.keywords || []
          }));
          break;
        }

        case AIAnalysisStatus.Rewriting: {
          setAiState(prev => ({ ...prev, status: AIAnalysisStatus.Rewriting }));
          break;
        }

        case AIAnalysisStatus.Rewrite_Experience_Item: {
          const item = data.data as { experience_id: string; rewritten_description: string };
          updateCustomField('experience', item.experience_id, 'description', item.rewritten_description);
          setRewritingKeys(prev => prev.filter(k => k !== `experience:${item.experience_id}`));
          break;
        }

        case AIAnalysisStatus.Rewrite_Project_Item: {
          const item = data.data as { project_id: string; bullets: { bullet_id: string; rewritten_text: string }[] };
          item.bullets.forEach(b => {
            updateCustomField('bullet', b.bullet_id, 'text', b.rewritten_text);
          });
          const finishedBulletKeys = item.bullets.map(b => `bullet:${b.bullet_id}`);
          setRewritingKeys(prev => prev.filter(k => !finishedBulletKeys.includes(k)));
          break;
        }

        case AIAnalysisStatus.TOP_RESUME: {
          const item = data.data as { topResumeSummary: string[] };
          setSummaryBullets(item.topResumeSummary);
          setAiState(prev => ({ ...prev, status: AIAnalysisStatus.TOP_RESUME }));
          setApplicationStatus(JobApplicationStatus.REVIEW);
          break;
        }

        case AIAnalysisStatus.Error: {
          setAiState(prev => ({ ...prev, status: AIAnalysisStatus.Error, isCurrentJob: false, error: data.message }));
          setRewritingKeys([]);
          break;
        }

        default:
          console.warn("Received unknown analysis status:", data);
          break;
      }
    });

    return () => {
      removeStatus();
      setRewritingKeys([]);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.language, education, updateCustomField]);

  const getCustomField = useCallback((entityType: EntityType, id: string, field: string, defaultValue: string = '') => {
    const key = buildCustomKey(entityType, id, field);
    return customTexts[key] ?? defaultValue;
  }, [customTexts]);

  const resetCustomField = useCallback((entityType: EntityType, id: string, field: string) => {
    const key = buildCustomKey(entityType, id, field);
    setCustomTexts(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const getScore = useCallback((entityType: EntityType, id: string): number | undefined => {
    const key = buildScoreKey(entityType, id);
    return scores[key];
  }, [scores]);

  const getKeywords = useCallback((entityType: EntityType, id: string): KeywordMatch => {
    return entityKeywords[buildScoreKey(entityType, id)] ?? EMPTY_KEYWORDS;
  }, [entityKeywords]);

  const removeKeyword = useCallback((keyword: string) => {
    setJobInfos(prev => ({
      ...prev,
      keywords: (prev.keywords || []).filter(k => k !== keyword)
    }));
    api.reduceKeywordCount(keyword, 1);
  }, []);

  const toggleExperience = useCallback((id: string) => {
    setSelection(prev => ({
      ...prev,
      selectedExpIds: prev.selectedExpIds.includes(id)
        ? prev.selectedExpIds.filter(i => i !== id)
        : [...prev.selectedExpIds, id]
    }));
  }, []);

  const toggleProject = useCallback((id: string) => {
    setSelection(prev => {
      const isSelected = prev.selectedProjectIds.includes(id);
      return {
        ...prev,
        selectedProjectIds: isSelected
          ? prev.selectedProjectIds.filter(i => i !== id)
          : [...prev.selectedProjectIds, id],
        selectedBullets: isSelected
          ? { ...prev.selectedBullets, [id]: [] }
          : prev.selectedBullets
      };
    });
  }, []);

  const toggleBullet = useCallback((parentId: string, bulletId: string) => {
    setSelection(prev => {
      const currentBullets = prev.selectedBullets[parentId] || [];
      const newBullets = currentBullets.includes(bulletId)
        ? currentBullets.filter(id => id !== bulletId)
        : [...currentBullets, bulletId];

      return {
        ...prev,
        selectedBullets: {
          ...prev.selectedBullets,
          [parentId]: newBullets
        }
      };
    });
  }, []);

  const toggleSkill = useCallback((id: string) => {
    setSelection(prev => ({
      ...prev,
        selectedSkillsIds: prev.selectedSkillsIds.includes(id)
            ? prev.selectedSkillsIds.filter(i => i !== id)
            : [...prev.selectedSkillsIds, id]
    }));
  }, []);

  const toggleEducation = useCallback((id: string) => {
    setSelection(prev => ({
      ...prev,
      selectedEducationIds: prev.selectedEducationIds.includes(id)
        ? prev.selectedEducationIds.filter(i => i !== id)
        : [...prev.selectedEducationIds, id]
    }));
  }, []);

  const setIncludePhoto = useCallback((include: boolean) => {
    setSelection(prev => ({ ...prev, includePhoto: include }));
  }, []);

  const setShowSummary = useCallback((show: boolean) => {
    setSelection(prev => ({ ...prev, showSummary: show }));
    // an empty summary can't be edited in place, so start it with one placeholder bullet
    if (show) setSummaryBullets(prev => prev.length > 0 ? prev : [""]);
  }, []);

  const isBulletSelected = (parentId: string, bulletId: string) => {
    return selection.selectedBullets[parentId]?.includes(bulletId) || false;
  };

  const isItemRewriting = useCallback((entityType: EntityType, id: string) => {
    return rewritingKeys.includes(`${entityType}:${id}`);
  }, [rewritingKeys]);

  const updateJobInfos = useCallback((infos: Partial<JobInfos>) => {
    setJobInfos(prev => ({
      ...prev,
      ...infos,
    }));
  }, []);

  const save = useCallback(async (): Promise<string | null> => {
    setIsSaving(true);
    try {
      const extraData: Record<string, unknown> = {};
      saveContributorsRef.current.forEach((getData, key) => {
        extraData[key] = getData();
      });
      const payload: Omit<CVSessionDataDTO, 'id'> & { id?: string } = {
        id: id || undefined,
        title,
        selection,
        jobInfos,
        customTexts,
        scores,
        topResumeSummary: summaryBullets,
        status: applicationStatus,
        ...extraData
      };

      const result = await api.saveCVSession(payload);

      if (!result.success || !result.id) {
        toast.error(`Failed to save CV session: ${result.error}`);
        return null;
      }
      
      setId(result.id);
      toast.success("Saved successfully!");
      return result.id;
    } finally {
      setIsSaving(false);
    }
  }, [id, title, selection, jobInfos, customTexts, scores, summaryBullets, applicationStatus]);

  useKeyboardShortcut('s', () => {
    if (!isSaving) {
      void save();
    }
  });

  const updateApplicationStatus = useCallback((newStatus: JobApplicationStatus) => {
    if (!id) {
      setApplicationStatus(newStatus);
      toast.info(`Status set to ${newStatus} (will be saved with your CV)`);
      return;
    }
    api.updateApplicationStatus(id, newStatus).then((updatedStatus) => {
      if (updatedStatus) {
        setApplicationStatus(updatedStatus);
        toast.success(`Application status updated to ${updatedStatus}`);
      } else {
        toast.error("Failed to update application status");
      }
    }).catch(() => {
      toast.error("Failed to update application status");
    });
  }, [id]);

  return (
    <CVSelectionContext.Provider value={{
      id,
      title,
      setTitle,
      selection, 
      includePhoto: selection.includePhoto ?? true,
      showSummary: (selection.showSummary ?? true) && summaryBullets.length > 0,
      getScore,
      getKeywords,
      jobInfos,
      aiState,
      customTexts,
      scores,
      entityKeywords,
      rewritingKeys,
      isSaving,
      summaryBullets,
      applicationStatus,
      save,
      isItemRewriting,
      toggleExperience, 
      toggleProject, 
      toggleBullet,
      toggleSkill,
      toggleEducation,
      setHeaderInfo,
      setIncludePhoto,
      setShowSummary,
      isBulletSelected,
      runFullAIAnalysis,
      runLocalAnalysis,
      removeKeyword,
      getCustomField,
      updateCustomField,
      resetCustomField,
      runAIRewrite,
      initJobMandate,
      updateJobInfos,
      setSummaryBullets,
      registerSaveContributor,
      registerLoadHandler,
      updateApplicationStatus
    }}>
      {children}
    </CVSelectionContext.Provider>
  );
}
