import type { DiapositiveArchitecture } from '@slideshow/domain';
import { disposerLeSchema, HAUTEUR_DU_SCHEMA, LARGEUR_DU_SCHEMA } from './schema.js';

/**
 * Le schéma dessiné à partir de sa mise en page calculée (testée dans schema.test.ts). Le texte des
 * boîtes est du HTML (foreignObject) : contrairement au texte SVG, il revient à la ligne, et le
 * parcours E2E peut vérifier qu'il ne déborde pas.
 */
export const SchemaDArchitecture = ({
  diapositive,
}: {
  readonly diapositive: DiapositiveArchitecture;
}) => {
  const { outils, familles, liens } = disposerLeSchema(diapositive);
  return (
    <svg
      className="schema"
      viewBox={`0 0 ${String(LARGEUR_DU_SCHEMA)} ${String(HAUTEUR_DU_SCHEMA)}`}
      role="img"
      aria-label="Schéma de l’architecture proposée"
    >
      {liens.map((lien) => (
        <line key={`${String(lien.y1)}-${String(lien.y2)}`} className="lien" {...lien} />
      ))}
      {outils.map((o) => (
        <foreignObject key={o.nom} x={o.x} y={o.y} width={o.largeur} height={o.hauteur}>
          <div className="boite boite-outil">{o.nom}</div>
        </foreignObject>
      ))}
      {familles.map((f) => (
        <foreignObject key={f.libelle} x={f.x} y={f.y} width={f.largeur} height={f.hauteur}>
          <div className={f.ia ? 'boite boite-famille boite-ia' : 'boite boite-famille'}>
            {/* Un seul paragraphe : la liste suit le libellé et revient à la ligne sans en ajouter. */}
            <p>
              <strong>{f.libelle}</strong>
              {f.ia && <span className="ia"> · IA</span>} —{' '}
              <span className="detail">{f.detail}</span>
            </p>
          </div>
        </foreignObject>
      ))}
    </svg>
  );
};
