import type { Education } from "./Education.interface";
import type { Experience } from "./Experience.interface";
import type { Profile } from "./profile.interface";
import type { Project } from "./projects.interface";
import type { Skills } from "./Skills.interface";

export interface ProfilesData {
    profile: Profile;
    education: Education[];
    experience: Experience[];
    resume: [];
    projects: Project[];
    skills: Skills[]
}