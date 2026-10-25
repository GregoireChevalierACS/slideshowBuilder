# 0004 — Modèle de calcul des gains

- **Date :** 2026-10-25
- **Statut :** acceptée

## Contexte

Les gains sont le cœur du pitch : un dirigeant doit pouvoir refaire chaque calcul à la main et retrouver les chiffres de la diapositive. Une ambiguïté de saisie ou un arrondi incohérent suffit à décrédibiliser toute la démarche.

## Décision

Pour chaque processus redondant :

```
occurrences/an   = fréquence × (jours travaillés | jours travaillés / 5 | 12 | 1)
temps actuel/an  = durée unitaire × occurrences/an × effectif
temps gagné/an   = temps actuel × taux d'automatisation      (taux bas et taux haut)
valeur gagnée/an = temps gagné × coût horaire chargé
ETP libérés      = temps gagné total / heures annuelles d'un temps plein
```

- **La fréquence est toujours exprimée par personne.** L'effectif multiplie ensuite le temps. Pas de saisie « pour l'équipe », pour supprimer l'ambiguïté qui multiplierait par erreur un gain par l'effectif.
- **Fourchette :** chaque processus a un taux bas (prudent) et un taux haut (optimiste). Le taux bas ne peut pas dépasser le taux haut.
- **Coût horaire (Strategy) :** saisi directement, ou déduit du salaire brut annuel × coefficient de charges (1,45 par défaut) / heures annuelles. Il est défini par processus, car une heure de comptable ne coûte pas une heure de direction.
- **Hypothèses par défaut :** 228 jours travaillés (365 − 104 − 25 − 8), 1 607 h par an (durée légale), modifiables pour chaque client.
- **Arrondis :** tout est calculé sans arrondi, puis chaque colonne (temps, valeur, bas, haut) est arrondie une seule fois avec la méthode du plus fort reste. La somme des lignes affichées vaut toujours le total affiché.
- **Alertes de cohérence :** une personne qui passerait plus d'un temps plein par an sur une seule tâche déclenche une alerte. C'est presque toujours un volume d'équipe saisi comme une fréquence par personne.
- Les **scénarios de référence** (`scenarios.test.ts`) sont le critère d'acceptation : entreprises réalistes, valeurs calculées à la main.

## Alternatives écartées

- **Fréquence par personne ou par équipe, au choix** : plus souple, mais crée exactement l'ambiguïté qu'on veut éviter devant le client.
- **Un taux unique avec une marge fixe (± 20 %)** : la marge réelle dépend du processus, les taux bas et haut l'expriment mieux.
- **Arrondir chaque ligne indépendamment** : la somme des lignes peut différer du total d'un centime ou d'une seconde.

## Conséquences

- ✅ Chaque chiffre s'explique par une formule et des hypothèses visibles.
- ✅ Les propriétés (gain croissant avec l'effectif, bas ≤ haut, gain ≤ temps actuel, total indépendant de l'ordre) sont vérifiées sur des centaines de cas générés.
- ❌ Le retour sur investissement (coût de réalisation, maintenance, délai de retour) est **reporté** : les gains sont bruts.
- ❌ Une fréquence hebdomadaire donne des occurrences fractionnaires (45,6 semaines) : l'arrondi se fait à la seconde, sur le temps total du processus.
