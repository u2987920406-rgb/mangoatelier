// Preuve déterministe du partitionnement par famille de modèle Élève. Verrouille
// les deux invariants critiques :
//   1. La famille Qwen 2.5+ est bien reconnue et passe en WRITE-ONLY (pas de <edit>).
//   2. Tout modèle NON reconnu retombe sur GENERIC = comportement actuel exact
//      (le contrat historique avec <edit> est intact). Garantie d'impénétrabilité.
//
// Lancer :  npx tsx src/test-profile.ts

import { resolveProfile } from "./models/profile.js";
import { qwenProfile } from "./models/qwen.js";
import { GENERIC } from "./models/generic.js";

const line = (c = "─") => console.log(c.repeat(64));
let failures = 0;
const check = (label: string, cond: boolean) => {
  console.log(`  ${cond ? "✓" : "✗"} ${label}`);
  if (!cond) failures++;
};

line("═");
console.log("models — partitionnement par famille");
line();

// [1] Résolution de famille
console.log("\n  [1] resolveProfile :");
check("qwen2.5-coder:7b → qwen", resolveProfile("qwen2.5-coder:7b") === qwenProfile);
check("qwen3:8b → qwen", resolveProfile("qwen3:8b") === qwenProfile);
check("qwen2:7b (2.0) → GENERIC (exclu)", resolveProfile("qwen2:7b") === GENERIC);
check("qwen1.5 → GENERIC (exclu)", resolveProfile("qwen1.5:7b") === GENERIC);
check("gpt-4 → GENERIC", resolveProfile("gpt-4") === GENERIC);
check("deepseek-coder → GENERIC (pas encore partitionné)", resolveProfile("deepseek-coder") === GENERIC);
check("llama3 → GENERIC", resolveProfile("llama3:8b") === GENERIC);

// [2] Qwen = Write-only (la classe d'erreur <find> est supprimée à la source)
console.log("\n  [2] partition Qwen (Write-only) :");
check("system propose <write>", qwenProfile.system.includes("<write>"));
check("system NE propose PAS <edit>", !qwenProfile.system.includes("<edit>"));
check("system NE mentionne PAS <find>", !qwenProfile.system.includes("<find>"));
check("system porte la règle d'or (fichier complet)", /COMPLET|complet/.test(qwenProfile.system) && /RÈGLE D'OR/.test(qwenProfile.system));
check("axiomFiles inclut .axioms.qwen.md", qwenProfile.axiomFiles.includes(".axioms.qwen.md"));
check("axiomFiles inclut aussi l'universel .axioms.md", qwenProfile.axiomFiles.includes(".axioms.md"));
check("escalateAppendix route vers .axioms.qwen.md", qwenProfile.escalateAppendix.includes(".axioms.qwen.md"));

// [3] GENERIC = garde-fou de non-régression (comportement actuel figé)
console.log("\n  [3] GENERIC (non-régression) :");
check("matches() toujours false (jamais auto-sélectionné)", GENERIC.matches("n'importe quoi") === false);
check("system conserve <write> ET <edit> (contrat historique)", GENERIC.system.includes("<write>") && GENERIC.system.includes("<edit>"));
check("system conserve la mécanique <find>", GENERIC.system.includes("<find>"));
check("axiomFiles = [.axioms.md] seul", GENERIC.axiomFiles.length === 1 && GENERIC.axiomFiles[0] === ".axioms.md");
check("escalateAppendix vide (prompt Maître inchangé)", GENERIC.escalateAppendix === "");

line("═");
console.log(failures === 0 ? "✅ Partitionnement prouvé (Qwen Write-only, GENERIC intact)." : `❌ ${failures} échec(s)`);
process.exit(failures === 0 ? 0 : 1);
