export const FRENCH_PROMPTS = {
    ANALYZING: (rawMandate: string) => `
Tu es un expert en recrutement francophone.
Analyses l'offre d'emploi ci-dessous.

CONSIGNE STRICTE : 
1. Tu dois répondre UNIQUEMENT en français.
2. Le format de sortie doit être un JSON valide.
3. Les valeurs du JSON doivent être traduites en français (ex: "Software Engineer" devient "Ingénieur Logiciel").

Format attendu :
{
  "job_title": "Titre du poste en français",
  "skills": ["Compétence 1", "Compétence 2"],
  "key_focus": "Description courte du focus principal en français"
}

Offre d'emploi :
${rawMandate}`
}