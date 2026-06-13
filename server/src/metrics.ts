// Per-turn metrics: one JSON line appended to workspace/.metrics.jsonl.
// Fuel for the cost audit scheduled 2026-06-22 (statut.md, ideas 13/14): the
// learning loop's promise — fewer turns and lower cost over time at equal
// quality — only becomes verifiable if every turn leaves a dated record.
import path from "node:path";
import fs from "node:fs";
import { WORKSPACE_DIR } from "./projects.js";

export const METRICS_FILE = path.join(WORKSPACE_DIR, ".metrics.jsonl");

export type TurnMetrics = {
  ts: string;
  project: string;
  model: string;
  mode: string;
  costUsd: number;
  numTurns: number;
  contextTokens?: number;
  contextWindow?: number;
  snapshots: number;
  durationMs: number;
  error: boolean;
  // Phase Ultime jalon D : qui a résolu le tour quand l'Élève local est aux
  // commandes. Optionnels → les lignes Claude classiques restent valides.
  // Matière première de la courbe du taux d'intervention (→ 0 % = Élève diplômé).
  resolvedBy?: "eleve" | "maitre" | "none";
  attempts?: number;
};

/** Best-effort append — losing one metric must never affect a turn. */
export function recordTurnMetrics(m: TurnMetrics): void {
  try {
    fs.appendFileSync(METRICS_FILE, `${JSON.stringify(m)}\n`);
  } catch (err) {
    console.warn("[metrics]", err instanceof Error ? err.message : err);
  }
}

/** Reads the metrics log for the dashboard (idea 21). Tolerant: malformed or
 * legacy lines (e.g. before the `mode` field existed) are skipped/kept as-is,
 * never throwing. Returns the most recent `limit` turns. */
export function readMetrics(limit = 2000): TurnMetrics[] {
  let text: string;
  try {
    text = fs.readFileSync(METRICS_FILE, "utf8");
  } catch {
    return []; // no log yet
  }
  const rows: TurnMetrics[] = [];
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    try {
      const o = JSON.parse(t);
      if (o && typeof o.ts === "string") rows.push(o as TurnMetrics);
    } catch {
      // partial/corrupt line (best-effort append) — skip it
    }
  }
  return rows.slice(-limit);
}
