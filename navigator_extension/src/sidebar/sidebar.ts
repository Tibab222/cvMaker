import browser from 'webextension-polyfill';
import './sidebar.css';
import type {
  AttentionReason,
  AutofillReport,
  AutofillReportMessage,
  AutofillRequestMessage,
  CVMakerPayload,
  ExtractRequestMessage,
  ExtractResponseMessage,
} from '../core/messages';
import { getAppStatus, getAutofillProfile, sendOffer } from '../core/localServer';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const els = {
  connDot: $('conn-dot'),
  connText: $('conn-text'),
  tabs: document.querySelector<HTMLElement>('.tabs')!,
  scanBtn: $<HTMLButtonElement>('scan-btn'),
  offerForm: $<HTMLFormElement>('offer-form'),
  offerActions: $('offer-actions'),
  queueBtn: $<HTMLButtonElement>('queue-btn'),
  openBtn: $<HTMLButtonElement>('open-btn'),
  title: $<HTMLInputElement>('job-title'),
  company: $<HTMLInputElement>('job-company'),
  salary: $<HTMLInputElement>('job-salary'),
  url: $<HTMLInputElement>('job-url'),
  mandate: $<HTMLTextAreaElement>('job-mandate'),
  mandateCount: $('mandate-count'),
  fillBtn: $<HTMLButtonElement>('fill-btn'),
  fillResult: $('fill-result'),
  filledCount: $('filled-count'),
  attentionCount: $('attention-count'),
  keptCount: $('kept-count'),
  filledList: $<HTMLUListElement>('filled-list'),
  attentionList: $<HTMLUListElement>('attention-list'),
  clearBtn: $<HTMLButtonElement>('clear-btn'),
  toast: $('toast'),
};

/* ------------------------------------------------------------------ */
/* Small UI helpers                                                    */
/* ------------------------------------------------------------------ */

let toastTimer: number | undefined;
function toast(message: string, tone: 'info' | 'success' | 'error' = 'info') {
  els.toast.textContent = message;
  els.toast.dataset.tone = tone;
  els.toast.dataset.show = 'true';
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => (els.toast.dataset.show = 'false'), tone === 'error' ? 5000 : 3000);
}

/** Disables a button and shows a shimmer while the task runs. */
async function busy<T>(button: HTMLButtonElement, label: string, task: () => Promise<T>): Promise<T | undefined> {
  const text = button.querySelector('span');
  const previous = text?.textContent ?? '';
  button.disabled = true;
  button.dataset.busy = 'true';
  if (text) text.textContent = label;
  try {
    return await task();
  } finally {
    button.disabled = false;
    button.dataset.busy = 'false';
    if (text) text.textContent = previous;
  }
}

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

async function activeTab() {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error('No active tab');
  return tab;
}

/** Content scripts are only injected in pages loaded after the extension: say so instead of a cryptic error. */
const NOT_INJECTED = 'This page was open before the extension was loaded. Reload it, then try again.';

/* ------------------------------------------------------------------ */
/* Connection to the desktop app                                       */
/* ------------------------------------------------------------------ */

async function refreshConnection() {
  const status = await getAppStatus();
  if (!status.online) {
    els.connDot.dataset.state = 'offline';
    els.connText.textContent = 'Desktop app not running';
  } else if (!status.profileLoaded) {
    els.connDot.dataset.state = 'noprofile';
    els.connText.textContent = 'Connected · open a profile';
  } else {
    els.connDot.dataset.state = 'online';
    els.connText.textContent = `Connected · ${status.profileName ?? 'profile open'}`;
  }
}

/* ------------------------------------------------------------------ */
/* Tabs                                                                */
/* ------------------------------------------------------------------ */

function selectTab(tab: 'offer' | 'apply') {
  els.tabs.dataset.tab = tab;
  document.querySelectorAll<HTMLButtonElement>('.tab').forEach((button) => {
    button.setAttribute('aria-selected', String(button.dataset.tab === tab));
  });
  document.querySelectorAll<HTMLElement>('.panel').forEach((panel) => {
    panel.dataset.active = String(panel.id === `panel-${tab}`);
  });
  try {
    localStorage.setItem('cvmaker.tab', tab);
  } catch {
    /* storage can be unavailable: the panel just opens on the first tab */
  }
}

document.querySelectorAll<HTMLButtonElement>('.tab').forEach((button) => {
  button.addEventListener('click', () => selectTab(button.dataset.tab as 'offer' | 'apply'));
});

/* ------------------------------------------------------------------ */
/* Offer                                                               */
/* ------------------------------------------------------------------ */

function updateCount() {
  const length = els.mandate.value.trim().length;
  els.mandateCount.textContent = length ? `${length.toLocaleString()} chars` : '';
}

function fillOffer(response: ExtractResponseMessage, fallbackUrl: string) {
  const fields: [HTMLInputElement | HTMLTextAreaElement, string][] = [
    [els.title, response.title],
    [els.company, response.company],
    [els.salary, response.salary],
    [els.url, response.url || fallbackUrl],
    [els.mandate, response.mandate],
  ];
  fields.forEach(([field, value], index) => {
    field.value = value || '';
    field.classList.remove('flash');
    // staggered flash: the eye follows what was just filled
    window.setTimeout(() => field.classList.add('flash'), index * 70);
  });
  updateCount();
  els.offerForm.hidden = false;
  els.offerActions.hidden = false;
}

els.mandate.addEventListener('input', updateCount);

els.scanBtn.addEventListener('click', () => busy(els.scanBtn, 'Reading the page…', async () => {
  try {
    const tab = await activeTab();
    const response = (await browser.tabs.sendMessage(tab.id!, { action: 'EXTRACT_AND_HIGHLIGHT' } satisfies ExtractRequestMessage, { frameId: 0 })) as ExtractResponseMessage | undefined;
    if (!response) throw new Error(NOT_INJECTED);
    fillOffer(response, tab.url ?? '');
    if (!response.title && !response.mandate) toast('Nothing found here. Select the text of the offer, or fill the fields by hand.', 'error');
  } catch (error) {
    const message = errorText(error);
    toast(/receiving end|establish connection/i.test(message) ? NOT_INJECTED : message, 'error');
  }
}));

function currentOffer(mode: 'open' | 'queue'): CVMakerPayload | null {
  const payload: CVMakerPayload = {
    title: els.title.value.trim(),
    company: els.company.value.trim(),
    salary: els.salary.value.trim(),
    url: els.url.value.trim(),
    mandate: els.mandate.value.trim(),
    extractedAt: new Date().toISOString(),
    mode,
  };
  if (!payload.title && !payload.mandate) {
    toast('Add at least a title or a description.', 'error');
    els.title.focus();
    return null;
  }
  return payload;
}

els.openBtn.addEventListener('click', () => {
  const payload = currentOffer('open');
  if (!payload) return;
  void busy(els.openBtn, 'Sending…', async () => {
    try {
      await sendOffer(payload);
      toast('Opened in CVMaker', 'success');
    } catch (error) {
      toast(errorText(error), 'error');
    }
  });
});

els.queueBtn.addEventListener('click', () => {
  const payload = currentOffer('queue');
  if (!payload) return;
  void busy(els.queueBtn, 'Saving…', async () => {
    try {
      const message = await sendOffer(payload);
      toast(`${message} · Opportunities`, 'success');
    } catch (error) {
      toast(errorText(error), 'error');
    }
  });
});

/* ------------------------------------------------------------------ */
/* Apply: prefill                                                      */
/* ------------------------------------------------------------------ */

const REASON_LABEL: Record<AttentionReason, string> = {
  file: 'Upload',
  sensitive: 'Your answer',
  question: 'To write',
  choice: 'To choose',
  required: 'Required',
};

const CHECK_ICON = '<svg class="mark" viewBox="0 0 24 24"><path d="M5 12l4 4L19 6"/></svg>';
const POINT_ICON = '<svg class="mark" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 8v4M12 16h.01"/></svg>';

function listItem(className: string, icon: string, label: string, trailing: HTMLElement, index: number): HTMLLIElement {
  const item = document.createElement('li');
  item.className = className;
  item.style.animationDelay = `${index * 40}ms`;
  item.innerHTML = icon;
  const text = document.createElement('span');
  text.textContent = label;
  item.append(text, trailing);
  return item;
}

function renderReport(report: AutofillReport) {
  els.filledCount.textContent = String(report.filled.length);
  els.attentionCount.textContent = String(report.attention.length);
  els.keptCount.textContent = String(report.alreadyFilled);

  els.filledList.replaceChildren(
    ...report.filled.map((field, index) => {
      const value = document.createElement('span');
      value.className = 'value';
      value.textContent = field.value;
      value.title = field.value;
      return listItem('ok', CHECK_ICON, field.label, value, index);
    }),
  );
  if (report.filled.length === 0) els.filledList.innerHTML = '<li class="empty">Nothing was filled on this page.</li>';

  // files first: attaching the CV is the most common thing left to do
  const order: AttentionReason[] = ['file', 'required', 'choice', 'question', 'sensitive'];
  const attention = [...report.attention].sort((a, b) => order.indexOf(a.reason) - order.indexOf(b.reason));
  els.attentionList.replaceChildren(
    ...attention.map((field, index) => {
      const badge = document.createElement('span');
      badge.className = `badge ${field.reason}`;
      badge.textContent = REASON_LABEL[field.reason];
      return listItem('warn', POINT_ICON, field.label, badge, index);
    }),
  );
  if (attention.length === 0) els.attentionList.innerHTML = '<li class="empty">Nothing else spotted. Still read the whole form.</li>';

  els.fillResult.hidden = false;
}

function mergeReports(reports: AutofillReport[]): AutofillReport {
  return {
    filled: reports.flatMap((report) => report.filled),
    attention: reports.flatMap((report) => report.attention),
    alreadyFilled: reports.reduce((sum, report) => sum + report.alreadyFilled, 0),
  };
}

els.fillBtn.addEventListener('click', () => busy(els.fillBtn, 'Filling…', async () => {
  try {
    const [profile, tab] = await Promise.all([getAutofillProfile(), activeTab()]);
    const runId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const reports: AutofillReport[] = [];

    // every frame holding fields reports on its own (forms often live in an iframe)
    const onReport = (message: unknown) => {
      const report = message as AutofillReportMessage;
      if (report?.action === 'AUTOFILL_REPORT' && report.runId === runId) reports.push(report.report);
      return undefined;
    };
    browser.runtime.onMessage.addListener(onReport);
    try {
      const ack = await browser.tabs.sendMessage(tab.id!, { action: 'AUTOFILL', runId, profile } satisfies AutofillRequestMessage).catch(() => null);
      if (!ack) throw new Error(NOT_INJECTED);
      await new Promise((resolve) => window.setTimeout(resolve, 700));
    } finally {
      browser.runtime.onMessage.removeListener(onReport);
    }

    const report = mergeReports(reports);
    renderReport(report);
    if (report.filled.length > 0) toast(`${report.filled.length} field${report.filled.length > 1 ? 's' : ''} filled. Check them before sending.`, 'success');
    else if (report.attention.length === 0) toast('No application form found on this page.', 'error');
  } catch (error) {
    toast(errorText(error), 'error');
  }
}));

els.clearBtn.addEventListener('click', async () => {
  try {
    const tab = await activeTab();
    await browser.tabs.sendMessage(tab.id!, { action: 'CLEAR_AUTOFILL' }).catch(() => undefined);
    els.fillResult.hidden = true;
  } catch (error) {
    toast(errorText(error), 'error');
  }
});

/* ------------------------------------------------------------------ */
/* Start                                                               */
/* ------------------------------------------------------------------ */

try {
  const saved = localStorage.getItem('cvmaker.tab');
  selectTab(saved === 'apply' ? 'apply' : 'offer');
} catch {
  selectTab('offer');
}
void refreshConnection();
window.setInterval(() => void refreshConnection(), 8000);
window.addEventListener('focus', () => void refreshConnection());
