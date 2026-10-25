// API publique du domaine : seul ce fichier est importable depuis les autres paquets.

export { err, ok, type Result } from './Result.js';

export { CoutHoraire, type CoefficientDeChargesInvalide } from './gains/CoutHoraire.js';
export { Duree, type DureeInvalide } from './gains/Duree.js';
export { Effectif, type EffectifInvalide } from './gains/Effectif.js';
export {
  estimerGains,
  type AlerteDeCoherence,
  type EstimationDeGains,
  type Fourchette,
  type GainDUnProcessus,
  type TotalDesGains,
} from './gains/estimerGains.js';
export { Frequence, type FrequenceInvalide, type Periode } from './gains/Frequence.js';
export { HypothesesDeCalcul, type HypothesesInvalides } from './gains/HypothesesDeCalcul.js';
export { Montant, type MontantInvalide } from './gains/Montant.js';
export { Pourcentage, type PourcentageInvalide } from './gains/Pourcentage.js';
export {
  ProcessusRedondant,
  type DescriptionDeProcessusRedondant,
  type ProcessusInvalide,
} from './gains/ProcessusRedondant.js';
