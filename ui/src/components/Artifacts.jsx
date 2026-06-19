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
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/artifacts")
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`Erreur HTTP ${r.status}`))))
        .then((d) => {
          if (!alive) return;
          setArts(d.artifacts ?? []);
          setError(null);
        })
        .catch((e) => alive && setError(e.message ?? String(e)));
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
  if (arts.length === 0)
    return (
      <p className="px-3 py-3 text-xs leading-relaxed text-dim">
        Aucun artefact pour l'instant. Chaque palette captée (Sharingan / Perfect
        Plan) ou produite par un build est déposée ici par le Kernel — réutilisable
        entre tous tes projets.
      </p>
    );

  return (
    <div className="space-y-2 px-2 py-2">
      <p className="px-1 text-[10px] leading-snug text-faint">
        {arts.length} palette(s) gardée(s) par le Blackboard, cross-projet. Persistées
        si <span className="font-mono">BLACKBOARD_DB</span> est défini.
      </p>
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
