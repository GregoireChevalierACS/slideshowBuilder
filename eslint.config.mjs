import js from '@eslint/js';
import comments from '@eslint-community/eslint-plugin-eslint-comments/configs';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Ce que le domaine n'a pas le droit d'importer. dependency-cruiser vérifie le graphe complet
// en CI ; cette règle donne le même retour dès l'écriture, dans l'éditeur.
const IMPORTS_INTERDITS_DANS_LE_DOMAINE = [
  {
    group: ['@slideshow/*', '**/apps/**', '**/application/**'],
    message: 'Le domaine ne dépend de rien : ni de la couche application, ni des apps.',
  },
  {
    group: ['react', 'react-*', 'react/*', 'fastify', 'fastify-*', '@fastify/*', 'zod'],
    message:
      'Pas de framework ni de bibliothèque de validation dans le domaine (ports et adapters).',
  },
  {
    group: ['better-sqlite3', 'node:sqlite', 'kysely', 'drizzle-orm', 'drizzle-orm/*'],
    message: 'La persistance est un adapter, jamais une dépendance du domaine.',
  },
  {
    group: ['node:*', 'fs', 'path', 'os', 'crypto', 'process'],
    message:
      "Le domaine est pur : pas d'accès au système (il doit aussi tourner dans le navigateur).",
  },
];

// Le domaine est déterministe : même entrée, même sortie. Le temps et l'aléatoire passent par
// des ports (Clock, IdGenerator) injectés par la couche application.
const SOURCES_DE_NON_DETERMINISME = [
  {
    selector: "NewExpression[callee.name='Date']",
    message: 'Pas de new Date() dans le domaine : utiliser le port Clock.',
  },
  {
    selector: "MemberExpression[object.name='Date'][property.name='now']",
    message: 'Pas de Date.now() dans le domaine : utiliser le port Clock.',
  },
  {
    selector: "MemberExpression[object.name='Math'][property.name='random']",
    message: 'Pas de Math.random() dans le domaine : le calcul doit être reproductible.',
  },
];

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/coverage/**', '**/reports/**', '**/.stryker-tmp/**'],
  },
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  comments.recommended,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
    rules: {
      // Un cast est un mensonge fait au compilateur : interdit, sauf désactivation explicite
      // et justifiée (voir eslint-comments/require-description).
      '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }],
      '@eslint-community/eslint-comments/require-description': ['error', { ignore: [] }],
      '@eslint-community/eslint-comments/no-unlimited-disable': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      eqeqeq: ['error', 'always'],
    },
  },
  {
    files: ['packages/domain/src/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: IMPORTS_INTERDITS_DANS_LE_DOMAINE }],
      'no-restricted-syntax': ['error', ...SOURCES_DE_NON_DETERMINISME],
    },
  },
  {
    // Fichiers de configuration et scripts en JavaScript : pas de typage à exploiter.
    files: ['**/*.{js,mjs,cjs}'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: {
      globals: globals.node,
    },
  },
);
