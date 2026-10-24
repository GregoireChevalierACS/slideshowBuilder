# 0001 — Application web locale, architecture hexagonale

- **Date :** 2026-10-24
- **Statut :** acceptée

## Contexte

L'application sert pendant des rendez-vous de prospection, sur un petit portable, souvent sans réseau fiable. Elle manipule des informations confidentielles sur les entreprises démarchées. Le code sert aussi de vitrine : il doit montrer une architecture propre et outillée.

## Décision

- **Application web locale** : un serveur Node écoute uniquement sur `127.0.0.1`, l'interface s'ouvre dans le navigateur. Aucune donnée ne quitte la machine.
- **Monorepo pnpm en TypeScript**, découpé en ports et adapters :
  - `packages/domain` : modèle métier, calcul des gains, règles de conception, construction du deck. Pur et déterministe.
  - `packages/application` : cas d'usage et ports (dépôts, horloge, générateur d'identifiants).
  - `apps/server` : adapter HTTP et SQLite (phase 4).
  - `apps/web` : adapter UI React, saisie et mode présentation (phases 5 et 6).
- **SQLite** pour la persistance : un seul fichier, facile à sauvegarder, sans service à lancer.
- La règle de dépendance (domaine ← application ← adapters) est vérifiée par ESLint dans l'éditeur et par dependency-cruiser en CI.

## Alternatives écartées

- **Application desktop (Tauri, Electron)** : Tauri ajoute Rust à la stack, Electron est lourd pour un petit portable. Un navigateur suffit.
- **SaaS hébergé** : dépendance au réseau, données clients hors de la machine.
- **PostgreSQL** : un service à installer et lancer, disproportionné pour un usage mono-utilisateur.

## Conséquences

- ✅ Le domaine se teste en quelques millisecondes, sans navigateur ni base.
- ✅ Le domaine tourne aussi dans le navigateur si besoin (aucune dépendance Node).
- ✅ Démarrage en une commande, aucun service externe.
- ❌ Il faut lancer le serveur avant d'ouvrir l'interface (à automatiser par un script de démarrage).
- ❌ Pas de synchronisation entre machines : export et import JSON prévus pour les sauvegardes.
