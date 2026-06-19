import { useEffect, useState, useCallback } from "react";
import { GraduationCap, X, ChevronRight, ChevronLeft, SkipForward, Check, ThumbsUp, ThumbsDown } from "lucide-react";
import TutorialSpotlight from "./TutorialSpotlight.jsx";
import TutorialRelationshipCard from "./TutorialRelationshipCard.jsx";

// Idée #56 — Système Tutorial Orchestral. Chantier A : overlay navigable +
// persistance. Chantier B : spotlight sur l'élément cible (verrous de liberté)
// + RelationshipCard de fin. Le panneau guide reste non bloquant ; c'est le
// spotlight qui matérialise le "couloir" selon le niveau de liberté.

const MODE_LABEL = { mvp: "⚡ MVP", elite: "💎 Élite", finition: "🛡️ Finition" };

// À quel écran appartient chaque cible data-tour : le tutoriel y bascule
// automatiquement pour que le spotlight tombe sur un élément réel (#56 — "mettre
// dans le bon contexte"). Les cibles inconnues ne déclenchent aucune bascule.
const TARGET_CONTEXT = {
  hero: "home",
  "prompt-card": "home",
  templates: "home",
  "project-name": "home",
  header: "workspace",
  mode: "workspace",
  model: "workspace",
  preview: "workspace",
  memory: "workspace",
  versions: "workspace",
  inspect: "workspace",
  deploy: "workspace",
  github: "workspace",
  backend: "workspace",
  mic: "workspace",
  composer: "workspace",
};

export default function Tutorial({ id, onComplete, onExit, onStartNext, onContext }) {
  const [tutorial, setTutorial] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [card, setCard] = useState(null); // { discovered, completedCount, nextId } à la fin
  const [fbComment, setFbComment] = useState(""); // commentaire de checkpoint
  const [fbGivenStep, setFbGivenStep] = useState(null); // stepId déjà noté

  // Charge la définition du tuto au montage / changement d'id (reset complet).
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setStepIndex(0);
    setCard(null);
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

  // Repartir d'un commentaire vierge à chaque changement d'étape.
  useEffect(() => {
    setFbComment("");
  }, [stepIndex, id]);

  // Mettre l'app dans le bon contexte (écran) pour l'étape courante : un
  // `context` explicite (écran plein écran : notes, metrics, superagent, multi…)
  // prime, sinon on dérive l'écran de la cible data-tour. Ainsi le spotlight a
  // toujours un élément réel, ou la feature visée est rendue à l'écran.
  useEffect(() => {
    const s = tutorial?.steps?.[stepIndex];
    if (!s) return;
    const ctx = s.context || (s.target ? TARGET_CONTEXT[s.target] : null);
    if (ctx) onContext?.(ctx);
  }, [stepIndex, tutorial, onContext]);

  // Retour à un checkpoint → axiome tagué (#41). Non bloquant : l'utilisateur
  // continue de naviguer normalement après avoir voté.
  const sendCheckpointFeedback = useCallback(
    (stepId, rating) => {
      setFbGivenStep(stepId);
      fetch("/api/tutorial/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tutorialId: id, stepId, rating, comment: fbComment.trim() || undefined }),
      }).catch(() => {});
      setFbComment("");
    },
    [id, fbComment],
  );

  const finishTutorial = useCallback(
    (discovered) => {
      fetch("/api/tutorial/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tutorialComplete: id }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          const completedCount = d?.progress?.completedTutorials?.length ?? 0;
          setCard({ discovered, completedCount, nextId: d?.nextTutorialId ?? null });
        })
        .catch(() => setCard({ discovered, completedCount: 0, nextId: null }));
    },
    [id],
  );

  if (loading || !tutorial) return null;

  // Carte de fin (RelationshipCard) : remplace le panneau une fois le tuto fini.
  if (card) {
    return (
      <TutorialRelationshipCard
        tutorialTitle={tutorial.title}
        discovered={card.discovered}
        completedCount={card.completedCount}
        nextId={card.nextId}
        onNext={() => card.nextId && onStartNext?.(card.nextId)}
        onClose={() => onComplete?.(card.nextId)}
      />
    );
  }

  const steps = tutorial.steps ?? [];
  // Tutoriel pas encore rédigé (chantier D) : message honnête + sortie.
  if (steps.length === 0) {
    return (
      <Shell title={tutorial.title} onExit={onExit}>
        <p className="text-sm text-dim">
          Ce tutoriel arrive bientôt. Le contenu détaillé de ce parcours est en cours d'écriture.
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
  const stepFreedom = step.freedomLevel ?? tutorial.freedomLevel;

  function advance() {
    persistStep(step.id);
    if (isLast) {
      finishTutorial(steps.map((s) => s.title));
    } else {
      setStepIndex((i) => i + 1);
    }
  }

  function skip() {
    if (isLast) {
      finishTutorial(steps.map((s) => s.title));
    } else {
      setStepIndex((i) => i + 1);
    }
  }

  function back() {
    setStepIndex((i) => Math.max(0, i - 1));
  }

  return (
    <>
      {/* Spotlight sur la cible (rien si la cible est absente du DOM). */}
      {step.target && <TutorialSpotlight targetKey={step.target} freedomLevel={stepFreedom} />}

      <Shell title={tutorial.title} onExit={onExit}>
        {/* Méta : étape, mode, liberté */}
        <div className="flex items-center gap-2 text-[11px] text-faint">
          <span className="font-semibold text-accent-soft">
            Étape {stepIndex + 1}/{steps.length}
          </span>
          {tutorial.mode && (
            <span className="rounded-full border border-edge px-2 py-0.5">{MODE_LABEL[tutorial.mode] ?? tutorial.mode}</span>
          )}
          <span className="rounded-full border border-edge px-2 py-0.5">Liberté {stepFreedom}%</span>
        </div>

        {/* Barre de progression */}
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-edge">
          <div className="h-full rounded-full bg-accent transition-all duration-300" style={{ width: `${progressPct}%` }} />
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

        {/* Checkpoint : retour utilisateur → MangoOS apprend (double apprentissage) */}
        {step.checkpoint && (
          <div className="mt-3 rounded-lg border border-accent/20 bg-accent/[0.04] px-3 py-2.5">
            {fbGivenStep === step.id ? (
              <p className="text-[12px] text-accent-soft">Merci — MangoOS le retient ✓</p>
            ) : (
              <>
                <p className="text-[11px] font-medium text-faint">Ton ressenti ? MangoOS apprend de toi.</p>
                <input
                  value={fbComment}
                  onChange={(e) => setFbComment(e.target.value)}
                  placeholder="Un mot (optionnel) : ce que tu aimes / pas…"
                  className="mt-1.5 w-full rounded-md border border-edge bg-bg px-2 py-1 text-[12px] text-ink placeholder:text-faint focus:border-accent focus:outline-none transition-colors"
                />
                <div className="mt-1.5 flex gap-2">
                  <button
                    onClick={() => sendCheckpointFeedback(step.id, "like")}
                    className="flex items-center gap-1 rounded-md border border-edge bg-panel px-2 py-1 text-[11px] text-dim hover:border-accent/50 hover:text-accent transition-colors"
                  >
                    <ThumbsUp size={12} /> J'aime
                  </button>
                  <button
                    onClick={() => sendCheckpointFeedback(step.id, "dislike")}
                    className="flex items-center gap-1 rounded-md border border-edge bg-panel px-2 py-1 text-[11px] text-dim hover:border-accent/50 hover:text-accent transition-colors"
                  >
                    <ThumbsDown size={12} /> Bof
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 flex items-center gap-2">
          {stepIndex > 0 && (
            <button
              onClick={back}
              title="Étape précédente"
              className="flex items-center gap-1 rounded-lg border border-edge bg-panel px-2.5 py-1.5 text-xs text-faint hover:text-dim transition-colors"
            >
              <ChevronLeft size={14} /> Précédent
            </button>
          )}
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
              className="ml-auto flex items-center gap-1 rounded-lg border border-edge bg-panel px-2.5 py-1.5 text-xs text-faint hover:text-dim transition-colors"
            >
              <SkipForward size={13} /> Passer
            </button>
          )}
        </div>
      </Shell>
    </>
  );
}

// Coque du panneau flottant (bas-gauche), au-dessus du spotlight (z-50 > z-40).
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
