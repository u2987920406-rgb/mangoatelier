// Idée #75 — Mémoire procédurale. 8e magasin de connaissance, cross-projet, à côté
// de .axioms.md : des SCHÉMAS DE RÉSOLUTION (comment Mango a résolu un problème
// technique récurrent — pagination, auth, drag-and-drop). Quand une situation
// SIMILAIRE se présente, Mango récupère sa propre procédure passée et l'adapte.
//
// Frontière : skill = code à copier · axiome = la règle (WHY) · procédure = la
// DÉMARCHE de résolution (situation → raisonnement → pièges → étapes validées).
//
// Stockage = pattern components.ts (dossier <slug>/{meta.json, PROCEDURE.md}).
// Récupération = pattern notes-rag.ts (embeddings Ollama persistés + cosinus, repli
// mots-clés). Embeddings calculés HORS du tour (backfill après review + route) ; le
// tour ne fait qu'un embed de la requête. L'embedder est injectable pour les tests.
import path from "node:path";
import fs from "node:fs";
import { cosine, safeEmbed } from "./notes-rag.js";

export const PROCEDURES_DIR_NAME = ".procedures";

// Seuil de similarité cosinus minimal pour la voie sémantique. nomic-embed-text a
// une similarité de base élevée (tout texte ~0.5+) ; mesuré : une VRAIE
// correspondance pique à 0.68–0.81, le bruit plafonne à ~0.59. 0.65 sépare net.
// Sans ce seuil, le top-K remonterait des procédures hors-sujet (bruit injecté).
const MIN_SIMILARITY = Number(process.env.PROCEDURE_MIN_SIMILARITY ?? 0.65);

export interface ProcedureMeta {
  slug: string;
  name: string;
  problem: string; // la situation déclencheuse — texte servant au matching
  tags: string[];
  usedIn: string[];
  embedding?: number[]; // pré-calculé (name+problem+tags), hors du chemin du tour
  createdAt: string;
  updatedAt: string;
}

export interface ProcedureEntry {
  meta: ProcedureMeta;
  body: string; // PROCEDURE.md — la démarche détaillée (lue à la demande)
}

/** Cerveau d'embedding injectable (tests sans Ollama). Défaut = safeEmbed. */
export interface ProcedureDeps {
  embed: (text: string) => Promise<number[] | null>;
}
const defaultDeps: ProcedureDeps = { embed: safeEmbed };

// ── Slug sécurisé (repris de references.ts — anti path-traversal) ─────────────
function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function isSafeSlug(slug: string): boolean {
  if (!slug) return false;
  if (/[/\\]/.test(slug)) return false;
  if (slug === ".." || slug.startsWith("../") || slug.startsWith("..\\")) return false;
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) return false;
  return true;
}

function procDir(workspaceDir: string): string {
  return path.join(workspaceDir, PROCEDURES_DIR_NAME);
}

/** Vérifie que le chemin résolu reste sous .procedures (double garde). */
function safeProcPath(workspaceDir: string, slug: string): string | null {
  if (!isSafeSlug(slug)) return null;
  const base = path.resolve(procDir(workspaceDir));
  const resolved = path.resolve(path.join(procDir(workspaceDir), slug));
  if (!resolved.startsWith(base + path.sep) && resolved !== base) return null;
  return resolved;
}

// ── CRUD ─────────────────────────────────────────────────────────────────────
/** Métadonnées de toutes les procédures (embedding inclus pour le retrieval ;
 * la couche API en renvoie une version allégée). Tri par nom. */
export function listProcedures(workspaceDir: string): ProcedureMeta[] {
  try {
    const dir = procDir(workspaceDir);
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const metas: ProcedureMeta[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      try {
        const raw = fs.readFileSync(path.join(dir, entry.name, "meta.json"), "utf8");
        metas.push(JSON.parse(raw) as ProcedureMeta);
      } catch {
        // skip malformed entries
      }
    }
    return metas.sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

export function loadProcedure(workspaceDir: string, slug: string): ProcedureEntry | null {
  const dir = safeProcPath(workspaceDir, slug);
  if (!dir) return null;
  try {
    const metaRaw = fs.readFileSync(path.join(dir, "meta.json"), "utf8");
    const body = fs.readFileSync(path.join(dir, "PROCEDURE.md"), "utf8");
    return { meta: JSON.parse(metaRaw) as ProcedureMeta, body };
  } catch {
    return null;
  }
}

/** Écrit meta.json + PROCEDURE.md. Slugifie le slug (ou le name) si nécessaire. */
export function saveProcedure(workspaceDir: string, entry: ProcedureEntry): void {
  const slug = isSafeSlug(entry.meta.slug) ? entry.meta.slug : slugify(entry.meta.slug || entry.meta.name);
  const dir = safeProcPath(workspaceDir, slug);
  if (!dir) throw new Error("slug de procédure invalide");
  fs.mkdirSync(dir, { recursive: true });
  const meta: ProcedureMeta = { ...entry.meta, slug };
  fs.writeFileSync(path.join(dir, "meta.json"), JSON.stringify(meta, null, 2), "utf8");
  fs.writeFileSync(path.join(dir, "PROCEDURE.md"), entry.body, "utf8");
}

export function deleteProcedure(workspaceDir: string, slug: string): void {
  const dir = safeProcPath(workspaceDir, slug);
  if (!dir) return;
  fs.rmSync(dir, { recursive: true, force: true });
}

/** Détecteur de changement bon marché (nombre + mtime du dossier). */
export function proceduresSnapshot(workspaceDir: string): string {
  try {
    const st = fs.statSync(procDir(workspaceDir));
    return `${listProcedures(workspaceDir).length}:${st.mtimeMs}`;
  } catch {
    return "";
  }
}

/** Texte représentatif d'une procédure pour l'embedding / le matching mots-clés. */
function procedureText(m: ProcedureMeta): string {
  return `${m.name}\n${m.problem}\n${m.tags.join(" ")}`;
}

// ── Indexation (embeddings, hors tour) ───────────────────────────────────────
/** Backfill best-effort : embed les procédures qui n'en ont pas et persiste.
 * Idempotent (une procédure déjà indexée est sautée). Ne lève jamais. */
export async function reindexProcedures(
  workspaceDir: string,
  deps: ProcedureDeps = defaultDeps,
): Promise<{ indexed: number; failed: number }> {
  let indexed = 0;
  let failed = 0;
  for (const meta of listProcedures(workspaceDir)) {
    if (Array.isArray(meta.embedding) && meta.embedding.length > 0) continue;
    let vec: number[] | null = null;
    try {
      vec = await deps.embed(procedureText(meta));
    } catch {
      vec = null;
    }
    if (vec) {
      const entry = loadProcedure(workspaceDir, meta.slug);
      if (entry) {
        saveProcedure(workspaceDir, { meta: { ...entry.meta, embedding: vec }, body: entry.body });
        indexed++;
      } else {
        failed++;
      }
    } else {
      failed++;
    }
  }
  return { indexed, failed };
}

// ── Récupération par similarité (modèle relevantNotes) ───────────────────────
function topByKeyword(metas: ProcedureMeta[], task: string, limit: number): ProcedureMeta[] {
  const words = task.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  if (words.length === 0) return [];
  return metas
    .map((m) => {
      const text = procedureText(m).toLowerCase();
      const score = words.reduce((acc, w) => acc + (text.includes(w) ? 1 : 0), 0);
      return { m, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.m);
}

/** Top procédures pour CETTE tâche : sémantique (cosinus sur embeddings persistés)
 * quand des procédures en portent ET la requête s'encode ; sinon repli mots-clés. */
export async function relevantProcedures(
  workspaceDir: string,
  task: string,
  limit = 2,
  deps: ProcedureDeps = defaultDeps,
): Promise<ProcedureMeta[]> {
  if (!task?.trim()) return [];
  const metas = listProcedures(workspaceDir);
  if (metas.length === 0) return [];
  const withEmb = metas.filter((m) => Array.isArray(m.embedding) && m.embedding!.length > 0);
  if (withEmb.length > 0) {
    let qv: number[] | null = null;
    try {
      qv = await deps.embed(task);
    } catch {
      qv = null;
    }
    if (qv) {
      return withEmb
        .map((m) => ({ m, score: cosine(qv!, m.embedding!) }))
        .filter((s) => s.score >= MIN_SIMILARITY) // garde-fou anti-bruit
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map((s) => s.m);
    }
  }
  return topByKeyword(metas, task, limit);
}

/** Bloc injecté (divulgation progressive PRÉ-FILTRÉE par similarité) : les
 * procédures pertinentes, le corps lu à la demande. "" si aucune. Ne lève jamais. */
export async function proceduresPromptSection(
  workspaceDir: string,
  task: string,
  limit = 2,
  deps: ProcedureDeps = defaultDeps,
): Promise<string> {
  try {
    const top = await relevantProcedures(workspaceDir, task, limit, deps);
    if (top.length === 0) return "";
    const lines = top.map((m) => {
      const tagStr = m.tags.length ? ` [${m.tags.join(", ")}]` : "";
      return `- **${m.name}** — ${m.problem}${tagStr}\n  → Read workspace/${PROCEDURES_DIR_NAME}/${m.slug}/PROCEDURE.md and ADAPT its approach (don't copy blindly).`;
    });
    return (
      `\n\nProcedural memory (idea #75) — past solution playbooks that MATCH this request. If one fits, follow its reasoning and adapt it instead of re-deriving from scratch:\n` +
      lines.join("\n")
    );
  } catch {
    return "";
  }
}
