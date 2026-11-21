/** A project date: "YYYY" (year precision) or "YYYY-MM" (month precision). */
export type ProjectDate = string;

export interface ProjectBullet {
    id: string;
    text: string;
    tags: string[];
}

export interface Project {
    id: string;
    title: string;
    subtitle?: string;
    bullets: ProjectBullet[];
    link?: string;
    /** When the project started: "YYYY" (year only) or "YYYY-MM" (month precision). */
    startDate?: ProjectDate;
    /** When it ended, same format as startDate, or 'Present' for an ongoing project. */
    endDate?: ProjectDate | 'Present';
    /** Id of the professional experience (job) the project was done in, if any. */
    relatedExperienceId?: string;
}