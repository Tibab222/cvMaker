/**
 * Application tracking, browser-agnostic: the background script feeds it tab events and messages, it decides
 * which offer a sent form belongs to and when to ask the user. Every dependency is injected (storage, clock,
 * messaging, the desktop app), so the whole flow can be replayed in a test.
 */
import {
  channelFor,
  newTrail,
  offerFitsPage,
  offerKey,
  pruneTrails,
  recordOffer,
  resolveOffer,
  sameOffer,
  titleOverlap,
  type Channel,
  type OfferSnapshot,
  type Resolution,
  type TabTrail,
} from '../core/offerTrail';
import type { ApplyAnswerResponse, ApplyPrompt, SeenOffer, TabTrackMessage, TrackHelloResponse } from '../core/messages';

/** What the desktop app stores (POST /api/applications). */
export interface AppApplication {
  title: string;
  company: string;
  url: string;
  description: string;
  salary: string;
  channel: Channel | null;
  /** The user's calendar day, YYYY-MM-DD. */
  appliedOn: string;
}

export interface AppSaveAnswer {
  action: 'created' | 'promoted' | 'duplicate';
  message: string;
}

/** The desktop app is not running: the application waits in the outbox. */
export class AppOfflineError extends Error {}

interface PromptRecord {
  id: string;
  tabId: number;
  createdAt: number;
  /** waiting: the form was just sent, errors may still show up; asking: shown to the user. */
  state: 'waiting' | 'asking';
  confirmed: boolean;
  resolution: Resolution;
  formUrl: string;
  appliedOn: string;
  snoozed: boolean;
}

export interface SessionState {
  trails: Record<number, TabTrail>;
  prompts: PromptRecord[];
  /** Offers already answered (saved or not applied), so the thank-you page after a form does not ask again. */
  answered: Record<string, { at: number; answer: 'saved' | 'dismissed' }>;
}

export interface LocalState {
  enabled: boolean;
  outbox: AppApplication[];
}

export interface TrackerDeps {
  now(): number;
  loadSession(): Promise<SessionState | undefined>;
  saveSession(state: SessionState): Promise<void>;
  loadLocal(): Promise<LocalState | undefined>;
  saveLocal(state: LocalState): Promise<void>;
  /** To the top frame of a tab; rejects when no content script answers there. */
  sendToTab(tabId: number, message: TabTrackMessage): Promise<unknown>;
  notifyPanel(): void;
  setBadge(tabId: number, count: number): void;
  /** Throws AppOfflineError when the app cannot be reached, Error(message) when it refuses. */
  saveToApp(application: AppApplication): Promise<AppSaveAnswer>;
  later(ms: number, task: () => void): void;
  newId(): string;
}

/** A sent form may come back with errors: wait this long before asking. */
/** A signal this soon after answering for the same offer is that answer's thank-you page. */
const REPEAT_WINDOW_MS = 2 * 60_000;
export const SUBMIT_SETTLE_MS = 2500;
/** Signals within this window belong to the same application (submit, then the thank-you page). */
const SAME_APPLICATION_MS = 15 * 60 * 1000;
const PROMPT_TTL_MS = 3 * 60 * 60 * 1000;
const ANSWER_TTL_MS = 12 * 60 * 60 * 1000;
/** An "Apply" click this recent in the opener means the new tab is that application. */
const APPLY_CLICK_WINDOW_MS = 15_000;
const OUTBOX_RETRY_MS = 60_000;

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};

function localDay(ms: number): string {
  const date = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toSnapshot(offer: SeenOffer, seenAt: number, atApply: boolean): OfferSnapshot {
  const clip = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '');
  return {
    title: clip(offer.title, 300),
    company: clip(offer.company, 200),
    url: /^https?:\/\//i.test(offer.url) ? clip(offer.url, 2000) : '',
    mandate: clip(offer.mandate, 30_000),
    salary: clip(offer.salary, 100),
    strength: offer.strength === 'strong' ? 'strong' : 'medium',
    seenAt,
    atApply,
  };
}

export class ApplicationTracker {
  private session: SessionState | null = null;
  private local: LocalState | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  private lastFlush = 0;

  constructor(private readonly deps: TrackerDeps) {}

  /** One operation at a time: messages from several tabs arrive together and all touch the same state. */
  private run<T>(task: () => Promise<T> | T): Promise<T> {
    const next = this.queue.then(async () => {
      await this.load();
      return task();
    });
    this.queue = next.catch(() => undefined);
    return next;
  }

  private async load(): Promise<void> {
    if (!this.session) {
      const stored = await this.deps.loadSession().catch(() => undefined);
      this.session = { trails: stored?.trails ?? {}, prompts: stored?.prompts ?? [], answered: stored?.answered ?? {} };
    }
    if (!this.local) {
      const stored = await this.deps.loadLocal().catch(() => undefined);
      this.local = { enabled: stored?.enabled ?? true, outbox: stored?.outbox ?? [] };
    }
  }

  private get state(): SessionState {
    return this.session!;
  }

  private async persist(): Promise<void> {
    const now = this.deps.now();
    pruneTrails(this.state.trails, now);
    this.state.prompts = this.state.prompts.filter((prompt) => now - prompt.createdAt <= PROMPT_TTL_MS);
    for (const [key, entry] of Object.entries(this.state.answered)) if (now - entry.at > ANSWER_TTL_MS) delete this.state.answered[key];
    await this.deps.saveSession(this.state).catch(() => undefined);
  }

  private async persistLocal(): Promise<void> {
    await this.deps.saveLocal(this.local!).catch(() => undefined);
  }

  private trail(tabId: number): TabTrail {
    this.state.trails[tabId] ??= newTrail(tabId, null, 0);
    return this.state.trails[tabId];
  }

  /* ------------------------------------------------------------------ */
  /* Tabs and pages                                                       */
  /* ------------------------------------------------------------------ */

  tabCreated(tabId: number, openerTabId: number | null): Promise<void> {
    return this.run(async () => {
      const now = this.deps.now();
      this.state.trails[tabId] = newTrail(tabId, openerTabId ?? null, now);
      await this.persist();
      if (openerTabId == null || !this.local!.enabled) return;
      // what the opener shows right now is what this tab is about (the posting whose "Apply" opened it)
      const fresh = (await Promise.race([
        this.deps.sendToTab(openerTabId, { action: 'SNAPSHOT_OFFER' }).catch(() => null),
        new Promise((resolve) => setTimeout(() => resolve(null), 1500)),
      ])) as SeenOffer | null;
      const opener = this.state.trails[openerTabId];
      const clicked = opener?.offers.some((offer) => offer.atApply && Math.abs(now - offer.seenAt) <= APPLY_CLICK_WINDOW_MS) ?? false;
      const trail = this.state.trails[tabId];
      if (fresh?.title && trail) {
        trail.inherited = toSnapshot(fresh, now, clicked);
        await this.persist();
      }
    });
  }

  tabRemoved(tabId: number): Promise<void> {
    return this.run(async () => {
      const trail = this.state.trails[tabId];
      // kept a while: a form tab opened from it may still be sent
      if (trail) trail.closedAt = this.deps.now();
      await this.persist();
    });
  }

  /** Top frame loaded or moved (in-page navigation): where the tab is, and whether to show a question. */
  hello(tabId: number, page: { url: string; title: string; referrer: string }): Promise<TrackHelloResponse> {
    return this.run(async () => {
      if (!this.local!.enabled) return { enabled: false, prompt: null };
      const trail = this.trail(tabId);
      trail.pageUrl = page.url.slice(0, 2000);
      trail.pageTitle = page.title.slice(0, 300);
      if (page.referrer) trail.referrer = page.referrer.slice(0, 2000);
      await this.persist();
      void this.flushOutboxSoon();
      const prompt = this.state.prompts.find((p) => p.tabId === tabId && p.state === 'asking' && !p.snoozed);
      return { enabled: true, prompt: prompt ? this.toPublic(prompt) : null };
    });
  }

  offerSeen(tabId: number, offer: SeenOffer, atApply: boolean): Promise<void> {
    return this.run(async () => {
      if (!this.local!.enabled || !offer.title) return;
      recordOffer(this.trail(tabId), toSnapshot(offer, this.deps.now(), atApply));
      await this.persist();
    });
  }

  /* ------------------------------------------------------------------ */
  /* Sent forms                                                           */
  /* ------------------------------------------------------------------ */

  signal(tabId: number, kind: 'submit' | 'confirmation', hints: string[]): Promise<void> {
    return this.run(async () => {
      if (!this.local!.enabled) return;
      const now = this.deps.now();
      const trail = this.trail(tabId);

      const page = {
        now,
        pageUrl: trail.pageUrl,
        hints: [trail.pageTitle, ...hints].filter(Boolean).map((hint) => hint.slice(0, 300)),
      };
      let resolution = resolveOffer(this.state.trails, tabId, page);

      // the same application signalled twice (submit, then its thank-you page). Another offer sent from the
      // same tab (Easy Apply to two jobs in a row) is a new question.
      const open = this.state.prompts.find((prompt) => {
        if (prompt.tabId !== tabId || now - prompt.createdAt > SAME_APPLICATION_MS) return false;
        const before = prompt.resolution.offer;
        return !before || !resolution.offer || sameOffer(before, resolution.offer);
      });
      if (open) {
        if (kind === 'confirmation' && !open.confirmed) {
          open.confirmed = true;
          if (open.state === 'waiting') this.ask(open);
          else this.push(open);
          await this.persist();
        }
        return;
      }
      // answered already: the thank-you page of the form just answered, or a page about that job, is a repeat.
      // Anything else sent later from this tab is another application whose offer the extension did not read.
      const done = resolution.offer ? this.state.answered[offerKey(resolution.offer)] : undefined;
      if (done) {
        if (now - done.at < REPEAT_WINDOW_MS || offerFitsPage(resolution.offer!, page)) return;
        resolution = { offer: null, by: 'none', confidence: 'low', candidates: resolution.candidates };
      }
      // offers already saved or turned down are not suggested again
      const chosen = resolution.offer;
      resolution = { ...resolution, candidates: resolution.candidates.filter((offer) => (chosen && sameOffer(offer, chosen)) || !this.state.answered[offerKey(offer)]) };

      const prompt: PromptRecord = {
        id: this.deps.newId(),
        tabId,
        createdAt: now,
        state: 'waiting',
        confirmed: kind === 'confirmation',
        resolution,
        formUrl: trail.pageUrl,
        appliedOn: localDay(now),
        snoozed: false,
      };
      this.state.prompts.push(prompt);
      if (kind === 'confirmation') this.ask(prompt);
      else this.deps.later(SUBMIT_SETTLE_MS, () => void this.settle(prompt.id));
      await this.persist();
    });
  }

  /** The form came back with errors: it was not sent after all. */
  cancel(tabId: number): Promise<void> {
    return this.run(async () => {
      const before = this.state.prompts.length;
      this.state.prompts = this.state.prompts.filter((prompt) => !(prompt.tabId === tabId && prompt.state === 'waiting' && !prompt.confirmed));
      if (this.state.prompts.length !== before) await this.persist();
    });
  }

  private settle(promptId: string): Promise<void> {
    return this.run(async () => {
      const prompt = this.state.prompts.find((p) => p.id === promptId);
      if (prompt?.state !== 'waiting') return;
      this.ask(prompt);
      await this.persist();
    });
  }

  private ask(prompt: PromptRecord): void {
    prompt.state = 'asking';
    this.push(prompt);
  }

  /** Shows the question in its tab (if the page is there to show it), on the toolbar badge and in the panel. */
  private push(prompt: PromptRecord): void {
    if (!prompt.snoozed) this.deps.sendToTab(prompt.tabId, { action: 'SHOW_APPLY_PROMPT', prompt: this.toPublic(prompt) }).catch(() => undefined);
    this.refreshBadge(prompt.tabId);
    this.deps.notifyPanel();
  }

  private refreshBadge(tabId: number): void {
    this.deps.setBadge(tabId, this.state.prompts.filter((p) => p.tabId === tabId && p.state === 'asking').length);
  }

  /* ------------------------------------------------------------------ */
  /* Answers                                                              */
  /* ------------------------------------------------------------------ */

  listPrompts(): Promise<ApplyPrompt[]> {
    return this.run(() => this.state.prompts.filter((p) => p.state === 'asking').sort((a, b) => b.createdAt - a.createdAt).map((p) => this.toPublic(p)));
  }

  answer(promptId: string, answer: 'yes' | 'no' | 'later', edits: { title?: string; company?: string; candidate?: number } = {}): Promise<ApplyAnswerResponse> {
    return this.run(async (): Promise<ApplyAnswerResponse> => {
      const prompt = this.state.prompts.find((p) => p.id === promptId);
      if (!prompt) return { ok: false, message: 'This question has expired.', state: 'error' };
      const resolved = prompt.resolution.offer;

      if (answer === 'later') {
        prompt.snoozed = true;
        await this.persist();
        this.deps.notifyPanel();
        return { ok: true, message: 'Kept in the CVMaker panel.', state: 'snoozed' };
      }

      const chosen = edits.candidate != null ? prompt.resolution.candidates[edits.candidate] ?? resolved : resolved;
      if (answer === 'no') {
        if (chosen) this.state.answered[offerKey(chosen)] = { at: this.deps.now(), answer: 'dismissed' };
        this.close(prompt);
        await this.persist();
        return { ok: true, message: 'Not saved.', state: 'dismissed' };
      }

      const title = (edits.title ?? chosen?.title ?? '').replace(/\s+/g, ' ').trim();
      const company = (edits.company ?? chosen?.company ?? '').replace(/\s+/g, ' ').trim();
      if (!company) return { ok: false, message: 'Which company did you apply to?', state: 'error' };
      if (!title) return { ok: false, message: 'Which position did you apply for?', state: 'error' };

      // retitled into another job altogether: the description and link read belong to the other one
      const sameJob = !!chosen && titleOverlap(chosen.title, title) >= 0.5;
      const application: AppApplication = {
        title,
        company,
        url: sameJob ? chosen?.url ?? '' : '',
        description: sameJob ? chosen?.mandate ?? '' : '',
        salary: sameJob ? chosen?.salary ?? '' : '',
        channel: channelFor(chosen?.url ?? '', prompt.formUrl),
        appliedOn: prompt.appliedOn,
      };

      let response: ApplyAnswerResponse;
      try {
        const saved = await this.deps.saveToApp(application);
        response = {
          ok: true,
          message: saved.message,
          state: saved.action === 'created' ? 'saved' : saved.action === 'promoted' ? 'updated' : 'duplicate',
        };
      } catch (error) {
        if (!(error instanceof AppOfflineError)) {
          // refused by the app (no profile open, a field it rejects): the question stays, the user can fix it
          return { ok: false, message: error instanceof Error ? error.message : 'CVMaker refused it.', state: 'error' };
        }
        this.local!.outbox = [...this.local!.outbox.filter((queued) => offerKey(queued) !== offerKey(application)), application].slice(-50);
        await this.persistLocal();
        response = { ok: true, message: 'CVMaker is closed: it will be saved as soon as the app is open.', state: 'queued' };
      }

      const at = this.deps.now();
      this.state.answered[offerKey(application)] = { at, answer: 'saved' };
      if (chosen) this.state.answered[offerKey(chosen)] = { at, answer: 'saved' };
      this.close(prompt);
      await this.persist();
      return response;
    });
  }

  private close(prompt: PromptRecord): void {
    this.state.prompts = this.state.prompts.filter((p) => p.id !== prompt.id);
    this.deps.sendToTab(prompt.tabId, { action: 'HIDE_APPLY_PROMPT', promptId: prompt.id }).catch(() => undefined);
    this.refreshBadge(prompt.tabId);
    this.deps.notifyPanel();
  }

  /* ------------------------------------------------------------------ */
  /* Settings and outbox                                                  */
  /* ------------------------------------------------------------------ */

  getEnabled(): Promise<{ enabled: boolean; queued: number }> {
    return this.run(() => ({ enabled: this.local!.enabled, queued: this.local!.outbox.length }));
  }

  setEnabled(enabled: boolean): Promise<void> {
    return this.run(async () => {
      this.local!.enabled = enabled;
      if (!enabled) {
        // nothing kept about the pages browsed while it is off
        for (const prompt of this.state.prompts) this.deps.sendToTab(prompt.tabId, { action: 'HIDE_APPLY_PROMPT', promptId: prompt.id }).catch(() => undefined);
        this.state.trails = {};
        this.state.prompts = [];
        await this.persist();
        this.deps.notifyPanel();
      }
      await this.persistLocal();
    });
  }

  private flushOutboxSoon(): Promise<void> {
    const now = this.deps.now();
    if (!this.local!.outbox.length || now - this.lastFlush < OUTBOX_RETRY_MS) return Promise.resolve();
    this.lastFlush = now;
    return this.flushOutbox();
  }

  /** Sends what waited while the app was closed. Refused ones are dropped (retrying would not change the answer). */
  flushOutbox(): Promise<void> {
    return this.run(async () => {
      const pending = [...this.local!.outbox];
      const kept: AppApplication[] = [];
      for (const application of pending) {
        try {
          await this.deps.saveToApp(application);
        } catch (error) {
          if (error instanceof AppOfflineError) {
            kept.push(...pending.slice(pending.indexOf(application)));
            break;
          }
          console.warn('[CVMaker] A queued application was refused', error);
        }
      }
      this.local!.outbox = kept;
      await this.persistLocal();
    });
  }

  /* ------------------------------------------------------------------ */

  private toPublic(prompt: PromptRecord): ApplyPrompt {
    const offer = prompt.resolution.offer;
    return {
      id: prompt.id,
      tabId: prompt.tabId,
      createdAt: prompt.createdAt,
      confirmed: prompt.confirmed,
      title: offer?.title ?? '',
      company: offer?.company ?? '',
      url: offer?.url ?? '',
      by: prompt.resolution.by,
      confidence: prompt.resolution.confidence,
      offerHost: hostOf(offer?.url ?? ''),
      formHost: hostOf(prompt.formUrl),
      hasDescription: (offer?.mandate.length ?? 0) > 80,
      candidates: prompt.resolution.candidates.map((candidate, index) => ({ index, title: candidate.title, company: candidate.company, host: hostOf(candidate.url) })),
      snoozed: prompt.snoozed,
    };
  }
}
