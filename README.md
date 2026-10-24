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
pnpm test:coverage    # tests + couverture (100 % exigés sur le domaine)
```

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
| `pnpm commits:check`     | Format des commits : `yyyy-mm-dd # N : (type) message` |

Les hooks Git refusent tout commit direct sur `main` et tout message mal formé.

## Problèmes courants

- **`ERR_PNPM_UNSUPPORTED_ENGINE`** : la version de Node est trop ancienne. Installer Node 24, puis rouvrir le terminal.
- **Un hook échoue avec « pnpm introuvable »** : le terminal a été ouvert avant l'installation de Node. Le rouvrir.

## Documentation

- [Feuille de route](ROADMAP.md)
- [Décisions d'architecture](docs/adr/)
