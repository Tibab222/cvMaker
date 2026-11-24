import type { ProfileFilterSuggestion } from "../../../shared/discovery.types";
import type { ProfilesData } from "../../../shared/profilesData.interface";
import { foldText } from "../../utils/text";
import { titleWords } from "./scoring";

/**
 * Search filters worked out from the profile, so a first search needs no setup.
 * Kept broad on purpose: filters drop offers for good, while the score already ranks what stays.
 */

interface RoleFamily {
    /** Tested on the folded job title (no accents, lower case). */
    match: RegExp;
    /** Words an offer title of this family contains, in English and French. */
    terms: string[];
}

const ROLE_FAMILIES: RoleFamily[] = [
    {
        match: /develop|programm|software|logiciel|full.?stack|front.?end|back.?end|web|\bdev\b|engineer|ingenieur|architect/,
        // shown to the user as is; matching ignores accents and treats "front-end" and "frontend" alike
        terms: ["developer", "engineer", "engineering", "programmer", "développeur", "développeuse", "ingénieur", "ingénieure", "software", "full stack", "fullstack", "frontend", "backend"],
    },
    { match: /mobile|\bios\b|android/, terms: ["mobile", "ios", "android"] },
    { match: /devops|\bsre\b|site reliability|infrastructure|cloud|platform|systems? admin/, terms: ["devops", "sre", "site reliability", "infrastructure", "platform", "cloud"] },
    { match: /\bdata\b|donnees|analyst|analyste|scientist|machine learning|\bml\b|\bai\b|\bia\b|\bbi\b/, terms: ["data", "analyst", "analyste", "scientist", "machine learning", "ai", "analytics"] },
    { match: /design|\bux\b|\bui\b/, terms: ["designer", "design", "ux", "ui"] },
    { match: /product|produit|\bpo\b/, terms: ["product manager", "product owner", "chef de produit", "product"] },
    { match: /project|projet|scrum|program manager|delivery/, terms: ["project manager", "chef de projet", "program manager", "scrum master", "delivery"] },
    { match: /\bqa\b|quality|qualite|\btest/, terms: ["qa", "quality", "test", "testeur", "automation"] },
    { match: /secur|cyber/, terms: ["security", "sécurité", "cybersecurity", "cybersécurité"] },
    { match: /support|help.?desk|technicien|technician/, terms: ["support", "technician", "technicien", "help desk"] },
];

const SENIOR_ONLY = ["staff", "principal", "director", "directeur", "directrice", "head of", "vp", "vice president"];
const ENTRY_ONLY = ["intern", "internship", "stagiaire", "co-op", "new grad", "alternance", "alternant"];

/** Province and state codes say little next to the city name, and two letters match too much. */
const MIN_PLACE_LENGTH = 3;

const dateOf = (value: unknown): number | null => {
    if (!value || value === "Present") return null;
    const time = new Date(value as string).getTime();
    return Number.isFinite(time) ? time : null;
};

export function suggestFiltersFromProfile(data: Pick<ProfilesData, "experience">, now: Date = new Date()): ProfileFilterSuggestion {
    const recent = [...data.experience]
        .filter((exp) => exp.jobTitle?.trim())
        .sort((a, b) => (dateOf(b.startDate) ?? 0) - (dateOf(a.startDate) ?? 0))
        .slice(0, 3);

    // titles: the role families of recent jobs, or their own words when no family fits (accountant, nurse...)
    const titleTerms = new Set<string>();
    for (const exp of recent) {
        const folded = foldText(exp.jobTitle);
        const families = ROLE_FAMILIES.filter((family) => family.match.test(folded));
        if (families.length > 0) families.forEach((family) => family.terms.forEach((term) => titleTerms.add(term)));
        else titleWords(exp.jobTitle).forEach((word) => titleTerms.add(word));
    }

    // seniority: keep offers around the candidate's level, from the first experience date
    const starts = data.experience.map((exp) => dateOf(exp.startDate)).filter((time): time is number => time !== null);
    const years = starts.length > 0 ? Math.max(0, Math.floor((now.getTime() - Math.min(...starts)) / (365.25 * 24 * 3600 * 1000))) : null;
    const titleExcludes = years === null ? [] : [...(years < 6 ? SENIOR_ONLY : []), ...(years >= 2 ? ENTRY_ONLY : [])];
    // never exclude a word of the candidate's own titles ("Staff Engineer" keeps staff offers)
    const ownTitles = recent.map((exp) => exp.jobTitle).join(" ");
    const excludes = titleExcludes.filter((word) => !foldText(ownTitles).includes(foldText(word)));

    // places: where the recent experiences were; remote offers always pass anyway
    const fromLocations = [...new Set(recent.map((exp) => exp.location?.trim()).filter((place): place is string => !!place))];
    const places = new Map<string, string>();
    for (const location of fromLocations) {
        for (const part of location.split(/[,/|]|\s-\s/)) {
            const place = part.trim();
            if (place.length >= MIN_PLACE_LENGTH && !/remote|t[ée]l[ée]travail/i.test(place) && !places.has(foldText(place))) {
                places.set(foldText(place), place);
            }
        }
    }

    return {
        filters: {
            titleIncludes: [...titleTerms].slice(0, 30),
            titleExcludes: excludes,
            locations: [...places.values()].slice(0, 10),
        },
        fromTitles: [...new Set(recent.map((exp) => exp.jobTitle.trim()))],
        fromLocations,
        yearsOfExperience: years,
    };
}
