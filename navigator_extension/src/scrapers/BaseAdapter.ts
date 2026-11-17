/**
 * Common contract + shared DOM/text utilities for job-posting adapters.
 *
 * Site-specific adapters (LinkedInAdapter, IndeedAdapter, WorkdayAdapter...)
 * should `extend BaseAdapter` and implement `extract()`. They inherit:
 *   - `extractWhenReady()` — polling wrapper, no need to reimplement it
 *   - DOM/text helpers (`textOf`, `cleanText`, `isVisible`, `stripHtml`, ...)
 *   - `extractSalary()` — regex-based salary sniffing
 *   - `safe()` — try/catch wrapper so one failing field never breaks extract()
 *
 * All members are `static` because adapters are used as namespaces/classes
 * rather than instantiated (mirrors the original generic.js design and
 * keeps call sites simple: `LinkedInAdapter.extract()`).
 *
 * USAGE
 *   class LinkedInAdapter extends BaseAdapter {
 *     static extract(): ExtractionResult {
 *       // use this.textOf(), this.safe(), this.extractSalary(document), ...
 *     }
 *   }
 */

import { SALARY_REGEXES } from './Helpers';
import type { ExtractionResult, ExtractWhenReadyOptions } from './Adapter.types';

export abstract class BaseAdapter {
  // ===========================================================================
  // Contract — subclasses must implement this.
  // ===========================================================================

  /**
   * Synchronous extraction. Good for static/SSR pages. For client-rendered
   * pages prefer `extractWhenReady()`.
   */
  static extract(): ExtractionResult {
    throw new Error(`${this.name}.extract() must be implemented by the subclass`);
  }

  /**
   * Polls the page until a reasonably-sized mandate has appeared (or a
   * timeout is hit), then returns the extraction result. Shared by every
   * adapter — subclasses only need to implement `extract()`.
   */
  static extractWhenReady(
    this: typeof BaseAdapter,
    { timeoutMs = 8000, intervalMs = 300, minMandateLength = 200 }: ExtractWhenReadyOptions = {}
  ): Promise<ExtractionResult> {
    return new Promise((resolve) => {
      const start = Date.now();

      const attempt = (): void => {
        const result = this.extract();
        const hasEnoughContent = result.mandateText.length >= minMandateLength;
        const timedOut = Date.now() - start >= timeoutMs;

        if (hasEnoughContent || timedOut) {
          resolve(result);
        } else {
          setTimeout(attempt, intervalMs);
        }
      };

      attempt();
    });
  }

  // ===========================================================================
  // Shared constants
  // ===========================================================================

  /** Tags to always exclude from candidate scans / content scoring. */
  protected static readonly EXCLUDED_TAGS: ReadonlySet<string> = new Set([
    'SCRIPT',
    'STYLE',
    'NOSCRIPT',
    'NAV',
    'HEADER',
    'FOOTER',
    'ASIDE',
    'FORM',
    'IFRAME',
    'SVG',
    'BUTTON'
  ]);

  // ===========================================================================
  // Error handling
  // ===========================================================================

  /** Runs `fn`, returning `fallback` on throw OR on a falsy result. */
  protected static safe<T>(fn: () => T, fallback: T): T {
    try {
      const result = fn();
      return result ? result : fallback;
    } catch (e) {
        console.error(`Error in ${this.name}.safe():`, e);
      return fallback;
    }
  }

  // ===========================================================================
  // Text utilities
  // ===========================================================================

  protected static textOf(el: Element | null | undefined): string {
    if (!el) return '';
    const raw = (el as HTMLElement).innerText !== undefined ? (el as HTMLElement).innerText : el.textContent;
    return this.cleanText(raw);
  }

  protected static cleanText(str: string | null | undefined): string {
    if (!str) return '';
    return str
      .replace(/\u00a0/g, ' ')
      .replace(/[ \t]+/g, ' ')
      .split('\n')
      .map((line) => line.trim())
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /** Strips tags from an HTML string (e.g. a JSON-LD `description` field). */
  protected static stripHtml(html: string | null | undefined): string {
    if (!html) return '';
    const container = document.createElement('div');
    container.innerHTML = html;
    container.querySelectorAll('script, style').forEach((n) => n.remove());
    const raw = container.innerText !== undefined ? container.innerText : container.textContent;
    return this.cleanText(raw);
  }

  // ===========================================================================
  // DOM utilities
  // ===========================================================================

  protected static isVisible(el: Element | null | undefined): boolean {
    if (!el || !(el instanceof Element)) return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0) {
      return false;
    }
    const asHtml = el as HTMLElement;
    return asHtml.offsetWidth > 0 || asHtml.offsetHeight > 0 || el.getClientRects().length > 0;
  }

  /**
   * Finds an element (among `tagNames`) whose text loosely matches `text`
   * (exact match, or one contains the other). Useful for locating a DOM
   * node to highlight after a value was resolved from JSON-LD/meta tags.
   */
  protected static findElementWithText(text: string, tagNames: string[]): Element | null {
    if (!text) return null;
    const normalized = text.trim().toLowerCase();

    for (const tag of tagNames) {
      const els = document.querySelectorAll(tag);
      for (const el of Array.from(els)) {
        const candidate = this.textOf(el).toLowerCase();
        if (candidate && (candidate === normalized || candidate.includes(normalized) || normalized.includes(candidate))) {
          return el;
        }
      }
    }
    return null;
  }

  /** Same idea, but requires an exact (not fuzzy) match on leaf-ish nodes. */
  protected static findElementWithExactText(text: string, maxLen = 100): Element | null {
    if (!text) return null;
    const normalized = text.trim().toLowerCase();

    const candidates = document.querySelectorAll('span, div, a, p, h2, h3, h4');
    for (const el of Array.from(candidates)) {
      if (el.children.length > 2) continue; // prefer leaf-ish nodes over big containers
      const candidateText = this.textOf(el);
      if (candidateText && candidateText.length < maxLen && candidateText.toLowerCase() === normalized) {
        return el;
      }
    }
    return null;
  }

  // ===========================================================================
  // Salary extraction (shared — every adapter can call this on `document`
  // or on a scoped mandate string).
  // ===========================================================================

  static extractSalary(documentOrText: Document | string): string | null {
    const text = typeof documentOrText === 'string' ? documentOrText : documentOrText.body.innerText;

    const keywords = ['salaire', 'salary', 'rémunération', 'compensation', 'pay rate'];
    const lines = text.split('\n');

    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      if (keywords.some((kw) => lowerLine.includes(kw))) {
        for (const regex of SALARY_REGEXES) {
          const match = line.match(regex);
          if (match) return match[0].trim();
        }
      }
    }

    for (const regex of SALARY_REGEXES) {
      const match = text.match(regex);
      if (match) return match[0].trim();
    }

    return null;
  }
}