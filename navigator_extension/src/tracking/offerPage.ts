/**
 * Is this page a job posting, and which one? Read quietly in the background (no highlight, no scroll), only on
 * pages that look like postings: a regular page never gets its text read.
 */
import { GenericAdapter } from '../scrapers';
import type { SeenOffer } from '../core/messages';

/** Sites where a posting is read, and what their URL of a posting looks like. */
const JOB_SITES: [RegExp, RegExp][] = [
  [/(^|\.)linkedin\.com$/, /^\/jobs\//],
  [/(^|\.)indeed\.[a-z.]+$/, /^\/(viewjob|jobs|q-|m\/viewjob|cmp\/[^/]+\/jobs)/],
  [/(^|\.)glassdoor\.[a-z.]+$/, /job-listing|\/job\//i],
  [/(^|\.)(greenhouse\.io|lever\.co|ashbyhq\.com|myworkdayjobs\.com|smartrecruiters\.com|workable\.com|recruitee\.com|teamtailor\.com|bamboohr\.com|breezy\.hr|jobvite\.com|icims\.com|taleo\.net|successfactors\.(com|eu)|personio\.(de|com)|welcomekit\.co|jazzhr\.com|applytojob\.com)$/, /./],
  [/(^|\.)(jobillico\.com|jobboom\.com|welcometothejungle\.com|guichetemplois\.gc\.ca|jobbank\.gc\.ca|monster\.[a-z.]+|talent\.com|ziprecruiter\.com|workopolis\.com|hellowork\.com|apec\.fr|francetravail\.fr|stepstone\.[a-z.]+|wellfound\.com)$/, /./],
];
const JOB_PATH = /\/(jobs?|careers?|carrieres?|carrière|emplois?|offres?(-d-emploi)?|postings?|positions?|vacanc(y|ies)|opportunit(y|ies|es)|stellen|requisitions?|job-?details?|apply)(\/|-|$|\?)/i;
/** Brands of job boards: as a "company" they mean the company was not found. */
const BOARD_BRANDS = /^(linkedin|indeed|glassdoor|jobillico|jobboom|monster|talent(\.com)?|ziprecruiter|workopolis|welcome to the jungle|hellowork|apec|wellfound|stepstone|careers?|jobs?)$/i;
const HOST_NOISE = new Set(['www', 'careers', 'career', 'jobs', 'job', 'emplois', 'emploi', 'carrieres', 'apply', 'boards', 'job-boards', 'recruiting', 'talent', 'en', 'fr', 'ca', 'us', 'app', 'hire']);

function hasJobPostingData(doc: Document): boolean {
  return Array.from(doc.querySelectorAll('script[type="application/ld+json"]')).some((script) => /"JobPosting"/.test(script.textContent ?? ''));
}

export function pageMayBeOffer(doc: Document = document, loc: Location | URL = location): boolean {
  const host = loc.hostname.toLowerCase();
  for (const [site, path] of JOB_SITES) if (site.test(host)) return path.test(loc.pathname + loc.search);
  return JOB_PATH.test(loc.pathname) || hasJobPostingData(doc);
}

const text = (element: Element | null | undefined) =>
  ((element as HTMLElement | null)?.innerText ?? element?.textContent ?? '').replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();

function first(doc: Document, selectors: string[], max = 300): string {
  for (const selector of selectors) {
    const value = text(doc.querySelector(selector));
    if (value && value.length <= max) return value;
  }
  return '';
}

function longest(doc: Document, selectors: string[]): string {
  return selectors.map((selector) => text(doc.querySelector(selector))).sort((a, b) => b.length - a.length)[0] ?? '';
}

/** "Cloud Engineer - RBC | Indeed" -> "Cloud Engineer" */
export function cleanTitle(raw: string, company: string): string {
  let title = raw.split('\n')[0].split(/\s[|·]\s/)[0].replace(/\s*-\s*job post$/i, '').trim();
  if (company) {
    const escaped = company.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    title = title.replace(new RegExp(`\\s+(-|–|—|at|chez|@)\\s+${escaped}.*$`, 'i'), '').replace(new RegExp(`^${escaped}\\s+(is )?hiring\\s+(an? )?`, 'i'), '');
  }
  return title.replace(/\s+/g, ' ').slice(0, 200).trim();
}

/** A company name from the host: "careers.acme.com" -> "Acme", "desjardins.wd3.myworkdayjobs.com" -> "Desjardins". */
export function companyFromHost(host: string): string {
  const labels = host.toLowerCase().split('.');
  const atsIndex = labels.findIndex((label) => /^(myworkdayjobs|greenhouse|lever|ashbyhq|smartrecruiters|workable|recruitee|teamtailor|bamboohr|breezy|jobvite|icims|taleo)$/.test(label));
  const name = atsIndex > 0 ? labels[0] : labels.slice(0, -1).find((label) => !HOST_NOISE.has(label) && !/^wd\d+$/.test(label));
  return name ? name.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '';
}

function linkedIn(doc: Document, loc: Location | URL): SeenOffer | null {
  const id = new URL(loc.href).searchParams.get('currentJobId') ?? /\/jobs\/view\/(?:[^/]*?-)?(\d{6,})/.exec(loc.pathname)?.[1];
  const title = first(doc, ['.job-details-jobs-unified-top-card__job-title h1', '.job-details-jobs-unified-top-card__job-title', '.jobs-unified-top-card__job-title', 'h1.top-card-layout__title', '.top-card-layout__title']);
  const company = first(doc, ['.job-details-jobs-unified-top-card__company-name a', '.job-details-jobs-unified-top-card__company-name', '.jobs-unified-top-card__company-name a', '.jobs-unified-top-card__company-name', '.topcard__org-name-link', '.top-card-layout__second-subline a'], 120);
  const mandate = longest(doc, ['#job-details', '.jobs-description__content', '.jobs-box__html-content', '.show-more-less-html__markup', '.description__text']);
  if (!title) return null;
  return {
    title: cleanTitle(title, company),
    company,
    url: id ? `https://www.linkedin.com/jobs/view/${id}/` : `${loc.origin}${loc.pathname}`,
    mandate,
    salary: '',
    strength: mandate.length >= 150 ? 'strong' : 'medium',
  };
}

function indeed(doc: Document, loc: Location | URL): SeenOffer | null {
  const params = new URL(loc.href).searchParams;
  const id = params.get('jk') ?? params.get('vjk');
  const title = first(doc, ['[data-testid="jobsearch-JobInfoHeader-title"]', 'h1.jobsearch-JobInfoHeader-title', '.jobsearch-JobInfoHeader-title', '[data-testid="simpler-jobTitle"]']);
  const company = first(doc, ['[data-testid="inlineHeader-companyName"]', '[data-company-name="true"]', '[data-testid="jobsearch-CompanyInfoContainer"] a', '.jobsearch-CompanyInfoContainer a'], 120);
  const mandate = longest(doc, ['#jobDescriptionText', '[data-testid="jobsearch-JobComponent-description"]']);
  if (!title) return null;
  return {
    title: cleanTitle(title, company),
    company: company.split('\n')[0].trim(),
    url: id ? `${loc.origin}/viewjob?jk=${encodeURIComponent(id)}` : `${loc.origin}${loc.pathname}`,
    mandate,
    salary: '',
    strength: mandate.length >= 150 ? 'strong' : 'medium',
  };
}

/** The posting shown on this page, or null when the page is not one (or not readable enough to trust). */
export function readOffer(doc: Document = document, loc: Location | URL = location): SeenOffer | null {
  if (!pageMayBeOffer(doc, loc)) return null;
  const host = loc.hostname.toLowerCase();
  try {
    const special = /(^|\.)linkedin\.com$/.test(host) ? linkedIn(doc, loc) : /(^|\.)indeed\./.test(host) ? indeed(doc, loc) : null;
    if (special) return special;
  } catch (error) {
    console.debug('[CVMaker] Site reader failed, trying the generic one', error);
  }

  const read = GenericAdapter.extract();
  const debug = read._debug;
  const structured = debug.hasJsonLd && debug.titleSource === 'json-ld';
  const readable = read.mandateText.length >= 300 && debug.mandateSource !== 'body-fallback' && !['document.title', 'none', 'error'].includes(debug.titleSource);
  if (!read.titleText || (!structured && !readable)) return null;

  let company = read.companyText;
  if (debug.companySource === 'hostname-fallback' || BOARD_BRANDS.test(company.trim())) company = /myworkdayjobs|greenhouse|lever|ashbyhq|smartrecruiters|workable/.test(host) || debug.companySource === 'hostname-fallback' ? companyFromHost(host) : '';
  if (BOARD_BRANDS.test(company.trim())) company = '';

  return {
    title: cleanTitle(read.titleText, company),
    company: company.slice(0, 120),
    url: loc.href.split('#')[0],
    mandate: read.mandateText.slice(0, 30_000),
    salary: read.salary ?? '',
    strength: structured ? 'strong' : 'medium',
  };
}
