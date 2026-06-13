// Boucle de relais Maître/Élève (Phase Ultime, Jalon D — le « rouage de la
// bascule »). Orchestre les 4 briques déjà prouvées :
//   parseContract (contract.ts) · executeContract (executor.ts) ·
//   inspectProject (inspection.ts) · selectAxioms (axioms.ts)
//
//   1. L'Élève (modèle OSS local, Qwen via Ollama) tente la tâche à coût zéro,
//      en répondant dans le contrat <mangoai>, nourri des axiomes pertinents.
//   2. MangoAI applique (executeContract) puis JUGE objectivement (inspectProject).
//   3. Build vert → l'Élève a réussi seul.
//   4. Après MAX échecs OBJECTIFS → ESCALADE : le Maître (Claude) corrige ET
//      distille un AXIOME (clapet anti-retour) que l'Élève lira la prochaine fois.
//
// Les « cerveaux » (askEleve, escalate) sont injectables → la logique de relais
// est testable de bout en bout sans réseau ni coût (voir test-relay.ts).

import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { parseContract } from "./contract.js";
import { executeContract } from "./executor.js";
import { inspectProject, type Inspection } from "./inspection.js";
import { loadAxioms, selectAxioms } from "./axioms.js";
import { WORKSPACE_DIR } from "./projects.js";

const OLLAMA = process.env.OLLAMA_URL ?? "http://localhost:11434";
const ELEVE_MODEL = process.env.ELEVE_MODEL ?? "qwen2.5-coder:7b";
const MAX_ELEVE_ATTEMPTS = Number(process.env.ELEVE_MAX_ATTEMPTS ?? 2);
// Anti-saturation : nombre max d'axiomes injectés à l'Élève (modèle faible).
const ELEVE_AXIOM_CAP = Number(process.env.ELEVE_AXIOM_CAP ?? 5);

export type ResolvedBy = "eleve" | "maitre" | "none";

export interface RelayResult {
  resolvedBy: ResolvedBy;
  attempts: number; // tentatives de l'Élève avant succès/escalade
  success: boolean; // le build passe à la fin
  inspection: Inspection; // verdict objectif final
  axiom: boolean; // un axiome a-t-il été écrit lors de l'escalade
  costUsd: number; // coût Claude (0 si l'Élève a suffi)
  log: string[]; // trace lisible
}

export interface RelayOptions {
  maxEleveAttempts?: number;
  /** Modèle Claude pour l'escalade (défaut sonnet). */
  maitreModel?: string;
  /** Reçoit chaque ligne de trace en direct (pour le streaming SSE). */
  onLog?: (line: string) => void;
}

/** Les deux cerveaux + les effets de bord, injectables pour les tests. */
export interface RelayDeps {
  askEleve: (system: string, user: string) => Promise<string>;
  inspect: (projectDir: string) => Promise<Inspection>;
  ensureDeps: (projectDir: string, log: (s: string) => void) => Promise<void>;
  escalate: (ctx: EscalationContext) => Promise<{ axiom: boolean; costUsd: number }>;
}

export interface EscalationContext {
  task: string;
  projectDir: string;
  lastError: string;
  maitreModel: string;
}

// ── Face ENTRÉE du contrat : la forme immuable imposée à l'Élève ──────────────
const ELEVE_SYSTEM = `Tu es un développeur qui propose des actions à MangoAI.
Tu ne touches JAMAIS au disque : tu DÉCRIS les actions, MangoAI les exécutera.
Tu DOIS répondre UNIQUEMENT dans ce format à balises, sans aucune prose autour :

<mangoai>
  <write path="chemin/relatif">contenu brut du fichier</write>
  <edit path="chemin/relatif"><find>extrait exact existant</find><replace>nouvel extrait</replace></edit>
  <run>commande shell éventuelle</run>
  <summary>résumé court de ce que tu fais</summary>
</mangoai>

Règles strictes :
- path TOUJOURS relatif au projet (jamais C:\\, jamais /, jamais ..).
- Projet Vite + React (ESM) : utilise "export"/"import", JAMAIS "module.exports"/"require".
- <write> = fichier créé/écrasé entièrement ; <edit> = retouche ciblée (le <find> doit exister tel quel).
- Termine TOUJOURS par un <summary>. AUCUN texte hors de <mangoai>.`;

function listProjectFiles(projectDir: string, cap = 40): string[] {
  const out: string[] = [];
  const skip = new Set(["node_modules", "dist", ".git", ".assets", ".snapshots"]);
  const walk = (dir: string) => {
    if (out.length >= cap) return;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (out.length >= cap) return;
      if (skip.has(e.name) || e.name.startsWith(".env")) continue;
      const abs = path.join(dir, e.name);
      if (e.isDirectory()) walk(abs);
      else out.push(path.relative(projectDir, abs).replaceAll("\\", "/"));
    }
  };
  walk(projectDir);
  return out;
}

/** Message « utilisateur » envoyé à l'Élève : tâche + contexte + axiomes +
 * (en cas de reprise) la raison objective de l'échec précédent à corriger. */
function buildEleveUser(task: string, projectDir: string, lastError: string): string {
  const files = listProjectFiles(projectDir);
  // v2 : on ne sert à l'Élève (modèle faible) que les axiomes PERTINENTS pour
  // cette tâche, plafonnés — sinon un petit modèle sature. Claude, lui, reçoit
  // le registre complet (selectAxioms sans contexte, via scenario.ts).
  const axioms = selectAxioms(WORKSPACE_DIR, { task, max: ELEVE_AXIOM_CAP });
  const parts = [
    `TÂCHE : ${task}`,
    "",
    "Fichiers existants du projet :",
    files.length ? files.map((f) => `- ${f}`).join("\n") : "(projet vide)",
  ];
  if (axioms) parts.push("", axioms);
  if (lastError) {
    parts.push(
      "",
      "⚠ Ta tentative précédente a ÉCHOUÉ à une vérification objective. Corrige précisément :",
      lastError,
    );
  }
  parts.push("", "Réponds UNIQUEMENT dans le format <mangoai>.");
  return parts.join("\n");
}

// ── Cerveau Élève par défaut : Qwen local via Ollama ──────────────────────────
async function askEleveOllama(system: string, user: string): Promise<string> {
  const res = await fetch(`${OLLAMA}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: ELEVE_MODEL,
      stream: false,
      options: { temperature: 0 },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
  const data = (await res.json()) as { message?: { content?: string } };
  return data.message?.content ?? "";
}

async function ensureDepsNpm(projectDir: string, log: (s: string) => void): Promise<void> {
  if (fs.existsSync(path.join(projectDir, "node_modules"))) return;
  if (!fs.existsSync(path.join(projectDir, "package.json"))) return;
  log("npm install (dépendances manquantes)…");
  await new Promise<void>((resolve) => {
    const p = spawn("npm install", { cwd: projectDir, shell: true, windowsHide: true });
    p.on("exit", () => resolve());
    p.on("error", () => resolve());
  });
}

// ── Cerveau Maître par défaut : Claude corrige + écrit l'axiome ────────────────
const ESCALATE_SYSTEM = `Tu es le MAÎTRE dans l'apprentissage de MangoAI. Un modèle
ÉLÈVE local a tenté une tâche et a ÉCHOUÉ à une vérification OBJECTIVE (le build ne
passe pas). Deux missions, dans l'ordre :
1. CORRIGE le projet pour que "npm run build" passe — changement minimal et correct,
   pas de refonte. Tu peux lire/éditer les fichiers et lancer le build pour vérifier.
2. Puis distille EXACTEMENT UN axiome universel dans le registre .axioms.md (à la
   racine du workspace) expliquant le PIÈGE qui a fait trébucher l'Élève — la
   RÈGLE/le POURQUOI, jamais le code. Format, en français, une ligne vide entre axiomes :
     AXIOME-[CAT]-[NN] (maturité: candidat · vu: AAAA-MM-JJ)
     - Contexte : intention générale d'ingénierie/UX
     - Piège : le piège invisible
     - Règle d'or : la règle universelle verrouillante
   CAT ∈ {VISION,UIUX,ARCH,DATA,PERF,A11Y,BUILD}. Un nouvel axiome est TOUJOURS
   "candidat". Plafond ~12 axiomes / 3000 car. : fusionne plutôt que gonfler.
Ne touche à aucun fichier hors du projet et du registre d'axiomes.`;

async function escalateToClaude(ctx: EscalationContext): Promise<{ axiom: boolean; costUsd: number }> {
  const axBefore = loadAxioms(WORKSPACE_DIR);
  // cwd = workspace si le projet y vit (Claude atteint code + .axioms.md en
  // relatif, comme la revue) ; sinon repli sur le projet seul.
  const rel = path.relative(WORKSPACE_DIR, ctx.projectDir).replaceAll("\\", "/");
  const inside = rel !== "" && !rel.startsWith("..");
  const cwd = inside ? WORKSPACE_DIR : ctx.projectDir;
  const projRef = inside ? rel : ".";

  const prompt = [
    `Projet à réparer : ./${projRef}`,
    `Tâche demandée à l'Élève : ${ctx.task}`,
    "",
    "Échec objectif constaté :",
    ctx.lastError,
    "",
    `Registre d'axiomes (.axioms.md) actuel :`,
    axBefore || "(vide)",
    "",
    "Corrige le build, puis ajoute l'unique axiome, puis arrête-toi.",
  ].join("\n");

  const q = query({
    prompt,
    options: {
      cwd,
      model: ctx.maitreModel,
      maxTurns: 24,
      permissionMode: "acceptEdits",
      allowedTools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep"],
      systemPrompt: { type: "preset", preset: "claude_code", append: ESCALATE_SYSTEM },
    },
  });
  let costUsd = 0;
  for await (const m of q) if (m.type === "result") costUsd = m.total_cost_usd ?? 0;

  const axiom = loadAxioms(WORKSPACE_DIR) !== axBefore;
  return { axiom, costUsd };
}

export const defaultRelayDeps: RelayDeps = {
  askEleve: askEleveOllama,
  inspect: inspectProject,
  ensureDeps: ensureDepsNpm,
  escalate: escalateToClaude,
};

/** Le rouage de la bascule : l'Élève tente, MangoAI juge, le Maître escalade. */
export async function runRelay(
  task: string,
  projectDir: string,
  opts: RelayOptions = {},
  deps: RelayDeps = defaultRelayDeps,
): Promise<RelayResult> {
  const maxAttempts = opts.maxEleveAttempts ?? MAX_ELEVE_ATTEMPTS;
  const maitreModel = opts.maitreModel ?? "sonnet";
  const log: string[] = [];
  const push = (s: string) => {
    log.push(s);
    console.log(`[relay] ${s}`);
    opts.onLog?.(s);
  };

  // Sans dépendances, l'inspection renverrait un faux "no-deps" — on les pose une fois.
  await deps.ensureDeps(projectDir, push);

  let lastError = "";
  let lastInspection: Inspection = { ok: false, signal: "build-failed", detail: "", durationMs: 0 };

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    push(`Tentative ${attempt}/${maxAttempts} — l'Élève (${ELEVE_MODEL}) travaille…`);

    let raw: string;
    try {
      raw = await deps.askEleve(ELEVE_SYSTEM, buildEleveUser(task, projectDir, lastError));
    } catch (e) {
      lastError = `appel Élève impossible : ${(e as Error).message}`;
      push(`✗ ${lastError}`);
      continue;
    }

    const parsed = parseContract(raw);
    if (!parsed.ok) {
      lastError = `réponse hors-contrat : ${parsed.error}`;
      push(`✗ ${lastError}`);
      continue;
    }
    push(`Plan reçu (${parsed.actions.length} action(s))${parsed.repaired ? " [réparé]" : ""}`);

    const exec = await executeContract(parsed.actions, projectDir);
    if (!exec.ok) {
      const failed = exec.outcomes.find((o) => o.status === "failed");
      lastError = `exécution échouée : ${failed && "error" in failed ? failed.error : "?"}`;
      push(`✗ ${lastError}`);
      continue;
    }

    lastInspection = await deps.inspect(projectDir);
    if (lastInspection.ok) {
      push(`✓ build vert — résolu par l'ÉLÈVE en ${attempt} tentative(s), coût 0`);
      return { resolvedBy: "eleve", attempts: attempt, success: true, inspection: lastInspection, axiom: false, costUsd: 0, log };
    }
    lastError = `build cassé (${lastInspection.signal}) : ${lastInspection.detail.slice(-300)}`;
    push(`✗ inspection objective : ${lastInspection.signal}`);
  }

  // ── Escalade vers le Maître ──
  push(`⤴ ${maxAttempts} échec(s) objectif(s) — ESCALADE vers le MAÎTRE (Claude/${maitreModel})`);
  const esc = await deps.escalate({ task, projectDir, lastError, maitreModel });
  lastInspection = await deps.inspect(projectDir);

  if (lastInspection.ok) {
    push(`✓ build vert — résolu par le MAÎTRE${esc.axiom ? " (+1 axiome appris)" : ""}, coût $${esc.costUsd.toFixed(4)}`);
    return { resolvedBy: "maitre", attempts: maxAttempts, success: true, inspection: lastInspection, axiom: esc.axiom, costUsd: esc.costUsd, log };
  }
  push(`✗ build encore cassé après escalade — échec`);
  return { resolvedBy: "none", attempts: maxAttempts, success: false, inspection: lastInspection, axiom: esc.axiom, costUsd: esc.costUsd, log };
}
