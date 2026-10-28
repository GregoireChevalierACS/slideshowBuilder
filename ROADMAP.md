# Feuille de route

Chaque phase a un critère de fin vérifiable. L'état réel et les pièges rencontrés sont notés au fil de l'eau.

| Phase                       | Contenu                                                                                                                   | Terminé quand…                                                                                         | État     |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | -------- |
| **0. Socle**                | Monorepo pnpm, TypeScript strict, ESLint, dependency-cruiser, Husky, commitlint, CI, ADR                                  | Un commit mal formé ou un import interdit fait échouer la CI                                           | terminée |
| **1. Calcul des gains**     | Value Objects (`Durée`, `Montant`, `Fréquence`, `Effectif`…), `EstimationDeGain`, Strategies de coût, Stryker, fast-check | 100 % de couverture, score de mutation ≥ 80 %, propriétés vertes, scénarios de référence justifiés     | terminée |
| **2. Conception**           | Catalogue de `Brique`, Specifications d'automatisabilité, `ArchitectureProposée`                                          | Un jeu de processus types (devis, facturation, mails entrants, relances) donne l'architecture attendue | terminée |
| **3. Construction du deck** | `Diagnostic` figé et versionné → liste de `Diapositive` selon les paramètres (public, durée)                              | Même diagnostic + mêmes paramètres ⇒ même deck (propriété)                                             | terminée |
| **4. Persistance, serveur** | SQLite, migrations, dépôts, contract tests Fake/SQLite, zod, Problem Details                                              | La suite de contrats passe sur les deux adapters, le smoke test du build passe                         | terminée |
| **5. Saisie**               | Formulaires au clavier, modèles de processus pré-remplis, sauvegarde automatique                                          | Un entretien type se saisit en moins de 10 minutes sans souris                                         | terminée |
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

## Phase 2 — notes

- Conception : voir [ADR 0005](docs/adr/0005-conception-par-regles-composables.md). Catalogue de 21 briques, dont signature électronique, paiement en ligne, synchronisation d'agenda et deux briques d'IA.
- Stryker a révélé que les textes de justification, lus par le client, n'étaient pas testés : ils font désormais partie du contrat.
- Correctif de sécurité : `qs` forcé en 6.16.0 (dépendance transitive de Stryker épinglée en 6.15.1).

## Phase 3 — notes

- Diagnostic versionné et deck décrit en données : voir [ADR 0006](docs/adr/0006-deck-decrit-en-donnees.md). Pas de diapositive « Qui suis-je ».
- Le coût actuel (euros et ETP) a été ajouté à l'estimation des gains pour la diapositive « Le coût caché ».
- Stryker a révélé qu'une date préfixée (`xx-1910-10-05`) aurait donné une année NaN.

## Phase 4 — notes

- Couche application : voir [ADR 0007](docs/adr/0007-couche-application-et-format-de-saisie.md). Format de saisie JSON vérifié par aller-retour, ports, contrat du dépôt, concurrence optimiste.
- Le test de révision concurrente a révélé que la version annoncée en cas de conflit était fausse d'une unité.
- Couverture de 100 % exigée aussi sur la couche application.
- Serveur : voir [ADR 0008](docs/adr/0008-serveur-http-local.md). `node:sqlite`, migrations testées en aller-retour, contrat du dépôt rejoué sur SQLite, Fastify avec Problem Details et contrôle de l'en-tête `Host`.
- Le smoke test a révélé que tsdown produit `main.mjs` ; sous Windows, le fichier SQLite reste verrouillé tant que le processus n'est pas terminé.

## Phase 5 — notes

- Interface : voir [ADR 0009](docs/adr/0009-interface-web.md). Accueil, ouverture d'un diagnostic, paramètres des raccourcis, 13 modèles de processus (taux suggérés par la conception), contrat d'échange partagé et vérifié côté serveur.
- Écran d'entretien : trois colonnes, formulaire en six sections, chiffres du domaine en direct, sauvegarde automatique sérialisée, conflit 409, alertes de cohérence.
- Critère de fin vérifié : le parcours Playwright saisit un entretien complet au clavier seul, contre le livrable compilé, en quelques secondes.
- Le parcours E2E a trouvé un vrai bug : au clavier, chaque lettre tapée dans la liste des modèles réappliquait le modèle, et le processus était renommé « … (2) » à cause de lui-même.
- Les tests de composants ont révélé un défaut d'accessibilité : unité et message d'erreur étaient dans le libellé du champ, et polluaient son nom accessible.
