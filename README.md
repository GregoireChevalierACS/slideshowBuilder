# Générateur de slideshow de diagnostic

Application locale qui accompagne un rendez-vous de prospection : elle sert à noter les besoins et l'infrastructure d'une entreprise, à proposer une architecture d'automatisation des processus redondants (mail, comptabilité, facturation, devis, intranet, messagerie…), à calculer les gains de temps selon le nombre de personnes impactées, puis à générer la présentation correspondante à la volée.

## Principes

- **Local et hors ligne** : tout tourne sur le portable, aucune donnée client ne sort de la machine.
- **Déterministe** : aucune IA dans l'application. Les architectures et les gains viennent de règles et de calculs testés.
- **Exporté en PDF**, présentations en français.

## Démarrage

Prérequis : Node 24 (voir `.node-version`) et pnpm 10 (`corepack enable` suffit).

```bash
pnpm install          # installe les dépendances et active les hooks Git
pnpm test             # tests
pnpm test:coverage    # tests + couverture (100 % exigés partout)
pnpm build            # compile les paquets et le serveur
pnpm start            # lance l'application sur http://127.0.0.1:4321
```

En développement, l'interface se recharge à chaque modification : lancer `pnpm start` dans un terminal, puis `pnpm dev:web` dans un autre, et ouvrir l'adresse affichée par Vite (les appels à `/api` sont relayés vers le serveur).

La configuration se fait par variables d'environnement ou par un fichier `apps/server/.env` (modèle : [.env.example](apps/server/.env.example)). La base SQLite est créée au premier démarrage dans `apps/server/data/` : c'est le fichier à sauvegarder pour conserver les diagnostics.

## Vérifications

Les mêmes commandes tournent en CI ([ci.yml](.github/workflows/ci.yml)) :

| Commande                 | Vérifie                                                |
| ------------------------ | ------------------------------------------------------ |
| `pnpm lint`              | ESLint typé, imports interdits dans le domaine         |
| `pnpm lint:architecture` | Graphe des dépendances (dependency-cruiser)            |
| `pnpm format:check`      | Formatage Prettier                                     |
| `pnpm typecheck`         | Types                                                  |
| `pnpm test:coverage`     | Tests et seuils de couverture                          |
| `pnpm build`             | Build de production des paquets                        |
| `pnpm test:smoke`        | L'API compilée démarre, enregistre et relit            |
| `pnpm test:e2e`          | Un entretien complet au clavier seul (Playwright)      |
| `pnpm test:mutation`     | Test de mutation du domaine (Stryker, seuil 80 %)      |
| `pnpm commits:check`     | Format des commits : `yyyy-mm-dd # N : (type) message` |

Les hooks Git refusent tout commit direct sur `main` et tout message mal formé.

## Problèmes courants

- **`ERR_PNPM_UNSUPPORTED_ENGINE`** : la version de Node est trop ancienne. Installer Node 24, puis rouvrir le terminal.
- **Un hook échoue avec « pnpm introuvable »** : le terminal a été ouvert avant l'installation de Node. Le rouvrir.
- **`Configuration invalide` au démarrage** : le message liste chaque variable en cause. Corriger `apps/server/.env`.
- **`pnpm test:e2e` ne trouve pas de navigateur** : l'installer une fois avec `pnpm --filter @slideshow/web exec playwright install chromium`. Le parcours tourne contre le livrable : lancer `pnpm build` avant.
- **`EADDRINUSE`** : le port est déjà pris, sans doute par une autre instance. Changer `PORT` ou arrêter l'autre instance.

## Documentation

- [Feuille de route](ROADMAP.md)
- [Décisions d'architecture](docs/adr/)
- [Catalogue des erreurs de l'API](docs/problemes.md)
