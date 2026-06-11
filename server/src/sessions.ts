// Persists the Agent SDK session id of each project so conversations
// survive a server restart. Stored in server/sessions.json.
import path from "node:path";
import fs from "node:fs";

const FILE = path.resolve(import.meta.dirname, "..", "sessions.json");

type SessionMap = Record<string, string>;

function load(): SessionMap {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch {
    return {};
  }
}

export function getSession(projectName: string): string | undefined {
  return load()[projectName];
}

export function saveSession(projectName: string, sessionId: string): void {
  const map = load();
  map[projectName] = sessionId;
  fs.writeFileSync(FILE, JSON.stringify(map, null, 2));
}
