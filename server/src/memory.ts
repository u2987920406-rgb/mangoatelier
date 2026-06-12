// Per-project persistent memory curated by the agent itself (Hermes-style):
// workspace/<project>/.memory.md holds durable decisions, user preferences and
// project conventions. It is read as a frozen snapshot at the start of each
// turn and injected into the system prompt; the agent updates the file with
// its own Write/Edit tools when it learns something durable.
import path from "node:path";
import fs from "node:fs";

export const MEMORY_FILE_NAME = ".memory.md";
// Cross-project user profile (Hermes' USER.md equivalent): who the user is,
// independent of any single project. Lives at the workspace root.
export const USER_PROFILE_FILE_NAME = ".user-profile.md";

// Character caps (not tokens — model-independent) so a runaway file can
// never flood the system prompt.
const MEMORY_MAX_CHARS = 6000;
const PROFILE_MAX_CHARS = 3000;

function loadCapped(file: string, maxChars: number): string {
  try {
    const text = fs.readFileSync(file, "utf8").trim();
    return text.length > maxChars
      ? `${text.slice(0, maxChars)}\n[... tronqué à ${maxChars} caractères — condense le fichier]`
      : text;
  } catch {
    return "";
  }
}

export function loadMemory(dir: string): string {
  return loadCapped(path.join(dir, MEMORY_FILE_NAME), MEMORY_MAX_CHARS);
}

export function loadUserProfile(workspaceDir: string): string {
  return loadCapped(path.join(workspaceDir, USER_PROFILE_FILE_NAME), PROFILE_MAX_CHARS);
}

// Standing instructions for the MAIN agent. Curation is handled by the
// background reviewer (review.ts) after each turn, Hermes-style — the main
// agent only writes memory when the user explicitly asks.
export const MEMORY_RULES = `
Project memory:
- The file ${MEMORY_FILE_NAME} at the project root is your persistent memory for this project; a background reviewer curates it automatically after each task.
- Only edit it yourself when the user explicitly asks you to remember (or forget) something — then keep it short factual bullets and merge instead of duplicating.`;

/** System-prompt sections with the current snapshots ("" if nothing yet). */
export function memoryPromptSection(dir: string, workspaceDir: string): string {
  const memory = loadMemory(dir);
  const profile = loadUserProfile(workspaceDir);
  let section = "";
  if (profile) {
    section += `\n\nWhat you know about the user across all projects (${USER_PROFILE_FILE_NAME}) — apply these tastes by default:\n${profile}`;
  }
  if (memory) {
    section += `\n\nCurrent project memory (${MEMORY_FILE_NAME}) — honor these facts without re-asking:\n${memory}`;
  }
  return section;
}
