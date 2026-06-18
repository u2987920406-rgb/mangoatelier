import { useState, useEffect, useCallback } from "react";
import { ChevronDown, ChevronUp, Star, Trash2 } from "lucide-react";

function StarPicker({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(n)}
          className="transition-transform hover:scale-110"
          title={`${n} étoile${n > 1 ? "s" : ""}`}
        >
          <Star
            size={16}
            className={
              n <= (hovered || value)
                ? "fill-warn text-warn"
                : "text-edge"
            }
          />
        </button>
      ))}
    </div>
  );
}

function StepCard({ step, onRate, onDelete }) {
  const [open, setOpen]         = useState(false);
  const [editing, setEditing]   = useState(false);
  const [score, setScore]       = useState(step.rating?.score ?? 0);
  const [comment, setComment]   = useState(step.rating?.comment ?? "");
  const [saving, setSaving]     = useState(false);

  const rated = step.rating != null;

  async function submit() {
    if (!score) return;
    setSaving(true);
    await onRate(step.index, score, comment);
    setSaving(false);
    setEditing(false);
  }

  async function remove() {
    await onDelete(step.index);
    setScore(0);
    setComment("");
    setEditing(false);
  }

  const preview = step.text.length > 120 ? step.text.slice(0, 120) + "…" : step.text;
  const time = step.ts
    ? new Date(step.ts).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <div className={`rounded-xl border transition-colors ${
      rated ? "border-warn/40 bg-warn/[0.04]" : "border-edge bg-bg/60"
    }`}>
      {/* En-tête cliquable */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left"
      >
        <span className="mt-0.5 shrink-0 font-mono text-[10px] text-faint w-5 text-center">
          {step.index + 1}
        </span>
        <span className="min-w-0 flex-1 text-[12px] leading-snug text-dim line-clamp-2">
          {preview}
        </span>
        <div className="flex shrink-0 flex-col items-end gap-0.5">
          {rated && (
            <div className="flex">
              {[1,2,3,4,5].map((n) => (
                <Star
                  key={n}
                  size={10}
                  className={n <= step.rating.score ? "fill-warn text-warn" : "text-edge"}
                />
              ))}
            </div>
          )}
          {open ? <ChevronUp size={12} className="text-faint" /> : <ChevronDown size={12} className="text-faint" />}
        </div>
      </button>

      {/* Contenu déplié */}
      {open && (
        <div className="border-t border-edge px-3 pb-3 pt-2">
          {/* Texte complet */}
          <p className="mb-3 text-[12px] leading-relaxed text-ink whitespace-pre-wrap">
            {step.text}
          </p>
          {time && (
            <p className="mb-3 text-[10px] text-faint">{time}</p>
          )}

          {/* Formulaire de notation */}
          {editing || !rated ? (
            <div className="flex flex-col gap-2">
              <StarPicker value={score} onChange={setScore} />
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Commentaire (optionnel)…"
                rows={2}
                className="w-full resize-none rounded-lg border border-edge bg-panel px-2.5 py-1.5 text-[12px] text-ink placeholder:text-faint focus:border-accent focus:outline-none transition-colors"
              />
              <div className="flex gap-2">
                <button
                  disabled={!score || saving}
                  onClick={submit}
                  className="flex-1 rounded-lg bg-accent/90 px-2.5 py-1.5 text-[12px] font-semibold text-white hover:bg-accent disabled:opacity-40 transition-colors"
                >
                  {saving ? "Enregistrement…" : "Valider"}
                </button>
                {editing && (
                  <button
                    onClick={() => { setEditing(false); setScore(step.rating.score); setComment(step.rating.comment); }}
                    className="rounded-lg border border-edge px-2.5 py-1.5 text-[12px] text-dim hover:text-ink transition-colors"
                  >
                    Annuler
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <div className="flex gap-0.5 mb-1">
                  {[1,2,3,4,5].map((n) => (
                    <Star key={n} size={14} className={n <= step.rating.score ? "fill-warn text-warn" : "text-edge"} />
                  ))}
                </div>
                {step.rating.comment && (
                  <p className="text-[12px] text-dim italic">« {step.rating.comment} »</p>
                )}
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button
                  onClick={() => setEditing(true)}
                  className="rounded-lg border border-edge px-2 py-1 text-[11px] text-dim hover:text-ink transition-colors"
                >
                  Modifier
                </button>
                <button
                  onClick={remove}
                  className="rounded-lg border border-err/40 p-1 text-err/60 hover:bg-err/10 hover:text-err transition-colors"
                  title="Supprimer la note"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function BuildReview({ projectName }) {
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(() => {
    setLoading(true);
    fetch(`/api/projects/${encodeURIComponent(projectName)}/build-steps`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setSteps(d.steps); })
      .finally(() => setLoading(false));
  }, [projectName]);

  useEffect(() => { fetch_(); }, [fetch_]);

  async function handleRate(index, score, comment) {
    await fetch(`/api/projects/${encodeURIComponent(projectName)}/build-steps/${index}/rate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ score, comment }),
    });
    fetch_();
  }

  async function handleDelete(index) {
    await fetch(`/api/projects/${encodeURIComponent(projectName)}/build-steps/${index}/rate`, {
      method: "DELETE",
    });
    fetch_();
  }

  const rated   = steps.filter((s) => s.rating).length;
  const total   = steps.length;
  const avgScore = rated
    ? (steps.filter((s) => s.rating).reduce((sum, s) => sum + s.rating.score, 0) / rated).toFixed(1)
    : null;

  if (loading) {
    return <p className="p-4 text-xs text-faint">Chargement…</p>;
  }

  if (total === 0) {
    return (
      <div className="p-4 text-center">
        <p className="text-xs text-faint">Aucune étape trouvée.</p>
        <p className="mt-1 text-[11px] text-faint">Lance un build pour voir les étapes ici.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-2">
      {/* Résumé */}
      <div className="flex items-center justify-between rounded-xl border border-edge bg-panel/60 px-3 py-2">
        <p className="text-[11px] text-faint">
          {rated}/{total} étapes notées
        </p>
        {avgScore && (
          <div className="flex items-center gap-1">
            <Star size={12} className="fill-warn text-warn" />
            <span className="text-[12px] font-semibold text-ink">{avgScore}/5</span>
          </div>
        )}
      </div>

      {/* Étapes */}
      {steps.map((step) => (
        <StepCard
          key={step.index}
          step={step}
          onRate={handleRate}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
}
