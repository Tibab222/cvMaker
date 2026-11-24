import { parseCvm, type CvmTemplate } from "@shared/cvm/format";

/**
 * Templates shipped with the app: every src/templates/*.cvm file. To add a default template, drop a .cvm file
 * there; it is bundled at build time and listed in the template picker.
 */
const files = import.meta.glob("../templates/*.cvm", { query: "?raw", import: "default", eager: true }) as Record<string, string>;

/** Order of the built-ins in the picker; unknown ids come after, alphabetically. */
const ORDER = ["classic", "ats-classic", "modern-sidebar", "elegant"];

export const DEFAULT_TEMPLATE_ID = "classic";

export const BUILT_IN_TEMPLATES: CvmTemplate[] = Object.entries(files)
    .map(([path, source]) => {
        const result = parseCvm(source);
        if (!result.ok) {
            // a broken built-in is a bug of the app, not of the user: make it loud in development
            console.error(`[cvm] Built-in template ${path} is invalid: ${result.error}`);
            return null;
        }
        return result.template;
    })
    .filter((template): template is CvmTemplate => template !== null)
    .sort((a, b) => {
        const ia = ORDER.indexOf(a.meta.id);
        const ib = ORDER.indexOf(b.meta.id);
        if (ia !== -1 || ib !== -1) return (ia === -1 ? Infinity : ia) - (ib === -1 ? Infinity : ib);
        return a.meta.name.localeCompare(b.meta.name);
    });

export const BUILT_IN_IDS = BUILT_IN_TEMPLATES.map((template) => template.meta.id);
