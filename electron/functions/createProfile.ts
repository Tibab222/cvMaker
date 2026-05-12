import { profilesDir } from "../main.dev";
import path from "path";
import * as fs from "fs";
import { Language } from "../../shared/profile.interface";

export function createProfile(firstname: string, lastname: string, language: Language): { success: boolean; error?: string } {
    const profileName = `${firstname}_${lastname}_${language}`;
    const profilePath = path.join(profilesDir, profileName);

  try {
    if (!fs.existsSync(profilesDir)) {
      fs.mkdirSync(profilesDir);
    }

    if (!fs.existsSync(profilePath)) {
      fs.mkdirSync(profilePath);
      
      const starterFiles = ['exp.json', 'edu.json', 'projects.json', 'skills.json', 'infos.json', 'header_resume.json'];
      starterFiles.forEach(file => {
        fs.writeFileSync(path.join(profilePath, file), JSON.stringify([], null, 2));
      });

      const infosPath = path.join(profilePath, 'infos.json');
      const infosData = {
        firstName: firstname,
        lastName: lastname,
        language: language
      };
      fs.writeFileSync(infosPath, JSON.stringify(infosData, null, 2));
      
      return { success: true };
    }
    return { success: false, error: 'Profil déjà existant' };
  } catch (error: Error | unknown) {
    return { success: false, error: (error as Error).message };
  }
}