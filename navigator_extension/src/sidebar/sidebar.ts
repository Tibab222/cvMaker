import browser from 'webextension-polyfill';
import './sidebar.css';
import type {
  AttentionReason,
  AutofillReport,
  AutofillReportMessage,
  AutofillRequestMessage,
  CVMakerPayload,
  AttachReportMessage,
  AttachResumeMessage,
  ExtractOfferMessage,
  ExtractOfferResponse,
  ExtractRequestMessage,
  ExtractResponseMessage,
  VaultMatch,
  VaultResume,
  ApplyAnswerResponse,
  ApplyPrompt,
  PromptsChangedMessage,
  TrackMessage,
} from '../core/messages';
import { getAppStatus, getAutofillProfile, getVault, getVaultFile, matchVault, sendOffer } from '../core/localServer';

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
  offerVault: $('offer-vault'),
  offerVaultHint: $('offer-vault-hint'),
  offerVaultList: $<HTMLUListElement>('offer-vault-list'),
  useResumeBtn: $<HTMLButtonElement>('use-resume-btn'),
  applyVaultHint: $('apply-vault-hint'),
  applyVaultList: $<HTMLUListElement>('apply-vault-list'),
  vaultRefresh: $<HTMLButtonElement>('vault-refresh'),
  attachBtn: $<HTMLButtonElement>('attach-btn'),
  vaultSave: $<HTMLAnchorElement>('vault-save'),
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

let wasReady = false;

async function refreshConnection() {
  const status = await getAppStatus();
  // the app (or a profile) just came up: the vault card can now say something useful
  const ready = status.online && status.profileLoaded;
  if (ready && !wasReady && els.tabs.dataset.tab === 'apply') void loadVault({ force: true });
  wasReady = ready;
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
  if (tab === 'apply') void loadVault();
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
    else void loadVault({ force: true });
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
/* Resume vault: which existing resume fits, and attach it             */
/* ------------------------------------------------------------------ */

interface VaultView {
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string;
  resumes: VaultResume[];
  /** Scores for the offer last ranked, by resume id; null when no offer was found to rank against. */
  matches: Map<string, VaultMatch> | null;
  /** What was ranked (offer fields, or the page URL), to avoid ranking the same offer twice. */
  rankedFor: string | null;
  rankedTitle: string;
  selected: string | null;
}

const vault: VaultView = { status: 'idle', error: '', resumes: [], matches: null, rankedFor: null, rankedTitle: '', selected: null };
let vaultRun = 0;
let savedUrl: string | null = null;

const STRONG = 70;
const PARTIAL = 45;
const scoreTone = (score: number) => (score >= STRONG ? 'strong' : score >= PARTIAL ? 'partial' : 'weak');

/** Resumes in display order: best score first, resumes that cannot be ranked (scanned PDFs) last. */
function orderedResumes(): { resume: VaultResume; match: VaultMatch | null }[] {
  const rows = vault.resumes.map((resume) => ({ resume, match: vault.matches?.get(resume.id) ?? null }));
  if (!vault.matches) return rows;
  return rows.sort((a, b) => (b.match?.score ?? -1) - (a.match?.score ?? -1));
}

/** The offer to rank against: what the Offer tab holds, else what can be read on the page. */
async function offerToRank(): Promise<{ title: string; description: string; key: string } | null> {
  const title = els.title.value.trim();
  const description = els.mandate.value.trim();
  if (title || description) return { title, description, key: `form:${title}:${description.length}` };
  const tab = await activeTab();
  const page = (await browser.tabs
    .sendMessage(tab.id!, { action: 'EXTRACT_OFFER' } satisfies ExtractOfferMessage, { frameId: 0 })
    .catch(() => null)) as ExtractOfferResponse | null;
  if (!page || (!page.title && !page.mandate)) return null;
  return { title: page.title, description: page.mandate, key: `page:${tab.url ?? ''}:${page.title}` };
}

async function loadVault({ force = false }: { force?: boolean } = {}) {
  const run = ++vaultRun;
  vault.status = 'loading';
  renderVault();
  try {
    const resumes = await getVault();
    let matches = vault.matches;
    let rankedFor = vault.rankedFor;
    let rankedTitle = vault.rankedTitle;
    if (resumes.some((resume) => resume.has_text)) {
      const offer = await offerToRank().catch(() => null);
      if (!offer) {
        matches = null;
        rankedFor = null;
      } else if (force || offer.key !== vault.rankedFor || !matches) {
        matches = new Map((await matchVault(offer)).map((match) => [match.resume_id, match]));
        rankedFor = offer.key;
        rankedTitle = offer.title;
      }
    } else {
      matches = null;
      rankedFor = null;
    }
    if (run !== vaultRun) return; // a newer load started meanwhile (tab switch, rescan)

    const newRanking = rankedFor !== vault.rankedFor;
    Object.assign(vault, { status: 'ready', error: '', resumes, matches, rankedFor, rankedTitle });
    // a new offer picks its best resume; otherwise the user's choice stays
    if (newRanking || !resumes.some((resume) => resume.id === vault.selected)) vault.selected = orderedResumes()[0]?.resume.id ?? null;
  } catch (error) {
    if (run !== vaultRun) return;
    vault.status = 'error';
    vault.error = errorText(error);
  }
  renderVault();
}

const CHECK_SMALL = '<svg class="pick" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l4 4L19 6"/></svg>';

function resumeRow(resume: VaultResume, match: VaultMatch | null, best: boolean, index: number): HTMLLIElement {
  const item = document.createElement('li');
  item.style.animationDelay = `${index * 40}ms`;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'resume-row';
  button.setAttribute('aria-pressed', String(vault.selected === resume.id));
  button.addEventListener('click', () => {
    vault.selected = resume.id;
    renderVault();
  });

  const ring = document.createElement('span');
  ring.className = 'ring';
  const value = document.createElement('span');
  if (match) {
    ring.dataset.tone = scoreTone(match.score);
    ring.style.setProperty('--score', String(match.score));
    value.textContent = String(match.score);
    ring.title = 'Fit with this offer, out of 100';
  } else {
    ring.dataset.tone = 'none';
    value.textContent = '–';
    ring.title = resume.has_text ? 'Not ranked: no offer found' : 'Scanned PDF: no text to rank';
  }
  ring.append(value);

  const main = document.createElement('span');
  main.className = 'resume-main';
  const name = document.createElement('strong');
  name.textContent = resume.name;
  if (best) {
    const badge = document.createElement('span');
    badge.className = 'best';
    badge.textContent = 'Best fit';
    name.append(badge);
  }
  const details = document.createElement('small');
  const meta = `${resume.pages} p · ${resume.language.toUpperCase()}`;
  if (match && (match.matched.length || match.missing.length)) {
    details.append(`${meta} · `);
    const hit = document.createElement('span');
    hit.className = 'hit';
    hit.textContent = match.matched.slice(0, 3).join(', ');
    details.append(hit);
    if (match.missing.length) {
      const miss = document.createElement('span');
      miss.className = 'miss';
      miss.textContent = `${match.matched.length ? ' · ' : ''}no ${match.missing.slice(0, 2).join(', ')}`;
      details.append(miss);
    }
  } else {
    details.textContent = resume.has_text ? `${meta} · ${resume.keywords.slice(0, 3).join(', ')}` : `${meta} · scanned, cannot be ranked`;
  }
  details.title = details.textContent ?? '';
  main.append(name, details);

  button.append(ring, main);
  button.insertAdjacentHTML('beforeend', CHECK_SMALL);
  item.append(button);
  return item;
}

function setHint(element: HTMLElement, text: string, tone: 'muted' | 'good' | 'warn' | 'error' = 'muted') {
  element.textContent = text;
  element.dataset.tone = tone;
}

function renderVault() {
  const rows = orderedResumes();
  const bestId = vault.matches && rows[0]?.match && rows[0].match.score >= PARTIAL ? rows[0].resume.id : null;
  const renderList = (list: HTMLUListElement, limit: number) => {
    if (vault.status === 'loading' && vault.resumes.length === 0) {
      list.innerHTML = '<li class="skeleton"></li><li class="skeleton"></li>';
      return;
    }
    list.replaceChildren(...rows.slice(0, limit).map(({ resume, match }, index) => resumeRow(resume, match, resume.id === bestId, index)));
  };

  // Apply tab: always there, says what to do when it cannot help yet
  els.vaultRefresh.dataset.busy = String(vault.status === 'loading');
  renderList(els.applyVaultList, 50);
  els.attachBtn.hidden = vault.resumes.length === 0;
  els.attachBtn.disabled = !vault.selected || vault.status === 'loading';
  if (vault.status === 'error') setHint(els.applyVaultHint, vault.error, 'error');
  else if (vault.status === 'loading') setHint(els.applyVaultHint, vault.resumes.length ? 'Ranking your resumes for this offer…' : 'Opening your vault…');
  else if (vault.resumes.length === 0) setHint(els.applyVaultHint, 'Your vault is empty. Add your PDF resumes in CVMaker › Resume library › Vault.');
  else if (!vault.matches) setHint(els.applyVaultHint, 'No offer found on this page: scan it in the Offer tab to rank your resumes.');
  else setHint(els.applyVaultHint, `Ranked for “${vault.rankedTitle || 'this page'}”.`);

  // Offer tab: only once an offer was ranked, top 3
  const ranked = vault.status === 'ready' && vault.matches !== null && vault.matches.size > 0;
  els.offerVault.hidden = !ranked;
  if (ranked) {
    renderList(els.offerVaultList, 3);
    const best = rows[0]?.match?.score ?? 0;
    if (best >= STRONG) setHint(els.offerVaultHint, 'Already a good fit: no need to tailor a new resume.', 'good');
    else if (best >= PARTIAL) setHint(els.offerVaultHint, 'Close. Tailoring one would cover what is missing.', 'warn');
    else setHint(els.offerVaultHint, 'None of them fits well: tailor a new one.', 'warn');
  }
}

els.vaultRefresh.addEventListener('click', () => void loadVault({ force: true }));
els.useResumeBtn.addEventListener('click', () => selectTab('apply'));

function bytesOf(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

/** When no field fits, the user gets the file to upload by hand. */
function offerSavedCopy(fileName: string, mime: string, data: string) {
  if (savedUrl) URL.revokeObjectURL(savedUrl);
  savedUrl = URL.createObjectURL(new Blob([bytesOf(data)], { type: mime }));
  els.vaultSave.href = savedUrl;
  els.vaultSave.download = fileName;
  els.vaultSave.hidden = false;
}

els.attachBtn.addEventListener('click', () => busy(els.attachBtn, 'Attaching…', async () => {
  const selected = vault.resumes.find((resume) => resume.id === vault.selected);
  if (!selected) return;
  els.vaultSave.hidden = true;
  try {
    const [file, tab] = await Promise.all([getVaultFile(selected.id), activeTab()]);
    const runId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const reports: AttachReportMessage[] = [];
    const onReport = (message: unknown) => {
      const report = message as AttachReportMessage;
      if (report?.action === 'ATTACH_REPORT' && report.runId === runId) reports.push(report);
      return undefined;
    };
    browser.runtime.onMessage.addListener(onReport);
    try {
      const ack = await browser.tabs.sendMessage(tab.id!, { action: 'ATTACH_RESUME', runId, ...file } satisfies AttachResumeMessage).catch(() => null);
      if (!ack) throw new Error(NOT_INJECTED);
      await new Promise((resolve) => window.setTimeout(resolve, 600));
    } finally {
      browser.runtime.onMessage.removeListener(onReport);
    }

    const attached = reports.find((report) => report.attached);
    if (attached) {
      toast(`“${selected.name}” attached to ${attached.attached}. Check it on the page.`, 'success');
      return;
    }
    const fileFields = reports.reduce((sum, report) => sum + report.fileFields, 0);
    offerSavedCopy(file.fileName, file.mime, file.data);
    toast(fileFields > 0
      ? 'No file field here says Resume or CV. Save the copy below and pick it with the page\'s upload button.'
      : 'No file field on this page yet. Some forms show it after a first step.', 'error');
  } catch (error) {
    toast(errorText(error), 'error');
  }
}));

// the panel follows the browser: another tab or page means another offer
let followTimer: number | undefined;
function followActiveTab() {
  if (els.tabs.dataset.tab !== 'apply') return;
  window.clearTimeout(followTimer);
  followTimer = window.setTimeout(() => void loadVault(), 500);
}
browser.tabs.onActivated.addListener(followActiveTab);
browser.tabs.onUpdated.addListener((_id, change, tab) => {
  if (tab.active && change.status === 'complete') followActiveTab();
});

/* ------------------------------------------------------------------ */
/* Applications noticed on pages                                       */
/* ------------------------------------------------------------------ */

const inbox = $('track-inbox');
const trackList = $<HTMLUListElement>('track-list');
const trackToggle = $<HTMLInputElement>('track-toggle');
const trackHint = $('track-hint');
const TRACK_HINT = trackHint.textContent ?? '';

const ago = (ms: number) => {
  const minutes = Math.round((Date.now() - ms) / 60000);
  return minutes < 1 ? 'just now' : minutes < 60 ? `${minutes} min ago` : `${Math.round(minutes / 60)} h ago`;
};

function trackRow(prompt: ApplyPrompt, index: number): HTMLLIElement {
  const item = document.createElement('li');
  item.className = 'track-item';
  item.style.animationDelay = `${index * 40}ms`;
  const complete = !!(prompt.title && prompt.company);

  const head = document.createElement('div');
  const title = document.createElement('input');
  const company = document.createElement('input');
  if (complete) {
    const strong = document.createElement('strong');
    strong.textContent = `${prompt.title} · ${prompt.company}`;
    head.append(strong);
  } else {
    // nothing read before the form: the user names it here
    title.placeholder = 'Position';
    title.value = prompt.title;
    company.placeholder = 'Company';
    company.value = prompt.company;
    head.append(title, company);
    head.style.display = 'grid';
    head.style.gap = '6px';
  }
  const meta = document.createElement('small');
  meta.className = prompt.confirmed ? 'ok' : prompt.confidence === 'high' ? '' : 'warn';
  meta.textContent = [prompt.confirmed ? 'Confirmed by the site' : 'Form sent', prompt.formHost, ago(prompt.createdAt)].filter(Boolean).join(' · ');
  head.append(meta);

  const error = document.createElement('p');
  error.className = 'track-error';
  const actions = document.createElement('div');
  actions.className = 'track-actions';
  const no = document.createElement('button');
  no.className = 'btn secondary';
  no.type = 'button';
  no.textContent = 'No';
  const yes = document.createElement('button');
  yes.className = 'btn primary';
  yes.type = 'button';
  yes.textContent = 'Yes, save it';
  actions.append(no, yes);

  const reply = (answer: 'yes' | 'no') => busy(answer === 'yes' ? yes : no, answer === 'yes' ? 'Saving…' : '…', async () => {
    const edits = complete ? {} : { title: title.value, company: company.value };
    const response = (await browser.runtime.sendMessage({ action: 'APPLY_ANSWER', promptId: prompt.id, answer, ...edits } satisfies TrackMessage)) as ApplyAnswerResponse;
    if (!response.ok) {
      error.textContent = response.message;
      return;
    }
    if (answer === 'yes') toast(response.message, response.state === 'queued' ? 'info' : 'success');
    void renderInbox();
  });
  yes.addEventListener('click', () => void reply('yes'));
  no.addEventListener('click', () => void reply('no'));

  item.append(head, actions, error);
  return item;
}

async function renderInbox() {
  let prompts: ApplyPrompt[] = [];
  try {
    prompts = ((await browser.runtime.sendMessage({ action: 'LIST_PROMPTS' } satisfies TrackMessage)) as ApplyPrompt[]) ?? [];
  } catch {
    prompts = [];
  }
  inbox.hidden = prompts.length === 0;
  trackList.replaceChildren(...prompts.map(trackRow));
}

async function renderTrackingSetting() {
  try {
    const { enabled, queued } = (await browser.runtime.sendMessage({ action: 'GET_TRACKING' } satisfies TrackMessage)) as { enabled: boolean; queued: number };
    trackToggle.checked = enabled;
    trackHint.textContent = queued ? `${queued} application${queued > 1 ? 's' : ''} waiting: saved as soon as CVMaker is open.` : TRACK_HINT;
  } catch {
    trackToggle.checked = false;
  }
}

trackToggle.addEventListener('change', async () => {
  await browser.runtime.sendMessage({ action: 'SET_TRACKING', enabled: trackToggle.checked } satisfies TrackMessage);
  toast(trackToggle.checked ? 'CVMaker will ask after you send an application' : 'Off: pages are no longer watched', 'info');
  void renderInbox();
});

browser.runtime.onMessage.addListener(((message: unknown) => {
  if ((message as PromptsChangedMessage)?.action === 'PROMPTS_CHANGED') void renderInbox();
  return undefined;
}) as Parameters<typeof browser.runtime.onMessage.addListener>[0]);

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
void renderInbox();
void renderTrackingSetting();
window.setInterval(() => {
  void refreshConnection();
  void renderTrackingSetting();
}, 8000);
window.addEventListener('focus', () => void refreshConnection());
