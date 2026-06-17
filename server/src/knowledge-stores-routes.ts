// Knowledge-store routes: project memory, user profile, identity layers,
// architecture, lexique, miroir, design system, preferences.
// All routes are self-contained (no agentBusy, no SSE).
import fs from "node:fs";
import type { Express, Request, Response } from "express";
import { loadMemory, loadUserProfile } from "./memory.js";
import { listSkills } from "./skills.js";
import { loadAxioms } from "./axioms.js";
import { loadDesignSystem, saveDesignSystem } from "./design-system.js";
import { IDENTITY_LAYERS, loadLanguage, loadThinkingStyle, loadVision, type IdentityLayer } from "./identity.js";
import { loadArchitecture, ARCHITECTURE_FILE_NAME } from "./architecture.js";
import { loadLexique, saveLexique } from "./lexique.js";
import { loadMiroir, saveMiroir } from "./miroir.js";
import { loadPreferences, savePreferences, learnPreferences } from "./preferences.js";
import {
  resolveConstellations,
  loadConstellationsConfig,
  saveConstellationsConfig,
  isDefaultConstellation,
} from "./constellations.js";
import { listComponents } from "./components.js";
import { listReferences } from "./references.js";
import { projectDir, projectExists, WORKSPACE_DIR } from "./projects.js";

export function registerKnowledgeStoresRoutes(app: Express): void {
  // What the agent has learned: project memory, user profile, skill library
  app.get("/api/knowledge/:name", (req: Request, res: Response) => {
    const name = req.params["name"] as string;
    const dir = projectExists(name) ? projectDir(name) : null;
    res.json({
      memory: dir ? loadMemory(dir) : "",
      profile: loadUserProfile(WORKSPACE_DIR),
      skills: listSkills().map(({ name: skill, description }) => ({ name: skill, description })),
      axioms: loadAxioms(WORKSPACE_DIR),
      designSystem: loadDesignSystem(WORKSPACE_DIR),
      architecture: dir ? loadArchitecture(dir) : "",
      // Idée #45 — language contract (Ubiquitous Language), project-scoped.
      lexique: dir ? loadLexique(dir) : "",
      // Idée #48 — Le Miroir: validated comprehension snapshot, project-scoped.
      miroir: dir ? loadMiroir(dir) : "",
      // Idée #49 — Cadrage qui apprend de toi: learned recurring preferences (workspace-level).
      preferences: loadPreferences(WORKSPACE_DIR),
      // Idée #36 — cross-project component library (workspace-level).
      components: listComponents(WORKSPACE_DIR),
      // Idée #50 — Banque de références perso: mood library (workspace-level).
      references: listReferences(WORKSPACE_DIR),
      // Idée #74 — constellations effectives (défauts + overrides), avec origine.
      constellations: resolveConstellations(WORKSPACE_DIR).map((c) => ({
        id: c.id,
        label: c.label,
        emoji: c.emoji,
        keywords: c.keywords,
        rules: c.rules,
        isDefault: isDefaultConstellation(c.id),
      })),
      // Idée #42 — personal identity layers (workspace-level, cross-project).
      identity: {
        language: loadLanguage(WORKSPACE_DIR),
        thinking: loadThinkingStyle(WORKSPACE_DIR),
        vision: loadVision(WORKSPACE_DIR),
      },
    });
  });

  // Idée #42 — couches d'identité : lecture / écriture d'une couche
  // (layer ∈ language | thinking | vision). Fichiers cross-projet à la racine du
  // workspace. .vision.md est éditable ici (signal explicite de l'utilisateur),
  // mais la revue en arrière-plan n'y touche jamais.
  app.get("/api/identity/:layer", (req: Request, res: Response) => {
    const layer = req.params["layer"] as string as IdentityLayer;
    const store = IDENTITY_LAYERS[layer];
    if (!store) {
      res.status(400).json({ error: "layer invalide (language | thinking | vision)" });
      return;
    }
    res.json({ content: store.load(WORKSPACE_DIR) });
  });

  app.put("/api/identity/:layer", (req: Request, res: Response) => {
    const layer = req.params["layer"] as string as IdentityLayer;
    const store = IDENTITY_LAYERS[layer];
    if (!store) {
      res.status(400).json({ error: "layer invalide (language | thinking | vision)" });
      return;
    }
    const { content } = req.body as { content?: string };
    if (typeof content !== "string") {
      res.status(400).json({ error: "content (string) requis" });
      return;
    }
    try {
      store.save(WORKSPACE_DIR, content);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  // Chantier #38 — Architecture vivante : écriture manuelle depuis l'UI
  app.put("/api/architecture/:name", (req: Request, res: Response) => {
    const name = req.params["name"] as string;
    const { content } = req.body as { content?: string };
    if (typeof content !== "string") {
      res.status(400).json({ error: "content (string) requis" });
      return;
    }
    try {
      const dir = projectDir(name);
      const file = `${dir}/${ARCHITECTURE_FILE_NAME}`;
      fs.writeFileSync(file, content, "utf8");
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  // Idée #45 — Contrat de langage : lecture / écriture manuelle depuis l'UI
  app.get("/api/lexique/:name", (req: Request, res: Response) => {
    const name = req.params["name"] as string;
    const dir = projectExists(name) ? projectDir(name) : null;
    res.json({ content: dir ? loadLexique(dir) : "" });
  });

  app.put("/api/lexique/:name", (req: Request, res: Response) => {
    const name = req.params["name"] as string;
    const { content } = req.body as { content?: string };
    if (typeof content !== "string") {
      res.status(400).json({ error: "content (string) requis" });
      return;
    }
    try {
      saveLexique(projectDir(name), content);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  // Idée #48 — Le Miroir : lecture / correction manuelle depuis l'UI
  app.get("/api/miroir/:name", (req: Request, res: Response) => {
    const name = req.params["name"] as string;
    const dir = projectExists(name) ? projectDir(name) : null;
    res.json({ content: dir ? loadMiroir(dir) : "" });
  });

  app.put("/api/miroir/:name", (req: Request, res: Response) => {
    const name = req.params["name"] as string;
    const { content } = req.body as { content?: string };
    if (typeof content !== "string") {
      res.status(400).json({ error: "content (string) requis" });
      return;
    }
    try {
      saveMiroir(projectDir(name), content);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  // Chantier A — Design system persistant : lecture / écriture du fichier cross-projet
  app.get("/api/design-system", (req: Request, res: Response) => {
    res.json({ content: loadDesignSystem(WORKSPACE_DIR) });
  });

  app.put("/api/design-system", (req: Request, res: Response) => {
    const { content } = req.body as { content?: string };
    if (typeof content !== "string") {
      res.status(400).json({ error: "content (string) requis" });
      return;
    }
    try {
      saveDesignSystem(WORKSPACE_DIR, content);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  // ── Idée #49 — Préférences apprises cross-projet ─────────────────────────────

  app.get("/api/preferences", (req: Request, res: Response) => {
    res.json({ content: loadPreferences(WORKSPACE_DIR) });
  });

  app.put("/api/preferences", (req: Request, res: Response) => {
    const { content } = req.body as { content?: string };
    if (typeof content !== "string") {
      res.status(400).json({ error: "content (string) requis" });
      return;
    }
    try {
      savePreferences(WORKSPACE_DIR, content);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  app.post("/api/preferences/learn", async (req: Request, res: Response) => {
    try {
      await learnPreferences(WORKSPACE_DIR);
      res.json({ ok: true, content: loadPreferences(WORKSPACE_DIR) });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  // ── Idée #74 — Constellations (super-skills par composition) ─────────────────
  // `resolved` = liste effective (défauts + overrides) pour l'affichage lecture ;
  // `config` = texte brut du .constellations.json pour l'éditeur JSON léger.
  app.get("/api/constellations", (req: Request, res: Response) => {
    res.json({
      resolved: resolveConstellations(WORKSPACE_DIR).map((c) => ({
        id: c.id,
        label: c.label,
        emoji: c.emoji,
        keywords: c.keywords,
        rules: c.rules,
        isDefault: isDefaultConstellation(c.id),
      })),
      config: loadConstellationsConfig(WORKSPACE_DIR),
    });
  });

  app.put("/api/constellations", (req: Request, res: Response) => {
    const { content } = req.body as { content?: string };
    if (typeof content !== "string") {
      res.status(400).json({ error: "content (string) requis" });
      return;
    }
    try {
      saveConstellationsConfig(WORKSPACE_DIR, content);
      res.json({ ok: true });
    } catch (err) {
      // JSON invalide / pas un tableau → 400 (erreur de saisie utilisateur).
      res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });
}
