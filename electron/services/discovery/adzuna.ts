import { ADZUNA_COUNTRIES, type AdzunaQuery } from "../../../shared/discovery.types";
import { htmlToText, type NormalizedJob } from "./boards";

/**
 * Adzuna: a job aggregator with an official search API (free key, personal job search is an allowed use).
 * Unlike the company boards, a search covers the whole market: banks, big companies, agencies...
 * Descriptions are snippets (a few hundred characters), so scores lean on the title more than for boards.
 */

export interface AdzunaCredentials {
    appId: string;
    appKey: string;
}

const API = "https://api.adzuna.com/v1/api/jobs";
/** One page of the most recent offers per search and per night is plenty, and keeps the free quota safe. */
export const ADZUNA_RESULTS_PER_PAGE = 50;

const COUNTRY_CODES = new Set(ADZUNA_COUNTRIES.map((country) => country.code));

const clean = (value: unknown, max: number) => (typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "");

/** Validated query, or a readable error. */
export function sanitizeAdzunaQuery(input: Partial<AdzunaQuery>): AdzunaQuery {
    const country = clean(input.country, 2).toLowerCase();
    const what = clean(input.what, 120);
    const where = clean(input.where, 80);
    if (!COUNTRY_CODES.has(country)) throw new Error("Pick a country Adzuna covers.");
    if (!what) throw new Error("Type what you are looking for (a job title or a skill).");
    return { country, what, where };
}

/** Stored as the source token: same search typed twice is the same source. */
export function encodeAdzunaQuery(query: AdzunaQuery): string {
    return JSON.stringify([query.country, query.what.toLowerCase(), query.where.toLowerCase()]);
}

export function decodeAdzunaQuery(token: string): AdzunaQuery | null {
    try {
        const [country, what, where] = JSON.parse(token) as unknown[];
        return typeof country === "string" && typeof what === "string" && typeof where === "string" ? { country, what, where } : null;
    } catch {
        return null;
    }
}

/** "devops · Montréal" (the country is shown separately). */
export function adzunaLabel(query: AdzunaQuery): string {
    return query.where ? `${query.what} · ${query.where}` : query.what;
}

export function adzunaSiteUrl(country: string | null): string {
    return ADZUNA_COUNTRIES.find((entry) => entry.code === country)?.site ?? "https://www.adzuna.com";
}

export function adzunaSearchUrl(query: AdzunaQuery, credentials: AdzunaCredentials, options: { maxDaysOld?: number; resultsPerPage?: number } = {}): string {
    const params = new URLSearchParams({
        app_id: credentials.appId,
        app_key: credentials.appKey,
        results_per_page: String(options.resultsPerPage ?? ADZUNA_RESULTS_PER_PAGE),
        what: query.what,
        sort_by: "date",
        "content-type": "application/json",
    });
    if (query.where) params.set("where", query.where);
    if (options.maxDaysOld && options.maxDaysOld > 0) params.set("max_days_old", String(options.maxDaysOld));
    return `${API}/${encodeURIComponent(query.country)}/search/1?${params}`;
}

const money = (value: unknown) => (typeof value === "number" && value > 0 ? Math.round(value).toLocaleString("en-US") : null);

export function normalizeAdzunaResponse(body: unknown): NormalizedJob[] {
    const results = (body as { results?: unknown })?.results;
    if (!Array.isArray(results)) return [];
    return results
        .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
        .map((job) => {
            const title = htmlToText(clean(job.title, 300));
            const location = clean((job.location as { display_name?: unknown } | undefined)?.display_name, 200) || null;
            const description = htmlToText(typeof job.description === "string" ? job.description : "");
            // estimated salaries are Adzuna's guess, not the employer's: left out
            const min = job.salary_is_predicted === "1" || job.salary_is_predicted === 1 ? null : money(job.salary_min);
            const max = job.salary_is_predicted === "1" || job.salary_is_predicted === 1 ? null : money(job.salary_max);
            const created = typeof job.created === "string" ? new Date(job.created) : null;
            return {
                externalId: String(job.id ?? ""),
                title,
                company: clean((job.company as { display_name?: unknown } | undefined)?.display_name, 200) || "Unknown company",
                location,
                remote: /\bremote\b|t[ée]l[ée]travail|work from home/i.test(`${title} ${location ?? ""} ${description.slice(0, 300)}`),
                url: clean(job.redirect_url, 2000) || null,
                description,
                salary: min && max && min !== max ? `${min} – ${max}` : min ?? max,
                postedAt: created && !Number.isNaN(created.getTime()) ? created.toISOString() : null,
            };
        })
        .filter((job) => job.externalId && job.title);
}

/** Checks a key with the smallest possible search. Throws a readable error when Adzuna refuses it. */
export async function verifyAdzunaCredentials(credentials: AdzunaCredentials, fetchImpl: typeof fetch, userAgent: string): Promise<void> {
    const url = adzunaSearchUrl({ country: "gb", what: "developer", where: "" }, credentials, { resultsPerPage: 1 });
    let response: Response;
    try {
        response = await fetchImpl(url, { headers: { "User-Agent": userAgent, Accept: "application/json" }, signal: AbortSignal.timeout(15_000) });
    } catch {
        throw new Error("Could not reach Adzuna. Check your connection and try again.");
    }
    if (response.status === 401 || response.status === 403) throw new Error("Adzuna refused this App ID / App key pair. Copy them again from your Adzuna dashboard.");
    if (!response.ok) throw new Error(`Adzuna answered HTTP ${response.status}. Try again in a moment.`);
}
