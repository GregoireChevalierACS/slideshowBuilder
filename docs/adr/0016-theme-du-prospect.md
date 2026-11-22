# 0016 — Thème du prospect

- **Date :** 2026-11-22
- **Statut :** acceptée

## Contexte

Une présentation aux couleurs du prospect montre qu'elle a été préparée pour lui. Mais une couleur de marque est rarement choisie pour du texte sur fond blanc : un jaune ou un vert clair rendrait la page de titre illisible, à l'écran comme dans le PDF.

## Décision

- **La page de titre affiche la couleur principale et le logo du prospect**, tous deux facultatifs. Le reste du deck garde les couleurs de l'application.
- **La couleur est rendue lisible par le domaine.** Si son contraste sur fond blanc est inférieur à 4,5 (WCAG 2, niveau AA), elle est assombrie par paliers de 5 %, en gardant sa teinte, jusqu'à l'atteindre. Une propriété vérifie que le résultat est toujours lisible. Le présentateur est prévenu par une note (« #ffd400 a été assombrie en #8c7500 »), et la saisie l'indique sous le champ.
- **Le logo est une image PNG, JPEG ou WebP**, en URL de données d'au plus 200 000 caractères, soit environ 150 Kio. Les SVG sont refusés, car ils peuvent embarquer du script. L'image est stockée avec la saisie : elle s'affiche sans réseau et suit les exports.
- **Saisie** : une entrée « Thème de la présentation » dans l'entretien, avec un aperçu de la page de titre. Le champ `theme` est absent de la saisie quand il n'y a ni couleur ni logo. Le fichier d'export passe en **format 5**.
- Les champs facultatifs de la saisie (`options`, `theme`) sont recomposés par une seule fonction de l'interface. Le test qui l'accompagne a trouvé qu'une modification des options effaçait le thème.

## Alternatives écartées

- **Appliquer la couleur à tout le deck** : plus de surface où la lisibilité se joue, pour un bénéfice faible. La page de titre suffit à personnaliser.
- **Refuser une couleur peu lisible** : le présentateur saisit la couleur de la marque, pas une couleur choisie pour le contraste. L'assombrir garde la teinte reconnaissable.
- **Stocker le logo à part, hors des versions** : évite de le dupliquer dans chaque version, mais une présentation régénérée depuis une ancienne version n'aurait plus le logo de l'époque, et il faudrait un second stockage à sauvegarder.

## Conséquences

- ✅ La page de titre est aux couleurs du prospect et reste lisible, quelle que soit la couleur saisie.
- ❌ Le logo est répété dans chaque version enregistrée : jusqu'à 200 Ko par version, soit quelques dizaines de Mo pour un long entretien.
- ❌ Un export en format 5 ne s'importe pas dans une version antérieure de l'application.
