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

  return { relayTurns: relay.length, firstPassYield, sovereignty, emancipation, byType, axiomMap };
}
