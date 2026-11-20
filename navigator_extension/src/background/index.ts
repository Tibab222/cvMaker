import browser from 'webextension-polyfill';
import { captureAnswers, matchAnswers, saveApplication } from '../core/localServer';
import type { AnswerMessage, CapturedAnswer, TrackMessage } from '../core/messages';
import { AppOfflineError, ApplicationTracker, type LocalState, type SessionState } from './tracker';

/**
 * Chrome only: open the side panel when the toolbar button is clicked (Firefox uses sidebar_action instead).
 * The sidePanel API is not in webextension-polyfill, hence the direct, guarded access.
 */
interface ChromeSidePanel {
  setPanelBehavior?: (options: { openPanelOnActionClick: boolean }) => Promise<void>;
}

const sidePanel = (globalThis as { chrome?: { sidePanel?: ChromeSidePanel } }).chrome?.sidePanel;

sidePanel?.setPanelBehavior?.({ openPanelOnActionClick: true }).catch((error: unknown) => {
  console.warn('[CVMaker] Could not set the side panel behavior', error);
});

/* ------------------------------------------------------------------ */
/* Application tracking                                                 */
/* ------------------------------------------------------------------ */

type Area = { get(key: string): Promise<Record<string, unknown>>; set(items: Record<string, unknown>): Promise<void> };

/** Session storage survives the background script being stopped, not a browser restart. Memory if unavailable. */
const memory: Record<string, unknown> = {};
const sessionArea: Area = (browser.storage as unknown as { session?: Area }).session ?? {
  get: async (key) => ({ [key]: memory[key] }),
  set: async (items) => void Object.assign(memory, items),
};

const action = (browser as unknown as { action?: { setBadgeText(d: { tabId: number; text: string }): Promise<void>; setBadgeBackgroundColor(d: { tabId: number; color: string }): Promise<void> } }).action;

const tracker = new ApplicationTracker({
  now: () => Date.now(),
  loadSession: async () => (await sessionArea.get('tracking')).tracking as SessionState | undefined,
  saveSession: (state) => sessionArea.set({ tracking: state }),
  loadLocal: async () => (await browser.storage.local.get('tracking')).tracking as LocalState | undefined,
  saveLocal: (state) => browser.storage.local.set({ tracking: state }),
  sendToTab: (tabId, message) => browser.tabs.sendMessage(tabId, message, { frameId: 0 }),
  // the panel may be closed: nobody to tell then
  notifyPanel: () => void browser.runtime.sendMessage({ action: 'PROMPTS_CHANGED' }).catch(() => undefined),
  setBadge: (tabId, count) => {
    if (!action) return; // Firefox: the panel is a sidebar, no toolbar badge
    action.setBadgeText({ tabId, text: count ? '1' : '' }).catch(() => undefined);
    if (count) action.setBadgeBackgroundColor({ tabId, color: '#5b5bd6' }).catch(() => undefined);
  },
  saveToApp: saveApplication,
  later: (ms, task) => void setTimeout(task, ms),
  newId: () => crypto.randomUUID(),
});

// listeners at the top level: the browser wakes the background script for them
browser.tabs.onCreated.addListener((tab) => {
  if (tab.id != null) void tracker.tabCreated(tab.id, tab.openerTabId ?? null);
});
browser.tabs.onRemoved.addListener((tabId) => void tracker.tabRemoved(tabId));
browser.runtime.onStartup.addListener(() => {
  void tracker.flushOutbox();
  void keepAnswers([]);
});

/* ------------------------------------------------------------------ */
/* Answer bank                                                          */
/* ------------------------------------------------------------------ */

/** Answers read while the app was closed, sent with the next ones. Old ones go first when it is full. */
const ANSWER_OUTBOX = 'answerOutbox';
const MAX_OUTBOX = 300;

async function keepAnswers(answers: CapturedAnswer[]): Promise<void> {
  const stored = ((await browser.storage.local.get(ANSWER_OUTBOX))[ANSWER_OUTBOX] as CapturedAnswer[] | undefined) ?? [];
  const pending = [...stored, ...answers];
  try {
    // chunks: the app takes 60 answers per call
    for (let start = 0; start < pending.length; start += 60) await captureAnswers(pending.slice(start, start + 60));
    if (stored.length) await browser.storage.local.remove(ANSWER_OUTBOX);
  } catch (error) {
    if (!(error instanceof AppOfflineError)) {
      console.warn('[CVMaker] Answers refused', error);
      return;
    }
    await browser.storage.local.set({ [ANSWER_OUTBOX]: pending.slice(-MAX_OUTBOX) });
  }
}

browser.runtime.onMessage.addListener(((request: unknown) => {
  const message = request as AnswerMessage;
  if (message?.action === 'ANSWERS_CAPTURED') return keepAnswers(Array.isArray(message.answers) ? message.answers : []);
  if (message?.action === 'MATCH_ANSWERS') return matchAnswers(Array.isArray(message.questions) ? message.questions : []);
  return undefined;
}) as Parameters<typeof browser.runtime.onMessage.addListener>[0]);

const TRACK_ACTIONS = new Set(['TRACK_HELLO', 'OFFER_SEEN', 'APPLY_SIGNAL', 'APPLY_CANCEL', 'APPLY_ANSWER', 'LIST_PROMPTS', 'GET_TRACKING', 'SET_TRACKING']);

browser.runtime.onMessage.addListener(((request: unknown, sender: browser.Runtime.MessageSender) => {
  const message = request as TrackMessage;
  // other messages (autofill reports...) are for the panel
  if (!message || !TRACK_ACTIONS.has(message.action)) return undefined;
  const tabId = sender.tab?.id;
  const fromTop = sender.frameId === 0;

  switch (message.action) {
    case 'TRACK_HELLO':
      return tabId != null && fromTop ? tracker.hello(tabId, message) : Promise.resolve({ enabled: false, prompt: null });
    case 'OFFER_SEEN':
      return tabId != null && fromTop ? tracker.offerSeen(tabId, message.offer, message.atApply) : Promise.resolve();
    case 'APPLY_SIGNAL':
      return tabId != null ? tracker.signal(tabId, message.kind, message.hints) : Promise.resolve();
    case 'APPLY_CANCEL':
      return tabId != null ? tracker.cancel(tabId) : Promise.resolve();
    case 'APPLY_ANSWER':
      return tracker.answer(message.promptId, message.answer, { title: message.title, company: message.company, candidate: message.candidate });
    case 'LIST_PROMPTS':
      return tracker.listPrompts();
    case 'GET_TRACKING':
      return tracker.getEnabled();
    case 'SET_TRACKING':
      return tracker.setEnabled(message.enabled);
  }
  return undefined;
}) as Parameters<typeof browser.runtime.onMessage.addListener>[0]);
