import { profilesDir } from "../main.dev";
import path from "path";
import * as fs from "fs";

export function createProfile(firstname: string, lastname: string) {
    const profileName = `${firstname}_${lastname}`;
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
      };
      fs.writeFileSync(infosPath, JSON.stringify(infosData, null, 2));
      
      return { success: true };
    }
    return { success: false, error: 'Profil déjà existant' };
  } catch (error: Error | unknown) {
    return { success: false, error: (error as Error).message };
  }
}