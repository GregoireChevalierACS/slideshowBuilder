// Composition root de l'interface : seul endroit qui choisit le vrai client et le vrai stockage.
// Vérifié par le parcours E2E, pas par les tests de composants.

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { creerLeClientDeLApi } from './api/clientDeLApi.js';
import { App } from './App.js';
import './styles.css';

/** Le stockage peut être refusé (navigation privée, réglages) : l'interface fonctionne sans. */
const stockageDuNavigateur = (): Storage | undefined => {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
};

const racine = document.getElementById('racine');
if (racine === null) throw new Error('Élément #racine absent de index.html');

createRoot(racine).render(
  <StrictMode>
    <App client={creerLeClientDeLApi()} stockage={stockageDuNavigateur()} />
  </StrictMode>,
);
