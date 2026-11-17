import { BaseAdapter } from './BaseAdapter';
import { GenericAdapter } from './GenericAdapter';
import { ExtractionResult, ExtractWhenReadyOptions } from './Adapter.types';
// import new adapters here as they are implemented

/**
 * Adapter registry. The order matters: more specific adapters must be declared first.
 */
const DOMAIN_ADAPTER_MAP: Record<string, typeof BaseAdapter> = {
  // 'indeed.com': IndeedAdapter,
};

/**
 * Determines the most appropriate adapter for a given URL. 
 * If no specific adapter matches, falls back to GenericAdapter.
 */
export function getAdapterForUrl(url: string = window.location.href): typeof BaseAdapter {
  try {
    const hostname = new URL(url).hostname.toLowerCase();

    for (const [domain, Adapter] of Object.entries(DOMAIN_ADAPTER_MAP)) {
      if (hostname === domain || hostname.endsWith('.' + domain)) {
        return Adapter;
      }
    }
  } catch (e) {
    console.warn('[Scrapers] invalid URL, falling back to GenericAdapter', e);
  }

  return GenericAdapter;
}

/**
 * Main entry point for synchronous extraction of job posting data from the current page,
 * using the most appropriate adapter based on the URL.
 */
export function extractJobFromCurrentPage(): ExtractionResult {
  const Adapter = getAdapterForUrl();
  return Adapter.extract();
}

/**
 * Main entry point for asynchronous extraction of job posting data from the current page,
 * using the most appropriate adapter based on the URL. Waits until a reasonably-sized
 * mandate has appeared (or a timeout is hit) before returning the extraction result.
 */
export async function extractJobFromCurrentPageWhenReady(
  options?: ExtractWhenReadyOptions
): Promise<ExtractionResult> {
  const Adapter = getAdapterForUrl();
  return Adapter.extractWhenReady(options);
}

export * from './Adapter.types';
export * from './BaseAdapter';
export * from './GenericAdapter';