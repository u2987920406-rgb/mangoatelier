import type { Express, Request, Response } from "express";
import { projectExists } from "./projects.js";
import { loadReview, saveReview, analyzeAndSave } from "./build-review.js";

export function registerBuildReviewRoutes(app: Express): void {
  app.get("/api/projects/:name/build-review", (req: Request, res: Response) => {
    const { name } = req.params;
    if (!projectExists(name)) { res.status(404).json({ error: "Projet introuvable" }); return; }
    res.json({ review: loadReview(name) });
  });

  app.post("/api/projects/:name/build-review/rate", (req: Request, res: Response) => {
    const { name } = req.params;
    const { score, comment } = req.body as { score?: unknown; comment?: unknown };
    if (!projectExists(name)) { res.status(404).json({ error: "Projet introuvable" }); return; }
    if (typeof score !== "number" || score < 1 || score > 5) {
      res.status(400).json({ error: "score doit être un entier entre 1 et 5" }); return;
    }
    saveReview(name, score, typeof comment === "string" ? comment.trim() : "");
    res.json({ ok: true });
  });

  app.post("/api/projects/:name/build-review/analyze", async (req: Request, res: Response) => {
    const { name } = req.params;
    const { score, comment } = req.body as { score?: unknown; comment?: unknown };
    if (!projectExists(name)) { res.status(404).json({ error: "Projet introuvable" }); return; }
    if (typeof score !== "number" || score < 1 || score > 5) {
      res.status(400).json({ error: "score doit être un entier entre 1 et 5" }); return;
    }
    try {
      const axioms = await analyzeAndSave(
        name,
        score,
        typeof comment === "string" ? comment.trim() : "",
      );
      res.json({ ok: true, axiomsExtracted: axioms });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });
}
