import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

// Learning-curve dashboard (idea 21): reads /api/metrics (one row per turn)
// and shows where MangoAI's cost/turns/errors are heading over time. Future
// home of the "intervention rate" curve once a local student model exists.
// Mounted only while the menu is open, so it always re-fetches fresh data.
const fmt$ = (n) => `$${(n ?? 0).toFixed(n >= 1 ? 2 : 3)}`;

export default function Metrics() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/metrics")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`Erreur HTTP ${r.status}`))))
      .then((d) => alive && setRows(d.rows ?? []))
      .catch((e) => alive && setError(e.message ?? String(e)));
    return () => {
      alive = false;
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

  // Intervention rate (Phase Ultime jalon D): among turns run by the local
  // student (resolvedBy set), the share where Claude had to step in (anything
  // but "eleve"). The goal is this curve trending to 0 % — the student graduated.
  const relayRows = rows.filter((r) => r.resolvedBy);
  const eleveSolo = relayRows.filter((r) => r.resolvedBy === "eleve").length;
  const interventionPct = relayRows.length
    ? Math.round((1 - eleveSolo / relayRows.length) * 100)
    : 0;
  const relayPerDay = {};
  for (const r of relayRows) {
    const d = (r.ts ?? "").slice(0, 10) || "?";
    const x = (relayPerDay[d] ??= { total: 0, intervened: 0 });
    x.total++;
    if (r.resolvedBy !== "eleve") x.intervened++;
  }
  const relayDays = Object.entries(relayPerDay).sort((a, b) => a[0].localeCompare(b[0]));

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

      {relayRows.length > 0 && (
        <Section title="Taux d'intervention (Élève → Maître)">
          <div className="mb-2 grid grid-cols-2 gap-2">
            <Stat
              label="Intervention Claude"
              value={`${interventionPct} %`}
              tone={interventionPct <= 20 ? "ok" : "err"}
            />
            <Stat
              label="Autonomie Élève"
              value={`${100 - interventionPct} %`}
              tone={interventionPct <= 20 ? "ok" : undefined}
            />
          </div>
          <div className="space-y-1">
            {relayDays.map(([d, v]) => {
              const pct = Math.round((v.intervened / v.total) * 100);
              return (
                <div key={d} className="flex items-center gap-2 text-[11px]">
                  <span className="w-16 shrink-0 font-mono text-faint">{d.slice(5)}</span>
                  <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-edge-soft">
                    <span
                      className={`block h-full rounded-full ${pct <= 20 ? "bg-ok" : "bg-err"}`}
                      style={{ width: `${Math.max(4, pct)}%` }}
                    />
                  </span>
                  <span className={`w-10 shrink-0 text-right font-mono ${pct <= 20 ? "text-ok" : "text-err"}`}>
                    {pct} %
                  </span>
                  <span className="w-8 shrink-0 text-right font-mono text-faint">{v.total}t</span>
                </div>
              );
            })}
          </div>
          <p className="mt-1.5 px-1 text-[10px] leading-snug text-faint">
            Part des tours de l'Élève local où Claude a dû reprendre. Objectif :
            <span className="text-ok"> 0 %</span> = l'Élève est diplômé, la routine tourne à coût zéro.
          </p>
        </Section>
      )}

      <p className="px-1 text-[10px] leading-snug text-faint">
        Moyenne {avgTurns.toFixed(1)} tours/tâche.
        {relayRows.length === 0 &&
          " La courbe du taux d'intervention apparaîtra dès le premier tour avec le cerveau 🎓 Élève local."}
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
