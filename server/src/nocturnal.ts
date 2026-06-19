// Idée #58 (Automation nocturne) + #59 (Juge esthétique) — VAGUE 1 (cœur).
// MangoOS génère N projets (via Claude/abonnement, mode MVP autonome), les GARDE
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
import { appendHistory, formatToolLine, loadHistory, type ChatEntry } from "./history.js";
import { inspectProject, type InspectionSignal } from "./inspection.js";
import { generateUniquePrompts } from "./train-loop.js";
import { resolveProvider } from "./llm-engine.js";
import { getBrain } from "./kernel.js";
import { loadPreferences } from "./preferences.js";
import { atomicWriteFileSync } from "./safe-io.js";
import { AXIOMS_FILE_NAME } from "./axioms.js";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "nocturnal.json");
const CONFIG_FILE = path.join(DATA_DIR, "nocturnal-config.json");

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
  reviewed?: boolean; // vague 2 : review matinale faite (questionnaire → axiomes)
}

// Réglages du planificateur auto nocturne (vague 2).
interface NocturnalConfig {
  enabled: boolean;
  count: number;
  hour: number; // heure locale (0-23) de génération
  lastAutoRun?: string; // YYYY-MM-DD du dernier run auto (1 fois/nuit)
}

function loadConfig(): NocturnalConfig {
  try {
    const c = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8")) as Partial<NocturnalConfig>;
    return {
      enabled: Boolean(c.enabled),
      count: typeof c.count === "number" ? Math.max(1, Math.min(10, c.count)) : 3,
      hour: typeof c.hour === "number" && c.hour >= 0 && c.hour <= 23 ? c.hour : 2,
      lastAutoRun: typeof c.lastAutoRun === "string" ? c.lastAutoRun : undefined,
    };
  } catch {
    return { enabled: false, count: 3, hour: 2 };
  }
}

function saveConfig(c: NocturnalConfig): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  atomicWriteFileSync(CONFIG_FILE, JSON.stringify(c, null, 2));
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
    const raw = await getBrain().complete(system, user, { provider: resolveProvider(process.env.NOCTURNAL_JUDGE_PROVIDER, "claude"), maxTokens: 400 });
    return parseJudgeOutput(raw);
  } catch {
    return null;
  }
}

// ── Génération d'un projet (Claude autonome) ─────────────────────────────────

const AUTONOMOUS_SUFFIX =
  "\n\nMode autonome (génération nocturne) : ne pose AUCUNE question, prends les meilleures décisions toi-même et construis directement une app complète et soignée. Soigne particulièrement le design : déploie le moodboard (recherche de leaders réels + capture Sharingan) pour une vraie charte graphique distinctive, jamais un rendu générique par défaut.";

// Nombre de tours de réparation autonome après un build cassé (la nuit, personne
// ne corrige à la main). Borné pour ne pas brûler la nuit sur un projet rétif.
const MAX_NOCTURNAL_REPAIRS = 2;

/** Prompt de réparation : on réinjecte la sortie d'erreur du build et on demande
 * une correction stricte (pas de nouvelle feature). Pur → testable. */
export function nocturnalRepairPrompt(buildError: string): string {
  return `Le build de l'app ÉCHOUE (npm run build / vite). Corrige la ou les erreurs ci-dessous — SANS ajouter de fonctionnalité, en gardant le design en place — puis assure-toi que le projet compile proprement. Sortie du build :\n\n${buildError}`;
}

// Dépendances injectables de la boucle de réparation : en prod ce sont
// inspectProject (vrai `vite build`) et un tour runAgent ; en test, des fakes
// sans réseau ni build. Même esprit que defaultRelayDeps (eleve.ts).
export interface RepairDeps {
  inspect: (dir: string) => Promise<{ ok: boolean; signal: InspectionSignal; detail: string }>;
  repairTurn: (prompt: string) => Promise<void>;
  onStatus?: (msg: string) => void;
}

/** Vérifie objectivement que le projet compile et, si le build échoue, lance
 * jusqu'à `maxRepairs` tours de réparation autonome (sortie d'erreur réinjectée).
 * S'arrête dès que le build passe, au plafond, ou sur un signal non réparable
 * (≠ build-failed). Renvoie l'inspection finale (`ok` = compile VRAIMENT) et le
 * nombre de tentatives. Logique pure sur ses deps → testable sans réseau. */
export async function ensureBuildPasses(
  dir: string,
  deps: RepairDeps,
  maxRepairs: number = MAX_NOCTURNAL_REPAIRS,
): Promise<{ ok: boolean; signal: InspectionSignal; attempts: number }> {
  let inspection = await deps.inspect(dir);
  let attempts = 0;
  while (attempts < maxRepairs && inspection.signal === "build-failed") {
    attempts++;
    deps.onStatus?.(`🔧 Build en échec — réparation autonome (tentative ${attempts}/${maxRepairs})…`);
    await deps.repairTurn(nocturnalRepairPrompt(inspection.detail));
    inspection = await deps.inspect(dir);
  }
  return { ok: inspection.ok, signal: inspection.signal, attempts };
}

async function buildOne(prompt: { task: string; kind: string; projectType: string }, batchId: string, index: number): Promise<NocturnalEntry> {
  const name = `nuit-${batchId}-${index}`;
  const dir = projectDir(name);
  const provider = resolveProvider(process.env.NOCTURNAL_PROVIDER, "claude");
  let costUsd = 0;
  let success = false;
  // Génération directe via runAgent (≠ /api/chat) : on reconstitue ici l'historique
  // de chat du projet, comme le fait index.ts, pour qu'ouvrir un projet nocturne
  // montre le prompt initial + la conversation de génération dans le panneau Chat.
  const turn: ChatEntry[] = [{ role: "user", text: prompt.task, ts: new Date().toISOString() }];
  const record = (role: ChatEntry["role"], text: string) =>
    turn.push({ role, text, ts: new Date().toISOString() });
  // sessionId capturé au 1er tour → les tours de réparation REPRENNENT la même
  // conversation (l'agent garde le contexte de ce qu'il a construit).
  let sessionId: string | undefined;
  // Mode "nocturne" : arsenal design d'Élite (moodboard Sharingan + web +
  // design-system) SANS les portes humaines (personne ne valide la nuit).
  const consumeTurn = async (genPrompt: string): Promise<void> => {
    for await (const ev of runAgent(genPrompt, dir, sessionId, "sonnet", "nocturne")) {
      if (ev.type === "result") {
        costUsd += ev.costUsd ?? 0;
        sessionId = ev.sessionId;
        if (!ev.ok) record("error", `L'agent s'est arrêté : ${ev.error}`);
      } else if (ev.type === "text") record("agent", ev.text);
      else if (ev.type === "thinking") record("thinking", ev.text);
      else if (ev.type === "tool") record("tool", formatToolLine(ev.name, ev.detail));
      else if (ev.type === "error") record("error", ev.message);
    }
  };
  try {
    await createProject(name);
    // provider claude → runAgent (Claude/abonnement). (Un provider non-claude
    // resterait à câbler en vague 2 ; aujourd'hui défaut = claude.)
    void provider;
    // 1) Génération initiale.
    await consumeTurn(prompt.task + AUTONOMOUS_SUFFIX);
    // 2) Vérification OBJECTIVE du build + auto-réparation. La voie Claude ne le
    //    faisait pas (≠ runRelay/Élève) : un projet pouvait être "success" sans
    //    compiler — d'où des projets cassés en galerie, notés par le juge. On
    //    rebuild réellement et, si ça casse, on fait corriger l'agent (borné).
    const verdict = await ensureBuildPasses(dir, {
      inspect: (d) => inspectProject(d),
      repairTurn: (p) => consumeTurn(p),
      onStatus: (msg) => record("status", msg),
    });
    // success = le projet compile VRAIMENT (seul "ok" compte). Un build cassé
    // après réparations, ou un signal non réparable (timeout, no-deps…), reste KO.
    success = verdict.ok;
    if (!verdict.ok) record("error", `Build non valide après génération (${verdict.signal}).`);
  } catch {
    success = false;
  }
  // Persiste l'historique (best-effort, n'empêche jamais d'enregistrer l'entrée).
  try {
    appendHistory(dir, turn);
  } catch {
    /* best effort */
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
export async function runNocturnalBatch(count: number, opts: { freeStyle?: boolean } = {}): Promise<void> {
  if (running) return;
  running = true;
  const batchId = genId();
  const n = Math.max(1, Math.min(count || 5, 10));
  progress = { current: 0, total: n, label: "Préparation…" };
  try {
    const prompts = generateUniquePrompts(n, opts);
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

// ── Review matinale → axiomes (vague 2, RLHF amplifié #41) ───────────────────

export interface NocturnalReviewInput {
  answers?: Record<string, boolean>; // ex. { design:true, fonctionnel:false, ... }
  liked?: string;
  disliked?: string;
}

/** Distille la review structurée d'un projet nocturne en axiome(s) tagué(s)
 * [review-nocturne] et l'append à .axioms.md. Best-effort, ne lève jamais. */
export async function reviewToAxioms(entry: NocturnalEntry, input: NocturnalReviewInput): Promise<void> {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const answersText = input.answers
      ? Object.entries(input.answers).map(([k, v]) => `${k}: ${v ? "oui" : "non"}`).join(", ")
      : "(aucune)";
    const liked = (input.liked ?? "").trim();
    const disliked = (input.disliked ?? "").trim();
    // Rien d'exploitable → pas d'axiome.
    if (!liked && !disliked && !input.answers) return;

    const system =
      "Tu distilles la review d'un projet généré en UN OU DEUX axiomes universels de goût/UX (règles abstraites réutilisables), pas une description. Réponds UNIQUEMENT par le(s) bloc(s) axiome demandé(s), rien d'autre.";
    const user = `L'utilisateur a passé en revue un projet web généré la nuit (« ${entry.task.slice(0, 200)} »).
Cases cochées : ${answersText}.
Ce qu'il a AIMÉ : « ${liked || "—"} ».
Ce qu'il n'a PAS aimé : « ${disliked || "—"} ».

Extrais 1 à 2 axiomes de goût/UX que cela t'apprend sur ses préférences, applicables à ses futurs projets. Format EXACT pour chaque axiome (rien d'autre) :
AXIOME-UX-XX [candidat] [validé-utilisateur] [review-nocturne]
- Contexte: (quand appliquer)
- Piège: (ce qu'il n'aime pas)
- Règle d'or: (ce qu'il préfère, concret)
- Source: 🌙 review nocturne (${today})`;

    let text = "";
    try {
      text = (await getBrain().complete(system, user, { provider: resolveProvider(process.env.NOCTURNAL_JUDGE_PROVIDER, "claude"), maxTokens: 500 })).trim();
    } catch {
      return;
    }
    if (!text.startsWith("AXIOME-")) return;
    const axiomsPath = path.join(WORKSPACE_DIR, AXIOMS_FILE_NAME);
    fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
    const existing = fs.existsSync(axiomsPath) ? fs.readFileSync(axiomsPath, "utf8").trim() : "";
    fs.writeFileSync(axiomsPath, (existing ? `${existing}\n\n${text}` : text) + "\n", "utf8");

    // #55a — si la charte graphique ET l'ergonomie sont validées, baliser comme
    // candidat LoRA dans .train.jsonl. On capture le code source MAINTENANT
    // (le dossier existe encore) pour que l'entrée soit autoportante — la paire
    // tâche→solution survit à toute suppression ultérieure du projet.
    const loraCrit = input.answers?.charte_graphique === true && input.answers?.ergonomie === true;
    if (loraCrit) {
      const trainLog = path.join(WORKSPACE_DIR, ".train.jsonl");
      const dir = path.join(WORKSPACE_DIR, entry.name);
      const solution = collectSource(dir, 12, 4000);
      // #55a v2 — on embarque aussi la conversation complète (raisonnement +
      // outils + décisions intermédiaires), pas juste le code final.
      // C'est le CHEMIN vers la solution : pourquoi ce composant d'abord, pourquoi
      // ce refactor, pourquoi cette structure — c'est ça que le LoRA doit apprendre.
      const conversation = loadHistory(dir).filter(
        (e) => e.role === "agent" || e.role === "thinking" || e.role === "user",
      );
      fs.appendFileSync(
        trainLog,
        `${JSON.stringify({ ts: new Date().toISOString(), kind: "nocturnal-review", task: entry.task, conversation, solution, score: entry.score, dims: entry.dims, lora_candidate: true })}\n`,
        "utf8",
      );
    }
  } catch {
    return;
  }
}

// ── Planificateur auto nocturne (vague 2) ────────────────────────────────────

function localDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Tick périodique : lance un lot une fois par nuit à l'heure configurée. */
function startNocturnalScheduler(): void {
  const tick = () => {
    try {
      const cfg = loadConfig();
      if (!cfg.enabled || running) return;
      if (new Date().getHours() !== cfg.hour) return;
      if (cfg.lastAutoRun === localDate()) return; // déjà tourné cette nuit
      saveConfig({ ...cfg, lastAutoRun: localDate() });
      void runNocturnalBatch(cfg.count);
    } catch {
      /* ignore */
    }
  };
  setInterval(tick, 15 * 60 * 1000); // toutes les 15 min
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
    const body = req.body as { count?: unknown; freeStyle?: unknown };
    const count = Number(body?.count) || 3;
    const freeStyle = Boolean(body?.freeStyle);
    void runNocturnalBatch(count, { freeStyle }); // fire-and-forget : on poll via GET
    res.json({ started: true, count: Math.max(1, Math.min(count, 10)), freeStyle });
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

  // Réglages du planificateur auto nocturne (vague 2).
  app.get("/api/nocturnal/config", (_req: Request, res: Response) => {
    res.json(loadConfig());
  });

  app.put("/api/nocturnal/config", (req: Request, res: Response) => {
    const body = req.body as Partial<NocturnalConfig>;
    const cur = loadConfig();
    const next: NocturnalConfig = {
      ...cur,
      ...(typeof body.enabled === "boolean" ? { enabled: body.enabled } : {}),
      ...(typeof body.count === "number" ? { count: Math.max(1, Math.min(10, body.count)) } : {}),
      ...(typeof body.hour === "number" && body.hour >= 0 && body.hour <= 23 ? { hour: body.hour } : {}),
    };
    saveConfig(next);
    res.json(next);
  });

  // Review structurée d'un projet → axiomes (vague 2). Marque l'entrée reviewée.
  app.post("/api/nocturnal/:id/review", (req: Request, res: Response) => {
    const { id } = req.params;
    const entries = loadEntries();
    const entry = entries.find((e) => e.id === id);
    if (!entry) {
      res.status(404).json({ error: "introuvable" });
      return;
    }
    const body = req.body as NocturnalReviewInput;
    void reviewToAxioms(entry, body); // fire-and-forget : la synthèse tourne en fond
    entry.reviewed = true;
    saveEntries(entries);
    res.json({ ok: true });
  });

  startNocturnalScheduler();
}
