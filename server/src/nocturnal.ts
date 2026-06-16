// Idée #58 (Automation nocturne) + #59 (Juge esthétique) — VAGUE 1 (cœur).
// MangoAI génère N projets (via Claude/abonnement, mode MVP autonome), les GARDE
// (≠ train-loop #32 qui les jette), et un JUGE Haiku (#59) note chacun /10 sur 5
// axes → tri/pré-filtre pour la review matinale. Vague 2 : planificateur auto +
// questionnaire structuré → axiomes (RLHF amplifié).
//
// Cerveau de génération : Claude via l'abonnement (runAgent, mode "mvp" pour
// éviter les questions de cadrage Élite — la génération est autonome, personne
// ne répond la nuit). Réutilise la diversité de train-loop (generateUniquePrompts).
import fs from "node:fs";
import path from "node:path";
import type { Express, Request, Response } from "express";
import { createProject, projectDir, WORKSPACE_DIR } from "./projects.js";
import { runAgent } from "./agent.js";
import { generateUniquePrompts } from "./train-loop.js";
import { askLLM, resolveProvider } from "./llm-engine.js";
import { loadPreferences } from "./preferences.js";
import { atomicWriteFileSync } from "./safe-io.js";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "nocturnal.json");

export interface JudgeDims {
  design: number;
  fonctionnel: number;
  originalite: number;
  coherence: number;
  qualite: number;
}

export interface NocturnalEntry {
  id: string;
  batchId: string;
  name: string; // dossier projet dans workspace/
  task: string;
  kind: string;
  projectType: string;
  ts: string;
  success: boolean;
  costUsd: number;
  score?: number; // /10 global (#59)
  dims?: JudgeDims;
  judgeComment?: string;
}

function loadEntries(): NocturnalEntry[] {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8")) as NocturnalEntry[];
  } catch {
    return [];
  }
}

function saveEntries(entries: NocturnalEntry[]): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  atomicWriteFileSync(FILE, JSON.stringify(entries, null, 2));
}

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ── État du batch en cours (in-memory) ───────────────────────────────────────
let running = false;
let progress = { current: 0, total: 0, label: "" };

// ── Juge esthétique #59 ──────────────────────────────────────────────────────

/** Parse la sortie JSON du juge en {score, dims, comment} robuste (clamp 0-10).
 * Pur & testable. Renvoie null si rien d'exploitable. */
export function parseJudgeOutput(raw: string): { score: number; dims: JudgeDims; comment: string } | null {
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const obj = JSON.parse(match[0]) as Record<string, unknown>;
    const clamp = (v: unknown): number => {
      const n = typeof v === "number" ? v : Number(v);
      if (!Number.isFinite(n)) return 0;
      return Math.max(0, Math.min(10, Math.round(n * 10) / 10));
    };
    const d = (obj.dims ?? obj) as Record<string, unknown>;
    const dims: JudgeDims = {
      design: clamp(d.design),
      fonctionnel: clamp(d.fonctionnel ?? d.functional),
      originalite: clamp(d.originalite ?? d.originality),
      coherence: clamp(d.coherence ?? d.coherence_profil),
      qualite: clamp(d.qualite ?? d.quality ?? d.code),
    };
    const avg = (dims.design + dims.fonctionnel + dims.originalite + dims.coherence + dims.qualite) / 5;
    const score = obj.score !== undefined ? clamp(obj.score) : Math.round(avg * 10) / 10;
    const comment = typeof obj.comment === "string" ? obj.comment : "";
    return { score, dims, comment };
  } catch {
    return null;
  }
}

/** Collecte un échantillon de fichiers source du projet pour le juge (borné). */
function collectSource(dir: string, maxFiles = 6, maxChars = 2500): string {
  const srcDir = path.join(dir, "src");
  let out = "";
  let count = 0;
  const walk = (d: string) => {
    let items: fs.Dirent[];
    try {
      items = fs.readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const it of items) {
      if (count >= maxFiles) return;
      const p = path.join(d, it.name);
      if (it.isDirectory()) {
        if (it.name === "node_modules") continue;
        walk(p);
      } else if (/\.(jsx?|tsx?|css)$/.test(it.name)) {
        try {
          const content = fs.readFileSync(p, "utf8").slice(0, maxChars);
          out += `\n--- ${path.relative(dir, p)} ---\n${content}\n`;
          count++;
        } catch {
          /* skip */
        }
      }
    }
  };
  walk(srcDir);
  return out;
}

/** Juge un projet : note /10 sur 5 axes via Haiku (#59, abonnement). Best-effort. */
export async function judgeProject(dir: string, task: string): Promise<{ score: number; dims: JudgeDims; comment: string } | null> {
  const source = collectSource(dir);
  if (!source.trim()) return null;
  const prefs = loadPreferences(WORKSPACE_DIR);
  const system =
    "Tu es un juge esthétique et technique senior. Tu notes une app web générée sur 5 axes, de 0 à 10. Tu réponds UNIQUEMENT par un JSON valide, sans markdown.";
  const user = `Tâche demandée : ${task}\n${prefs ? `\nPréférences connues de l'utilisateur :\n${prefs.slice(0, 800)}\n` : ""}\nCode du projet (échantillon) :\n${source}\n\nNote ce projet de 0 à 10 sur chaque axe et donne un commentaire bref (1 phrase). Réponds EXACTEMENT par :\n{"dims":{"design":N,"fonctionnel":N,"originalite":N,"coherence":N,"qualite":N},"score":N,"comment":"…"}\n- design = esthétique/UI · fonctionnel = ça marche/complet · originalite = sort de l'ordinaire · coherence = fidèle au goût utilisateur ci-dessus · qualite = qualité du code.`;
  try {
    const raw = await askLLM(system, user, { provider: resolveProvider(process.env.NOCTURNAL_JUDGE_PROVIDER, "claude"), maxTokens: 400 });
    return parseJudgeOutput(raw);
  } catch {
    return null;
  }
}

// ── Génération d'un projet (Claude autonome) ─────────────────────────────────

const AUTONOMOUS_SUFFIX =
  "\n\nMode autonome (génération nocturne) : ne pose AUCUNE question, prends les meilleures décisions toi-même et construis directement une app complète et soignée.";

async function buildOne(prompt: { task: string; kind: string; projectType: string }, batchId: string, index: number): Promise<NocturnalEntry> {
  const name = `nuit-${batchId}-${index}`;
  const dir = projectDir(name);
  const provider = resolveProvider(process.env.NOCTURNAL_PROVIDER, "claude");
  let costUsd = 0;
  let success = false;
  try {
    await createProject(name);
    // provider claude → runAgent (Claude/abonnement). (Un provider non-claude
    // resterait à câbler en vague 2 ; aujourd'hui défaut = claude.)
    void provider;
    for await (const ev of runAgent(prompt.task + AUTONOMOUS_SUFFIX, dir, undefined, "sonnet", "mvp")) {
      if (ev.type === "result") {
        costUsd = ev.costUsd ?? 0;
        success = ev.ok;
      }
    }
  } catch {
    success = false;
  }
  const entry: NocturnalEntry = {
    id: genId(),
    batchId,
    name,
    task: prompt.task,
    kind: prompt.kind,
    projectType: prompt.projectType,
    ts: new Date().toISOString(),
    success,
    costUsd,
  };
  // Juge (#59) — best-effort, n'empêche jamais d'enregistrer le projet.
  if (success) {
    const verdict = await judgeProject(dir, prompt.task);
    if (verdict) {
      entry.score = verdict.score;
      entry.dims = verdict.dims;
      entry.judgeComment = verdict.comment;
    }
  }
  return entry;
}

/** Génère un lot de `count` projets, les garde et les juge. Séquentiel (les
 * builds se disputeraient npm/disque en parallèle). Met à jour l'état `running`. */
export async function runNocturnalBatch(count: number): Promise<void> {
  if (running) return;
  running = true;
  const batchId = genId();
  const n = Math.max(1, Math.min(count || 5, 10));
  progress = { current: 0, total: n, label: "Préparation…" };
  try {
    const prompts = generateUniquePrompts(n);
    const entries = loadEntries();
    for (let i = 0; i < prompts.length; i++) {
      progress = { current: i + 1, total: n, label: prompts[i].task.slice(0, 60) };
      const entry = await buildOne(prompts[i], batchId, i + 1);
      entries.unshift(entry);
      saveEntries(entries); // persiste au fil de l'eau (récupérable si crash)
    }
  } finally {
    running = false;
    progress = { current: 0, total: 0, label: "" };
  }
}

// ── Routes ───────────────────────────────────────────────────────────────────

export function registerNocturnalRoutes(app: Express): void {
  app.get("/api/nocturnal", (_req: Request, res: Response) => {
    res.json({ entries: loadEntries(), running, progress });
  });

  app.post("/api/nocturnal/run", (req: Request, res: Response) => {
    if (running) {
      res.status(409).json({ error: "Un lot est déjà en cours" });
      return;
    }
    const count = Number((req.body as { count?: unknown })?.count) || 3;
    void runNocturnalBatch(count); // fire-and-forget : on poll via GET
    res.json({ started: true, count: Math.max(1, Math.min(count, 10)) });
  });

  app.delete("/api/nocturnal/:id", (req: Request, res: Response) => {
    const { id } = req.params;
    const entries = loadEntries();
    const entry = entries.find((e) => e.id === id);
    if (!entry) {
      res.status(404).json({ error: "introuvable" });
      return;
    }
    // Supprime le projet du disque + l'entrée.
    try {
      fs.rmSync(projectDir(entry.name), { recursive: true, force: true });
    } catch {
      /* best effort */
    }
    saveEntries(entries.filter((e) => e.id !== id));
    res.json({ ok: true });
  });
}
