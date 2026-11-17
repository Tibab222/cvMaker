/**
 * Job discovery: public job boards the user follows, offers found on them (or sent from the browser extension),
 * and the morning queue built from those offers.
 */

/** Applicant tracking systems whose public job-board APIs are read. They are meant for this: no scraping involved. */
export enum JobSourceKind {
  GREENHOUSE = "greenhouse",
  LEVER = "lever",
  ASHBY = "ashby",
  /** Keyword search on the Adzuna job aggregator (official API, the user's own free key). */
  ADZUNA = "adzuna",
}

/** A keyword search on Adzuna, stored as the token of an ADZUNA source. */
export interface AdzunaQuery {
  /** Adzuna country code ("ca", "fr"...). */
  country: string;
  /** Keywords, as typed on a job site ("devops", "développeur full stack"). */
  what: string;
  /** City or region, empty for the whole country. */
  where: string;
}

/** Countries Adzuna covers, with the local site that its listings must link back to. */
export const ADZUNA_COUNTRIES: { code: string; label: string; site: string }[] = [
  { code: "ca", label: "Canada", site: "https://www.adzuna.ca" },
  { code: "us", label: "United States", site: "https://www.adzuna.com" },
  { code: "fr", label: "France", site: "https://www.adzuna.fr" },
  { code: "gb", label: "United Kingdom", site: "https://www.adzuna.co.uk" },
  { code: "be", label: "Belgium", site: "https://www.adzuna.be" },
  { code: "ch", label: "Switzerland", site: "https://www.adzuna.ch" },
  { code: "de", label: "Germany", site: "https://www.adzuna.de" },
  { code: "nl", label: "Netherlands", site: "https://www.adzuna.nl" },
  { code: "es", label: "Spain", site: "https://www.adzuna.es" },
  { code: "it", label: "Italy", site: "https://www.adzuna.it" },
  { code: "at", label: "Austria", site: "https://www.adzuna.at" },
  { code: "pl", label: "Poland", site: "https://www.adzuna.pl" },
  { code: "au", label: "Australia", site: "https://www.adzuna.com.au" },
  { code: "nz", label: "New Zealand", site: "https://www.adzuna.co.nz" },
  { code: "sg", label: "Singapore", site: "https://www.adzuna.sg" },
  { code: "in", label: "India", site: "https://www.adzuna.in" },
  { code: "za", label: "South Africa", site: "https://www.adzuna.co.za" },
  { code: "br", label: "Brazil", site: "https://www.adzuna.com.br" },
  { code: "mx", label: "Mexico", site: "https://www.adzuna.com.mx" },
];

/** Whether the app can search Adzuna. The key itself never leaves the main process. */
export interface AdzunaStatus {
  connected: boolean;
  appId: string | null;
}

export type AdzunaConnectResult = { ok: true; status: AdzunaStatus } | { ok: false; error: string };

export interface JobSource {
  id: number;
  kind: JobSourceKind;
  /** Board identifier on the ATS (company slug). Lever EU boards are stored as "eu:<slug>". */
  token: string;
  label: string;
  enabled: boolean;
  last_run_at: string | null;
  last_error: string | null;
  /** Offers returned by the last run, before filtering. */
  last_found: number;
  created_at: string;
}

export enum DiscoveredJobStatus {
  NEW = "NEW",
  SHORTLISTED = "SHORTLISTED",
  DISMISSED = "DISMISSED",
  /** Sent to the resume editor. */
  PREPARED = "PREPARED",
}

export type DiscoveredJobOrigin = "board" | "extension";

export interface DiscoveredJob {
  id: number;
  source_id: number | null;
  origin: DiscoveredJobOrigin;
  company: string;
  title: string;
  location: string | null;
  remote: boolean;
  url: string | null;
  description: string;
  salary: string | null;
  posted_at: string | null;
  discovered_at: string;
  /** 0-100 match with the profile, null until scored. */
  score: number | null;
  matched_keywords: string[];
  missing_keywords: string[];
  status: DiscoveredJobStatus;
  /** Status of the application created from this offer, when one exists (matched on the offer URL). */
  application_status: string | null;
  /** Where the offer was found, when it came from a source that still exists. */
  source_kind: JobSourceKind | null;
  /** Adzuna country of the search that found it, for the attribution link. */
  source_country: string | null;
}

export interface DiscoveryFilters {
  /** The title must contain one of these (empty = everything). */
  titleIncludes: string[];
  /** The title must contain none of these. */
  titleExcludes: string[];
  /** The location must contain one of these, unless the offer is remote and remote is accepted (empty = anywhere). */
  locations: string[];
  remoteOnly: boolean;
  /** Offers published longer ago are skipped (0 = no limit). */
  maxAgeDays: number;
}

export interface DiscoverySchedule {
  enabled: boolean;
  /** Local hour (0-23) of the daily run. A run missed because the app was closed happens at the next launch. */
  hour: number;
}

/**
 * "profile": titles, excluded titles and locations are worked out from the profile at each search, so they follow it
 * as it changes. "custom": the filters typed by the user. Remote only and publication age apply in both modes.
 */
export type DiscoveryFiltersMode = "profile" | "custom";

export interface DiscoverySettings {
  filtersMode: DiscoveryFiltersMode;
  filters: DiscoveryFilters;
  schedule: DiscoverySchedule;
}

export const DEFAULT_DISCOVERY_SETTINGS: DiscoverySettings = {
  filtersMode: "profile",
  filters: { titleIncludes: [], titleExcludes: [], locations: [], remoteOnly: false, maxAgeDays: 30 },
  schedule: { enabled: false, hour: 3 },
};

/** Filters read from the profile, with what they come from (shown to the user, so the search is never a black box). */
export interface ProfileFilterSuggestion {
  filters: Pick<DiscoveryFilters, "titleIncludes" | "titleExcludes" | "locations">;
  /** Recent job titles the title filter comes from. */
  fromTitles: string[];
  /** Places of recent experiences the location filter comes from. */
  fromLocations: string[];
  /** Years since the first experience, when dates are known. */
  yearsOfExperience: number | null;
}

/** add-source answers with a result instead of throwing: a typo is not an app error. */
export type AddSourceResult = { ok: true; source: JobSource } | { ok: false; error: string };

export interface StarterBoard {
  kind: JobSourceKind;
  token: string;
  label: string;
  region: "canada" | "global";
}

/**
 * Public boards to start with, one click each. Checked on 2026-11-17 (Canadian ones had Canadian openings that day);
 * a board that moved is reported when it is added, nothing breaks.
 */
export const STARTER_BOARDS: StarterBoard[] = [
  { kind: JobSourceKind.ASHBY, token: "wealthsimple", label: "Wealthsimple", region: "canada" },
  { kind: JobSourceKind.ASHBY, token: "1password", label: "1Password", region: "canada" },
  { kind: JobSourceKind.ASHBY, token: "cohere", label: "Cohere", region: "canada" },
  { kind: JobSourceKind.ASHBY, token: "jobber", label: "Jobber", region: "canada" },
  { kind: JobSourceKind.ASHBY, token: "benevity", label: "Benevity", region: "canada" },
  { kind: JobSourceKind.GREENHOUSE, token: "ada18", label: "Ada", region: "canada" },
  { kind: JobSourceKind.ASHBY, token: "hopper", label: "Hopper", region: "canada" },
  { kind: JobSourceKind.GREENHOUSE, token: "hootsuite", label: "Hootsuite", region: "canada" },
  { kind: JobSourceKind.GREENHOUSE, token: "gitlab", label: "GitLab", region: "global" },
  { kind: JobSourceKind.GREENHOUSE, token: "stripe", label: "Stripe", region: "global" },
  { kind: JobSourceKind.GREENHOUSE, token: "samsara", label: "Samsara", region: "global" },
  { kind: JobSourceKind.GREENHOUSE, token: "mongodb", label: "MongoDB", region: "global" },
  { kind: JobSourceKind.GREENHOUSE, token: "pinterest", label: "Pinterest", region: "global" },
  { kind: JobSourceKind.GREENHOUSE, token: "airbnb", label: "Airbnb", region: "global" },
  { kind: JobSourceKind.GREENHOUSE, token: "dropbox", label: "Dropbox", region: "global" },
  { kind: JobSourceKind.GREENHOUSE, token: "faire", label: "Faire", region: "global" },
  { kind: JobSourceKind.ASHBY, token: "ramp", label: "Ramp", region: "global" },
  { kind: JobSourceKind.LEVER, token: "spotify", label: "Spotify", region: "global" },
];

export interface DiscoveryRunStatus {
  running: boolean;
  trigger: "manual" | "schedule" | null;
  startedAt: string | null;
  finishedAt: string | null;
  /** Source being fetched, or waiting for its turn. */
  current: string | null;
  /** Epoch ms of the next request, while waiting for a site's cooldown. */
  waitingUntil: number | null;
  done: number;
  total: number;
  /** New offers kept after filtering. */
  added: number;
  errors: string[];
  /** The user stopped the run (not an error). */
  cancelled: boolean;
}

/** What the browser extension needs to prefill an application form. Nothing else of the profile leaves the app. */
export interface AutofillProfile {
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  linkedin: string;
  github: string;
  portfolio: string;
  /** From the most recent experience: worth a check before sending. */
  location: string;
  currentTitle: string;
  currentCompany: string;
}

export interface LocalServerStatus {
  app: "cvmaker";
  profileLoaded: boolean;
  profileName: string | null;
}
