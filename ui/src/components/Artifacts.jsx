import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

// Bibliothèque d'artefacts du Blackboard (#117) : lit /api/artifacts — les designs
// (palettes Sharingan cibles + rendus) que le Kernel persiste, CROSS-PROJET, depuis
// le flux design.* du Bus. La preuve visible que le Blackboard #115 garde du réel.

const TYPE = {
  "design.reference": { label: "Cible", tone: "text-accent-soft" },
  "design.produced": { label: "Rendu", tone: "text-ok" },
};

export default function Artifacts() {
  const [arts, setArts] = useState(null);
  const [reuse, setReuse] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    const load = () => {
      fetch("/api/artifacts")
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`Erreur HTTP ${r.status}`))))
        .then((d) => {
          if (!alive) return;
          setArts(d.artifacts ?? []);
          setError(null);
        })
        .catch((e) => alive && setError(e.message ?? String(e)));
      // Réutilisation effective (#121) : la mémoire sert-elle vraiment ?
      fetch("/api/reuse")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => alive && d && setReuse(d))
        .catch(() => {});
    };
    load();
    const id = setInterval(load, 4000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  if (error) return <p className="px-3 py-3 text-xs text-dim">⚠ {error}</p>;
  if (!arts)
    return (
      <div className="flex items-center justify-center py-6 text-dim">
        <Loader2 size={16} className="animate-spin" />
      </div>
    );
  return (
    <div className="space-y-2 px-2 py-2">
      {reuse && reuse.totalTurns > 0 && <ReuseSummary reuse={reuse} />}

      {arts.length === 0 ? (
        <p className="px-1 py-2 text-xs leading-relaxed text-dim">
          Aucune palette pour l'instant. Chaque palette captée (Sharingan / Perfect
          Plan) ou produite par un build est déposée ici par le Kernel — réutilisable
          entre tous tes projets.
        </p>
      ) : (
        <p className="px-1 text-[10px] leading-snug text-faint">
          {arts.length} palette(s) gardée(s) par le Blackboard, cross-projet. Persistées
          si <span className="font-mono">BLACKBOARD_DB</span> est défini.
        </p>
      )}

      {arts.map((h) => {
        const a = h.artifact;
        const t = TYPE[a.type] ?? { label: a.type, tone: "text-faint" };
        return (
          <div key={h.key} className="rounded-lg border border-edge bg-bg px-2.5 py-2">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="min-w-0 truncate text-[12px] font-medium text-ink" title={a.project}>
                {a.project}
              </span>
              <span className={`shrink-0 text-[9px] font-semibold uppercase tracking-widest ${t.tone}`}>
                {t.label}
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {a.colors.slice(0, 12).map((c, i) => (
                <span
                  key={i}
                  className="h-5 w-5 rounded border border-edge"
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
              {a.colors.length > 12 && (
                <span className="self-center text-[10px] text-faint">+{a.colors.length - 12}</span>
              )}
            </div>
            {a.source && (
              <p className="mt-1 text-[10px] text-faint">via {a.source}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

const KIND_LABEL = { component: "composants", skill: "skills", procedure: "procédures" };

// Réutilisation effective (#121) : la mémoire réinjectée sert-elle vraiment ?
function ReuseSummary({ reuse }) {
  const rate = reuse.reuseRatePct ?? 0;
  const tone = rate >= 40 ? "text-ok" : rate >= 15 ? "text-ink" : "text-dim";
  const kinds = Object.entries(reuse.byKind ?? {}).sort((a, b) => b[1] - a[1]);
  return (
    <div className="rounded-lg border border-accent/30 bg-accent/[0.06] px-2.5 py-2">
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-accent-soft">
        Réutilisation effective
      </div>
      <div className="flex items-baseline gap-2">
        <span className={`font-mono text-lg font-semibold ${tone}`}>{rate}%</span>
        <span className="text-[11px] text-faint">
          des tours réutilisent un artefact ({reuse.reuseTurns}/{reuse.totalTurns} · {reuse.totalReuses} lecture·s)
        </span>
      </div>
      {kinds.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-dim">
          {kinds.map(([k, n]) => (
            <span key={k} className="font-mono">
              {KIND_LABEL[k] ?? k}: <span className="text-ink">{n}</span>
            </span>
          ))}
        </div>
      )}
      {reuse.topReused?.length > 0 && (
        <div className="mt-1 text-[10px] text-faint">
          Top : {reuse.topReused.slice(0, 3).map((t) => `${t.key.split(":")[1]} (${t.count})`).join(" · ")}
        </div>
      )}
    </div>
  );
}
