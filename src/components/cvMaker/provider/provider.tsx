import React, { useState, useCallback, useEffect } from 'react';
import type { CVSelection } from './CVselection';
import { CVSelectionContext } from './context';
import { type AIAnalysis } from './AIAnalysis';
import { api } from '@/api';
import { AIAnalysisStatus } from '@shared/AIAnalysisStatus';
import { useProfileStore } from '@/store/profile';
import { Language } from '@shared/profile.interface';

export interface CVSelectionContextType {
  title: string;
  selection: CVSelection;
  AIanalysis: AIAnalysis;
  customTexts: CustomTextMap;
  scores: ScoreMap;
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
  const { education, profile } = useProfileStore();
  const [title, setTitle] = useState<string>(() => "Resume - " + (profile?.firstName || "Draft") + " - " + Date.now());
  const [selection, setSelection] = useState<CVSelection>({
    selectedExpIds: [],
    selectedProjectIds: [],
    selectedBullets: {},
    selectedSkillsIds: [],
    selectedEducationIds: []
  });
  const [AIanalysis, setAIAnalysis] = useState<AIAnalysis>({
    rawMandate: '',
    keywords: [],
    status: AIAnalysisStatus.Idle,
    jobTitle: '',
    focus: '',
    isCurrentJob: false
  });
  const [customTexts, setCustomTexts] = useState<CustomTextMap>({});
  const [scores, setScores] = useState<ScoreMap>({});

  const runFullAIAnalysis = useCallback(async (rawMandate: string) => {
    setAIAnalysis(prev => ({ ...prev, status: AIAnalysisStatus.Loading, rawMandate, isCurrentJob: true }));
    const analysisResult = await api.analyseMandate(rawMandate, profile?.language || Language.ENGLISH, true);
    if ('error' in analysisResult) {
      console.error('AI Analysis Error:', analysisResult.error);
      setAIAnalysis(prev => ({ ...prev, status: AIAnalysisStatus.Error }));
    }
  }, [profile?.language]);

  const runLocalAnalysis = useCallback(async (rawMandate: string) => {
    setAIAnalysis(prev => ({ ...prev, status: AIAnalysisStatus.Loading, rawMandate, isCurrentJob: false }));
    await api.analyseMandate(rawMandate, profile?.language || Language.ENGLISH, false);
  }, [profile?.language]);

  useEffect(() => {
    const removeStatus = api.onAnalysisStatus((data: { status: AIAnalysisStatus; message?: string; data?: unknown }) => {
      switch (data.status) {
        case AIAnalysisStatus.Analyzing:
          setAIAnalysis(prev => ({ ...prev, status: AIAnalysisStatus.Analyzing }));
          break;

        case AIAnalysisStatus.Analyze_Result:
          { 
            const analysisData = data.data as { job_title: string; skills: string[]; key_focus: string };
            if (analysisData.job_title) {
              setTitle(`CV - ${analysisData.job_title}`);
            }
            setAIAnalysis(prev => (
              { ...prev, 
                status: AIAnalysisStatus.Analyze_Result, 
                keywords: analysisData.skills, 
                jobTitle: analysisData.job_title, 
                focus: analysisData.key_focus 
              }));
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
          setAIAnalysis(prev => ({ ...prev, status: AIAnalysisStatus.MatchesExperiences }));
          break;}
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
          setAIAnalysis(prev => ({ ...prev, status: AIAnalysisStatus.MatchesProjects }));
          break;}
        case AIAnalysisStatus.Success:{
          setAIAnalysis(prev => ({ ...prev, status: AIAnalysisStatus.Success, isCurrentJob: false }));
          setSelection(prev => ({
            ...prev,
            selectedEducationIds: education.map(e => e.id)
          }));
          break;}
        case AIAnalysisStatus.Local_Analyze_Result:{
          const localAnalysisData = data.data as { keywords: string[] };
          setAIAnalysis(prev => ({ ...prev, status: AIAnalysisStatus.Local_Analyze_Result, keywords: localAnalysisData.keywords }));
          break;}
        default:
          console.warn("Received unknown analysis status:", data);
          break;
      }
    });

    return () => {
      removeStatus();
    };
  }, [profile?.language, education]);

  const getCustomField = useCallback((entityType: EntityType, id: string, field: string, defaultValue: string = '') => {
    const key = buildCustomKey(entityType, id, field);
    return customTexts[key] ?? defaultValue;
  }, [customTexts]);

  const updateCustomField = useCallback((entityType: EntityType, id: string, field: string, value: string) => {
    const key = buildCustomKey(entityType, id, field);
    setCustomTexts(prev => ({ ...prev, [key]: value }));
  }, []);

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
    setAIAnalysis(prev => ({
      ...prev,
      keywords: prev.keywords.filter(k => k !== keyword)
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

  return (
    <CVSelectionContext.Provider value={{ 
      title,
      setTitle,
      selection, 
      getScore,
      AIanalysis,
      customTexts,
      scores,
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
      resetCustomField
    }}>
      {children}
    </CVSelectionContext.Provider>
  );
}