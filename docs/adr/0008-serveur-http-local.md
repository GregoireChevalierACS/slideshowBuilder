# 0008 — Serveur HTTP local et persistance SQLite

- **Date :** 2026-10-27
- **Statut :** acceptée

## Contexte

Les cas d'usage (ADR 0007) doivent être servis à une interface web locale et persistés sur le portable, sans service à installer.

## Décision

- **`node:sqlite`**, intégré à Node 24 : aucun module natif à compiler sous Windows. Une table `diagnostic_versions (id, version, saisie JSON)` avec clé primaire `(id, version)` : une version n'est jamais écrasée, `INSERT … ON CONFLICT DO NOTHING` détecte une révision concurrente sans exception. WAL et `busy_timeout` pour deux onglets simultanés.
- **Migrations versionnées** par `PRAGMA user_version`, chacune avec montée et descente, dans une transaction ; testées en aller-retour.
- **Le stock est relu par zod puis par le domaine** : une ligne corrompue est une panne (500 journalisé), jamais acceptée. Le contrat du dépôt est le même pour le Fake et SQLite.
- **Fastify** sur `127.0.0.1` uniquement (non configurable), routes sous `/api` sans numéro de version : le client et le serveur sont livrés ensemble, aucun ancien client ne circule.
- **Validation à trois niveaux** : zod (400), domaine (422, avec le champ), cas d'usage (404, 409). Erreurs en Problem Details, catalogue dans [docs/problemes.md](../problemes.md). Les énumérations zod sont vérifiées exhaustives à la compilation.
- **Contrôle de l'en-tête `Host`** (`127.0.0.1` ou `localhost`) : sans lui, une page web malveillante pourrait lire les diagnostics par DNS rebinding malgré l'écoute locale.
- **Configuration validée au démarrage** (`PORT`, `CHEMIN_DE_LA_BASE`), toutes les erreurs listées sans jamais afficher les valeurs reçues ; `.env.example` versionné.
- **Une seule fabrique d'application** (`creerLApplication`) pour la production et les tests ; `main.ts` est la seule composition root, vérifiée par un smoke test de l'API compilée en CI.

## Alternatives écartées

- **`better-sqlite3`** : module natif, compilation et binaires à gérer sous Windows.
- **Préfixe `/v1`** : utile quand des clients anciens survivent (application mobile), pas ici.
- **ORM** : une seule table, des requêtes simples ; le mapping passe déjà par le format de saisie.
- **OpenAPI généré depuis zod** : utile pour un client tiers ; l'interface est livrée avec le serveur. À reconsidérer si l'API s'ouvre.

## Conséquences

- ✅ Démarrage en une commande, un fichier à sauvegarder.
- ✅ Les mêmes contrats et tests vérifient le Fake, SQLite et l'application HTTP réelle.
- ❌ `node:sqlite` est synchrone : une requête lourde bloquerait le serveur. Acceptable pour un utilisateur seul et des diagnostics de quelques kilo-octets.
