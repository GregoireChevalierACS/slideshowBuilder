# 0015 — Tâches abandonnées et travail rattrapé

- **Date :** 2026-11-21
- **Statut :** acceptée
- **Complète :** [ADR 0004](0004-modele-de-calcul-des-gains.md) et [ADR 0013](0013-cout-de-la-solution.md)

## Contexte

Certaines tâches ne sont plus faites, faute de temps : sur le premier cas de terrain, la relance des devis. Leur temps actuel vaut donc 0. Les compter comme les autres gonflerait le coût caché et le gain d'heures que personne ne passe aujourd'hui, et un dirigeant attentif le verrait aussitôt. Les ignorer ferait disparaître un vrai bénéfice : l'automatisation les remet en place.

## Décision

- **Un processus peut être marqué « n'est plus fait aujourd'hui »** (`abandonne`, faux par défaut).
- **Il sort du coût caché et du gain** : `estimerGains` chiffre à part les tâches faites (`parProcessus`, `total`) et les tâches abandonnées (`travailRattrape`), avec les mêmes formules et les mêmes arrondis. Pour une tâche abandonnée, le « temps actuel » est celui qu'il faudrait y passer, et le « temps gagné » la part que l'automatisation en ferait : c'est le **travail rattrapé**.
- **Il ne fait pas baisser le coût par heure récupérée** des options d'hébergement, qui ne compte que le temps gagné sur les tâches faites (ADR 0013).
- **Deck** :
  - la diapositive des gains présente le travail rattrapé dans une rubrique à part, hors du total, sur sa dernière page ;
  - les notes du présentateur rappellent l'effet commercial (devis signés, clients relancés), **sans le chiffrer** ;
  - le coût caché ne compte que les tâches faites ;
  - la tâche reste un chantier de la feuille de route, valorisée par ce qu'elle rattrape, et figure toujours dans l'observation, l'architecture et ses solutions.
- **Les alertes de cohérence** s'appliquent aussi aux tâches abandonnées : une fréquence saisie pour toute l'équipe s'y repère de la même façon.
- **Saisie** : une case « N'est plus faite aujourd'hui » à la fin de la section « Combien », hors du parcours clavier courant. Le champ `abandonne` n'apparaît que pour une tâche abandonnée. Le fichier d'export passe en **format 4**.

## Alternatives écartées

- **Chiffrer l'effet commercial** (taux de transformation des devis relancés) : c'est une hypothèse de chiffre d'affaires, invérifiable en rendez-vous et facile à contester. Elle se dit, elle ne s'additionne pas au gain.
- **Saisir la tâche avec un temps nul** : le gain disparaîtrait avec le temps actuel, et la feuille de route perdrait le chantier.
- **Une tâche abandonnée comme un processus à part entière, avec un drapeau dans les diapositives** : chaque consommateur de l'estimation aurait dû filtrer, au risque d'en oublier un dans un total.

## Conséquences

- ✅ Le total présenté ne compte que des heures réellement passées aujourd'hui.
- ✅ Le bénéfice d'une tâche reprise reste visible, sans être confondu avec le gain.
- ✅ Ajouter une tâche abandonnée ne change ni le coût caché ni le gain (propriété vérifiée).
- ❌ Un export en format 4 ne s'importe pas dans une version antérieure de l'application.
