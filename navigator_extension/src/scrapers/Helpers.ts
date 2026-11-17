/**
 * Standalone regex helpers shared by adapters (If needed)
 */

/**
 * Matches common salary formats across FR/EN postings:
 *   - "80k$ - 100k$", "$80k-$100k"
 *   - "80 000$ - 100 000$", "$80,000 to $100,000 / year"
 *   - "25$/h", "25.50 $/heure"
 */
export const SALARY_REGEXES: RegExp[] = [
  /(\d{2,3}\s?k\s?[$€£]|[$€£]\s?\d{2,3}\s?k)(\s?[-–—à]\s?(\d{2,3}\s?k\s?[$€£]|[$€£]\s?\d{2,3}\s?k))?/gi,
  /(\d{1,3}(?:[\s,.]\d{3})*\s?[$€£]|[$€£]\s?\d{1,3}(?:[\s,.]\d{3})*)(\s?(?:[-–—]|à|to)\s?(\d{1,3}(?:[\s,.]\d{3})*\s?[$€£]|[$€£]\s?\d{1,3}(?:[\s,.]\d{3})*))?(\s?\/\s?(?:an|année|mois|year|month))?/gi,
  /(\d{2,3}(?:[.,]\d{1,2})?\s?[$€£]|[$€£]\s?\d{2,3}(?:[.,]\d{1,2})?)\s?\/\s?(?:h|hr|heure|hour)/gi
];