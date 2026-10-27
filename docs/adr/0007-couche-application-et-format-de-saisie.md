# 0007 — Couche application, format de saisie et concurrence optimiste

- **Date :** 2026-10-27
- **Statut :** acceptée

## Contexte

Le domaine est complet (gains, conception, diagnostic, deck). Il faut maintenant l'exposer à une interface et le stocker, sans que l'un ou l'autre ne pénètre dans le domaine.

## Décision

- **Format de saisie (`SaisieDeDiagnostic`)** : uniquement des nombres, des chaînes et des choix fermés, sérialisable en JSON. C'est ce que l'interface envoie **et** ce que le stockage conserve.
  - `lireLaSaisie` le convertit en objets du domaine ; la première valeur refusée par une règle métier est signalée avec son chemin (`processus[1].tauxBas`).
  - `decrireLeDiagnostic` fait l'inverse. Une propriété vérifie l'aller-retour sur des saisies générées.
  - Stocker la saisie plutôt que des objets sérialisés : relire le stock repasse par les règles du domaine, un stock corrompu est détecté au lieu d'être cru.
- **Ports** déclarés dans la couche application : `DepotDeDiagnostics`, `Horloge`, `GenerateurDIdentifiants`. `IdDeDiagnostic` est un type marqué, validé à l'entrée (URL, base).
- **Le dépôt historise chaque version et n'en écrase jamais.** Son contrat est une suite de tests (`verifierLeContratDuDepotDeDiagnostics`) jouée contre le Fake en mémoire, puis contre SQLite. Elle est exposée sous `@slideshow/application/testing`, par la seule condition d'export `source` : jamais livrée.
- **Concurrence optimiste** : on révise en indiquant la version qu'on a sous les yeux. Si elle n'est plus la dernière, ou si une autre révision s'enregistre entre la lecture et l'écriture, la révision est refusée (`VersionPerimee`) au lieu d'écraser un autre travail.
- Les cas d'usage reçoivent leurs dépendances (`creerLesCasDUsage({ depot, horloge, identifiants })`) : composition manuelle, pas de framework d'injection.

## Alternatives écartées

- **Persister les objets du domaine tels quels** : le stockage dépendrait des détails internes des classes, et un stock modifié à la main ne serait pas revalidé.
- **Signaler toutes les erreurs de saisie à la fois** : plus confortable dans un formulaire, mais la structure est déjà validée par zod côté serveur (phase 4) ; les erreurs métier restantes sont rares. À reconsidérer avec l'interface (phase 5).
- **Verrou pessimiste** : inutile pour un utilisateur seul, la concurrence optimiste suffit à protéger deux onglets ouverts.

## Conséquences

- ✅ Un seul format à maintenir pour l'interface et le stockage, vérifié par aller-retour.
- ✅ Le Fake et SQLite sont tenus par le même contrat.
- ❌ Faire évoluer le format de saisie impose de migrer les données stockées.
