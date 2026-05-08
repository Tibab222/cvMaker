import { app, BrowserWindow, dialog } from "electron";
import * as fs from 'fs';
import path from "path";

export const generatePdf = async (htmlContent: string, fileName: string) => {
  const printWindow = new BrowserWindow({
    show: false,
    webPreferences: { offscreen: true }
  });

  // On injecte le HTML reçu
  await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

  // Choix de l'emplacement de sauvegarde
  const { filePath } = await dialog.showSaveDialog({
    defaultPath: path.join(app.getPath('downloads'), fileName),
    filters: [{ name: 'Fichier PDF', extensions: ['pdf'] }]
  });

  if (!filePath) {
    printWindow.close();
    return false;
  }

  try {
    const data = await printWindow.webContents.printToPDF({
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      pageSize: 'A4',
      printBackground: true, // Crucial pour garder tes couleurs/styles
      preferCSSPageSize: true
    });

    fs.writeFileSync(filePath, data);
    return true;
  } catch (e: Error | unknown) {
    console.error('Error generating PDF:', e);
    return false;
  } finally {
    printWindow.close();
  }
}