// Learned skill library, transposed from Hermes Agent's skills system:
// reusable how-to patterns capitalized by the background reviewer under
// workspace/.skills/<class-level-name>/SKILL.md (YAML frontmatter with name
// and description). Progressive disclosure: only metadata is injected into
// the system prompt; the agent Reads the full SKILL.md on demand.
import path from "node:path";
import fs from "node:fs";
import { WORKSPACE_DIR } from "./projects.js";

export const SKILLS_DIR = path.join(WORKSPACE_DIR, ".skills");

export type SkillMeta = { name: string; description: string; file: string };

// Frontmatter caps: the library is written by the background reviewer (an
// LLM), so a malformed SKILL.md must degrade gracefully — never flood the
// system prompt, never crash the turn that builds it.
const NAME_MAX_CHARS = 80;
const DESC_MAX_CHARS = 240;

function capLine(value: string, max: number): string {
  const flat = value.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}

export function listSkills(): SkillMeta[] {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(SKILLS_DIR, { withFileTypes: true });
  } catch {
    return []; // no library yet
  }
  const metas: SkillMeta[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const file = path.join(SKILLS_DIR, entry.name, "SKILL.md");
    try {
      const head = fs.readFileSync(file, "utf8").slice(0, 2000);
      const fm = /^---\s*\r?\n([\s\S]*?)\r?\n---/.exec(head);
      const get = (key: string): string | undefined =>
        fm ? new RegExp(`^${key}:\\s*(.+)$`, "m").exec(fm[1])?.[1]?.trim() : undefined;
      metas.push({
        name: capLine(get("name") ?? entry.name, NAME_MAX_CHARS),
        description: capLine(get("description") ?? "", DESC_MAX_CHARS),
        file,
      });
    } catch (err) {
      // Unreadable or missing SKILL.md → that skill is skipped, the rest of
      // the library (and the turn) survives.
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
        console.warn(`[skills] ${entry.name}:`, err instanceof Error ? err.message : err);
      }
    }
  }
  return metas;
}

/** Progressive disclosure: metadata only; the agent reads files on demand. */
export function skillsPromptSection(): string {
  const skills = listSkills();
  if (skills.length === 0) return "";
  const list = skills
    .map((s) => `- ${s.name}: ${s.description}\n  → ${s.file}`)
    .join("\n");
  return `\n\nLearned skills (how-to guides built from past sessions). Before starting, if one matches the task, Read its SKILL.md and follow it:\n${list}`;
}

/** Cheap change detector for the whole library (paths + sizes + mtimes). */
export function skillsSnapshot(): string {
  try {
    return fs
      .readdirSync(SKILLS_DIR, { recursive: true })
      .map(String)
      .sort()
      .map((rel) => {
        try {
          const st = fs.statSync(path.join(SKILLS_DIR, rel));
          return `${rel}:${st.isFile() ? st.size : "d"}:${st.mtimeMs}`;
        } catch {
          return `${rel}:gone`; // deleted between readdir and stat
        }
      })
      .join("|");
  } catch {
    return "";
  }
}
