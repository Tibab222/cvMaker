export const FRENCH_PROMPTS = {
    ANALYZING: (rawMandate: string) => `
Tu es un expert en recrutement francophone.
Analyses l'offre d'emploi ci-dessous.

CONSIGNE STRICTE : 
1. Tu dois répondre UNIQUEMENT en français.
2. Le format de sortie doit être un JSON valide.
3. Les valeurs du JSON doivent être traduites en français (ex: "Software Engineer" devient "Ingénieur Logiciel").
4. Les skills extraits doivent être des compétences spécifiques et pertinentes pour le poste (ex: "JavaScript", "Gestion de projet", "Communication efficace").

Format attendu :
{
  "job_title": "Titre du poste en français",
  "skills": ["Compétence 1", "Compétence 2", ...],
  "key_focus": "Description courte du focus principal en français"
}

Offre d'emploi :
${rawMandate}`,

  REWRITE_EXPERIENCE: (context: string, keywords: string[]) => `
Tu es un expert en rédaction de CV professionnels et en optimisation ATS.
Ta tâche est de réécrire la descriptions d'expérience l'aligner avec l'offre d'emploi.

RÈGLES STRICTES :
1. Conserve la vérité historique des faits (ne fais pas d'inventions absurde).
2. Rends le texte percutant, professionnel et orienté résultats.
3. Intègre naturellement les mots-clés cibles fournis si possible.
4. Réponds EXCLUSIVEMENT sous la forme d'un objet JSON valide au format exact ci-dessous. Aucun texte avant ou après.
5. Conserve la même langue que le texte d'origine.

DONNÉES À RÉÉCRIRE :
${context}

MOTS-CLÉS CIBLES :
${keywords.join(', ')}

FORMAT JSON ATTENDU :
{
  "rewritten_description": "string"
}`,

  REWRITE_PROJECT_PROMPT: (context: string, keywords: string[]) => `
Tu es un expert en rédaction de CV professionnels et en optimisation ATS.
Ta tâche est de réécrire les puces (bullet points) d'un projet pour maximiser leur impact.

RÈGLES DE RÉDACTION :
1. Chaque puce réécrite DOIT commencer par un **verbe d'action fort** (ex: *Développé*, *Conçu*, *Optimisé*, *Architecturé*).
2. Mets en avant l'impact technique, les technologies utilisées et l'objectif du projet.
3. Intègre les mots-clés cibles de manière fluide.
4. Ne réinvente pas le projet : conserve les faits réels fournis.
5. Conserve la même langue que le texte d'origine.
6. Préserve rigoureusement chaque "bullet_id" fourni en entrée.

DONNÉES EN ENTRÉE :
${context}

MOTS-CLÉS CIBLES :
${keywords.join(', ')}

FORMAT DE RÉPONSE EXIGÉ :
Tu dois répondre EXCLUSIVEMENT sous la forme d'un objet JSON valide. Pas de texte explicatif, pas de balises Markdown d'introduction.

Exemple de structure attendue :
{
  "bullets": [
    {
      "bullet_id": "ID_BULLET_RECU",
      "rewritten_text": "Verbe d'action + réalisation technique intégrant les mots-clés..."
    }
  ]
}`
}