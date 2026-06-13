// Preuve déterministe de l'agrégateur du dashboard (computeInsights).
// Lancer :  npx tsx src/test-insights.ts

import { computeInsights } from "./metrics-insights.js";
import { inferProjectType } from "./blueprints.js";
import type { TurnMetrics } from "./metrics.js";
import type { AxiomStats } from "./axioms.js";

const line = (c = "─") => console.log(c.repeat(64));
let failures = 0;
const check = (label: string, cond: boolean) => {
  console.log(`  ${cond ? "✓" : "✗"} ${label}`);
  if (!cond) failures++;
};
const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps;

const base = (o: Partial<TurnMetrics>): TurnMetrics => ({
  ts: "2026-06-13T10:00:00",
  project: "p",
  model: "sonnet",
  mode: "elite",
  costUsd: 0,
  numTurns: 1,
  snapshots: 0,
  durationMs: 1000,
  error: false,
  ...o,
});

const rows: TurnMetrics[] = [
  // 2 vrais tours Claude → baseline = (0.20 + 0.40)/2 = 0.30
  base({ model: "sonnet", costUsd: 0.2 }),
  base({ model: "opus", costUsd: 0.4 }),
  // tours Élève (jour 1)
  base({ ts: "2026-06-13T09:00:00", model: "eleve", costUsd: 0, resolvedBy: "eleve", attempts: 1, projectType: "vitrine" }),
  base({ ts: "2026-06-13T09:30:00", model: "eleve", costUsd: 0, resolvedBy: "eleve", attempts: 2, projectType: "dashboard" }),
  // tours Élève (jour 2)
  base({ ts: "2026-06-14T09:00:00", model: "eleve", costUsd: 0.1, resolvedBy: "maitre", attempts: 2, projectType: "dashboard" }),
  base({ ts: "2026-06-14T10:00:00", model: "eleve", costUsd: 0, resolvedBy: "eleve", attempts: 1, projectType: "vitrine" }),
];

const axiomMap: AxiomStats = {
  byCat: { DATA: 2, UIUX: 1 },
  byMaturity: { confirmé: 1, candidat: 2 },
  total: 3,
};

const ins = computeInsights(rows, axiomMap);

line("═");
console.log("computeInsights — agrégateur du dashboard");
line();

check("4 tours Élève comptés", ins.relayTurns === 4);

// Rendement 1er tour : 2 sur 4 (eleve & attempts=1) = 50 %
check("rendement 1er tour = 50 % (n=4)", ins.firstPassYield.pct === 50 && ins.firstPassYield.n === 4);

// Souveraineté : baseline 0.30 ; eleve résolus = 3 → saved 0.90 ; escalade 0.10 ; net 0.80
check("baseline ≈ $0.30", near(ins.sovereignty.baselineUsd, 0.3, 1e-9));
check("économies estimées ≈ $0.90", near(ins.sovereignty.savedUsd, 0.9, 1e-9));
check("coût escalade = $0.10", near(ins.sovereignty.escalationUsd, 0.1, 1e-9));
check("net ≈ $0.80", near(ins.sovereignty.netUsd, 0.8, 1e-9));
check("drapeau estimé", ins.sovereignty.estimated === true);

// Émancipation : jour1 0 %, jour2 50 % ; cumul jour2 = 1/4 = 25 %
check("2 jours dans la courbe", ins.emancipation.length === 2);
check("jour 1 : 0 % d'intervention", ins.emancipation[0].pct === 0);
check("jour 2 : 50 % ponctuel, 25 % glissant", ins.emancipation[1].pct === 50 && ins.emancipation[1].rollingPct === 25);

// Par type : vitrine 2 tours (100 % 1er tour, $0.60 est.) ; dashboard 2 tours (0 %, $0.30)
const vitrine = ins.byType.find((t) => t.type === "vitrine");
const dashboard = ins.byType.find((t) => t.type === "dashboard");
check("byType couvre 2 types", ins.byType.length === 2);
check("vitrine : 2t, 100 % 1er tour, ≈$0.60", !!vitrine && vitrine.turns === 2 && vitrine.firstPassPct === 100 && near(vitrine.savedUsd, 0.6, 1e-9));
check("dashboard : 2t, 0 % 1er tour, ≈$0.30", !!dashboard && dashboard.turns === 2 && dashboard.firstPassPct === 0 && near(dashboard.savedUsd, 0.3, 1e-9));

// Cartographie du clapet : echo des stats
check("axiomMap relayé (total 3)", ins.axiomMap.total === 3 && ins.axiomMap.byCat.DATA === 2);

// inferProjectType : classification par mots-clés
check("infer dashboard", inferProjectType("Crée un dashboard avec des graphiques") === "dashboard");
check("infer jeu", inferProjectType("un petit jeu en canvas avec des sprites") === "jeu");
check("infer slides", inferProjectType("une présentation de slides 16:9") === "slides");
check("infer vitrine", inferProjectType("un site vitrine pour mon restaurant") === "vitrine");
check("infer webapp", inferProjectType("une todo app avec auth supabase") === "webapp");
check("infer autre (rien)", inferProjectType("bonjour comment ça va") === "autre");

// Cas vide : aucune métrique → tout à zéro, pas d'exception
const empty = computeInsights([], { byCat: {}, byMaturity: { confirmé: 0, candidat: 0 }, total: 0 });
check("rows vides → 0 sans planter", empty.relayTurns === 0 && empty.firstPassYield.pct === 0 && empty.emancipation.length === 0);

line("═");
if (failures === 0) {
  console.log("✅ computeInsights prouvé (rendement, souveraineté, émancipation, clapet).");
  process.exit(0);
} else {
  console.log(`❌ ${failures} vérification(s) en échec.`);
  process.exit(1);
}
