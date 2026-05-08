import { ProfilesData } from "../shared/profilesData.interface";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  minimize: () => ipcRenderer.send('minimize'),
  maximize: () => ipcRenderer.send('maximize'),
  close: () => ipcRenderer.send('close'),
  getProfilesList: () => ipcRenderer.invoke('getProfilesList'),
  addProfile: (firstname: string, lastname: string) => ipcRenderer.invoke('addProfile', firstname, lastname),
  loadProfile: (profileId: string) => ipcRenderer.invoke('loadProfile', profileId),
  updateSection: (id: string, section: keyof ProfilesData, newData: ProfilesData[keyof ProfilesData]) => ipcRenderer.invoke('updateSection', id, section, newData),
  generatePDF: (html: string, fileName: string) => ipcRenderer.invoke('generatePdf', html, fileName),
});