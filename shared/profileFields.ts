/**
 * Optional information of the profile, declared in one place.
 *
 * To add a new piece of information (e.g. a "team size" on experiences):
 *   1. add the optional property to the entity interface (Experience.interface.ts…), for type checking;
 *   2. declare it below.
 * It then shows up in the profile editor (ExtraFieldsEditor) and every resume template can read it
 * ({{teamSize}} inside {{#each experiences}}), with no other change: the template data spreads whole entities.
 */

export type ExtraFieldType =
    | "text"      // one line
    | "textarea"  // several lines
    | "location"  // one line with city suggestions
    | "tags"      // list of short strings, typed comma-separated
    | "select";   // one of `options`

export interface ExtraFieldDef {
    key: string;
    label: string;
    type: ExtraFieldType;
    placeholder?: string;
    /** Short help shown next to the label. */
    hint?: string;
    options?: { value: string; label: string }[];
}

export type ExtraFieldSection = "profile" | "experience" | "education" | "project" | "skill";

export const EXTRA_FIELDS: Record<ExtraFieldSection, ExtraFieldDef[]> = {
    profile: [
        {
            key: "location",
            label: "Location",
            type: "location",
            placeholder: "Montréal, QC, Canada",
            hint: "Shown in the header of some templates",
        },
    ],
    experience: [],
    education: [
        {
            key: "kind",
            label: "Type",
            type: "select",
            hint: "Templates can list certifications apart",
            options: [
                { value: "degree", label: "Degree / school" },
                { value: "certification", label: "Certification" },
                { value: "course", label: "Course / program" },
            ],
        },
    ],
    project: [
        {
            key: "useCase",
            label: "Use case",
            type: "textarea",
            placeholder: "The problem this project solves, in one or two sentences",
            hint: "Used by detailed templates (project appendix)",
        },
        {
            key: "stack",
            label: "Stack",
            type: "tags",
            placeholder: "React, TypeScript, AWS",
            hint: "Comma-separated",
        },
    ],
    skill: [
        {
            key: "category",
            label: "Category",
            type: "text",
            placeholder: "Cloud & Infrastructure",
            hint: "Templates can group skills by category",
        },
    ],
};

/** Reads an extra field as text, whatever its stored type (tags are joined). */
export const extraFieldText = (value: unknown): string => {
    if (Array.isArray(value)) return value.join(", ");
    return value === undefined || value === null ? "" : String(value);
};

/** Parses a tags input ("a, b ,c") into a clean list. */
export const parseTags = (text: string): string[] =>
    text.split(",").map((tag) => tag.trim()).filter(Boolean);
