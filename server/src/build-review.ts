// Revue rétroactive — extraire les étapes "agent" d'un build et persister les notes.
import path from "node:path";
import fs from "node:fs";
import { projectDir } from "./projects.js";

export interface BuildStep {
  index: number;   // position absolue dans chat-history.json
  text: string;
  ts: string;
}

export interface StepRating {
  stepIndex: number;
  score: number;   // 1-5
  comment: string;
  ratedAt: string;
}

const HISTORY_FILE  = ".chat-history.json";
const RATINGS_FILE  = ".build-review.json";

function ratingsPath(name: string): string {
  return path.join(projectDir(name), RATINGS_FILE);
}

function historyPath(name: string): string {
  return path.join(projectDir(name), HISTORY_FILE);
}

export function loadSteps(projectName: string): BuildStep[] {
  const p = historyPath(projectName);
  if (!fs.existsSync(p)) return [];
  let raw: unknown;
  try { raw = JSON.parse(fs.readFileSync(p, "utf8")); } catch { return []; }
  if (!Array.isArray(raw)) return [];
  const steps: BuildStep[] = [];
  (raw as Array<{ role: string; text: string; ts?: string }>).forEach((entry, i) => {
    if (entry.role === "agent" && typeof entry.text === "string") {
      steps.push({ index: i, text: entry.text, ts: entry.ts ?? "" });
    }
  });
  return steps;
}

export function loadRatings(projectName: string): StepRating[] {
  const p = ratingsPath(projectName);
  if (!fs.existsSync(p)) return [];
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return []; }
}

export function saveRating(projectName: string, stepIndex: number, score: number, comment: string): void {
  const ratings = loadRatings(projectName).filter((r) => r.stepIndex !== stepIndex);
  ratings.push({ stepIndex, score, comment, ratedAt: new Date().toISOString() });
  ratings.sort((a, b) => a.stepIndex - b.stepIndex);
  fs.writeFileSync(ratingsPath(projectName), JSON.stringify(ratings, null, 2), "utf8");
}

export function deleteRating(projectName: string, stepIndex: number): void {
  const ratings = loadRatings(projectName).filter((r) => r.stepIndex !== stepIndex);
  fs.writeFileSync(ratingsPath(projectName), JSON.stringify(ratings, null, 2), "utf8");
}
