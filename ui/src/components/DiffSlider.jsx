import { useState } from "react";

// Idée #80 — comparateur à curseur du rendu avant/après un tour (mode vision).
// L'image "après" est la base (donne la taille) ; l'image "avant" la recouvre en
// position absolue (même ratio 1280×800) et n'est révélée que sur ses `pos`%
// gauche via clip-path. Glisser le curseur dévoile le delta visuel.
export default function DiffSlider({ before, after }) {
  const [pos, setPos] = useState(50);
  return (
    <div className="self-start w-full max-w-[95%] rounded-xl overflow-hidden border border-edge shadow-sm">
      <div className="flex items-center gap-2 bg-panel px-3 py-1.5 text-[11px] font-semibold text-accent-soft">
        <span>Avant / Après</span>
        <span className="text-faint">·</span>
        <span className="text-faint tabular-nums">{pos}%</span>
      </div>
      <div className="relative w-full bg-white select-none">
        {/* Après = base (fixe la hauteur du conteneur) */}
        <img src={after} alt="Après" className="block w-full h-auto" draggable={false} />
        {/* Avant = surcouche révélée sur les `pos`% gauche */}
        <img
          src={before}
          alt="Avant"
          draggable={false}
          className="pointer-events-none absolute inset-0 block w-full h-full"
          style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
        />
        {/* Trait + poignée */}
        <div className="pointer-events-none absolute top-0 h-full w-0.5 bg-accent" style={{ left: `${pos}%` }}>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 grid h-6 w-6 place-items-center rounded-full border border-white bg-accent text-[10px] text-white shadow">
            ↔
          </div>
        </div>
        {/* Curseur transparent en plein cadre */}
        <input
          type="range"
          min="0"
          max="100"
          value={pos}
          onChange={(e) => setPos(Number(e.target.value))}
          aria-label="Comparer avant et après"
          className="absolute inset-0 m-0 h-full w-full cursor-col-resize opacity-0"
        />
      </div>
    </div>
  );
}
