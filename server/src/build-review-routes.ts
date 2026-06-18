import type { Express, Request, Response } from "express";
import { projectExists } from "./projects.js";
import { loadSteps, loadRatings, saveRating, deleteRating } from "./build-review.js";

export function registerBuildReviewRoutes(app: Express): void {
  // Liste des étapes du build (messages "agent" de l'historique)
  app.get("/api/projects/:name/build-steps", (req: Request, res: Response) => {
    const { name } = req.params;
    if (!projectExists(name)) { res.status(404).json({ error: "Projet introuvable" }); return; }
    const steps   = loadSteps(name);
    const ratings = loadRatings(name);
    const ratingMap = Object.fromEntries(ratings.map((r) => [r.stepIndex, r]));
    res.json({ steps: steps.map((s) => ({ ...s, rating: ratingMap[s.index] ?? null })) });
  });

  // Ajouter / modifier une note
  app.post("/api/projects/:name/build-steps/:index/rate", (req: Request, res: Response) => {
    const { name, index } = req.params;
    const idx = parseInt(index, 10);
    const { score, comment } = req.body as { score?: unknown; comment?: unknown };
    if (!projectExists(name)) { res.status(404).json({ error: "Projet introuvable" }); return; }
    if (typeof score !== "number" || score < 1 || score > 5) {
      res.status(400).json({ error: "score doit être un entier entre 1 et 5" }); return;
    }
    saveRating(name, idx, score, typeof comment === "string" ? comment.trim() : "");
    res.json({ ok: true });
  });

  // Supprimer une note
  app.delete("/api/projects/:name/build-steps/:index/rate", (req: Request, res: Response) => {
    const { name, index } = req.params;
    if (!projectExists(name)) { res.status(404).json({ error: "Projet introuvable" }); return; }
    deleteRating(name, parseInt(index, 10));
    res.json({ ok: true });
  });
}
