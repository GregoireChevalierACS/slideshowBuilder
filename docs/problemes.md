# Catalogue des types de problème

Toutes les erreurs de l'API sont au format Problem Details ([RFC 9457](https://www.rfc-editor.org/rfc/rfc9457)), type de contenu `application/problem+json`. Le `type` est stable : un client peut le tester. Le `detail` est destiné à un humain et peut changer.

| `type`                              | Statut | Cause                                                                                                                     | Réaction attendue du client                                      |
| ----------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `/problemes/requete-invalide`       | 400    | Structure invalide : champ manquant, mauvais type, champ inconnu, JSON illisible. `erreurs` liste chaque chemin en cause. | Corriger la requête : c'est un bug du client.                    |
| `/problemes/saisie-invalide`        | 422    | Une règle métier refuse une valeur. `champ` désigne le champ (`processus[1].tauxBas`), `erreur.kind` la règle.            | Afficher l'erreur à côté du champ.                               |
| `/problemes/diagnostic-introuvable` | 404    | Diagnostic ou version inexistants, ou identifiant mal formé.                                                              | Revenir à la liste des diagnostics.                              |
| `/problemes/version-perimee`        | 409    | La version révisée n'est plus la dernière (autre onglet, autre fenêtre). `versionActuelle` donne la dernière.             | Recharger la version actuelle, puis réappliquer la modification. |
| `/problemes/hote-refuse`            | 403    | Requête adressée à un autre nom que `127.0.0.1` ou `localhost` (protection contre le DNS rebinding).                      | Aucune : seule une page malveillante déclenche ce cas.           |
| `/problemes/route-inconnue`         | 404    | Méthode ou chemin inexistants.                                                                                            | Corriger l'appel : c'est un bug du client.                       |
| `/problemes/erreur-interne`         | 500    | Panne : stock corrompu, bug. Le détail n'est jamais renvoyé, il est journalisé.                                           | Réessayer plus tard ; consulter les journaux du serveur.         |
