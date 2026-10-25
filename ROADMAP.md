# Feuille de route

Chaque phase a un critère de fin vérifiable. L'état réel et les pièges rencontrés sont notés au fil de l'eau.

| Phase                       | Contenu                                                                                                                   | Terminé quand…                                                                                         | État     |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | -------- |
| **0. Socle**                | Monorepo pnpm, TypeScript strict, ESLint, dependency-cruiser, Husky, commitlint, CI, ADR                                  | Un commit mal formé ou un import interdit fait échouer la CI                                           | terminée |
| **1. Calcul des gains**     | Value Objects (`Durée`, `Montant`, `Fréquence`, `Effectif`…), `EstimationDeGain`, Strategies de coût, Stryker, fast-check | 100 % de couverture, score de mutation ≥ 80 %, propriétés vertes, scénarios de référence justifiés     | terminée |
| **2. Conception**           | Catalogue de `Brique`, Specifications d'automatisabilité, `ArchitectureProposée`                                          | Un jeu de processus types (devis, facturation, mails entrants, relances) donne l'architecture attendue | à venir  |
| **3. Construction du deck** | `Diagnostic` figé et versionné → liste de `Diapositive` selon les paramètres (public, durée)                              | Même diagnostic + mêmes paramètres ⇒ même deck (propriété)                                             | à venir  |
| **4. Persistance, serveur** | SQLite, migrations, dépôts, contract tests Fake/SQLite, zod, Problem Details                                              | La suite de contrats passe sur les deux adapters, le smoke test du build passe                         | à venir  |
| **5. Saisie**               | Formulaires au clavier, modèles de processus pré-remplis, sauvegarde automatique                                          | Un entretien type se saisit en moins de 10 minutes sans souris                                         | à venir  |
| **6. Présentation**         | Gabarits de diapositives, schémas Mermaid, mode présentation, export PDF                                                  | E2E Playwright vert, captures visuelles stables                                                        | à venir  |
| **7. Extras**               | Export PPTX, import et export JSON, thème aux couleurs du prospect, ROI                                                   | Selon les retours du terrain                                                                           | à venir  |

## Phase 0 — notes

- Stryker est installé en phase 1, avec le premier code du domaine : sans code, il n'y a rien à muter. Il a révélé une incompatibilité silencieuse avec Vitest 5 (voir [ADR 0003](docs/adr/0003-versions-de-l-outillage.md)).
- Le numéro `N` du commit du jour n'est pas vérifié automatiquement (il dépend des branches et des fusions) ; la date, le format et le type le sont.
- TypeScript reste en 6.0 et Node passe en 24 LTS : voir [ADR 0003](docs/adr/0003-versions-de-l-outillage.md).

## Phase 1 — notes

- Modèle de calcul : voir [ADR 0004](docs/adr/0004-modele-de-calcul-des-gains.md). Le retour sur investissement (coût de réalisation, délai de retour) est reporté en phase 7.
- Les accès indexés (`tableau[i] ?? 0`) créaient des branches inatteignables avec `noUncheckedIndexedAccess`, détectées par le seuil de couverture des branches : l'arrondi renvoie désormais chaque élément avec sa valeur arrondie.
- Une alerte de cohérence signale les fréquences d'équipe saisies par personne (plus d'un temps plein par an sur une seule tâche).
- **Bug trouvé par fast-check** : le total dépendait de l'ordre de saisie quand la somme exacte tombait sur ,5 (l'addition flottante n'est pas associative). Les valeurs sont désormais additionnées dans un ordre canonique ; le contre-exemple est conservé comme test de régression.
