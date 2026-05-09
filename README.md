Phase 1 : Infrastructure & Communication (Le "Pipe")

Avant de faire de l'UI, il faut que ton React puisse parler au système de fichiers via Electron.

    Configuration du Main Process (Electron) :

        Créer les fonctions handle dans main.js pour :

            Vérifier si le dossier du profil existe dans app.getPath('userData').

            Lire un fichier JSON.

            Écrire/Mettre à jour un fichier JSON.

    Configuration du Preload :

        Exposer une API sécurisée (contextBridge) pour que React puisse appeler ces fonctions (ex: window.api.saveProfile(data)).

Phase 2 : Gestion du Profil (Le point d'entrée)

L'objectif est d'arriver sur une page qui demande "Qui êtes-vous ?" ou "Créer un profil".

    Interface "Nouveau Profil" :

        Formulaire simple (shadcn/ui Input & Button) : Nom, Prénom, Langue (FR/EN).

    Logique de Création :

        Au clic, Electron crée un dossier nommé selon le profil dans %appdata%.

        Initialisation des fichiers vides : experiences.json, education.json, skills.json, projects.json (juste des tableaux vides []).

    Sélecteur de Profil :

        Une page d'accueil qui liste les dossiers trouvés dans %appdata% pour charger un profil existant.

Phase 3 : Éditeur de Blocs (Le "Data Entry")

C'est ici que tu remplis ta base de données personnelle.

    Module Expériences :

        Interface pour ajouter une expérience : Poste, Entreprise, Dates.

        Gestion des Sous-blocs : Un champ pour ajouter des "bullet points" individuelles.

        Système de Tags : Un champ de saisie de mots-clés pour chaque expérience (ex: "C++", "Project Management", "Embedded").

    Modules Éducation / Projets / Skills :

        Même logique : des formulaires pour alimenter les fichiers JSON correspondants.

        Astuce : Utilise une Card shadcn pour chaque élément avec un bouton "Modifier" et "Supprimer".

Phase 4 : Analyseur de Mots-Clés (La "Intelligence")

On prépare le terrain pour l'automatisation.

    Interface d'Analyse :

        Créer une vue avec un large Textarea pour coller l'annonce (JD - Job Description).

    Algorithme d'Extraction :

        Script simple qui nettoie le texte (minuscules, retrait des mots de liaison).

        Comptage de l'occurrence des mots.

    Système de Matching :

        Comparer les mots de l'annonce avec les Tags stockés dans tes JSON.

        Afficher un score de pertinence par bloc (ex: "Cette expérience matche 4 mots-clés de l'annonce").

Phase 5 : Le Builder de CV (L'Assemblage)

L'interface finale où tu composes ton document.

    Le Dashboard de Sélection :

        À gauche : Colonne avec tous tes blocs (Expériences, Projets...) munis de Checkbox.

        Au centre : L'aperçu du CV qui se met à jour dynamiquement quand tu coches/décoches un bloc ou une phrase.

    Filtre Manuel vs Auto :

        Bouton "Suggérer" qui coche automatiquement les blocs ayant les meilleurs tags par rapport à l'analyse de la Phase 4.

Résumé de l'ordre de priorité immédiat :

    Setup Electron IPC (Lire/Écrire dans %appdata%).

    UI Création de Profil (Création des dossiers et fichiers JSON).

    Formulaire Expériences (Le plus gros morceau de donnée).

-----------------------------------------------------------------

Étape 1 : Le passage à SQLite & Vectorisation

Le JSON est limité pour la recherche. SQLite te permettra de stocker les Embeddings (les vecteurs) à côté de tes textes.

    Action : Installe better-sqlite3 et transformers.js (pour les embeddings locaux).

    Migration : Importe tes JSON dans une table master_data.

    Vectorisation : Pour chaque expérience/projet, génère son vecteur une seule fois avec le modèle all-MiniLM-L6-v2 et stocke-le dans une colonne embedding (type BLOB).

    --> ce qu'on a fait pour ça:
    services:
    - Database.ts: chargé de la connexion avec la bdd local pour stocker les vecteurs (lien avec SQLite)
    - transformer.js: moteur d'embedding (embedding avec Xenova/all-MiniLM-L6-v2)
    - Similarity: logique de calcul (fichier utils/math)
    - VectorService: Orchestrateur des 3 avant
    Constat: le bouton sync est super rapide: il supprime la bdd, lit les json, et re-remplit la bdd. En production sur des millions d'infos, je pense que c catastrophique, mais là, l'appli est destinée à usage perso, ce qui rend le systeme tres rapide pour traiter peu d'informations.

Étape 2 : Le module d'Analyse de Mandat (Input)

Il te faut une porte d'entrée pour l'offre d'emploi.

    UI : Ajoute une zone de texte ou un upload PDF "Analyse du Mandat".

    Traitement :

        Extraire le texte du mandat.

        Utiliser Mistral pour en sortir un JSON simple : { "job_title": "...", "skills": ["...", "..."], "key_focus": "..." }.

        Générer le vecteur (embedding) du texte complet du mandat.

Étape 3 : Le Ranking Sémantique (L'IA de sélection)

C'est ici que tu automatises le "clic" sur les blocs.

    Calcul : Compare le vecteur du mandat avec tous les vecteurs de ta table master_data (Maths : Cosine Similarity).

    Output : Tu obtiens une liste triée par pertinence.

    Auto-sélection : Ton système coche automatiquement dans ton Provider les IDs des 3 projets et 4 expériences qui ont le score le plus haut.

Étape 4 : La couche de "Draft" & Réécriture (Mistral)

C'est la partie la plus délicate : tu ne veux pas écraser tes textes originaux.

    Structure : Dans ton Provider, crée un état draftContent. Si un ID existe dans draftContent, ton template affiche la version IA, sinon il affiche la version du JSON master.

    Le Loop : Pour chaque bloc sélectionné, lance une requête à Mistral :

        "En te basant sur ce mandat [MANDAT], adapte ce point de mon CV pour le rendre plus percutant : [BULLET_ORIGINAL]".

    Stockage : Sauvegarde le résultat dans draftContent[id].

Étape 5 : L'Interface de Validation (Human-in-the-loop)

En tant qu'ingénieur, tu sais qu'on ne fait jamais confiance à 100% à une IA.

    UI : Dans ta sidebar, affiche les blocs réécrits avec une petite icône "IA ✨".

    Action : Permets à l'utilisateur de :

        Accepter la réécriture.

        Demander une nouvelle variante.

        Revenir au texte original (Master).