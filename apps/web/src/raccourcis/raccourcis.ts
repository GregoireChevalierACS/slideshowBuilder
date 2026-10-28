import { z } from 'zod';

export const ACTIONS_CLAVIER = [
  'nouveauDiagnostic',
  'nouveauProcessus',
  'processusPrecedent',
  'processusSuivant',
  'sectionSuivante',
] as const;

export type ActionClavier = (typeof ACTIONS_CLAVIER)[number];

export const LIBELLES_DES_ACTIONS: Readonly<Record<ActionClavier, string>> = {
  nouveauDiagnostic: 'Nouveau diagnostic (accueil)',
  nouveauProcessus: 'Nouveau processus',
  processusPrecedent: 'Processus précédent',
  processusSuivant: 'Processus suivant',
  sectionSuivante: 'Section suivante du formulaire',
};

export interface Raccourci {
  /** `KeyboardEvent.key`, en minuscule pour une lettre : « n », « ArrowUp », « Enter ». */
  readonly touche: string;
  readonly ctrl: boolean;
  readonly alt: boolean;
  readonly maj: boolean;
}

export type Raccourcis = Readonly<Record<ActionClavier, Raccourci>>;

const simple = (touche: string, modificateurs: Partial<Raccourci> = {}): Raccourci => ({
  touche,
  ctrl: false,
  alt: false,
  maj: false,
  ...modificateurs,
});

export const RACCOURCIS_PAR_DEFAUT: Raccourcis = {
  nouveauDiagnostic: simple('n'),
  nouveauProcessus: simple('n', { alt: true }),
  processusPrecedent: simple('ArrowUp', { alt: true }),
  processusSuivant: simple('ArrowDown', { alt: true }),
  sectionSuivante: simple('Enter', { ctrl: true }),
};

type Evenement = Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'altKey' | 'shiftKey'>;

const NOMS_DES_TOUCHES: Readonly<Record<string, string>> = {
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  Enter: 'Entrée',
  Escape: 'Échap',
  ' ': 'Espace',
};

/** Une lettre est comparée sans tenir compte de la casse (Maj est un modificateur à part). */
const normaliser = (touche: string): string =>
  touche.length === 1 ? touche.toLowerCase() : touche;

export const libelle = (r: Raccourci): string => {
  const touche =
    NOMS_DES_TOUCHES[r.touche] ?? (r.touche.length === 1 ? r.touche.toUpperCase() : r.touche);
  return [r.ctrl && 'Ctrl', r.alt && 'Alt', r.maj && 'Maj', touche].filter(Boolean).join('+');
};

export const correspond = (evenement: Evenement, r: Raccourci): boolean =>
  normaliser(evenement.key) === normaliser(r.touche) &&
  evenement.ctrlKey === r.ctrl &&
  evenement.altKey === r.alt &&
  evenement.shiftKey === r.maj;

const MODIFICATEURS = new Set(['Control', 'Alt', 'Shift', 'Meta']);

/** La combinaison tapée dans les paramètres ; rien tant que seul un modificateur est enfoncé. */
export const depuisEvenement = (evenement: Evenement): Raccourci | undefined =>
  MODIFICATEURS.has(evenement.key)
    ? undefined
    : {
        touche: normaliser(evenement.key),
        ctrl: evenement.ctrlKey,
        alt: evenement.altKey,
        maj: evenement.shiftKey,
      };

/** Les groupes d'actions qui partagent une même combinaison : à corriger avant d'enregistrer. */
/** Au moins deux actions : un conflit a toujours un premier et un second membre. */
export type GroupeEnConflit = [ActionClavier, ActionClavier, ...ActionClavier[]];

const estEnConflit = (actions: ActionClavier[]): actions is GroupeEnConflit => actions.length > 1;

export const conflits = (raccourcis: Raccourcis): GroupeEnConflit[] => {
  const parCombinaison = new Map<string, ActionClavier[]>();
  for (const action of ACTIONS_CLAVIER) {
    const r = raccourcis[action];
    const cle = JSON.stringify([r.ctrl, r.alt, r.maj, normaliser(r.touche)]);
    parCombinaison.set(cle, [...(parCombinaison.get(cle) ?? []), action]);
  }
  return [...parCombinaison.values()].filter(estEnConflit);
};

// --- Stockage dans le navigateur : une préférence de cette machine, jamais une donnée métier. ---

const CLE = 'slideshow.raccourcis';

const schemaDeRaccourci = z.strictObject({
  touche: z.string().min(1),
  ctrl: z.boolean(),
  alt: z.boolean(),
  maj: z.boolean(),
});

const schemaStocke = z.strictObject(
  Object.fromEntries(ACTIONS_CLAVIER.map((action) => [action, schemaDeRaccourci.exactOptional()])),
);

/** Toujours une configuration complète : un stockage absent ou abîmé rend les valeurs par défaut. */
export const chargerLesRaccourcis = (
  stockage: Pick<Storage, 'getItem'> | undefined,
): Raccourcis => {
  try {
    const texte = stockage?.getItem(CLE);
    if (texte === null || texte === undefined) return RACCOURCIS_PAR_DEFAUT;
    const lu = schemaStocke.safeParse(JSON.parse(texte));
    return lu.success ? { ...RACCOURCIS_PAR_DEFAUT, ...lu.data } : RACCOURCIS_PAR_DEFAUT;
  } catch {
    return RACCOURCIS_PAR_DEFAUT;
  }
};

/** Faux si le navigateur refuse (navigation privée, quota) : l'interface le signale sans planter. */
export const enregistrerLesRaccourcis = (
  stockage: Pick<Storage, 'setItem'> | undefined,
  raccourcis: Raccourcis,
): boolean => {
  try {
    if (stockage === undefined) return false;
    stockage.setItem(CLE, JSON.stringify(raccourcis));
    return true;
  } catch {
    return false;
  }
};
