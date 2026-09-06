import { create } from 'zustand'

export enum Tabs {
  PROFILE_SELECTOR = 'profile_selector', // first tab when opening the app
  WELCOME = 'welcome',
  PERSONAL = 'personal',
  EXPERIENCE = 'experience',
  EDUCATION = 'education',
  PROJECTS = 'projects',
  SKILLS = 'skills',
  CVMAKER = 'cv_maker',
  SETTINGS = "SETTINGS",
  DASHBOARD = "DASHBOARD",
  RESUME_LIBRARY = "RESUME_LIBRARY"
}

type UiState = {
  aiAvailable: boolean
  setAiAvailable: (available: boolean) => void
  selectedTab: Tabs
  setSelectedTab: (tab: Tabs) => void
}

export const useUiStore = create<UiState>((set) => ({
  aiAvailable: false,
  setAiAvailable: (available: boolean) => {
    set({ aiAvailable: available })
  },
  selectedTab: Tabs.PROFILE_SELECTOR,
  setSelectedTab: (tab: Tabs) => {
    set({ selectedTab: tab })
  }
}))