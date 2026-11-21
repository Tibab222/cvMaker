import type { Experience } from "./Experience.interface";
import type { Project, ProjectDate } from "./projects.interface";

const PROJECT_DATE_PATTERN = /^(\d{4})(?:-(0[1-9]|1[0-2]))?$/;

/** Splits a project date into its year and optional month (1-12), or null when it is not a valid "YYYY" / "YYYY-MM". */
export const parseProjectDate = (value: string | undefined | null): { year: number; month?: number } | null => {
  if (!value) return null;
  const match = PROJECT_DATE_PATTERN.exec(value.trim());
  if (!match) return null;
  return { year: Number(match[1]), month: match[2] ? Number(match[2]) : undefined };
};

/** Builds a project date from a year and an optional month (1-12); undefined when the year is not 4 digits. */
export const buildProjectDate = (year: string | number | undefined, month?: number): ProjectDate | undefined => {
  const yearText = String(year ?? "").trim();
  if (!/^\d{4}$/.test(yearText)) return undefined;
  return month ? `${yearText}-${String(month).padStart(2, "0")}` : yearText;
};

const formatProjectDate = (value: ProjectDate, locale: string): string => {
  const parsed = parseProjectDate(value);
  if (!parsed) return "";
  if (!parsed.month) return String(parsed.year);
  return new Date(Date.UTC(parsed.year, parsed.month - 1, 1))
    .toLocaleDateString(locale, { month: "short", year: "numeric", timeZone: "UTC" })
    .replace(".", "");
};

/**
 * Human-readable period of a project ("2023", "Mar 2022 — 2023", "2024 — Present"), or "" when it has no valid date.
 * `presentLabel` is used for ongoing projects.
 */
export const formatProjectPeriod = (
  project: Pick<Project, "startDate" | "endDate">,
  locale: string,
  presentLabel: string,
): string => {
  const start = project.startDate ? formatProjectDate(project.startDate, locale) : "";
  const isOngoing = project.endDate === "Present";
  const end = isOngoing ? presentLabel : project.endDate ? formatProjectDate(project.endDate, locale) : "";
  if (start && end && start !== end) return `${start} — ${end}`;
  return start || (isOngoing ? "" : end);
};

/** Locale used to format dates for a profile language code ("fr" / "en"). */
export const localeForLanguage = (language: string | undefined): string => (language === "fr" ? "fr-FR" : "en-US");

/** The experience a project is linked to, or undefined when it has no link or the experience no longer exists. */
export const findRelatedExperience = (
  project: Pick<Project, "relatedExperienceId">,
  experiences: Experience[],
): Experience | undefined =>
  project.relatedExperienceId ? experiences.find((exp) => exp.id === project.relatedExperienceId) : undefined;

/** Drops the link of every project pointing to the given experience (used when that experience is deleted). */
export const unlinkProjectsFromExperience = (projects: Project[], experienceId: string): Project[] =>
  projects.map((project) => {
    if (project.relatedExperienceId !== experienceId) return project;
    const unlinked = { ...project };
    delete unlinked.relatedExperienceId;
    return unlinked;
  });
