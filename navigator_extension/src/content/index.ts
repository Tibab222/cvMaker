import browser from 'webextension-polyfill';
import { extractJobFromCurrentPageWhenReady } from '../scrapers';
import type { AttachReportMessage, AutofillReportMessage, ContentMessage, ExtractOfferResponse, ExtractResponseMessage } from '../core/messages';
import { autofillDocument, clearAutofillHighlights } from '../autofill/fill';
import { attachResume } from '../autofill/attach';
import { startTracking } from '../tracking/watcher';
import './styles.css';

/**
 * Runs in every frame: application forms are often embedded in an iframe (Greenhouse, Workday...).
 * Offer extraction only answers from the top frame; autofill runs in each frame and reports back to the panel.
 */
const isTopFrame = window === window.top;

const HIGHLIGHT_CLASSES = ['cvmaker-highlight-title', 'cvmaker-highlight-company', 'cvmaker-highlight-mandate'];

function applyHighlight(element: Element | null | undefined, className: string): void {
  element?.classList.add(className);
}

function clearHighlights(): void {
  HIGHLIGHT_CLASSES.forEach((cls) => {
    document.querySelectorAll('.' + cls).forEach((el) => el.classList.remove(cls));
  });
}

type MessageListener = Parameters<typeof browser.runtime.onMessage.addListener>[0];

// Answers only some messages (and only from the top frame): returning undefined lets other frames stay silent,
// which the polyfill typings do not model, hence the cast.
const onMessage = (request: unknown, _sender: unknown, sendResponse: (response: unknown) => void): true | undefined => {
  const message = request as ContentMessage;

  switch (message.action) {
    case 'EXTRACT_AND_HIGHLIGHT': {
      if (!isTopFrame) return undefined;
      clearHighlights();
      extractJobFromCurrentPageWhenReady({ timeoutMs: 3000, minMandateLength: 100 }).then((extracted) => {
        applyHighlight(extracted.titleElement, 'cvmaker-highlight-title');
        applyHighlight(extracted.companyElement, 'cvmaker-highlight-company');
        applyHighlight(extracted.mandateElement, 'cvmaker-highlight-mandate');
        extracted.titleElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });

        const response: ExtractResponseMessage = {
          title: extracted.titleText || '',
          company: extracted.companyText || '',
          salary: extracted.salary || '',
          mandate: extracted.mandateText || '',
          url: extracted.uri,
        };
        sendResponse(response);
      });
      return true; // async response
    }

    case 'EXTRACT_OFFER': {
      if (!isTopFrame) return undefined;
      extractJobFromCurrentPageWhenReady({ timeoutMs: 1500, minMandateLength: 100 })
        .then((extracted) => sendResponse({ title: extracted.titleText || '', mandate: extracted.mandateText || '' } satisfies ExtractOfferResponse))
        .catch(() => sendResponse({ title: '', mandate: '' } satisfies ExtractOfferResponse));
      return true; // async response
    }

    case 'ATTACH_RESUME': {
      let result: { attached: string | null; fileFields: number };
      try {
        result = attachResume(document, message);
      } catch (error) {
        console.warn('[CVMaker] Could not attach the resume', error);
        result = { attached: null, fileFields: 0 };
      }
      if (result.fileFields > 0 || isTopFrame) {
        const report: AttachReportMessage = { action: 'ATTACH_REPORT', runId: message.runId, ...result };
        browser.runtime.sendMessage(report).catch(() => undefined);
      }
      if (isTopFrame) sendResponse({ ok: true });
      return undefined;
    }

    case 'AUTOFILL': {
      clearAutofillHighlights(document);
      const report = autofillDocument(document, message.profile);
      const hasFields = report.filled.length > 0 || report.attention.length > 0 || report.alreadyFilled > 0;
      if (hasFields || isTopFrame) {
        const reportMessage: AutofillReportMessage = {
          action: 'AUTOFILL_REPORT',
          runId: message.runId,
          frame: isTopFrame ? 'page' : location.hostname,
          report,
        };
        // the panel may already be closed: nothing to do then
        browser.runtime.sendMessage(reportMessage).catch(() => undefined);
      }
      // the top frame acknowledges, so the panel knows the page can be filled at all
      if (isTopFrame) sendResponse({ ok: true });
      return undefined;
    }

    case 'CLEAR_AUTOFILL':
      clearAutofillHighlights(document);
      if (isTopFrame) clearHighlights();
      return undefined;
  }
  return undefined;
};

browser.runtime.onMessage.addListener(onMessage as MessageListener);

// notices applications sent from this page, and asks before saving them (see tracking/watcher.ts)
void startTracking();
