# 0006 — Diagnostic versionné et deck décrit en données

- **Date :** 2026-10-26
- **Statut :** acceptée

## Contexte

Le deck est généré pendant ou juste après l'entretien, pour un dirigeant ou pour un public technique, en version courte ou complète. Une présentation envoyée au client doit rester reproductible à l'identique, même si le diagnostic est corrigé ensuite.

## Décision

- **`Diagnostic` immuable et versionné.** Il réunit le prospect, la date de l'entretien, les hypothèses et les processus (gains et profil d'automatisation). `reviser()` produit la version suivante sans toucher à la précédente ; la date de l'entretien ne se révise pas. Les noms de processus sont uniques (sans tenir compte de la casse) car ils servent de repères dans l'architecture.
- **Le domaine produit une liste de diapositives typées** (union discriminée), pas du HTML. Le rendu est un adapter (phase 6).
- **Sélection selon les paramètres :**

| Diapositive                   |                 Courte                  | Complète, dirigeant | Complète, technique |
| ----------------------------- | :-------------------------------------: | :-----------------: | :-----------------: |
| Titre                         |                    ✓                    |          ✓          |          ✓          |
| Ce que nous avons observé     |                                         |          ✓          |          ✓          |
| Le coût caché                 |                    ✓                    |          ✓          |          ✓          |
| Processus par processus       |                                         |          ✓          |          ✓          |
| Architecture cible            | ✓ (familles ou briques selon le public) |    ✓ (familles)     |     ✓ (briques)     |
| Une diapositive par processus |                                         |                     |          ✓          |
| Gains attendus                |                    ✓                    |          ✓          |          ✓          |
| Feuille de route              |                    ✓                    |          ✓          |          ✓          |
| Hypothèses de calcul          |                                         |          ✓          |          ✓          |

- **Feuille de route :** par niveau d'automatisation (complète, assistée, notification), puis par valeur haute décroissante. Les gains rapides et peu risqués d'abord.
- **Alertes de cohérence :** uniquement dans les notes du présentateur de la diapositive de titre, jamais dans le contenu vu par le client (vérifié par un test).
- Pas de diapositive de présentation personnelle.

## Alternatives écartées

- **Générer directement du HTML ou du PPTX dans le domaine** : le contenu du pitch ne serait plus testable sans rendu, et chaque format dupliquerait la logique de sélection.
- **Diagnostic modifiable en place** : une présentation déjà envoyée ne pourrait plus être régénérée à l'identique.

## Conséquences

- ✅ Même diagnostic et mêmes paramètres donnent le même deck (propriété).
- ✅ Ajouter un format de rendu (PDF, plus tard PPTX) ne touche pas au domaine.
- ❌ L'estimation et l'architecture sont recalculées à chaque accès (`diagnostic.estimation`) : négligeable à cette échelle, à mettre en cache si un profilage le justifie.
