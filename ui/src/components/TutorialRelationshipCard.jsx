import { useEffect, useState } from "react";
import { GraduationCap, Sparkles, Heart, ArrowRight, Check } from "lucide-react";

// Idée #56 — Chantier B. Carte de fin de tutoriel : "calibration mutuelle".
// Côté Chantier B : on montre ce que TU as découvert (capacités vécues) + une
// jauge de connaissance mutuelle (X/10 tutos). Le détail "ce que MangoAI a appris
// de toi" via axiomes tagués arrive au Chantier C (feedback) — ici on l'annonce
// honnêtement sans inventer de contenu.

export default function TutorialRelationshipCard({
  tutorialTitle,
  discovered = [],
  completedCount = 0,
  total = 10,
  nextId = null,
  onNext,
  onClose,
}) {
  const pct = Math.round((completedCount / total) * 100);

  // Ce que MangoAI a réellement appris : axiomes tagués [tutoriel-N] (#41).
  const [learned, setLearned] = useState([]);
  useEffect(() => {
    fetch("/api/tutorial/relationship")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setLearned(Array.isArray(d?.learned) ? d.learned : []))
      .catch(() => {});
  }, []);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-accent/30 bg-panel p-6 shadow-2xl shadow-black/50">
        {/* En-tête */}
        <div className="flex items-center gap-2">
          <GraduationCap size={20} className="text-accent-soft" />
          <h2 className="text-base font-bold text-ink">Tutoriel terminé 🎉</h2>
        </div>
        <p className="mt-1 text-sm text-dim">{tutorialTitle}</p>

        {/* Jauge de connaissance mutuelle */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-faint">
            <span>Connaissance mutuelle</span>
            <span className="font-mono text-accent-soft">
              {completedCount}/{total}
            </span>
          </div>
          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-edge">
            <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* Ce que tu as découvert */}
        {discovered.length > 0 && (
          <div className="mt-5">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-accent-soft">
              <Sparkles size={13} /> Ce que tu as découvert
            </div>
            <ul className="mt-2 space-y-1">
              {discovered.map((d, i) => (
                <li key={i} className="flex items-start gap-2 text-[13px] text-dim">
                  <Check size={13} className="mt-0.5 shrink-0 text-accent-soft" />
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Ce que MangoAI retient (annonce honnête — détail au Chantier C) */}
        <div className="mt-5 rounded-xl border border-edge-soft bg-bg/50 px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-faint">
            <Heart size={13} className="text-accent-soft" /> Ce que MangoAI retient de toi
          </div>
          {learned.length > 0 ? (
            <ul className="mt-1.5 space-y-1">
              {learned.slice(0, 5).map((l, i) => (
                <li key={i} className="flex items-start gap-2 text-[12px] leading-relaxed text-dim">
                  <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-accent-soft" />
                  <span>{l}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-[12px] leading-relaxed text-faint">
              À chaque 👍 / 👎 et chaque projet, MangoAI affine ton profil et ton style. Plus tu l'utilises, plus
              son premier jet te ressemble.
            </p>
          )}
        </div>

        {/* CTA */}
        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-edge bg-panel px-3 py-1.5 text-xs text-dim hover:text-ink transition-colors"
          >
            {nextId ? "Plus tard" : "Terminer"}
          </button>
          {nextId && (
            <button
              onClick={onNext}
              className="flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-1.5 text-xs font-semibold text-white shadow-lg shadow-accent/30 hover:bg-accent-soft transition-colors"
            >
              Tutoriel {nextId}/{total} <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
