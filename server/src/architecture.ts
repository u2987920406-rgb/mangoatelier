// Carte d'architecture vivante (Chantier #38).
// Per-project file .architecture.md that maps the technical structure of a
// generated app: components, pages, data flows, API endpoints, stack choices,
// key decisions. Lives at the project root (same level as .memory.md).
// The main agent reads it at the start of every turn on an existing project
// and updates it after significant structural changes — creating it on first
// encounter if absent.
import path from "node:path";
import fs from "node:fs";

export const ARCHITECTURE_FILE_NAME = ".architecture.md";
const ARCHITECTURE_MAX_CHARS = 5000;

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

export function loadArchitecture(dir: string): string {
  return loadCapped(path.join(dir, ARCHITECTURE_FILE_NAME), ARCHITECTURE_MAX_CHARS);
}

export const ARCHITECTURE_RULES = `
Project architecture map (${ARCHITECTURE_FILE_NAME}):
- This file is your living map of the project's technical structure. Read it at the START of every turn on an EXISTING project (when the file already exists) BEFORE touching any code — it tells you what's there and why.
- Update it (Write or Edit it directly) after any significant structural change: new component or page created, new API endpoint, new data model, new library added, major refactor. Keep entries concise (name + purpose + key detail). Target < 3000 chars — curated, not exhaustive.
- Sections to use: ## Stack, ## Composants, ## Pages, ## API, ## Données, ## Décisions clés.
- Create it when you first understand the full structure of a project (typically after the first substantial feature is built), NOT on trivial one-liner tweaks.`;

/** System-prompt section injecting the architecture map ("" if not yet created). */
export function architecturePromptSection(dir: string): string {
  const content = loadArchitecture(dir);
  if (!content) return "";
  return `\n\nProject architecture map (${ARCHITECTURE_FILE_NAME}) — read this before editing any existing code:\n${content}`;
}
