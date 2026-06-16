import { useEffect, useState, useCallback } from "react";
import { GraduationCap, X, ChevronRight, SkipForward, Check } from "lucide-react";

// Idée #56 — Système Tutorial Orchestral (Chantier A : overlay navigable, sans
// spotlight). Panneau flottant non bloquant : il guide étape par étape mais ne
// verrouille rien (les verrous de liberté + le spotlight viennent au Chantier B).
// Persiste l'avancement à chaque pas via POST /api/tutorial/progress.

const MODE_LABEL = { mvp: "⚡ MVP", elite: "💎 Élite", finition: "🛡️ Finition" };

export default function Tutorial({ id, onComplete, onExit }) {
  const [tutorial, setTutorial] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // Charge la définition du tuto au montage / changement d'id.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setStepIndex(0);
    fetch(`/api/tutorial/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled) return;
        setTutorial(d?.tutorial ?? null);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const persistStep = useCallback(
    (stepId) => {
      fetch("/api/tutorial/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stepComplete: { tutorialId: id, stepId } }),
      }).catch(() => {});
    },
    [id],
  );

  const finishTutorial = useCallback(() => {
    fetch("/api/tutorial/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tutorialComplete: id }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => onComplete?.(d?.nextTutorialId ?? null))
      .catch(() => onComplete?.(null));
  }, [id, onComplete]);

  if (loading || !tutorial) return null;

  const steps = tutorial.steps ?? [];
  // Tutoriel pas encore rédigé (chantier D) : message honnête + sortie.
  if (steps.length === 0) {
    return (
      <Shell title={tutorial.title} onExit={onExit}>
        <p className="text-sm text-dim">
          Ce tutoriel arrive bientôt. Le contenu détaillé de cette étape du parcours est en cours d'écriture.
        </p>
        <div className="mt-4 flex justify-end">
          <button
            onClick={onExit}
            className="rounded-lg border border-edge bg-panel px-3 py-1.5 text-xs text-dim hover:text-ink transition-colors"
          >
            Fermer
          </button>
        </div>
      </Shell>
    );
  }

  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;
  const progressPct = Math.round(((stepIndex + 1) / steps.length) * 100);

  function advance() {
    persistStep(step.id);
    if (isLast) {
      finishTutorial();
    } else {
      setStepIndex((i) => i + 1);
    }
  }

  function skip() {
    if (isLast) {
      finishTutorial();
    } else {
      setStepIndex((i) => i + 1);
    }
  }

  return (
    <Shell title={tutorial.title} onExit={onExit}>
      {/* Méta : étape, mode, liberté */}
      <div className="flex items-center gap-2 text-[11px] text-faint">
        <span className="font-semibold text-accent-soft">
          Étape {stepIndex + 1}/{steps.length}
        </span>
        {tutorial.mode && (
          <span className="rounded-full border border-edge px-2 py-0.5">{MODE_LABEL[tutorial.mode] ?? tutorial.mode}</span>
        )}
        <span className="rounded-full border border-edge px-2 py-0.5">Liberté {tutorial.freedomLevel}%</span>
      </div>

      {/* Barre de progression */}
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-edge">
        <div
          className="h-full rounded-full bg-accent transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Narration */}
      <h3 className="mt-3 text-sm font-semibold text-ink">{step.title}</h3>
      <p className="mt-1 text-[13px] leading-relaxed text-dim">{step.narration}</p>

      {/* Prompt pré-écrit éventuel */}
      {step.prefilledPrompt && (
        <div className="mt-2 rounded-lg border border-edge-soft bg-bg/60 px-3 py-2 text-[12px] italic text-faint">
          « {step.prefilledPrompt} »
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={advance}
          className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white shadow-lg shadow-accent/30 hover:bg-accent-soft transition-colors"
        >
          {isLast ? (
            <>
              <Check size={14} /> Terminer
            </>
          ) : (
            <>
              J'ai compris <ChevronRight size={14} />
            </>
          )}
        </button>
        {!isLast && (
          <button
            onClick={skip}
            title="Passer cette étape"
            className="flex items-center gap-1 rounded-lg border border-edge bg-panel px-2.5 py-1.5 text-xs text-faint hover:text-dim transition-colors"
          >
            <SkipForward size={13} /> Passer
          </button>
        )}
      </div>
    </Shell>
  );
}

// Coque du panneau flottant (bas-gauche), partagée par les états.
function Shell({ title, onExit, children }) {
  return (
    <div className="fixed bottom-4 left-4 z-50 w-[340px] max-w-[calc(100vw-2rem)] rounded-2xl border border-accent/30 bg-panel/95 p-4 shadow-2xl shadow-black/40 backdrop-blur">
      <div className="mb-2 flex items-center gap-2">
        <GraduationCap size={16} className="shrink-0 text-accent-soft" />
        <span className="min-w-0 truncate text-xs font-semibold uppercase tracking-wide text-accent-soft">{title}</span>
        <button
          onClick={onExit}
          title="Quitter le tutoriel"
          className="ml-auto flex h-6 w-6 items-center justify-center rounded-md text-faint hover:bg-edge hover:text-ink transition-colors"
        >
          <X size={14} />
        </button>
      </div>
      {children}
    </div>
  );
}
