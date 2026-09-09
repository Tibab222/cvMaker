export const FRENCH_PROMPTS = {
  ANALYZING: (rawMandate: string) => `
Vous êtes un expert en recrutement francophone.
Analysez l'offre d'emploi ci-dessous.

INSTRUCTIONS :
1. Vous devez répondre UNIQUEMENT en français.
2. Le format de sortie doit être un JSON valide.
3. Les valeurs dans le JSON doivent être traduites en français.
4. Les compétences extraites ou les mots-clés importants doivent être précis et pertinents pour le poste (ex. : "JavaScript", "Gestion de projet", "Communication efficace").

Format attendu :
{
  "job_title": "Titre du poste en français",
  "skills": ["Compétence 1", "Compétence 2", ...],
  "key_focus": "Courte description de l'objectif principal en français"
}

Offre d'emploi :
${rawMandate}`,

  REWRITE_EXPERIENCE: (context: string, keywords: string[]) => `
Vous êtes un expert en rédaction de CV techniques et en optimisation ATS.
Votre tâche consiste à réécrire la description d'une expérience professionnelle sous forme de puces concises et à fort impact.

RÈGLES STRICTES :
1. ABSOLUMENT AUCUNE LISTE DE MOTS-CLÉS : Ne créez jamais de sections comme "Compétences clés :" et ne listez pas les technologies de manière séquentielle. Intégrez 1 ou 2 mots-clés naturellement dans les phrases uniquement s'ils correspondent à la tâche d'origine.
2. Verbes d'action forts : Chaque puce DOIT commencer par un verbe d'action puissant.
3. Vérité préservée : N'inventez PAS de compétences, de frameworks ou de métriques non présents ou non implicites dans les données d'entrée.
4. Conservez EXACTEMENT la même langue que le texte d'entrée original.
5. Limitez la sortie à 2 à 4 puces maximum.
6. Le texte doit être en français.

DONNÉES D'ENTRÉE :
${context}

MOTS-CLÉS CIBLES (À utiliser UNIQUEMENT si pertinent) :
${keywords.join(', ')}

FORMAT DE RÉPONSE :
Répondez EXCLUSIVEMENT avec un objet JSON valide :
{
  "rewritten_bullets": [
    "Première puce commençant par un verbe d'action fort et intégrant les mots-clés.",
    "Deuxième puce commençant par un verbe d'action fort et intégrant les mots-clés."
  ]
}`,

  REWRITE_PROJECT_PROMPT: (context: string, keywords: string[]) => `
Vous êtes un expert en rédaction de CV professionnels et en optimisation ATS.
Votre tâche consiste à réécrire les puces d'un projet pour maximiser leur impact en utilisant la formule XYZ de Google :
"Accompli [X], mesuré par [Y], en faisant [Z]"

RÈGLES STRICTES :
1. Chaque puce DOIT commencer par un verbe d'action fort (ex. : Conçu, Optimisé, Automatisé, Architecturé).
2. Appliquez la structure XYZ :
   - [X] Ce qui a été accompli (la tâche/fonctionnalité technique)
   - [Y] L'impact ou le résultat (gains de performance, scalabilité, précision des données, efficacité opérationnelle)
   - [Z] Comment cela a été réalisé (l'ingénierie/technologies clés utilisées)
3. ISOLATION ET PERTINENCE STRICTES :
   - Travaillez UNIQUEMENT avec le contexte technique fourni dans l'objet d'entrée.
   - Choisissez UNIQUEMENT 1 ou 2 mots-clés de la liste cible qui s'adaptent NATURELLEMENT à ce projet spécifique.
   - Si un mot-clé cible (ex. : Java, AWS) n'a PAS été utilisé dans ce projet, NE LE FORCEZ PAS.
4. Ne fabriquez PAS de métriques. Si aucun chiffre exact n'est fourni, concentrez-vous sur l'impact technique qualitatif (ex. : "permettant un rendu en temps réel", "réduisant la complexité des requêtes").
5. Conservez EXACTEMENT la même langue que le texte d'entrée original.
6. Renvoyez EXACTEMENT une entrée par "bullet_id" fourni sans mélanger les détails d'autres puces.
7. N'incluez PAS de titres de catégorie, de préfixes ou de deux-points avant le verbe d'action (ex. : n'écrivez PAS "Catégorie : Verbe d'action..."). Commencez IMMÉDIATEMENT par le verbe d'action.

EXEMPLES (FEW-SHOT) :
- Entrée : "Conçu un pipeline de bout en bout pour la collecte d'Open Data."
- Sortie : "Automatisé l'ingestion de volumineux jeux de données de marchés publics en construisant un pipeline ETL TypeScript de bout en bout, garantissant une normalisation fluide des données à travers des registres hétérogènes."

- Entrée : "Développé une interface interactive de visualisation de graphes."
- Sortie : "Accéléré les flux de travail de détection de fraude en développant une interface de visualisation de graphes React/Canvas haute performance cartographiant les relations d'entités complexes en temps réel."

DONNÉES D'ENTRÉE :
${context}

MOTS-CLÉS CIBLES (À utiliser UNIQUEMENT si pertinent pour ce projet) :
${keywords.join(', ')}

FORMAT DE RÉPONSE :
Répondez EXCLUSIVEMENT avec un objet JSON valide correspondant à ce schéma. Pas de formatage markdown, pas de commentaire :
{
  "bullets": [
    {
      "bullet_id": "ID_EXACT_DE_L_ENTREE",
      "rewritten_text": "Verbe d'action + accomplissement technique + impact/valeur..."
    }
  ]
}`,
  GENERATE_TOP_RESUME: (context: string) => `
Tu es un expert en rédaction de CV et en recrutement ATS.
Génère un résumé professionnel ("Summary" / "Profil") percutant à placer en haut du CV pour valoriser le candidat par rapport au poste visé.

DONNÉES DU CV ET DU POSTE :
${context}

CONSIGNES :
1. Rédige entre 3 et 4 puces (bullet points) percutantes (1 phrase par puce).
2. FOCUS STRICT SUR LE POSTE VISÉ (Target Job) :
   - Ignore totalement les expériences secondaires ou non technologiques (ex: restauration, vente, caisse) sauf si elles apportent une compétence directement demandée.
   - Synthétise uniquement les compétences techniques, réalisations et le leadership pertinent.
3. Reste cohérent avec les mots-clés cibles (Target Keywords) transmis.
4. Ne génère PAS de titre, uniquement le tableau sous "summary_bullets".
5. Reponds uniquement avec un objet JSON valide, sans formatage markdown ni commentaires.
FORMAT DE RÉPONSE :
{
  "summary_bullets": [
    "Première puce percutante...",
    "Deuxième puce axée sur les compétences...",
    "Troisième puce orientée valeur ajoutée..."
  ]
}`,
// COVER LETTER PROMPTS
// TODO: translate those prompts to french
  EXPERIENCE_PARAGRAPH: (workExperiences: string, education: string, targetRole: string, companyName: string, targetKeywords: string) => `
You are an expert ATS career coach and professional technical writer.
Write a single, cohesive paragraph for a cover letter highlighting the candidate's professional background and core technical skills relevant to the target job.

CANDIDATE WORK EXPERIENCES:
${workExperiences}

CANDIDATE EDUCATION:
${education}

TARGET JOB: ${targetRole}
TARGET COMPANY: ${companyName}
TARGET KEYWORDS: ${targetKeywords}

LANGUAGE: Write the response strictly in english.

INSTRUCTIONS:
1. Focus ON RELEVANT EXPERIENCE:
   - Highlight core technical achievements, software engineering experience, and key skills aligned with the target role.
   - Synthesize experience without list-like repetition; make it flow as a professional narrative.
2. Maintain a confident, professional, and authentic tone.
3. Keep the paragraph concise (3 to 5 well-structured sentences max).
4. Respond STRICTLY in JSON with no markdown formatting or commentary:
{
  "paragraph": "Your generated paragraph text here..."
}
`,
  PROJECT_FITTING_PARAGRAPH: (projects: string, targetRole: string, companyName: string, targetKeywords: string) => `
You are an expert ATS career coach and professional technical writer.
Write a single, cohesive paragraph for a cover letter connecting the candidate's key personal and open-source projects to the target company and role.

CANDIDATE PROJECTS:
${projects}

TARGET JOB: ${targetRole}
TARGET COMPANY: ${companyName}
TARGET KEYWORDS: ${targetKeywords}

LANGUAGE: Write the response strictly in english.

INSTRUCTIONS:
1. FOCUS ON PROJECTS & IMPACT:
   - Select 1 or 2 relevant projects from the candidate's background.
   - Explain how building these projects demonstrates practical problem-solving and technical expertise directly beneficial to ${companyName}.
2. ALIGN WITH TARGET KEYWORDS:
   - Naturally incorporate relevant target keywords where applicable.
3. Keep the paragraph concise (3 to 5 well-structured sentences max).
4. Respond STRICTLY in JSON with no markdown formatting or commentary:
{
  "paragraph": "Your generated paragraph text here..."
}
`
}