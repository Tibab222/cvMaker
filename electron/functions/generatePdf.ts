import { app, BrowserWindow, dialog } from "electron";
import * as fs from "fs";
import path from "path";
import { ConfigurationManager } from "../services/config/ConfigurationManager";

/**
 * Generate a unique folder path by appending a counter if the folder already exists.
 * @param basePath The base directory where the folder should be created.
 * @param folderName The desired name of the folder.
 * @returns A unique folder path that does not currently exist.
 */
const getUniqueFolderPath = (basePath: string, folderName: string): string => {
  let targetPath = path.join(basePath, folderName);
  let counter = 1;

  while (fs.existsSync(targetPath)) {
    targetPath = path.join(basePath, `${folderName} (${counter})`);
    counter++;
  }

  return targetPath;
};

export const generatePdf = async (htmlContent: string, fileName: string) => {
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

    if (defaultExportPath && defaultExportPath.trim() !== "") {
      const rawName = path.parse(fileName).name;
      const targetFolder = getUniqueFolderPath(defaultExportPath, rawName);

      fs.mkdirSync(targetFolder, { recursive: true });

      const cleanFileName = fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`;
      finalFilePath = path.join(targetFolder, cleanFileName);
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
    return true;
  } catch (e: unknown) {
    console.error("Error generating PDF:", e);
    return false;
  } finally {
    printWindow.close();
  }
};