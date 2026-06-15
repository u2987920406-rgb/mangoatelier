// Idée #42 — MangoAI comme cerveau personnel : couches d'identité.
// Three workspace-level knowledge stores, distinct from project memory and the
// generic user profile. They capture HOW the user expresses themselves, HOW
// they think, and WHERE they are going across ALL projects:
//   - .language.md       — personal vocabulary: shortcuts, habitual phrasings,
//                          recurring transcription errors ("Obama" → Ollama),
//                          expressions that carry a precise MangoAI meaning.
//   - .thinking-style.md — decision style: explores before acting, validates by
//                          logic, thinks in analogies, questions before accepting;
//                          when they explore vs when they want execution.
//   - .vision.md         — the user's EXPLICIT validations: a process they liked,
//                          an approach to reuse, a pattern they asked to keep.
// They live at the workspace root (global, not per-project). FOUNDING RULE:
//   - .language.md and .thinking-style.md are curated AUTOMATICALLY by the
//     background reviewer (it detects recurring language/decision patterns).
//   - .vision.md is 100% MANUAL — the reviewer NEVER writes it. Only an explicit
//     user signal ("garde ça", "j'aime bien ce pattern", "intègre ça") puts data
//     there. MangoAI is being educated: the user authors the data they judge good.
import path from "node:path";
import fs from "node:fs";

export const LANGUAGE_FILE_NAME = ".language.md";
export const THINKING_STYLE_FILE_NAME = ".thinking-style.md";
export const VISION_FILE_NAME = ".vision.md";

// Per-layer character cap (model-independent), same discipline as the user
// profile so no single layer can flood the system prompt.
const LAYER_MAX_CHARS = 3000;
// Combined cap for the injected section — keep the three layers light enough to
// ride in every turn's system prompt without crowding out the task.
const SECTION_MAX_CHARS = 2000;

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

function saveLayer(workspaceDir: string, fileName: string, content: string): void {
  fs.mkdirSync(workspaceDir, { recursive: true });
  fs.writeFileSync(path.join(workspaceDir, fileName), content, "utf8");
}

export function loadLanguage(workspaceDir: string): string {
  return loadCapped(path.join(workspaceDir, LANGUAGE_FILE_NAME), LAYER_MAX_CHARS);
}
export function saveLanguage(workspaceDir: string, content: string): void {
  saveLayer(workspaceDir, LANGUAGE_FILE_NAME, content);
}

export function loadThinkingStyle(workspaceDir: string): string {
  return loadCapped(path.join(workspaceDir, THINKING_STYLE_FILE_NAME), LAYER_MAX_CHARS);
}
export function saveThinkingStyle(workspaceDir: string, content: string): void {
  saveLayer(workspaceDir, THINKING_STYLE_FILE_NAME, content);
}

export function loadVision(workspaceDir: string): string {
  return loadCapped(path.join(workspaceDir, VISION_FILE_NAME), LAYER_MAX_CHARS);
}
export function saveVision(workspaceDir: string, content: string): void {
  saveLayer(workspaceDir, VISION_FILE_NAME, content);
}

// Maps the API :layer param to its loader/saver so the endpoints stay generic.
export type IdentityLayer = "language" | "thinking" | "vision";
export const IDENTITY_LAYERS: Record<IdentityLayer, {
  load: (workspaceDir: string) => string;
  save: (workspaceDir: string, content: string) => void;
}> = {
  language: { load: loadLanguage, save: saveLanguage },
  thinking: { load: loadThinkingStyle, save: saveThinkingStyle },
  vision: { load: loadVision, save: saveVision },
};

/** Cheap change detector for the background reviewer (combined fingerprint). */
export function identitySnapshot(workspaceDir: string): string {
  return [LANGUAGE_FILE_NAME, THINKING_STYLE_FILE_NAME, VISION_FILE_NAME]
    .map((f) => {
      try {
        const st = fs.statSync(path.join(workspaceDir, f));
        return `${st.size}:${st.mtimeMs}`;
      } catch {
        return "";
      }
    })
    .join("|");
}

/** System-prompt section assembling the three identity layers ("" if all empty).
 *  Compact by construction and hard-capped to ~SECTION_MAX_CHARS total so it
 *  never crowds the prompt. */
export function identityPromptSection(workspaceDir: string): string {
  const language = loadLanguage(workspaceDir);
  const thinking = loadThinkingStyle(workspaceDir);
  const vision = loadVision(workspaceDir);
  if (!language && !thinking && !vision) return "";

  const parts: string[] = [];
  if (language) {
    parts.push(
      `The user's personal vocabulary (${LANGUAGE_FILE_NAME}) — interpret their words through this: shortcuts, habitual phrasings, recurring dictation/transcription errors, and expressions that carry a precise meaning here:\n${language}`,
    );
  }
  if (thinking) {
    parts.push(
      `The user's thinking style (${THINKING_STYLE_FILE_NAME}) — adapt your posture to how they decide (when they explore vs when they want execution):\n${thinking}`,
    );
  }
  if (vision) {
    parts.push(
      `The user's explicitly validated patterns (${VISION_FILE_NAME}) — processes and approaches they personally asked to keep and reuse; honor and reapply them:\n${vision}`,
    );
  }

  let body = parts.join("\n\n");
  if (body.length > SECTION_MAX_CHARS) {
    body = `${body.slice(0, SECTION_MAX_CHARS)}\n[... tronqué — condense les couches d'identité]`;
  }
  return `\n\nWho the user is, deeply (personal identity layers — apply these to read intent and stay on their wavelength):\n${body}`;
}
