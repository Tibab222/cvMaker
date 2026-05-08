import React, { useState, useCallback } from 'react';
import type { CVSelection } from './CVselection';
import { CVSelectionContext } from './context';

export interface CVSelectionContextType {
  selection: CVSelection;
  toggleExperience: (id: string) => void;
  toggleProject: (id: string) => void;
  toggleBullet: (parentId: string, bulletId: string) => void;
  isBulletSelected: (parentId: string, bulletId: string) => boolean;
  toggleSkill: (id: string) => void;
  toggleEducation: (id: string) => void;
}

export function CVSelectionProvider({ children }: { children: React.ReactNode }) {
  const [selection, setSelection] = useState<CVSelection>({
    selectedExpIds: [],
    selectedProjectIds: [],
    selectedBullets: {},
    selectedSkillsIds: [],
    selectedEducationIds: []
  });

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
      toggleExperience, 
      toggleProject, 
      toggleBullet,
      toggleSkill,
      toggleEducation,
      isBulletSelected 
    }}>
      {children}
    </CVSelectionContext.Provider>
  );
}