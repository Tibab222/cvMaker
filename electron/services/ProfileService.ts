import { ProfilesData } from "../../shared/profilesData.interface";
import * as fs from 'fs';

export class ProfileService {
    private static instance: ProfileService | null = null;
    private profile_path: string | null = null;

    private constructor() {}

    public static getInstance(): ProfileService {
        if (!ProfileService.instance) {
            ProfileService.instance = new ProfileService();
        }
        return ProfileService.instance;
    }

    public async loadProfile(profilePath: string): Promise<ProfilesData> {
        this.profile_path = profilePath;
        const profileData = await fs.promises.readFile(`${profilePath}/infos.json`, 'utf-8');
        const educationData = await fs.promises.readFile(`${profilePath}/edu.json`, 'utf-8');
        const experienceData = await fs.promises.readFile(`${profilePath}/exp.json`, 'utf-8');
        const resumeData = await fs.promises.readFile(`${profilePath}/header_resume.json`, 'utf-8');
        const projectsData = await fs.promises.readFile(`${profilePath}/projects.json`, 'utf-8');
        const skillsData = await fs.promises.readFile(`${profilePath}/skills.json`, 'utf-8');
        const profile = {
            profile: JSON.parse(profileData),
            education: JSON.parse(educationData) || [],
            experience: JSON.parse(experienceData) || [],
            resume: JSON.parse(resumeData) || [],
            projects: JSON.parse(projectsData) || [],
            skills: JSON.parse(skillsData) || []
        } as ProfilesData;

        return profile;
    }

    public async getExperiences(): Promise<ProfilesData['experience']> {
        if (!this.profile_path) {
            throw new Error('No profile loaded');
        }
        const experienceData = await fs.promises.readFile(`${this.profile_path}/exp.json`, 'utf-8');
        return JSON.parse(experienceData) || [];
    }

    public async getProjects(): Promise<ProfilesData['projects']> {
        if (!this.profile_path) {
            throw new Error('No profile loaded');
        }
        const projectsData = await fs.promises.readFile(`${this.profile_path}/projects.json`, 'utf-8');
        return JSON.parse(projectsData) || [];
    }
}