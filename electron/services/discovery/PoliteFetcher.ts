/**
 * HTTP client for background job searches that stays gentle with the sites it reads:
 * - a cooldown per host (with jitter) between two requests to the same site,
 * - never two requests in a row to the same host while another host has work queued,
 * - a small gap between any two requests, whatever the host,
 * - 429 / 503 answers honour Retry-After and back off exponentially, with a bounded number of attempts.
 * The cooldown state lives on the instance, so it also holds across successive runs.
 */

export interface PoliteFetcherOptions {
    /** Minimum time between two requests to the same host. */
    hostCooldownMs: number;
    /** Random extra on top of the cooldown, as a fraction of it (0.5 = up to +50%). */
    jitter: number;
    /** Minimum time between any two requests. */
    globalGapMs: number;
    timeoutMs: number;
    /** Attempts per request when the site asks to slow down (429 / 503). */
    maxAttempts: number;
    /** Cap on a single back-off wait. */
    maxBackoffMs: number;
    userAgent: string;
    fetchImpl?: typeof fetch;
    now?: () => number;
    sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
    random?: () => number;
}

export interface PoliteRequest<K> {
    key: K;
    url: string;
    /** Human name shown while waiting ("Stripe (Greenhouse)"). */
    label: string;
}

export type PoliteResult<K> =
    | { request: PoliteRequest<K>; ok: true; body: unknown }
    | { request: PoliteRequest<K>; ok: false; error: string };

export interface RunOptions {
    signal?: AbortSignal;
    /** Called before waiting for a cooldown. */
    onWait?: (info: { label: string; until: number }) => void;
    /** Called right before a request leaves. */
    onRequest?: (label: string) => void;
}

interface QueueItem<K> {
    request: PoliteRequest<K>;
    host: string;
    attempts: number;
}

type FetchOutcome =
    | { kind: "ok"; body: unknown }
    | { kind: "error"; error: string }
    | { kind: "slow-down"; retryAfterMs: number | null; error: string };

export const DEFAULT_POLITE_OPTIONS: PoliteFetcherOptions = {
    hostCooldownMs: 45_000,
    jitter: 0.5,
    globalGapMs: 4_000,
    timeoutMs: 20_000,
    maxAttempts: 3,
    maxBackoffMs: 10 * 60_000,
    userAgent: "CVMaker/0.2 (personal job search assistant)",
};

const defaultSleep = (ms: number, signal?: AbortSignal) =>
    new Promise<void>((resolve) => {
        if (signal?.aborted) return resolve();
        const timer = setTimeout(done, ms);
        function done() {
            clearTimeout(timer);
            signal?.removeEventListener("abort", done);
            resolve();
        }
        signal?.addEventListener("abort", done, { once: true });
    });

export function hostOf(url: string): string {
    try {
        return new URL(url).host.toLowerCase();
    } catch {
        return url;
    }
}

/** Retry-After is either a number of seconds or an HTTP date. */
export function parseRetryAfter(value: string | null, now: number): number | null {
    if (!value) return null;
    const seconds = Number(value);
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
    const date = Date.parse(value);
    return Number.isNaN(date) ? null : Math.max(0, date - now);
}

export class PoliteFetcher {
    private readonly options: PoliteFetcherOptions;
    private readonly now: () => number;
    private readonly sleep: (ms: number, signal?: AbortSignal) => Promise<void>;
    private readonly random: () => number;
    private readonly fetchImpl: typeof fetch;

    /** host -> earliest time the next request may leave */
    private readonly nextAllowed = new Map<string, number>();
    private lastHost: string | null = null;
    private lastRequestAt = Number.NEGATIVE_INFINITY;

    constructor(options: Partial<PoliteFetcherOptions> = {}) {
        this.options = { ...DEFAULT_POLITE_OPTIONS, ...options };
        this.now = options.now ?? (() => Date.now());
        this.sleep = options.sleep ?? defaultSleep;
        this.random = options.random ?? Math.random;
        this.fetchImpl = options.fetchImpl ?? ((...args) => fetch(...args));
    }

    /** Fetches every request (JSON), yielding results as they arrive, in the order the politeness rules allow. */
    public async *run<K>(requests: PoliteRequest<K>[], { signal, onWait, onRequest }: RunOptions = {}): AsyncGenerator<PoliteResult<K>> {
        const queue: QueueItem<K>[] = requests.map((request) => ({ request, host: hostOf(request.url), attempts: 0 }));

        while (queue.length > 0) {
            if (signal?.aborted) return;

            const index = this.pickNext(queue);
            const item = queue[index];
            const readyAt = this.readyAt(item.host);
            const wait = readyAt - this.now();
            if (wait > 0) {
                onWait?.({ label: item.request.label, until: readyAt });
                await this.sleep(wait, signal);
                if (signal?.aborted) return;
            }

            queue.splice(index, 1);
            onRequest?.(item.request.label);
            item.attempts += 1;
            const outcome = await this.fetchOnce(item, signal);

            if (outcome.kind === "slow-down") {
                const backoff = Math.min(
                    outcome.retryAfterMs ?? this.options.hostCooldownMs * 2 ** item.attempts,
                    this.options.maxBackoffMs,
                );
                // the whole host is slowed down, not just this request
                this.nextAllowed.set(item.host, Math.max(this.nextAllowed.get(item.host) ?? 0, this.now() + backoff));
                if (item.attempts < this.options.maxAttempts && !signal?.aborted) {
                    queue.push(item);
                    continue;
                }
                yield { request: item.request, ok: false, error: outcome.error };
                continue;
            }

            yield outcome.kind === "ok"
                ? { request: item.request, ok: true, body: outcome.body }
                : { request: item.request, ok: false, error: outcome.error };
        }
    }

    /** Next item: never the host just hit if another host is waiting, then whichever can leave first (FIFO on ties). */
    private pickNext<K>(queue: QueueItem<K>[]): number {
        const otherHostWaiting = queue.some((item) => item.host !== this.lastHost);
        let best = -1;
        let bestReady = Number.POSITIVE_INFINITY;
        queue.forEach((item, index) => {
            if (otherHostWaiting && item.host === this.lastHost) return;
            const ready = this.readyAt(item.host);
            if (ready < bestReady) {
                best = index;
                bestReady = ready;
            }
        });
        return best;
    }

    private readyAt(host: string): number {
        return Math.max(this.nextAllowed.get(host) ?? Number.NEGATIVE_INFINITY, this.lastRequestAt + this.options.globalGapMs);
    }

    private markHit(host: string): void {
        const now = this.now();
        this.lastRequestAt = now;
        this.lastHost = host;
        const cooldown = this.options.hostCooldownMs * (1 + this.random() * this.options.jitter);
        this.nextAllowed.set(host, Math.max(this.nextAllowed.get(host) ?? 0, now + cooldown));
    }

    private async fetchOnce<K>(item: QueueItem<K>, signal?: AbortSignal): Promise<FetchOutcome> {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs);
        const forwardAbort = () => controller.abort();
        signal?.addEventListener("abort", forwardAbort, { once: true });

        try {
            this.markHit(item.host);
            const response = await this.fetchImpl(item.request.url, {
                headers: { "User-Agent": this.options.userAgent, Accept: "application/json" },
                signal: controller.signal,
                redirect: "follow",
            });
            if (response.status === 429 || response.status === 503) {
                return {
                    kind: "slow-down",
                    retryAfterMs: parseRetryAfter(response.headers.get("retry-after"), this.now()),
                    error: `HTTP ${response.status}: the site asked to slow down`,
                };
            }
            if (!response.ok) {
                return { kind: "error", error: response.status === 404 ? "Board not found (HTTP 404)" : `HTTP ${response.status}` };
            }
            return { kind: "ok", body: await response.json() };
        } catch (error) {
            if (controller.signal.aborted && !signal?.aborted) return { kind: "error", error: "Timed out" };
            return { kind: "error", error: error instanceof Error ? error.message : String(error) };
        } finally {
            clearTimeout(timeout);
            signal?.removeEventListener("abort", forwardAbort);
        }
    }
}
