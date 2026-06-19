// Idée #56 — Chantier C. Le "double apprentissage" du tutoriel : pendant qu'il
// apprend MangoOS, l'utilisateur ENSEIGNE à MangoOS. Ses retours 👍/👎 + un mot
// aux étapes-checkpoint sont distillés (par le modèle, via l'abonnement) en un
// axiome tagué [tutoriel-N] et rangés dans le 4e magasin .axioms.md — exactement
// comme le RLHF #41 (feedback.ts), mais marqué comme issu du parcours tutoriel
// pour que la RelationshipCard puisse montrer "ce que MangoOS a appris de toi".
//
// Calqué sur feedback.ts (même format d'axiome) + preferences.ts (deps
// injectables, ne throw jamais). La synthèse askLLM EST la "mini-review aux
// checkpoints" du plan : un petit passage du modèle qui extrait la règle.
import path from "node:path";
import fs from "node:fs";
import { askLLM } from "./llm-engine.js";
import { AXIOMS_FILE_NAME } from "./axioms.js";
import type { FeedbackRating } from "./feedback.js";

export interface TutorialFeedbackInput {
  tutorialId: number;
  stepId: string;
  rating: FeedbackRating;
  comment?: string;
}

// Injectable brain so the function is testable without the network.
export interface TutorialFeedbackDeps {
  ask: (system: string, user: string) => Promise<string>;
}

const defaultDeps: TutorialFeedbackDeps = {
  ask: (system, user) => askLLM(system, user, { maxTokens: 400 }),
};

function isValid(input: TutorialFeedbackInput): boolean {
  return (
    typeof input.tutorialId === "number" &&
    input.tutorialId >= 1 &&
    typeof input.stepId === "string" &&
    input.stepId.length > 0 &&
    (input.rating === "like" || input.rating === "dislike")
  );
}

/**
 * Distille un retour de checkpoint en axiome tagué [tutoriel-N] et l'append à
 * .axioms.md. No-op si l'entrée est invalide. Ne throw jamais (fire-and-forget).
 */
export async function processTutorialFeedback(
  workspaceDir: string,
  input: TutorialFeedbackInput,
  deps: TutorialFeedbackDeps = defaultDeps,
): Promise<void> {
  try {
    if (!isValid(input)) return;
    const { tutorialId, rating, comment } = input;
    const tag = rating === "like" ? "validé-utilisateur" : "à-éviter";
    const axiomCat = rating === "like" ? "UX" : "AVOID";
    const tutorialTag = `tutoriel-${tutorialId}`;
    const today = new Date().toISOString().slice(0, 10);
    const sentiment = rating === "like" ? "👍 a aimé" : "👎 n'a pas aimé";

    const system =
      "Tu distilles un retour utilisateur en UN axiome universel et réutilisable (une règle abstraite de goût/UX), pas une description de l'instant. Réponds UNIQUEMENT par le bloc axiome demandé, rien d'autre.";

    const user = `Pendant le tutoriel ${tutorialId} de MangoOS, l'utilisateur ${sentiment} ce qu'il vivait${
      comment && comment.trim() ? `, en précisant : « ${comment.trim().slice(0, 500)} »` : " (sans commentaire)"
    }. Extrais la RÈGLE ABSTRAITE de goût/UX que cela t'apprend sur lui, applicable à ses futurs projets.

Réponds UNIQUEMENT avec un bloc axiome dans ce format exact (rien d'autre) :
AXIOME-${axiomCat}-XX [candidat] [${tag}] [${tutorialTag}]
- Contexte: (quand cette règle s'applique)
- Piège: (ce qu'il ne faut pas faire)
- Règle d'or: (ce qu'il préfère, concret)
- Source: ${rating === "like" ? "👍" : "👎"} tutoriel ${tutorialId} (${today})`;

    let axiomText = "";
    try {
      axiomText = (await deps.ask(system, user)).trim();
    } catch {
      return; // synthèse impossible (réseau/crédits) — on n'écrit rien
    }
    if (!axiomText.startsWith("AXIOME-")) return;
    // Garde-fou : le tag tutoriel doit être présent (sinon le modèle a dérapé).
    if (!axiomText.includes(`[${tutorialTag}]`)) {
      axiomText = axiomText.replace(/^(AXIOME-\S+ .*)$/m, `$1 [${tutorialTag}]`);
    }

    const axiomsPath = path.join(workspaceDir, AXIOMS_FILE_NAME);
    fs.mkdirSync(workspaceDir, { recursive: true });
    const existing = fs.existsSync(axiomsPath) ? fs.readFileSync(axiomsPath, "utf8").trim() : "";
    const updated = existing ? `${existing}\n\n${axiomText}` : axiomText;
    fs.writeFileSync(axiomsPath, updated + "\n", "utf8");
  } catch {
    return; // never throws
  }
}

/**
 * Lit .axioms.md et renvoie, pour chaque axiome issu du tutoriel ([tutoriel-*]),
 * sa "Règle d'or" (ou l'en-tête à défaut) — la matière de la RelationshipCard
 * "ce que MangoOS a appris de toi". Tolérant : fichier absent → [].
 */
export function loadTutorialAxioms(workspaceDir: string): string[] {
  try {
    const raw = fs.readFileSync(path.join(workspaceDir, AXIOMS_FILE_NAME), "utf8");
    // Les axiomes sont séparés par une ligne vide ; chaque bloc commence par "AXIOME-".
    const blocks = raw.split(/\n\s*\n/).map((b) => b.trim()).filter((b) => b.startsWith("AXIOME-"));
    const learned: string[] = [];
    for (const block of blocks) {
      const header = block.split("\n", 1)[0] ?? "";
      if (!/\[tutoriel-\d+\]/.test(header)) continue;
      const rule = block.match(/-\s*Règle d'or:\s*(.+)/i)?.[1]?.trim();
      learned.push(rule || header);
    }
    return learned;
  } catch {
    return [];
  }
}
