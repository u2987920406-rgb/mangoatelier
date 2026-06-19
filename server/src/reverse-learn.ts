// Phase 1 de #104 — Reverse-engineering de codage.
// Quand Claude (expert) FINIT un projet qu'un Élève (junior local) avait laissé
// incomplet, on observe COMMENT il s'y est pris (le diff Gemma→Claude) et on
// distille UNE procédure réutilisable (#75) : situation → démarche → pièges →
// étapes validées. La prochaine fois qu'une situation SIMILAIRE se présente, la
// procédure est récupérée et injectée à l'Élève (Phase 3). « Apprendre de la
// solution, pas seulement de l'erreur. »
//
// askLLM est injectable → testable sans réseau ni coût (voir test-reverse-learn.ts).

import fs from "node:fs";
import path from "node:path";
import { askLLM } from "./llm-engine.js";
import { saveProcedure, type ProcedureEntry } from "./procedures.js";

// ── Diff borné Gemma(avant) → Claude(après) ────────────────────────────────────
const SKIP = new Set(["node_modules", "dist", ".git", ".snapshots", ".diffs", ".gemma-snapshots"]);
const DIFF_MAX_FILES = 14; // fichiers source détaillés au LLM
const DIFF_FILE_MAX = 1800; // caractères par fichier
const DIFF_TOTAL_MAX = 14_000; // budget total du diff

export interface FileChange {
  path: string;
  status: "added" | "modified";
  beforeLines: number;
  afterLines: number;
  after: string; // contenu Claude (tronqué)
}

function listSrcFiles(root: string): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    let entries: fs.Dirent[];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (SKIP.has(e.name) || e.name.startsWith(".env")) continue;
      const abs = path.join(dir, e.name);
      if (e.isDirectory()) walk(abs);
      else if (/\.(jsx?|tsx?|css|json|html)$/.test(e.name)) out.push(path.relative(root, abs).replaceAll("\\", "/"));
    }
  };
  walk(root);
  return out;
}

const lineCount = (s: string) => (s ? s.split("\n").length : 0);

/** Compare l'arbre source Claude à l'archive Gemma. Priorise les fichiers à
 *  forte logique (hooks, utils, components, App) et borne le volume total. */
export function computeDiff(gemmaDir: string, claudeDir: string): FileChange[] {
  const after = listSrcFiles(claudeDir);
  const changes: FileChange[] = [];
  for (const rel of after) {
    let aft: string;
    try { aft = fs.readFileSync(path.join(claudeDir, rel), "utf8"); } catch { continue; }
    let bef = "";
    try { bef = fs.readFileSync(path.join(gemmaDir, rel), "utf8"); } catch { /* fichier ajouté */ }
    if (bef === aft) continue; // inchangé
    changes.push({
      path: rel,
      status: bef ? "modified" : "added",
      beforeLines: lineCount(bef),
      afterLines: lineCount(aft),
      after: aft.length > DIFF_FILE_MAX ? aft.slice(0, DIFF_FILE_MAX) + "\n/* …tronqué… */" : aft,
    });
  }
  // Priorité : logique (hooks/utils/use*) > composants > reste ; puis par ampleur du changement.
  const score = (c: FileChange) =>
    (/(hooks?|utils?|lib|use[A-Z]|spacing|store|context)/i.test(c.path) ? 100 : /components?|src\/[^/]+\.(jsx?|tsx?)/i.test(c.path) ? 50 : 0) +
    Math.min(40, Math.abs(c.afterLines - c.beforeLines));
  return changes.sort((a, b) => score(b) - score(a));
}

/** Sérialise le diff en texte borné pour le LLM. */
export function diffToText(changes: FileChange[]): string {
  const lines: string[] = [`${changes.length} fichier(s) ajouté(s)/modifié(s) par l'expert :`, ""];
  let budget = DIFF_TOTAL_MAX;
  let shown = 0;
  for (const c of changes) {
    const header = `### ${c.path} [${c.status}] (${c.beforeLines}→${c.afterLines} lignes)`;
    if (shown >= DIFF_MAX_FILES || budget <= 0) { lines.push(`- ${c.path} [${c.status}] (non détaillé)`); continue; }
    const block = `${header}\n\`\`\`\n${c.after}\n\`\`\``;
    if (block.length > budget) { lines.push(`- ${c.path} [${c.status}] (omis, budget)`); continue; }
    lines.push(block, "");
    budget -= block.length;
    shown++;
  }
  return lines.join("\n");
}

// ── Distillation LLM → procédure ───────────────────────────────────────────────
const SYSTEM = `Tu observes COMMENT un développeur EXPERT a complété un projet React qu'un modèle JUNIOR local avait laissé incomplet (souvent réduit au template de démo). À partir de la tâche et du diff (les fichiers que l'expert a ajoutés/modifiés), distille UNE procédure RÉUTILISABLE qui apprendrait au junior à s'y prendre la prochaine fois sur une situation SIMILAIRE.

NE décris pas ce projet précis : généralise en une DÉMARCHE transférable. Ce n'est PAS du code à copier, ni une règle abstraite — c'est la MÉTHODE pas-à-pas (l'ordre des gestes, les décisions, les pièges).

Réponds STRICTEMENT en JSON, sans texte autour :
{
  "name": "titre court de la procédure (ex. 'App CRUD persistée en localStorage')",
  "problem": "la situation déclencheuse en une phrase, riche en mots-clés pour le matching futur",
  "tags": ["3 à 6 mots-clés"],
  "body": "markdown : ## Situation / ## Démarche (étapes numérotées) / ## Pièges (dont 'ne jamais livrer le template de démo — implémenter CHAQUE feature') / ## Étapes de validation"
}`;

export interface ReverseLearnDeps {
  ask: (system: string, user: string) => Promise<string>;
}
const defaultDeps: ReverseLearnDeps = {
  ask: (s, u) => askLLM(s, u, { maxTokens: 1500 }),
};

/** Parse robuste du JSON (tolère ```json … ``` et du bruit autour). */
export function parseProcedureJson(raw: string): { name: string; problem: string; tags: string[]; body: string } | null {
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const o = JSON.parse(m[0]) as Record<string, unknown>;
    const name = typeof o.name === "string" ? o.name.trim() : "";
    const problem = typeof o.problem === "string" ? o.problem.trim() : "";
    const body = typeof o.body === "string" ? o.body.trim() : "";
    const tags = Array.isArray(o.tags) ? o.tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 6) : [];
    if (!name || !body) return null;
    return { name, problem: problem || name, tags, body };
  } catch {
    return null;
  }
}

export interface LearnResult { ok: boolean; slug?: string; name?: string; reason?: string; }

/** Distille une procédure du diff Gemma→Claude et la persiste (#75). */
export async function learnFromSolution(
  args: { workspaceDir: string; task: string; gemmaDir: string; claudeDir: string; nowIso: string },
  deps: ReverseLearnDeps = defaultDeps,
): Promise<LearnResult> {
  const changes = computeDiff(args.gemmaDir, args.claudeDir);
  if (changes.length === 0) return { ok: false, reason: "aucun changement détecté entre Gemma et Claude" };

  const user = `TÂCHE INITIALE :\n${args.task}\n\n${diffToText(changes)}`;
  let raw: string;
  try { raw = await deps.ask(SYSTEM, user); }
  catch (e) { return { ok: false, reason: `LLM: ${(e as Error).message}` }; }

  const parsed = parseProcedureJson(raw);
  if (!parsed) return { ok: false, reason: "réponse LLM non parsable en procédure JSON" };

  const slug = parsed.name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
  const entry: ProcedureEntry = {
    meta: {
      slug, name: parsed.name, problem: parsed.problem, tags: parsed.tags,
      usedIn: [], createdAt: args.nowIso, updatedAt: args.nowIso,
    },
    body: parsed.body,
  };
  try { saveProcedure(args.workspaceDir, entry); }
  catch (e) { return { ok: false, reason: `saveProcedure: ${(e as Error).message}` }; }
  return { ok: true, slug, name: parsed.name };
}
