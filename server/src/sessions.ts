// Persists the Agent SDK session id of each project so conversations
// survive a server restart. Stored in server/sessions.json.
import path from "node:path";
import fs from "node:fs";
import { atomicWriteFileSync } from "./safe-io.js";

const FILE = path.resolve(import.meta.dirname, "..", "sessions.json");

type SessionMap = Record<string, string>;

// A corrupted or hand-edited file must never crash a turn: anything that is
// not a plain { project: sessionId } string map is dropped entry by entry.
function load(): SessionMap {
  try {
    const raw: unknown = JSON.parse(fs.readFileSync(FILE, "utf8"));
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return {};
    return Object.fromEntries(
      Object.entries(raw).filter(([, value]) => typeof value === "string"),
    ) as SessionMap;
  } catch {
    return {};
  }
}

// Losing one save only costs resume-after-restart (the id is re-saved on the
// next turn) — a disk hiccup must not abort the agent stream mid-turn.
function persist(map: SessionMap): void {
  try {
    atomicWriteFileSync(FILE, JSON.stringify(map, null, 2));
  } catch (err) {
    console.warn("[sessions]", err instanceof Error ? err.message : err);
  }
}

export function getSession(projectName: string): string | undefined {
  return load()[projectName];
}

export function saveSession(projectName: string, sessionId: string): void {
  const map = load();
  map[projectName] = sessionId;
  persist(map);
}

/** Drops a stored session id (e.g. when the SDK no longer knows it). */
export function clearSession(projectName: string): void {
  const map = load();
  if (!(projectName in map)) return;
  delete map[projectName];
  persist(map);
}
