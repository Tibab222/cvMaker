import type Database from "better-sqlite3";
import {
    DEFAULT_DISCOVERY_SETTINGS,
    DiscoveredJob,
    DiscoveredJobStatus,
    DiscoveryRunStatus,
    AdzunaQuery,
    AdzunaStatus,
    DiscoveryFilters,
    DiscoverySettings,
    JobSource,
    JobSourceKind,
    ProfileFilterSuggestion,
} from "../../../shared/discovery.types";
import type { JobOfferPayload } from "../../../shared/Extension.types";
import type { Language } from "../../../shared/profile.interface";
import type { ProfilesData } from "../../../shared/profilesData.interface";
import { BoardRef, boardApiUrl, findBoardRefsInHtml, labelFromToken, normalizeBoardResponse, NormalizedJob, parseBoardInput, slugCandidates } from "./boards";
import { DEFAULT_POLITE_OPTIONS, PoliteFetcher } from "./PoliteFetcher";
import { suggestFiltersFromProfile } from "./profileFilters";
import {
    AdzunaCredentials,
    adzunaLabel,
    adzunaSearchUrl,
    decodeAdzunaQuery,
    encodeAdzunaQuery,
    normalizeAdzunaResponse,
    sanitizeAdzunaQuery,
    verifyAdzunaCredentials,
} from "./adzuna";
import { buildProfileSignals, hasProfileContent, matchesFilters, ProfileSignals, scoreJob, JobScore } from "./scoring";

/**
 * Background job search: reads the public boards the user follows, keeps the offers that pass the filters,
 * scores them against the profile and queues them for review. It never applies anywhere by itself.
 *
 * Electron-free on purpose (dependencies are injected), so it can be exercised from plain Node.
 */

export interface DiscoveryDeps {
    getDb: () => Database.Database;
    isReady: () => boolean;
    getProfile: () => Promise<ProfilesData | null>;
    extractKeywords: (text: string, language: Language) => string[];
    /** Local embedding model; null or throwing means keyword-only scoring. */
    embed: ((text: string) => Promise<Float32Array>) | null;
    fetcher?: PoliteFetcher;
    /** One-off requests made while adding a source (board check, careers page). */
    fetchImpl?: typeof fetch;
    /** The user's Adzuna key, kept by the app (never sent to the page). Absent: no keyword searches. */
    adzuna?: {
        get: () => AdzunaCredentials | null;
        set: (credentials: AdzunaCredentials | null) => void;
    };
    now?: () => Date;
}

interface ScoringContext {
    signals: ProfileSignals;
    language: Language;
    profileVector: Float32Array | null;
}

const SETTINGS_KEY = "discovery.settings";
const LAST_SCHEDULED_RUN_KEY = "discovery.lastScheduledRun";
/** A huge board must not flood the queue in one night. */
const MAX_NEW_PER_SOURCE = 150;

/** Order a bare company name is tried in: three different sites, so no site gets two requests in a row. */
const PROBE_ORDER = [JobSourceKind.ASHBY, JobSourceKind.GREENHOUSE, JobSourceKind.LEVER];
const PROBE_TIMEOUT_MS = 10_000;

const KIND_LABEL: Record<JobSourceKind, string> = {
    [JobSourceKind.GREENHOUSE]: "Greenhouse",
    [JobSourceKind.LEVER]: "Lever",
    [JobSourceKind.ASHBY]: "Ashby",
    [JobSourceKind.ADZUNA]: "Adzuna",
};

const IDLE_STATUS: DiscoveryRunStatus = {
    running: false,
    trigger: null,
    startedAt: null,
    finishedAt: null,
    current: null,
    waitingUntil: null,
    done: 0,
    total: 0,
    added: 0,
    errors: [],
    cancelled: false,
};

const parseList = (value: unknown): string[] => {
    if (typeof value !== "string" || !value) return [];
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
    } catch {
        return [];
    }
};

const cleanWords = (value: unknown): string[] =>
    Array.isArray(value)
        ? [...new Set(value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean))].slice(0, 50)
        : [];

/** Same offer, different tracking parameters: compare URLs without query string and trailing slash. */
export function normalizeUrl(url: string): string {
    try {
        const parsed = new URL(url);
        return `${parsed.protocol}//${parsed.host.toLowerCase()}${parsed.pathname.replace(/\/+$/, "")}`;
    } catch {
        return url.trim();
    }
}

export class DiscoveryManager {
    private readonly deps: DiscoveryDeps;
    private readonly fetcher: PoliteFetcher;
    private status: DiscoveryRunStatus = { ...IDLE_STATUS };
    private abortController: AbortController | null = null;
    private schedulerTimer: ReturnType<typeof setInterval> | null = null;
    private readonly statusListeners = new Set<(status: DiscoveryRunStatus) => void>();
    private readonly jobsListeners = new Set<() => void>();

    constructor(deps: DiscoveryDeps) {
        this.deps = deps;
        this.fetcher = deps.fetcher ?? new PoliteFetcher();
    }

    /* ------------------------------------------------------------------ */
    /* Events                                                              */
    /* ------------------------------------------------------------------ */

    public onStatus(listener: (status: DiscoveryRunStatus) => void): () => void {
        this.statusListeners.add(listener);
        return () => this.statusListeners.delete(listener);
    }

    public onJobsChanged(listener: () => void): () => void {
        this.jobsListeners.add(listener);
        return () => this.jobsListeners.delete(listener);
    }

    private emitStatus(patch: Partial<DiscoveryRunStatus> = {}): void {
        this.status = { ...this.status, ...patch };
        const snapshot = this.getStatus();
        this.statusListeners.forEach((listener) => listener(snapshot));
    }

    private emitJobsChanged(): void {
        this.jobsListeners.forEach((listener) => listener());
    }

    private now(): Date {
        return this.deps.now?.() ?? new Date();
    }

    /* ------------------------------------------------------------------ */
    /* Sources                                                             */
    /* ------------------------------------------------------------------ */

    // Reads answer "nothing yet" while no profile is open (launch, profile switch, dev restart of the main process):
    // the page shows its empty state instead of an error, and reloads once a profile is connected.
    public listSources(): JobSource[] {
        if (!this.deps.isReady()) return [];
        const rows = this.deps.getDb().prepare(`SELECT * FROM job_sources ORDER BY label COLLATE NOCASE`).all() as Record<string, unknown>[];
        return rows.map((row) => ({ ...row, enabled: row.enabled === 1 }) as JobSource);
    }

    /**
     * Adds a company from what the user has at hand: a board URL, "kind:slug", a bare company name ("Wealthsimple",
     * looked up on the three ATS), or the company's own careers page (scanned for a board link).
     * The board is checked before it is saved. Throws a readable error otherwise.
     */
    public async addSource(input: string, label?: string): Promise<JobSource> {
        if (!this.deps.isReady()) throw new Error("Open a profile before following companies.");
        const raw = input.trim();
        if (!raw) throw new Error("Type a company name or paste its careers page.");

        let ref = parseBoardInput(raw);
        let checked = false;
        if (!ref && this.looksLikeUrl(raw)) {
            ref = await this.findBoardOnCareersPage(raw);
        } else if (!ref) {
            ref = await this.findBoardByName(raw);
            checked = ref !== null;
            if (!ref) {
                throw new Error(`No public Greenhouse, Lever or Ashby board found for "${raw}". Paste its careers page instead, or save its offers from the browser extension.`);
            }
        }

        this.assertNotFollowed(ref);
        if (!checked) await this.assertBoardExists(ref);
        this.assertNotFollowed(ref);

        const result = this.deps.getDb()
            .prepare(`INSERT INTO job_sources (kind, token, label) VALUES (?, ?, ?)`)
            .run(ref.kind, ref.token, label?.trim() || labelFromToken(ref.token));
        return this.listSources().find((source) => source.id === Number(result.lastInsertRowid))!;
    }

    private looksLikeUrl(value: string): boolean {
        return /^https?:\/\//i.test(value) || /^[\w-]+(\.[\w-]+)+(\/|$)/.test(value);
    }

    private assertNotFollowed(ref: BoardRef): void {
        const existing = this.deps.getDb().prepare(`SELECT label FROM job_sources WHERE kind = ? AND token = ?`).get(ref.kind, ref.token) as { label: string } | undefined;
        if (existing) throw new Error(`You already follow ${existing.label}.`);
    }

    private async request(url: string, accept: string): Promise<Response> {
        const fetchImpl = this.deps.fetchImpl ?? fetch;
        return fetchImpl(url, {
            headers: { "User-Agent": DEFAULT_POLITE_OPTIONS.userAgent, Accept: accept },
            signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
            redirect: "follow",
        });
    }

    /** Number of open roles on the board, or null when it does not exist. Network trouble is rethrown. */
    private async countBoardJobs(ref: BoardRef): Promise<number | null> {
        const response = await this.request(boardApiUrl(ref), "application/json");
        if (response.status === 404) return null;
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return normalizeBoardResponse(ref.kind, await response.json(), ref.token).length;
    }

    private async assertBoardExists(ref: BoardRef): Promise<void> {
        let count: number | null;
        try {
            count = await this.countBoardJobs(ref);
        } catch (error) {
            // offline or the site hiccups: keep the board, the search will report it if it stays broken
            console.warn("[Discovery] Could not check the board, added anyway:", error);
            return;
        }
        if (count === null) throw new Error(`There is no public ${KIND_LABEL[ref.kind]} board named "${ref.token.replace(/^eu:/, "")}". Check the link.`);
    }

    /** Tries the likely slugs on each ATS and keeps the board with the most open roles (old empty boards lose). */
    private async findBoardByName(name: string): Promise<BoardRef | null> {
        let best: { ref: BoardRef; count: number } | null = null;
        for (const token of slugCandidates(name)) {
            for (const kind of PROBE_ORDER) {
                const ref = { kind, token };
                try {
                    const count = await this.countBoardJobs(ref);
                    if (count !== null && (!best || count > best.count)) best = { ref, count };
                } catch {
                    // this site does not answer: try the others
                }
            }
            if (best && best.count > 0) break;
        }
        return best?.ref ?? null;
    }

    private async findBoardOnCareersPage(input: string): Promise<BoardRef> {
        const url = /^https?:\/\//i.test(input) ? input : `https://${input}`;
        let response: Response;
        try {
            response = await this.request(url, "text/html");
        } catch {
            throw new Error("Could not open this careers page. Check the link, or type the company name instead.");
        }
        // the careers page may redirect straight to the board
        const redirected = parseBoardInput(response.url);
        if (redirected) return redirected;
        const html = response.ok ? await response.text() : "";
        const [ref] = findBoardRefsInHtml(html);
        if (!ref) {
            throw new Error("This careers page does not link to a Greenhouse, Lever or Ashby board (it may use Workday or its own site). Save its offers from the browser extension instead.");
        }
        return ref;
    }

    public removeSource(id: number): boolean {
        return this.deps.getDb().prepare(`DELETE FROM job_sources WHERE id = ?`).run(id).changes > 0;
    }

    public setSourceEnabled(id: number, enabled: boolean): boolean {
        return this.deps.getDb().prepare(`UPDATE job_sources SET enabled = ? WHERE id = ?`).run(enabled ? 1 : 0, id).changes > 0;
    }

    /* ------------------------------------------------------------------ */
    /* Keyword searches (Adzuna)                                           */
    /* ------------------------------------------------------------------ */

    public getAdzunaStatus(): AdzunaStatus {
        const credentials = this.deps.adzuna?.get() ?? null;
        return { connected: !!credentials, appId: credentials?.appId ?? null };
    }

    /** Checks the key with one tiny search before keeping it. */
    public async connectAdzuna(appId: string, appKey: string): Promise<AdzunaStatus> {
        if (!this.deps.adzuna) throw new Error("Adzuna is not available in this build.");
        const credentials = { appId: appId.trim(), appKey: appKey.trim() };
        if (!credentials.appId || !credentials.appKey) throw new Error("Paste both the App ID and the App key.");
        await verifyAdzunaCredentials(credentials, this.deps.fetchImpl ?? fetch, DEFAULT_POLITE_OPTIONS.userAgent);
        this.deps.adzuna.set(credentials);
        return this.getAdzunaStatus();
    }

    public disconnectAdzuna(): AdzunaStatus {
        this.deps.adzuna?.set(null);
        return this.getAdzunaStatus();
    }

    /** Adds a keyword search ("devops" around "Montréal"). Runs with the other sources, at night or on demand. */
    public addSearch(input: Partial<AdzunaQuery>): JobSource {
        if (!this.deps.isReady()) throw new Error("Open a profile before adding searches.");
        if (!this.getAdzunaStatus().connected) throw new Error("Connect Adzuna first: it takes a free key.");
        const query = sanitizeAdzunaQuery(input);
        const token = encodeAdzunaQuery(query);
        const db = this.deps.getDb();
        if (db.prepare(`SELECT 1 FROM job_sources WHERE kind = ? AND token = ?`).get(JobSourceKind.ADZUNA, token)) {
            throw new Error("You already have this search.");
        }
        const result = db
            .prepare(`INSERT INTO job_sources (kind, token, label) VALUES (?, ?, ?)`)
            .run(JobSourceKind.ADZUNA, token, adzunaLabel(query));
        return this.listSources().find((source) => source.id === Number(result.lastInsertRowid))!;
    }

    /** API address of a source, or the reason it cannot be searched now. */
    private sourceRequestUrl(source: JobSource, settings: DiscoverySettings): { url: string } | { error: string } {
        if (source.kind !== JobSourceKind.ADZUNA) return { url: boardApiUrl(source) };
        const credentials = this.deps.adzuna?.get() ?? null;
        const query = decodeAdzunaQuery(source.token);
        if (!credentials) return { error: "Adzuna is not connected: add your free key in the search setup." };
        if (!query) return { error: "This search is damaged: remove it and add it again." };
        return { url: adzunaSearchUrl(query, credentials, { maxDaysOld: settings.filters.maxAgeDays }) };
    }

    /* ------------------------------------------------------------------ */
    /* Settings                                                            */
    /* ------------------------------------------------------------------ */

    private getSetting(key: string, db = this.deps.getDb()): string | null {
        const row = db.prepare(`SELECT value FROM app_settings WHERE key = ?`).get(key) as { value: string } | undefined;
        return row?.value ?? null;
    }

    private setSetting(key: string, value: string, db = this.deps.getDb()): void {
        db.prepare(`INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`).run(key, value);
    }

    public getSettings(): DiscoverySettings {
        if (!this.deps.isReady()) return structuredClone(DEFAULT_DISCOVERY_SETTINGS);
        const raw = this.getSetting(SETTINGS_KEY);
        if (!raw) return structuredClone(DEFAULT_DISCOVERY_SETTINGS);
        try {
            return this.sanitizeSettings(JSON.parse(raw));
        } catch {
            return structuredClone(DEFAULT_DISCOVERY_SETTINGS);
        }
    }

    public saveSettings(settings: DiscoverySettings): DiscoverySettings {
        const clean = this.sanitizeSettings(settings);
        this.setSetting(SETTINGS_KEY, JSON.stringify(clean));
        return clean;
    }

    private sanitizeSettings(value: unknown): DiscoverySettings {
        const input = (value ?? {}) as Partial<DiscoverySettings>;
        const filters = (input.filters ?? {}) as Partial<DiscoverySettings["filters"]>;
        const schedule = (input.schedule ?? {}) as Partial<DiscoverySettings["schedule"]>;
        const defaults = DEFAULT_DISCOVERY_SETTINGS;
        const hour = Number(schedule.hour);
        const maxAge = Number(filters.maxAgeDays);
        const titleIncludes = cleanWords(filters.titleIncludes);
        const locations = cleanWords(filters.locations);
        // settings saved before the mode existed keep the filters the user typed
        const filtersMode = input.filtersMode === "custom" || input.filtersMode === "profile"
            ? input.filtersMode
            : titleIncludes.length > 0 || locations.length > 0 ? "custom" : defaults.filtersMode;
        return {
            filtersMode,
            filters: {
                titleIncludes,
                titleExcludes: cleanWords(filters.titleExcludes),
                locations,
                remoteOnly: filters.remoteOnly === true,
                maxAgeDays: Number.isInteger(maxAge) && maxAge >= 0 && maxAge <= 365 ? maxAge : defaults.filters.maxAgeDays,
            },
            schedule: {
                enabled: schedule.enabled === true,
                hour: Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : defaults.schedule.hour,
            },
        };
    }

    /** Filters read from the current profile, or null without a profile (or without experience to read). */
    public async suggestFilters(): Promise<ProfileFilterSuggestion | null> {
        if (!this.deps.isReady()) return null;
        const profile = await this.deps.getProfile();
        if (!profile || profile.experience.length === 0) return null;
        return suggestFiltersFromProfile(profile, this.now());
    }

    /** The filters a search applies: in profile mode, titles and places follow the profile as it is today. */
    public async effectiveFilters(settings: DiscoverySettings): Promise<DiscoveryFilters> {
        if (settings.filtersMode !== "profile") return settings.filters;
        const suggestion = await this.suggestFilters();
        return suggestion ? { ...settings.filters, ...suggestion.filters } : { ...settings.filters, titleIncludes: [], titleExcludes: [], locations: [] };
    }

    /* ------------------------------------------------------------------ */
    /* Queue                                                               */
    /* ------------------------------------------------------------------ */

    public listJobs(): DiscoveredJob[] {
        if (!this.deps.isReady()) return [];
        const rows = this.deps.getDb().prepare(`
            SELECT d.*,
                (SELECT a.status FROM applications a WHERE d.url IS NOT NULL AND a.url = d.url ORDER BY a.created_at DESC LIMIT 1) AS application_status,
                s.kind AS source_kind,
                s.token AS source_token
            FROM discovered_jobs d
            LEFT JOIN job_sources s ON s.id = d.source_id
            WHERE d.status != 'DISMISSED' OR d.discovered_at >= datetime('now', '-30 days')
            ORDER BY d.score IS NULL, d.score DESC, d.discovered_at DESC
            LIMIT 500
        `).all() as Record<string, unknown>[];
        return rows.map((row) => this.mapJob(row));
    }

    private mapJob(row: Record<string, unknown>): DiscoveredJob {
        const { external_key: _key, source_token: sourceToken, ...rest } = row;
        void _key;
        const sourceKind = (row.source_kind as JobSourceKind | null) ?? null;
        return {
            ...rest,
            source_kind: sourceKind,
            source_country: sourceKind === JobSourceKind.ADZUNA ? decodeAdzunaQuery(String(sourceToken))?.country ?? null : null,
            remote: row.remote === 1,
            matched_keywords: parseList(row.matched_keywords),
            missing_keywords: parseList(row.missing_keywords),
            application_status: (row.application_status as string | null) ?? null,
        } as DiscoveredJob;
    }

    public setJobStatus(id: number, status: DiscoveredJobStatus): boolean {
        if (!Object.values(DiscoveredJobStatus).includes(status)) throw new Error(`Unknown status ${status}`);
        const changed = this.deps.getDb().prepare(`UPDATE discovered_jobs SET status = ? WHERE id = ?`).run(status, id).changes > 0;
        if (changed) this.emitJobsChanged();
        return changed;
    }

    /** Marks the offer as prepared and returns it in the shape the resume editor opens. */
    public prepareJob(id: number): JobOfferPayload | null {
        const row = this.deps.getDb().prepare(`SELECT * FROM discovered_jobs WHERE id = ?`).get(id) as Record<string, unknown> | undefined;
        if (!row) return null;
        this.setJobStatus(id, DiscoveredJobStatus.PREPARED);
        const job = this.mapJob(row);
        return {
            title: job.title,
            company: job.company,
            salary: job.salary ?? undefined,
            url: job.url ?? "",
            mandate: job.description,
            extractedAt: this.now().toISOString(),
        };
    }

    /** An offer the user picked while browsing: queued as shortlisted, scored right away. */
    public async addFromExtension(payload: JobOfferPayload): Promise<{ id: number; score: number | null; duplicate: boolean }> {
        const db = this.deps.getDb();
        const url = payload.url ? normalizeUrl(payload.url) : null;
        const key = url ? `url:${url}` : `manual:${payload.company}|${payload.title}`.toLowerCase();

        const existing = db
            .prepare(`SELECT id, score, status FROM discovered_jobs WHERE external_key = ? OR (url IS NOT NULL AND url = ?)`)
            .get(key, url ?? payload.url ?? "") as { id: number; score: number | null; status: DiscoveredJobStatus } | undefined;
        if (existing) {
            if (existing.status === DiscoveredJobStatus.NEW || existing.status === DiscoveredJobStatus.DISMISSED) {
                this.setJobStatus(existing.id, DiscoveredJobStatus.SHORTLISTED);
            }
            return { id: existing.id, score: existing.score, duplicate: true };
        }

        const context = await this.createScoringContext().catch(() => null);
        const job: NormalizedJob = {
            externalId: key,
            title: payload.title || "Untitled offer",
            company: payload.company || "Unknown company",
            location: null,
            remote: /\bremote\b|t[ée]l[ée]travail/i.test(`${payload.title} ${payload.mandate.slice(0, 500)}`),
            url: payload.url || null,
            description: payload.mandate,
            salary: payload.salary || null,
            postedAt: null,
        };
        const score = context ? await this.score(job, context) : null;
        const id = this.insertJob(db, job, { key, sourceId: null, origin: "extension", status: DiscoveredJobStatus.SHORTLISTED, score });
        this.emitJobsChanged();
        return { id, score: score?.score ?? null, duplicate: false };
    }

    private insertJob(
        db: Database.Database,
        job: NormalizedJob,
        meta: { key: string; sourceId: number | null; origin: "board" | "extension"; status: DiscoveredJobStatus; score: JobScore | null },
    ): number {
        const result = db.prepare(`
            INSERT INTO discovered_jobs
                (source_id, origin, external_key, company, title, location, remote, url, description, salary, posted_at, score, matched_keywords, missing_keywords, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            meta.sourceId,
            meta.origin,
            meta.key,
            job.company,
            job.title,
            job.location,
            job.remote ? 1 : 0,
            // Adzuna links are redirects that need their parameters; board links lose their tracking ones
            job.url ? (meta.key.startsWith("adzuna:") ? job.url : normalizeUrl(job.url)) : null,
            job.description,
            job.salary,
            job.postedAt,
            meta.score?.score ?? null,
            JSON.stringify(meta.score?.matched ?? []),
            JSON.stringify(meta.score?.missing ?? []),
            meta.status,
        );
        return Number(result.lastInsertRowid);
    }

    /* ------------------------------------------------------------------ */
    /* Scoring                                                             */
    /* ------------------------------------------------------------------ */

    private async createScoringContext(): Promise<ScoringContext | null> {
        const profile = await this.deps.getProfile();
        if (!profile) return null;
        const signals = buildProfileSignals(profile);
        if (!hasProfileContent(signals)) return null;

        let profileVector: Float32Array | null = null;
        if (this.deps.embed) {
            try {
                profileVector = await this.deps.embed(signals.summary);
            } catch (error) {
                console.warn("[Discovery] Embedding model unavailable, keyword-only scoring:", error);
            }
        }
        return { signals, language: profile.profile.language, profileVector };
    }

    private score(job: NormalizedJob, context: ScoringContext): Promise<JobScore> {
        return scoreJob(job, context.signals, {
            extractKeywords: (text) => this.deps.extractKeywords(text, context.language),
            embed: this.deps.embed ?? undefined,
            profileVector: context.profileVector,
        });
    }

    /* ------------------------------------------------------------------ */
    /* Runs                                                                */
    /* ------------------------------------------------------------------ */

    public getStatus(): DiscoveryRunStatus {
        return { ...this.status, errors: [...this.status.errors] };
    }

    public cancel(): void {
        this.abortController?.abort();
    }

    /** Starts a search in the background and returns at once; progress comes through onStatus. */
    public start(trigger: "manual" | "schedule" = "manual"): DiscoveryRunStatus {
        if (this.status.running) return this.getStatus();
        if (!this.deps.isReady()) throw new Error("Open a profile before searching for offers.");

        const db = this.deps.getDb();
        const sources = this.listSources().filter((source) => source.enabled);
        if (sources.length === 0) throw new Error("Add at least one company board to search.");

        this.abortController = new AbortController();
        this.emitStatus({
            ...IDLE_STATUS,
            running: true,
            trigger,
            startedAt: this.now().toISOString(),
            total: sources.length,
        });
        void this.execute(db, sources, this.getSettings(), this.abortController.signal);
        return this.getStatus();
    }

    /** Resolves when the current run (if any) is over. Mostly for tests and shutdown. */
    public async waitForIdle(pollMs = 50): Promise<void> {
        while (this.status.running) await new Promise((resolve) => setTimeout(resolve, pollMs));
    }

    private async execute(db: Database.Database, sources: JobSource[], settings: DiscoverySettings, signal: AbortSignal): Promise<void> {
        const errors: string[] = [];
        let added = 0;
        try {
            // old dismissed offers keep their row (so they are not found again) but drop their text
            db.prepare(`UPDATE discovered_jobs SET description = '' WHERE status = 'DISMISSED' AND discovered_at < datetime('now', '-30 days')`).run();

            const context = await this.createScoringContext();
            const filters = await this.effectiveFilters(settings);
            // a keyword search already says what and where: only exclusions, remote and age apply to its results
            const searchFilters: DiscoveryFilters = { ...filters, titleIncludes: [], locations: [] };

            const requests: { key: JobSource; url: string; label: string }[] = [];
            for (const source of sources) {
                const target = this.sourceRequestUrl(source, settings);
                if ("error" in target) {
                    errors.push(`${source.label}: ${target.error}`);
                    db.prepare(`UPDATE job_sources SET last_run_at = CURRENT_TIMESTAMP, last_error = ? WHERE id = ?`).run(target.error, source.id);
                    this.emitStatus({ done: this.status.done + 1, errors: [...errors] });
                    continue;
                }
                requests.push({ key: source, url: target.url, label: `${source.label} (${KIND_LABEL[source.kind]})` });
            }

            for await (const result of this.fetcher.run(requests, {
                signal,
                onWait: ({ label, until }) => this.emitStatus({ current: label, waitingUntil: until }),
                onRequest: (label) => this.emitStatus({ current: label, waitingUntil: null }),
            })) {
                const source = result.request.key;
                const isSearch = source.kind === JobSourceKind.ADZUNA;
                if (!result.ok) {
                    const error = isSearch && /HTTP 40[13]/.test(result.error)
                        ? "Adzuna refused the key: connect it again in the search setup."
                        : result.error;
                    errors.push(`${source.label}: ${error}`);
                    db.prepare(`UPDATE job_sources SET last_run_at = CURRENT_TIMESTAMP, last_error = ? WHERE id = ?`).run(error, source.id);
                } else {
                    const jobs = isSearch ? normalizeAdzunaResponse(result.body) : normalizeBoardResponse(source.kind, result.body, source.label);
                    const kept = jobs.filter((job) => matchesFilters(job, isSearch ? searchFilters : filters, this.now().getTime()));
                    let addedHere = 0;
                    // same offer from a company board and from a search, or from two searches: kept once
                    const exists = db.prepare(`
                        SELECT 1 FROM discovered_jobs
                        WHERE external_key = ? OR (url IS NOT NULL AND url = ?) OR (company = ? COLLATE NOCASE AND title = ? COLLATE NOCASE)
                    `);
                    for (const job of kept) {
                        if (signal.aborted || addedHere >= MAX_NEW_PER_SOURCE) break;
                        const key = isSearch ? `adzuna:${job.externalId}` : `${source.kind}:${source.token}:${job.externalId}`;
                        if (exists.get(key, job.url ? normalizeUrl(job.url) : "", job.company, job.title)) continue;
                        const score = context ? await this.score(job, context) : null;
                        this.insertJob(db, job, { key, sourceId: source.id, origin: "board", status: DiscoveredJobStatus.NEW, score });
                        addedHere++;
                    }
                    db.prepare(`UPDATE job_sources SET last_run_at = CURRENT_TIMESTAMP, last_error = NULL, last_found = ? WHERE id = ?`).run(jobs.length, source.id);
                    added += addedHere;
                    if (addedHere > 0) this.emitJobsChanged();
                }
                this.emitStatus({ done: this.status.done + 1, added, errors: [...errors] });
            }
        } catch (error) {
            errors.push(error instanceof Error ? error.message : String(error));
            console.error("[Discovery] Run failed:", error);
        } finally {
            this.abortController = null;
            this.emitStatus({
                running: false,
                finishedAt: this.now().toISOString(),
                current: null,
                waitingUntil: null,
                added,
                errors,
                cancelled: signal.aborted,
            });
        }
    }

    /* ------------------------------------------------------------------ */
    /* Schedule                                                            */
    /* ------------------------------------------------------------------ */

    /** Checks every minute whether the daily search is due. A run missed while the app was closed happens at the next check. */
    public startScheduler(intervalMs = 60_000): void {
        if (this.schedulerTimer) return;
        this.schedulerTimer = setInterval(() => this.tick(), intervalMs);
    }

    public stopScheduler(): void {
        if (this.schedulerTimer) clearInterval(this.schedulerTimer);
        this.schedulerTimer = null;
        this.cancel();
    }

    /** Returns true when a scheduled run was started. */
    public tick(): boolean {
        try {
            if (this.status.running || !this.deps.isReady()) return false;
            const settings = this.getSettings();
            if (!settings.schedule.enabled) return false;

            const now = this.now();
            const due = new Date(now);
            due.setHours(settings.schedule.hour, 0, 0, 0);
            if (now < due) return false;

            const last = this.getSetting(LAST_SCHEDULED_RUN_KEY);
            if (last && new Date(last) >= due) return false;
            if (!this.listSources().some((source) => source.enabled)) return false;

            // stamped first, so a failing run is not retried every minute
            this.setSetting(LAST_SCHEDULED_RUN_KEY, now.toISOString());
            this.start("schedule");
            return true;
        } catch (error) {
            console.error("[Discovery] Scheduler tick failed:", error);
            return false;
        }
    }
}
