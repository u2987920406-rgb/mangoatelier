// Knowledge Flywheel (idea 10): a registry of UNIVERSAL axioms — abstract
// engineering/UX rules distilled from past work, independent of language,
// framework or project. This is the fourth knowledge store, distinct from:
//   - project memory (.memory.md)   — facts about ONE project
//   - user profile (.user-profile.md) — who the user is
//   - skills (.skills/*/SKILL.md)   — procedural HOW-TO, with code
// An axiom is the WHY/RULE, not the HOW: "a top fixed container must declare
// its stacking context", never "we set z-index:50 on the navbar of project X".
//
// Guard-rails (the user's explicit requirement, statut.md idea 10): the clapet
// is anti-FORGETTING, not anti-CORRECTION. Axioms are dated and falsifiable
// (a contradiction observed in a later turn = amend or delete), carry a
// maturity level (candidat → confirmé), are only DEFAULTS the user's request
// always overrides, and the registry is hard-capped to force curation.
import path from "node:path";
import fs from "node:fs";

export const AXIOMS_FILE_NAME = ".axioms.md";

// Hard character cap — the registry must stay light (it rides in every turn's
// system prompt). Hitting it forces the reviewer to merge/prune, never grow.
const AXIOMS_MAX_CHARS = 3000;

export function loadAxioms(workspaceDir: string): string {
  try {
    const text = fs.readFileSync(path.join(workspaceDir, AXIOMS_FILE_NAME), "utf8").trim();
    return text.length > AXIOMS_MAX_CHARS
      ? `${text.slice(0, AXIOMS_MAX_CHARS)}\n[... tronqué à ${AXIOMS_MAX_CHARS} caractères — condense le registre]`
      : text;
  } catch {
    return "";
  }
}

/** System-prompt section for the MAIN agent ("" if the registry is empty).
 * Framed as defaults, not dogma — the guard-rail lives in the wording. */
export function axiomsPromptSection(workspaceDir: string): string {
  const axioms = loadAxioms(workspaceDir);
  if (!axioms) return "";
  return (
    `\n\nLearned axioms (universal engineering/UX rules distilled from past work, in ${AXIOMS_FILE_NAME}). ` +
    `Treat each as a DEFAULT to apply proactively — but the user's explicit request always wins, and if an axiom is plainly wrong for the current context, ignore it (a background reviewer reconciles the registry):\n` +
    axioms
  );
}

/** Retrieval seam (Phase Ultime jalon A): the single entry point the prompt
 * assembler uses to obtain the axioms for a turn. Today it returns the whole
 * capped registry, identical to axiomsPromptSection — so behavior is unchanged.
 * v2 will filter here by project type and maturity (only the relevant,
 * confirmed axioms) so a smaller "student" model isn't saturated. */
export function selectAxioms(workspaceDir: string): string {
  return axiomsPromptSection(workspaceDir);
}

/** Cheap change detector (size + mtime). */
export function axiomsSnapshot(workspaceDir: string): string {
  try {
    const st = fs.statSync(path.join(workspaceDir, AXIOMS_FILE_NAME));
    return `${st.size}:${st.mtimeMs}`;
  } catch {
    return "";
  }
}
