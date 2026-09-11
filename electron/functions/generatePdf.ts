import { app, BrowserWindow, dialog } from "electron";
import * as fs from "fs";
import path from "path";
import { ConfigurationManager } from "../services/config/ConfigurationManager";
import { JobApplicationManager } from "../services/jobApplications/jobApplicationManager";

/**
 * Generate a unique file path by appending a counter (1), (2), etc. if the file already exists.
 * @param folderPath The directory where the file should be saved.
 * @param fileName The desired name of the file.
 * @returns A unique full file path that does not currently exist.
 */
const getUniqueFilePath = (folderPath: string, fileName: string): string => {
  const ext = fileName.endsWith(".pdf") ? "" : ".pdf";
  const fullFileName = `${fileName}${ext}`;
  const parsed = path.parse(fullFileName);
  
  let targetFilePath = path.join(folderPath, parsed.base);
  let counter = 1;

  while (fs.existsSync(targetFilePath)) {
    targetFilePath = path.join(
      folderPath,
      `${parsed.name} (${counter})${parsed.ext}`
    );
    counter++;
  }

  return targetFilePath;
};

const isCoverLetter = (fileName: string): boolean => {
  return /^cover\s*letter\s*-/i.test(fileName.trim());
}

/**
 * clean the folder name by removing any leading "Resume CV - " or "Cover Letter - " prefixes and trimming whitespace.
 * @param fileName The original file name to be cleaned.
 * @returns The cleaned folder name without the specified prefixes and leading/trailing whitespace.
 */
const cleanFolderName = (fileName: string): string => {
  const rawName = path.parse(fileName).name;
  return rawName.replace(/^(Resume CV|Cover Letter)\s*-\s*/i, "").trim();
};

export const generatePdf = async (htmlContent: string, fileName: string, applicationId?: string) => {
  const printWindow = new BrowserWindow({
    show: false,
    webPreferences: { offscreen: true, nodeIntegration: false },
  });

  try {
    await printWindow.loadURL(
      `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`
    );

    await new Promise((resolve) => setTimeout(resolve, 500));

    const configManager = ConfigurationManager.getInstance();
    const defaultExportPath = configManager.getExportPath();

    let finalFilePath: string | null = null;
    const isCoverLetterFile = isCoverLetter(fileName);

    if (defaultExportPath && defaultExportPath.trim() !== "") {
      const folderName = cleanFolderName(fileName);
      const targetFolder = path.join(defaultExportPath, folderName);
      if (!fs.existsSync(targetFolder)) {
        fs.mkdirSync(targetFolder, { recursive: true });
      }
      finalFilePath = getUniqueFilePath(targetFolder, fileName);
    } else {
      const { filePath } = await dialog.showSaveDialog({
        defaultPath: path.join(app.getPath("downloads"), fileName),
        filters: [{ name: "Fichier PDF", extensions: ["pdf"] }],
      });

      finalFilePath = filePath || null;
    }

    if (!finalFilePath) {
      return false;
    }

    const data = await printWindow.webContents.printToPDF({
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      pageSize: "A4",
      printBackground: true,
      preferCSSPageSize: true,
    });

    fs.writeFileSync(finalFilePath, data);

    if (applicationId) {
      const applicationManager = JobApplicationManager.getInstance();
      if (isCoverLetterFile) {
        applicationManager.updateExportedDocuments(applicationId, { coverFilePath: finalFilePath });
      } else {
        applicationManager.updateExportedDocuments(applicationId, { pdfFilePath: finalFilePath });
      }
    }
    return finalFilePath;
  } catch (e: unknown) {
    console.error("Error generating PDF:", e);
    return null;
  } finally {
    printWindow.close();
  }
};