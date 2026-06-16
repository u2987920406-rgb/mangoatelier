import { useEffect, useRef, useState } from "react";

// Idée #56 — Chantier B. Spotlight : assombrit l'écran SAUF un "trou" autour de
// l'élément cible (résolu via [data-tour="<key>"]), avec un beacon pulsant. Le
// niveau de liberté module le couloir : 0% = overlay opaque qui BLOQUE les clics
// hors cible (couloir strict) → liberté croissante = halo de plus en plus léger
// et non bloquant → 100% = aucun overlay. Dégrade gracieusement : si la cible
// n'est pas dans le DOM (ex. élément du workspace pendant qu'on est sur la Home),
// on n'affiche RIEN (la narration du panneau Tutorial suffit, rien n'est bloqué).

const PAD = 8; // marge autour de la cible

// Mappe un niveau de liberté (0-100) vers l'apparence/comportement de l'overlay.
function freedomStyle(freedom) {
  if (freedom >= 75) return null; // monde quasi ouvert : pas d'overlay
  if (freedom >= 50) return { alpha: 0.3, blocking: false }; // halo léger, non bloquant
  if (freedom >= 25) return { alpha: 0.5, blocking: true };
  return { alpha: 0.72, blocking: true }; // couloir strict
}

// Même rectangle (aux arrondis près) → on évite un setState par frame.
function sameRect(a, b) {
  if (!a || !b) return a === b;
  return (
    Math.abs(a.top - b.top) < 0.5 &&
    Math.abs(a.left - b.left) < 0.5 &&
    Math.abs(a.width - b.width) < 0.5 &&
    Math.abs(a.height - b.height) < 0.5
  );
}

function useTargetRect(targetKey) {
  const [rect, setRect] = useState(null);
  const lastRef = useRef(null);

  useEffect(() => {
    lastRef.current = null;
    setRect(null);
    if (!targetKey) return;
    let raf = 0;
    const measure = () => {
      const el = document.querySelector(`[data-tour="${targetKey}"]`);
      const r = el?.getBoundingClientRect();
      // Ignore les éléments absents ou masqués (rect nul).
      const next = r && r.width > 0 && r.height > 0 ? r : null;
      if (!sameRect(next, lastRef.current)) {
        lastRef.current = next;
        setRect(next);
      }
      raf = requestAnimationFrame(measure); // suit déplacements/scroll/layout
    };
    measure();
    return () => cancelAnimationFrame(raf);
  }, [targetKey]);

  return rect;
}

export default function TutorialSpotlight({ targetKey, freedomLevel = 0 }) {
  const rect = useTargetRect(targetKey);
  const style = freedomStyle(freedomLevel);

  // Pas d'overlay : liberté max, ou cible absente/introuvable.
  if (!style || !rect) return null;

  const top = Math.max(0, rect.top - PAD);
  const left = Math.max(0, rect.left - PAD);
  const width = rect.width + PAD * 2;
  const height = rect.height + PAD * 2;
  const right = left + width;
  const bottom = top + height;

  const shade = `rgba(8, 10, 20, ${style.alpha})`;
  const pe = style.blocking ? "auto" : "none"; // bloque les clics hors cible ?

  // Quatre panneaux entourant le trou : le rectangle central (la cible) reste
  // cliquable. Les panneaux captent les clics seulement si `blocking`.
  const panel = (s) => ({ position: "fixed", background: shade, pointerEvents: pe, ...s });

  return (
    <div aria-hidden="true" className="z-40" style={{ position: "fixed", inset: 0, pointerEvents: "none" }}>
      <div style={panel({ top: 0, left: 0, right: 0, height: top })} />
      <div style={panel({ top: bottom, left: 0, right: 0, bottom: 0 })} />
      <div style={panel({ top, left: 0, width: left, height })} />
      <div style={panel({ top, left: right, right: 0, height })} />
      {/* Anneau + beacon autour de la cible */}
      <div
        className="rounded-lg ring-2 ring-accent"
        style={{
          position: "fixed",
          top,
          left,
          width,
          height,
          pointerEvents: "none",
          boxShadow: "0 0 0 2px rgba(99,102,241,0.5), 0 0 22px 4px rgba(99,102,241,0.35)",
        }}
      />
      <span
        className="animate-ping rounded-full bg-accent"
        style={{ position: "fixed", top: top - 5, left: right - 5, width: 12, height: 12, pointerEvents: "none" }}
      />
    </div>
  );
}
