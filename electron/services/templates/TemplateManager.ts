import { app, dialog, shell } from "electron";
import * as fs from "fs";
import path from "path";
import { CVM_EXTENSION, CVM_MAX_SIZE, parseCvm } from "../../../shared/cvm/format";
import type { TemplateImportResult, UserTemplateFile } from "../../../shared/cvm/ipc.types";

/**
 * User resume templates: .cvm files in <userData>/templates. Built-in templates ship with the renderer;
 * this folder only holds imported ones, saved as <id>.cvm so re-importing a template updates it.
 */
export class TemplateManager {
    private static instance: TemplateManager | null = null;
    private readonly dir = path.join(app.getPath("userData"), "templates");

    public static getInstance(): TemplateManager {
        if (!TemplateManager.instance) TemplateManager.instance = new TemplateManager();
        return TemplateManager.instance;
    }

    private ensureDir() {
        fs.mkdirSync(this.dir, { recursive: true });
    }

    /** Only a plain file name inside the templates folder: never a path the renderer could point elsewhere. */
    private resolve(fileName: string): string {
        const base = path.basename(fileName);
        if (base !== fileName || !base.toLowerCase().endsWith(CVM_EXTENSION)) throw new Error("Invalid template file name.");
        return path.join(this.dir, base);
    }

    public async list(): Promise<UserTemplateFile[]> {
        this.ensureDir();
        const names = (await fs.promises.readdir(this.dir)).filter((name) => name.toLowerCase().endsWith(CVM_EXTENSION));
        const files: UserTemplateFile[] = [];
        for (const fileName of names) {
            try {
                const filePath = path.join(this.dir, fileName);
                if ((await fs.promises.stat(filePath)).size > CVM_MAX_SIZE) continue;
                files.push({ fileName, source: await fs.promises.readFile(filePath, "utf-8") });
            } catch (error) {
                console.warn(`[TemplateManager] Could not read ${fileName}:`, error);
            }
        }
        return files;
    }

    /**
     * Asks for .cvm files, validates them and copies them into the templates folder.
     * `reservedIds` are the built-in template ids: an import may not shadow them.
     */
    public async importFromDialog(reservedIds: string[]): Promise<TemplateImportResult> {
        const { canceled, filePaths } = await dialog.showOpenDialog({
            title: "Import resume templates",
            filters: [{ name: "Resume template", extensions: [CVM_EXTENSION.slice(1)] }],
            properties: ["openFile", "multiSelections"],
        });
        const result: TemplateImportResult = { canceled, imported: [], errors: [] };
        if (canceled) return result;
        this.ensureDir();

        for (const filePath of filePaths) {
            const file = path.basename(filePath);
            try {
                if ((await fs.promises.stat(filePath)).size > CVM_MAX_SIZE) throw new Error(`The file is larger than ${CVM_MAX_SIZE / 1024 / 1024} MB.`);
                const source = await fs.promises.readFile(filePath, "utf-8");
                const parsed = parseCvm(source);
                if (!parsed.ok) throw new Error(parsed.error);
                const { id, name } = parsed.template.meta;
                if (reservedIds.includes(id)) throw new Error(`"${id}" is the id of a built-in template: change the "id" in <meta>.`);
                const target = this.resolve(`${id}${CVM_EXTENSION}`);
                const replaced = fs.existsSync(target);
                await fs.promises.writeFile(target, source, "utf-8");
                result.imported.push({ id, name, replaced });
            } catch (error) {
                result.errors.push({ file, error: (error as Error).message });
            }
        }
        return result;
    }

    public async remove(fileName: string): Promise<boolean> {
        const target = this.resolve(fileName);
        if (!fs.existsSync(target)) return false;
        await fs.promises.unlink(target);
        return true;
    }

    /** Saves a template (built-in or imported) where the user wants, e.g. to start a new one from it. */
    public async exportToDialog(source: string, suggestedName: string): Promise<string | null> {
        const parsed = parseCvm(source);
        if (!parsed.ok) throw new Error(parsed.error);
        const safeName = path.basename(suggestedName).replace(/[/\\:*?"<>|]/g, "") || "template";
        const { canceled, filePath } = await dialog.showSaveDialog({
            title: "Export resume template",
            defaultPath: path.join(app.getPath("documents"), safeName.endsWith(CVM_EXTENSION) ? safeName : `${safeName}${CVM_EXTENSION}`),
            filters: [{ name: "Resume template", extensions: [CVM_EXTENSION.slice(1)] }],
        });
        if (canceled || !filePath) return null;
        await fs.promises.writeFile(filePath, source, "utf-8");
        return filePath;
    }

    public async openFolder(): Promise<void> {
        this.ensureDir();
        await shell.openPath(this.dir);
    }
}
