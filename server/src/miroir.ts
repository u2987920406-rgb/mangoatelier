// Le Miroir (idée #48) — the comprehension mirror: the VALIDATION GATE that
// closes the founding cadrage (#47) BEFORE any app code is written. "Voici ce
// que j'ai compris de toi" — Mango reflects back, faithfully, what it understood
// of the user's need AND of the digested references (palette extracted, language
// contract, structure, references), so the user can VALIDATE or CORRECT it. It
// makes comprehension visible and correctable, killing misunderstandings before
// they cost a single line of code. The aboutissement of #47.
//
// Like plan.md and the language contract (#45), .miroir.md is written by the
// BUILD AGENT during the cadrage turn (it has all the context it just digested),
// not by a separate generation call — so this module is pure (no network) and
// fully testable. Modeled on lexique.ts: same load/save/RULES/promptSection
// shape, project-scoped artifact, character cap, living maintenance by the agent.
import path from "node:path";
import fs from "node:fs";
import { LEXIQUE_FILE_NAME } from "./lexique.js";

export const MIROIR_FILE_NAME = ".miroir.md";
const MIROIR_MAX_CHARS = 4000;

export function loadMiroir(dir: string): string {
  try {
    const text = fs.readFileSync(path.join(dir, MIROIR_FILE_NAME), "utf8").trim();
    return text.length > MIROIR_MAX_CHARS
      ? `${text.slice(0, MIROIR_MAX_CHARS)}\n[... tronqué à ${MIROIR_MAX_CHARS} caractères — condense le miroir]`
      : text;
  } catch {
    return "";
  }
}

export function saveMiroir(dir: string, content: string): void {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, MIROIR_FILE_NAME), content, "utf8");
}

export const MIROIR_RULES = `
Le Miroir (${MIROIR_FILE_NAME}) — comprehension mirror, the VALIDATION GATE that closes the founding cadrage BEFORE writing any app code:
- WHEN: at the end of the founding cadrage of a NEW project (or a major new direction), once you have digested the intention and the references — and BEFORE generating the app. SKIP entirely for small changes to an existing project.
- WHAT: write a concise recap to ${MIROIR_FILE_NAME} titled "Voici ce que j'ai compris de toi", reflecting back FAITHFULLY what you understood — not what you plan to build, but what you grasped of the user's need and references. Sections:
  · Intention — the core need, reformulated in ONE sentence in your own words.
  · Palette — the REAL colours you extracted, as a Markdown list of hex codes, each tied to its source: "- #1A1A2E — base sombre (depuis la photo du lieu)". Use only hex you actually captured (sharingan_url / sharingan_image / a mockup) — never invent colours here.
  · Ambiance & style — the visual mood in a few words, grounded in the references.
  · Structure & écrans — the main pages/sections you intend to build.
  · Langage — the key terms of the language contract (see ${LEXIQUE_FILE_NAME}).
  · Références digérées — each reference used and what you took from it (source → extraction).
- THEN present it briefly and ask the user to VALIDATE or CORRECT, point by point ("la palette te va ? la structure est bonne ?"). This is the whole point: make your understanding visible and correctable. Build the app ONLY after the user validates ("oui", "go", "vas-y"). If they correct a point, update ${MIROIR_FILE_NAME} and re-confirm before coding.
- LIVING: ${MIROIR_FILE_NAME} is the validated snapshot of mutual understanding; refresh it if the direction materially changes. It is grounding, not a deliverable — keep it tight (< ${MIROIR_MAX_CHARS} chars).`;

/** System-prompt section injecting the validated mirror ("" if absent), so the
 *  agent builds against the comprehension the user already confirmed. */
export function miroirPromptSection(dir: string): string {
  const content = loadMiroir(dir);
  if (!content) return "";
  return `\n\nLe Miroir validé (${MIROIR_FILE_NAME}) — the comprehension the user already confirmed; build against it, and refresh it if the direction changes:\n${content}`;
}

// ── Pure helper: extract the palette swatches for the UI ─────────────────────
// Parses the hex codes (and their trailing label, if any) out of the mirror's
// Palette list so the Knowledge panel can render real colour swatches — the
// "visible" half of Le Miroir. Pure → fully testable.

export interface MiroirSwatch {
  hex: string;
  label: string;
}

const HEX_RE = /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/;

/** Returns the deduped palette swatches found in the mirror, in order. Reads
 *  any line bearing a hex code (typically the "- #RRGGBB — label" Palette list),
 *  capturing the label after the first em/en dash or hyphen separator. */
export function parseMiroirPalette(miroirMd: string): MiroirSwatch[] {
  const out: MiroirSwatch[] = [];
  const seen = new Set<string>();
  for (const raw of miroirMd.split(/\r?\n/)) {
    const m = raw.match(HEX_RE);
    if (!m) continue;
    const hex = m[0].toLowerCase();
    if (seen.has(hex)) continue;
    seen.add(hex);
    // Label = text after the hex, stripped of the leading "—"/"–"/"-"/":" .
    const after = raw.slice(raw.indexOf(m[0]) + m[0].length).trim();
    const label = after.replace(/^[—–\-:•·]\s*/, "").trim();
    out.push({ hex, label });
  }
  return out;
}
