/**
 * Shared types for job-posting extraction adapters (GenericAdapter,
 * LinkedInAdapter, IndeedAdapter, ...). 
 * Keep this file free of DOM logic, it should only describe the data shapes adapters produce/consume.
 */

/** Loose shape of a schema.org "JobPosting" node found in JSON-LD. */
export interface JsonLdOrganization {
  name?: string;
  [key: string]: unknown;
}

export interface JsonLdJobPosting {
  '@type'?: string | string[];
  '@graph'?: unknown[];
  mainEntity?: unknown;
  title?: string;
  description?: string;
  hiringOrganization?: string | JsonLdOrganization;
  [key: string]: unknown;
}

/**
 * Where a resolved field's value came from. Adapters are free to add their
 * own `meta:*` / `selector:*` variants (built at runtime), which is why this
 * is a union of literals plus two open-ended template-literal patterns.
 */
export type FieldSource =
  | 'json-ld'
  | 'h1'
  | 'document.title'
  | 'heuristic-scoring'
  | 'hostname-fallback'
  | 'body-fallback'
  | 'none'
  | 'error'
  | `meta:${string}`
  | `selector:${string}`;

/** Result of resolving a single field (title, company, mandate, ...). */
export interface FieldResult {
  text: string;
  element: Element | null;
  source: FieldSource;
}

export interface DebugInfo {
  titleSource: FieldSource;
  companySource: FieldSource;
  mandateSource: FieldSource;
  hasJsonLd: boolean;
}

/** Final shape returned by every adapter's `extract()` / `extractWhenReady()`. */
export interface ExtractionResult {
  uri: string;

  titleElement: Element | null;
  companyElement: Element | null;
  mandateElement: Element | null;

  titleText: string;
  companyText: string;
  mandateText: string;

  /** Best-effort salary string, e.g. "80k$ - 100k$" or "25$/h". Null if not found. */
  salary: string | null;

  _debug: DebugInfo;
}

export interface ExtractWhenReadyOptions {
  /** Give up and return whatever we have after this many ms. Default 8000. */
  timeoutMs?: number;
  /** Polling interval in ms. Default 300. */
  intervalMs?: number;
  /** Minimum mandate length (chars) considered "ready". Default 200. */
  minMandateLength?: number;
}