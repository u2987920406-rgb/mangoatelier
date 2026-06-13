// Audit Scan — « l'examen blanc » (Phase Ultime, jalon D Phase 3).
//
// Fait tourner l'Élève local sur une suite FIGÉE held-out (audit-tasks.ts) et
// calcule un Score de Santé 100 % OBJECTIF (build OK, rendement 1er tour, nb de
// tentatives, temps mur). Outil de PILOTAGE, hors du chemin de production : ce
// fichier n'est JAMAIS importé par index.ts — c'est un CLI, comme les test-*.ts.
//
//   npx tsx src/audit-scan.ts            scan normal (journalisé, comparé au précédent)
//   npx tsx src/audit-scan.ts --ablate   ablation A/B : suite AVEC vs SANS le dernier
//                                         axiome → attribue causalement un « mauvais pli »
//
// Reproductibilité : chaque scan trace le digest du modèle, la version d'Ollama
// et le hash du registre d'axiomes — sinon une régression est inattribuable
// (nouvel axiome ? nouveau modèle ?).

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { runRelay, defaultRelayDeps } from "./eleve.js";
import { AXIOMS_FILE_NAME, loadAxioms, removeLastAxiom } from "./axioms.js";
import { WORKSPACE_DIR } from "./projects.js";
import { AUDIT_TASKS, type AuditTask } from "./audit-tasks.js";

const OLLAMA = process.env.OLLAMA_URL ?? "http://localhost:11434";
const ELEVE_MODEL = process.env.ELEVE_MODEL ?? "qwen2.5-coder:7b";
const MAX_ATTEMPTS = Number(process.env.ELEVE_MAX_ATTEMPTS ?? 2);
const SOURCE = path.resolve(process.cwd(), "..", "workspace", "test-pipeline");
const AUDIT_LOG = path.join(WORKSPACE_DIR, ".audit.jsonl");
const ABLATE = process.argv.includes("--ablate");

const line = (c = "─") => console.log(c.repeat(64));

interface TaskScore {
  id: string;
  complexity: string;
  buildOk: boolean;
  firstTry: boolean;
  attempts: number;
  durationMs: number;
}
interface Health {
  tasks: number;
  builtPct: number;
  firstTryPct: number;
  avgAttempts: number;
  avgDurationMs: number;
}

// ── Projet support : copie jonctionnée de test-pipeline (pattern prouvé) ──────
function makeProject(): { dir: string; nmLink: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "audit-"));
  fs.cpSync(SOURCE, dir, {
    recursive: true,
    filter: (s) => !/(^|[\\/])(node_modules|dist|\.git)([\\/]|$)/.test(path.relative(SOURCE, s)),
  });
  const nmLink = path.join(dir, "node_modules");
  fs.symlinkSync(path.join(SOURCE, "node_modules"), nmLink, "junction");
  return { dir, nmLink };
}
function cleanProject(dir: string, nmLink: string): void {
  if (process.platform === "win32") spawnSync("cmd", ["/c", "rmdir", nmLink]);
  else if (fs.existsSync(nmLink)) fs.unlinkSync(nmLink);
  if (!fs.existsSync(nmLink)) fs.rmSync(dir, { recursive: true, force: true });
}

// L'Élève SEUL, sans filet : escalade neutralisée → on mesure sa compétence brute.
const noEscalate = async () => ({ axiom: false, costUsd: 0 });

async function scoreTask(task: AuditTask): Promise<TaskScore> {
  const { dir, nmLink } = makeProject();
  try {
    const t0 = Date.now();
    const r = await runRelay(
      task.prompt,
      dir,
      { maxEleveAttempts: MAX_ATTEMPTS, onLog: () => {} },
      { ...defaultRelayDeps, escalate: noEscalate },
    );
    return {
      id: task.id,
      complexity: task.complexity,
      buildOk: r.success,
      firstTry: r.success && r.attempts === 1,
      attempts: r.attempts,
      durationMs: Date.now() - t0,
    };
  } finally {
    cleanProject(dir, nmLink);
  }
}

function aggregate(results: TaskScore[]): Health {
  const n = results.length || 1;
  return {
    tasks: results.length,
    builtPct: Math.round((results.filter((r) => r.buildOk).length / n) * 100),
    firstTryPct: Math.round((results.filter((r) => r.firstTry).length / n) * 100),
    avgAttempts: Number((results.reduce((s, r) => s + r.attempts, 0) / n).toFixed(2)),
    avgDurationMs: Math.round(results.reduce((s, r) => s + r.durationMs, 0) / n),
  };
}

async function runSuite(label: string): Promise<TaskScore[]> {
  console.log(`\n▶ ${label} — ${AUDIT_TASKS.length} tâches sur ${ELEVE_MODEL}`);
  const results: TaskScore[] = [];
  for (const task of AUDIT_TASKS) {
    process.stdout.write(`   · ${task.id} (${task.complexity})… `);
    const s = await scoreTask(task);
    results.push(s);
    console.log(
      `${s.buildOk ? "✅" : "❌"} build${s.firstTry ? " · 1er tour" : ""} · ${s.attempts} tent. · ${(s.durationMs / 1000).toFixed(1)}s`,
    );
  }
  return results;
}

// ── Empreintes de reproductibilité ───────────────────────────────────────────
async function getJSON(url: string): Promise<unknown> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(4000) });
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}
async function fingerprint() {
  const ver = (await getJSON(`${OLLAMA}/api/version`)) as { version?: string } | null;
  const tags = (await getJSON(`${OLLAMA}/api/tags`)) as { models?: Array<{ name: string; digest?: string }> } | null;
  const digest = tags?.models?.find((m) => m.name === ELEVE_MODEL)?.digest ?? "?";
  const axiomsText = loadAxioms(WORKSPACE_DIR);
  return {
    ollamaVersion: ver?.version ?? "?",
    modelDigest: digest.slice(0, 12),
    axiomsHash: axiomsText ? createHash("sha1").update(axiomsText).digest("hex").slice(0, 12) : "vide",
    axiomsCount: (axiomsText.match(/AXIOME-/g) ?? []).length,
  };
}

function printHealth(h: Health): void {
  console.log(
    `   build ${h.builtPct}% · 1er tour ${h.firstTryPct}% · ${h.avgAttempts} tent./tâche · ${(h.avgDurationMs / 1000).toFixed(1)}s/tâche`,
  );
}

function readScans(): Array<{ ts: string; health: Health; axiomsHash: string; perTask: TaskScore[] }> {
  try {
    return fs
      .readFileSync(AUDIT_LOG, "utf8")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => JSON.parse(l));
  } catch {
    return [];
  }
}

// ── Modes ────────────────────────────────────────────────────────────────────
async function normalScan(): Promise<void> {
  const fp = await fingerprint();
  const previous = readScans().at(-1) ?? null;
  const results = await runSuite("Scan");
  const health = aggregate(results);

  line("═");
  console.log("SCORE DE SANTÉ");
  line();
  printHealth(health);
  console.log(
    `   modèle ${fp.modelDigest} · ollama ${fp.ollamaVersion} · axiomes ${fp.axiomsCount} (${fp.axiomsHash})`,
  );

  if (previous) {
    const d = (a: number, b: number) => (a - b >= 0 ? `+${a - b}` : `${a - b}`);
    console.log(`\n   vs scan précédent (${previous.ts.slice(0, 16).replace("T", " ")}) :`);
    console.log(
      `     build ${d(health.builtPct, previous.health.builtPct)} pts · 1er tour ${d(health.firstTryPct, previous.health.firstTryPct)} pts`,
    );
    const regressions = results.filter((r) => {
      const before = previous.perTask.find((p) => p.id === r.id);
      return before?.buildOk && !r.buildOk;
    });
    if (regressions.length) {
      console.log(`   ⚠ MAUVAIS PLI : ${regressions.map((r) => r.id).join(", ")} compilai(en)t avant, plus maintenant.`);
      if (previous.axiomsHash !== fp.axiomsHash) {
        console.log(`     (le registre d'axiomes a changé entre les deux scans — suspect n°1 ; lance --ablate)`);
      }
    } else if (health.builtPct >= previous.health.builtPct) {
      console.log(`   ✓ aucune régression de build.`);
    }
  } else {
    console.log(`\n   (premier scan — pas de comparaison ; les suivants détecteront les dérives)`);
  }

  fs.appendFileSync(AUDIT_LOG, `${JSON.stringify({ ts: new Date().toISOString(), ...fp, health, perTask: results })}\n`);
  console.log(`\n→ Scan enregistré dans ${path.relative(process.cwd(), AUDIT_LOG)}`);
}

async function ablationScan(): Promise<void> {
  const axiomsPath = path.join(WORKSPACE_DIR, AXIOMS_FILE_NAME);
  if (!fs.existsSync(axiomsPath)) {
    console.log("⚠ Registre d'axiomes vide — rien à ablater. Lance d'abord un scan normal.");
    return;
  }
  // Octets BRUTS pour la restauration (loadAxioms trim/plafonne → ne pas s'en
  // servir pour sauvegarder, sinon la restauration n'est pas byte-identique).
  const rawOriginal = fs.readFileSync(axiomsPath, "utf8");
  const { without, removed } = removeLastAxiom(rawOriginal);
  if (!removed) {
    console.log("⚠ Un seul axiome ou registre illisible — rien à ablater proprement.");
    return;
  }

  console.log("Ablation A/B — le dernier axiome est-il un progrès ou un mauvais pli ?");
  console.log(`Dernier axiome testé :\n  ${removed.split("\n")[0]}`);

  const withResults = await runSuite("AVEC le dernier axiome");
  const withHealth = aggregate(withResults);

  let withoutHealth: Health;
  try {
    fs.writeFileSync(axiomsPath, without); // retire temporairement le dernier axiome
    console.log("(dernier axiome retiré temporairement du registre)");
    const withoutResults = await runSuite("SANS le dernier axiome");
    withoutHealth = aggregate(withoutResults);
  } finally {
    fs.writeFileSync(axiomsPath, rawOriginal); // RESTAURE les octets exacts, toujours
    console.log("\n(registre d'axiomes restauré à l'identique)");
  }

  line("═");
  console.log("VERDICT D'ABLATION");
  line();
  console.log("AVEC l'axiome :");
  printHealth(withHealth);
  console.log("SANS l'axiome :");
  printHealth(withoutHealth);

  const dBuild = withHealth.builtPct - withoutHealth.builtPct;
  const dFirst = withHealth.firstTryPct - withoutHealth.firstTryPct;
  console.log("");
  if (dBuild < 0 || (dBuild === 0 && dFirst < 0)) {
    console.log(`⚠ MAUVAIS PLI : le dernier axiome DÉGRADE l'Élève (build ${dBuild} pts, 1er tour ${dFirst} pts).`);
    console.log(`  → à amender ou retirer du registre (le clapet est anti-oubli, PAS anti-correction).`);
  } else if (dBuild > 0 || dFirst > 0) {
    console.log(`✓ PROGRÈS : le dernier axiome AMÉLIORE l'Élève (build +${dBuild} pts, 1er tour +${dFirst} pts).`);
  } else {
    console.log(`≈ NEUTRE : aucun effet mesurable sur cette suite (build et 1er tour inchangés).`);
  }
}

// ── Entrée ───────────────────────────────────────────────────────────────────
(async () => {
  if (!fs.existsSync(path.join(SOURCE, "node_modules"))) {
    console.error(`✗ Projet support introuvable ou sans node_modules : ${SOURCE}`);
    console.error("  L'audit a besoin d'un projet Vite installé (workspace/test-pipeline).");
    process.exit(1);
  }
  console.log(`Audit Scan — Élève ${ELEVE_MODEL}${ABLATE ? " — mode ABLATION" : ""}`);
  if (ABLATE) await ablationScan();
  else await normalScan();
})();
