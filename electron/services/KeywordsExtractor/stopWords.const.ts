export const EN_STOP_WORDS = {
    structural: [
        'the', 'and', 'is', 'in', 'at', 'of', 'a', 'to', 'for', 'with', 'on', 'by', 'as', 'an', 'from', 'about', 'into', 'this', 'these', 'that', 'those', 'which', 'who', 'whom', 'whose', 'where', 'when', 'why', 'how', 'what', 'if', 'or', 'but', 'not', 'no', 'yes',
        'all', 'any', 'some', 'each', 'every', 'other', 'another', 'such', 'more', 'most', 'many', 'few', 'several', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
        'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth',
        "always", "often", "rarely", "regularly", "occasionally", "solid", "very", "good", "great", "excellent", "strong", "strongly", "highly"
    ],
    jobContext: [
        'experience', 'experiences', 'years', 'year', 'team', 'teams', 'profile', 'profiles', 'candidate', 'candidates',
        'mission', 'missions', 'project', 'projects', 'knowledge', 'skills', 'skill', 'required', 'optional', 'travel', 'valid', 'license',
        'office', 'remote', 'relocation', 'domain', 'domains', 'main', 'responsibilities', 'responsibility', 'needs', 'need',
        'sense', 'good', 'organization', 'organizations', 'ideas', 'idea', 'new',
        'willingness', 'ability', 'abilities', 'coupled', 'role', 'roles',
        'product', 'products', 'skilled', 'skillset', 'versatile', 'solid',
        'grasp', 'familiarity', 'various', 'extensive', 'hands', 'production',  'salary', 'qualifications',
        'internship', 'recruitment', 'systems', 'processes', 'procedures', 'benefits', 'solutions', 'solution',
        'account', 'client', 'sector', 'volume', 'scope', 'total', 'incidents',
        'challenges', 'challenge', 'innovation', 'excellence', 'engineering', 'development', 'tools', 'engineers', 'position'
    ],
    verbs: [
        'have', 'will have', 'make', 'know', 'participate', 'value', 'search', 'require', 'design',
        'ensure', 'develop', 'code', 'create', 'put', 'offer', 'work', 'working', 'function', 'advance',
        'help', 'helping', 'support', 'supporting', 'manage', 'managing', 'lead', 'leading',
        'communicate', 'communicating', 'collaborate', 'collaborating', 'provide', 'providing',
        'assist', 'assisting', 'build', 'building', 'deliver', 'delivering', 'maintain', 'maintaining',
        'understanding', 'understanding', 'use', 'using', 'base', 'based', 'apply', 'applying', 'contribute', 'contributing',
        'determined', 
        'drive', 'driving', 'using', 'based', 'apply', 'applying', 'contribute', 'contributing', 'learn', 'learning', 'analyze', 'analyzing', 'recommend', 'recommending', 'diagnose', 'diagnosing',
    ],
    fillers: [
        'you', 'we', 'your', 'our', 'their', 'all', 'every', 'several', 'as much as', 'sometimes',
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
        'experience', 'experiences', 'annees', 'annee', 'equipe', 'equipes', 'team', 'profil', 'profils', 'profile', 'candidate', 'candidat', 'candidats',
        'mission', 'missions', 'projet', 'projets', 'connaissance', 'connaissances', 'skills', 'competences', 'competence', 'atout', 'atouts', 'requis',
        'optionnels', 'deplacements', 'valide', 'permis', 'bureau', 'bureaux', 'distance', 'realite', 'occasion',
        'domaines', 'domaine', 'principales', 'responsabilites', 'responsabilite', 'besoins', 'sens', 'bon', 'organisation', 'organisations', 'idees', 'idee', 'nouvelles',
        'talent', 'talents', 'processus', 'recherche', 'evaluation', 'test', 'tests',
        'reussissez', 'besoin', 'exigences', 'critere', 'criteres', 'actuellement', 'relations',
        'prenantes', 'operations', 'quotidienne', 'compagnie', 'ligne', 'formulaire', 'haut', 'page',
        'cours', 'duree', 'semaines', 'semaine', 'instructeur', 'magistral', 'travail', 'groupe',
        'realisations', 'soutien', 'webinaires', 'sessions', 'academie', 'carrieres', 'employeurs',
        'plan', 'clients', 'clauses', 'contrats', 'champs', 'principes', 'concepts', 'carriere', 'formation', 'comprehension',
        'niveau', 'entreprise', 'entreprises', 'pme', 'correctifs', 'correctif', 'actions', 'action',
        'pratiques', 'pratique', 'collaboration', 'collaboratif',
        'procedural', 'procedures', 'procedure', 'avantages', 'pae', 'solutions', 'solution',
        'propos', 'compte', 'client', 'secteur', 'financier', 'volume', 'envergure',
        'defis', 'defi', 'innovation', 'excellence',
        // added: mirrors the EN additions above
        'volonte', 'capacite', 'capacites', 'role', 'roles', 'produit', 'produits',
        'competent', 'polyvalent', 'solide', 'connaissance', 'familiarite',
        'divers', 'diverses', 'etendue', 'etendu'
    ],
    verbs: [
        'avoir', 'auras', 'faire', 'connaître', 'participeras', 'valorisons', 'recherchons', 'demande', 'concoit',
        'assure', 'developper', 'coder', 'creer', 'mettre', 'offrir', 'travailler', 'fonctionne', 'avance', 'sommes', 'serez', 'devrez', 'pouvez', 'devez',
        'creerez', 'assurerez', 'testeront', 'ameliorerons', 'acquerir', 'inscrivez', 'remplissez', 'completez',
        'recevez', 'agisse', 'accedez', 'avez', 'travailler', 'aurez', 'allons', 'travaillerez', 'soit', 'jumelons', 'fiers',
        'conditions', 'resultats', 'marches', 'leader', 'diversite', 'developperez',
        'analyser', 'recommander', 'diagnostiquer', 'proposer', 'contribuer', 'participer',
        'collaborer', 'documenter', 'appliquer', 'soutenir', 'relever', 'collaborons', 'joindre',
        // added: mirrors the EN additions above
        'aider', 'aidant', 'gerer', 'gerant', 'diriger', 'dirigeant', 'communiquer', 'communiquant',
        'fournir', 'fournissant', 'assister', 'assistant', 'construire', 'construisant', 'livrer', 'livrant',
        'maintenir', 'maintenant', 'utiliser', 'utilisant', 'base', 'basee', 'appliquer', 'appliquant'
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
};

export const TECH_WHITELIST = new Set([
    'c', 'c#', 'r', 'go', 'js', 'ts', 'qt', 'db', 'io', 'ui', 'ux', 
    'api', 'sql', 'nosql', 'html', 'css', 'json', 'xml', 'yaml', 'bash', 
    'cli', 'sdk', 'ide', 'oop', 'mvc', 'rest', 'soap', 'aws', 'gcp', 'azure', 
    'ci', 'cd', 'devops', 'k8s', 'docker', 'vm', 'vpc', 'vpn', 'cdn', 'dns', 
    'tcp', 'udp', 'ip', 'http', 'https', 'ftp', 'ssh', 'tls', 'ssl', 'jwt', 'oauth', 
    'kubernetes', 'microservices', 'serverless', 'graphql', 'websocket', 'react', 'angular', 'vue',
    'node', 'express', 'django', 'flask', 'spring', 'laravel', 'symfony', 'rails', 
    'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch', 'rabbitmq', 
    'tensorflow', 'pytorch', 'scikit-learn', 'keras', 'opencv', 'rust', 'dart', 'flutter', 'react-native', 'xamarin', 'unity', 'unreal',
    'ci/cd', 'node.js'
]);