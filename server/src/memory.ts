// Per-project persistent memory curated by the agent itself (Hermes-style):
// workspace/<project>/.memory.md holds durable decisions, user preferences and
// project conventions. It is read as a frozen snapshot at the start of each
// turn and injected into the system prompt; the agent updates the file with
// its own Write/Edit tools when it learns something durable.
import path from "node:path";
import fs from "node:fs";

export const MEMORY_FILE_NAME = ".memory.md";

// Character cap (not tokens — model-independent) so a runaway memory file
// can never flood the system prompt.
const MAX_CHARS = 6000;

export function loadMemory(dir: string): string {
  try {
    const text = fs.readFileSync(path.join(dir, MEMORY_FILE_NAME), "utf8").trim();
    return text.length > MAX_CHARS
      ? `${text.slice(0, MAX_CHARS)}\n[... mémoire tronquée à ${MAX_CHARS} caractères — condense le fichier]`
      : text;
  } catch {
    return "";
  }
}

// Standing instructions for the MAIN agent. Curation is handled by the
// background reviewer (review.ts) after each turn, Hermes-style — the main
// agent only writes memory when the user explicitly asks.
export const MEMORY_RULES = `
Project memory:
- The file ${MEMORY_FILE_NAME} at the project root is your persistent memory for this project; a background reviewer curates it automatically after each task.
- Only edit it yourself when the user explicitly asks you to remember (or forget) something — then keep it short factual bullets and merge instead of duplicating.`;

/** System-prompt section with the current snapshot ("" if no memory yet). */
export function memoryPromptSection(dir: string): string {
  const memory = loadMemory(dir);
  if (!memory) return "";
  return `\n\nCurrent project memory (${MEMORY_FILE_NAME}) — honor these facts without re-asking:\n${memory}`;
}
