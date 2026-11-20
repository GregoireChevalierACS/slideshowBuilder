# Bonnes pratiques appliquées

Ce document recense les pratiques de conception, de test et d'outillage du projet, avec l'endroit où chacune s'applique et l'outil qui la fait respecter. Les décisions détaillées sont dans les [ADR](adr/).

## Principes

- **Le métier d'abord.** Les chiffres présentés au client (temps, euros, gains) viennent d'un domaine pur, sans framework ni entrée-sortie, testé à 100 % et par mutation.
- **Une règle n'existe que si un outil la vérifie.** Chaque règle de ce document est tenue par le compilateur, ESLint, dependency-cruiser, un hook Git ou la CI. Une règle seulement écrite finit par être contournée.
- **Chaque motif de conception répond à un besoin réel.** Pas de framework d'injection, d'ORM ni de bus de messages pour une application locale mono-utilisateur.
- **Échouer tôt et bruyamment.** Configuration validée au démarrage, stock relu par les règles du domaine, réponses de l'API validées par le client.
- **Tracer les décisions.** ADR, feuille de route avec critères de fin, commentaires qui expliquent le _pourquoi_ plutôt que le _quoi_.
- **Calculs déterministes, sans LLM dans l'application** ([ADR 0002](adr/0002-calculs-deterministes-sans-llm.md)). Même saisie et mêmes paramètres donnent toujours le même deck.

## Architecture

### Hexagonale, en monorepo pnpm

[ADR 0001](adr/0001-application-web-locale-hexagonale.md)

| Paquet                                             | Rôle                                                                                                           |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| [`packages/domain`](../packages/domain/)           | Calcul des gains, conception de l'architecture, diagnostic versionné, construction du deck. Aucune dépendance. |
| [`packages/application`](../packages/application/) | Cas d'usage, ports, format de saisie, schémas d'échange zod.                                                   |
| [`apps/server`](../apps/server/)                   | Adapters : HTTP (Fastify), SQLite (`node:sqlite`), horloge et identifiants système.                            |
| [`apps/web`](../apps/web/)                         | Interface React : saisie, présentation, export.                                                                |

### Règles de dépendance vérifiées à deux niveaux

- **Dans l'éditeur et au commit**, ESLint (`no-restricted-imports`) interdit au domaine d'importer un framework, Node ou une autre couche.
- **En CI**, [dependency-cruiser](../.dependency-cruiser.mjs) vérifie le graphe complet :

  | Règle                               | Ce qu'elle garantit                                        |
  | ----------------------------------- | ---------------------------------------------------------- |
  | `domaine-pur`                       | Le domaine ne dépend de rien                               |
  | `application-sans-infrastructure`   | Pas de HTTP ni de SQL dans la couche application           |
  | `api-publique-seulement`            | Chaque paquet n'est importé que par son `index.ts`         |
  | `base-de-donnees-confinee`          | Seul `apps/server/src/database` touche SQLite              |
  | `interface-sans-serveur`            | L'interface ne dépend jamais du code serveur               |
  | `pas-de-cycle`                      | Aucun cycle entre modules                                  |
  | `production-independante-des-tests` | Le code livré n'importe ni test ni fixture                 |
  | `production-sans-dependance-de-dev` | Le code livré n'utilise pas de dépendance de développement |
  | `pas-de-fourre-tout`                | Pas de `utils`, `helpers`, `common`…                       |
  | `pas-d-orphelin`                    | Pas de module que personne n'importe (code mort)           |

### Composition

- **Ports déclarés là où ils servent**, dans la couche application ([`ports.ts`](../packages/application/src/ports.ts)) : `DepotDeDiagnostics`, `Horloge`, `GenerateurDIdentifiants`.
- **Composition manuelle**, sans framework d'injection : `creerLesCasDUsage({ depot, horloge, identifiants })`. Un seul _composition root_ par application (`main.ts`, `main.tsx`).
- **Même application en production et en test** : `creerLApplication(casDUsage)` ne change que par les cas d'usage injectés.
- **Paquets compilés en bibliothèques** (tsdown, ESM). Les tests lisent les sources par la condition d'export `source`, jamais livrée ; les outils de test partagés sont exposés sous `@slideshow/application/testing`.

## Modélisation du domaine

- **Langage métier, en français** : `ProcessusRedondant`, `EstimationDeGain`, `ArchitectureProposee`, `Diapositive`. Pas de `Data`, `Manager` ou `Helper`.
- **Value Objects immuables, validés à la création** : `Duree`, `Montant`, `Frequence`, `Effectif`, `Pourcentage`, `CoutHoraire`, `DateLocale`. Un objet invalide ne peut pas exister.
- **Invariants portés par les types** :
  - types marqués, par exemple `IdDeDiagnostic`, validé à l'entrée ;
  - unions discriminées (`kind`) pour les diapositives, les erreurs et les coûts horaires ;
  - vérification d'exhaustivité des `switch` par ESLint.

  Les choix fermés des schémas zod doivent lister exactement ceux du domaine, sinon la compilation échoue.

- **Erreurs métier en `Result<T, E>`** ([`Result.ts`](../packages/domain/src/Result.ts)), jamais en exceptions. Les exceptions sont réservées aux pannes : stock corrompu, bug.
- **Fonctions pures et déterministes.** ESLint interdit `new Date()`, `Date.now()` et `Math.random()` dans le domaine : le temps passe par le port `Horloge`.
- **Historiser au lieu d'écraser** : chaque révision d'un diagnostic est une nouvelle version, et une présentation déjà envoyée se régénère à l'identique ([ADR 0007](adr/0007-couche-application-et-format-de-saisie.md)).
- **Motifs utilisés pour un besoin précis** :
  - _Specification_ composable (et, ou, non) pour décider si une tâche est automatisable ([ADR 0005](adr/0005-conception-par-regles-composables.md)) ;
  - _Strategy_ pour le coût horaire (direct, ou déduit du salaire brut et du coefficient de charges) ;
  - deck décrit en données plutôt qu'en rendu ([ADR 0006](adr/0006-deck-decrit-en-donnees.md)), donc testable sans navigateur.

## Tests

### Pyramide

| Niveau       | Outil                                         | Exemples                                                                          |
| ------------ | --------------------------------------------- | --------------------------------------------------------------------------------- |
| Unitaire     | Vitest                                        | Value Objects, calcul des gains, conception, construction du deck                 |
| Propriétés   | fast-check                                    | Aller-retour du format de saisie et du fichier d'export, déterminisme du deck     |
| Contrat      | Vitest                                        | Le même comportement exigé du dépôt en mémoire et du dépôt SQLite                 |
| Intégration  | Vitest + SQLite en mémoire + Fastify `inject` | Chaque route, chaque statut, chaque réponse validée par le contrat publié         |
| Composants   | Testing Library                               | Écrans et formulaires, interrogés par rôle et libellé accessible                  |
| Smoke test   | [script Node](../scripts/smoke-test.mjs)      | Le serveur compilé démarre, enregistre, relit et sert l'interface                 |
| Bout en bout | Playwright, sur le livrable compilé           | Entretien entier au clavier, présentation, débordements, PDF, changement de poste |
| Mutation     | Stryker, sur le domaine                       | Seuil bloquant à 80 %, score actuel de 100 %                                      |

### Règles

- **100 % de couverture** (lignes, branches, fonctions) sur tout le code source, imposée par [vitest.config.ts](../vitest.config.ts). Seuls les _composition roots_, les `index.ts` et les outils de test en sont exclus. Une branche inatteignable se supprime au lieu d'être ignorée.
- **Fakes plutôt que mocks** : un mock vérifie des appels, un Fake tenu par un contrat vérifie un comportement ([`contratDuDepotDeDiagnostics.ts`](../packages/application/src/testing/contratDuDepotDeDiagnostics.ts)).
- **Un mutant équivalent ne s'ignore qu'avec une justification écrite**, à côté du code (`// Stryker disable next-line … : raison`).
- **Fixtures paresseuses** : des fonctions (`uneSaisieDeDiagnostic()`), jamais des objets construits au chargement d'un fichier.
- **Scénarios de référence justifiés** : les chiffres attendus sont recalculés à la main dans le test, par exemple « 4 min × 20 × 228 jours × 2 personnes = 608 h ».
- **Concurrence testée** : un dépôt qui simule une écriture concurrente vérifie que la concurrence optimiste refuse au lieu d'écraser.
- **Le rendu est vérifié, pas photographié** : l'E2E mesure le débordement de chaque diapositive et de chaque boîte du schéma, exige une marge de 10 % en bas, et compte les pages du vrai PDF ([ADR 0010](adr/0010-rendu-de-la-presentation.md)). Les captures d'écran à comparer pixel par pixel ont été écartées, car trop fragiles d'une machine à l'autre.

## Typage et style

- **TypeScript au plus strict** ([tsconfig.base.json](../tsconfig.base.json)) :
  - `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` ;
  - `noPropertyAccessFromIndexSignature`, `noImplicitOverride`, `noImplicitReturns` ;
  - `verbatimModuleSyntax`, `useUnknownInCatchVariables`.
- **ESLint `strictTypeChecked` et `stylisticTypeChecked`** ([eslint.config.mjs](../eslint.config.mjs)) :
  - pas de `any` ;
  - **aucune assertion de type `as`** (`assertionStyle: 'never'`) ;
  - imports de types explicites, `switch` exhaustifs, `eqeqeq` ;
  - toute désactivation d'une règle doit porter une justification (`eslint-comments/require-description`), et une désactivation devenue inutile est une erreur ;
  - zéro avertissement toléré.
- **Les données externes sont validées par zod, jamais transtypées** : corps des requêtes, lignes SQLite, réponses de l'API, messages entre fenêtres, fichiers importés.
- **Prettier et `.editorconfig`**, appliqués à chaque commit par lint-staged. Fins de ligne LF imposées par `.gitattributes`, même sous Windows.
- **Code, commentaires et documentation en français**, comme le métier.

## API et persistance

[ADR 0008](adr/0008-serveur-http-local.md)

- **Validation à trois niveaux** :

  | Niveau       | Outil       | Statut                                             |
  | ------------ | ----------- | -------------------------------------------------- |
  | Structure    | zod         | 400                                                |
  | Règle métier | domaine     | 422, avec le champ fautif (`processus[1].tauxBas`) |
  | État         | cas d'usage | 404 (introuvable), 409 (version périmée)           |

- **Erreurs au format Problem Details** (RFC 9457), avec un `type` stable et un [catalogue](problemes.md). Une erreur interne n'expose jamais son détail.
- **Un seul contrat d'échange** : les schémas zod de la couche application servent au serveur (requêtes, stock) et à l'interface (réponses).
- **Concurrence optimiste** : on révise en indiquant la version qu'on a sous les yeux. Une révision concurrente est refusée, jamais écrasée.
- **Stock relu par les règles du domaine** : stocker la saisie plutôt que des objets sérialisés. Une ligne modifiée à la main est détectée comme une panne au lieu d'être crue.
- **Migrations versionnées**, jamais modifiées une fois livrées, testées à la montée et à la descente, chacune dans une transaction.
- **Import idempotent et atomique** : un fichier est validé en entier avant la moindre écriture, un historique s'écrit d'un coup ou pas du tout, et rien n'est jamais écrasé ([ADR 0011](adr/0011-export-et-import-des-diagnostics.md)).
- **Configuration validée au démarrage**, sans jamais afficher la valeur reçue (elle pourrait être un secret). Un modèle [`.env.example`](../apps/server/.env.example) est versionné.

## Sécurité

- **Écoute sur `127.0.0.1` uniquement** : rien n'est exposé au réseau du client.
- **Contrôle de l'en-tête `Host`** contre le DNS rebinding : une page web malveillante ne peut pas viser le serveur local sous un autre nom.
- **Moindre privilège en CI** : `permissions: contents: read` par défaut.
- **Dépendances surveillées** :
  - `pnpm audit --audit-level high` bloquant en CI ;
  - analyse CodeQL (`security-and-quality`) à chaque PR et chaque semaine ;
  - Dependabot pour les paquets et les actions GitHub ;
  - GitGuardian contre les secrets commités.
- **Quarantaine des versions** : `minimumReleaseAge` de 3 jours. La plupart des paquets compromis sont retirés du registre dans ce délai.
- **Versions exactes** (`save-exact`), lockfile figé en CI (`--frozen-lockfile`), Node et pnpm épinglés (`.node-version`, `packageManager`, `engine-strict`).
- **Alertes traitées, jamais masquées** : un _override_ ciblé et commenté (`typed-rest-client>qs`), avec la condition pour le retirer.

## Interface

[ADR 0009](adr/0009-interface-web.md)

- **Entièrement utilisable au clavier**, raccourcis configurables. Vérifié par un E2E qui saisit un entretien complet sans souris.
- **Accessibilité** : libellés associés aux champs, rôles ARIA (`status`, `alert`, `complementary`), erreurs reliées à leur champ (`aria-describedby`, `aria-invalid`). Les tests interrogent l'interface comme un lecteur d'écran.
- **Calcul en direct par le domaine**, à chaque frappe : l'interface n'a aucune formule à elle.
- **Sauvegarde automatique** avec indicateur d'état, et bandeau explicite en cas de conflit.
- **Dégradation propre** : l'interface fonctionne si le stockage du navigateur est refusé, et un serveur injoignable donne un message qui dit quoi faire.

## Git et intégration continue

- **Format de commit vérifié** : `aaaa-mm-jj # N : (type) message`, contrôlé par commitlint au commit et en CI, date comprise. Le seul cas exempté est Dependabot, reconnu par l'auteur de la PR et non par le message, qui serait falsifiable.
- **`main` n'évolue que par pull request**, même en solo : branche protégée, et hook _pre-commit_ qui refuse un commit direct sur `main`.
- **Branches courtes** (`feat/…`, `docs/…`), petits commits atomiques.
- **Husky et lint-staged** : ESLint et Prettier sur les fichiers modifiés à chaque commit.
- **CI en une passe** ([ci.yml](../.github/workflows/ci.yml)) : audit → format des commits → lint → architecture → formatage → types → tests et couverture → build → smoke test → bout en bout → mutation.
  - Rapports E2E et de mutation archivés.
  - Une exécution obsolète est annulée (`concurrency`).
  - Chaque job a une durée maximale (`timeout-minutes`).

## Documentation

- **ADR** pour chaque décision structurante : contexte, décision, alternatives écartées, conséquences positives et négatives ([docs/adr](adr/)).
- **[Feuille de route](../ROADMAP.md)** : un critère vérifiable « terminé quand… » par phase, et les pièges rencontrés notés au fil de l'eau.
- **[README](../README.md) exécutable** : démarrage, usage, commandes de vérification, problèmes courants.
- **Chaque exception est justifiée à côté de la règle** qu'elle contourne : mutant équivalent, _override_ de dépendance, version d'outil retenue ([ADR 0003](adr/0003-versions-de-l-outillage.md)).

## Écarté délibérément

Ces pratiques sont valables ailleurs, mais disproportionnées pour une application locale mono-utilisateur :

- versionnement de l'API (`/v1`), authentification par jeton, chiffrement de la base ;
- PostgreSQL et Testcontainers : SQLite en mémoire teste la vraie base, sans conteneur ;
- outbox, bus de messages, framework d'injection de dépendances, ORM ;
- verrou pessimiste : la concurrence optimiste suffit à protéger deux onglets ouverts.
