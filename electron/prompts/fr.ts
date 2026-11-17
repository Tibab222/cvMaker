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
Tu es un expert en optimisation ATS.
Ta mission est de générer 3 puces (bullet points) de résumé professionnel ("Summary") pour le haut d'un CV, entièrement basées sur le contexte fourni.

DONNÉES DU CV ET DU POSTE :
${context}

DIRECTIVES NARRATIVES PAR PUCE (Rédige des phrases 100% naturelles et variées) :
- Puce 1 (Positionnement & Compétences clés) : Rédige une phrase d'accroche fluide qui associe le profil global du candidat aux technologies clés les plus pertinentes demandées par l'offre.
- Puce 2 (Réalisation & Savoir-faire) : Rédige une phrase narrative qui met en valeur une réalisation technique ou un projet concret du candidat, en expliquant naturellement la solution apportée.
- Puce 3 (Impact & Pratiques) : Rédige une phrase axée sur la valeur ajoutée opérationnelle (automatisation, fiabilité, observabilité, travail d'équipe) et les méthodologies maîtrisées.

EXIGENCES QUALITÉ ET STYLE :
1. SYNTAXE NARRATIVE : Utilise des structures de phrases variées et naturelles avec des liens de causalité (ex: "...en exploitant...", "...afin de garantir...", "...permettant de...").
2. FLUIDITÉ : Ne fais AUCUNE liste brute de mots-clés. Intègre les technologies et les projets au cœur de phrases grammaticales complètes.
3. AUCUN EN-TÊTE : Ne commence jamais une puce par un mot-clé suivi de deux-points (ex: PAS de "Projets :", "Lucidflow :", "Impact :"). Rédige directement le texte de la puce.
4. FORMAT : Renvoie uniquement un objet JSON valide sans balises Markdown ni commentaires.
5. N'invente pas d'experiences ou de competences, integre naturellement les mots cles uniquement si ils sont pertinents pour le contexte fourni.

FORMAT JSON ATTENDU :
{
  "summary_bullets": [
    "<phrase_1_redigee>",
    "<phrase_2_redigee>",
    "<phrase_3_redigee>"
  ]
}`,
// COVER LETTER PROMPTS
// TODO: translate those prompts to french
  EXPERIENCE_PARAGRAPH: (workExperiences: string, education: string, targetRole: string, companyName: string, targetKeywords: string) => `
Tu es un Senior Tech Recruiter et un expert en rédaction de candidatures techniques (ATS-friendly).
Rédige un unique paragraphe narratif et percutant (style lettre de motivation ou accroche d'expérience phare) valorisant le parcours du candidat pour le poste visé.

DONNÉES DU CANDIDAT ET DU POSTE :
- Expériences : ${workExperiences}
- Formation : ${education}
- Poste visé : ${targetRole}
- Entreprise cible : ${companyName}
- Mots-clés cibles (ATS) : ${targetKeywords}

STRUCTURE STRICTE DU PARAGRAPHE (3 à 4 phrases) :
- Phrase 1 (Ancrage & Stack) : Présente l'expérience/parcours clé en intégrant directement le titre du poste (${targetRole}) et les technologies cibles principales.
- Phrase 2 (Réalisation & Défi technique) : Illustre une réalisation concrète, une architecture ou un projet complexe résolu en utilisant les mots-clés transmis.
- Phrase 3 (Impact & Résultats) : Met en valeur l'impact mesurable (performance, fiabilité, automatisation, valeur métier) de cette réalisation.
- Phrase 4 (Alignement Entreprise - Optionnel) : Lie cette expertise aux objectifs ou à la mission de ${companyName}.

CONSIGNES STRICTES DE RÉDACTION :
1. Langue : Rédige le paragraphe STRICTEMENT EN ANGLAIS.
2. Style : Direct, confiant et technique. Évite le remplissage ("passionate", "hard-working", "seasoned professional").
3. Filtrage : Ignore totalement les expériences non pertinentes ou secondaires.
4. Format : Réponds uniquement avec un objet JSON valide, sans balises Markdown ni texte explicatif.

FORMAT JSON ATTENDU :
{
  "paragraph": "Your generated paragraph text here..."
}
`,
  PROJECT_FITTING_PARAGRAPH: (projects: string, targetRole: string, companyName: string, targetKeywords: string) => `
Tu es un recruteur Senior et un expert en rédaction de candidatures techniques (ATS-friendly).
Rédige un unique paragraphe narratif et percutant (style lettre de motivation ou accroche d'expérience phare) connectant les projets clés du candidat à l'entreprise et au poste visé.

PROJET DU CANDIDAT ET DU POSTE :
${projects}

JOB CIBLE: ${targetRole}
ENTREPRISE CIBLE: ${companyName}
MOTS-CLÉS CIBLES: ${targetKeywords}

LANGUAGE: Ecris la réponse STRICTEMENT en français.

INSTRUCTIONS:
1. FOCUS SUR LES PROJETS & L'IMPACT :
   - Sélectionne 1 ou 2 projets pertinents du parcours du candidat.
   - Explique comment la réalisation de ces projets démontre une résolution pratique de problèmes et une expertise technique directement bénéfique à ${companyName}.
2. ALIGNEMENT SUR LES MOTS-CLÉS :
   - Intègre naturellement les mots-clés cibles lorsque cela est pertinent.
3. Rédige le paragraphe de manière concise (3 à 5 phrases bien structurées maximum).
4. Respects STRICTEMENT le format JSON attendu, sans balises Markdown ni commentaires.
FORMAT JSON ATTENDU :
{
  "paragraph": "Ton paragraphe généré ici..."
}
`, REFINE_KEYWORDS: (candidates: string[]) => `
  Voici une liste de mots-cles extraits d'une offre d'emploi : 
  
  ${JSON.stringify(candidates)}

  Retire les termes qui sont trop génériques ou irrélevant pour un CV, fusionne les synonymes proches ou les duplicatas,
  et retourne UNIQUEMENT un tableau JSON de chaînes de caractères, sans texte environnant et sans formatage Markdown.

  JSON OUTPUT FORMAT:
  {
    "keywords": ["mot-cle1", "mot-cle2", "mot-cle3", ...]
  }
`
}