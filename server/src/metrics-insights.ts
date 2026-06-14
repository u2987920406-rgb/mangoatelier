// Dashboard de compagnonnage (Phase 2 du jalon D) : dérive, à partir des lignes
// brutes de .metrics.jsonl, les indicateurs de pilotage de l'émancipation de
// l'Élève. Fonction PURE (rows + stats d'axiomes → objet) → testable sans UI ni
// serveur, comme parseContract.
//
// Hiérarchie des indicateurs (recadrage acté) : le RENDEMENT 1er tour mesure le
// progrès réel de l'Élève ; la SOUVERAINETÉ est une estimation de motivation
// (elle monte aussi quand on utilise plus l'Élève, pas seulement quand il
// progresse) — d'où le drapeau `estimated`.

import type { TurnMetrics } from "./metrics.js";
import type { AxiomStats } from "./axioms.js";

export interface Insights {
  relayTurns: number; // nombre de tours pilotés par l'Élève (resolvedBy défini)
  firstPassYield: { pct: number; n: number }; // résolu par l'Élève en 1 tentative
  sovereignty: {
    savedUsd: number; // estimé : ce que Claude aurait coûté pour les tours Élève
    escalationUsd: number; // coût réel des escalades vers Claude
    netUsd: number; // saved − escalation
    baselineUsd: number; // coût moyen d'un vrai tour Claude (la base de l'estimation)
    estimated: true;
  };
  emancipation: Array<{
    day: string;
    total: number;
    intervened: number;
    pct: number; // % d'intervention du jour
    rollingPct: number; // % d'intervention cumulé (lisse les petits volumes)
  }>;
  // Rendement & économies par type de projet (Phase 2) — où l'Élève excelle/peine.
  byType: Array<{ type: string; turns: number; firstPassPct: number; savedUsd: number }>;
  axiomMap: AxiomStats;
  // Idée 21 — vues d'audit (nourrissent l'audit coûts du 2026-06-22). Sur TOUS
  // les tours (pas seulement l'Élève) : la tendance et les drivers de coût.
  weekly: Array<{ week: string; turns: number; costUsd: number; avgTurns: number; avgCostUsd: number }>;
  costDrivers: Array<{
    type: string;
    turns: number;
    totalCostUsd: number;
    avgCostUsd: number;
    avgTurns: number;
    avgSnapshots: number;
    avgDurationMs: number;
  }>;
}

// Lundi (UTC) de la semaine d'un horodatage, en "YYYY-MM-DD" — clé de
// regroupement hebdomadaire stable et lisible. Pur. "?" si date invalide.
export function weekStart(ts: string): string {
  const d = new Date(`${(ts ?? "").slice(0, 10)}T00:00:00Z`);
  if (isNaN(d.getTime())) return "?";
  const dow = (d.getUTCDay() + 6) % 7; // lundi = 0 … dimanche = 6
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}

export function computeInsights(rows: TurnMetrics[], axiomMap: AxiomStats): Insights {
  const relay = rows.filter((r) => r.resolvedBy);

  // Rendement du premier tour : parmi les tours Élève, part résolue par l'Élève
  // dès la 1re tentative (sans la boucle de feedback). L'indicateur de progrès.
  const solvedFirstTry = relay.filter((r) => r.resolvedBy === "eleve" && r.attempts === 1).length;
  const firstPassYield = {
    pct: relay.length ? Math.round((solvedFirstTry / relay.length) * 100) : 0,
    n: relay.length,
  };

  // Souveraineté financière (ESTIMÉE) : on ne connaît pas le coût contrefactuel
  // de Claude ; on l'approxime par le coût moyen des vrais tours Claude observés.
  const claudeTurns = rows.filter((r) => r.model !== "eleve" && (r.costUsd ?? 0) > 0);
  const baselineUsd = claudeTurns.length
    ? claudeTurns.reduce((s, r) => s + (r.costUsd ?? 0), 0) / claudeTurns.length
    : 0;
  const eleveSolved = relay.filter((r) => r.resolvedBy === "eleve").length;
  const savedUsd = eleveSolved * baselineUsd;
  const escalationUsd = relay
    .filter((r) => r.resolvedBy !== "eleve")
    .reduce((s, r) => s + (r.costUsd ?? 0), 0);
  const sovereignty = {
    savedUsd,
    escalationUsd,
    netUsd: savedUsd - escalationUsd,
    baselineUsd,
    estimated: true as const,
  };

  // Courbe d'émancipation : % d'intervention par jour + moyenne glissante cumulée.
  const perDay: Record<string, { total: number; intervened: number }> = {};
  for (const r of relay) {
    const d = (r.ts ?? "").slice(0, 10) || "?";
    const x = (perDay[d] ??= { total: 0, intervened: 0 });
    x.total++;
    if (r.resolvedBy !== "eleve") x.intervened++;
  }
  let cumT = 0;
  let cumI = 0;
  const emancipation = Object.entries(perDay)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, v]) => {
      cumT += v.total;
      cumI += v.intervened;
      return {
        day,
        total: v.total,
        intervened: v.intervened,
        pct: Math.round((v.intervened / v.total) * 100),
        rollingPct: Math.round((cumI / cumT) * 100),
      };
    });

  // Par type de projet : rendement 1er tour + économies estimées, là où l'Élève
  // est le plus sollicité. Révèle les types qu'il maîtrise vs ceux à renforcer.
  const typeMap: Record<string, { turns: number; solo1: number; solved: number }> = {};
  for (const r of relay) {
    const t = r.projectType ?? "?";
    const x = (typeMap[t] ??= { turns: 0, solo1: 0, solved: 0 });
    x.turns++;
    if (r.resolvedBy === "eleve") {
      x.solved++;
      if (r.attempts === 1) x.solo1++;
    }
  }
  const byType = Object.entries(typeMap)
    .map(([type, v]) => ({
      type,
      turns: v.turns,
      firstPassPct: Math.round((v.solo1 / v.turns) * 100),
      savedUsd: v.solved * baselineUsd,
    }))
    .sort((a, b) => b.turns - a.turns);

  // Coût par semaine (tendance lissée vs le bruit journalier) — sur tous les tours.
  const perWeek: Record<string, { turns: number; cost: number; numTurns: number }> = {};
  for (const r of rows) {
    const w = weekStart(r.ts);
    const x = (perWeek[w] ??= { turns: 0, cost: 0, numTurns: 0 });
    x.turns++;
    x.cost += r.costUsd ?? 0;
    x.numTurns += r.numTurns ?? 0;
  }
  const weekly = Object.entries(perWeek)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([week, v]) => ({
      week,
      turns: v.turns,
      costUsd: v.cost,
      avgTurns: v.turns ? v.numTurns / v.turns : 0,
      avgCostUsd: v.turns ? v.cost / v.turns : 0,
    }));

  // Drivers de coût par type de projet : où l'argent, les tours, les snapshots et
  // le temps se concentrent → cibles d'optimisation pour l'audit du 2026-06-22.
  const drv: Record<
    string,
    { turns: number; cost: number; numTurns: number; snaps: number; dur: number }
  > = {};
  for (const r of rows) {
    const t = r.projectType ?? "?";
    const x = (drv[t] ??= { turns: 0, cost: 0, numTurns: 0, snaps: 0, dur: 0 });
    x.turns++;
    x.cost += r.costUsd ?? 0;
    x.numTurns += r.numTurns ?? 0;
    x.snaps += r.snapshots ?? 0;
    x.dur += r.durationMs ?? 0;
  }
  const costDrivers = Object.entries(drv)
    .map(([type, v]) => ({
      type,
      turns: v.turns,
      totalCostUsd: v.cost,
      avgCostUsd: v.turns ? v.cost / v.turns : 0,
      avgTurns: v.turns ? v.numTurns / v.turns : 0,
      avgSnapshots: v.turns ? v.snaps / v.turns : 0,
      avgDurationMs: v.turns ? v.dur / v.turns : 0,
    }))
    .sort((a, b) => b.totalCostUsd - a.totalCostUsd);

  return {
    relayTurns: relay.length,
    firstPassYield,
    sovereignty,
    emancipation,
    byType,
    axiomMap,
    weekly,
    costDrivers,
  };
}
