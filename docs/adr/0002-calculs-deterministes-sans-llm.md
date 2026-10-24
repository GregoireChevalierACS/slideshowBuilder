# 0002 — Calculs déterministes, sans LLM

- **Date :** 2026-10-24
- **Statut :** acceptée

## Contexte

L'application propose une architecture d'automatisation et chiffre les gains devant un dirigeant. Un chiffre incohérent ou non reproductible ruine la crédibilité de la démarche.

## Décision

- **Aucun modèle de langage dans l'application.** Les architectures viennent d'un catalogue de briques et de règles composables (pattern Specification), les gains d'un calcul en fonctions pures.
- **Même diagnostic, mêmes paramètres ⇒ même présentation**, vérifié par un test par propriétés.
- La cohérence des chiffres est éprouvée par des **séries de tests** : scénarios d'entreprises réalistes (TPE, PME, cabinet…) aux résultats attendus justifiés, et propriétés vérifiées par fast-check (gain jamais négatif, croissant avec l'effectif, totaux conservés par les arrondis).
- Les montants sont en centimes entiers et les durées en minutes entières : aucun flottant dans les chiffres présentés.
- Le temps et les identifiants viennent de ports injectés. `new Date()`, `Date.now()` et `Math.random()` sont interdits dans le domaine par ESLint.

## Alternatives écartées

- **LLM local ou distant** pour concevoir l'architecture : résultats non reproductibles, impossibles à tester de façon exhaustive, et risque de fuite de données clients vers un service distant.

## Conséquences

- ✅ Chaque chiffre affiché s'explique par une formule et des hypothèses visibles.
- ✅ Fonctionne hors ligne, sans coût d'usage.
- ❌ Les suggestions se limitent au catalogue de règles, qu'il faudra enrichir au fil des rendez-vous.
