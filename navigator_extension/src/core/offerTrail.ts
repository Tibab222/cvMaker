/**
 * Which job offer an application form belongs to. Pure logic (no browser API), so it can be tested on its own.
 *
 * The offer (title, company, description, link) is usually read on a page before the form: the posting on LinkedIn,
 * Indeed or the company site, then "Apply" opens the form in the same tab or in a new one. Each tab keeps the trail
 * of the offers seen in it, and a tab opened from another one inherits the offer shown there when it opened.
 * So two offers prepared side by side in two tabs never get mixed up, whatever order the forms are sent in.
 */

export interface OfferSnapshot {
  title: string;
  company: string;
  /** Link of the posting. */
  url: string;
  mandate: string;
  salary: string;
  /** strong: structured data or a site-specific reader; medium: a page that reads like a posting. */
  strength: 'strong' | 'medium';
  /** ms */
  seenAt: number;
  /** Read at the moment the user clicked "Apply" (or a tab opened from it): exactly what was on screen. */
  atApply?: boolean;
}

export interface TabTrail {
  tabId: number;
  openerTabId: number | null;
  /** When the tab was opened, 0 when it already existed before the extension started watching. */
  createdAt: number;
  /** Offers seen in this tab, oldest first. */
  offers: OfferSnapshot[];
  /** Offer shown in the opener tab when this tab opened (read right then). */
  inherited: OfferSnapshot | null;
  /** Top page of the tab, as last reported. */
  pageUrl: string;
  pageTitle: string;
  referrer: string;
  closedAt?: number;
}

export type ResolvedBy = 'this-tab' | 'opener' | 'referrer' | 'company-site' | 'app' | 'guess' | 'none';

export interface Resolution {
  offer: OfferSnapshot | null;
  by: ResolvedBy;
  /** high: no doubt left; medium: likely, worth a look; low: a guess, the user picks. */
  confidence: 'high' | 'medium' | 'low';
  /** Other recent offers, for "wrong job?". The resolved one first when there is one. */
  candidates: OfferSnapshot[];
}

export interface PageContext {
  now: number;
  /** Top page of the tab (the form). */
  pageUrl: string;
  /** Title and headings of the form page: ATS forms often repeat the job title. */
  hints: string[];
}

export const MAX_OFFERS_PER_TAB = 8;
/** An offer older than this is not what the user is applying to now. */
export const OFFER_TTL_MS = 12 * 60 * 60 * 1000;
/** Offers of other tabs are only suggested when this recent. */
const RECENT_MS = 4 * 60 * 60 * 1000;
/** Offers read in the opener up to this long after the tab opened still count (messages race with tab creation). */
const OPENER_GRACE_MS = 1500;
const CLOSED_TRAIL_TTL_MS = 6 * 60 * 60 * 1000;

/* ------------------------------------------------------------------ */
/* Text                                                                 */
/* ------------------------------------------------------------------ */

export function fold(text: string): string {
  return (text ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

const TITLE_NOISE = new Set(['the', 'and', 'for', 'with', 'des', 'les', 'une', 'pour', 'avec', 'job', 'jobs', 'emploi', 'offre', 'poste', 'h/f', 'f/h', 'm/f', 'f/m', 'remote', 'hybrid', 'hybride']);
const COMPANY_NOISE = new Set(['inc', 'ltd', 'llc', 'ltee', 'corp', 'corporation', 'company', 'group', 'groupe', 'the', 'and', 'canada', 'france', 'sas', 'sarl', 'gmbh', 'co', 'cie', 'services', 'solutions', 'technologies', 'international']);

function words(text: string, noise: Set<string>): string[] {
  return fold(text)
    .split(/[^a-z0-9+#]+/)
    .filter((word) => word.length >= 2 && !noise.has(word));
}

/** Share of the shorter title found in the other one: "Senior DevOps Engineer" vs "DevOps Engineer" = 1. */
export function titleOverlap(a: string, b: string): number {
  const left = new Set(words(a, TITLE_NOISE));
  const right = new Set(words(b, TITLE_NOISE));
  if (!left.size || !right.size) return 0;
  let shared = 0;
  for (const word of left) if (right.has(word)) shared++;
  return shared / Math.min(left.size, right.size);
}

/** The company appears in the host ("desjardins.wd3.myworkdayjobs.com") or in the page text. */
export function companyAppears(company: string, host: string, texts: string[]): boolean {
  const names = words(company, COMPANY_NOISE).filter((word) => word.length >= 3);
  if (!names.length) return false;
  const flatHost = fold(host).replace(/[^a-z0-9]/g, '');
  const joined = names.join('');
  if (joined.length >= 4 && flatHost.includes(joined)) return true;
  const haystack = texts.map(fold).join(' \n ');
  // every significant word of the name, as whole words ("National Bank" must not match "national")
  return names.every((name) => new RegExp(`(^|[^a-z0-9])${name.replace(/[+#]/g, '\\$&')}([^a-z0-9]|$)`).test(haystack));
}

/* ------------------------------------------------------------------ */
/* Identity of an offer                                                 */
/* ------------------------------------------------------------------ */

const ID_PARAMS = /^(gh_jid|jobid|job_id|jk|vjk|currentjobid|reqid|requisitionid|postingid|job|id)$/i;

/** Same posting, whatever tracking parameters the link carries. */
export function canonicalUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return '';
  }
  const host = url.hostname.replace(/^www\./, '').toLowerCase();
  if (host.endsWith('linkedin.com')) {
    const id = url.searchParams.get('currentJobId') ?? /\/jobs\/view\/(?:[^/]*?-)?(\d{6,})/.exec(url.pathname)?.[1];
    if (id) return `linkedin:${id}`;
  }
  if (/(^|\.)indeed\./.test(host)) {
    const id = url.searchParams.get('jk') ?? url.searchParams.get('vjk');
    if (id) return `indeed:${id}`;
  }
  const kept = [...url.searchParams.entries()].filter(([name]) => ID_PARAMS.test(name)).sort(([a], [b]) => a.localeCompare(b));
  const query = kept.length ? `?${kept.map(([name, value]) => `${name.toLowerCase()}=${value}`).join('&')}` : '';
  return `${host}${url.pathname.replace(/\/+$/, '').toLowerCase()}${query}`;
}

export function offerKey(offer: Pick<OfferSnapshot, 'url' | 'title' | 'company'>): string {
  return `${fold(offer.company)}|${fold(offer.title)}`;
}

export function sameOffer(a: OfferSnapshot, b: OfferSnapshot): boolean {
  const urlA = canonicalUrl(a.url);
  if (urlA && urlA === canonicalUrl(b.url)) return true;
  if (!a.title || !b.title) return false;
  const companyA = fold(a.company);
  const companyB = fold(b.company);
  return (!companyA || !companyB || companyA === companyB) && fold(a.title) === fold(b.title);
}

/** Two readings of the same offer: keep the best of each (the form page often shows less than the posting). */
export function mergeOffers(primary: OfferSnapshot, other: OfferSnapshot): OfferSnapshot {
  return {
    ...primary,
    title: primary.title || other.title,
    company: primary.company || other.company,
    url: other.strength === 'strong' && primary.strength !== 'strong' ? other.url || primary.url : primary.url || other.url,
    mandate: primary.mandate.length >= other.mandate.length ? primary.mandate : other.mandate,
    salary: primary.salary || other.salary,
    strength: primary.strength === 'strong' || other.strength === 'strong' ? 'strong' : 'medium',
    seenAt: Math.max(primary.seenAt, other.seenAt),
    atApply: primary.atApply || other.atApply,
  };
}

/* ------------------------------------------------------------------ */
/* Trails                                                               */
/* ------------------------------------------------------------------ */

export function newTrail(tabId: number, openerTabId: number | null, createdAt: number): TabTrail {
  return { tabId, openerTabId, createdAt, offers: [], inherited: null, pageUrl: '', pageTitle: '', referrer: '' };
}

/** Records an offer seen in a tab; seeing it again moves it to the end (most recent). */
export function recordOffer(trail: TabTrail, offer: OfferSnapshot): void {
  const previous = trail.offers.find((existing) => sameOffer(existing, offer));
  const merged = previous ? mergeOffers(offer, previous) : offer;
  trail.offers = [...trail.offers.filter((existing) => existing !== previous), merged].slice(-MAX_OFFERS_PER_TAB);
}

function latest(offers: OfferSnapshot[], now: number, before = Infinity): OfferSnapshot | null {
  for (let i = offers.length - 1; i >= 0; i--) {
    const offer = offers[i];
    if (offer.seenAt <= before && now - offer.seenAt <= OFFER_TTL_MS) return offer;
  }
  return null;
}

/** What the opener showed when this tab opened, up the chain (posting -> "apply" page -> form). */
function inheritedOffer(trails: Record<number, TabTrail>, trail: TabTrail, now: number): OfferSnapshot | null {
  if (trail.inherited && now - trail.inherited.seenAt <= OFFER_TTL_MS) return trail.inherited;
  let child = trail;
  for (let depth = 0; depth < 3 && child.openerTabId != null; depth++) {
    const opener = trails[child.openerTabId];
    if (!opener) return null;
    const cutoff = child.createdAt ? child.createdAt + OPENER_GRACE_MS : Infinity;
    const found = latest(opener.offers, now, cutoff) ?? (opener.inherited && opener.inherited.seenAt <= cutoff ? opener.inherited : null);
    if (found) return found;
    child = opener;
  }
  return null;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

/** Recent offers of every tab, one per posting, most recent first. */
function recentOffers(trails: Record<number, TabTrail>, now: number): OfferSnapshot[] {
  const all = Object.values(trails)
    .flatMap((trail) => [...trail.offers, ...(trail.inherited ? [trail.inherited] : [])])
    .filter((offer) => now - offer.seenAt <= RECENT_MS)
    .sort((a, b) => b.seenAt - a.seenAt);
  const distinct: OfferSnapshot[] = [];
  for (const offer of all) if (!distinct.some((kept) => sameOffer(kept, offer))) distinct.push(offer);
  return distinct;
}

/** How well an offer fits the form page: its company in the host or page, its title in the page headings. */
function fitScore(offer: OfferSnapshot, page: PageContext): number {
  const host = hostOf(page.pageUrl);
  const company = offer.company && companyAppears(offer.company, host, page.hints) ? 2 : 0;
  const title = Math.max(0, ...page.hints.map((hint) => titleOverlap(offer.title, hint)));
  return company + (title >= 0.8 ? 2 : title >= 0.5 ? 1 : 0);
}

/** The form page names this offer's company or job title. */
export function offerFitsPage(offer: OfferSnapshot, page: PageContext): boolean {
  return fitScore(offer, page) > 0;
}

function withCandidates(offer: OfferSnapshot | null, recent: OfferSnapshot[]): OfferSnapshot[] {
  const others = recent.filter((candidate) => !offer || !sameOffer(candidate, offer));
  return [...(offer ? [offer] : []), ...others].slice(0, 6);
}

/**
 * The offer a form sent in this tab belongs to.
 * Order of trust: an offer read in this tab, then the one the opener tab showed when this tab opened, then the
 * page that linked here, then the only recent offer whose company runs this site. Otherwise the user picks.
 */
export function resolveOffer(trails: Record<number, TabTrail>, tabId: number, page: PageContext): Resolution {
  const { now } = page;
  const trail = trails[tabId];
  const recent = recentOffers(trails, now);

  const own = trail ? latest(trail.offers, now) : null;
  const inherited = trail ? inheritedOffer(trails, trail, now) : null;

  let lineage: OfferSnapshot | null = null;
  let by: ResolvedBy = 'none';
  let confidence: Resolution['confidence'] = 'low';
  if (own) {
    // the form page itself named the job; the posting read before it adds the description it lacks
    lineage = inherited && sameOffer(own, inherited) ? mergeOffers(own, inherited) : own;
    by = 'this-tab';
    confidence = 'high';
  } else if (inherited) {
    lineage = inherited;
    by = 'opener';
    confidence = inherited.atApply ? 'high' : 'medium';
  } else if (trail?.referrer) {
    const key = canonicalUrl(trail.referrer);
    const fromReferrer = key ? recent.find((offer) => canonicalUrl(offer.url) === key) : undefined;
    if (fromReferrer) {
      lineage = fromReferrer;
      by = 'referrer';
      confidence = 'medium';
    }
  }

  if (lineage) {
    // a form page that clearly names another recent offer (its company runs the site, its title is in the
    // headings) while the lineage one fits nothing: trust the page, but let the user check
    const fit = fitScore(lineage, page);
    if (fit === 0) {
      const better = recent.filter((offer) => !sameOffer(offer, lineage!) && fitScore(offer, page) >= 4);
      if (better.length === 1) return { offer: better[0], by: 'company-site', confidence: 'medium', candidates: withCandidates(better[0], [lineage, ...recent]) };
    }
    return { offer: lineage, by, confidence, candidates: withCandidates(lineage, recent) };
  }

  // no lineage (link copied, tab opened without opener): the site tells which company, maybe which job
  const scored = recent.map((offer) => ({ offer, score: fitScore(offer, page) })).filter((entry) => entry.score >= 2).sort((a, b) => b.score - a.score);
  if (scored.length === 1 || (scored.length > 1 && scored[0].score > scored[1].score)) {
    const offer = scored[0].offer;
    return { offer, by: scored.length === 1 ? 'company-site' : 'guess', confidence: scored.length === 1 ? 'medium' : 'low', candidates: withCandidates(offer, recent) };
  }
  return { offer: null, by: 'none', confidence: 'low', candidates: withCandidates(null, scored.length ? scored.map((entry) => entry.offer) : recent) };
}

/** Drops what is too old to matter: offers past their TTL, trails of tabs closed for a while. */
export function pruneTrails(trails: Record<number, TabTrail>, now: number): void {
  for (const [id, trail] of Object.entries(trails)) {
    if (trail.closedAt && now - trail.closedAt > CLOSED_TRAIL_TTL_MS) {
      delete trails[Number(id)];
      continue;
    }
    trail.offers = trail.offers.filter((offer) => now - offer.seenAt <= OFFER_TTL_MS);
    if (trail.inherited && now - trail.inherited.seenAt > OFFER_TTL_MS) trail.inherited = null;
  }
}

/* ------------------------------------------------------------------ */
/* How the user applied                                                 */
/* ------------------------------------------------------------------ */

/** Values of ApplicationChannel in the desktop app (shared/jobApplications.type.ts). */
export type Channel = 'LINKEDIN' | 'INDEED' | 'JOB_BOARD' | 'COMPANY_SITE';

const JOB_BOARDS = /(glassdoor|jobillico|jobboom|monster|talent\.com|welcometothejungle|wttj|guichetemplois|workopolis|ziprecruiter|adzuna|jobbank|emploiquebec|apec\.fr|hellowork|francetravail|pole-emploi|stepstone|dice\.com|wellfound|otta\.com)/;

/** Where the offer was found tells how the user applied; the form site counts when the offer link says nothing. */
export function channelFor(offerUrl: string, formUrl: string): Channel | null {
  const offerHost = hostOf(offerUrl).toLowerCase();
  const formHost = hostOf(formUrl).toLowerCase();
  for (const host of [offerHost, formHost]) {
    if (!host) continue;
    if (host.endsWith('linkedin.com')) return 'LINKEDIN';
    if (/(^|\.)indeed\./.test(host)) return 'INDEED';
    if (JOB_BOARDS.test(host)) return 'JOB_BOARD';
  }
  return offerHost || formHost ? 'COMPANY_SITE' : null;
}

/* ------------------------------------------------------------------ */
/* Offers opened from the desktop app                                   */
/* ------------------------------------------------------------------ */

/** An opened offer this recent, alone, is taken as the one even when the form page names nothing. */
const OPENED_ALONE_MS = 2 * 60 * 60 * 1000;

/**
 * Adds the offers the user opened from CV Maker (Opportunities): a form reached from there often shows no posting the
 * extension could read (the link goes through a job board, then the company's own site). When nothing was resolved,
 * the opened offer the page fits, or the only one opened in the last two hours, is taken; the others are candidates.
 */
export function withOpenedOffers(resolution: Resolution, opened: OfferSnapshot[], page: PageContext): Resolution {
  if (!opened.length) return resolution;
  const pool = [...resolution.candidates, ...opened.filter((offer) => !resolution.candidates.some((known) => sameOffer(known, offer)))];
  if (resolution.offer) return { ...resolution, candidates: withCandidates(resolution.offer, pool) };

  const scored = opened.map((offer) => ({ offer, score: fitScore(offer, page) })).sort((a, b) => b.score - a.score);
  let chosen: OfferSnapshot | null = null;
  if (scored[0].score >= 2 && (scored.length === 1 || scored[0].score > scored[1].score)) chosen = scored[0].offer;
  else if (opened.length === 1 && page.now - opened[0].seenAt <= OPENED_ALONE_MS) chosen = opened[0];
  if (!chosen) return { ...resolution, candidates: withCandidates(null, pool) };
  return { offer: chosen, by: 'app', confidence: 'medium', candidates: withCandidates(chosen, pool) };
}
