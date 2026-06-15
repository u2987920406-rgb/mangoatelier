// Idée #41 — Signal humain 👍/👎 (RLHF personnel).
// Reçoit le signal de l'utilisateur sur une livraison, extrait le pattern
// et l'enregistre dans .axioms.md avec le tag validé-utilisateur ou à-éviter.
import path from "node:path";
import fs from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { AXIOMS_FILE_NAME } from "./axioms.js";

const client = new Anthropic();

export type FeedbackRating = "like" | "dislike";

export async function processFeedback(
  workspaceDir: string,
  rating: FeedbackRating,
  messageText: string,
  projectName: string,
): Promise<void> {
  const tag = rating === "like" ? "validé-utilisateur" : "à-éviter";
  const axiomCat = rating === "like" ? "UX" : "AVOID";
  const today = new Date().toISOString().slice(0, 10);

  const prompt = rating === "like"
    ? `L'utilisateur a 👍 cette réponse de MangoAI dans le projet "${projectName}". Extrait le PATTERN UX/visuel/architectural qui lui a plu sous forme d'axiome universel réutilisable. Ne décris pas ce que le message dit — extrait la RÈGLE ABSTRAITE applicable à d'autres projets.

Message liké :
${messageText.slice(0, 1500)}

Réponds UNIQUEMENT avec un bloc axiome dans ce format exact (rien d'autre) :
AXIOME-${axiomCat}-XX [candidat] [${tag}]
- Contexte: (quand cette règle s'applique)
- Piège: (l'erreur à éviter)
- Règle d'or: (la règle concrète)
- Source: 👍 utilisateur (${today}) — projet ${projectName}`
    : `L'utilisateur a 👎 cette réponse de MangoAI dans le projet "${projectName}". Extrait le PATTERN à éviter sous forme d'axiome universel. Ne décris pas ce que le message dit — extrait ce qu'il ne faut JAMAIS faire dans un contexte similaire.

Message disliké :
${messageText.slice(0, 1500)}

Réponds UNIQUEMENT avec un bloc axiome dans ce format exact (rien d'autre) :
AXIOME-${axiomCat}-XX [candidat] [${tag}]
- Contexte: (quand ce pattern apparaît)
- Piège: (ce qui déplaît à l'utilisateur)
- Règle d'or: (ce qu'il faut faire à la place)
- Source: 👎 utilisateur (${today}) — projet ${projectName}`;

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 400,
    messages: [{ role: "user", content: prompt }],
  });

  const axiomText = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  if (!axiomText.startsWith("AXIOME-")) return;

  const axiomsPath = path.join(workspaceDir, AXIOMS_FILE_NAME);
  const existing = fs.existsSync(axiomsPath)
    ? fs.readFileSync(axiomsPath, "utf8").trim()
    : "";
  const updated = existing ? `${existing}\n\n${axiomText}` : axiomText;
  fs.writeFileSync(axiomsPath, updated + "\n", "utf8");
}
