// Banc d'essai — Coque Rigide (Phase Ultime, vers le Jalon D).
//
// Deux étages :
//   A. DÉTERMINISTE (sans modèle) — exerce parseContract() sur les cas de
//      réparation et de rejet de la spec (docs/contrat-es.md). Filet de
//      régression permanent. Échoue avec exit≠0 si un invariant casse.
//   B. ÉLÈVE EN RÉEL (Gemma via Ollama) — tâches salissantes pour voir si
//      l'Élève dérape et si la réparation rattrape. Informatif, ne fait pas
//      échouer le banc (l'Élève a le droit d'être imparfait — c'est le sujet).
//
// Lancer :
//   npx tsx src/bench-coque-rigide.ts            (les deux étages)
//   npx tsx src/bench-coque-rigide.ts --unit     (étage A seul, pas de modèle)

import { parseContract, type ContractResult } from "./contract.js";

const OLLAMA = process.env.OLLAMA_URL ?? "http://localhost:11434";
const MODEL = process.env.ELEVE_MODEL ?? "gemma4:12b";
const UNIT_ONLY = process.argv.includes("--unit");

function line(c = "─") {
  console.log(c.repeat(64));
}

// ─────────────────────────────────────────────────────────────────────────
// ÉTAGE A — cas déterministes
// ─────────────────────────────────────────────────────────────────────────

type Check = (r: ContractResult) => boolean;
interface UnitCase {
  name: string;
  raw: string;
  expect: Check;
}

const ok = (r: ContractResult): r is Extract<ContractResult, { ok: true }> => r.ok;

const CASES: UnitCase[] = [
  {
    name: "Enveloppe propre → valide, non réparé",
    raw: `<mangoos><write path="a.js">x</write><summary>ok</summary></mangoos>`,
    expect: (r) => ok(r) && !r.repaired && r.actions.length === 1 && r.summary === "ok",
  },
  {
    name: "Fence markdown ```xml … ``` → réparé",
    raw: "```xml\n<mangoos><write path=\"a.js\">x</write><summary>s</summary></mangoos>\n```",
    expect: (r) => ok(r) && r.repaired && r.actions.length === 1,
  },
  {
    name: "Prose avant/après l'enveloppe → réparé",
    raw: `Bien sûr ! Voici :\n<mangoos><write path="a.js">x</write><summary>s</summary></mangoos>\nVoilà.`,
    expect: (r) => ok(r) && r.repaired && r.actions.length === 1,
  },
  {
    name: "Enveloppe oubliée mais balises présentes → réparé",
    raw: `<write path="a.js">x</write><summary>s</summary>`,
    expect: (r) => ok(r) && r.repaired && r.actions.length === 1,
  },
  {
    name: "Ordre préservé (write → run → edit)",
    raw: `<mangoos><write path="a.js">1</write><run>npm i</run><edit path="b.js"><find>o</find><replace>n</replace></edit><summary>s</summary></mangoos>`,
    expect: (r) =>
      ok(r) &&
      r.actions.length === 3 &&
      r.actions[0].kind === "write" &&
      r.actions[1].kind === "run" &&
      r.actions[2].kind === "edit",
  },
  {
    name: "Axiome capturé",
    raw: `<mangoos><write path="a.js">x</write><summary>s</summary><axiom>Vite = ESM, jamais module.exports</axiom></mangoos>`,
    expect: (r) => ok(r) && r.axiom === "Vite = ESM, jamais module.exports",
  },
  {
    name: "Résumé seul, sans action → valide",
    raw: `<mangoos><summary>Rien à faire, déjà conforme.</summary></mangoos>`,
    expect: (r) => ok(r) && r.actions.length === 0 && r.summary.length > 0,
  },
  // — Rejets attendus —
  { name: "Réponse vide → rejet", raw: `   `, expect: (r) => !r.ok },
  {
    name: "<write> sans path → rejet",
    raw: `<mangoos><write>x</write><summary>s</summary></mangoos>`,
    expect: (r) => !r.ok,
  },
  {
    name: "Chemin absolu POSIX (/etc) → rejet sécurité",
    raw: `<mangoos><write path="/etc/passwd">x</write><summary>s</summary></mangoos>`,
    expect: (r) => !r.ok,
  },
  {
    name: "Lettre de lecteur (C:\\) → rejet sécurité",
    raw: `<mangoos><write path="C:\\Windows\\evil.js">x</write><summary>s</summary></mangoos>`,
    expect: (r) => !r.ok,
  },
  {
    name: "Remontée .. → rejet sécurité",
    raw: `<mangoos><write path="../../secret.js">x</write><summary>s</summary></mangoos>`,
    expect: (r) => !r.ok,
  },
  {
    name: "<edit> sans <find>/<replace> → rejet",
    raw: `<mangoos><edit path="b.js">rien</edit><summary>s</summary></mangoos>`,
    expect: (r) => !r.ok,
  },
  {
    name: "<run> vide → rejet",
    raw: `<mangoos><run>   </run><summary>s</summary></mangoos>`,
    expect: (r) => !r.ok,
  },
  {
    name: "Ni action ni résumé → rejet",
    raw: `<mangoos></mangoos>`,
    expect: (r) => !r.ok,
  },
  {
    name: "Aucune balise reconnaissable → rejet",
    raw: `Je ne sais pas comment faire, désolé.`,
    expect: (r) => !r.ok,
  },
];

function runUnit(): boolean {
  line("═");
  console.log("ÉTAGE A — cas déterministes (parseContract, sans modèle)");
  line();
  let pass = 0;
  for (const c of CASES) {
    let got: ContractResult;
    try {
      got = parseContract(c.raw);
    } catch (e) {
      console.log(`  ✗ ${c.name}\n      EXCEPTION: ${(e as Error).message}`);
      continue;
    }
    if (c.expect(got)) {
      console.log(`  ✓ ${c.name}`);
      pass++;
    } else {
      console.log(`  ✗ ${c.name}\n      reçu: ${JSON.stringify(got)}`);
    }
  }
  line();
  const all = pass === CASES.length;
  console.log(`${all ? "✅" : "❌"} Étage A : ${pass}/${CASES.length} cas verts`);
  return all;
}

// ─────────────────────────────────────────────────────────────────────────
// ÉTAGE B — Élève en conditions réelles
// ─────────────────────────────────────────────────────────────────────────

const STRICT_SYSTEM = `Tu es un développeur qui propose des actions à MangoOS.
Tu ne touches JAMAIS au disque : tu DÉCRIS les actions, MangoOS les exécutera.
Tu DOIS répondre UNIQUEMENT dans ce format à balises, aucune prose autour :

<mangoos>
  <write path="chemin/relatif">contenu brut</write>
  <edit path="chemin/relatif"><find>exact</find><replace>nouveau</replace></edit>
  <run>commande shell</run>
  <summary>résumé court</summary>
</mangoos>

Règles : path TOUJOURS relatif (jamais C:\\, /, ..). Termine par <summary>. AUCUN texte hors de <mangoos>.`;

// Prompt volontairement FAIBLE — pour provoquer des déviations naturelles
// (fence, prose, oubli d'enveloppe) et tester la réparation.
const WEAK_SYSTEM = `Tu es un assistant développeur. Tu peux proposer des actions
en utilisant des balises <mangoos>, <write path="...">, <summary>.`;

interface LiveCase {
  name: string;
  system: string;
  task: string;
}

const LIVE: LiveCase[] = [
  {
    name: "B1 — edit find/replace sur fichier existant",
    system: STRICT_SYSTEM,
    task: `Dans le fichier "src/App.jsx", remplace le titre <h1>Salut</h1> par <h1>Bienvenue</h1>. Ne réécris pas tout le fichier, fais un edit ciblé.`,
  },
  {
    name: "B2 — multi-fichiers (composant + style)",
    system: STRICT_SYSTEM,
    task: `Crée un composant React "src/components/Card.jsx" (une carte simple avec un titre et un texte en props) ET sa feuille de style "src/components/Card.css". Deux fichiers.`,
  },
  {
    name: "B3 — tâche nécessitant une commande run",
    system: STRICT_SYSTEM,
    task: `Ajoute la librairie date-fns au projet, puis crée "src/utils/today.js" qui exporte la date du jour formatée en français avec date-fns.`,
  },
  {
    name: "B4 — prompt FAIBLE (provoque la déviation)",
    system: WEAK_SYSTEM,
    task: `Crée un petit fichier src/hello.js qui affiche bonjour dans la console. Explique aussi ce que tu fais.`,
  },
];

interface Deviation {
  fence: boolean;        // entouré de ```
  proseOutside: boolean; // texte non vide hors de l'enveloppe
  envelopeMissing: boolean;
  commonJS: boolean;     // module.exports / require() au lieu d'ESM
}

function detect(raw: string): Deviation {
  const env = /<mangoos>([\s\S]*?)<\/mangoos>/i.exec(raw);
  let proseOutside = false;
  if (env) {
    const before = raw.slice(0, env.index).trim();
    const after = raw.slice(env.index + env[0].length).trim();
    proseOutside = before.length > 0 || after.length > 0;
  }
  return {
    fence: /```/.test(raw),
    proseOutside,
    envelopeMissing: !/<mangoos>/i.test(raw),
    commonJS: /module\.exports|require\(/.test(raw),
  };
}

async function askEleve(system: string, task: string): Promise<string> {
  const res = await fetch(`${OLLAMA}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      stream: false,
      options: { temperature: 0 },
      messages: [
        { role: "system", content: system },
        { role: "user", content: task },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
  const data = (await res.json()) as { message?: { content?: string } };
  return data.message?.content ?? "";
}

async function runLive(): Promise<void> {
  line("═");
  console.log(`ÉTAGE B — Élève en réel : ${MODEL} (via ${OLLAMA})`);
  line();

  let valid = 0,
    repairedCount = 0,
    deviated = 0;

  for (const c of LIVE) {
    let raw: string;
    const t0 = Date.now();
    try {
      raw = await askEleve(c.system, c.task);
    } catch (e) {
      console.log(`\n${c.name}\n  ❌ appel échoué : ${(e as Error).message}`);
      continue;
    }
    const dt = ((Date.now() - t0) / 1000).toFixed(1);
    const dev = detect(raw);
    const anyDev = dev.fence || dev.proseOutside || dev.envelopeMissing || dev.commonJS;
    if (anyDev) deviated++;
    const parsed = parseContract(raw);

    console.log(`\n${c.name}  (${dt}s)`);
    const flags: string[] = [];
    if (dev.fence) flags.push("fence```");
    if (dev.proseOutside) flags.push("prose-hors-enveloppe");
    if (dev.envelopeMissing) flags.push("enveloppe-oubliée");
    if (dev.commonJS) flags.push("CommonJS(au lieu d'ESM)");
    console.log(`  Déviations : ${flags.length ? flags.join(", ") : "aucune"}`);

    if (parsed.ok) {
      valid++;
      if (parsed.repaired) repairedCount++;
      const kinds = parsed.actions.map((a) => a.kind).join(", ") || "—";
      console.log(
        `  parseContract : ✅ valide${parsed.repaired ? " (RÉPARÉ ✔)" : ""} · ${parsed.actions.length} action(s) [${kinds}]`,
      );
    } else {
      console.log(`  parseContract : ❌ REJET → escalade Claude · ${parsed.error}`);
    }
  }

  line();
  console.log(
    `Bilan Étage B : ${valid}/${LIVE.length} acceptés par le contrat · ` +
      `${repairedCount} rattrapés par réparation · ${deviated}/${LIVE.length} avec déviation brute`,
  );
  console.log(
    `Lecture : un cas « déviation brute » MAIS « accepté (réparé) » = la Coque Rigide a fait son travail.`,
  );
  console.log(
    `Un « REJET » sur l'Élève réel = exactement là où, en Jalon D, le Maître (Claude) prendrait le relais.`,
  );
}

// ─────────────────────────────────────────────────────────────────────────
(async () => {
  const unitOk = runUnit();
  if (!UNIT_ONLY) await runLive();
  // L'étage A est un invariant : son échec fait échouer le banc.
  process.exit(unitOk ? 0 : 1);
})();
