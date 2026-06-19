// #93 — Revue de projet initiée par l'utilisateur.
// Note globale (1-5) + commentaire → LLM extrait des axiomes → .axioms.md
import path from "node:path";
import fs from "node:fs";
import { projectDir, WORKSPACE_DIR } from "./projects.js";
import { resolveProvider } from "./llm-engine.js";
import { getBrain } from "./kernel.js";
import { AXIOMS_FILE_NAME } from "./axioms.js";

const HISTORY_FILE = ".chat-history.json";
const REVIEW_FILE  = ".build-review.json";

export interface ProjectReview {
  score: number;
  comment: string;
  analyzedAt?: string;
  axiomsExtracted?: string[];
}

function reviewPath(name: string) { return path.join(projectDir(name), REVIEW_FILE); }
function historyPath(name: string) { return path.join(projectDir(name), HISTORY_FILE); }

export function loadReview(projectName: string): ProjectReview | null {
  const p = reviewPath(projectName);
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; }
}

export function saveReview(projectName: string, score: number, comment: string): void {
  const existing = loadReview(projectName) ?? {};
  fs.writeFileSync(
    reviewPath(projectName),
    JSON.stringify({ ...existing, score, comment }, null, 2),
    "utf8",
  );
}

function extractAgentSteps(projectName: string): string {
  const p = historyPath(projectName);
  if (!fs.existsSync(p)) return "(aucun historique)";
  let raw: unknown;
  try { raw = JSON.parse(fs.readFileSync(p, "utf8")); } catch { return "(historique illisible)"; }
  if (!Array.isArray(raw)) return "(historique vide)";
  const lines = (raw as Array<{ role: string; text: string }>)
    .filter((e) => e.role === "agent" && typeof e.text === "string")
    .map((e, i) => `Étape ${i + 1} : ${e.text.slice(0, 400)}`)
    .join("\n\n");
  return lines.slice(0, 8000) || "(aucune étape agent trouvée)";
}

export async function analyzeAndSave(
  projectName: string,
  score: number,
  comment: string,
): Promise<string[]> {
  const steps = extractAgentSteps(projectName);
  const today = new Date().toISOString().slice(0, 10);
  const valence = score >= 4 ? "positif" : score <= 2 ? "négatif" : "mitigé";
  const tag     = score >= 4 ? "validé-utilisateur" : "à-éviter";
  const cat     = score >= 4 ? "UX" : "AVOID";

  const prompt = `L'utilisateur a noté ce build MangoOS **${score}/5** (signal ${valence}).

Son commentaire : "${comment.slice(0, 600)}"

Voici les étapes de raisonnement que Mango a suivies pour construire le projet "${projectName}" :

${steps}

---

Extrais ${score === 3 ? "1 axiome positif ET 1 axiome négatif" : "1 à 2 axiomes"} universels réutilisables sur la FAÇON DE RAISONNER (pas sur le code produit). Un axiome doit être applicable à d'autres projets futurs.

Pour chaque axiome, utilise EXACTEMENT ce format (rien d'autre) :

AXIOME-${cat}-XX [candidat] [${tag}]
- Contexte: (dans quelle situation ce raisonnement apparaît)
- Piège: (l'erreur de raisonnement à éviter)
- Règle d'or: (ce qu'il faut faire à la place)
- Source: ${score >= 4 ? "👍" : "👎"} revue projet ${score}/5 (${today}) — ${projectName}`;

  const raw = await getBrain().complete("", prompt, {
    provider: resolveProvider(process.env.FEEDBACK_PROVIDER),
    maxTokens: 600,
  });

  const axioms = raw
    .split(/\n(?=AXIOME-)/)
    .map((s) => s.trim())
    .filter((s) => s.startsWith("AXIOME-"));

  if (axioms.length > 0) {
    const axiomsPath = path.join(WORKSPACE_DIR, AXIOMS_FILE_NAME);
    const existing = fs.existsSync(axiomsPath)
      ? fs.readFileSync(axiomsPath, "utf8").trim()
      : "";
    const updated = existing
      ? `${existing}\n\n${axioms.join("\n\n")}`
      : axioms.join("\n\n");
    fs.writeFileSync(axiomsPath, updated + "\n", "utf8");
  }

  const review = loadReview(projectName) ?? { score, comment };
  fs.writeFileSync(
    reviewPath(projectName),
    JSON.stringify({ ...review, analyzedAt: new Date().toISOString(), axiomsExtracted: axioms }, null, 2),
    "utf8",
  );

  return axioms;
}
