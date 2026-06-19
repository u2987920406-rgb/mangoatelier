import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

// Tableau de bord des traces (#116) : lit /api/traces — le flux OpenTelemetry du
// Kernel collecté en direct sur l'Event Bus. Voit TOUT le trafic LLM : les tours
// de chat (chat.turn) ET les appels one-shot (brain.complete : juges, patrouilleurs,
// radar…). Live, complémentaire des Métriques (qui lisent le fichier .metrics.jsonl).

const fmtMs = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}s` : `${Math.round(n ?? 0)}ms`);
const fmt$ = (n) => `$${(n ?? 0).toFixed(n >= 1 ? 2 : 4)}`;

// Étiquette lisible + ton par type de span.
const NAME_LABEL = { "chat.turn": "Chat", "brain.complete": "Appel LLM" };

export default function Traces() {
  const [snap, setSnap] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/traces")
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`Erreur HTTP ${r.status}`))))
        .then((d) => {
          if (!alive) return;
          setSnap(d);
          setError(null);
        })
        .catch((e) => alive && setError(e.message ?? String(e)));
    load();
    const id = setInterval(load, 3000); // live : le flux se remplit en direct
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  if (error) return <p className="px-3 py-3 text-xs text-dim">⚠ {error}</p>;
  if (!snap)
    return (
      <div className="flex items-center justify-center py-6 text-dim">
        <Loader2 size={16} className="animate-spin" />
      </div>
    );

  const { stats, recent } = snap;
  if (!stats || stats.total === 0)
    return (
      <p className="px-3 py-3 text-xs leading-relaxed text-dim">
        Aucune trace pour l'instant. Chaque tour de chat et chaque appel LLM
        (juges, patrouilleurs, radar…) apparaîtra ici en direct, dès qu'il passe
        sur le Bus du Kernel.
      </p>
    );

  const errPct = stats.total ? Math.round((stats.errors / stats.total) * 100) : 0;
  const byName = Object.entries(stats.byName ?? {}).sort((a, b) => b[1] - a[1]);
  const byProvider = Object.entries(stats.byProvider ?? {}).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-3 px-2 py-2">
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Appels" value={stats.total} />
        <Stat label="Coût cumulé" value={fmt$(stats.totalCostUsd)} />
        <Stat
          label="Erreurs"
          value={`${stats.errors} (${errPct} %)`}
          tone={errPct >= 25 ? "err" : "ok"}
        />
        <Stat label="Durée moy." value={fmtMs(stats.avgDurationMs)} />
      </div>

      <Section title="Par type">
        <Bars entries={byName} labeler={(k) => NAME_LABEL[k] ?? k} />
      </Section>

      {byProvider.length > 0 && (
        <Section title="Par cerveau (one-shot)">
          <Bars entries={byProvider} />
        </Section>
      )}

      <Section title={`Traces récentes (${recent.length})`}>
        <ul className="space-y-0.5">
          {recent.slice(0, 50).map((r, i) => (
            <li key={i} className="flex items-center gap-1.5 text-[11px]">
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                  r.status === "error" ? "bg-err" : "bg-ok"
                }`}
                title={r.status}
              />
              <span className="w-14 shrink-0 truncate font-mono text-dim" title={r.name}>
                {NAME_LABEL[r.name] ?? r.name}
              </span>
              <span className="min-w-0 flex-1 truncate text-faint" title={detail(r)}>
                {detail(r)}
              </span>
              {r.costUsd ? (
                <span className="shrink-0 font-mono text-faint">{fmt$(r.costUsd)}</span>
              ) : null}
              <span className="w-12 shrink-0 text-right font-mono text-faint">
                {fmtMs(r.durationMs)}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <p className="px-1 text-[10px] leading-snug text-faint">
        Flux live du Bus du Kernel. « Chat » = un tour complet ; « Appel LLM » = un
        appel one-shot (juge, patrouilleur, radar…). MangoQA observe le même flux.
      </p>
    </div>
  );
}

// Détail contextuel d'une ligne : projet (chat) ou provider·model (appel LLM).
function detail(r) {
  if (r.project) return r.project;
  if (r.provider) return r.model ? `${r.provider} · ${r.model}` : r.provider;
  return "—";
}

function Stat({ label, value, tone }) {
  const color = tone === "err" ? "text-err" : tone === "ok" ? "text-ok" : "text-ink";
  return (
    <div className="rounded-lg border border-edge bg-bg px-2.5 py-2">
      <div className="text-[10px] uppercase tracking-wide text-faint">{label}</div>
      <div className={`mt-0.5 font-mono text-sm font-semibold ${color}`}>{value}</div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section>
      <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-faint">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Bars({ entries, labeler = (k) => k }) {
  if (entries.length === 0) return <p className="text-[11px] text-faint">—</p>;
  const max = Math.max(...entries.map(([, n]) => n), 1);
  return (
    <div className="space-y-1">
      {entries.map(([k, n]) => (
        <div key={k} className="flex items-center gap-2 text-[11px]">
          <span className="w-20 shrink-0 truncate font-mono text-faint" title={k}>
            {labeler(k)}
          </span>
          <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-edge-soft">
            <span
              className="block h-full rounded-full bg-accent"
              style={{ width: `${Math.max(8, (n / max) * 100)}%` }}
            />
          </span>
          <span className="w-6 shrink-0 text-right font-mono text-dim">{n}</span>
        </div>
      ))}
    </div>
  );
}
