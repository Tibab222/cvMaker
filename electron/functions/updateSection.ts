import { ProfilesData } from "../../shared/profilesData.interface";
import * as fs from 'fs';
import { profilesDir } from "../main.dev";
import path from "path/win32";

const SECTION_FILE_MAP: Record<keyof ProfilesData, string> = {
    education: 'edu.json',
    experience: 'exp.json',
    profile: 'infos.json',
    projects: 'projects.json',
    skills: 'skills.json',
    resume: 'header_resume.json'
};

export async function updateSection<K extends keyof ProfilesData>(id: string, section: K, newData: ProfilesData[K]) {
    const fileName = SECTION_FILE_MAP[section];
    if (!fileName) {
        throw new Error(`Section ${section} unknown.`);
    }
    const filePath = path.join(profilesDir, id, fileName);
    try {
        await fs.promises.writeFile(
            filePath, 
            JSON.stringify(newData, null, 2), 
            'utf-8'
        );
        return newData;
    } catch (err) {
        console.error(`Error writing ${fileName}:`, err);
        throw err;
    }
}