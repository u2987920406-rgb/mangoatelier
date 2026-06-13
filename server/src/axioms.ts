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

/** Frames an axiom body as defaults, not dogma — the guard-rail is in the wording. */
function frameAxioms(body: string): string {
  if (!body) return "";
  return (
    `\n\nLearned axioms (universal engineering/UX rules distilled from past work, in ${AXIOMS_FILE_NAME}). ` +
    `Treat each as a DEFAULT to apply proactively — but the user's explicit request always wins, and if an axiom is plainly wrong for the current context, ignore it (a background reviewer reconciles the registry):\n` +
    body
  );
}

/** System-prompt section for the MAIN agent ("" if the registry is empty). */
export function axiomsPromptSection(workspaceDir: string): string {
  return frameAxioms(loadAxioms(workspaceDir));
}

/** Context for relevance-based retrieval (jalon D, selectAxioms v2). */
export interface AxiomSelection {
  /** Task text — its keywords drive relevance and project-type detection. */
  task?: string;
  /** Explicit project type if known (e.g. "dashboard", "jeu 2D"). */
  projectType?: string;
  /** Hard cap on how many axioms to inject (anti-saturation). Default 5. */
  max?: number;
}

interface AxiomBlock {
  cat: string; // VISION, UIUX, ARCH, DATA, PERF, A11Y, BUILD…
  maturity: "confirmé" | "candidat" | "?";
  text: string; // the full block, verbatim
}

/** Splits the registry into individual axiom blocks (one per "AXIOME-…" header). */
function parseAxioms(raw: string): AxiomBlock[] {
  const blocks: AxiomBlock[] = [];
  let cur: string[] = [];
  const flush = () => {
    if (cur.length && /^\s*AXIOME-/i.test(cur[0])) {
      const header = cur[0];
      const cat = /AXIOME-([A-Z0-9]+)/i.exec(header)?.[1]?.toUpperCase() ?? "?";
      const maturity = /confirm/i.test(header) ? "confirmé" : /candidat/i.test(header) ? "candidat" : "?";
      blocks.push({ cat, maturity, text: cur.join("\n").trim() });
    }
    cur = [];
  };
  for (const line of raw.split(/\r?\n/)) {
    if (/^\s*AXIOME-/i.test(line)) flush();
    cur.push(line);
  }
  flush();
  return blocks;
}

// Project-type keywords (found in the task) → the axiom categories that matter
// for that kind of project. BUILD is universal and scored separately.
const TYPE_CATS: Array<{ kw: RegExp; cats: string[] }> = [
  { kw: /dashboard|tableau de bord|admin|graph|chart|stat/i, cats: ["DATA", "UIUX", "PERF", "A11Y"] },
  { kw: /\bjeu\b|game|canvas|sprite|collision/i, cats: ["VISION", "PERF", "ARCH"] },
  { kw: /slide|présentation|presentation|powerpoint|deck/i, cats: ["VISION", "UIUX"] },
  { kw: /agent|\bia\b|\bllm\b|chatbot|\bapi\b/i, cats: ["ARCH", "DATA"] },
  { kw: /vitrine|landing|site|page d'accueil/i, cats: ["UIUX", "VISION", "A11Y", "PERF"] },
  { kw: /formulaire|auth|login|signup|crud|supabase|panier|e-commerce/i, cats: ["UIUX", "ARCH", "DATA", "A11Y"] },
];

const STOPWORDS = new Set([
  "avec", "pour", "dans", "une", "des", "les", "que", "qui", "sur", "par", "the", "and", "for",
  "crée", "créer", "ajoute", "ajouter", "fais", "faire", "page", "projet", "fichier",
]);

function tokens(s: string): string[] {
  return (s.toLowerCase().match(/[a-zàâäéèêëîïôöùûüç]{4,}/g) ?? []).filter((t) => !STOPWORDS.has(t));
}

function relevantCats(sel: AxiomSelection): Set<string> {
  const hay = `${sel.task ?? ""} ${sel.projectType ?? ""}`;
  const cats = new Set<string>();
  for (const { kw, cats: cs } of TYPE_CATS) if (kw.test(hay)) cs.forEach((c) => cats.add(c));
  return cats;
}

function scoreAxiom(b: AxiomBlock, sel: AxiomSelection, cats: Set<string>, kw: string[]): number {
  let s = 0;
  // A confirmed rule is a safer default to feed a weak model than a candidate.
  s += b.maturity === "confirmé" ? 3 : b.maturity === "candidat" ? 1 : 0;
  // Build correctness applies to every project.
  if (b.cat === "BUILD") s += 2;
  // Category matches the detected project type.
  if (cats.has(b.cat)) s += 3;
  // Keyword overlap between the task and the axiom body.
  const body = b.text.toLowerCase();
  let hits = 0;
  for (const t of kw) if (body.includes(t)) hits++;
  s += Math.min(hits, 3);
  return s;
}

/** Retrieval seam (Phase Ultime jalon A → v2 at jalon D).
 * - No selection (Claude / scenario.ts): returns the WHOLE capped registry —
 *   behavior unchanged, the Master is never saturated.
 * - With a selection (the local Élève): returns only the most RELEVANT axioms
 *   (project type + task keywords + maturity), hard-capped, so a small model
 *   isn't drowned. Ordering is by descending relevance. */
export function selectAxioms(workspaceDir: string, sel?: AxiomSelection): string {
  if (!sel) return axiomsPromptSection(workspaceDir);
  const raw = loadAxioms(workspaceDir);
  if (!raw) return "";
  const blocks = parseAxioms(raw);
  if (!blocks.length) return "";
  const cats = relevantCats(sel);
  const kw = tokens(`${sel.task ?? ""} ${sel.projectType ?? ""}`);
  const ranked = blocks
    .map((b) => ({ b, score: scoreAxiom(b, sel, cats, kw) }))
    .sort((x, y) => y.score - x.score)
    .slice(0, sel.max ?? 5)
    .map((r) => r.b.text);
  return frameAxioms(ranked.join("\n\n"));
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
