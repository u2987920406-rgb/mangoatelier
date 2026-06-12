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

export function listSkills(): SkillMeta[] {
  if (!fs.existsSync(SKILLS_DIR)) return [];
  const metas: SkillMeta[] = [];
  for (const entry of fs.readdirSync(SKILLS_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const file = path.join(SKILLS_DIR, entry.name, "SKILL.md");
    if (!fs.existsSync(file)) continue;
    const head = fs.readFileSync(file, "utf8").slice(0, 2000);
    const fm = /^---\s*\r?\n([\s\S]*?)\r?\n---/.exec(head);
    const get = (key: string): string | undefined =>
      fm ? new RegExp(`^${key}:\\s*(.+)$`, "m").exec(fm[1])?.[1]?.trim() : undefined;
    metas.push({
      name: get("name") ?? entry.name,
      description: get("description") ?? "",
      file,
    });
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
  if (!fs.existsSync(SKILLS_DIR)) return "";
  return fs
    .readdirSync(SKILLS_DIR, { recursive: true })
    .map(String)
    .sort()
    .map((rel) => {
      const st = fs.statSync(path.join(SKILLS_DIR, rel));
      return `${rel}:${st.isFile() ? st.size : "d"}:${st.mtimeMs}`;
    })
    .join("|");
}
