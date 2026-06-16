// Preuve déterministe de l'assemblage du prompt (Coque Souple) : le gating par
// mode. Vérifie surtout que le bloc « tests auto » (idée 24) n'apparaît QU'en
// Élite, et au passage que les autres blocs Élite-only (analytic, plan, vision)
// sont bien gated. assembleSystemPrompt lit des magasins disque de façon
// tolérante (absents → ""), donc un projectDir bidon suffit.
//
// Lancer :  npx tsx src/test-scenario.ts

import os from "node:os";
import { assembleSystemPrompt } from "./scenario.js";

const line = (c = "─") => console.log(c.repeat(64));
let failures = 0;
const check = (label: string, cond: boolean) => {
  console.log(`  ${cond ? "✓" : "✗"} ${label}`);
  if (!cond) failures++;
};

const dir = os.tmpdir();
const elite = assembleSystemPrompt({ mode: "elite", model: "sonnet", projectDir: dir });
const mvp = assembleSystemPrompt({ mode: "mvp", model: "sonnet", projectDir: dir });
const eliteHaiku = assembleSystemPrompt({ mode: "elite", model: "haiku", projectDir: dir });

const TESTS = "Automated tests (optional";
const ANALYTIC = "Deep analysis";
const VISION_LOOP = "Closed visual loop"; // Élite
const VISION_MIN = "Visual self-check is minimal"; // MVP
const MOODBOARD_MVP = "MVP auto-grounding"; // moodboardMvp block (1 leader / 1 capture)
const CADRAGE = "Cadrage fondateur — multimodal grounding"; // idée #47, Élite-only
const MIROIR = "Le Miroir (.miroir.md) — comprehension mirror"; // idée #48, Élite-only

line("═");
console.log("scenario — gating des blocs par mode (Coque Souple)");
line();

// Idée 24 — le cœur de cette livraison
check("bloc tests PRÉSENT en Élite", elite.includes(TESTS));
check("bloc tests ABSENT en MVP", !mvp.includes(TESTS));

// Blocs Élite-only existants (régression)
check("analytic présent en Élite (sonnet)", elite.includes(ANALYTIC));
check("analytic absent en MVP", !mvp.includes(ANALYTIC));
check("analytic absent en Élite+haiku (gating modèle)", !eliteHaiku.includes(ANALYTIC));

// Vision : boucle complète en Élite, allégée en MVP
check("vision Élite = boucle complète", elite.includes(VISION_LOOP) && !elite.includes(VISION_MIN));
check("vision MVP = allégée", mvp.includes(VISION_MIN) && !mvp.includes(VISION_LOOP));

// Idée 7 — arborescence contextuelle (moodboard), Élite-only (bloc plan)
check("arborescence contextuelle présente en Élite", elite.includes("CONTEXTUAL INFORMATION ARCHITECTURE"));
check("arborescence contextuelle absente en MVP", !mvp.includes("CONTEXTUAL INFORMATION ARCHITECTURE"));

// PromptArchitect — mode architecte (scoping adaptatif progressif), Élite-only
check("mode architecte (scoping progressif) présent en Élite", elite.includes("ADAPTIVE & PROGRESSIVE"));
check("mode architecte absent en MVP", !mvp.includes("ADAPTIVE & PROGRESSIVE"));

// Moodboard MVP (idée #46 extension) — léger en MVP, absent en finition
const finition = assembleSystemPrompt({ mode: "finition", model: "sonnet", projectDir: dir });
check("moodboard MVP présent en mode MVP", mvp.includes(MOODBOARD_MVP));
check("moodboard MVP absent en Élite (couvert par bloc plan complet)", !elite.includes(MOODBOARD_MVP));
check("moodboard MVP absent en finition (phase freeze)", !finition.includes(MOODBOARD_MVP));

// Cadrage fondateur multimodal (idée #47) — chef d'orchestre Élite-only :
// présent en Élite, absent en MVP (a son moodboard léger) et en finition (freeze).
check("cadrage fondateur présent en Élite", elite.includes(CADRAGE));
check("cadrage fondateur absent en MVP", !mvp.includes(CADRAGE));
check("cadrage fondateur absent en finition (phase freeze)", !finition.includes(CADRAGE));

// Le Miroir (idée #48) — porte de validation Élite-only : présent en Élite,
// absent en MVP et en finition (freeze, pas de nouveau cadrage).
check("Le Miroir présent en Élite", elite.includes(MIROIR));
check("Le Miroir absent en MVP", !mvp.includes(MIROIR));
check("Le Miroir absent en finition (phase freeze)", !finition.includes(MIROIR));

// Figma retiré (#25) : son bloc ne doit plus apparaître dans aucun mode.
check("Figma absent des deux modes (intégration retirée)", !elite.includes("figma.com") && !mvp.includes("figma.com"));

line("═");
if (failures === 0) {
  console.log("✅ Gating prouvé : tests/analytic/plan Élite-only, moodboard MVP en MVP only, vision adaptée au mode.");
  process.exit(0);
} else {
  console.log(`❌ ${failures} vérification(s) en échec.`);
  process.exit(1);
}
