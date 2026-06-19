import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

// Learning-curve dashboard (idea 21): reads /api/metrics (one row per turn)
// and shows where MangoOS's cost/turns/errors are heading over time. Future
// home of the "intervention rate" curve once a local student model exists.
// Mounted only while the menu is open, so it always re-fetches fresh data.
const fmt$ = (n) => `$${(n ?? 0).toFixed(n >= 1 ? 2 : 3)}`;

export default function Metrics() {
  const [rows, setRows] = useState(null);
  const [insights, setInsights] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/metrics")
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`Erreur HTTP ${r.status}`))))
        .then((d) => {
          if (!alive) return;
          setRows(d.rows ?? []);
          setInsights(d.insights ?? null);
          setError(null);
        })
        .catch((e) => alive && setError(e.message ?? String(e)));
    load();
    // Auto-refresh : la courbe se remplit en direct pendant la boucle nocturne.
    const id = setInterval(load, 4000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  if (error) return <p className="px-3 py-3 text-xs text-dim">⚠ {error}</p>;
  if (!rows)
    return (
      <div className="flex items-center justify-center py-6 text-dim">
        <Loader2 size={16} className="animate-spin" />
      </div>
    );
  if (rows.length === 0)
    return (
      <p className="px-3 py-3 text-xs leading-relaxed text-dim">
        Aucune métrique pour l'instant. Chaque tâche ajoute une ligne — la courbe
        se remplit au fil de l'usage.
      </p>
    );

  const turns = rows.length;
  const cost = rows.reduce((s, r) => s + (r.costUsd ?? 0), 0);
  const errors = rows.filter((r) => r.error).length;
  const avgTurns = rows.reduce((s, r) => s + (r.numTurns ?? 0), 0) / turns;

  const byKey = (key, fallback) => {
    const m = {};
    for (const r of rows) {
      const k = r[key] ?? fallback;
      (m[k] ??= { count: 0, cost: 0 }).count++;
      m[k].cost += r.costUsd ?? 0;
    }
    return Object.entries(m).sort((a, b) => b[1].cost - a[1].cost);
  };

  const perDay = {};
  for (const r of rows) {
    const d = (r.ts ?? "").slice(0, 10) || "?";
    (perDay[d] ??= { count: 0, cost: 0 }).count++;
    perDay[d].cost += r.costUsd ?? 0;
  }
  const days = Object.entries(perDay).sort((a, b) => a[0].localeCompare(b[0]));
  const maxDayCost = Math.max(...days.map(([, v]) => v.cost), 0.0001);

  // Companionship dashboard (jalon D): all relay-specific KPIs come from the
  // server-side aggregator (metrics-insights.ts) — single source of truth.
  const hasRelay = (insights?.relayTurns ?? 0) > 0;
  const sov = insights?.sovereignty;
  const fpy = insights?.firstPassYield;
  const emancipation = insights?.emancipation ?? [];
  const byType = insights?.byType ?? [];
  const axiomMap = insights?.axiomMap;
  const weekly = insights?.weekly ?? [];
  const costDrivers = insights?.costDrivers ?? [];
  const maxWeekCost = Math.max(...weekly.map((w) => w.costUsd), 0.0001);

  return (
    <div className="space-y-3 px-2 py-2">
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Tâches" value={turns} />
        <Stat label="Coût cumulé" value={fmt$(cost)} />
        <Stat label="Coût moyen / tâche" value={fmt$(cost / turns)} />
        <Stat
          label="Taux d'erreur"
          value={`${Math.round((errors / turns) * 100)} %`}
          tone={errors / turns >= 0.25 ? "err" : "ok"}
        />
      </div>

      <Section title="Coût par jour">
        <div className="space-y-1">
          {days.map(([d, v]) => (
            <div key={d} className="flex items-center gap-2 text-[11px]">
              <span className="w-16 shrink-0 font-mono text-faint">{d.slice(5)}</span>
              <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-edge-soft">
                <span
                  className="block h-full rounded-full bg-accent"
                  style={{ width: `${Math.max(4, (v.cost / maxDayCost) * 100)}%` }}
                />
              </span>
              <span className="w-12 shrink-0 text-right font-mono text-dim">{fmt$(v.cost)}</span>
              <span className="w-8 shrink-0 text-right font-mono text-faint">{v.count}t</span>
            </div>
          ))}
        </div>
      </Section>

      <div className="grid grid-cols-2 gap-3">
        <Section title="Par modèle">
          <Breakdown entries={byKey("model", "?")} />
        </Section>
        <Section title="Par mode">
          <Breakdown entries={byKey("mode", "legacy")} />
        </Section>
      </div>

      {weekly.length > 1 && (
        <Section title="Coût par semaine (tendance)">
          <div className="space-y-1">
            {weekly.map((w) => (
              <div key={w.week} className="flex items-center gap-2 text-[11px]">
                <span className="w-16 shrink-0 font-mono text-faint" title={`Semaine du ${w.week}`}>
                  {w.week.slice(5)}
                </span>
                <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-edge-soft">
                  <span
                    className="block h-full rounded-full bg-accent"
                    style={{ width: `${Math.max(4, (w.costUsd / maxWeekCost) * 100)}%` }}
                  />
                </span>
                <span className="w-12 shrink-0 text-right font-mono text-dim">{fmt$(w.costUsd)}</span>
                <span
                  className="w-14 shrink-0 text-right font-mono text-faint"
                  title="coût moyen par tâche cette semaine"
                >
                  {fmt$(w.avgCostUsd)}/t
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {costDrivers.length > 0 && (
        <Section title="Drivers de coût (audit 22/06)">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-[10px] uppercase tracking-wide text-faint">
                <th className="pb-1 text-left font-medium">Type</th>
                <th className="pb-1 text-right font-medium">$ moy.</th>
                <th className="pb-1 text-right font-medium">tours</th>
                <th className="pb-1 text-right font-medium" title="snapshots moyens par tâche">
                  snaps
                </th>
              </tr>
            </thead>
            <tbody className="font-mono text-dim">
              {costDrivers.map((d) => (
                <tr key={d.type}>
                  <td className="py-0.5 text-left">{d.type}</td>
                  <td className="py-0.5 text-right">{fmt$(d.avgCostUsd)}</td>
                  <td className="py-0.5 text-right text-faint">{d.avgTurns.toFixed(1)}</td>
                  <td className="py-0.5 text-right text-faint">{d.avgSnapshots.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-1 px-1 text-[10px] leading-snug text-faint">
            Moyennes par tâche, triées par coût total. Cibles d'optimisation : tours et snapshots
            élevés = leviers de coût.
          </p>
        </Section>
      )}

      {hasRelay && (
        <Section title="Compagnonnage de l'Élève">
          <div className="mb-2 grid grid-cols-2 gap-2">
            <Stat
              label="Rendement 1er tour"
              value={`${fpy.pct} %`}
              tone={fpy.pct >= 60 ? "ok" : fpy.pct < 30 ? "err" : undefined}
            />
            <Stat
              label="Souveraineté (net, est.)"
              value={fmt$(sov.netUsd)}
              tone={sov.netUsd > 0 ? "ok" : undefined}
            />
          </div>
          <p className="mb-2 px-1 text-[10px] leading-snug text-faint">
            {fpy.n} tours pilotés par l'Élève · économie estimée {fmt$(sov.savedUsd)} − escalades{" "}
            {fmt$(sov.escalationUsd)} (base ≈ {fmt$(sov.baselineUsd)} / tâche Claude).
          </p>

          <h4 className="mb-1 text-[10px] uppercase tracking-wide text-faint">
            Émancipation — % d'intervention de Claude par jour
          </h4>
          <div className="space-y-1">
            {emancipation.map((e) => (
              <div key={e.day} className="flex items-center gap-2 text-[11px]">
                <span className="w-16 shrink-0 font-mono text-faint">{e.day.slice(5)}</span>
                <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-edge-soft">
                  <span
                    className={`block h-full rounded-full ${e.pct <= 20 ? "bg-ok" : "bg-err"}`}
                    style={{ width: `${Math.max(4, e.pct)}%` }}
                  />
                </span>
                <span className={`w-10 shrink-0 text-right font-mono ${e.pct <= 20 ? "text-ok" : "text-err"}`}>
                  {e.pct} %
                </span>
                <span
                  className="w-12 shrink-0 text-right font-mono text-faint"
                  title="moyenne glissante (cumulée)"
                >
                  ~{e.rollingPct} %
                </span>
              </div>
            ))}
          </div>
          <p className="mt-1.5 px-1 text-[10px] leading-snug text-faint">
            Objectif <span className="text-ok">0 %</span> = l'Élève diplômé. La colonne «~» est la
            moyenne glissante (lisse les petits volumes). Le coût est <em>estimé</em>.
          </p>

          {byType.length > 0 && (
            <>
              <h4 className="mb-1 mt-2 text-[10px] uppercase tracking-wide text-faint">
                Rendement par type de projet
              </h4>
              <ul className="space-y-1">
                {byType.map((t) => (
                  <li key={t.type} className="flex items-baseline justify-between text-[11px]">
                    <span className="font-mono text-dim">{t.type}</span>
                    <span className="font-mono text-faint">
                      <span className={t.firstPassPct >= 60 ? "text-ok" : ""}>{t.firstPassPct} %</span> 1er
                      tour · {t.turns}t · {fmt$(t.savedUsd)} est.
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Section>
      )}

      {axiomMap && axiomMap.total > 0 && (
        <Section title="Cartographie du clapet (axiomes)">
          <div className="mb-1.5 flex items-baseline justify-between text-[11px]">
            <span className="font-mono text-dim">{axiomMap.total} axiome(s)</span>
            <span className="font-mono text-faint">
              {axiomMap.byMaturity.confirmé} confirmé · {axiomMap.byMaturity.candidat} candidat
            </span>
          </div>
          <ClapetBars byCat={axiomMap.byCat} />
        </Section>
      )}

      <p className="px-1 text-[10px] leading-snug text-faint">
        Moyenne {avgTurns.toFixed(1)} tours/tâche.
        {!hasRelay &&
          " Le compagnonnage de l'Élève apparaîtra dès le premier tour avec le cerveau 🎓 Élève local."}
      </p>
    </div>
  );
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

// Axiom density by category — the "carte du clapet". Reuses the per-day bar look.
function ClapetBars({ byCat }) {
  const entries = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return null;
  const max = Math.max(...entries.map(([, n]) => n), 1);
  return (
    <div className="space-y-1">
      {entries.map(([cat, n]) => (
        <div key={cat} className="flex items-center gap-2 text-[11px]">
          <span className="w-16 shrink-0 font-mono text-faint">{cat}</span>
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

function Breakdown({ entries }) {
  return (
    <ul className="space-y-1">
      {entries.map(([k, v]) => (
        <li key={k} className="flex items-baseline justify-between text-[11px]">
          <span className="font-mono text-dim">{k}</span>
          <span className="font-mono text-faint">
            {v.count}t · {`$${v.cost.toFixed(2)}`}
          </span>
        </li>
      ))}
    </ul>
  );
}
