/**
 * Builds the data a .cvm template is rendered with.
 *
 * Entities are passed whole (spread), with the user's on-resume edits applied: any field added to the profile
 * later is readable by templates without touching this file. Only *derived* values (contacts, project company,
 * selected bullets…) are computed here.
 */
import type { Education } from "@shared/Education.interface";
import type { Experience } from "@shared/Experience.interface";
import type { Profile } from "@shared/profile.interface";
import type { Project, ProjectBullet } from "@shared/projects.interface";
import type { Skills } from "@shared/Skills.interface";
import type { CVSelection } from "@shared/jobApplications.type";
import type { CvmCollection, CvmMeta } from "@shared/cvm/format";
import type { EntityType } from "@shared/utils";
import { findRelatedExperience } from "@shared/projectDates";

/** Marks an object of the context as editable: {{edit this "field"}} needs its type and id. */
export interface Editable {
    __type: EntityType;
    id: string;
    /** The entity before on-resume edits, used as the "reset" value of an edited field. */
    __orig: Record<string, unknown>;
}

export interface ContextInput {
    meta: CvmMeta;
    lang: string;
    profile: Profile;
    experience: Experience[];
    projects: Project[];
    skills: Skills[];
    education: Education[];
    selection: CVSelection;
    customTexts: Record<string, string>;
    summaryBullets: string[];
    includePhoto: boolean;
    showSummary: boolean;
}

export interface Contact {
    key: string;
    label: string;
    url: string;
}

type Overrides = Map<string, Record<string, string>>;

/** customTexts keys are "type:id:field": index them by "type:id" once per render. */
const indexOverrides = (customTexts: Record<string, string>): Overrides => {
    const index: Overrides = new Map();
    for (const [key, value] of Object.entries(customTexts)) {
        const last = key.lastIndexOf(":");
        if (last <= 0) continue;
        const owner = key.slice(0, last);
        const field = key.slice(last + 1);
        if (!index.has(owner)) index.set(owner, {});
        index.get(owner)![field] = value;
    }
    return index;
};

const editable = <T extends { id: string }>(type: EntityType, entity: T, overrides: Overrides): T & Editable => ({
    ...entity,
    ...(overrides.get(`${type}:${entity.id}`) ?? {}),
    __type: type,
    __orig: entity as unknown as Record<string, unknown>,
});

/** Keeps the items whose id is in `ids`, in the order of `ids` (the order the user picked them in). */
const pickInOrder = <T extends { id: string }>(items: T[], ids: string[] | undefined): T[] => {
    if (!ids?.length) return [];
    const byId = new Map(items.map((item) => [item.id, item]));
    return ids.map((id) => byId.get(id)).filter((item): item is T => item !== undefined);
};

const withProtocol = (url: string) => (/^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}`);
const shortUrl = (url: string) => url.replace(/^[a-z]+:\/\/(www\.)?/i, "").replace(/\/$/, "");

const CONTACT_KEYS = ["mail", "phone", "portfolio", "linkedin", "github", "twitter", "instagram", "tiktok", "youtube", "facebook"] as const;

/** Contact lines of the header, in a fixed order, keeping only what the profile has and the resume shows. */
const buildContacts = (profile: Profile, header: CVSelection["headerInfos"]): Contact[] => {
    const contacts: Contact[] = [];
    for (const key of CONTACT_KEYS) {
        const value = profile[key]?.trim();
        if (!value || !header[key]) continue;
        if (key === "mail") contacts.push({ key, label: value, url: `mailto:${value}` });
        else if (key === "phone") contacts.push({ key, label: value, url: `tel:${value.replace(/[^\d+]/g, "")}` });
        else if (key === "github" && !value.includes("github.com")) {
            contacts.push({ key, label: `github.com/${value}`, url: `https://github.com/${value}` });
        } else contacts.push({ key, label: shortUrl(value), url: withProtocol(value) });
    }
    for (const link of profile.customLinks ?? []) {
        if (!link.label || !link.url || !header.customLinks?.[link.label]) continue;
        contacts.push({ key: "link", label: link.label, url: withProtocol(link.url) });
    }
    return contacts;
};

/** Most recent first, ongoing on top (same order as the original resume). */
const sortEducation = (education: Education[]) =>
    [...education].sort((a, b) => {
        if (a.endDate === "Present") return -1;
        if (b.endDate === "Present") return 1;
        return new Date(b.endDate || "").getTime() - new Date(a.endDate || "").getTime();
    });

export const buildTemplateContext = (input: ContextInput): Record<string, unknown> => {
    const { meta, profile, selection, experience, customTexts } = input;
    const overrides = indexOverrides(customTexts);

    const decorateProject = (project: Project, bulletIds: string[] | undefined) => {
        const toBullet = (bullet: ProjectBullet) => editable("bullet", bullet, overrides);
        const company = findRelatedExperience(project, experience)?.company?.trim();
        const selectedBullets = pickInOrder(project.bullets ?? [], bulletIds).map(toBullet);
        return {
            ...editable("project", project, overrides),
            company,
            // the company is worth naming unless the subtitle already does
            showCompany: !!company && !project.subtitle?.toLowerCase().includes(company.toLowerCase()),
            bullets: selectedBullets,
            allBullets: (project.bullets ?? []).map(toBullet),
            // every technology tagged on the bullets, as a fallback when the project has no explicit stack
            tags: [...new Set((project.bullets ?? []).flatMap((bullet) => bullet.tags ?? []))],
        };
    };

    const decorateExperience = (exp: Experience) => editable("experience", exp, overrides);
    const decorateEducation = (edu: Education) => editable("education", edu, overrides);
    const decorateSkill = (skill: Skills) => editable("skill", skill, overrides);

    const selectedProjects = pickInOrder(input.projects, selection.selectedProjectIds)
        .map((project) => decorateProject(project, selection.selectedBullets[project.id]))
        // a project without a picked bullet has nothing to say on the resume
        .filter((project) => project.bullets.length > 0);

    const buildCollection = (collection: CvmCollection, ids: string[] | undefined) => {
        switch (collection.source) {
            case "projects":
                return pickInOrder(input.projects, ids).map((project) => {
                    const decorated = decorateProject(project, selection.selectedBullets[project.id]);
                    return collection.bullets === "selected" ? decorated : { ...decorated, bullets: decorated.allBullets };
                });
            case "experiences":
                return pickInOrder(input.experience, ids).map(decorateExperience);
            case "education":
                return pickInOrder(input.education, ids).map(decorateEducation);
            case "skills":
                return pickInOrder(input.skills, ids).map(decorateSkill);
        }
    };

    const collections: Record<string, unknown[]> = {};
    for (const [name, collection] of Object.entries(meta.collections ?? {})) {
        collections[name] = buildCollection(collection, selection.collections?.[name]);
    }

    return {
        lang: input.lang,
        meta,
        page: meta.page,
        profile: { ...profile, photo: undefined },
        photo: input.includePhoto ? profile.photo : undefined,
        header: selection.headerInfos,
        contacts: buildContacts(profile, selection.headerInfos),
        // empty sentences are kept: a summary just switched on is one empty sentence, and the template must still
        // show it ({{#if summary}}) so it can be written in place. The editor leaves them out of the PDF.
        summary: input.showSummary ? input.summaryBullets : [],
        experiences: pickInOrder(input.experience, selection.selectedExpIds).map(decorateExperience),
        projects: selectedProjects,
        skills: input.skills.filter((skill) => selection.selectedSkillsIds.includes(skill.id)).map(decorateSkill),
        education: sortEducation(input.education.filter((edu) => selection.selectedEducationIds.includes(edu.id))).map(decorateEducation),
        // the whole profile, for templates that list everything (or pick by their own rules)
        all: {
            experiences: input.experience.map(decorateExperience),
            projects: input.projects.map((project) => decorateProject(project, selection.selectedBullets[project.id])),
            skills: input.skills.map(decorateSkill),
            education: sortEducation(input.education).map(decorateEducation),
        },
        collections,
        // collections are also reachable by their own name: {{#each appendix}}
        ...collections,
    };
};
