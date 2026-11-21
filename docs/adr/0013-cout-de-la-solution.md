# 0013 — Coût de la solution et coût par heure récupérée

- **Date :** 2026-11-21
- **Statut :** acceptée
- **Complète :** [ADR 0004](0004-modele-de-calcul-des-gains.md), dont il ferme le point « retour sur investissement reporté »

## Contexte

Les gains seuls ne suffisent pas à décider. Sur le premier cas de terrain, la question du dirigeant est concrète : héberger l'automatisation au bureau ou dans le cloud, combien coûte la mise en place, combien chaque mois, et combien sur la durée. Son critère est le temps qu'il récupère, plus que l'argent.

## Décision

- **Une option de déploiement** (`OptionDeDeploiement`) comprend :
  - un nom, d'au plus 40 caractères ;
  - un forfait de mise en place et un matériel, payés une fois ;
  - des frais mensuels en fourchette (bas ≤ haut) ;
  - ce qui est inclus et les limites : au plus 3 points de 40 caractères chacun.

  Un diagnostic compare **au plus 3 options**, de noms distincts.

- **Chiffrage** (`chiffrerLesOptions`), pour chaque option :

  ```
  coût sur 1 an    = mise en place + matériel + 12 × frais mensuels        (bas et haut)
  coût sur 3 ans   = mise en place + matériel + 36 × frais mensuels        (bas et haut)
  coût par heure   = coût sur 3 ans ÷ (3 × temps gagné par an)
  ```

  La fourchette du coût par heure va de l'hypothèse favorable (frais bas, gain haut) à l'hypothèse prudente (frais hauts, gain bas). Sans heure gagnée dans une hypothèse, le coût par heure n'a pas de borne : il est absent plutôt que divisé par zéro.

- **On compare sur 3 ans**, la durée de vie d'un petit matériel ou d'un engagement d'abonnement. Une durée plus courte avantage toujours l'option sans matériel.
- **Le temps gagné compté est celui des tâches faites aujourd'hui.** Le travail rattrapé (une tâche abandonnée que l'automatisation remet en place) ne fait pas baisser le coût par heure. Il sera présenté à part.
- **Deck** : une diapositive `Options`, juste après « Gains attendus », dans toutes les versions dès qu'au moins une option est saisie. Une colonne par option, avec son coût par heure, ses coûts sur 3 ans et la première année, ce qui est inclus et ses limites. La formule est dans les notes du présentateur.
- **Les limites de longueur viennent de la mesure** : avec 3 options, des noms et des points à la limite, le contrôle E2E de débordement passe, réserve de 10 % comprise. Des limites plus larges (4 points de 80 caractères) faisaient déborder la diapositive de 40 %.
- **Saisie** :
  - une section « Options d'hébergement » dans l'entretien, avec le chiffrage recalculé à chaque frappe par le domaine ;
  - trois modèles de départ (« Au bureau », « Dans le cloud », « Offre type agence », sans nom de concurrent), dont les montants sont à 0 : ce sont les tarifs du présentateur ;
  - `options` est facultatif dans le format de saisie et absent quand il n'y en a pas. Le fichier d'export passe en **format 3**.

## Alternatives écartées

- **Un délai de retour sur investissement en euros** : il demande de valoriser l'heure du dirigeant, une donnée que le client ne donne pas toujours et qui fait débat. Le coût par heure récupérée se compare sans elle. Il reste possible de l'ajouter quand la valeur de l'heure est connue.
- **Un nombre d'années réglable** : il ouvre la porte au choix de la durée qui arrange la conclusion. Trois ans, fixes et annoncés, sont plus honnêtes à présenter.
- **Des tarifs par défaut dans les modèles** : ils finiraient sur une diapositive sans avoir été vérifiés.
- **Des listes libres, sans limite** : la diapositive à trois colonnes débordait. La limite est dans le domaine, pour que la saisie la signale au lieu que la présentation la découvre.

## Conséquences

- ✅ La réunion peut trancher « au bureau ou dans le cloud » sur des chiffres recalculables à la main.
- ✅ Même saisie, mêmes options : même deck (propriété étendue).
- ❌ Les points « inclus » et « limites » doivent être courts : 3 points de 40 caractères par liste.
- ❌ Un export en format 3 ne s'importe pas dans une version antérieure de l'application.
