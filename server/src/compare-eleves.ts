/**
 * Comparaison qualité — N modèles Élève sur 3 dimensions
 *   1. Conformité contrat  — balises <mangoai> respectées
 *   2. Qualité du code     — juge Claude Haiku (/10 sur 4 critères)
 *   3. Build réel          — vite build dans un projet temporaire
 *
 * Usage (3 modèles par défaut) :
 *   npx tsx src/compare-eleves.ts
 *
 * Modèles custom (séparés par des virgules) :
 *   MODELS=gemma4:12b,gemma3:27b npx tsx src/compare-eleves.ts
 *
 * Sans build (plus rapide) :
 *   SKIP_BUILD=1 npx tsx src/compare-eleves.ts
 */

import "dotenv/config";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { query } from "@anthropic-ai/claude-agent-sdk";

const OLLAMA     = process.env.OLLAMA_URL ?? "http://localhost:11434";
const SKIP_BUILD = process.env.SKIP_BUILD === "1";
const SOURCE     = path.resolve(process.cwd(), "..", "workspace", "test-pipeline");

const MODELS: string[] = process.env.MODELS
  ? process.env.MODELS.split(",").map(s => s.trim()).filter(Boolean)
  : ["gemma4:12b"];

// ── Contrat Élève ─────────────────────────────────────────────────────────────
const SYSTEM = `Tu es un développeur qui propose des actions à MangoAI.
Tu ne touches JAMAIS au disque : tu DÉCRIS les actions, MangoAI les exécutera.
Tu DOIS répondre UNIQUEMENT dans ce format à balises, sans aucune prose autour :

<mangoai>
  <write path="chemin/relatif">contenu COMPLET et final du fichier</write>
  <run>commande shell éventuelle</run>
  <summary>résumé court de ce que tu fais</summary>
</mangoai>

Règles strictes :
- path TOUJOURS relatif au projet (jamais C:\\, jamais /, jamais ..).
- Projet Vite + React (ESM) : utilise "export"/"import", JAMAIS "module.exports"/"require".
- RÈGLE D'OR : pour CHAQUE fichier, écris-le ENTIER et FINAL en un seul <write>.
  Jamais de squelette à compléter ensuite, jamais d'édition partielle.
- N'émets JAMAIS <run>npm install</run>.
- Termine TOUJOURS par un <summary>. AUCUN texte hors de <mangoai>.`;

const TASKS = [
  {
    id: "T1",
    label: "Bouton React",
    prompt: "Crée un composant React Button avec une prop label (string) et une prop onClick (function). Tailwind. États : normal, hover, disabled. Fichier : src/components/Button.jsx",
    targetPath: "src/components/Button.jsx",
  },
  {
    id: "T2",
    label: "Hero d'accueil",
    prompt: "Crée une page d'accueil avec un hero section (titre, sous-titre, bouton CTA). React + Tailwind. Responsive mobile. Fichier : src/pages/Home.jsx",
    targetPath: "src/pages/Home.jsx",
  },
  {
    id: "T3",
    label: "Utilitaire date",
    prompt: "Crée un fichier utilitaire avec une fonction formatDate(date) qui retourne la date au format JJ/MM/AAAA, et une fonction timeAgo(date) qui retourne '3 jours' / '2 heures' etc. Fichier : src/utils/date.js",
    targetPath: "src/utils/date.js",
  },
  {
    id: "T4",
    label: "Formulaire contact",
    prompt: "Crée un formulaire de contact avec les champs nom, email, message. React + Tailwind, état local useState. Validation basique (champs requis). Fichier : src/components/ContactForm.jsx",
    targetPath: "src/components/ContactForm.jsx",
  },
  {
    id: "T5",
    label: "Navbar responsive",
    prompt: "Crée une barre de navigation responsive avec logo et 3 liens (Accueil, À propos, Contact). React + Tailwind, menu hamburger mobile avec useState. Fichier : src/components/Navbar.jsx",
    targetPath: "src/components/Navbar.jsx",
  },
];

// ── Types ─────────────────────────────────────────────────────────────────────
interface JudgeScore {
  completeness: number;
  react:        number;
  tailwind:     number;
  robustness:   number;
  total:        number;
  comment:      string;
}

interface TaskResult {
  model:           string;
  task:            string;
  label:           string;
  contractOk:      boolean;
  hasProseOutside: boolean;
  hasEdit:         boolean;
  generatedCode:   string;
  targetPath:      string;
  judge:           JudgeScore | null;
  judgeError?:     string;
  buildOk:         boolean | null;
  buildError?:     string;
  durationMs:      number;
  error?:          string;
}

// ── Ollama ────────────────────────────────────────────────────────────────────
async function askOllama(model: string, user: string): Promise<string> {
  const res = await fetch(`${OLLAMA}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      stream: false,
      options: { temperature: 0, num_predict: 3000 },
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user",   content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
  const data = (await res.json()) as { message?: { content?: string } };
  return data.message?.content ?? "";
}

// ── Analyse contrat ───────────────────────────────────────────────────────────
function analyzeContract(text: string) {
  const hasMangoai      = /<mangoai>/i.test(text) && /<\/mangoai>/i.test(text);
  const hasWrite        = /<write\s+path=/i.test(text);
  const hasSummary      = /<summary>/i.test(text);
  const hasEdit         = /<edit>/i.test(text) || /<find>/i.test(text);
  const beforeTag       = text.split(/<mangoai>/i)[0].trim();
  const afterTag        = (text.split(/<\/mangoai>/i)[1] ?? "").trim();
  const hasProseOutside = beforeTag.length > 0 || afterTag.length > 0;
  const contractOk      = hasMangoai && hasWrite && hasSummary && !hasEdit;
  return { contractOk, hasProseOutside, hasEdit };
}

function extractCode(text: string): string {
  const m = text.match(/<write[^>]*>([\s\S]*?)<\/write>/i);
  return m ? m[1].trim() : "";
}

// ── Juge Claude Haiku (via SDK Agent — auth locale Claude Code) ───────────────
async function judgeCode(
  task: typeof TASKS[0],
  code: string,
): Promise<JudgeScore> {
  const prompt = `Tu es un expert React/Tailwind qui évalue du code généré par un LLM.

Tâche demandée : ${task.prompt}

Code généré :
\`\`\`jsx
${code.slice(0, 3000)}
\`\`\`

Réponds UNIQUEMENT en JSON valide, sans prose autour :
{"completeness":<0-3>,"react":<0-3>,"tailwind":<0-2>,"robustness":<0-2>,"comment":"<une phrase>"}

Critères :
- completeness : 3=tous les éléments demandés présents, 2=quasi-complet, 1=partiel, 0=essentiel manquant
- react        : 3=ESM + hooks corrects + pas de mutation directe, 0=erreurs rédhibitoires
- tailwind     : 2=classes pertinentes + responsive si demandé, 1=incomplet, 0=absent
- robustness   : 2=edge cases + a11y basique (aria, type=button), 1=partiel, 0=absent`;

  let raw = "";
  const q = query({
    prompt,
    options: {
      model: "haiku",
      maxTurns: 1,
      allowedTools: [],
      permissionMode: "bypassPermissions",
    },
  });
  for await (const msg of q) {
    if (msg.type === "assistant") {
      for (const block of msg.message.content) {
        if (block.type === "text") raw += block.text;
      }
    }
  }

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`JSON introuvable : ${raw.slice(0, 120)}`);
  const parsed = JSON.parse(jsonMatch[0]) as Omit<JudgeScore, "total">;
  return {
    ...parsed,
    total: (parsed.completeness ?? 0) + (parsed.react ?? 0) + (parsed.tailwind ?? 0) + (parsed.robustness ?? 0),
  };
}

// ── Build réel ────────────────────────────────────────────────────────────────
function buildCode(code: string, targetPath: string): { ok: boolean; error?: string } {
  if (!fs.existsSync(SOURCE)) return { ok: false, error: `test-pipeline introuvable : ${SOURCE}` };
  const tmp    = fs.mkdtempSync(path.join(os.tmpdir(), "cmp-"));
  const nmLink = path.join(tmp, "node_modules");
  try {
    fs.cpSync(SOURCE, tmp, {
      recursive: true,
      filter: (s) => !/(node_modules|dist|\.git)/.test(path.relative(SOURCE, s)),
    });
    fs.symlinkSync(path.join(SOURCE, "node_modules"), nmLink, "junction");
    const dest = path.join(tmp, targetPath);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, code, "utf8");
    const r = spawnSync("npx", ["vite", "build", "--logLevel", "silent"], {
      cwd: tmp, shell: true, encoding: "utf8", timeout: 60_000,
    });
    return r.status === 0
      ? { ok: true }
      : { ok: false, error: (r.stderr ?? r.stdout ?? "").slice(0, 300) };
  } catch (e: any) {
    return { ok: false, error: String(e?.message ?? e) };
  } finally {
    try {
      if (process.platform === "win32") spawnSync("cmd", ["/c", "rmdir", nmLink]);
      else if (fs.existsSync(nmLink)) fs.unlinkSync(nmLink);
      if (!fs.existsSync(nmLink)) fs.rmSync(tmp, { recursive: true, force: true });
    } catch { /* best-effort */ }
  }
}

// ── Tâche complète ────────────────────────────────────────────────────────────
async function runTask(
  model: string,
  task: typeof TASKS[0],
): Promise<TaskResult> {
  const t0   = Date.now();
  const base = {
    model, task: task.id, label: task.label,
    contractOk: false, hasProseOutside: false, hasEdit: false,
    generatedCode: "", targetPath: task.targetPath,
    judge: null as JudgeScore | null, buildOk: null as boolean | null,
  };
  try {
    const text     = await askOllama(model, task.prompt);
    const contract = analyzeContract(text);
    const code     = extractCode(text);

    let judge: JudgeScore | null = null;
    let judgeError: string | undefined;
    if (code) {
      try { judge = await judgeCode(task, code); }
      catch (e: any) { judgeError = String(e?.message ?? e); }
    }

    let buildOk: boolean | null = null;
    let buildError: string | undefined;
    if (!SKIP_BUILD && code) {
      const b = buildCode(code, task.targetPath);
      buildOk  = b.ok;
      buildError = b.error;
    }

    return { ...base, ...contract, generatedCode: code, judge, judgeError, buildOk, buildError, durationMs: Date.now() - t0 };
  } catch (err: any) {
    return { ...base, error: String(err?.message ?? err), durationMs: Date.now() - t0 };
  }
}

// ── Utilitaires affichage ─────────────────────────────────────────────────────
function icon(v: boolean | null): string { return v === null ? "⊘" : v ? "✅" : "❌"; }
function fmt(ms: number): string {
  if (ms < 1000)  return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m${Math.round((ms % 60000) / 1000)}s`;
}
function shortName(m: string): string {
  return m.replace("gemma4:", "g4:").replace("gemma3:", "g3:").replace(":latest", "");
}
function bar(n: number, max: number, width = 8): string {
  const f = Math.round((n / Math.max(max, 1)) * width);
  return "█".repeat(f) + "░".repeat(width - f);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const labels = MODELS.map(shortName);

  const title  = `Comparaison Élève — qualité : ${labels.join(" vs ")}`;
  const border = "═".repeat(title.length + 4);
  console.log(`\n╔${border}╗`);
  console.log(`║  ${title}  ║`);
  console.log(`╚${border}╝`);
  console.log(`\n  Dimensions : 📋 Contrat  🎯 Qualité /10 (juge Haiku)  🔨 Build réel`);
  if (SKIP_BUILD) console.log("  ⚠  Build désactivé (SKIP_BUILD=1)\n");
  else            console.log("");

  const allResults: TaskResult[] = [];

  // ── Phase 1 : un modèle à la fois ────────────────────────────────────────
  for (let mi = 0; mi < MODELS.length; mi++) {
    const model = MODELS[mi];
    const label = labels[mi];
    console.log(`\n▶ [${mi + 1}/${MODELS.length}] ${label}  (${model})`);
    console.log("─".repeat(65));

    for (const task of TASKS) {
      process.stdout.write(`  ${task.id} — ${task.label.padEnd(20)} → `);
      const r = await runTask(model, task);
      allResults.push(r);

      if (r.error) { console.log(`ERREUR : ${r.error}`); continue; }

      const contract = r.contractOk ? "📋✅" : `📋❌${r.hasProseOutside ? " ⚠prose" : ""}${r.hasEdit ? " ⚠EDIT" : ""}`;
      const quality  = r.judge
        ? `🎯 ${String(r.judge.total).padStart(2)}/10  (${r.judge.completeness}+${r.judge.react}+${r.judge.tailwind}+${r.judge.robustness})`
        : r.judgeError ? `🎯 ERR` : `🎯  —`;
      const build = SKIP_BUILD ? "" : `  🔨${icon(r.buildOk)}`;

      console.log(`${contract}  ${quality}${build}  ${fmt(r.durationMs).padStart(7)}`);
      if (r.judge?.comment) console.log(`          💬 ${r.judge.comment}`);
    }
  }

  // ── Phase 2 : tableau comparatif ─────────────────────────────────────────
  console.log(`\n\n╔══════════════════════════════════════════════════════════════════╗`);
  console.log(`║                     TABLEAU COMPARATIF                          ║`);
  console.log(`╚══════════════════════════════════════════════════════════════════╝\n`);

  // une ligne par tâche, une colonne par modèle
  const COL = 22;
  const taskCol = "Tâche".padEnd(20);
  const header  = `${taskCol} | ${labels.map(l => l.padEnd(COL)).join(" | ")}`;
  console.log(header);
  console.log("─".repeat(header.length + 2));

  for (const task of TASKS) {
    const cells = MODELS.map(m => {
      const r = allResults.find(x => x.task === task.id && x.model === m);
      if (!r || r.error) return "ERREUR".padEnd(COL);
      const q     = r.judge ? `🎯${r.judge.total}/10` : "🎯 — ";
      const build = SKIP_BUILD ? "" : ` 🔨${icon(r.buildOk)}`;
      const t     = fmt(r.durationMs);
      return `${icon(r.contractOk)} ${q}${build} ${t}`.padEnd(COL);
    });
    console.log(`${task.label.padEnd(20)} | ${cells.join(" | ")}`);
  }

  // ── Phase 3 : scores globaux ──────────────────────────────────────────────
  console.log(`\n${"─".repeat(header.length + 2)}`);
  console.log("\n  SCORES GLOBAUX\n");

  const stats = MODELS.map((m, i) => {
    const res     = allResults.filter(r => r.model === m && !r.error);
    const contOk  = res.filter(r => r.contractOk).length;
    const judges  = res.filter(r => r.judge).map(r => r.judge!.total);
    const avgQ    = judges.length ? judges.reduce((s, v) => s + v, 0) / judges.length : 0;
    const buildOk = res.filter(r => r.buildOk === true).length;
    const avgT    = Math.round(res.reduce((s, r) => s + r.durationMs, 0) / (res.length || 1));
    // score composite qualité (sans temps, tu ne cherches pas la vitesse)
    const composite = (contOk / TASKS.length) * 2 + avgQ + (SKIP_BUILD ? 0 : (buildOk / TASKS.length) * 3);
    return { model: m, label: labels[i], contOk, avgQ, buildOk, avgT, composite, n: res.length };
  });

  for (const s of stats) {
    console.log(`  ${s.label.padEnd(18)}  📋 ${s.contOk}/${s.n} ${bar(s.contOk, s.n)}  🎯 ${s.avgQ.toFixed(1)}/10 ${bar(s.avgQ, 10)}  🔨 ${SKIP_BUILD ? "⊘" : `${s.buildOk}/${s.n} ${bar(s.buildOk, s.n)}`}  ⏱ ${fmt(s.avgT)}`);
  }

  // ── Recommandation ────────────────────────────────────────────────────────
  const ranked = [...stats].sort((a, b) => b.composite - a.composite);
  const best   = ranked[0];
  const second = ranked[1];
  const qGap   = best.avgQ - second.avgQ;

  console.log("\n  RECOMMANDATION\n");

  if (qGap >= 1.5) {
    console.log(`  🏆 ${best.model} — nettement meilleur en qualité (+${qGap.toFixed(1)}/10)`);
  } else if (qGap < 0.5) {
    console.log(`  🏆 Qualité proche entre les modèles — léger avantage à ${best.model}`);
  } else {
    console.log(`  🏆 ${best.model} — meilleur sur l'ensemble des critères (+${qGap.toFixed(1)}/10 qualité)`);
  }

  if (best.model !== MODELS[0]) {
    console.log(`\n  → Pour en faire l'Élève actif : ajouter dans server/.env`);
    console.log(`    ELEVE_MODEL=${best.model}`);
  } else {
    console.log(`\n  → ${MODELS[0]} reste l'Élève recommandé — aucun changement nécessaire.`);
  }

  // classement complet
  console.log("\n  Classement complet :");
  ranked.forEach((s, i) => {
    const medal = ["🥇", "🥈", "🥉"][i] ?? "  ";
    console.log(`  ${medal} ${s.label.padEnd(18)} qualité ${s.avgQ.toFixed(1)}/10  build ${SKIP_BUILD ? "—" : `${s.buildOk}/${s.n}`}  temps ${fmt(s.avgT)}`);
  });

  console.log("");
}

main().catch(console.error);
