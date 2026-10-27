import { verifierLeContratDuDepotDeDiagnostics } from './contratDuDepotDeDiagnostics.js';
import { DepotEnMemoire } from './DepotEnMemoire.js';

verifierLeContratDuDepotDeDiagnostics('en mémoire', () => new DepotEnMemoire());
