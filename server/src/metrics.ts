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
};

/** Best-effort append — losing one metric must never affect a turn. */
export function recordTurnMetrics(m: TurnMetrics): void {
  try {
    fs.appendFileSync(METRICS_FILE, `${JSON.stringify(m)}\n`);
  } catch (err) {
    console.warn("[metrics]", err instanceof Error ? err.message : err);
  }
}
