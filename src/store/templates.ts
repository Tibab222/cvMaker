import { create } from "zustand";
import { toast } from "sonner";
import { api } from "@/api";
import { parseCvm, type CvmTemplate } from "@shared/cvm/format";
import { BUILT_IN_IDS, BUILT_IN_TEMPLATES, DEFAULT_TEMPLATE_ID } from "@/cvm/builtins";

export interface TemplateEntry {
    template: CvmTemplate;
    builtIn: boolean;
    /** File in the user templates folder (imported templates only). */
    fileName?: string;
}

/** A file of the templates folder that is not a valid template (edited by hand…): listed so it can be fixed. */
export interface BrokenTemplate {
    fileName: string;
    error: string;
}

const DEFAULT_KEY = "cvm.defaultTemplateId";

type TemplateState = {
    templates: TemplateEntry[];
    broken: BrokenTemplate[];
    loaded: boolean;
    /** Template of new resumes. */
    defaultId: string;
    load: () => Promise<void>;
    get: (id: string | undefined) => TemplateEntry;
    setDefault: (id: string) => void;
    importTemplates: () => Promise<string[]>;
    remove: (entry: TemplateEntry) => Promise<void>;
    exportTemplate: (entry: TemplateEntry) => Promise<void>;
    openFolder: () => Promise<void>;
};

const builtInEntries: TemplateEntry[] = BUILT_IN_TEMPLATES.map((template) => ({ template, builtIn: true }));

export const useTemplateStore = create<TemplateState>((set, get) => ({
    templates: builtInEntries,
    broken: [],
    loaded: false,
    defaultId: localStorage.getItem(DEFAULT_KEY) || DEFAULT_TEMPLATE_ID,

    load: async () => {
        try {
            const files = await api.templates.list();
            const imported: TemplateEntry[] = [];
            const broken: BrokenTemplate[] = [];
            for (const file of files) {
                const result = parseCvm(file.source);
                if (!result.ok) broken.push({ fileName: file.fileName, error: result.error });
                else if (BUILT_IN_IDS.includes(result.template.meta.id)) broken.push({ fileName: file.fileName, error: "Same id as a built-in template." });
                else imported.push({ template: result.template, builtIn: false, fileName: file.fileName });
            }
            imported.sort((a, b) => a.template.meta.name.localeCompare(b.template.meta.name));
            set({ templates: [...builtInEntries, ...imported], broken, loaded: true });
        } catch (error) {
            console.error("[templates] Could not list the user templates:", error);
            set({ loaded: true });
        }
    },

    /** The template with this id, or the default one (a resume may name a template that was deleted since). */
    get: (id) => {
        const { templates, defaultId } = get();
        return templates.find((entry) => entry.template.meta.id === id)
            ?? templates.find((entry) => entry.template.meta.id === defaultId)
            ?? templates.find((entry) => entry.template.meta.id === DEFAULT_TEMPLATE_ID)
            ?? templates[0];
    },

    setDefault: (id) => {
        localStorage.setItem(DEFAULT_KEY, id);
        set({ defaultId: id });
    },

    /** Returns the ids of the imported templates. */
    importTemplates: async () => {
        const result = await api.templates.import(BUILT_IN_IDS);
        if (result.canceled) return [];
        for (const { file, error } of result.errors) toast.error(`Could not import ${file}`, { description: error });
        if (result.imported.length) {
            await get().load();
            const names = result.imported.map((item) => `${item.name}${item.replaced ? " (updated)" : ""}`).join(", ");
            toast.success(result.imported.length > 1 ? "Templates imported" : "Template imported", { description: names });
        }
        return result.imported.map((item) => item.id);
    },

    remove: async (entry) => {
        if (entry.builtIn || !entry.fileName) return;
        await api.templates.remove(entry.fileName);
        if (get().defaultId === entry.template.meta.id) get().setDefault(DEFAULT_TEMPLATE_ID);
        await get().load();
        toast.success(`Template "${entry.template.meta.name}" deleted`);
    },

    exportTemplate: async (entry) => {
        try {
            const filePath = await api.templates.export(entry.template.source, entry.template.meta.id);
            if (filePath) toast.success("Template exported", { description: filePath });
        } catch (error) {
            toast.error("Could not export the template", { description: (error as Error).message });
        }
    },

    openFolder: () => api.templates.openFolder(),
}));
