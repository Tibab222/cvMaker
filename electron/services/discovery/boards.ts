import { JobSourceKind } from "../../../shared/discovery.types";

/**
 * Public job-board APIs of the main applicant tracking systems. Companies publish their openings there on purpose,
 * as JSON, so reading them is the clean alternative to scraping job sites.
 */

export interface BoardRef {
    kind: JobSourceKind;
    token: string;
}

export interface NormalizedJob {
    externalId: string;
    title: string;
    company: string;
    location: string | null;
    remote: boolean;
    url: string | null;
    description: string;
    salary: string | null;
    postedAt: string | null;
}

const SLUG = /^[a-z0-9][a-z0-9._-]{0,99}$/i;

/**
 * Accepts a careers-page URL ("https://boards.greenhouse.io/acme", "jobs.lever.co/acme", "https://jobs.ashbyhq.com/acme/…")
 * or a "kind:slug" shorthand ("greenhouse:acme"). Returns null when the board is not recognized.
 */
export function parseBoardInput(input: string): BoardRef | null {
    const raw = input.trim();
    if (!raw) return null;

    const shorthand = raw.match(/^(greenhouse|lever|ashby)\s*:\s*([^\s/]+)$/i);
    if (shorthand) {
        const token = shorthand[2];
        return SLUG.test(token) ? { kind: shorthand[1].toLowerCase() as JobSourceKind, token } : null;
    }

    let url: URL;
    try {
        url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    } catch {
        return null;
    }
    const host = url.hostname.toLowerCase();
    const segments = url.pathname.split("/").filter(Boolean);

    if (host.endsWith("greenhouse.io")) {
        // boards-api.greenhouse.io/v1/boards/<token>/jobs  or  (job-)boards.greenhouse.io/<token>[/jobs/<id>]
        const apiIndex = segments.indexOf("boards");
        const token = host.startsWith("boards-api") && apiIndex >= 0 ? segments[apiIndex + 1] : segments[0];
        // embedded boards use ?for=<token>
        const embedded = url.searchParams.get("for");
        const finalToken = segments[0] === "embed" && embedded ? embedded : token;
        return finalToken && SLUG.test(finalToken) ? { kind: JobSourceKind.GREENHOUSE, token: finalToken } : null;
    }
    if (host === "jobs.lever.co" || host === "jobs.eu.lever.co") {
        const token = segments[0];
        if (!token || !SLUG.test(token)) return null;
        return { kind: JobSourceKind.LEVER, token: host === "jobs.eu.lever.co" ? `eu:${token}` : token };
    }
    if (host === "jobs.ashbyhq.com") {
        const token = segments[0];
        return token && SLUG.test(token) ? { kind: JobSourceKind.ASHBY, token: decodeURIComponent(token) } : null;
    }
    return null;
}

export function boardApiUrl({ kind, token }: BoardRef): string {
    switch (kind) {
        case JobSourceKind.GREENHOUSE:
            return `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(token)}/jobs?content=true`;
        case JobSourceKind.LEVER: {
            const eu = token.startsWith("eu:");
            const slug = eu ? token.slice(3) : token;
            return `https://api.${eu ? "eu." : ""}lever.co/v0/postings/${encodeURIComponent(slug)}?mode=json`;
        }
        case JobSourceKind.ASHBY:
            return `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(token)}?includeCompensation=true`;
        case JobSourceKind.ADZUNA:
            // needs the user's key: built by adzuna.ts
            throw new Error("Adzuna searches are not boards");
    }
}

export function boardPublicUrl({ kind, token }: BoardRef): string {
    switch (kind) {
        case JobSourceKind.GREENHOUSE:
            return `https://boards.greenhouse.io/${token}`;
        case JobSourceKind.LEVER:
            return token.startsWith("eu:") ? `https://jobs.eu.lever.co/${token.slice(3)}` : `https://jobs.lever.co/${token}`;
        case JobSourceKind.ASHBY:
            return `https://jobs.ashbyhq.com/${token}`;
        case JobSourceKind.ADZUNA:
            return "https://www.adzuna.com";
    }
}

/** "acme-corp" -> "Acme Corp" */
export function labelFromToken(token: string): string {
    return token
        .replace(/^eu:/, "")
        .split(/[-_.]+/)
        .filter(Boolean)
        .map((word) => word[0].toUpperCase() + word.slice(1))
        .join(" ");
}

const NAMED_ENTITIES: Record<string, string> = {
    amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", hellip: "…",
    rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", bull: "•", eacute: "é", egrave: "è", agrave: "à", ccedil: "ç",
};

export function decodeEntities(text: string): string {
    return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
        if (entity[0] === "#") {
            const code = entity[1].toLowerCase() === "x" ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
            return Number.isFinite(code) ? String.fromCodePoint(code) : match;
        }
        return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
    });
}

/** Job descriptions come as HTML (sometimes entity-escaped twice): keep readable text with line breaks and bullets. */
export function htmlToText(html: string): string {
    let text = html;
    // Greenhouse escapes the HTML itself ("&lt;p&gt;")
    if (/&lt;\/?[a-z]/i.test(text)) text = decodeEntities(text);
    text = text
        .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
        .replace(/<li[^>]*>/gi, "\n- ")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/(p|div|h[1-6]|ul|ol|section|tr)>/gi, "\n")
        .replace(/<[^>]+>/g, "");
    return decodeEntities(text)
        .replace(/[ \t\u00a0]+/g, " ")
        .replace(/ *\n */g, "\n")
        // bullets stay on consecutive lines
        .replace(/\n+(- )/g, "\n$1")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

const str = (value: unknown): string => (typeof value === "string" ? value.trim() : "");
const isRemoteText = (value: string) => /\bremote\b|t[ée]l[ée]travail|full[- ]remote|anywhere/i.test(value);
const isoOrNull = (value: unknown): string | null => {
    if (typeof value === "number") return new Date(value).toISOString();
    const text = str(value);
    if (!text) return null;
    const date = new Date(text);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
};
const asArray = (value: unknown): Record<string, unknown>[] =>
    Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => !!item && typeof item === "object") : [];

/** Turns a board API answer into a list of offers. Unknown shapes give an empty list rather than an error. */
export function normalizeBoardResponse(kind: JobSourceKind, body: unknown, fallbackCompany: string): NormalizedJob[] {
    switch (kind) {
        case JobSourceKind.GREENHOUSE: {
            const jobs = asArray((body as { jobs?: unknown })?.jobs);
            return jobs.map((job) => {
                const location = str((job.location as { name?: unknown } | undefined)?.name) || null;
                return {
                    externalId: String(job.id ?? job.internal_job_id ?? job.absolute_url),
                    title: str(job.title),
                    company: str(job.company_name) || fallbackCompany,
                    location,
                    remote: isRemoteText(`${location ?? ""} ${str(job.title)}`),
                    url: str(job.absolute_url) || null,
                    description: htmlToText(str(job.content)),
                    salary: null,
                    postedAt: isoOrNull(job.first_published ?? job.updated_at),
                };
            });
        }
        case JobSourceKind.LEVER: {
            return asArray(body).map((job) => {
                const categories = (job.categories ?? {}) as Record<string, unknown>;
                const location = str(categories.location) || null;
                const lists = asArray(job.lists)
                    .map((list) => `${str(list.text)}\n${htmlToText(str(list.content))}`)
                    .join("\n\n");
                const range = job.salaryRange as { min?: number; max?: number; currency?: string; interval?: string } | undefined;
                const salary = range && (range.min || range.max)
                    ? `${range.min ?? ""}${range.max ? `–${range.max}` : ""} ${range.currency ?? ""}${range.interval ? ` / ${range.interval.replace(/-/g, " ")}` : ""}`.trim()
                    : null;
                return {
                    externalId: String(job.id),
                    title: str(job.text),
                    company: fallbackCompany,
                    location,
                    remote: str(job.workplaceType) === "remote" || isRemoteText(location ?? ""),
                    url: str(job.hostedUrl) || null,
                    description: [str(job.descriptionPlain) || htmlToText(str(job.description)), lists, str(job.additionalPlain)]
                        .filter(Boolean)
                        .join("\n\n"),
                    salary,
                    postedAt: isoOrNull(job.createdAt),
                };
            });
        }
        case JobSourceKind.ASHBY: {
            const jobs = asArray((body as { jobs?: unknown })?.jobs).filter((job) => job.isListed !== false);
            return jobs.map((job) => {
                const location = str(job.location) || null;
                const compensation = job.compensation as { compensationTierSummary?: unknown; scrapeableCompensationSalarySummary?: unknown } | undefined;
                return {
                    externalId: String(job.id ?? job.jobUrl),
                    title: str(job.title),
                    company: fallbackCompany,
                    location,
                    remote: job.isRemote === true || str(job.workplaceType).toLowerCase() === "remote" || isRemoteText(location ?? ""),
                    url: str(job.jobUrl) || str(job.applyUrl) || null,
                    description: str(job.descriptionPlain) || htmlToText(str(job.descriptionHtml)),
                    salary: str(compensation?.scrapeableCompensationSalarySummary) || str(compensation?.compensationTierSummary) || null,
                    postedAt: isoOrNull(job.publishedAt),
                };
            });
        }
        case JobSourceKind.ADZUNA:
            // read by adzuna.ts (normalizeAdzunaResponse)
            return [];
    }
}

/**
 * Boards linked from a company's own careers page: an embedded Greenhouse board, "Apply" links to Lever or Ashby...
 * The most linked board comes first (a footer link to a partner's board should not win).
 */
export function findBoardRefsInHtml(html: string): BoardRef[] {
    const patterns = [
        /https?:\/\/(?:job-)?boards(?:-api)?\.greenhouse\.io\/[^\s"'<>)\\]+/gi,
        /https?:\/\/jobs(?:\.eu)?\.lever\.co\/[^\s"'<>)\\]+/gi,
        /https?:\/\/jobs\.ashbyhq\.com\/[^\s"'<>)\\]+/gi,
    ];
    const counts = new Map<string, { ref: BoardRef; count: number }>();
    for (const pattern of patterns) {
        for (const match of html.matchAll(pattern)) {
            const ref = parseBoardInput(decodeEntities(match[0]));
            // "embed" and "v1" are path parts of Greenhouse script URLs, not boards
            if (!ref || ["embed", "v1", "boards"].includes(ref.token)) continue;
            const key = `${ref.kind}:${ref.token}`;
            counts.set(key, { ref, count: (counts.get(key)?.count ?? 0) + 1 });
        }
    }
    return [...counts.values()].sort((a, b) => b.count - a.count).map((entry) => entry.ref);
}

/** "Wealth Simple Inc." -> ["wealthsimple", "wealth-simple"]: the slugs a company name most often becomes on the ATS. */
export function slugCandidates(name: string): string[] {
    const words = name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/\b(inc|ltd|ltee|llc|corp|corporation|sa|sas|gmbh)\b\.?/g, " ")
        .split(/[^a-z0-9]+/)
        .filter(Boolean);
    if (words.length === 0) return [];
    return [...new Set([words.join(""), words.join("-")])].filter((slug) => SLUG.test(slug));
}
