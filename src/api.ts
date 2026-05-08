import type { ProfilesData } from "@shared/profilesData.interface";

export const api = {
    minimize: () => window.api.minimize(),
    maximize: () => window.api.maximize(),
    close: () => window.api.close(),
    getProfilesList: async () => await window.api.getProfilesList(),
    addProfile: async (firstname: string, lastname: string) => await window.api.addProfile(firstname, lastname),
    loadProfile: async (id: string) => await window.api.loadProfile(id),
    updateSection: async (id: string, section: keyof ProfilesData, newData: ProfilesData[keyof ProfilesData]) => await window.api.updateSection(id, section, newData),
    generatePDF: async (html: string, fileName: string) => await window.api.generatePDF(html, fileName),
}