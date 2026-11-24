/**
 * Renders a .cvm template: Handlebars + the cvMaker helpers, then HTML sanitizing.
 *
 * Editable parts ({{edit}}, {{editSummary}}) are not rendered as text in "interactive" mode: they become empty
 * <cv-slot data-slot="N"> markers, and CvmDocument mounts the React editors (click-to-edit, AI rewrite
 * placeholder, bullet tools) into them. In "static" mode (thumbnails) they are plain text.
 *
 * To offer a new helper to templates, register it in registerHelpers() and document it in docs/templates.md.
 */
import Handlebars from "handlebars";
import { format as formatDate, isValid } from "date-fns";
import { enUS, fr } from "date-fns/locale";
import type { CvmTemplate } from "@shared/cvm/format";
import type { EntityType } from "@shared/utils";
import { resumeLabel } from "@/components/cvMaker/cvTemplate/i18n";
import { iconSvg } from "./icons";
import { sanitizeTemplateHtml } from "./sanitizeHtml";
import type { Editable } from "./context";

export type FieldDisplay = "text" | "bullets" | "lines";

export type SlotSpec =
    | {
        kind: "field";
        entityType: EntityType;
        id: string;
        field: string;
        /** Value before any on-resume edit (what "reset" goes back to). */
        defaultValue: string;
        multiline: boolean;
        display: FieldDisplay;
        placeholder?: string;
        className?: string;
    }
    | { kind: "summary"; display: "bullets" | "paragraph"; className?: string };

export type RenderMode = "interactive" | "static";

export interface RenderOutput {
    html: string;
    slots: SlotSpec[];
    error?: string;
}

interface Runtime {
    mode: RenderMode;
    slots: SlotSpec[];
    lang: string;
    i18n?: Record<string, Record<string, string>>;
}

type HelperOptions = Handlebars.HelperOptions & { data: { cvm: Runtime } };

const escape = (value: unknown) => Handlebars.Utils.escapeExpression(value === undefined || value === null ? "" : String(value));

/** Escapes text and turns the **bold** marks the editors write into <strong>. */
export const formatText = (value: unknown): string =>
    escape(value).replace(/\*\*([\s\S]+?)\*\*/g, "<strong>$1</strong>");

/** One line per bullet, without the bullet characters people type ("-", "•", "●"…). */
export const splitLines = (value: unknown): string[] =>
    String(value ?? "")
        .split(/\r?\n/)
        .map((line) => line.replace(/^\s*(?:[-*•●▪◦–]\s+)/, "").trim())
        .filter(Boolean);

/** Static HTML of a field, the same markup the interactive editors produce (so the CSS is the same). */
export const staticFieldHtml = (value: string, display: FieldDisplay): string => {
    if (display === "bullets") {
        return `<ul class="cv-bullets">${splitLines(value).map((line) => `<li>${formatText(line)}</li>`).join("")}</ul>`;
    }
    if (display === "lines") return splitLines(value).map(formatText).join("<br>");
    return formatText(value);
};

/** Handlebars passes its options object as the last argument; the others are the template's arguments. */
const splitArgs = (args: unknown[]): { params: unknown[]; options: HelperOptions } => {
    const options = args[args.length - 1] as HelperOptions;
    return { params: args.slice(0, -1), options };
};

const isEditable = (value: unknown): value is Editable =>
    typeof value === "object" && value !== null && "__type" in value && "id" in value;

const toDate = (value: unknown): Date | "year" | null => {
    if (value instanceof Date) return isValid(value) ? value : null;
    if (typeof value !== "string" || !value.trim()) return null;
    const text = value.trim();
    if (/^\d{4}$/.test(text)) return "year";
    const monthOnly = /^(\d{4})-(\d{2})$/.exec(text);
    const date = monthOnly ? new Date(Number(monthOnly[1]), Number(monthOnly[2]) - 1, 1) : new Date(text);
    return isValid(date) ? date : null;
};

const registerHelpers = (hb: typeof Handlebars) => {
    const label = (key: string, options: HelperOptions) => resumeLabel(options.data.cvm.lang, key, options.data.cvm.i18n);

    const dateText = (value: unknown, pattern: string, options: HelperOptions): string => {
        if (value === "Present") return label("present", options);
        const date = toDate(value);
        if (date === "year") return String(value).trim();
        if (!date) return "";
        const locale = options.data.cvm.lang === "fr" ? fr : enUS;
        // "janv." → "janv": the dot of abbreviated months looks odd on a resume
        return formatDate(date, pattern, { locale }).replace(/\.(?=\s|$)/g, "");
    };

    /** {{t "key"}}: label in the resume language. */
    hb.registerHelper("t", (key: string, options: HelperOptions) => label(String(key), options));

    /** {{date value "MMM yyyy"}}: date-fns pattern, "Present" → localized, "YYYY" kept as is. */
    hb.registerHelper("date", (...args: unknown[]) => {
        const { params, options } = splitArgs(args);
        return dateText(params[0], typeof params[1] === "string" ? params[1] : "MMM yyyy", options);
    });

    /** {{period startDate endDate "MMM yyyy" sep=" – "}}: "Apr 2024 – Mar 2026", "2023", "2024 – Present". */
    hb.registerHelper("period", (...args: unknown[]) => {
        const { params, options } = splitArgs(args);
        const pattern = typeof params[2] === "string" ? params[2] : "MMM yyyy";
        const start = dateText(params[0], pattern, options);
        const end = dateText(params[1], pattern, options);
        const sep = typeof options.hash.sep === "string" ? options.hash.sep : " – ";
        if (start && end && start !== end) return `${start}${sep}${end}`;
        return start || end;
    });

    /** {{#if (future endDate)}}: the date is after today (an expected graduation…). */
    hb.registerHelper("future", (value: unknown) => {
        const date = toDate(value);
        if (date === "year") return Number(value) > new Date().getFullYear();
        return date instanceof Date && date.getTime() > Date.now();
    });

    /** {{year value}}: the year only. */
    hb.registerHelper("year", (value: unknown, options: HelperOptions) => dateText(value, "yyyy", options));

    hb.registerHelper("upper", (value: unknown) => String(value ?? "").toLocaleUpperCase());
    hb.registerHelper("lower", (value: unknown) => String(value ?? "").toLocaleLowerCase());
    hb.registerHelper("capitalize", (value: unknown) => {
        const text = String(value ?? "");
        return text.charAt(0).toLocaleUpperCase() + text.slice(1);
    });

    /** {{fmt text}}: text with its **bold** marks rendered. */
    hb.registerHelper("fmt", (value: unknown) => new hb.SafeString(formatText(value)));

    /** {{shortUrl link}}: "https://www.site.com/a/" → "site.com/a". */
    hb.registerHelper("shortUrl", (value: unknown) => String(value ?? "").replace(/^[a-z]+:\/\/(www\.)?/i, "").replace(/\/$/, ""));

    /** {{href link}}: adds https:// to links typed without it. */
    hb.registerHelper("href", (value: unknown) => {
        const url = String(value ?? "").trim();
        return /^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}`;
    });

    /** {{join list ", "}} or {{join list ", " "name"}} for a list of objects. */
    hb.registerHelper("join", (...args: unknown[]) => {
        const { params } = splitArgs(args);
        const [list, sep = ", ", field] = params as [unknown, string?, string?];
        if (!Array.isArray(list)) return "";
        return list
            .map((item) => (field && typeof item === "object" && item ? (item as Record<string, unknown>)[field] : item))
            .filter((item) => item !== undefined && item !== null && String(item).trim() !== "")
            .join(sep);
    });

    /** {{#each (groupBy skills "category")}} {{key}}: {{join items ", " "name"}} {{/each}}, in first-seen order. */
    hb.registerHelper("groupBy", (...args: unknown[]) => {
        const { params, options } = splitArgs(args);
        const [list, field] = params as [unknown, string];
        if (!Array.isArray(list)) return [];
        const fallback = typeof options.hash.fallback === "string" ? options.hash.fallback : label("other", options);
        const groups = new Map<string, unknown[]>();
        for (const item of list) {
            const raw = (item as Record<string, unknown>)?.[field];
            const key = typeof raw === "string" && raw.trim() ? raw.trim() : fallback;
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key)!.push(item);
        }
        return [...groups.entries()].map(([key, items]) => ({ key, items }));
    });

    /** {{#each (where education "kind" "certification")}}: items whose field equals the value. */
    hb.registerHelper("where", (list: unknown, field: string, value: unknown) =>
        Array.isArray(list) ? list.filter((item) => (item as Record<string, unknown>)?.[field] === value) : []);
    /** {{#each (whereNot education "kind" "certification")}}: the others (missing field included). */
    hb.registerHelper("whereNot", (list: unknown, field: string, value: unknown) =>
        Array.isArray(list) ? list.filter((item) => (item as Record<string, unknown>)?.[field] !== value) : []);

    /** {{#each (limit projects 3)}}. */
    hb.registerHelper("limit", (list: unknown, count: number) => (Array.isArray(list) ? list.slice(0, Number(count) || 0) : []));
    /** {{#each (lines description)}}: one item per line of a text. */
    hb.registerHelper("lines", (value: unknown) => splitLines(value));
    /** {{count list}}. */
    hb.registerHelper("count", (list: unknown) => (Array.isArray(list) ? list.length : 0));

    hb.registerHelper("eq", (a: unknown, b: unknown) => a === b);
    hb.registerHelper("ne", (a: unknown, b: unknown) => a !== b);
    hb.registerHelper("gt", (a: unknown, b: unknown) => Number(a) > Number(b));
    hb.registerHelper("lt", (a: unknown, b: unknown) => Number(a) < Number(b));
    hb.registerHelper("not", (a: unknown) => !a || (Array.isArray(a) && a.length === 0));
    hb.registerHelper("and", (...args: unknown[]) => splitArgs(args).params.every((value) => Array.isArray(value) ? value.length > 0 : !!value));
    hb.registerHelper("or", (...args: unknown[]) => splitArgs(args).params.find((value) => Array.isArray(value) ? value.length > 0 : !!value) ?? false);
    /** {{default subtitle "—"}}: the first non-empty value. */
    hb.registerHelper("default", (...args: unknown[]) => splitArgs(args).params.find((value) => value !== undefined && value !== null && value !== "") ?? "");
    hb.registerHelper("concat", (...args: unknown[]) => splitArgs(args).params.map((value) => String(value ?? "")).join(""));

    /** {{icon "mail" 12}}: inline SVG icon coloured by CSS `color`. */
    hb.registerHelper("icon", (...args: unknown[]) => {
        const { params, options } = splitArgs(args);
        const size = Number(params[1]) || 12;
        const stroke = Number(options.hash.stroke) || 2;
        return new hb.SafeString(iconSvg(String(params[0] ?? ""), size, stroke));
    });

    /** {{pageBreak}}: the next content starts on a new page (the preview shows it too). */
    hb.registerHelper("pageBreak", () => new hb.SafeString('<div class="cv-page-break"></div>'));

    /**
     * {{edit this "jobTitle"}}, {{edit this "description" display="bullets"}},
     * {{edit "section:skills" "title" (t "skills")}}: a field the user can click to change on the resume.
     * Hash: multiline=true, display="text|bullets|lines", placeholder="…", class="…".
     */
    hb.registerHelper("edit", (...args: unknown[]) => {
        const { params, options } = splitArgs(args);
        const [target, rawField, fallback] = params;
        const field = String(rawField ?? "");
        let entityType: EntityType;
        let id: string;
        let value: unknown;
        let original: unknown;
        if (isEditable(target)) {
            entityType = target.__type;
            id = target.id;
            value = (target as unknown as Record<string, unknown>)[field];
            original = target.__orig[field];
        } else if (typeof target === "string" && target.includes(":")) {
            [entityType, id] = target.split(":", 2) as [EntityType, string];
            value = fallback;
            original = fallback;
        } else {
            return ""; // nothing editable: the template passed something else
        }
        const display = (["text", "bullets", "lines"] as const).includes(options.hash.display) ? options.hash.display as FieldDisplay : "text";
        const multiline = options.hash.multiline === true || display !== "text";
        const runtime = options.data.cvm;
        const text = String(value ?? fallback ?? "");

        if (runtime.mode === "static") return new hb.SafeString(staticFieldHtml(text, display));

        runtime.slots.push({
            kind: "field",
            entityType,
            id,
            field,
            defaultValue: String(original ?? fallback ?? ""),
            multiline,
            display,
            placeholder: typeof options.hash.placeholder === "string" ? options.hash.placeholder : undefined,
            className: typeof options.hash.class === "string" ? options.hash.class : undefined,
        });
        return new hb.SafeString(`<cv-slot data-slot="${runtime.slots.length - 1}"></cv-slot>`);
    });

    /**
     * {{editSummary}} or {{editSummary style="paragraph"}}: the summary of the resume with its editor.
     * (The bullets themselves are the `summary` list: {{#if summary}} tells whether there is one.)
     */
    hb.registerHelper("editSummary", (options: HelperOptions) => {
        const runtime = options.data.cvm;
        const display = options.hash.style === "paragraph" ? "paragraph" : "bullets";
        const className = typeof options.hash.class === "string" ? options.hash.class : undefined;
        if (runtime.mode === "static") {
            const bullets = ((options.data.root as Record<string, unknown>)?.summary as string[] | undefined) ?? [];
            if (display === "paragraph") return new hb.SafeString(`<p class="cv-summary">${bullets.map(formatText).join(" ")}</p>`);
            return new hb.SafeString(`<ul class="cv-summary cv-bullets">${bullets.map((bullet) => `<li>${formatText(bullet)}</li>`).join("")}</ul>`);
        }
        runtime.slots.push({ kind: "summary", display, className });
        return new hb.SafeString(`<cv-slot data-slot="${runtime.slots.length - 1}"></cv-slot>`);
    });
};

export interface CompiledCvm {
    render: (context: Record<string, unknown>, mode: RenderMode) => RenderOutput;
}

/** Compiles a template once; render() is then cheap enough to run on every edit. */
export const compileCvm = (template: CvmTemplate): CompiledCvm => {
    const hb = Handlebars.create();
    registerHelpers(hb);
    let compiled: HandlebarsTemplateDelegate | null = null;
    let compileError: string | null = null;
    try {
        compiled = hb.compile(template.template, { preventIndent: true });
    } catch (e) {
        compileError = (e as Error).message;
    }

    return {
        render: (context, mode) => {
            const runtime: Runtime = { mode, slots: [], lang: String(context.lang ?? "en"), i18n: template.meta.i18n };
            if (!compiled) return { html: "", slots: [], error: compileError ?? "Template could not be compiled." };
            try {
                const raw = compiled(context, { data: { cvm: runtime } });
                return { html: sanitizeTemplateHtml(raw), slots: runtime.slots };
            } catch (e) {
                return { html: "", slots: [], error: (e as Error).message };
            }
        },
    };
};
