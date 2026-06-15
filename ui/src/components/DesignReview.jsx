// Idée #2 — Design Pair-Programming
import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  Palette,
  Type,
  Layout,
  Puzzle,
  Zap,
  ChevronDown,
  ChevronUp,
  Clock,
  AlertCircle,
  CheckCircle,
  Loader2,
} from "lucide-react";

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h}h`;
  const d = Math.floor(h / 24);
  return `il y a ${d}j`;
}

function scoreColor(s) {
  if (s >= 75) return "#22c55e";
  if (s >= 50) return "#f59e0b";
  return "#ef4444";
}

/* ── Sub-components ───────────────────────────────────────────────────────── */

function DotsLoader() {
  return (
    <span className="inline-flex gap-1 items-end h-4">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="inline-block w-1.5 h-1.5 rounded-full bg-current animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  );
}

function ScoreBar({ score }) {
  const color = scoreColor(score);
  return (
    <div className="flex items-center gap-4">
      <div className="flex-1 h-3 rounded-full bg-panel border border-edge overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-2xl font-bold tabular-nums" style={{ color }}>
        {score}
        <span className="text-sm text-dim font-normal">/100</span>
      </span>
    </div>
  );
}

function IssueTag({ text }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <AlertCircle size={14} className="mt-0.5 shrink-0 text-red-400" />
      <span className="text-ink/80">{text}</span>
    </div>
  );
}

function SuggestionTag({ text }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <CheckCircle size={14} className="mt-0.5 shrink-0 text-emerald-400" />
      <span className="text-ink/80">{text}</span>
    </div>
  );
}

function ColorSwatch({ color, usage }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div
        className="w-7 h-7 rounded-md border border-edge shrink-0"
        style={{ backgroundColor: color }}
        title={color}
      />
      <span className="font-mono text-xs text-dim">{color}</span>
      <span className="text-sm text-ink/70">— {usage}</span>
    </div>
  );
}

function Accordion({ icon: Icon, title, badge, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-edge rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-panel hover:bg-white/5 transition-colors"
      >
        <Icon size={16} className="text-accent-soft shrink-0" />
        <span className="font-semibold text-ink flex-1 text-left">{title}</span>
        {badge != null && (
          <span className="text-xs bg-white/10 text-dim rounded-full px-2 py-0.5">{badge}</span>
        )}
        {open ? <ChevronUp size={14} className="text-dim" /> : <ChevronDown size={14} className="text-dim" />}
      </button>
      {open && <div className="px-4 pb-4 pt-2 space-y-2 bg-bg/40">{children}</div>}
    </div>
  );
}

function QuickWinChip({ text, onClick }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={() => { setDone((v) => !v); onClick?.(text); }}
      className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
        done
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 line-through opacity-60"
          : "border-edge bg-panel text-ink hover:border-accent-soft hover:text-accent-soft"
      }`}
    >
      {done ? <CheckCircle size={12} className="inline mr-1" /> : <Zap size={12} className="inline mr-1" />}
      {text}
    </button>
  );
}

function HistoryCard({ review }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg border border-edge bg-panel/60">
      <div
        className="w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 text-xs font-bold"
        style={{ borderColor: scoreColor(review.score), color: scoreColor(review.score) }}
      >
        {review.score}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-ink font-medium truncate">{review.project}</p>
        <p className="text-xs text-dim">{timeAgo(review.date)}</p>
      </div>
      <span className="text-xs text-faint tabular-nums">{review.score}/100</span>
    </div>
  );
}

/* ── Main component ───────────────────────────────────────────────────────── */

export default function DesignReview({ onBack, projectName: initialProject }) {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(initialProject ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  /* Charger la liste des projets */
  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((d) => setProjects(d.projects ?? []))
      .catch(() => {});
  }, []);

  /* Charger l'historique quand le projet change */
  const loadHistory = useCallback((project) => {
    if (!project) { setHistory([]); return; }
    setHistoryLoading(true);
    fetch(`/api/design-review/history?project=${encodeURIComponent(project)}`)
      .then((r) => r.json())
      .then((d) => setHistory(d.reviews ?? []))
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false));
  }, []);

  useEffect(() => {
    loadHistory(selectedProject);
    setResult(null);
    setError(null);
  }, [selectedProject, loadHistory]);

  async function handleAnalyse() {
    if (!selectedProject) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/design-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectName: selectedProject }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erreur inconnue");
        return;
      }
      setResult(data);
      // Rafraîchir l'historique
      loadHistory(selectedProject);
    } catch (e) {
      setError(e.message ?? "Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full bg-bg text-ink overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-edge shrink-0">
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg hover:bg-white/5 transition-colors text-dim hover:text-ink"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="font-bold text-ink text-base leading-tight">Design Pair-Programming</h1>
          <p className="text-xs text-dim">Analyse UX/UI automatique de vos projets</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
        {/* Sélection du projet + bouton */}
        <div className="flex gap-3">
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="flex-1 bg-panel border border-edge rounded-xl px-4 py-2.5 text-ink text-sm focus:outline-none focus:border-accent-soft transition-colors"
          >
            <option value="">— Choisir un projet —</option>
            {projects.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <button
            onClick={handleAnalyse}
            disabled={!selectedProject || loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm
              bg-accent-soft/20 text-accent-soft border border-accent-soft/30
              hover:bg-accent-soft/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <DotsLoader />
              </>
            ) : (
              <>
                <Palette size={15} />
                Analyser le design
              </>
            )}
          </button>
        </div>

        {/* Erreur */}
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-sm">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Résultat */}
        {result && (
          <div className="space-y-4">
            {/* Score + résumé */}
            <div className="p-4 rounded-xl border border-edge bg-panel space-y-3">
              <h2 className="text-sm font-semibold text-dim uppercase tracking-wider">Score global</h2>
              <ScoreBar score={result.score} />
              {result.summary && (
                <p className="text-sm text-ink/80 leading-relaxed border-t border-edge pt-3">{result.summary}</p>
              )}
            </div>

            {/* Quick Wins */}
            {result.quickWins?.length > 0 && (
              <div className="p-4 rounded-xl border border-accent-soft/30 bg-accent-soft/5 space-y-3">
                <div className="flex items-center gap-2">
                  <Zap size={15} className="text-accent-soft" />
                  <h2 className="text-sm font-semibold text-accent-soft">Quick Wins</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {result.quickWins.map((w, i) => (
                    <QuickWinChip key={i} text={w} />
                  ))}
                </div>
              </div>
            )}

            {/* Accordéons */}
            <div className="space-y-2">
              {/* Palette */}
              <Accordion
                icon={Palette}
                title="Palette de couleurs"
                badge={(result.palette?.issues?.length ?? 0) + " problème(s)"}
                defaultOpen
              >
                {result.palette?.issues?.length > 0 && (
                  <div className="space-y-1.5 mb-3">
                    {result.palette.issues.map((iss, i) => <IssueTag key={i} text={iss} />)}
                  </div>
                )}
                {result.palette?.suggestions?.length > 0 && (
                  <div className="space-y-1 border-t border-edge pt-3">
                    <p className="text-xs text-dim uppercase tracking-wider mb-2">Suggestions</p>
                    {result.palette.suggestions.map((s, i) => (
                      <ColorSwatch key={i} color={s.color} usage={s.usage} />
                    ))}
                  </div>
                )}
              </Accordion>

              {/* Typographie */}
              <Accordion
                icon={Type}
                title="Typographie"
                badge={(result.typography?.issues?.length ?? 0) + " problème(s)"}
              >
                {result.typography?.issues?.length > 0 && (
                  <div className="space-y-1.5 mb-3">
                    {result.typography.issues.map((iss, i) => <IssueTag key={i} text={iss} />)}
                  </div>
                )}
                {result.typography?.suggestions?.length > 0 && (
                  <div className="space-y-1.5 border-t border-edge pt-3">
                    <p className="text-xs text-dim uppercase tracking-wider mb-2">Suggestions</p>
                    {result.typography.suggestions.map((s, i) => <SuggestionTag key={i} text={s} />)}
                  </div>
                )}
              </Accordion>

              {/* Layout */}
              <Accordion
                icon={Layout}
                title="Layout & Espacement"
                badge={(result.layout?.issues?.length ?? 0) + " problème(s)"}
              >
                {result.layout?.issues?.length > 0 && (
                  <div className="space-y-1.5 mb-3">
                    {result.layout.issues.map((iss, i) => <IssueTag key={i} text={iss} />)}
                  </div>
                )}
                {result.layout?.suggestions?.length > 0 && (
                  <div className="space-y-1.5 border-t border-edge pt-3">
                    <p className="text-xs text-dim uppercase tracking-wider mb-2">Suggestions</p>
                    {result.layout.suggestions.map((s, i) => <SuggestionTag key={i} text={s} />)}
                  </div>
                )}
              </Accordion>

              {/* Composants */}
              <Accordion
                icon={Puzzle}
                title="Composants"
                badge={(result.components?.length ?? 0) + " à revoir"}
              >
                {result.components?.length > 0 ? (
                  <div className="space-y-3">
                    {result.components.map((c, i) => (
                      <div key={i} className="rounded-lg border border-edge bg-panel p-3 space-y-1.5">
                        <p className="font-semibold text-sm text-accent-soft">{c.name}</p>
                        <IssueTag text={c.issue} />
                        <SuggestionTag text={c.fix} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-dim">Aucun composant problématique détecté.</p>
                )}
              </Accordion>
            </div>
          </div>
        )}

        {/* Historique */}
        {selectedProject && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-dim" />
              <h2 className="text-sm font-semibold text-dim">Analyses précédentes</h2>
            </div>
            {historyLoading ? (
              <p className="text-sm text-dim"><DotsLoader /></p>
            ) : history.length === 0 ? (
              <p className="text-sm text-dim italic">Aucune analyse enregistrée pour ce projet.</p>
            ) : (
              <div className="space-y-2">
                {[...history].reverse().map((r, i) => (
                  <HistoryCard key={i} review={r} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
