// Preuve de la boucle de relais (eleve.ts). Les « cerveaux » sont injectés :
//   - DÉTERMINISTE (défaut) : faux Élève / faux Maître / fausse inspection →
//     prouve la LOGIQUE d'orchestration (succès Élève, escalade, échec total)
//     sans réseau ni coût. executeContract est, lui, RÉEL (vrais fichiers).
//   - LIVE (--live) : vrai Qwen + vraie inspection Vite sur une copie de
//     test-pipeline ; n'appelle Claude (coût) QUE si l'Élève échoue.
//
// Lancer :  npx tsx src/test-relay.ts          (déterministe)
//           npx tsx src/test-relay.ts --live    (avec Qwen réel)

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { runRelay, type RelayDeps } from "./eleve.js";
import type { Inspection } from "./inspection.js";
import { inspectProject } from "./inspection.js";

const LIVE = process.argv.includes("--live");
const line = (c = "─") => console.log(c.repeat(64));
let failures = 0;
function check(label: string, cond: boolean) {
  console.log(`  ${cond ? "✓" : "✗"} ${label}`);
  if (!cond) failures++;
}

const inspOk = (): Inspection => ({ ok: true, signal: "ok", detail: "", durationMs: 0 });
const inspKo = (d: string): Inspection => ({ ok: false, signal: "build-failed", detail: d, durationMs: 0 });

const C = (body: string) => `<mangoai>${body}</mangoai>`;
const writeMarker = (v: string) => C(`<write path="marker.txt">${v}</write><summary>set ${v}</summary>`);

// Inspection factice : verte ssi marker.txt vaut exactement "OK".
function markerInspect(dir: string): Inspection {
  try {
    return fs.readFileSync(path.join(dir, "marker.txt"), "utf8").trim() === "OK"
      ? inspOk()
      : inspKo("marker != OK");
  } catch {
    return inspKo("marker absent");
  }
}

const noEnsure = async () => {};

async function deterministic(): Promise<void> {
  line("═");
  console.log("DÉTERMINISTE — logique d'orchestration (executeContract réel)");
  line();

  // A) L'Élève réussit du premier coup
  {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "relay-A-"));
    const deps: RelayDeps = {
      askEleve: async () => writeMarker("OK"),
      inspect: async (d) => markerInspect(d),
      ensureDeps: noEnsure,
      escalate: async () => ({ axiom: false, costUsd: 0 }),
    };
    const r = await runRelay("tâche", dir, { maxEleveAttempts: 2 }, deps);
    console.log("\n  [A] Élève compétent :");
    check("résolu par l'Élève", r.resolvedBy === "eleve");
    check("en 1 tentative, succès, coût 0", r.attempts === 1 && r.success && r.costUsd === 0);
    check("fichier réellement écrit (executeContract réel)", fs.existsSync(path.join(dir, "marker.txt")));
    fs.rmSync(dir, { recursive: true, force: true });
  }

  // B) L'Élève échoue 2× (build cassé) → le Maître corrige + axiome
  {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "relay-B-"));
    let escalated = false;
    const deps: RelayDeps = {
      askEleve: async () => writeMarker("BAD"), // toujours cassé
      inspect: async (d) => markerInspect(d),
      ensureDeps: noEnsure,
      escalate: async (ctx) => {
        escalated = true;
        fs.writeFileSync(path.join(ctx.projectDir, "marker.txt"), "OK"); // le Maître répare
        return { axiom: true, costUsd: 0.12 };
      },
    };
    const r = await runRelay("tâche", dir, { maxEleveAttempts: 2 }, deps);
    console.log("\n  [B] Élève en échec → escalade :");
    check("escalade déclenchée après 2 échecs", escalated && r.attempts === 2);
    check("résolu par le Maître", r.resolvedBy === "maitre" && r.success);
    check("axiome appris + coût Claude reporté", r.axiom && r.costUsd === 0.12);
    fs.rmSync(dir, { recursive: true, force: true });
  }

  // C) Sortie hors-contrat (parse échoue) → escalade quand même
  {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "relay-C-"));
    const deps: RelayDeps = {
      askEleve: async () => "Bien sûr, voici comment faire... (aucune balise)",
      inspect: async (d) => markerInspect(d),
      ensureDeps: noEnsure,
      escalate: async (ctx) => {
        fs.writeFileSync(path.join(ctx.projectDir, "marker.txt"), "OK");
        return { axiom: true, costUsd: 0.08 };
      },
    };
    const r = await runRelay("tâche", dir, { maxEleveAttempts: 2 }, deps);
    console.log("\n  [C] Réponse hors-contrat → escalade :");
    check("rejet répété → escalade → Maître", r.resolvedBy === "maitre" && r.success);
    fs.rmSync(dir, { recursive: true, force: true });
  }

  // D) Échec total : ni l'Élève ni le Maître ne réparent
  {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "relay-D-"));
    const deps: RelayDeps = {
      askEleve: async () => writeMarker("BAD"),
      inspect: async (d) => markerInspect(d),
      ensureDeps: noEnsure,
      escalate: async () => ({ axiom: false, costUsd: 0.05 }), // le Maître ne corrige pas
    };
    const r = await runRelay("tâche", dir, { maxEleveAttempts: 1 }, deps);
    console.log("\n  [D] Échec des deux étages :");
    check("resolvedBy = none, success = false", r.resolvedBy === "none" && !r.success);
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// ── LIVE : vrai Qwen sur une copie junctionnée de test-pipeline ───────────────
const SOURCE = path.resolve(process.cwd(), "..", "workspace", "test-pipeline");

async function live(): Promise<void> {
  line("═");
  console.log("LIVE — vrai Élève (Qwen) sur un projet Vite réel");
  console.log("(Claude n'est appelé QUE si Qwen échoue — coût possible)");
  line();
  if (!fs.existsSync(SOURCE)) {
    console.log(`  ⚠ ${SOURCE} introuvable — live sauté`);
    return;
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "relay-live-"));
  const nmLink = path.join(dir, "node_modules");
  let junctioned = false;
  try {
    fs.cpSync(SOURCE, dir, {
      recursive: true,
      filter: (s) => !/(^|[\\/])(node_modules|dist|\.git)([\\/]|$)/.test(path.relative(SOURCE, s)),
    });
    try {
      fs.symlinkSync(path.join(SOURCE, "node_modules"), nmLink, "junction");
      junctioned = true;
    } catch {
      console.log("  ⚠ jonction impossible — live sauté");
      return;
    }
    // Tâche facile et additive (nouveau fichier) → ne casse pas le build existant.
    // deps par défaut = vrai Qwen + vraie inspection Vite + vrai Claude (escalade).
    const task = 'Crée le fichier "src/utils/sum.js" qui exporte une fonction sum(a, b) renvoyant a + b.';
    const r = await runRelay(task, dir, { maxEleveAttempts: 2 });
    console.log("\n  Trace :");
    for (const l of r.log) console.log(`    ${l}`);
    check(`build final vert (résolu par ${r.resolvedBy})`, r.success);
    check("fichier src/utils/sum.js créé", fs.existsSync(path.join(dir, "src", "utils", "sum.js")));
    // confirme avec la vraie inspection
    const real = await inspectProject(dir, { timeoutMs: 120_000 });
    check(`inspection Vite réelle = ${real.signal}`, real.ok);
  } finally {
    if (junctioned) {
      if (process.platform === "win32") spawnSync("cmd", ["/c", "rmdir", nmLink]);
      else fs.unlinkSync(nmLink);
    }
    if (!fs.existsSync(nmLink)) fs.rmSync(dir, { recursive: true, force: true });
    else console.log(`  ⚠ jonction présente — temp laissé : ${dir}`);
  }
}

(async () => {
  await deterministic();
  if (LIVE) await live();
  line("═");
  if (failures === 0) {
    console.log("✅ Boucle de relais PROUVÉE : Élève → juge objectif → escalade Maître + axiome.");
    process.exit(0);
  } else {
    console.log(`❌ ${failures} vérification(s) en échec.`);
    process.exit(1);
  }
})();
