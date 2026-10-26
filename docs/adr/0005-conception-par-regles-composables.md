# 0005 — Conception de l'architecture par règles composables

- **Date :** 2026-10-26
- **Statut :** acceptée

## Contexte

Pour chaque processus relevé en entretien, l'application doit proposer une architecture d'automatisation crédible et **justifiée** : un dirigeant doit comprendre pourquoi telle brique est proposée. L'application n'utilise pas de LLM ([ADR 0002](0002-calculs-deterministes-sans-llm.md)) : la conception est déterministe.

## Décision

- **Le profil d'un processus** est fait de choix fermés : nature de la tâche (10 natures), outils source et cible avec leur mode d'accès (API, webhook, e-mail, export, aucun), forme des données (structurées ou documents), décision humaine (aucune, ponctuelle, systématique). Aucune règle n'interprète du texte libre.
- **Catalogue de 21 briques** en 5 familles, rangées dans l'ordre de lecture d'un flux : déclencheurs, connecteurs, traitements, services, contrôle. Les briques d'IA (extraction de documents, classification) sont marquées : les architectures **proposées aux clients** peuvent en contenir, seule l'application elle-même n'en utilise pas.
- **Règles écrites avec le pattern Specification** (`et`, `ou`, `non`). Leur description en français sert telle quelle de justification sur la diapositive : modifier une règle, c'est modifier ce que lit le client.
  - Déclenchement : la première règle satisfaite l'emporte (un seul déclencheur par flux).
  - Composition : toutes les règles satisfaites s'appliquent.
  - Niveau : de la règle la plus restrictive à la plus favorable ; chaque niveau pré-remplit les taux de la phase 1.

| Niveau       | Quand                                                     | Taux bas–haut |
| ------------ | --------------------------------------------------------- | ------------- |
| Notification | chaque cas demande une décision humaine                   | 10–30 %       |
| Assistée     | documents, décision ponctuelle, ou outil sans accès (RPA) | 40–70 %       |
| Complète     | sinon                                                     | 70–90 %       |

- **Architecture d'ensemble** : outils concernés, briques mutualisées entre processus, recours à l'IA.

## Alternatives écartées

- **Arbre de décision codé en `if` imbriqués** : illisible pour un non-développeur, et ne produit pas de justification.
- **Moteur de règles externe** : disproportionné pour une vingtaine de règles.
- **Texte libre analysé par un LLM** : non déterministe, écarté par l'ADR 0002.

## Conséquences

- ✅ Chaque brique proposée est justifiée par une phrase, vérifiée par une propriété (toute brique est justifiée, toute justification porte sur une brique proposée).
- ✅ Ajouter une règle ne modifie pas les autres.
- ❌ Les textes de justification font partie du contrat testé : les reformuler impose de mettre à jour les tests.
- ❌ Le catalogue est générique : les noms de produits concrets (Make, n8n, Zapier…) ne sont pas proposés.
