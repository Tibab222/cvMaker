import browser from 'webextension-polyfill';
import { extractJobFromCurrentPageWhenReady } from '../scrapers';
import { ExtractRequestMessage, ExtractResponseMessage } from '../core/messages';
import './styles.css';

console.log('[CVMaker Extractor] Content script active on page.');

function applyHighlight(element: Element | null | undefined, className: string): void {
  if (!element) return;
  element.classList.add(className);
}

function clearHighlights(): void {
  const classes = ['cvmaker-highlight-title', 'cvmaker-highlight-company', 'cvmaker-highlight-mandate'];
  classes.forEach((cls) => {
    document.querySelectorAll('.' + cls).forEach((el) => el.classList.remove(cls));
  });
}

browser.runtime.onMessage.addListener(
  (request: unknown, _sender, sendResponse: (response: ExtractResponseMessage) => void) => {
    const msg = request as ExtractRequestMessage;

    if (msg.action === 'EXTRACT_AND_HIGHLIGHT') {
      clearHighlights();

      extractJobFromCurrentPageWhenReady({ timeoutMs: 3000, minMandateLength: 100 }).then((extracted) => {
        if (extracted.titleElement) applyHighlight(extracted.titleElement, 'cvmaker-highlight-title');
        if (extracted.companyElement) applyHighlight(extracted.companyElement, 'cvmaker-highlight-company');
        if (extracted.mandateElement) applyHighlight(extracted.mandateElement, 'cvmaker-highlight-mandate');

        if (extracted.titleElement) {
          extracted.titleElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        sendResponse({
          title: extracted.titleText || 'Not found',
          company: extracted.companyText || 'Not found',
          salary: extracted.salary || 'Not found',
          mandate: extracted.mandateText || 'Not found',
          url: extracted.uri,
        });
      });
    }

    return true;
  }
);