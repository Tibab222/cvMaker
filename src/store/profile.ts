import { api } from '@/api'
import type { Education } from '@shared/Education.interface'
import type { Experience } from '@shared/Experience.interface'
import type { Profile } from '@shared/profile.interface'
import type { ProfilesData } from '@shared/profilesData.interface'
import type { Project } from '@shared/projects.interface'
import type { Skills } from '@shared/Skills.interface'
import { create } from 'zustand'

type ProfileState = {
  id: string // path to the profile folder, used as unique identifier
  education: Education[]
  experience: Experience[]
  profile: Profile | null,
  projects: Project[]
  skills: Skills[]
  loadProfile: (id: string) => Promise<boolean>
  updateSection: (section: keyof ProfilesData, newData: Education[] | Experience[] | Project[] | Skills[] | Profile) => Promise<void>
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  id: '',
  education: [],
  experience: [],
  profile: null,
  projects: [],
  skills: [],
  loadProfile: async (id: string) => {
    try {
      const data = await api.loadProfile(id)
      if(data)
        set({
          id: id,
          education: data.education,
          experience: data.experience,
          profile: data.profile,
          projects: data.projects,
          skills: data.skills,
      })
      return true
    } catch (e: Error | unknown) {
      console.error((e as Error).message)
      throw e;
    }
  },
  updateSection: async (section, newData) => {
    try {
      const updatedData = await api.updateSection(get().id, section, newData);
      set((state) => ({
        ...state,
        [section]: updatedData
      }))
    } catch (e: Error | unknown) {
      console.error((e as Error).message)
      throw e;
    }
  }
}))