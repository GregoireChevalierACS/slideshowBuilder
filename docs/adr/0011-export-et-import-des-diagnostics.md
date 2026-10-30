# 0011 — Export et import des diagnostics

- **Date :** 2026-10-30
- **Statut :** acceptée

## Contexte

Les diagnostics vivent dans la base SQLite d'un seul portable. Il faut pouvoir les sauvegarder, changer de machine, ou reprendre sur un poste un entretien commencé sur un autre, sans jamais perdre une version déjà présentée (ADR 0007 : un deck envoyé doit pouvoir être régénéré à l'identique).

## Décision

- **Un fichier JSON versionné** (`format: "slideshow-builder/diagnostics"`, `versionDuFormat: 1`) contenant l'**historique complet** de chaque diagnostic : toutes ses versions, au format de saisie (ADR 0007). Le même format sert pour un diagnostic seul (bouton **Exporter** de l'entretien) et pour une sauvegarde de tout le poste (**Tout exporter** sur l'accueil).
- **L'import valide le fichier entier avant la moindre écriture**, avec les mêmes contrôles que le stock :
  - l'enveloppe ;
  - la structure (zod) ;
  - les identifiants et l'absence de doublon ;
  - des versions numérotées de 1 à n sans trou ;
  - chaque version passée aux règles du domaine.

  Une seule erreur refuse tout le fichier (`/problemes/export-illisible`, 422), en désignant le champ fautif dans le fichier. Un fichier issu d'une version plus récente de l'application est reconnu et refusé avec un message explicite.

- **Un import n'écrase jamais rien.** Pour chaque diagnostic du fichier :

  | Situation sur ce poste                              | Statut      | Effet                           |
  | --------------------------------------------------- | ----------- | ------------------------------- |
  | Inconnu                                             | `importe`   | Historique écrit d'un coup      |
  | Historique local = début de celui du fichier        | `complete`  | Versions suivantes ajoutées     |
  | Historique du fichier = début de l'historique local | `aJour`     | Rien                            |
  | Une version commune diffère                         | `divergent` | Rien : les deux travaux restent |

  L'import est donc idempotent : réimporter le même fichier ne change rien.

- **Le dépôt gagne deux opérations**, tenues par le contrat Fake/SQLite :
  - `historique(id)`, qui rend toutes les versions dans l'ordre ;
  - `importer(id, historique)`, qui écrit tout l'historique ou rien (transaction SQLite) et le refuse si le diagnostic existe déjà.
- **Téléchargement par un simple lien** (`download`) : le serveur nomme le fichier (`diagnostic-negoce-durand-2026-10-30.json`) par `Content-Disposition`. L'import envoie le contenu du fichier tel quel ; la limite de taille de cette route est portée à 64 Mio, car la sauvegarde automatique crée une version par pause de frappe.

## Alternatives écartées

- **Exporter la dernière version seulement** : plus léger, mais les présentations déjà envoyées ne pourraient plus être régénérées sur l'autre poste.
- **Créer un nouvel identifiant à chaque import** : supprime les conflits, mais réimporter une sauvegarde dupliquerait chaque diagnostic, et un entretien poursuivi ailleurs ne pourrait pas être complété.
- **Fusionner deux historiques divergents** : il n'y a pas de fusion automatique sûre de deux saisies ; le cas est signalé, et les deux travaux sont gardés tels quels.
- **Copier le fichier SQLite** : reste possible pour une sauvegarde brute, mais ne permet ni de transférer un seul diagnostic ni de compléter un historique.

## Conséquences

- ✅ Sauvegarde, changement de poste et reprise d'un entretien ailleurs, sans perte ni écrasement.
- ✅ Un fichier modifié à la main est revalidé, comme le stock.
- ❌ Le format de saisie est désormais aussi un format de fichier : le faire évoluer impose d'incrémenter `versionDuFormat` et de savoir lire les anciens fichiers.
- ❌ Un historique divergent n'est pas fusionné : il faut choisir à la main quel poste garder.
