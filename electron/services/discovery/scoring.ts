import type { DiscoveryFilters } from "../../../shared/discovery.types";
import type { ProfilesData } from "../../../shared/profilesData.interface";
import { containsTerm, foldText, mentions } from "../../utils/text";

/**
 * Local, explainable match between an offer and the profile: no AI call, so it can run on hundreds of offers at night.
 * The score mixes keyword coverage, title similarity and (when the embedding model is available) semantic similarity.
 */

export interface ProfileSignals {
    /** normalized term -> how the user writes it ("PostgreSQL") */
    terms: Map<string, string>;
    /** folded text (foldText) of experiences, projects and skills */
    text: string;
    /** meaningful words of past job titles */
    titleWords: Set<string>;
    /** short text used for the profile embedding */
    summary: string;
}

export interface ScoreDeps {
    extractKeywords: (text: string) => string[];
    /** Optional semantic similarity: both vectors are normalized, so the dot product is the cosine. */
    embed?: (text: string) => Promise<Float32Array>;
    profileVector?: Float32Array | null;
}

export interface JobScore {
    score: number;
    matched: string[];
    missing: string[];
}

/** "Node.js", "nodejs" and "NODE JS" are the same skill. */
export const normalizeTerm = (value: string) => value.toLowerCase().replace(/[^a-z0-9+#]/g, "");

/** Seniority and contract words say nothing about the job itself. */
const TITLE_NOISE = new Set([
    "senior", "junior", "lead", "staff", "principal", "sr", "jr", "intern", "internship", "stage", "stagiaire", "alternance",
    "the", "and", "for", "with", "des", "les", "une", "pour", "avec", "h/f", "f/h", "m/f", "m/w", "cdi", "cdd", "freelance",
]);

export function titleWords(title: string): string[] {
    return title
        .toLowerCase()
        .split(/[^a-z0-9+#àâçéèêëîïôûùüÿœ]+/)
        .filter((word) => word.length > 2 && !TITLE_NOISE.has(word));
}

export function buildProfileSignals(data: Pick<ProfilesData, "skills" | "projects" | "experience">): ProfileSignals {
    const terms = new Map<string, string>();
    const add = (value: string) => {
        const key = normalizeTerm(value);
        if (key && !terms.has(key)) terms.set(key, value.trim());
    };
    data.skills.forEach((skill) => add(skill.name));
    data.projects.forEach((project) => project.bullets.forEach((bullet) => bullet.tags.forEach(add)));

    const text = [
        ...data.experience.map((exp) => `${exp.jobTitle} ${exp.description ?? ""}`),
        ...data.projects.map((project) => `${project.title} ${project.subtitle ?? ""} ${project.bullets.map((b) => `${b.text} ${b.tags.join(" ")}`).join(" ")}`),
        ...data.skills.map((skill) => skill.name),
    ].join("\n");

    const recentExperience = [...data.experience]
        .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
        .slice(0, 3);

    const summary = [
        recentExperience.map((exp) => `${exp.jobTitle}: ${(exp.description ?? "").slice(0, 300)}`).join("\n"),
        `Skills: ${[...terms.values()].slice(0, 40).join(", ")}`,
    ].join("\n").slice(0, 2000);

    return {
        terms,
        text: foldText(text),
        titleWords: new Set(data.experience.flatMap((exp) => titleWords(exp.jobTitle))),
        summary,
    };
}

export function hasProfileContent(signals: ProfileSignals): boolean {
    return signals.terms.size > 0 || signals.text.trim().length > 0;
}

export interface FilterableJob {
    title: string;
    location: string | null;
    remote: boolean;
    postedAt: string | null;
}

/** Whether an offer is worth keeping. Rejected offers are not stored at all. */
export function matchesFilters(job: FilterableJob, filters: DiscoveryFilters, now: number = Date.now()): boolean {
    const title = job.title;
    const location = job.location ?? "";

    if (!job.title.trim()) return false;
    if (filters.titleIncludes.length > 0 && !filters.titleIncludes.some((word) => mentions(title, word))) return false;
    if (filters.titleExcludes.some((word) => mentions(title, word))) return false;
    if (filters.remoteOnly && !job.remote) return false;
    if (filters.locations.length > 0 && !job.remote && !filters.locations.some((place) => mentions(location, place))) return false;
    if (filters.maxAgeDays > 0 && job.postedAt) {
        const age = now - new Date(job.postedAt).getTime();
        if (age > filters.maxAgeDays * 24 * 3600 * 1000) return false;
    }
    return true;
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

function dot(a: Float32Array, b: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i++) sum += a[i] * b[i];
    return sum;
}

export async function scoreJob(job: { title: string; description: string }, signals: ProfileSignals, deps: ScoreDeps): Promise<JobScore> {
    const jobText = `${job.title}\n${job.description}`;
    const foldedJobText = foldText(jobText);

    // 1. keywords the offer asks for, and whether the profile has them
    const jobKeywords = deps.extractKeywords(jobText).slice(0, 20);
    const inProfile = (keyword: string) => signals.terms.has(normalizeTerm(keyword)) || containsTerm(signals.text, keyword);
    const covered = jobKeywords.filter(inProfile);
    const coverage = jobKeywords.length > 0 ? covered.length / jobKeywords.length : 0;

    // 2. declared skills / tags the offer mentions, even if the extractor did not pick them
    const termHits = [...signals.terms.entries()]
        .filter(([, display]) => containsTerm(foldedJobText, display))
        .map(([, display]) => display);
    const keywordScore = 0.5 * coverage + 0.5 * clamp01(termHits.length / 5);

    // 3. title similarity with past roles
    const words = titleWords(job.title);
    const titleScore = words.length > 0 ? words.filter((word) => signals.titleWords.has(word)).length / words.length : 0;

    // 4. semantic similarity, when the local embedding model is available
    let semantic: number | null = null;
    if (deps.embed && deps.profileVector) {
        try {
            const vector = await deps.embed(`${job.title}\n${job.description.slice(0, 2000)}`);
            // MiniLM cosine for related texts sits around 0.3-0.6: stretch that range to 0-1
            semantic = clamp01((dot(vector, deps.profileVector) - 0.15) / 0.45);
        } catch {
            semantic = null;
        }
    }

    const score = semantic === null
        ? 0.75 * keywordScore + 0.25 * titleScore
        : 0.45 * semantic + 0.4 * keywordScore + 0.15 * titleScore;

    const unique = new Map([...termHits, ...covered].map((term) => [normalizeTerm(term), signals.terms.get(normalizeTerm(term)) ?? term]));
    unique.delete("");
    // "Node" and "js" next to "Node.js" are the same thing said twice
    const matched = [...unique.entries()]
        .filter(([key]) => ![...unique.keys()].some((other) => other !== key && other.length > key.length && other.includes(key)))
        .map(([, display]) => display);
    const missing = jobKeywords.filter((keyword) => !inProfile(keyword) && !isNoiseKeyword(keyword));

    return {
        score: Math.round(clamp01(score) * 100),
        matched: matched.slice(0, 10),
        missing: missing.slice(0, 6),
    };
}

/** Words the keyword extractor lets through that never name a skill ("plus", "will own"). */
const NOISE_WORDS = new Set([
    "plus", "bonus", "will", "own", "can", "must", "should", "nice", "great", "good", "strong", "able", "ability", "etc",
    "including", "new", "role", "team", "teams", "work", "atout", "serait", "souhaité", "idéalement",
]);

function isNoiseKeyword(keyword: string): boolean {
    const words = keyword.toLowerCase().split(/\s+/).filter(Boolean);
    return words.length === 0 || words.every((word) => NOISE_WORDS.has(word)) || /^(will|can|must|should|you|we)\b/i.test(keyword);
}
