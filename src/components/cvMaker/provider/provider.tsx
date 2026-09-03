import React, { useState, useCallback, useEffect } from 'react';
import type { CVSelection } from './CVselection';
import { CVSelectionContext } from './context';
import { type AIAnalysisState, type JobInfos } from './types';
import { api } from '@/api';
import { AIAnalysisStatus } from '@shared/AIAnalysisStatus';
import { useProfileStore } from '@/store/profile';
import { Language } from '@shared/profile.interface';
import { toast } from 'sonner';

export interface CVSelectionContextType {
  title: string;
  selection: CVSelection;
  jobInfos: JobInfos | null;
  aiState: AIAnalysisState;
  customTexts: CustomTextMap;
  scores: ScoreMap;
  rewritingKeys: string[];
  isItemRewriting: (entityType: EntityType, id: string) => boolean;
  setTitle: (title: string) => void;
  toggleExperience: (id: string) => void;
  toggleProject: (id: string) => void;
  toggleBullet: (parentId: string, bulletId: string) => void;
  isBulletSelected: (parentId: string, bulletId: string) => boolean;
  toggleSkill: (id: string) => void;
  toggleEducation: (id: string) => void;
  runFullAIAnalysis: (rawMandate: string) => Promise<void>;
  runLocalAnalysis: (rawMandate: string) => Promise<void>;
  removeKeyword: (keyword: string) => void;
  getCustomField: (entityType: EntityType, id: string, field: string, defaultValue?: string) => string;
  updateCustomField: (entityType: EntityType, id: string, field: string, value: string) => void;
  resetCustomField: (entityType: EntityType, id: string, field: string) => void;
  getScore: (entityType: EntityType, id: string) => number | undefined;
  runAIRewrite: () => Promise<void>;
  initJobMandate: (infos: Partial<JobInfos>) => void;
  updateJobInfos: (infos: Partial<JobInfos>) => void;
}

export type EntityType = 'experience' | 'project' | 'bullet' | 'education' | 'skill';

export type CustomTextMap = Record<string, string>;
export type ScoreMap = Record<string, number>;

const buildCustomKey = (entityType: EntityType, id: string, field: string): string => {
  return `${entityType}:${id}:${field}`;
};

const buildScoreKey = (entityType: EntityType, id: string): string => {
  return `${entityType}:${id}`;
};

export function CVSelectionProvider({ children }: { children: React.ReactNode }) {
  const { education, profile, experience, projects } = useProfileStore();
  const [title, setTitle] = useState<string>(() => "Resume - " + (profile?.firstName || "Draft") + " - " + Date.now());
  const [selection, setSelection] = useState<CVSelection>({
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
  const [rewritingKeys, setRewritingKeys] = useState<string[]>([]);

  const runFullAIAnalysis = useCallback(async (rawMandate: string) => {
    setAiState(prev => ({ ...prev, status: AIAnalysisStatus.Loading, isCurrentJob: true }));
    setJobInfos(prev => ({ ...prev, description: rawMandate }));

    const analysisResult = await api.analyseMandate(rawMandate, profile?.language || Language.ENGLISH, true);
    if ('error' in analysisResult) {
      console.error('AI Analysis Error:', analysisResult.error);
      setAiState(prev => ({ ...prev, status: AIAnalysisStatus.Error }));
    }
  }, [profile?.language]);

  const initJobMandate = useCallback((infos: Partial<JobInfos>) => {
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
      runFullAIAnalysis(infos.description.trim());
    }
  }, [runFullAIAnalysis]);

  const runLocalAnalysis = useCallback(async (rawMandate: string) => {
    setAiState(prev => ({ ...prev, status: AIAnalysisStatus.Loading, isCurrentJob: false }));
    setJobInfos(prev => ({ ...prev, description: rawMandate }));
    await api.analyseMandate(rawMandate, profile?.language || Language.ENGLISH, false);
  }, [profile?.language]);

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

    await api.rewriteResume({
      language: profile?.language || Language.ENGLISH,
      experiences: expsToRewrite,
      projects: projsToRewrite,
    });
  }, [experience, projects, profile?.language, selection.selectedExpIds, selection.selectedProjectIds, selection.selectedBullets, jobInfos.keywords]);

  const updateCustomField = useCallback((entityType: EntityType, id: string, field: string, value: string) => {
    const key = buildCustomKey(entityType, id, field);
    setCustomTexts(prev => ({ ...prev, [key]: value }));
  }, []);

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
          matches.forEach(m => {
            const key = buildScoreKey('experience', m.local_id);
            expScores[key] = m.score;
          });
          setScores(prev => ({ ...prev, ...expScores }));
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

          matches.bestBullets.forEach(bullet => {
            if (!newBulletsMap[bullet.local_project_id]) {
              newBulletsMap[bullet.local_project_id] = [];
            }
            newBulletsMap[bullet.local_project_id].push(bullet.local_bullet_id);
            const bulletKey = buildScoreKey('bullet', bullet.local_bullet_id);
            newScores[bulletKey] = bullet.score;
          });

          matches.suggestedProjects.forEach(proj => {
            const projKey = buildScoreKey('project', proj.id);
            newScores[projKey] = proj.score;
          });

          setScores(prev => ({ ...prev, ...newScores }));
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

        default:
          console.warn("Received unknown analysis status:", data);
          break;
      }
    });

    return () => {
      removeStatus();
      setRewritingKeys([]);
    };
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

  return (
    <CVSelectionContext.Provider value={{ 
      title,
      setTitle,
      selection, 
      getScore,
      jobInfos,
      aiState,
      customTexts,
      scores,
      rewritingKeys,
      isItemRewriting,
      toggleExperience, 
      toggleProject, 
      toggleBullet,
      toggleSkill,
      toggleEducation,
      isBulletSelected,
      runFullAIAnalysis,
      runLocalAnalysis,
      removeKeyword,
      getCustomField,
      updateCustomField,
      resetCustomField,
      runAIRewrite,
      initJobMandate,
      updateJobInfos
    }}>
      {children}
    </CVSelectionContext.Provider>
  );
}