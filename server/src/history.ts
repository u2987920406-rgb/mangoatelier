// Per-project persisted chat history, stored as display-ready messages in
// workspace/<project>/.chat-history.json so the UI can re-render it verbatim.
import path from "node:path";
import fs from "node:fs";

export const HISTORY_FILE_NAME = ".chat-history.json";

export type ChatEntry = {
  role: "user" | "agent" | "tool" | "error" | "status";
  text: string;
  ts: string;
};

function file(dir: string): string {
  return path.join(dir, HISTORY_FILE_NAME);
}

export function loadHistory(dir: string): ChatEntry[] {
  try {
    const data = JSON.parse(fs.readFileSync(file(dir), "utf8"));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function appendHistory(dir: string, entries: ChatEntry[]): void {
  if (entries.length === 0) return;
  const all = [...loadHistory(dir), ...entries];
  fs.writeFileSync(file(dir), JSON.stringify(all, null, 2));
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
