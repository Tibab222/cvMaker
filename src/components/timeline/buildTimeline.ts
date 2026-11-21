import type { Education } from "@shared/Education.interface";
import type { Experience } from "@shared/Experience.interface";
import type { Project } from "@shared/projects.interface";
import type { Skills } from "@shared/Skills.interface";
import { findRelatedExperience, parseProjectDate } from "@shared/projectDates";

export type TimelineKind = "education" | "experience" | "project";

/** Months are counted as `year * 12 + monthIndex` (monthIndex 0-11) so the axis math stays integer. */
export type MonthIndex = number;

export interface TimelineEvent {
  key: string; // `${kind}:${id}`
  id: string;
  kind: TimelineKind;
  title: string;
  organization?: string;
  location?: string;
  description?: string;
  link?: string;
  /** null when the item has no usable date */
  start: MonthIndex | null;
  /** inclusive last month */
  end: MonthIndex | null;
  ongoing: boolean;
  /** dates borrowed from the linked experience because the project has none */
  approximate: boolean;
  /** true when only the year is known (projects), so periods are shown as years */
  yearPrecision: boolean;
  durationMonths: number;
  /** skills found in this item (display names, first seen order) */
  skills: string[];
  /** skills that appear here for the first time in the whole journey */
  newSkills: string[];
  /** project → the experience it was done in */
  parentKey?: string;
  /** experience → the keys of its linked projects */
  childKeys: string[];
  bulletCount: number;
}

export interface GrowthPoint {
  month: MonthIndex;
  total: number;
  added: string[];
  eventKey: string;
}

export interface TimelineStats {
  professionalMonths: number;
  roles: number;
  companies: number;
  projects: number;
  degrees: number;
  skills: number;
  skillsLastYear: number;
  longestRole?: { title: string; organization?: string; months: number };
  firstYear?: number;
}

export interface TimelineData {
  events: TimelineEvent[]; // dated ones, chronological
  undated: TimelineEvent[];
  byKey: Map<string, TimelineEvent>;
  growth: GrowthPoint[];
  range: { start: MonthIndex; end: MonthIndex } | null;
  now: MonthIndex;
  stats: TimelineStats;
  /** every skill, with the month it was first seen (null when it only comes from undated items) */
  skillFirstSeen: { name: string; month: MonthIndex | null; eventKey: string }[];
}

export const toMonthIndex = (date: Date): MonthIndex => date.getFullYear() * 12 + date.getMonth();
export const monthYear = (month: MonthIndex) => Math.floor(month / 12);

const dateToMonth = (value: Date | string | undefined | null): MonthIndex | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : toMonthIndex(date);
};

const KIND_ORDER: Record<TimelineKind, number> = { education: 0, experience: 1, project: 2 };

// ---------- skill detection ----------

const normalize = (skill: string) => skill.trim().toLowerCase().replace(/\s+/g, " ");
const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

interface SkillMatcher {
  key: string;
  name: string;
  regex: RegExp;
}

/** Catalog of known skills: the profile's skills plus every tag used on project bullets. */
const buildCatalog = (skills: Skills[], projects: Project[]) => {
  const names = new Map<string, string>();
  const add = (raw: string | undefined) => {
    if (!raw?.trim()) return;
    const key = normalize(raw);
    if (!names.has(key)) names.set(key, raw.trim());
  };
  skills.forEach((skill) => add(skill.name));
  projects.forEach((project) => project.bullets?.forEach((bullet) => bullet.tags?.forEach(add)));

  const matchers: SkillMatcher[] = [...names.entries()].map(([key, name]) => ({
    key,
    name,
    // short names (Go, R, C#, AWS) only match with the same case, to avoid catching ordinary words
    regex: new RegExp(`(^|[^\\p{L}\\p{N}+#.])${escapeRegExp(name)}(?=$|[^\\p{L}\\p{N}+#])`, name.length <= 3 ? "u" : "iu"),
  }));
  return { names, matchers };
};

const skillsInText = (text: string, matchers: SkillMatcher[]) =>
  text.trim() ? matchers.filter((m) => m.regex.test(text)).map((m) => m.key) : [];

const unique = (keys: string[]) => [...new Set(keys)];

// ---------- builder ----------

interface Sources {
  experience: Experience[];
  education: Education[];
  projects: Project[];
  skills: Skills[];
  now?: Date;
}

const projectStart = (value: string | undefined): { month: MonthIndex; yearOnly: boolean } | null => {
  const parsed = parseProjectDate(value);
  if (!parsed) return null;
  return { month: parsed.year * 12 + (parsed.month ? parsed.month - 1 : 0), yearOnly: !parsed.month };
};

const projectEnd = (value: string | undefined): { month: MonthIndex; yearOnly: boolean } | null => {
  const parsed = parseProjectDate(value);
  if (!parsed) return null;
  return { month: parsed.year * 12 + (parsed.month ? parsed.month - 1 : 11), yearOnly: !parsed.month };
};

export function buildTimeline({ experience, education, projects, skills, now = new Date() }: Sources): TimelineData {
  const nowMonth = toMonthIndex(now);
  const { names, matchers } = buildCatalog(skills, projects);
  const displayName = (key: string) => names.get(key) ?? key;

  const all: TimelineEvent[] = [];
  const skillKeys = new Map<string, string[]>(); // event key → normalized skill keys

  const finish = (event: Omit<TimelineEvent, "durationMonths" | "skills" | "newSkills" | "childKeys">, keys: string[]) => {
    const durationMonths = event.start !== null && event.end !== null ? Math.max(1, event.end - event.start + 1) : 0;
    const full: TimelineEvent = { ...event, durationMonths, skills: [], newSkills: [], childKeys: [] };
    skillKeys.set(full.key, unique(keys));
    full.skills = unique(keys).map(displayName);
    all.push(full);
    return full;
  };

  education.forEach((edu) => {
    const start = dateToMonth(edu.startDate);
    const ongoing = edu.endDate === "Present";
    const end = ongoing ? nowMonth : dateToMonth(edu.endDate) ?? start;
    finish(
      {
        key: `education:${edu.id}`,
        id: edu.id,
        kind: "education",
        title: edu.degree || "Untitled degree",
        organization: edu.institution,
        location: edu.location,
        description: edu.description,
        start,
        end: start !== null && end !== null ? Math.max(start, end) : end,
        ongoing,
        approximate: false,
        yearPrecision: false,
        bulletCount: 0,
      },
      skillsInText(`${edu.degree} ${edu.description ?? ""}`, matchers),
    );
  });

  experience.forEach((exp) => {
    const start = dateToMonth(exp.startDate);
    const ongoing = exp.endDate === "Present";
    const end = ongoing ? nowMonth : dateToMonth(exp.endDate) ?? start;
    finish(
      {
        key: `experience:${exp.id}`,
        id: exp.id,
        kind: "experience",
        title: exp.jobTitle || "Untitled position",
        organization: exp.company,
        location: exp.location,
        description: exp.description,
        start,
        end: start !== null && end !== null ? Math.max(start, end) : end,
        ongoing,
        approximate: false,
        yearPrecision: false,
        bulletCount: 0,
      },
      skillsInText(`${exp.jobTitle} ${exp.description ?? ""}`, matchers),
    );
  });

  const byKey = new Map(all.map((event) => [event.key, event]));

  projects.forEach((project) => {
    const related = findRelatedExperience(project, experience);
    const parent = related ? byKey.get(`experience:${related.id}`) : undefined;
    const startInfo = projectStart(project.startDate);
    const endInfo = project.endDate === "Present" ? null : projectEnd(project.endDate);
    const ongoing = project.endDate === "Present";

    let start: MonthIndex | null = startInfo?.month ?? null;
    let end: MonthIndex | null = ongoing ? nowMonth : endInfo?.month ?? null;
    let approximate = false;
    if (start === null && end !== null) start = endInfo?.yearOnly ? end - 11 : end;
    if (start !== null && end === null) end = startInfo?.yearOnly ? start + 11 : start;
    if (start === null && parent) {
      start = parent.start;
      end = parent.end;
      approximate = true;
    }
    if (start !== null && end !== null && end < start) end = start;

    const tagKeys = project.bullets?.flatMap((bullet) => bullet.tags ?? []).map(normalize) ?? [];
    const textKeys = skillsInText(
      `${project.title} ${project.subtitle ?? ""} ${project.bullets?.map((b) => b.text).join(" ") ?? ""}`,
      matchers,
    );

    const event = finish(
      {
        key: `project:${project.id}`,
        id: project.id,
        kind: "project",
        title: project.title || "Untitled project",
        organization: related?.company || project.subtitle,
        description: project.subtitle && related ? project.subtitle : undefined,
        link: project.link,
        start,
        end,
        ongoing: ongoing || (approximate && !!parent?.ongoing),
        approximate,
        yearPrecision: !approximate && !!(startInfo?.yearOnly ?? endInfo?.yearOnly),
        parentKey: parent?.key,
        bulletCount: project.bullets?.length ?? 0,
      },
      [...tagKeys.filter(Boolean), ...textKeys],
    );
    byKey.set(event.key, event);
    if (parent) parent.childKeys.push(event.key);
  });

  const dated = all
    .filter((event) => event.start !== null)
    .sort((a, b) => (a.start! - b.start!) || (KIND_ORDER[a.kind] - KIND_ORDER[b.kind]) || ((a.end ?? 0) - (b.end ?? 0)));
  const undated = all.filter((event) => event.start === null);

  // first appearance of each skill, walking the journey in order
  const seen = new Set<string>();
  const skillFirstSeen: TimelineData["skillFirstSeen"] = [];
  const growth: GrowthPoint[] = [];
  [...dated, ...undated].forEach((event) => {
    const fresh = (skillKeys.get(event.key) ?? []).filter((key) => !seen.has(key));
    fresh.forEach((key) => {
      seen.add(key);
      skillFirstSeen.push({ name: displayName(key), month: event.start, eventKey: event.key });
    });
    event.newSkills = fresh.map(displayName);
    if (event.start !== null && fresh.length) {
      growth.push({ month: event.start, total: seen.size, added: event.newSkills, eventKey: event.key });
    }
  });

  const range = dated.length
    ? {
        start: Math.min(...dated.map((e) => e.start!)),
        end: Math.max(nowMonth, ...dated.map((e) => e.end ?? e.start!)),
      }
    : null;

  // professional time = union of experience periods, so overlapping jobs are not counted twice
  const intervals = dated
    .filter((e) => e.kind === "experience")
    .map((e) => [e.start!, e.end ?? e.start!] as const)
    .sort((a, b) => a[0] - b[0]);
  let professionalMonths = 0;
  let cursor = -Infinity;
  intervals.forEach(([start, end]) => {
    const from = Math.max(start, cursor);
    if (end + 1 > from) professionalMonths += end + 1 - from;
    cursor = Math.max(cursor, end + 1);
  });

  const roles = all.filter((e) => e.kind === "experience");
  const longest = roles.reduce<TimelineEvent | undefined>((best, e) => (!best || e.durationMonths > best.durationMonths ? e : best), undefined);

  const stats: TimelineStats = {
    professionalMonths,
    roles: roles.length,
    companies: new Set(roles.map((e) => normalize(e.organization ?? "")).filter(Boolean)).size,
    projects: all.filter((e) => e.kind === "project").length,
    degrees: all.filter((e) => e.kind === "education").length,
    skills: seen.size,
    skillsLastYear: skillFirstSeen.filter((s) => s.month !== null && s.month > nowMonth - 12).length,
    longestRole: longest && longest.durationMonths > 0
      ? { title: longest.title, organization: longest.organization, months: longest.durationMonths }
      : undefined,
    firstYear: range ? monthYear(range.start) : undefined,
  };

  return { events: dated, undated, byKey, growth, range, now: nowMonth, stats, skillFirstSeen };
}

// ---------- formatting ----------

const MONTH_FORMAT = new Intl.DateTimeFormat(undefined, { month: "short", year: "numeric", timeZone: "UTC" });

export const formatMonth = (month: MonthIndex) =>
  MONTH_FORMAT.format(new Date(Date.UTC(monthYear(month), month % 12, 1)));

export const formatPeriod = (event: TimelineEvent) => {
  if (event.start === null) return "No date yet";
  const fmt = (m: MonthIndex) => (event.yearPrecision ? String(monthYear(m)) : formatMonth(m));
  const start = fmt(event.start);
  if (event.ongoing) return `${start} — today`;
  const end = event.end !== null ? fmt(event.end) : start;
  return end === start ? start : `${start} — ${end}`;
};

export const formatDuration = (months: number) => {
  if (months <= 0) return "";
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (!years) return `${rest} mo`;
  if (!rest) return `${years} yr${years > 1 ? "s" : ""}`;
  return `${years} yr${years > 1 ? "s" : ""} ${rest} mo`;
};
