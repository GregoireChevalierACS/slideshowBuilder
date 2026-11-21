# 0014 — Police embarquée

- **Date :** 2026-11-21
- **Statut :** acceptée
- **Complète :** [ADR 0010](0010-rendu-de-la-presentation.md)

## Contexte

Les diapositives sont contrôlées par un test E2E de débordement, avec une réserve de 10 % en bas de chaque diapositive. Cette réserve absorbait l'écart entre la police système de Windows (Segoe UI) et celle de remplacement sous le Linux de la CI. Ce n'est plus suffisant : sur la diapositive des options, un point de 40 caractères tient sur une ligne sous Windows et passe sur deux sous Linux. La CI échouait alors que la diapositive passait localement avec une marge confortable.

Le même écart existe chez le client : le PDF qu'il reçoit dépend de la machine qui l'a produit.

## Décision

- **La police Inter est embarquée dans l'interface** : paquet `@fontsource-variable/inter` 5.3.0, licence OFL-1.1, police variable servie par l'application, sans réseau. Elle passe en tête de la pile de polices, devant les polices système, qui ne servent plus qu'en secours.
- **Le contrôle E2E attend le chargement des polices** (`document.fonts.ready`) avant de mesurer. Sans cela, il mesurerait la police de secours affichée pendant le chargement.
- La réserve de 10 % est conservée : elle couvre désormais les petits écarts de rendu, et non plus un changement de police.

## Alternatives écartées

- **Réduire encore les tailles ou les limites de saisie** : repousse le problème sans le résoudre, au prix de points plus courts à la saisie, et le PDF continue de varier d'une machine à l'autre.
- **Épingler l'image de CI** (`ubuntu-24.04`) : stabilise la CI, mais ne la rend pas identique au poste du présentateur.
- **Charger la police depuis un service en ligne** : l'application doit fonctionner sans réseau en rendez-vous, et une page locale ne doit rien demander à un tiers.

## Conséquences

- ✅ Même rendu sous Windows, sous Linux et dans le PDF : ce que le test mesure est ce que le client voit.
- ✅ Les mesures locales valent pour la CI.
- ❌ Une dépendance de plus, à surveiller comme les autres (Dependabot, quarantaine de 3 jours).
- ❌ Environ 100 Kio de polices dans le livrable, chargées uniquement pour les alphabets affichés.
