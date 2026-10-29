# 0010 — Rendu de la présentation, plein écran et PDF

- **Date :** 2026-10-29
- **Statut :** acceptée

## Contexte

Le domaine décrit le deck en données (ADR 0006). Il faut le rendre lisible devant un client — en plein écran pendant le rendez-vous, puis en PDF à lui laisser — sans qu'aucune diapositive ne déborde, quel que soit le nombre de processus.

## Décision

- **Un seul rendu** : chaque diapositive est un composant React sur une toile 16:9 dont toutes les tailles sont exprimées en largeur de toile (`cqw`). La même diapositive se met à l'échelle d'elle-même : miniature d'aperçu, plein écran, page PDF.
- **Le deck est construit dans le navigateur** à partir d'une **version enregistrée** du diagnostic : une version donnée produit toujours exactement les mêmes diapositives.
- **Pagination à l'affichage** : les listes longues (tableau, gains, feuille de route, hypothèses, processus observés) sont réparties sur plusieurs pages numérotées ; le total figure sur la dernière. Les données du domaine ne changent pas.
- **Schéma d'architecture en SVG maison** : une mise en page calculée par une fonction pure (outils à gauche, familles de briques à droite, liens vers les connecteurs), testée par propriété (tout tient, rien ne se chevauche) ; le texte des boîtes est du HTML (`foreignObject`) pour revenir à la ligne. Pas de Mermaid (≈ 1 Mo, rendu asynchrone, mise en page difficile à maîtriser en PDF).
- **PDF par l'impression du navigateur** : une feuille de style d'impression, une diapositive par page au format 16:9. Aucune dépendance lourde côté serveur.
- **Vue présentateur** dans une seconde fenêtre, synchronisée par `BroadcastChannel` (messages validés) : diapositive affichée, suivante, notes — dont les alertes de cohérence — et chronomètre. Elle pilote l'écran principal au clavier.
- **Critère de fin vérifié par Playwright contre le livrable** : un deck chargé (12 processus aux noms longs) se présente au clavier ; aucune diapositive ni aucune boîte du schéma ne déborde, pour les deux publics ; le vrai PDF compte une page par diapositive et ne contient aucune note du présentateur. Ce contrôle remplace des captures au pixel près, qui dépendent des polices du système.

## Alternatives écartées

- **PDF généré côté serveur (Chromium embarqué)** : environ 150 Mo de plus dans le livrable, pour un résultat identique à l'impression du navigateur.
- **Bibliothèque de présentation (Reveal.js…)** : le deck est déjà décrit en données ; il ne restait que la mise en page, plus simple à maîtriser soi-même.
- **Captures de référence au pixel près** : fausses d'une machine à l'autre (polices, rendu des textes).

## Conséquences

- ✅ Ce qui est vu en rendez-vous et ce qui est envoyé en PDF sont strictement les mêmes diapositives.
- ✅ Un débordement est détecté automatiquement, et l'a été deux fois pendant la mise au point.
- ❌ La qualité du PDF dépend du navigateur (testée sur Chromium) ; « Enregistrer en PDF » reste un geste manuel.
