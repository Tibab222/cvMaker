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
}`
};