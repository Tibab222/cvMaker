import React, { useState, useCallback, useEffect } from 'react';
import type { CVSelection } from './CVselection';
import { CVSelectionContext } from './context';
import { type AIAnalysis } from './AIAnalysis';
import { api } from '@/api';
import { AIAnalysisStatus } from '@shared/AIAnalysisStatus';
import { useProfileStore } from '@/store/profile';
import { Language } from '@shared/profile.interface';

export interface CVSelectionContextType {
  selection: CVSelection;
  AIanalysis: AIAnalysis;
  toggleExperience: (id: string) => void;
  toggleProject: (id: string) => void;
  toggleBullet: (parentId: string, bulletId: string) => void;
  isBulletSelected: (parentId: string, bulletId: string) => boolean;
  toggleSkill: (id: string) => void;
  toggleEducation: (id: string) => void;
  runFullAnalysis: (rawMandate: string) => Promise<void>;
}

export function CVSelectionProvider({ children }: { children: React.ReactNode }) {
  const { education, profile } = useProfileStore();
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

  const runFullAnalysis = useCallback(async (rawMandate: string) => {
    setAIAnalysis(prev => ({ ...prev, status: AIAnalysisStatus.Loading, rawMandate, isCurrentJob: true }));
    await api.analyseMandate(rawMandate, profile?.language || Language.ENGLISH);
  }, []);

  useEffect(() => {
    const removeStatus = api.onAnalysisStatus((data: { status: AIAnalysisStatus; message?: string; data?: unknown }) => {
      switch (data.status) {
        case AIAnalysisStatus.Analyzing:
          setAIAnalysis(prev => ({ ...prev, status: AIAnalysisStatus.Analyzing }));
          break;
        case AIAnalysisStatus.Analyze_Result:
          { const analysisData = data.data as { job_title: string; skills: string[]; key_focus: string };
          setAIAnalysis(prev => ({ ...prev, status: AIAnalysisStatus.Analyze_Result, keywords: analysisData.skills, jobTitle: analysisData.job_title, focus: analysisData.key_focus }));
          break; }
        case AIAnalysisStatus.MatchesExperiences:{
          const matches = data.data as { local_id: string; score: number }[]; // localId corresponds to experiences id
          setSelection(prev => ({
            ...prev,
            selectedExpIds: matches.map(m => m.local_id)
          }));
          setAIAnalysis(prev => ({ ...prev, status: AIAnalysisStatus.MatchesExperiences }));
          break;}
        case AIAnalysisStatus.MatchesProjects:{
          const matches = data.data as { bestBullets: { local_bullet_id: string; local_project_id: string; score: number }[] ; suggestedProjects: string[] ;};
          setSelection(prev => ({
            ...prev,
            selectedProjectIds: matches.suggestedProjects,
            selectedBullets: matches.bestBullets.reduce((acc, bullet) => {
              if (!acc[bullet.local_project_id]) {
                acc[bullet.local_project_id] = [];
              }
              acc[bullet.local_project_id].push(bullet.local_bullet_id);
              return acc;
            }, {} as Record<string, string[]>)
          }));
          setAIAnalysis(prev => ({ ...prev, status: AIAnalysisStatus.MatchesProjects }));
          break;}
        case AIAnalysisStatus.Success:
          setAIAnalysis(prev => ({ ...prev, status: AIAnalysisStatus.Success, isCurrentJob: false }));
          setSelection(prev => ({
            ...prev,
            selectedEducationIds: education.map(e => e.id)
          }));
          break;
        default:
          console.warn("Received unknown analysis status:", data);
          break;
      }
    });

    return () => {
      removeStatus();
    };
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
    setSelection(prev => ({
      ...prev,
      selectedProjectIds: prev.selectedProjectIds.includes(id)
        ? prev.selectedProjectIds.filter(i => i !== id)
        : [...prev.selectedProjectIds, id]
    }));
    // Reset bullets selection for this project when toggling off
    setSelection(prev => ({
      ...prev,
      selectedBullets: prev.selectedProjectIds.includes(id)
        ? { ...prev.selectedBullets, [id]: [] }
        : prev.selectedBullets
    }));
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
      selection, 
      AIanalysis,
      toggleExperience, 
      toggleProject, 
      toggleBullet,
      toggleSkill,
      toggleEducation,
      isBulletSelected,
      runFullAnalysis
    }}>
      {children}
    </CVSelectionContext.Provider>
  );
}