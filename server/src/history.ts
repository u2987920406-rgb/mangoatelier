// Per-project persisted chat history, stored as display-ready messages in
// workspace/<project>/.chat-history.json so the UI can re-render it verbatim.
import path from "node:path";
import fs from "node:fs";
import { atomicWriteFileSync } from "./safe-io.js";

export const HISTORY_FILE_NAME = ".chat-history.json";

const ROLES = ["user", "agent", "thinking", "tool", "error", "status"] as const;

export type ChatEntry = {
  role: (typeof ROLES)[number];
  text: string;
  ts: string;
};

function isChatEntry(value: unknown): value is ChatEntry {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.text === "string" &&
    typeof v.ts === "string" &&
    ROLES.includes(v.role as ChatEntry["role"])
  );
}

function file(dir: string): string {
  return path.join(dir, HISTORY_FILE_NAME);
}

// Entry-level validation: a corrupted file (or one rewritten by a buggy
// background agent) degrades to "some lines lost", never to a crashed turn
// or a UI fed with malformed messages.
export function loadHistory(dir: string): ChatEntry[] {
  try {
    const data: unknown = JSON.parse(fs.readFileSync(file(dir), "utf8"));
    return Array.isArray(data) ? data.filter(isChatEntry) : [];
  } catch {
    return [];
  }
}

export function appendHistory(dir: string, entries: ChatEntry[]): void {
  if (entries.length === 0) return;
  const all = [...loadHistory(dir), ...entries];
  atomicWriteFileSync(file(dir), JSON.stringify(all, null, 2));
}

/** Same icons as the UI so reloaded tool lines look identical to live ones. */
export function formatToolLine(name: string, detail: string): string {
  const icons: Record<string, string> = {
    Write: "📄",
    Edit: "✏️",
    Read: "👁️",
    Bash: "💻",
    Glob: "🔍",
    Grep: "🔍",
    Agent: "🤖",
    Task: "🤖",
  };
  return `${icons[name] ?? "🔧"} ${name} ${detail}`.trim();
}
