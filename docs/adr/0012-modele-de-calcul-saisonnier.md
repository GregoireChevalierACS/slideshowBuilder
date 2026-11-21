# 0012 — Modèle de calcul saisonnier

- **Date :** 2026-11-20
- **Statut :** acceptée
- **Complète :** [ADR 0004](0004-modele-de-calcul-des-gains.md)

## Contexte

Le modèle de l'ADR 0004 répartit chaque tâche uniformément sur les jours travaillés. Certaines activités se jouent sur quelques semaines par an : rénovation, tourisme, comptabilité de clôture. Une moyenne lissée sur l'année sous-estime la charge de la saison, c'est-à-dire le moment où le dirigeant manque de temps.

Le premier cas de terrain, un artisan dont l'activité se concentre sur 13 semaines, s'est saisi en deux lignes par processus (en saison et hors saison, chacune ramenée à une fréquence annuelle). Ce contournement double la saisie, impose des calculs à la main pendant l'entretien et arrondit les fréquences, puisqu'elles étaient entières.

## Décision

- **Les hypothèses de calcul reçoivent un nombre de semaines de pointe** (0 par défaut, au plus jours travaillés ÷ 5). Elles partagent les jours travaillés : 13 semaines de pointe sur 228 jours font 65 jours en saison et 163 jours hors saison.
- **La fréquence d'un processus est régulière ou saisonnière** (`RepartitionDeFrequence`) :
  - régulière : un nombre par jour, semaine, mois ou an, comme avant ;
  - saisonnière : un nombre en saison et un autre hors saison, par jour ou par semaine seulement, puisqu'un mois ou une année traverserait la saison. L'une des deux valeurs peut être nulle, pour une activité qui n'existe qu'en saison, mais pas les deux.

  ```
  occurrences/an (par jour)     = en saison × jours en saison + hors saison × jours hors saison
  occurrences/an (par semaine)  = (en saison × jours en saison + hors saison × jours hors saison) / 5
  ```

- **Une fréquence accepte une décimale** (1,5 par semaine), mais pas davantage : « 1,25 » ne se mesure pas en entretien. Les valeurs négatives et une fréquence totale nulle sont refusées.
- **Calcul exact en nombres entiers** : chaque fréquence est comptée en dixièmes, multipliée par des jours (entiers), puis divisée une seule fois. Une fréquence saisonnière dont les deux valeurs sont égales donne donc **exactement** le même résultat que la fréquence régulière, sans écart de virgule flottante. Cette propriété est vérifiée sur des cas générés.
- **Scénario de référence « artisan saisonnier »**, calculé à la main dans `scenarios.test.ts`. Il vérifie aussi que 6 lignes saisonnières donnent exactement les mêmes totaux que le contournement en 12 lignes.
- **Format de saisie** : `frequence` devient `{ nombre, periode }` ou `{ enSaison, horsSaison, periode }`, et `hypotheses.semainesDePointe` est facultatif, absent quand il vaut 0. Les saisies existantes restent valides sans migration de la base. Le fichier d'export passe en **format 2**, pour qu'une version antérieure de l'application refuse un fichier récent avec un message clair ; les fichiers au format 1 restent importables.
- **Interface** : une case « Activité saisonnière » à la fin de la section « Combien », pour que le cas courant (fréquence régulière) se saisisse au clavier sans passer par elle, et un champ « Semaines de pointe » dans les hypothèses. La diapositive des hypothèses affiche la répartition des jours quand il y a une saison.

## Alternatives écartées

- **Une saison par processus** (ses propres dates ou son nombre de semaines) : plus fin, mais aucun cas de terrain ne l'exige, et la diapositive des hypothèses deviendrait illisible. La saison est celle de l'entreprise.
- **Des saisons multiples ou un profil mois par mois** : disproportionné pour une estimation présentée en fourchette.
- **Garder le contournement en deux lignes** : double la saisie et le deck, et laisse le client additionner lui-même.
- **Une tolérance pour reconnaître une décimale** (écart inférieur à 10⁻⁹) : elle laissait un mutant équivalent ; diviser les dixièmes arrondis et comparer à la valeur saisie est exact.

## Conséquences

- ✅ Une activité saisonnière se saisit en une ligne par processus, et la charge de la saison est visible.
- ✅ Sans semaine de pointe, rien ne change : les diagnostics existants donnent les mêmes chiffres.
- ❌ Un processus saisonnier saisi sans semaine de pointe dans les hypothèses n'utilise que sa valeur hors saison. L'interface l'indique sous la case.
- ❌ Le format de saisie a évolué : un export en format 2 ne s'importe pas dans une version antérieure de l'application.
