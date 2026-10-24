# 0003 — Versions de l'outillage

- **Date :** 2026-10-24
- **Statut :** acceptée

## Contexte

Au démarrage du projet, TypeScript 7 (compilateur natif) est sorti, mais typescript-eslint 8.72 exige `typescript >=4.8.4 <6.1.0`. Par ailleurs, plusieurs outils récents (tsdown 0.23, lint-staged 17, commitlint 21) n'acceptent plus Node 22.16.

## Décision

- **Node 24 LTS**, épinglé dans `.node-version` (lu par la CI) et exigé par `engines` avec `engine-strict=true`.
- **TypeScript 6.0.x** tant que typescript-eslint ne supporte pas TypeScript 7. Dependabot ignore `typescript >=6.1.0` (voir `.github/dependabot.yml`).
- pnpm épinglé par le champ `packageManager`, dépendances enregistrées en version exacte (`save-exact=true`), installation en CI avec `--frozen-lockfile`.

## Alternatives écartées

- **TypeScript 7 sans lint typé** : on perdrait les règles `strictTypeChecked`, qui détectent des classes entières de bugs.
- **Rester en Node 22.16** avec des versions plus anciennes des outils : dette dès le premier jour.

## Conséquences

- ✅ Lint typé complet et outils à jour.
- ❌ À réviser dès que typescript-eslint supportera TypeScript 7 : retirer l'exclusion Dependabot et mettre à jour ce document.
