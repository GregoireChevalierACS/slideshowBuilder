# 0003 — Versions de l'outillage

- **Date :** 2026-10-24
- **Statut :** acceptée

## Contexte

Au démarrage du projet, TypeScript 7 (compilateur natif) est sorti, mais typescript-eslint 8.72 exige `typescript >=4.8.4 <6.1.0`. Par ailleurs, plusieurs outils récents (tsdown 0.23, lint-staged 17, commitlint 21) n'acceptent plus Node 22.16.

## Décision

- **Node 24 LTS**, épinglé dans `.node-version` (lu par la CI) et exigé par `engines` avec `engine-strict=true`.
- **TypeScript 6.0.x** tant que typescript-eslint ne supporte pas TypeScript 7. Dependabot ignore `typescript >=6.1.0` (voir `.github/dependabot.yml`).
- pnpm épinglé par le champ `packageManager`, dépendances enregistrées en version exacte (`save-exact=true`), installation en CI avec `--frozen-lockfile`.

## Révision du 2026-10-24 : quarantaine des versions et Vitest 4

- **Quarantaine de 3 jours** (`minimumReleaseAge: 4320` dans `pnpm-workspace.yaml`) : une version publiée depuis moins de 3 jours n'est pas installée. La plupart des paquets compromis sont détectés et retirés dans ce délai.
- **Vitest redescend de 5.0.5 à 4.1.12.** Stryker 10.0.0 ne supporte pas Vitest 5 : les mutants ne sont jamais activés et **survivent tous en silence** (score de 0 % alors que les tests sont corrects). Le support de Vitest 5 arrive dans Stryker 10.1.0, publié le 2026-10-23, donc encore en quarantaine.
- À réviser : passer ensemble à Stryker ≥ 10.1 et Vitest 5 une fois la quarantaine écoulée. La CI le détectera si Dependabot ne monte que Vitest : le score de mutation tomberait sous le seuil bloquant.

## Alternatives écartées

- **TypeScript 7 sans lint typé** : on perdrait les règles `strictTypeChecked`, qui détectent des classes entières de bugs.
- **Rester en Node 22.16** avec des versions plus anciennes des outils : dette dès le premier jour.

## Conséquences

- ✅ Lint typé complet et outils à jour.
- ❌ À réviser dès que typescript-eslint supportera TypeScript 7 : retirer l'exclusion Dependabot et mettre à jour ce document.
