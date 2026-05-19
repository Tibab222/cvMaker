export const EN_STOP_WORDS = {
    structural: [
        'the', 'and', 'is', 'in', 'at', 'of', 'a', 'to', 'for', 'with', 'on', 'by', 'as', 'an', 'from', 'about', 'into'
    ],
    jobContext: [
        'experience', 'years', 'team', 'profile', 'candidate',
        'mission', 'project', 'knowledge', 'skills', 'required', 'optional', 'travel', 'valid', 'license',
        'office', 'remote', 'relocation', 'domain', 'main', 'responsibilities', 'needs', 'sense', 'good', 'organization', 'ideas', 'new'
    ],
    verbs: [
        'have', 'will have', 'make', 'know', 'participate', 'value', 'search', 'require', 'design',
        'ensure', 'develop', 'code', 'create', 'put', 'offer', 'work', 'function', 'advance'
    ],
    fillers: [
        'you', 'we', 'you', 'your', 'our', 'their', 'all', 'every', 'several', 'as much as', 'sometimes',
    ]
};

export const FR_STOP_WORDS = {
    structural: [
        'le', 'la', 'les', 'des', 'un', 'une', 'en', 'pour', 'dans', 'par', 'sur', 'avec', 'Avec', 'qui', 'que', 'aux', 'dans', 'chez',
        'ce', 'dont', 'ou', 'pas', 'qu', 'il', 'elle', 'lesquelles', 'auxquelles', 'tant', 'tellement', 'plus', 'moins', 'très', 'solide', 'et', 'toujours', 'souvent', 'rarement', 'régulièrement', 'occasionnellement',
        'a', 'ca', 'par', 'sur', 'pour', 'ceci', 'cela', 'celle', 'celui', 'ceux', 'celles', 'leur', 'leurs', 'lui', 'moi', 'toi', 'soi', 'mien', 'tien', 'sien', 'notre', 'votre', 'leur', 'on', 
        'tout', 'tous', 'toute', 'toutes', 'aucuns', 'aucune', 'certains', 'certaine', 'certains', 'certaines', 
        'alors', 'au', 'aux', 'aucun', 'aussi', 'autre', 'avant', 'avec', 'avoir', 'bon', 'car', 'ce', 'ceci', 'cela', 'ces', 'ceux', 'chaque', 'comme', 'comment', 'dans', 'des', 'du', 'dedans', 'dehors', 'depuis', 'deux', 'devers', 'devant', 'doit', 
        'doivent', 'donc', 'dos', 'début', 'elle', 'elles', 'en', 'encore', 'essai', 'est', 'et', 'de', 'eu', 'fait', 'faites', 'fois', 'font', 'hors', 'ici', 'il', 'ils', 'je', 'juste', 'la', 'le', 'les', 'leur', 'leurs', 'lorgne', 'lui', 'ma', 'maint', 'mais', 
        'mes', 'mien', 'moins', 'mon', 'mot', 'même', 'ni', 'nommés', 'notre', 'nous', 'nouveaux', 'ou', 'où', 'par', 'parce', 'parole', 'pas', 'personnes', 'peu', 'peut', 'peuvent', 'pièce', 'plupart', 'plus', 'plusieurs', 'pour', 'pourquoi', 'proche', 
        'près', 'puisque', 'qu', 'quand', 'que', 'quel', 'quelle', 'quelles', 'quels', 'qui', 'qui', 'quoi', 'sans', 'sa', 'se', 'selon', 'ses', 'si', 'sien', 'sitôt', 'soit', 'son', 'sont', 'sous', 'soyez', 'sujet', 'sur', 'ta', 'tandis', 'tant', 'te', 'tel', 'telle', 
        'telles', 'tels','tes', 'tien', 'toujours', 'toi', 'ton', 'tous', 'tout', 'toute', 'toutes', 'trop', 'très', 'tu', 'un', 'une', 'valeur', 'voie', 'voient', 'vont', 'votre', 'vous', 'vu', 'ça', 'étaient', 'état', 'étiez', 'étions', 'élans', 'eneffet', 'assez', 'etc'
    ],
    jobContext: [
        'experience', 'annees', 'equipe', 'team', 'profil', 'profile', 'candidate', 'candidat',
        'mission', 'projet', 'connaissance', 'skills', 'competences', 'atout', 'requis',
        'optionnels', 'deplacements', 'valide', 'permis', 'bureau', 'bureaux', 'distance', 'realite', 'occasion',
        'domaines', 'principales', 'responsabilites', 'besoins', 'sens', 'bon', 'organisation', 'idees', 'nouvelles',
        'missions', 'projets', 'talent', 'talents', 'processus', 'recherche', 'evaluation', 'test', 'tests', 
        'reussissez', 'besoin', 'exigences', 'critere', 'criteres', 'recherche', 'actuellement', 'relations', 
        'prenantes', 'operations', 'quotidienne', 'compagnie', 'ligne', 'formulaire', 'haut', 'page', 
        'cours', 'duree', 'semaines', 'semaine', 'instructeur', 'magistral', 'travail', 'groupe', 
        'realisations', 'soutien', 'webinaires', 'sessions', 'academie', 'carrieres', 'employeurs', 
        'plan', 'clients', 'clauses', 'contrats', 'champs', 'principes', 'concepts', 'carriere', 'formation', 'comprehension',
        'niveau', 'entreprise', 'entreprises', 'pme', 'correctifs', 'correctif', 'connaissances', 'connaissance', 'actions', 'action', 
        'equipes', 'equipe', 'pratiques', 'pratique', 'collaboration', 'collaboratif',
        'procedural', 'procedures', 'procedure', 'avantages', 'plan', 'pae', 'solutions', 'solution',
        'propos', 'compte', 'client', 'secteur', 'financier', 'volume', 'envergure',
        'organisations', 'organisation', 'defis', 'defi', 'innovation', 'excellence', 'actions'
    ],
    verbs: [
        'avoir', 'auras', 'faire', 'connaître', 'participeras', 'valorisons', 'recherchons', 'demande', 'concoit',
        'assure', 'developper', 'coder', 'creer', 'mettre', 'offrir', 'travailler', 'fonctionne', 'avance', 'sommes', 'serez', 'devrez', 'pouvez', 'devez',
        'creerez', 'assurerez', 'testeront', 'ameliorerons', 'acquerir', 'inscrivez', 'remplissez', 'completez', 
        'recevez', 'agisse', 'accedez', 'avez', 'travailler', 'aurez', 'allons', 'travaillerez', 'soit', 'jumelons', 'fiers',
        'conditions', 'resultats', 'marches', 'leader', 'diversite', 'developperez', 
        'analyser', 'recommander', 'diagnostiquer', 'proposer', 'contribuer', 'participer',
        'collaborer', 'documenter', 'appliquer', 'soutenir', 'relever', 'collaborons', 'joindre'
    ],
    fillers: [
        'tu', 'nous', 'vous', 'votre', 'notre', 'leurs', 'tous', 'toutes', 'chaque', 'plusieurs', 'autant', 'parfois',
        'si', 'nos', 'vos', 'mes', 'tes', 'ses', 'avant', 'durant', 'apres', 'jamais', 'rien', 'quelque', 
        'plus', 'moins', 'tres', 'solide', 'toujours', 'souvent', 'rarement', 'regulierement', 'occasionnellement', 'premier', 'deuxieme', 'troisieme', 'quatrieme', 'cinquieme', 'sixieme', 'septieme', 'huitieme', 'neuvieme', 'dixieme',
        'premierement', 'deuxiemement', 'troisiemement', 'quatriemement', 'cinquiemement', 'sixiement', 'septiemement', 'huitiemement', 'neuviemement', 'dixiement',
        'mois', 'jour', 'jours', 'heures', 'heure', 'minutes', 'minute', 'secondes', 'seconde', 'ans', 'an', 'meilleures', 'meilleurs', 'ensemble',
        'plein', 'temps', 'marche', 'superieur', 'comment', 'travers', 'monde', 'cadre', 'suite', 'interne', 'externe',
        'experts', 'innovantes', 'performantes', 'majeures', 'bonnes', 'maitrise', 'remboursement', 'clientes',
        'utilisee', 'amene', 'appropriees', 'passionnee', 'conjointement'
    ]
}

export const TECH_WHITELIST = new Set(['c', 'c#', 'r', 'go', 'js', 'ts', 'qt', 'db', 'io']);