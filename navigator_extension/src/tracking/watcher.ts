/**
 * Content-script side of application tracking. In every frame: notices a sent application form and the
 * thank-you message after it. In the top frame: reads the posting when the page is one, and shows the
 * "did you just apply?" card. The background decides which offer it was and whether to ask.
 */
import browser from 'webextension-polyfill';
import type { ApplyAnswerResponse, SeenOffer, TabTrackMessage, TrackHelloResponse, TrackMessage } from '../core/messages';
import { clickMeaning, confirmationText, controlOf, hasVisibleErrors, looksLikeApplicationForm, pageHints, scopeOf, submitsSomethingElse } from './applyDetect';
import { readOffer } from './offerPage';
import { hidePrompt, showPrompt } from './prompt';

const isTop = window === window.top;
/** Errors show up right after a refused send; checked before the background asks (it waits 2.5 s). */
const ERROR_CHECK_MS = 1500;
/** After a send, how long the page is watched for its "thank you". */
const CONFIRMATION_WATCH_MS = 12_000;

const send = <T = unknown>(message: TrackMessage) => browser.runtime.sendMessage(message) as Promise<T>;

let enabled = false;
let lastSentOffer = '';
let lastSignal = 0;
let watchingConfirmation = false;
let confirmedOnce = false;

/* ------------------------------------------------------------------ */
/* Postings                                                             */
/* ------------------------------------------------------------------ */

const offerId = (offer: SeenOffer) => `${offer.url}|${offer.title}|${offer.company}|${offer.mandate.length > 150}`;

function reportOffer(atApply: boolean): SeenOffer | null {
  let offer: SeenOffer | null = null;
  try {
    offer = readOffer();
  } catch (error) {
    console.debug('[CVMaker] Could not read the posting', error);
  }
  if (!offer) return null;
  const id = offerId(offer);
  if (atApply || id !== lastSentOffer) {
    lastSentOffer = id;
    send({ action: 'OFFER_SEEN', offer, atApply }).catch(() => undefined);
  }
  return offer;
}

let scanTimers: number[] = [];
/** Postings are often rendered late (single-page sites): read a few times, then stop. */
function scanForOffer(): void {
  scanTimers.forEach((timer) => clearTimeout(timer));
  scanTimers = [700, 2200, 5000].map((delay) => window.setTimeout(() => reportOffer(false), delay));
}

/* ------------------------------------------------------------------ */
/* Sent forms                                                           */
/* ------------------------------------------------------------------ */

function watchForConfirmation(): void {
  if (watchingConfirmation) return;
  watchingConfirmation = true;
  const started = Date.now();
  const timer = window.setInterval(() => {
    if (checkConfirmation() || Date.now() - started > CONFIRMATION_WATCH_MS) {
      clearInterval(timer);
      watchingConfirmation = false;
    }
  }, 1000);
}

function checkConfirmation(): boolean {
  if (confirmedOnce) return true;
  const found = confirmationText(document);
  if (!found) return false;
  confirmedOnce = true;
  send({ action: 'APPLY_SIGNAL', kind: 'confirmation', hints: pageHints(document) }).catch(() => undefined);
  return true;
}

function signalSent(scope: Element): void {
  const now = Date.now();
  // the click on "Submit" and the form's submit event are the same send
  if (now - lastSignal < 4000) return;
  lastSignal = now;
  send({ action: 'APPLY_SIGNAL', kind: 'submit', hints: pageHints(document) }).catch(() => undefined);
  window.setTimeout(() => {
    if (!hasVisibleErrors(scope)) return;
    send({ action: 'APPLY_CANCEL' }).catch(() => undefined);
    lastSignal = 0; // refused: the next send, once the fields are fixed, counts
  }, ERROR_CHECK_MS);
  watchForConfirmation();
}

function onClick(event: MouseEvent): void {
  if (!enabled || !event.isTrusted) return;
  const control = controlOf(event.target);
  if (!control) return;
  const meaning = clickMeaning(control);
  if (meaning === 'send') signalSent(scopeOf(control));
  // "Apply" on a posting: what is on screen right now is the offer about to be applied to
  else if (meaning === 'start' && isTop) reportOffer(true);
}

function onSubmit(event: SubmitEvent): void {
  if (!enabled || !(event.target instanceof HTMLFormElement)) return;
  if (submitsSomethingElse(event.target, event.submitter)) return;
  if (looksLikeApplicationForm(event.target)) signalSent(event.target);
}

/* ------------------------------------------------------------------ */
/* Top frame: page changes, the card                                    */
/* ------------------------------------------------------------------ */

const answer = (promptId: string) => (kind: 'yes' | 'no' | 'later', edits: { title?: string; company?: string; candidate?: number }) =>
  send<ApplyAnswerResponse>({ action: 'APPLY_ANSWER', promptId, answer: kind, ...edits });

async function hello(): Promise<void> {
  let response: TrackHelloResponse | undefined;
  try {
    response = await send<TrackHelloResponse>({ action: 'TRACK_HELLO', url: location.href, title: document.title, referrer: document.referrer });
  } catch {
    return; // extension reloaded or updated: this page keeps the old script until reloaded
  }
  enabled = !!response?.enabled;
  if (!enabled) return;
  if (response?.prompt) showPrompt(response.prompt, answer(response.prompt.id));
  scanForOffer();
}

let lastHref = location.href;
function watchNavigation(): void {
  // single-page sites (LinkedIn) change the job without loading a page
  window.setInterval(() => {
    if (location.href === lastHref) return;
    lastHref = location.href;
    confirmedOnce = false;
    void hello();
  }, 1000);
}

type Listener = Parameters<typeof browser.runtime.onMessage.addListener>[0];
const onMessage = ((request: unknown): Promise<unknown> | undefined => {
  const message = request as TabTrackMessage;
  if (!isTop) return undefined;
  switch (message.action) {
    case 'SHOW_APPLY_PROMPT':
      if (enabled) showPrompt(message.prompt, answer(message.prompt.id));
      return undefined;
    case 'HIDE_APPLY_PROMPT':
      hidePrompt(message.promptId);
      return undefined;
    case 'SNAPSHOT_OFFER': {
      // read only: whether the user clicked "Apply" is told by the click itself
      let offer: SeenOffer | null = null;
      try {
        offer = enabled ? readOffer() : null;
      } catch {
        offer = null;
      }
      return Promise.resolve(offer);
    }
  }
  return undefined;
}) as Listener;

export async function startTracking(): Promise<void> {
  if (isTop) {
    browser.runtime.onMessage.addListener(onMessage);
    await hello();
    watchNavigation();
  } else {
    try {
      enabled = !!(await send<{ enabled: boolean }>({ action: 'GET_TRACKING' }))?.enabled;
    } catch {
      enabled = false;
    }
  }
  // capture phase: sites often stop the click from bubbling up
  document.addEventListener('click', onClick, true);
  document.addEventListener('submit', onSubmit, true);
  if (enabled) window.setTimeout(checkConfirmation, 1500);
}
