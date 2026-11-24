/**
 * The .cvm resume template format.
 *
 * A .cvm file is plain text with three parts, like a Vue single-file component:
 *
 *   <cvm version="1">
 *   <meta> { JSON, see CvmMeta } </meta>
 *   <template> HTML with Handlebars syntax and the cvMaker helpers </template>
 *   <style> CSS, scoped to the template </style>
 *   </cvm>
 *
 * This file only parses and validates: it has no DOM or Node dependency, so the main process (import) and the
 * renderer (display) share it. See docs/templates.md for the template author guide.
 */

export const CVM_FORMAT_VERSION = 1;
export const CVM_EXTENSION = ".cvm";
/** Imported templates bigger than this are refused (embedded fonts/images are expected, whole books are not). */
export const CVM_MAX_SIZE = 3 * 1024 * 1024;

export type CvmPageSize = "A4" | "Letter";

/** Page dimensions in millimetres. */
export const PAGE_SIZES_MM: Record<CvmPageSize, { width: number; height: number }> = {
    A4: { width: 210, height: 297 },
    Letter: { width: 215.9, height: 279.4 },
};

/** Profile lists a template can ask the user to pick a second (third…) time, e.g. a project appendix. */
export type CvmCollectionSource = "projects" | "experiences" | "education" | "skills";
export const CVM_COLLECTION_SOURCES: CvmCollectionSource[] = ["projects", "experiences", "education", "skills"];

export interface CvmCollection {
    /** Which profile list the user picks from. */
    source: CvmCollectionSource;
    /** Tab name in the resume picker. */
    label: string;
    /** Projects only: show every bullet ("all", default) or only the bullets picked for the resume ("selected"). */
    bullets?: "all" | "selected";
}

export interface CvmMeta {
    /** Unique id, lowercase letters, digits and dashes. An imported template with the id of another replaces it. */
    id: string;
    name: string;
    description?: string;
    author?: string;
    version?: string;
    page: {
        size: CvmPageSize;
        /** CSS margin shorthand with absolute units, e.g. "15mm" or "11mm 14mm". */
        margin: string;
    };
    /** CSS custom properties set on the resume root: { "accent": "#2563eb" } → var(--accent). */
    vars?: Record<string, string>;
    /** Extra selections the template needs, available in the template under their key. */
    collections?: Record<string, CvmCollection>;
    /** Template labels by language, read with {{t "key"}}; they win over the built-in labels. */
    i18n?: Record<string, Record<string, string>>;
}

export interface CvmTemplate {
    meta: CvmMeta;
    /** Handlebars HTML. */
    template: string;
    /** Raw (unsanitized) CSS of the <style> part. */
    css: string;
    /** The whole file, kept to export the template again as-is. */
    source: string;
}

export type CvmParseResult = { ok: true; template: CvmTemplate } | { ok: false; error: string };

/** Names the template context already uses: a collection cannot shadow them. */
export const RESERVED_CONTEXT_KEYS = new Set([
    "profile", "header", "photo", "contacts", "summary", "experiences", "projects", "skills", "education",
    "all", "lang", "page", "meta", "vars", "collections",
]);

const ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;
const KEY_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]{0,63}$/;
const VAR_PATTERN = /^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/;
const LENGTH = String.raw`\d+(?:\.\d+)?(?:mm|cm|in|pt|px)|0`;
const MARGIN_PATTERN = new RegExp(`^(?:${LENGTH})(?:\\s+(?:${LENGTH})){0,3}$`);

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

const optionalString = (value: unknown, name: string, max = 500): string | undefined => {
    if (value === undefined) return undefined;
    if (typeof value !== "string") throw new Error(`"${name}" must be a string.`);
    if (value.length > max) throw new Error(`"${name}" is longer than ${max} characters.`);
    return value;
};

/** Returns the text between the first <tag> and the matching closing tag (the last one when `last` is set). */
const extractSection = (source: string, tag: string, last = false): { content: string; start: number; end: number } | null => {
    const open = new RegExp(`<${tag}(?:\\s[^>]*)?>`, "i").exec(source);
    if (!open) return null;
    const closeTag = `</${tag}>`;
    const lower = source.toLowerCase();
    const closeIndex = last ? lower.lastIndexOf(closeTag) : lower.indexOf(closeTag, open.index + open[0].length);
    if (closeIndex < open.index) throw new Error(`<${tag}> is never closed.`);
    return {
        content: source.slice(open.index + open[0].length, closeIndex),
        start: open.index,
        end: closeIndex + closeTag.length,
    };
};

const validateVars = (value: unknown): Record<string, string> | undefined => {
    if (value === undefined) return undefined;
    if (!isRecord(value)) throw new Error(`"vars" must be an object of CSS values.`);
    const vars: Record<string, string> = {};
    for (const [key, raw] of Object.entries(value)) {
        if (!VAR_PATTERN.test(key)) throw new Error(`"vars.${key}" is not a valid CSS variable name.`);
        if (typeof raw !== "string" && typeof raw !== "number") throw new Error(`"vars.${key}" must be a string.`);
        const css = String(raw);
        // a value is set in a style attribute: it may not close the declaration or fetch anything
        if (/[;{}<>]|url\s*\(|expression\s*\(|@import/i.test(css)) throw new Error(`"vars.${key}" contains forbidden characters.`);
        vars[key] = css;
    }
    return vars;
};

const validateCollections = (value: unknown): Record<string, CvmCollection> | undefined => {
    if (value === undefined) return undefined;
    if (!isRecord(value)) throw new Error(`"collections" must be an object.`);
    const collections: Record<string, CvmCollection> = {};
    for (const [key, raw] of Object.entries(value)) {
        if (!KEY_PATTERN.test(key)) throw new Error(`"collections.${key}": names use letters, digits and _ only.`);
        if (RESERVED_CONTEXT_KEYS.has(key)) throw new Error(`"collections.${key}": this name is already used by the template data.`);
        if (!isRecord(raw)) throw new Error(`"collections.${key}" must be an object.`);
        const source = raw.source as CvmCollectionSource;
        if (!CVM_COLLECTION_SOURCES.includes(source)) {
            throw new Error(`"collections.${key}.source" must be one of ${CVM_COLLECTION_SOURCES.join(", ")}.`);
        }
        const bullets = raw.bullets;
        if (bullets !== undefined && bullets !== "all" && bullets !== "selected") {
            throw new Error(`"collections.${key}.bullets" must be "all" or "selected".`);
        }
        collections[key] = {
            source,
            label: optionalString(raw.label, `collections.${key}.label`, 40) || key,
            ...(bullets ? { bullets } : {}),
        };
    }
    return collections;
};

const validateI18n = (value: unknown): Record<string, Record<string, string>> | undefined => {
    if (value === undefined) return undefined;
    if (!isRecord(value)) throw new Error(`"i18n" must be an object: { "en": { "key": "label" } }.`);
    const i18n: Record<string, Record<string, string>> = {};
    for (const [lang, labels] of Object.entries(value)) {
        if (!isRecord(labels)) throw new Error(`"i18n.${lang}" must be an object.`);
        i18n[lang] = {};
        for (const [key, label] of Object.entries(labels)) {
            i18n[lang][key] = optionalString(label, `i18n.${lang}.${key}`) ?? "";
        }
    }
    return i18n;
};

/** Checks the <meta> JSON and fills the defaults. Throws a readable error. */
export const validateMeta = (raw: unknown): CvmMeta => {
    if (!isRecord(raw)) throw new Error("<meta> must contain a JSON object.");
    const id = raw.id;
    if (typeof id !== "string" || !ID_PATTERN.test(id)) {
        throw new Error(`"id" is required: lowercase letters, digits and dashes (e.g. "modern-sidebar").`);
    }
    const name = optionalString(raw.name, "name", 80);
    if (!name?.trim()) throw new Error(`"name" is required.`);

    const page = raw.page === undefined ? {} : raw.page;
    if (!isRecord(page)) throw new Error(`"page" must be an object.`);
    const size = (page.size ?? "A4") as CvmPageSize;
    if (!(size in PAGE_SIZES_MM)) throw new Error(`"page.size" must be ${Object.keys(PAGE_SIZES_MM).join(" or ")}.`);
    const margin = String(page.margin ?? "15mm").trim();
    if (!MARGIN_PATTERN.test(margin)) throw new Error(`"page.margin" must be a CSS margin with absolute units, e.g. "15mm" or "11mm 14mm".`);

    return {
        id,
        name: name.trim(),
        description: optionalString(raw.description, "description", 300),
        author: optionalString(raw.author, "author", 80),
        version: optionalString(raw.version, "version", 20),
        page: { size, margin },
        vars: validateVars(raw.vars),
        collections: validateCollections(raw.collections),
        i18n: validateI18n(raw.i18n),
    };
};

/** Parses and validates a .cvm file. Never throws. */
export const parseCvm = (source: string): CvmParseResult => {
    try {
        if (typeof source !== "string" || !source.trim()) throw new Error("The file is empty.");
        if (source.length > CVM_MAX_SIZE) throw new Error(`The file is larger than ${CVM_MAX_SIZE / 1024 / 1024} MB.`);

        const root = /<cvm(?:\s+version\s*=\s*["']?(\d+)["']?)?\s*>/i.exec(source);
        if (!root) throw new Error(`Not a .cvm file: it must start with <cvm version="${CVM_FORMAT_VERSION}">.`);
        const version = Number(root[1] ?? CVM_FORMAT_VERSION);
        if (version > CVM_FORMAT_VERSION) {
            throw new Error(`This template needs a newer version of the app (format ${version}, supported ${CVM_FORMAT_VERSION}).`);
        }

        const metaSection = extractSection(source, "meta");
        if (!metaSection) throw new Error("The <meta> part is missing.");
        let rawMeta: unknown;
        try {
            rawMeta = JSON.parse(metaSection.content);
        } catch (e) {
            throw new Error(`<meta> is not valid JSON: ${(e as Error).message}`);
        }
        const meta = validateMeta(rawMeta);

        // the template may contain anything, so it runs to the LAST </template>
        const templateSection = extractSection(source, "template", true);
        if (!templateSection || !templateSection.content.trim()) throw new Error("The <template> part is missing or empty.");

        // <style> is searched outside the template, which may legitimately mention the word
        const outside = source.slice(0, templateSection.start) + source.slice(templateSection.end);
        const styleSection = extractSection(outside, "style");

        return {
            ok: true,
            template: { meta, template: templateSection.content, css: styleSection?.content ?? "", source },
        };
    } catch (e) {
        return { ok: false, error: (e as Error).message };
    }
};

/** Splits a CSS margin shorthand into millimetres (top, right, bottom, left). */
export const parseMarginMm = (margin: string): { top: number; right: number; bottom: number; left: number } => {
    const toMm = (part: string): number => {
        const value = parseFloat(part);
        if (!Number.isFinite(value)) return 0;
        if (part.endsWith("cm")) return value * 10;
        if (part.endsWith("in")) return value * 25.4;
        if (part.endsWith("pt")) return (value * 25.4) / 72;
        if (part.endsWith("px")) return (value * 25.4) / 96;
        return value; // mm or 0
    };
    const parts = margin.trim().split(/\s+/).map(toMm);
    const [top, right = top, bottom = top, left = right] = parts;
    return { top, right, bottom, left };
};
