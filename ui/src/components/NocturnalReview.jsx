import { useState, useEffect, useCallback, useRef } from "react";
import { ArrowLeft, Moon, Sparkles, Trash2, ExternalLink, Loader2, Star } from "lucide-react";

// Idée #58/#59 vague 1 — galerie de review des projets générés la nuit, avec le
// score du juge (#59). Voir / garder / supprimer + déclenchement manuel d'un lot.
// (Planificateur auto + questionnaire→axiomes = vague 2.)

function scoreColor(s) {
  if (s === undefined) return "text-faint border-edge";
  if (s >= 7) return "text-ok border-ok/40 bg-ok/10";
  if (s >= 5) return "text-warn border-warn/40 bg-warn/10";
  return "text-err border-err/40 bg-err/10";
}

const DIM_LABELS = { design: "Design", fonctionnel: "Fonctionnel", originalite: "Originalité", coherence: "Cohérence", qualite: "Code" };

export default function NocturnalReview({ onBack, onOpenProject }) {
  const [entries, setEntries] = useState([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, label: "" });
  const [count, setCount] = useState(3);
  const [hideLow, setHideLow] = useState(false);
  const timer = useRef(null);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/nocturnal");
      if (!r.ok) return;
      const d = await r.json();
      setEntries(d.entries ?? []);
      setRunning(Boolean(d.running));
      setProgress(d.progress ?? { current: 0, total: 0, label: "" });
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    refresh();
    timer.current = setInterval(refresh, 3000);
    return () => clearInterval(timer.current);
  }, [refresh]);

  async function generate() {
    await fetch("/api/nocturnal/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count }),
    }).catch(() => {});
    refresh();
  }

  async function remove(id) {
    await fetch(`/api/nocturnal/${id}`, { method: "DELETE" }).catch(() => {});
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  const sorted = [...entries].sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  const visible = hideLow ? sorted.filter((e) => (e.score ?? 0) >= 6) : sorted;

  return (
    <div className="min-h-screen bg-bg text-ink p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={onBack} className="flex items-center gap-1 text-dim hover:text-ink transition-colors text-sm">
            <ArrowLeft size={16} /> Retour
          </button>
          <Moon size={18} className="text-accent-soft" />
          <h1 className="text-xl font-semibold">Review nocturne</h1>
          <span className="text-xs text-faint">{entries.length} projet{entries.length !== 1 ? "s" : ""}</span>
        </div>

        {/* Barre d'action */}
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-edge bg-panel/60 p-3">
          <span className="text-sm text-dim">Générer</span>
          <input
            type="number"
            min={1}
            max={10}
            value={count}
            onChange={(e) => setCount(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
            className="w-16 rounded-lg border border-edge bg-bg px-2 py-1 text-sm text-ink focus:border-accent focus:outline-none"
            disabled={running}
          />
          <span className="text-sm text-dim">projet(s)</span>
          <button
            onClick={generate}
            disabled={running}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-accent/30 hover:bg-accent-soft disabled:opacity-50 transition-colors"
          >
            {running ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {running ? "Génération…" : "Lancer un lot"}
          </button>
          {running && (
            <span className="text-xs text-faint truncate">
              {progress.current}/{progress.total} — {progress.label}
            </span>
          )}
          <label className="ml-auto flex items-center gap-1.5 text-xs text-dim cursor-pointer">
            <input type="checkbox" checked={hideLow} onChange={(e) => setHideLow(e.target.checked)} />
            Masquer &lt; 6/10
          </label>
        </div>

        {visible.length === 0 && (
          <p className="text-faint text-sm">
            {running ? "Génération en cours…" : "Aucun projet. Lance un lot — MangoAI génère et le juge note chacun."}
          </p>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          {visible.map((e) => (
            <div key={e.id} className="flex flex-col gap-2 rounded-xl border border-edge bg-panel p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-mono text-[13px] text-ink truncate">{e.name}</p>
                  <p className="text-xs text-faint">
                    {e.kind} · {e.projectType}
                    {!e.success && <span className="text-err"> · build KO</span>}
                  </p>
                </div>
                <span className={`flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${scoreColor(e.score)}`}>
                  <Star size={11} />
                  {e.score !== undefined ? `${e.score}/10` : "—"}
                </span>
              </div>

              <p className="text-[13px] text-dim leading-relaxed line-clamp-3">{e.task}</p>

              {e.dims && (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(e.dims).map(([k, v]) => (
                    <span key={k} className="text-[10px] text-faint">
                      {DIM_LABELS[k] ?? k} <span className="text-dim">{v}</span>
                    </span>
                  ))}
                </div>
              )}

              {e.judgeComment && <p className="text-xs italic text-faint">« {e.judgeComment} »</p>}

              <div className="mt-1 flex items-center gap-2">
                <button
                  onClick={() => onOpenProject?.(e.name)}
                  className="flex items-center gap-1 rounded-lg border border-accent/40 bg-accent/[0.06] px-2.5 py-1 text-xs text-accent-soft hover:bg-accent/[0.12] transition-colors"
                >
                  <ExternalLink size={12} /> Ouvrir
                </button>
                <button
                  onClick={() => remove(e.id)}
                  className="ml-auto flex items-center gap-1 rounded-lg border border-edge px-2.5 py-1 text-xs text-faint hover:text-err hover:border-err/40 transition-colors"
                >
                  <Trash2 size={12} /> Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
