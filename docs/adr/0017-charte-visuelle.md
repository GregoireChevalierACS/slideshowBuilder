# 0017 — Charte visuelle du deck et de l'interface

- **Date :** 2026-11-23
- **Statut :** acceptée
- **Complète :** [ADR 0010](0010-rendu-de-la-presentation.md) et [ADR 0014](0014-police-embarquee.md)

## Contexte

Le deck est remis au client en PDF : il doit avoir la tenue d'un document de conseil, pas d'un export d'outil. La revue visuelle de la phase 8 a relevé :

- **des diapositives sans repère** : ni rubrique, ni numéro de page, ni nom du document ;
- **des chiffres mal alignés**, et un séparateur de milliers invisible après un « 1 » (« 1514 € » à côté de « 7 812 € ») ;
- **des miniatures illisibles** sur l'écran de lancement et dans la vue présentateur, où le texte était aussi grand qu'en plein écran. Aucun test ne le voyait, car le contrôle de débordement ne regardait que le PDF.

## Décision

- **Une toile par diapositive** (`.toile`) sert de conteneur aux mesures en `cqw`. La diapositive se met à l'échelle de la place qu'on lui donne : miniature, plein écran ou page PDF. Un test E2E vérifie qu'aucune réduction ne déborde de son cadre.
- **Un cadre commun aux diapositives de contenu** :
  - une rubrique au-dessus du titre, qui donne le fil du récit (le constat, la solution, les gains, la suite, l'annexe) ;
  - un titre en encre sombre, souligné d'un filet ;
  - en présentation et dans le PDF, un pied de page avec le prospect, le nom du document et le numéro de page.
- **Une encre et un seul accent** : encre `#14213d`, accent `#1f5fbf` avec sa version pâle pour les fonds. Le vert est réservé au positif : ce qui est inclus, le travail rattrapé, l'automatisation complète. La page de titre seule prend la couleur du prospect, en bande verticale (ADR 0016).
- **Les chiffres** :
  - les nombres utilisent des chiffres tabulaires, ce qui aligne les colonnes et rend visible le séparateur de milliers ;
  - les montants des tableaux sont alignés à droite et les totaux soulignés ;
  - les chiffres clés sont présentés en tuiles.
- **Le niveau d'automatisation est un badge coloré** (complète, assistée, notification), identique dans la feuille de route et sur les solutions.
- **L'interface reprend la même encre et le même accent** : une barre de navigation qui indique l'écran courant, un bouton principal par écran, et le panneau « En direct » coiffé d'un bandeau.
- **Le contrôle de débordement reste le juge** : chaque gabarit a été recompacté jusqu'à le passer, réserve de 10 % comprise, sur le diagnostic volontairement chargé.

## Alternatives écartées

- **Une bibliothèque de composants ou un framework CSS** : un seul fichier de styles et des jetons de couleur suffisent, sans dépendance ni surcharge.
- **La couleur du prospect sur tout le deck** : déjà écartée par l'ADR 0016, pour la lisibilité.
- **Des captures d'écran de référence** : écartées par l'ADR 0010 pour leur fragilité d'une machine à l'autre. Le contrôle mesuré, étendu aux miniatures, est plus robuste.

## Conséquences

- ✅ Un deck d'aspect professionnel, cohérent d'une diapositive à l'autre et avec l'outil.
- ✅ Les miniatures sont fiables, et un test les tient.
- ❌ Le pied de page et la rubrique prennent de la hauteur : les gabarits les plus denses (gains, observation) sont un peu plus serrés.
