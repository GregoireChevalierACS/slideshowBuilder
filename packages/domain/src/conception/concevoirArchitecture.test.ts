import { describe, expect, it } from 'vitest';
import { unOutil, unProfil } from '../testing/fabriques.js';
import { concevoirArchitecture } from './concevoirArchitecture.js';
import { concevoirSolution } from './concevoirSolution.js';

describe('concevoirArchitecture', () => {
  it('propose une solution par processus, dans l’ordre de saisie', () => {
    const architecture = concevoirArchitecture([
      { nom: 'Relances', profil: unProfil({ nature: 'relance' }) },
      { nom: 'Devis', profil: unProfil({ nature: 'generation-de-document' }) },
    ]);

    expect(architecture.solutions.map((s) => s.nom)).toStrictEqual(['Relances', 'Devis']);
    expect(architecture.solutions[0]?.solution).toStrictEqual(
      concevoirSolution(unProfil({ nature: 'relance' })),
    );
  });

  it('liste chaque outil une fois, dans l’ordre où il apparaît', () => {
    const crm = unOutil('webhook', 'crm', 'HubSpot');
    const compta = unOutil('api', 'comptabilite', 'Pennylane');
    const mail = unOutil('email', 'messagerie', 'Outlook');

    const architecture = concevoirArchitecture([
      { nom: 'Devis', profil: unProfil({ source: crm, cible: compta }) },
      { nom: 'Relances', profil: unProfil({ source: compta, cible: mail }) },
      { nom: 'Tri', profil: unProfil({ source: mail, cible: mail }) },
    ]);

    expect(architecture.outils.map((o) => o.nom)).toStrictEqual([
      'HubSpot',
      'Pennylane',
      'Outlook',
    ]);
  });

  it('montre quelles briques sont mutualisées entre processus, dans l’ordre du catalogue', () => {
    const architecture = concevoirArchitecture([
      { nom: 'Relances', profil: unProfil({ nature: 'relance' }) },
      { nom: 'Rapprochement', profil: unProfil({ nature: 'rapprochement' }) },
    ]);

    expect(
      architecture.briques.map(({ brique, processus }) => [brique.id, processus]),
    ).toStrictEqual([
      ['planificateur', ['Relances', 'Rapprochement']],
      ['api', ['Relances', 'Rapprochement']],
      ['generation-documents', ['Relances']],
      ['rapprochement-regles', ['Rapprochement']],
      ['notification', ['Relances']],
      ['journal-reprise', ['Relances', 'Rapprochement']],
    ]);
  });

  it("signale si l'architecture fait appel à l'IA", () => {
    expect(
      concevoirArchitecture([{ nom: 'Tri', profil: unProfil({ nature: 'tri' }) }]).utiliseIA,
    ).toBe(true);
    expect(concevoirArchitecture([{ nom: 'Transfert', profil: unProfil() }]).utiliseIA).toBe(false);
  });

  it('reste vide sans processus', () => {
    expect(concevoirArchitecture([])).toStrictEqual({
      solutions: [],
      outils: [],
      briques: [],
      utiliseIA: false,
    });
  });
});
