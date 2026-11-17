/**
 * Best-effort, dependency-free extractor for job postings on arbitrary
 * (unknown) web pages. Meant to be the fallback adapter behind site-specific
 * adapters (LinkedIn, Indeed, etc.) in a browser extension.
 *
 * Strategy, per field, from most to least reliable:
 *   1. JSON-LD structured data (schema.org "JobPosting")
 *   2. Meta tags (OpenGraph / Twitter / itemprop)
 *   3. DOM heuristics (visible <h1>, keyword-matched selectors, content
 *      scoring for the mandate body)
 *   4. Weak fallbacks (document.title parsing, hostname, document.body)
 *
 * USAGE
 * ---------------------------------------------------------------------------
 *   // Synchronous — good for static/SSR pages.
 *   const data = GenericAdapter.extract();
 *
 *   // Async — waits for content to actually render. Recommended default,
 *   // since a lot of ATS pages (Workday, Greenhouse, React apps, etc.) are
 *   // client-rendered and empty at document-idle time.
 *   const data = await GenericAdapter.extractWhenReady();
 *
 * `*Element` fields are provided mainly so the extension UI can
 * highlight/scroll to the source on the page. They can legitimately be
 * `null` (e.g. data came from JSON-LD and no matching DOM node could be
 * located) — always prefer the `*Text` fields for the actual content.
 */

import { BaseAdapter } from './BaseAdapter';
import type { ExtractionResult, FieldResult, JsonLdJobPosting } from './Adapter.types';

export class GenericAdapter extends BaseAdapter {
  // ===========================================================================
  // Public API
  // ===========================================================================

  static extract(): ExtractionResult {
    let jsonLd: JsonLdJobPosting | null = null;
    try {
      jsonLd = this._extractJobPostingJsonLd();
    } catch (e) {
        console.error('Error while extracting JSON-LD JobPosting:', e);
      /* structured data is a bonus, never fatal */
    }

    const title = this.safe<FieldResult>(() => this._resolveTitle(jsonLd), { text: '', element: null, source: 'error' });
    const company = this.safe<FieldResult>(() => this._resolveCompany(jsonLd), { text: '', element: null, source: 'error' });
    const mandate = this.safe<FieldResult>(() => this._resolveMandate(jsonLd), { text: '', element: null, source: 'error' });
    const salary = this.safe<string | null>(() => this.extractSalary(document), null);

    return {
      uri: window.location.href,

      titleElement: title.element,
      titleText: title.text,

      companyElement: company.element,
      companyText: company.text,

      mandateElement: mandate.element,
      mandateText: mandate.text,

      salary,

      _debug: {
        titleSource: title.source,
        companySource: company.source,
        mandateSource: mandate.source,
        hasJsonLd: !!jsonLd
      }
    };
  }

  // ===========================================================================
  // JSON-LD (schema.org JobPosting)
  // ===========================================================================

  private static _extractJobPostingJsonLd(): JsonLdJobPosting | null {
    const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));

    for (const script of scripts) {
      let data: unknown;
      try {
        data = JSON.parse(script.textContent || '');
      } catch (e) {
        console.warn('Malformed JSON-LD in <script type="application/ld+json">, skipping:', e);
        continue; // malformed JSON-LD is common in the wild, just skip it
      }

      const posting = this._findJobPosting(data);
      if (posting) return posting;
    }

    return null;
  }

  private static _findJobPosting(node: unknown): JsonLdJobPosting | null {
    if (!node || typeof node !== 'object') return null;

    if (Array.isArray(node)) {
      for (const item of node) {
        const found = this._findJobPosting(item);
        if (found) return found;
      }
      return null;
    }

    const record = node as JsonLdJobPosting;
    const rawType = record['@type'];
    const types = Array.isArray(rawType) ? rawType : [rawType];
    if (types.some((t) => typeof t === 'string' && t.toLowerCase() === 'jobposting')) {
      return record;
    }

    // Some sites nest the posting inside a @graph array or a mainEntity.
    if (Array.isArray(record['@graph'])) {
      const found = this._findJobPosting(record['@graph']);
      if (found) return found;
    }
    if (record.mainEntity) {
      const found = this._findJobPosting(record.mainEntity);
      if (found) return found;
    }

    return null;
  }

  // ===========================================================================
  // Title
  // ===========================================================================

  private static _resolveTitle(jsonLd: JsonLdJobPosting | null): FieldResult {
    if (jsonLd && jsonLd.title) {
      const text = this.cleanText(jsonLd.title);
      if (text) {
        const element = this.findElementWithText(text, ['h1', 'h2', 'title']);
        return { text, element, source: 'json-ld' };
      }
    }

    const metaSelectors = [
      'meta[property="og:title"]',
      'meta[name="twitter:title"]',
      'meta[itemprop="title"]',
      'meta[name="title"]'
    ];
    for (const sel of metaSelectors) {
      const meta = document.querySelector<HTMLMetaElement>(sel);
      const content = meta && this.cleanText(meta.content);
      if (content) {
        const element = this.findElementWithText(content, ['h1', 'h2']) || meta;
        return { text: content, element, source: `meta:${sel}` };
      }
    }

    const h1Candidates = Array.from(document.querySelectorAll('h1')).filter((el) => {
      const text = this.textOf(el);
      return this.isVisible(el) && text.length > 0 && text.length < 150;
    });
    if (h1Candidates.length) {
      // Prefer the one closest to the top of the viewport/document.
      h1Candidates.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
      const el = h1Candidates[0];
      return { text: this.textOf(el), element: el, source: 'h1' };
    }

    const keywordSelectors = [
      '[class*="job-title" i]',
      '[class*="jobtitle" i]',
      '[class*="position-title" i]',
      '[class*="posting-title" i]',
      '[itemprop="title"]',
      '[data-testid*="job-title" i]',
      '#job-title',
      '.job-title'
    ];
    for (const sel of keywordSelectors) {
      const el = document.querySelector(sel);
      const text = this.textOf(el);
      if (el && text.length > 0 && text.length < 150) {
        return { text, element: el, source: `selector:${sel}` };
      }
    }

    if (document.title) {
      const parts = document.title
        .split(/\s[-|–—:]\s|\s\bat\b\s|\s\bchez\b\s/i)
        .map((p) => p.trim())
        .filter(Boolean);
      if (parts.length) {
        return { text: this.cleanText(parts[0]), element: null, source: 'document.title' };
      }
    }

    return { text: '', element: null, source: 'none' };
  }

  // ===========================================================================
  // Company
  // ===========================================================================

  private static _resolveCompany(jsonLd: JsonLdJobPosting | null): FieldResult {
    if (jsonLd && jsonLd.hiringOrganization) {
      const org = jsonLd.hiringOrganization;
      const name = typeof org === 'string' ? org : org.name;
      const text = this.cleanText(name);
      if (text) {
        const element = this.findElementWithExactText(text);
        return { text, element, source: 'json-ld' };
      }
    }

    const metaSelectors = ['meta[property="og:site_name"]', 'meta[name="author"]'];
    for (const sel of metaSelectors) {
      const meta = document.querySelector<HTMLMetaElement>(sel);
      const content = meta && this.cleanText(meta.content);
      if (content && content.length < 100) {
        return { text: content, element: meta, source: `meta:${sel}` };
      }
    }

    const keywordSelectors = [
      '[itemprop="hiringOrganization"]',
      '[class*="company-name" i]',
      '[class*="companyname" i]',
      '[data-company]',
      '.company-name',
      '[class*="employer" i]',
      '[class*="organization" i]',
      '[class*="company" i]'
    ];
    const genericNoise = new Set(['apply now', 'apply', 'share', 'save job', 'company', 'save']);

    for (const sel of keywordSelectors) {
      const els = document.querySelectorAll(sel);
      for (const el of Array.from(els)) {
        const text = this.textOf(el);
        if (text && text.length > 1 && text.length < 100 && !genericNoise.has(text.toLowerCase())) {
          return { text, element: el, source: `selector:${sel}` };
        }
      }
    }

    // Last resort, low confidence: derive a name from the hostname.
    try {
      const host = window.location.hostname.replace(/^www\./, '').split('.')[0];
      if (host) {
        const text = host.charAt(0).toUpperCase() + host.slice(1);
        return { text, element: null, source: 'hostname-fallback' };
      }
    } catch (e) {
      /* ignore */
      console.error('Error while resolving company from hostname:', e);
    }

    return { text: '', element: null, source: 'none' };
  }

  // ===========================================================================
  // Mandate / description
  // ===========================================================================

  private static _resolveMandate(jsonLd: JsonLdJobPosting | null): FieldResult {
    if (jsonLd && jsonLd.description) {
      const text = this.stripHtml(jsonLd.description);
      if (text && text.length > 50) {
        const element = this._findBestMandateElement(); // for highlighting, may be null
        return { text, element, source: 'json-ld' };
      }
    }

    const best = this._findBestMandateElement();
    if (best) {
      return { text: this.textOf(best), element: best, source: 'heuristic-scoring' };
    }

    const fallbackSelectors = ['[class*="description" i]', '[id*="description" i]', 'article', 'main', '[role="main"]'];
    for (const sel of fallbackSelectors) {
      const el = document.querySelector(sel);
      const text = this.textOf(el);
      if (el && text.length > 100) {
        return { text, element: el, source: `selector:${sel}` };
      }
    }

    return { text: this.textOf(document.body), element: document.body, source: 'body-fallback' };
  }

  /**
   * Readability-lite: scores block-level elements by text density, list/
   * paragraph structure, link density, and keyword hints, then narrows the
   * winner down to the most specific wrapper that still holds the content
   * (so we don't return a giant outer <div> that also contains the header).
   */
  private static _findBestMandateElement(): Element | null {
    const candidates = Array.from(document.querySelectorAll('div, section, article, main, td')).filter((el) =>
      this._isEligibleMandateCandidate(el)
    );
    if (!candidates.length) return null;

    let best: Element | null = null;
    let bestScore = -Infinity;
    for (const el of candidates) {
      const score = this._scoreMandateCandidate(el);
      if (score > bestScore) {
        bestScore = score;
        best = el;
      }
    }

    return best ? this._narrowToSpecificContainer(best) : null;
  }

  private static _isEligibleMandateCandidate(el: Element): boolean {
    if (this.EXCLUDED_TAGS.has(el.tagName)) return false;
    if (el.closest('nav, header, footer, aside, form')) return false;
    if (!this.isVisible(el)) return false;
    return this.textOf(el).length >= 150;
  }

  private static _scoreMandateCandidate(el: Element): number {
    const text = this.textOf(el);
    const textLength = text.length;

    const linkTextLength = Array.from(el.querySelectorAll('a')).reduce((sum, a) => sum + this.textOf(a).length, 0);
    const linkDensity = textLength > 0 ? linkTextLength / textLength : 1;

    let score = Math.log(textLength + 1) * 5;
    score -= linkDensity * 40;

    const paragraphCount = el.querySelectorAll('p').length;
    const listItemCount = el.querySelectorAll('li').length;
    score += Math.min(paragraphCount, 20) * 2;
    score += Math.min(listItemCount, 30) * 1.5;

    const idAndClass = `${el.id} ${el.className}`.toLowerCase();
    if (this._POSITIVE_PATTERN.test(idAndClass)) score += 25;
    if (this._NEGATIVE_PATTERN.test(idAndClass)) score -= 40;

    // Lots of interactive controls usually means UI chrome, not prose.
    const interactiveCount = el.querySelectorAll('button, input, select').length;
    score -= interactiveCount * 3;

    // Mild penalty for huge containers likely to be page-level wrappers.
    if (textLength > 20000) score -= 10;

    return score;
  }

  /**
   * Walks down into single dominant children as long as they still hold
   * (almost) all of the parent's text, to avoid returning an overly broad
   * wrapper element.
   */
  private static _narrowToSpecificContainer(el: Element): Element {
    let current = el;
    const referenceLength = this.textOf(current).length;

    // Bounded loop as a safety net against pathological DOM structures.
    for (let i = 0; i < 25; i++) {
      const dominantChildren = Array.from(current.children).filter((child) => {
        if (this.EXCLUDED_TAGS.has(child.tagName)) return false;
        return this.textOf(child).length > referenceLength * 0.85;
      });

      if (dominantChildren.length === 1) {
        current = dominantChildren[0];
      } else {
        break;
      }
    }

    return current;
  }

  // Keyword patterns used by the mandate-scoring algorithm.
  private static readonly _NEGATIVE_PATTERN =
    /nav|footer|header|sidebar|menu|comment|related|share|social|cookie|banner|advert|breadcrumb|widget|promo|subscribe|newsletter/i;
  private static readonly _POSITIVE_PATTERN =
    /description|job-details|jobdetail|job-body|posting|content|details|responsibilit|requirement|qualification|about-the-role|about-the-job|vacancy/i;
}

// Expose for browser extension content scripts alongside module-based usage.
declare global {
  interface Window {
    GenericAdapter?: typeof GenericAdapter;
  }
}
if (typeof window !== 'undefined') {
  window.GenericAdapter = GenericAdapter;
}

export default GenericAdapter;