// Tests purs du juge nocturne (#59). Lancer : npx tsx src/test-nocturnal.ts
import { parseJudgeOutput } from "./nocturnal.js";

let pass = 0, fail = 0;
function check(label: string, cond: boolean): void {
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else { fail++; console.log(`  ✗ ${label}`); }
}

console.log("═".repeat(56));
console.log("nocturnal — parseJudgeOutput (#59)");
console.log("─".repeat(56));

// JSON propre
{
  const r = parseJudgeOutput('{"dims":{"design":8,"fonctionnel":7,"originalite":6,"coherence":9,"qualite":7},"score":7.4,"comment":"Propre."}');
  check("JSON propre → parsé", !!r);
  check("score conservé", r?.score === 7.4);
  check("dims.design = 8", r?.dims.design === 8);
  check("commentaire conservé", r?.comment === "Propre.");
}

// JSON entouré de texte/markdown → extrait quand même
{
  const r = parseJudgeOutput('Voici mon verdict :\n```json\n{"dims":{"design":5,"fonctionnel":5,"originalite":5,"coherence":5,"qualite":5}}\n```\nVoilà.');
  check("JSON dans du texte → extrait", !!r);
  check("score calculé depuis la moyenne quand absent", r?.score === 5);
}

// Clamp hors bornes + arrondi
{
  const r = parseJudgeOutput('{"dims":{"design":12,"fonctionnel":-3,"originalite":7.46,"coherence":0,"qualite":10},"score":99}');
  check("design clampé à 10", r?.dims.design === 10);
  check("fonctionnel clampé à 0", r?.dims.fonctionnel === 0);
  check("originalite arrondie à 7.5", r?.dims.originalite === 7.5);
  check("score clampé à 10", r?.score === 10);
}

// Alias anglais des dimensions
{
  const r = parseJudgeOutput('{"design":6,"functional":6,"originality":6,"coherence_profil":6,"quality":6}');
  check("alias anglais (functional/quality) reconnus", r?.dims.fonctionnel === 6 && r?.dims.qualite === 6);
}

// Entrées invalides
check("texte sans JSON → null", parseJudgeOutput("aucune note disponible") === null);
check("vide → null", parseJudgeOutput("") === null);

console.log("═".repeat(56));
if (fail === 0) console.log(`✅ All ${pass}/${pass} checks passed.`);
else { console.log(`❌ ${fail} échec(s) (${pass} ok).`); process.exit(1); }
