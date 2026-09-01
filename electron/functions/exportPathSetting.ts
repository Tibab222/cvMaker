import { dialog, BrowserWindow } from 'electron';
import { configManager } from '../ipcHandlers';

export const selectExportFolder = async () => {
  const window = BrowserWindow.getFocusedWindow();
  
  const result = await dialog.showOpenDialog(window!, {
    properties: ['openDirectory', 'createDirectory'],
    title: 'Sélectionner le dossier d\'exportation',
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths[0];
};

export const setDefaultExportPath = async (path: string) => {
  try {
    configManager.setExportPath(path);
    return true;
  } catch (error) {
    console.error('Failed to set export path:', error);
    return false;
  }
};