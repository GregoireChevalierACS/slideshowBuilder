# 0009 — Interface web et contrat d'échange partagé

- **Date :** 2026-10-28
- **Statut :** acceptée

## Contexte

L'interface sert pendant l'entretien : saisie rapide au clavier, chiffres visibles en direct, aucune perte de saisie. Elle doit rester cohérente avec les règles du serveur.

## Décision

- **Vite + React 19 + TypeScript**, CSS simple sans bibliothèque de composants : léger, et rien à apprendre pour reprendre le code.
- **Le domaine et la couche application tournent aussi dans le navigateur** (TypeScript pur, sans dépendance à Node) : calculs en direct et validation identiques à ceux du serveur, sans aller-retour réseau.
- **Contrat d'échange dans la couche application** : les schémas zod du format de saisie et des réponses de l'API y vivent. Le serveur s'en sert pour valider requêtes et stock, l'interface pour valider ce qu'elle reçoit, et un test vérifie que chaque réponse réelle du serveur respecte ce contrat. zod est la seule bibliothèque autorisée dans cette couche, explicitement nommée dans la règle d'architecture.
- **Client de l'API à `fetch` injecté** ; trois cas d'échec distingués : problème signalé (Problem Details), serveur injoignable, réponse hors contrat.
- **Navigation par l'ancre de l'URL** (`#/diagnostics/…`) : aucune configuration de routes côté serveur.
- **Raccourcis clavier modifiables** (écran Paramètres), conservés dans le stockage du navigateur : c'est une préférence de la machine, pas une donnée métier. Un stockage absent, illisible ou bloqué rend les valeurs par défaut sans planter ; les conflits sont signalés. Un raccourci sans Ctrl ni Alt est ignoré dans un champ de saisie.
- **En production, Fastify sert l'interface compilée** à la racine : une commande, un port, la même protection de l'en-tête `Host`. En développement, Vite relaie `/api` vers le serveur.
- **Couverture de 100 %** exigée sur l'interface aussi, par ses comportements (Testing Library) ; `main.tsx` est vérifié par le smoke test et le parcours E2E.

## Complément du 2026-10-28 : l'écran d'entretien

- **Sauvegarde automatique** un court instant après la dernière frappe, seulement si le domaine accepte la saisie (sinon le champ fautif est désigné et rien n'est envoyé). Les enregistrements sont sérialisés et partent de la dernière version connue ; un 409 affiche un bandeau qui propose de recharger ; quitter la page avec des modifications non enregistrées demande confirmation.
- **Les taux suivent la suggestion de la conception** quand le profil change, sauf si l'utilisateur s'en était écarté : un taux ajusté pendant l'entretien n'est jamais écrasé.
- **Les chiffres en direct** sont ceux du domaine, calculés dans le navigateur pour le processus seul (avec les hypothèses du diagnostic) et pour l'ensemble.
- **Critère de fin vérifié par un parcours Playwright** contre le livrable compilé, au clavier seul : ouverture, deux processus à partir de modèles, outils complétés, chiffres attendus, enregistrement et relecture après rechargement. Il a trouvé un vrai bug (un modèle réappliqué renommait le processus « … (2) » à cause de lui-même).

## Alternatives écartées

- **Bibliothèque de composants (MUI, Chakra…)** : poids et dépendances disproportionnés pour quelques formulaires.
- **Routeur (React Router)** : trois écrans, l'ancre suffit.
- **Bibliothèque de formulaires** : la validation existe déjà (domaine et zod), il ne reste que l'état local.
- **Dupliquer les schémas dans l'interface** : deux sources de vérité qui finiraient par diverger.

## Conséquences

- ✅ Les chiffres affichés pendant l'entretien sont calculés par le même code que la présentation.
- ✅ Une incompatibilité entre interface et serveur est détectée (« réponse inattendue ») au lieu de corrompre l'affichage.
- ❌ Le domaine embarqué alourdit le bundle (environ 100 Ko compressés avec zod) : acceptable en local.
