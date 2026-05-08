import { create } from 'zustand'

export enum Tabs {
  PROFILE_SELECTOR = 'profile_selector', // first tab when opening the app
  WELCOME = 'welcome', // no tab selected yet
  PERSONAL = 'personal',
  EXPERIENCE = 'experience',
  EDUCATION = 'education',
  PROJECTS = 'projects',
  SKILLS = 'skills',
  CVMAKER = 'cv_maker'
}

type UiState = {
  selectedTab: Tabs
  setSelectedTab: (tab: Tabs) => void
}

export const useUiStore = create<UiState>((set) => ({
  selectedTab: Tabs.PROFILE_SELECTOR,
  setSelectedTab: (tab: Tabs) => {
    set({ selectedTab: tab })
  }
}))