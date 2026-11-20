import browser from 'webextension-polyfill';
import { saveApplication } from '../core/localServer';
import type { TrackMessage } from '../core/messages';
import { ApplicationTracker, type LocalState, type SessionState } from './tracker';

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
browser.runtime.onStartup.addListener(() => void tracker.flushOutbox());

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
