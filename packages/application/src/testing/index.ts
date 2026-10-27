// Outils de test partagés avec les adapters (contrat du dépôt, Fakes, saisies). Exposés sous
// « @slideshow/application/testing », uniquement par la condition « source » : jamais livrés.

export { verifierLeContratDuDepotDeDiagnostics } from './contratDuDepotDeDiagnostics.js';
export { DepotEnMemoire } from './DepotEnMemoire.js';
export { HorlogeFixe, IdentifiantsSequentiels } from './fakes.js';
export { uneSaisieDeDiagnostic, uneSaisieDeProcessus } from './saisies.js';
