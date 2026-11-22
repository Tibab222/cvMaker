import { app, BrowserWindow, dialog, shell } from "electron";
import fs from "node:fs";
import path from "node:path";
import { format } from "date-fns";
import type { QuestionsExportFormat, QuestionsExportRequest, QuestionsExportResult } from "../../../shared/interviewQuestions.types";
import type { InterviewQuestionsManager } from "./InterviewQuestionsManager";
import { exportFileName, questionsDocx, questionsHtml, questionsXlsx, type QuestionsDocument } from "./questionsExport";

const FILTERS: Record<QuestionsExportFormat, Electron.FileFilter> = {
    pdf: { name: "PDF document", extensions: ["pdf"] },
    docx: { name: "Word document", extensions: ["docx"] },
    xlsx: { name: "Excel workbook", extensions: ["xlsx"] },
};

/** The file written last, the only one the renderer may ask to open (it never sends a path). */
let lastExport: string | null = null;
/** Folder of the last export, offered again next time. */
let lastFolder: string | null = null;

async function printPdf(html: string): Promise<Buffer> {
    const window = new BrowserWindow({ show: false, webPreferences: { offscreen: true, nodeIntegration: false, javascript: false } });
    try {
        await window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
        return await window.webContents.printToPDF({ pageSize: "A4", printBackground: true, preferCSSPageSize: true });
    } finally {
        window.close();
    }
}

/** Asks where to save the chosen questions, then writes them in the chosen format. */
export async function exportQuestions(manager: InterviewQuestionsManager, request: QuestionsExportRequest, owner: BrowserWindow | null): Promise<QuestionsExportResult> {
    try {
        const kind = request?.format;
        if (kind !== "pdf" && kind !== "docx" && kind !== "xlsx") return { ok: false, error: "Unknown export format." };
        const byId = new Map(manager.list().map((question) => [question.id, question]));
        const ids = Array.isArray(request.questionIds) ? request.questionIds : [];
        const questions = ids.map((id) => byId.get(id)).filter((question) => question !== undefined);
        if (!questions.length) return { ok: false, error: "No question to export." };

        const scope = typeof request.scope === "string" ? request.scope.replace(/\s+/g, " ").trim().slice(0, 150) : "";
        const title = scope ? `Interview questions - ${scope}` : "Interview questions";
        const unanswered = questions.filter((question) => !question.answer).length;
        const doc: QuestionsDocument = {
            title,
            subtitle: [
                `${questions.length} question${questions.length > 1 ? "s" : ""}`,
                unanswered ? `${unanswered} still to prepare` : "",
                format(new Date(), "d MMMM yyyy"),
            ].filter(Boolean).join(" · "),
            questions,
        };

        const fileName = exportFileName(title, kind);
        const options: Electron.SaveDialogOptions = {
            title: "Export interview questions",
            defaultPath: path.join(lastFolder ?? app.getPath("documents"), fileName),
            filters: [FILTERS[kind]],
        };
        const { canceled, filePath } = owner ? await dialog.showSaveDialog(owner, options) : await dialog.showSaveDialog(options);
        if (canceled || !filePath) return { ok: false, cancelled: true };

        const data = kind === "pdf" ? await printPdf(questionsHtml(doc)) : kind === "docx" ? questionsDocx(doc) : questionsXlsx(doc);
        fs.writeFileSync(filePath, data);
        lastExport = filePath;
        lastFolder = path.dirname(filePath);
        return { ok: true, fileName: path.basename(filePath) };
    } catch (error) {
        console.error("[InterviewQuestions] Export failed:", error);
        const busy = error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "EBUSY";
        return { ok: false, error: busy ? "The file is open in another app: close it and export again." : "The questions could not be exported." };
    }
}

/** Opens the file just exported in its default app. */
export async function openLastExport(): Promise<boolean> {
    if (!lastExport || !fs.existsSync(lastExport)) return false;
    return (await shell.openPath(lastExport)) === "";
}
