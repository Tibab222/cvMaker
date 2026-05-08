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
    relatedExperienceId?: string;
}