// Règles d'architecture vérifiées en CI sur le graphe complet des dépendances.
// ESLint (no-restricted-imports) ne voit qu'un fichier à la fois ; ici, on voit les cycles et les
// dépendances transitives.

/** @type {import('dependency-cruiser').IConfiguration} */
export default {
  forbidden: [
    {
      name: 'domaine-pur',
      comment:
        'Le domaine ne dépend que de lui-même : ni paquet npm, ni module Node, ni autre paquet du dépôt.',
      severity: 'error',
      // Les tests, eux, ont droit à leurs outils (vitest, fast-check).
      from: { path: '^packages/domain/src', pathNot: '\\.test\\.tsx?$|/testing/' },
      to: {
        pathNot: '^packages/domain/src',
      },
    },
    {
      name: 'application-sans-infrastructure',
      comment:
        "La couche application ne connaît que le domaine. Les adapters (serveur, base, UI) dépendent d'elle, pas l'inverse.",
      severity: 'error',
      from: { path: '^packages/application/src', pathNot: '\\.test\\.tsx?$|/testing/' },
      to: {
        // zod décrit le contrat d'échange (format de saisie, réponses de l'API) : seule bibliothèque
        // autorisée ici, choisie explicitement (ADR 0009).
        pathNot: ['^packages/application/src', '^packages/domain/src', 'node_modules/zod/'],
      },
    },
    {
      name: 'api-publique-seulement',
      comment:
        "Un paquet n'importe un autre paquet du dépôt que par ses points d'entrée (index.ts, et testing/index.ts réservé aux tests), jamais par ses fichiers internes.",
      severity: 'error',
      from: { path: '^(packages|apps)/([^/]+)/' },
      to: {
        path: '^packages/([^/]+)/src/(?!(testing/)?index\\.ts$)',
        pathNot: '^packages/$2/',
      },
    },
    {
      name: 'base-de-donnees-confinee',
      comment: 'Seul le dossier database du serveur accède à SQLite.',
      severity: 'error',
      from: { pathNot: '^apps/server/src/database/' },
      to: {
        // Un module natif de Node apparaît sans son préfixe « node: » dans le graphe.
        path: 'node_modules/(better-sqlite3|kysely)/|^(node:)?sqlite$',
        dependencyTypesNot: ['type-only'],
      },
    },
    {
      name: 'interface-sans-serveur',
      comment:
        "L'interface tourne dans le navigateur : elle parle au serveur par HTTP, jamais par import, et n'utilise aucun module Node.",
      severity: 'error',
      from: { path: '^apps/web/src', pathNot: '\\.test\\.tsx?$|/testing/' },
      to: { path: '^apps/server/|^node:|^(fs|path|os|crypto|child_process|sqlite)$' },
    },
    {
      name: 'pas-de-cycle',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'production-independante-des-tests',
      comment: 'Le code livré ne doit jamais importer un fichier de test ou une fixture.',
      severity: 'error',
      from: { pathNot: '\\.test\\.tsx?$|/testing/' },
      to: { path: '\\.test\\.tsx?$|/testing/' },
    },
    {
      name: 'production-sans-dependance-de-dev',
      severity: 'error',
      from: { path: '^(packages|apps)/[^/]+/src', pathNot: '\\.test\\.tsx?$|/testing/' },
      to: { dependencyTypes: ['npm-dev'], dependencyTypesNot: ['type-only'] },
    },
    {
      name: 'pas-de-fourre-tout',
      comment:
        'Pas de fichier utils, helpers ou common : un nom vague cache une responsabilité mal définie.',
      severity: 'error',
      from: {},
      to: { path: '/(utils?|helpers?|common|misc)(\\.ts|/)' },
    },
    {
      name: 'pas-d-orphelin',
      comment: "Un module que personne n'importe est du code mort.",
      severity: 'warn',
      from: {
        orphan: true,
        pathNot: ['\\.test\\.tsx?$', '\\.config\\.(ts|mjs)$', '/index\\.ts$', '\\.d\\.ts$'],
      },
      to: {},
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '(^|/)(dist|coverage|reports|\\.stryker-tmp)/' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.base.json' },
    enhancedResolveOptions: {
      // Mêmes conditions que les tests : un paquet du dépôt se résout vers ses sources.
      conditionNames: ['source', 'import', 'types', 'default'],
      exportsFields: ['exports'],
    },
  },
};
