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
  const [impact, setImpact] = useState(null);
  const [curation, setCuration] = useState(null);
  const [effect, setEffect] = useState(null);
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
      // Impact (#123) : réutiliser coûte-t-il moins / réussit-il mieux ?
      fetch("/api/reuse/impact")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => alive && d && setImpact(d))
        .catch(() => {});
      // Priorité de curation nocturne (#125) : quelle famille enrichir d'abord ?
      fetch("/api/curation/priority")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => alive && d && setCuration(d))
        .catch(() => {});
      // Preuve d'efficacité (#126) : la curation orientée fait-elle monter le rendement ?
      fetch("/api/curation/effect")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => alive && d && setEffect(d))
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
      {impact && impact.reuse.turns + impact.noReuse.turns > 0 && <ReuseImpact impact={impact} />}
      {curation && <CurationPriority curation={curation} />}
      {effect && effect.samples > 0 && <CurationEffect effect={effect} />}

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

const KIND_LABEL = { component: "composants", skill: "skills", procedure: "procédures", palette: "palettes" };

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

// Impact de la réutilisation (#123) : corrèle réutilisation et coût/qualité.
// Compare deux seaux de tours — avec vs sans réutilisation d'artefact.
function fmtCost(v) {
  return v >= 0.01 ? `$${v.toFixed(3)}` : v > 0 ? `$${v.toFixed(4)}` : "$0";
}
function Delta({ value, unit, goodWhenPositive = true }) {
  if (value === null || value === undefined) return <span className="text-faint">—</span>;
  const good = goodWhenPositive ? value > 0 : value < 0;
  const tone = value === 0 ? "text-dim" : good ? "text-ok" : "text-err";
  const sign = value > 0 ? "+" : "";
  return <span className={`font-mono font-semibold ${tone}`}>{sign}{value}{unit}</span>;
}
function ReuseImpact({ impact }) {
  const { reuse, noReuse, delta, sampleSufficient, byKind } = impact;
  const Row = ({ label, b }) => (
    <div className="flex items-center justify-between gap-2 text-[11px]">
      <span className="text-dim">{label}</span>
      <span className="flex gap-3 font-mono text-faint">
        <span title="tours">{b.turns}t</span>
        <span title="coût moyen">{fmtCost(b.avgCostUsd)}</span>
        <span title="succès">{b.successRatePct}%</span>
      </span>
    </div>
  );
  // Familles qui ont au moins un tour réutilisateur (sinon rien à comparer).
  const fams = (byKind ?? []).filter((f) => f.with.turns > 0);
  return (
    <div className="rounded-lg border border-edge bg-bg px-2.5 py-2">
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-accent-soft">
        Impact de la réutilisation
      </div>
      <Row label="avec réutilisation" b={reuse} />
      <Row label="sans" b={noReuse} />
      <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-t border-edge pt-1.5 text-[11px] text-faint">
        <span>coût <Delta value={delta.costSavingPct} unit="%" /></span>
        <span>vitesse <Delta value={delta.durationSavingPct} unit="%" /></span>
        <span>succès <Delta value={delta.successRatePts} unit=" pts" /></span>
      </div>
      {fams.length > 0 && (
        <div className="mt-1.5 border-t border-edge pt-1.5">
          <div className="mb-1 text-[9px] font-semibold uppercase tracking-widest text-faint">
            Par famille — quelle dimension rapporte le plus ?
          </div>
          <div className="space-y-0.5">
            {fams.map((f) => (
              <div key={f.kind} className="flex items-center justify-between gap-2 text-[11px]">
                <span className="text-dim">
                  {KIND_LABEL[f.kind] ?? f.kind}
                  <span className="ml-1 font-mono text-faint">{f.with.turns}t</span>
                </span>
                <span className="flex gap-3">
                  <span title="économie de coût">coût <Delta value={f.delta.costSavingPct} unit="%" /></span>
                  <span title="points de succès">succ. <Delta value={f.delta.successRatePts} unit="" /></span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      {!sampleSufficient && (
        <p className="mt-1 text-[10px] leading-snug text-faint">
          Échantillon encore mince — la comparaison se fiabilise avec plus de tours dans chaque cas.
        </p>
      )}
    </div>
  );
}

// Priorité de curation nocturne (#125) : la boucle nocturne enrichit en priorité
// les familles au meilleur rendement mesuré. Reflète /api/curation/priority.
const REASON = {
  exploit: { label: "fort rendement", tone: "text-ok" },
  explore: { label: "à explorer", tone: "text-dim" },
  deprioritize: { label: "rendement faible", tone: "text-faint" },
};
// Mode de politique auto-réglé (#127) : le verdict d'efficacité règle l'arbitrage
// exploit/explore. On le déduit des knobs renvoyés par l'API.
function policyMode(curation) {
  const b = curation.knobs?.exploreBaseline;
  if (curation.verdict === "positive" || b <= 10) return { label: "exploitation renforcée", tone: "text-ok" };
  if (curation.verdict === "negative" || b >= 22) return { label: "exploration accrue", tone: "text-warn" };
  return { label: "équilibre par défaut", tone: "text-dim" };
}
function CurationPriority({ curation }) {
  const ranked = (curation.ranked ?? []).filter((f) => f.reason !== "deprioritize");
  if (ranked.length === 0) return null;
  const mode = policyMode(curation);
  return (
    <div className="rounded-lg border border-accent/30 bg-accent/[0.06] px-2.5 py-2">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-accent-soft">
          Priorité de curation nocturne
        </span>
        <span className={`text-[9px] font-semibold uppercase tracking-wider ${mode.tone}`} title="réglée par le verdict d'efficacité (#127)">
          {mode.label}
        </span>
      </div>
      <p className="mb-1 text-[10px] leading-snug text-faint">
        La nuit, MangoOS récolte d'abord les familles qui rapportent le plus.
      </p>
      <ol className="space-y-0.5">
        {ranked.slice(0, 4).map((f, i) => {
          const r = REASON[f.reason] ?? REASON.explore;
          return (
            <li key={f.kind} className="flex items-center justify-between gap-2 text-[11px]">
              <span className="text-dim">
                <span className="font-mono text-faint">{i + 1}.</span> {KIND_LABEL[f.kind] ?? f.kind}
              </span>
              <span className={`text-[10px] ${r.tone}`}>{r.label}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// Preuve d'efficacité de la curation (#126) : la curation orientée fait-elle
// monter le rendement nuit après nuit ? Verdict honnête, "insufficient" tant que
// les données manquent. Reflète /api/curation/effect.
const VERDICT = {
  positive: { label: "Effet positif détecté", tone: "text-ok", note: "les familles priorisées progressent plus que les autres" },
  neutral: { label: "Pas d'effet net", tone: "text-dim", note: "priorisées et autres progressent pareil" },
  negative: { label: "Effet négatif", tone: "text-err", note: "les familles priorisées progressent moins" },
  insufficient: { label: "Données insuffisantes", tone: "text-faint", note: "preuve en cours d'accumulation — une mesure par nuit" },
};
function CurationEffect({ effect }) {
  const v = VERDICT[effect.verdict] ?? VERDICT.insufficient;
  return (
    <div className="rounded-lg border border-edge bg-bg px-2.5 py-2">
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-accent-soft">
        Preuve d'efficacité de la curation
      </div>
      <div className={`text-[12px] font-semibold ${v.tone}`}>{v.label}</div>
      <p className="mt-0.5 text-[10px] leading-snug text-faint">{v.note}.</p>
      {effect.verdict !== "insufficient" && effect.lift !== null && (
        <div className="mt-1 flex flex-wrap items-baseline gap-x-3 text-[11px] text-faint">
          <span>surcroît de progression <Delta value={effect.lift} unit="" /></span>
          <span className="font-mono">{effect.observations} obs · {effect.samples} nuits</span>
        </div>
      )}
      {effect.verdict === "insufficient" && (
        <div className="mt-1 font-mono text-[10px] text-faint">{effect.samples} nuit·s échantillonnée·s</div>
      )}
    </div>
  );
}
