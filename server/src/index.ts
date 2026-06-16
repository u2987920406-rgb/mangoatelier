// MangoAI backend: chat endpoint (SSE) + project/preview management.
import "dotenv/config";
import express from "express";
import cors from "cors";
import { ZipArchive } from "archiver";
import path from "node:path";
import fs from "node:fs";
import { ALLOWED_MODELS, ALLOWED_MODES, interruptAgent, runAgent, type AgentEvent, type Mode, type ModelChoice } from "./agent.js";
import { appendHistory, formatToolLine, loadHistory, type ChatEntry } from "./history.js";
import { createProject, listProjects, listTemplates, projectDir, projectExists, WORKSPACE_DIR } from "./projects.js";
import { loadMemory, loadUserProfile } from "./memory.js";
import { listSkills, SKILLS_DIR } from "./skills.js";
import { axiomStats, loadAxioms } from "./axioms.js";
import { computeInsights } from "./metrics-insights.js";
import { inferProjectType } from "./blueprints.js";
import { previewStatus, startPreview } from "./preview.js";
import { clearSession, getSession, saveSession } from "./sessions.js";
import { commitVersion, ensureRepo, listVersions, rollbackTo } from "./versions.js";
import { ensureErrorRelay, ensureInspectRelay } from "./relay.js";
import { ensureClickSourcePlugin, readSourceSnippet, buildVisualEditPrompt, type EditTarget } from "./clicksource.js";
import { deployProject, isDeployTarget } from "./deploy.js";
import { githubConfigured, pushToGitHub } from "./github.js";
import { spawnBackgroundReview } from "./review.js";
import { interruptCompaction, maybeCompactSession } from "./compaction.js";
import { ASSETS_DIR_NAME, saveUpload } from "./uploads.js";
import { SNAPSHOTS_DIR_NAME, setVisionContext, snapZone, visionStatus } from "./vision.js";
import { readMetrics, recordTurnMetrics } from "./metrics.js";
import { runRelay } from "./eleve.js";
import { loadDesignSystem, saveDesignSystem } from "./design-system.js";
import { IDENTITY_LAYERS, loadLanguage, loadThinkingStyle, loadVision, type IdentityLayer } from "./identity.js";
import { loadArchitecture, ARCHITECTURE_FILE_NAME } from "./architecture.js";
import { loadLexique, saveLexique, generateLexique } from "./lexique.js";
import { loadMiroir, saveMiroir } from "./miroir.js";
import { backendServerStatus, hasBackend, installBackendDeps, scaffoldBackend, startBackendServer, stopBackendServer } from "./backend-generator.js";
import multer from "multer";
import { transcribeAudio } from "./transcribe.js";
import { processFeedback, checkAndUpdateStreak, resetStreak, processEscalationReference, type FeedbackRating } from "./feedback.js";
import { listComponents, loadComponent, saveComponent, deleteComponent, type ComponentEntry } from "./components.js";
import { listReferences, loadReference, saveReference, deleteReference, referenceImagePath, type ReferenceMeta } from "./references.js";
import { registerPromptLabRoutes } from "./promptlab.js";
import { registerTokenizerRoutes } from "./tokenizer.js";
import { registerIdeationRoutes } from "./ideation.js";
import { registerVeilleRoutes } from "./veille.js";
import { registerModelRouterRoutes } from "./model-router.js";
import { registerDocGeneratorRoutes } from "./docgenerator.js";
import { registerVersionGraphRoutes } from "./version-graph.js";
import { registerQARoutes } from "./qa-temporal.js";
import { registerStripeRoutes } from "./stripe.js";
import { registerCronRoutes } from "./cron-scheduler.js";
import { registerMetricsDashboardRoutes } from "./metrics-dashboard.js";
import { registerNotesRAGRoutes } from "./notes-rag.js";
import { registerMultiProjectRoutes } from "./multi-project.js";
import { registerAutoAblationRoutes } from "./auto-ablation.js";
import { registerDesignReviewRoutes } from "./design-review.js";
import { registerSuperAgentRoutes } from "./super-agent-builder.js";
import { loadPreferences, savePreferences, learnPreferences } from "./preferences.js";
import { runCouncil, loadRecoveryPlan, clearRecoveryPlan } from "./orchestrator.js";
import { registerTutorialRoutes } from "./tutorial.js";

// Last-resort safety net: a bug in a fire-and-forget background task (review,
// compaction) or any forgotten await must never take the whole server down —
// Node's default is to exit on unhandled rejections.
process.on("unhandledRejection", (reason) => {
  console.error("[unhandled-rejection]", reason instanceof Error ? (reason.stack ?? reason.message) : reason);
});
process.on("uncaughtException", (err) => {
  console.error("[uncaught-exception]", err.stack ?? err.message);
});

const PORT = Number(process.env.PORT ?? 3000);
const app = express();
app.use(cors());
app.use(express.json());

let agentBusy = false;

app.get("/api/projects", (_req, res) => {
  res.json({
    projects: listProjects(),
    templates: listTemplates(),
    preview: previewStatus(),
    githubEnabled: githubConfigured(),
  });
});

// Body: { prompt: string, projectName: string, sessionId?: string }
// Streams AgentEvent objects as SSE. Creates the project on first message.
app.post("/api/chat", async (req, res) => {
  const { prompt, projectName, sessionId, model, mode, template, editTarget, tutorialId } = req.body as {
    prompt?: string;
    projectName?: string;
    sessionId?: string;
    model?: string;
    mode?: string;
    template?: string;
    editTarget?: EditTarget; // #6 : cible d'une édition visuelle (clic→source)
    tutorialId?: number; // #56 Chantier C : tour joué DANS le tutoriel (posture pédagogue)
  };
  // Posture tutoriel injectée dans le system prompt quand on construit dans un tuto.
  const tutorial = typeof tutorialId === "number" && tutorialId >= 1 ? { id: tutorialId } : null;
  // Third brain option (Phase Ultime jalon D): "eleve" routes the turn to the
  // local student (Qwen via Ollama) through the relay loop instead of Claude.
  // Claude stays the escalation tier. Any other value = a normal Claude turn.
  const useEleve = model === "eleve";
  const chosenModel = ALLOWED_MODELS.includes(model as ModelChoice)
    ? (model as ModelChoice)
    : undefined;
  const chosenMode: Mode = ALLOWED_MODES.includes(mode as Mode) ? (mode as Mode) : "elite";
  const projectType = inferProjectType(prompt ?? "");
  if (!prompt?.trim() || !projectName?.trim()) {
    res.status(400).json({ error: "prompt and projectName are required" });
    return;
  }
  if (agentBusy) {
    res.status(409).json({ error: "Agent is already working, wait for it to finish" });
    return;
  }
  // From here on agentBusy is true; EVERYTHING that can throw must sit inside
  // the try below so the finally always clears it. A stuck agentBusy used to
  // freeze the whole UI — including preview switching, which 409s while a turn
  // "runs". Between here and the try there is only synchronous header setup.
  agentBusy = true;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
  const send = (event: unknown) => res.write(`data: ${JSON.stringify(event)}\n\n`);

  // Everything worth re-rendering on reload is collected here and written to
  // the project's .chat-history.json once the turn ends.
  const turn: ChatEntry[] = [];
  let historyDir: string | null = null;
  // Object refs (not plain lets): assigned inside streamAgentTurn's closure,
  // read in the finally block — TS control-flow can't track the assignment.
  const lastContext: { current: { tokens: number; window: number } | null } = { current: null };
  const lastResult: { current: { costUsd: number; numTurns: number } | null } = { current: null };
  // Élève relay outcome (jalon D), folded into this turn's metrics line.
  const relayMeta: { current: { resolvedBy: "eleve" | "maitre" | "none"; attempts: number } | null } = { current: null };
  const turnStart = Date.now();
  const record = (role: ChatEntry["role"], text: string) =>
    turn.push({ role, text, ts: new Date().toISOString() });
  const recordEvent = (event: AgentEvent) => {
    if (event.type === "text") record("agent", event.text);
    else if (event.type === "thinking") record("thinking", event.text);
    else if (event.type === "tool") record("tool", formatToolLine(event.name, event.detail));
    else if (event.type === "error") record("error", event.message);
    else if (event.type === "result" && !event.ok) record("error", `L'agent s'est arrêté : ${event.error}`);
  };

  try {
    // A background compaction may be rewriting this project's session — stop it
    // and wait so the turn resumes a stable session id (old or new, both valid).
    // Inside the try: if it rejects, the finally still releases agentBusy.
    await interruptCompaction();

    let dir: string;
    if (!projectExists(projectName)) {
      send({ type: "status", text: "Création du projet (template + npm install)…" });
      dir = await createProject(projectName, template || undefined);
    } else {
      dir = projectDir(projectName);
    }
    ensureErrorRelay(dir);
    // #5 : tampon de source (dev-only, vite.config.js) + relais clic→source
    // (index.html) — pour l'édition visuelle. Idempotents, sans effet en prod.
    ensureClickSourcePlugin(dir);
    ensureInspectRelay(dir);
    // Snapshot the pre-agent state so the first rollback point always exists
    await ensureRepo(dir);
    historyDir = dir;
    record("user", prompt);

    // Idée #45 Porte A — le contrat de langage se construit TOUT SEUL en
    // arrière-plan depuis la 1ʳᵉ phrase d'intention (recherche web si le domaine
    // est inconnu). Fire-and-forget façon review/compaction : non bloquant,
    // erreurs avalées, ne tourne QUE si .lexique.md est absent/vide. Ne ralentit
    // JAMAIS la réponse de chat.
    void generateLexique(dir, prompt).catch(() => {});

    // Édition visuelle ciblée (#6) : si le tour vient d'un clic→source, on enrichit
    // la tâche envoyée à l'agent avec le fichier:ligne EXACT + l'extrait (edit
    // chirurgical), sans polluer le message affiché ni le titre de version. On
    // capture aussi les octets du fichier cible pour VÉRIFIER objectivement que
    // l'édition a pris (diff non vide — la discipline de mesure appliquée en prod).
    let agentPrompt = prompt;
    let editFile: string | null = null;
    let editBytesBefore: string | null = null;
    if (editTarget?.src) {
      const built = buildVisualEditPrompt(dir, editTarget, prompt);
      if (built) {
        agentPrompt = built.prompt;
        editFile = built.file;
        try {
          editBytesBefore = fs.readFileSync(path.join(dir, built.file), "utf8");
        } catch {
          editBytesBefore = null;
        }
        send({ type: "status", text: `🎯 Édition ciblée : ${built.file}:${built.line}` });
      } else {
        send({ type: "status", text: "⚠ Source de l'élément introuvable — édition en tour normal." });
      }
    }

    send({ type: "status", text: "Démarrage de l'aperçu…" });
    const { url } = await startPreview(dir);
    send({ type: "preview", url });
    // Vision mode: bind the snapshot tool to this project's preview, set the
    // per-turn budget for the chosen effort mode, purge last turn's snapshots.
    setVisionContext(dir, url, chosenMode);

    // Runs one agent turn. Returns "session-not-found" when resuming a session
    // the SDK no longer knows (e.g. the project folder was moved/renamed) so
    // the caller can retry with a fresh conversation. The failed "result"
    // event is held back until we know it isn't that case.
    const streamAgentTurn = async (session?: string): Promise<"ok" | "session-not-found"> => {
      let pendingFailure: unknown = null;
      for await (const event of runAgent(agentPrompt, dir, session, chosenModel, chosenMode, tutorial)) {
        if (session && event.type === "error" && /No conversation found/i.test(event.message)) {
          return "session-not-found";
        }
        if (session && event.type === "result" && !event.ok) {
          pendingFailure = event;
          continue;
        }
        if (event.type === "result" && event.sessionId) {
          saveSession(projectName, event.sessionId);
          lastResult.current = { costUsd: event.costUsd, numTurns: event.numTurns };
          if (event.contextTokens && event.contextWindow) {
            lastContext.current = { tokens: event.contextTokens, window: event.contextWindow };
          }
        }
        recordEvent(event);
        send(event);
      }
      if (pendingFailure) {
        recordEvent(pendingFailure as AgentEvent);
        send(pendingFailure);
      }
      return "ok";
    };

    if (useEleve) {
      // Élève path (jalon D): the local student attempts the task at zero cost,
      // an objective build judges it, and only an objective failure escalates to
      // Claude. We stream the relay trace as status lines.
      send({ type: "status", text: "🎓 L'Élève local (Qwen) prend la main…" });
      const r = await runRelay(agentPrompt, dir, {
        onLog: (line) => {
          record("status", line);
          send({ type: "status", text: line });
        },
      });
      relayMeta.current = { resolvedBy: r.resolvedBy, attempts: r.attempts };
      lastResult.current = { costUsd: r.costUsd, numTurns: r.attempts };
      const verdict =
        r.resolvedBy === "eleve"
          ? `✅ Résolu par l'Élève (Qwen local) en ${r.attempts} tentative(s) — coût Claude $0.00.`
          : r.resolvedBy === "maitre"
            ? `👑 L'Élève a buté → escaladé au Maître (Claude), corrigé${r.axiom ? " + 1 axiome appris" : ""} — coût $${r.costUsd.toFixed(4)}.`
            : `❌ Échec : ni l'Élève ni le Maître n'ont fait passer le build (${r.inspection.signal}).`;
      if (r.success) {
        record("agent", verdict);
        send({ type: "text", text: verdict });
      } else {
        record("error", verdict);
        send({ type: "error", message: verdict });
      }
    } else {
      // Resume the project's previous conversation if the client didn't pass one
      const effectiveSession = sessionId ?? getSession(projectName);
      send({ type: "status", text: "L'agent travaille…" });
      const outcome = await streamAgentTurn(effectiveSession);
      if (outcome === "session-not-found") {
        clearSession(projectName);
        send({ type: "status", text: "Ancienne conversation introuvable — nouvelle conversation démarrée." });
        await streamAgentTurn(undefined);
      }
    }

    // Vérification d'effet de l'édition visuelle (#6) : signal OBJECTIF que le
    // changement a pris (le fichier cible a changé d'octets), au lieu de le
    // supposer. C'est la parade du caveat n°7 appliquée à la production, dans le
    // seul cas où l'on connaît la cible : un clic→source.
    if (editFile && !turn.some((e) => e.role === "error")) {
      let after: string | null = null;
      try {
        after = fs.readFileSync(path.join(dir, editFile), "utf8");
      } catch {
        after = null;
      }
      const changed = after !== null && after !== editBytesBefore;
      const msg = changed
        ? `✓ Élément modifié — ${editFile} a bien changé.`
        : `⚠ ${editFile} n'a PAS changé — l'édition n'a peut-être pas pris. Reformule ou précise l'élément.`;
      record("status", msg);
      send({ type: changed ? "status" : "error", ...(changed ? { text: msg } : { message: msg }) });
    }

    const version = await commitVersion(dir, prompt.replace(/\s+/g, " ").slice(0, 72));
    if (version) {
      record("status", `📌 Version sauvegardée (${version.hash})`);
      send({ type: "version", ...version });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    record("error", message);
    send({ type: "error", message });
  } finally {
    agentBusy = false;
    if (historyDir) {
      try {
        appendHistory(historyDir, turn);
      } catch (err) {
        console.error("[history]", err instanceof Error ? err.message : err);
      }
      // Hermes pattern: review only delivered, non-failed turns — after the
      // response, so it never costs the user any latency.
      if (turn.some((e) => e.role === "agent") && !turn.some((e) => e.role === "error")) {
        spawnBackgroundReview(historyDir, turn);
      }
      // Hermes context_compressor transposed: compact between turns, in the
      // background, once the context crosses the threshold.
      const ctx = lastContext.current;
      if (!turn.some((e) => e.role === "error") && ctx) {
        const session = getSession(projectName);
        if (session) {
          maybeCompactSession(projectName, historyDir, session, ctx.tokens, ctx.window);
        }
      }
    }
    // One dated record per turn (idea 14): the raw material of the learning
    // curve and of the 2026-06-22 cost audit.
    recordTurnMetrics({
      ts: new Date().toISOString(),
      project: projectName,
      model: useEleve ? "eleve" : (chosenModel ?? "sonnet"),
      mode: chosenMode,
      costUsd: lastResult.current?.costUsd ?? 0,
      numTurns: lastResult.current?.numTurns ?? 0,
      contextTokens: lastContext.current?.tokens,
      contextWindow: lastContext.current?.window,
      snapshots: visionStatus().used,
      durationMs: Date.now() - turnStart,
      error: turn.some((e) => e.role === "error"),
      projectType,
      ...(relayMeta.current
        ? { resolvedBy: relayMeta.current.resolvedBy, attempts: relayMeta.current.attempts }
        : {}),
    });
    send({ type: "done" });
    res.end();
  }
});

// Multimodal input: stores a user-attached image/PDF under <project>/.assets/
// so the agent can Read it. Raw body (the file bytes), filename in the query.
// Works before the project scaffold exists (first message with attachments).
app.post(
  "/api/upload/:name",
  express.raw({ type: () => true, limit: "26mb" }),
  (req, res) => {
    try {
      const dir = projectDir(req.params.name);
      fs.mkdirSync(dir, { recursive: true });
      const relPath = saveUpload(dir, String(req.query.filename ?? ""), req.body as Buffer);
      res.json({ path: relPath });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
    }
  },
);

// Snap button: captures a user-drawn zone of the live preview and returns it
// as a base64 PNG that the UI attaches to the next message.
app.post("/api/snap", async (req, res) => {
  const { projectName, viewport, box } = req.body as {
    projectName?: string;
    viewport?: { width?: number; height?: number };
    box?: { x?: number; y?: number; width?: number; height?: number };
  };
  const nums = [viewport?.width, viewport?.height, box?.x, box?.y, box?.width, box?.height];
  if (!projectName?.trim() || nums.some((n) => typeof n !== "number" || !Number.isFinite(n))) {
    res.status(400).json({ error: "projectName, viewport and box are required" });
    return;
  }
  if (!projectExists(projectName)) {
    res.status(404).json({ error: `Project "${projectName}" not found` });
    return;
  }
  const dir = projectDir(projectName);
  // Reusing the running preview is always safe; switching the preview to
  // another project while the agent works is not.
  if (agentBusy && previewStatus().projectDir !== dir) {
    res.status(409).json({ error: "L'agent travaille — la capture suivra le projet actif" });
    return;
  }
  try {
    const { url } = await startPreview(dir);
    const buf = await snapZone(
      url,
      viewport as { width: number; height: number },
      box as { x: number; y: number; width: number; height: number },
    );
    res.json({ data: buf.toString("base64") });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Relais clic→source (#5) : le builder a capté un data-mango-src (fichier:ligne)
// via le clic en mode inspection ; il demande ici l'extrait de code pointé (pour
// l'afficher et, plus tard #6, alimenter l'édition chirurgicale via la Coque Rigide).
app.post("/api/inspect", (req, res) => {
  const { projectName, src } = req.body as { projectName?: string; src?: string };
  if (!projectName?.trim() || !src?.trim()) {
    res.status(400).json({ error: "projectName and src are required" });
    return;
  }
  if (!projectExists(projectName)) {
    res.status(404).json({ error: `Project "${projectName}" not found` });
    return;
  }
  const result = readSourceSnippet(projectDir(projectName), src);
  if ("error" in result) {
    res.status(404).json(result);
    return;
  }
  res.json(result);
});

// Start (or reuse) the live preview of an existing project — lets the UI
// restore the preview on page load without sending a message first
app.post("/api/preview/:name", async (req, res) => {
  const name = req.params.name;
  if (!projectExists(name)) {
    res.status(404).json({ error: `Project "${name}" not found` });
    return;
  }
  if (agentBusy) {
    res.status(409).json({ error: "Agent is working — preview follows the active project" });
    return;
  }
  try {
    const dir = projectDir(name);
    ensureErrorRelay(dir);
    const { url } = await startPreview(dir);
    res.json({ url });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// One-click deploy to a static host — Cloudflare/Vercel/Netlify (build + upload)
app.post("/api/deploy/:name", async (req, res) => {
  const name = req.params.name;
  const target = (req.body as { target?: unknown })?.target ?? "cloudflare";
  if (!projectExists(name)) {
    res.status(404).json({ error: `Project "${name}" not found` });
    return;
  }
  if (!isDeployTarget(target)) {
    res.status(400).json({ error: `Cible de déploiement inconnue : ${String(target)}` });
    return;
  }
  if (agentBusy) {
    res.status(409).json({ error: "L'agent travaille — attends la fin avant de publier" });
    return;
  }
  try {
    const { url } = await deployProject(projectDir(name), name, target);
    res.json({ url, target });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// One-click push to GitHub (creates the repo if needed, force-pushes history)
app.post("/api/github/:name", async (req, res) => {
  const name = req.params.name;
  const isPrivate = (req.body as { private?: boolean })?.private !== false;
  if (!projectExists(name)) {
    res.status(404).json({ error: `Project "${name}" not found` });
    return;
  }
  if (agentBusy) {
    res.status(409).json({ error: "L'agent travaille — attends la fin avant de publier sur GitHub" });
    return;
  }
  try {
    const { url } = await pushToGitHub(projectDir(name), name, isPrivate);
    res.json({ url });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Learning-curve dashboard (idea 21): per-turn metrics for the UI to chart
app.get("/api/metrics", (_req, res) => {
  const rows = readMetrics();
  res.json({ rows, insights: computeInsights(rows, axiomStats(WORKSPACE_DIR)) });
});

// Manual skill creation endpoint
app.post("/api/skill", (req, res) => {
  const { name, description, body } = req.body as { name?: string; description?: string; body?: string };
  const rawName = (name ?? "").trim();
  const rawDesc = (description ?? "").trim();
  const rawBody = (body ?? "").trim();
  if (!rawName || !rawBody) {
    res.status(400).json({ error: "name et body requis" });
    return;
  }
  const slug = rawName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "skill";
  const skillDir = path.join(SKILLS_DIR, slug);
  const skillFile = path.join(skillDir, "SKILL.md");
  try {
    fs.mkdirSync(skillDir, { recursive: true });
    const content = `---\nname: ${rawName}\ndescription: ${rawDesc}\n---\n\n${rawBody}`;
    fs.writeFileSync(skillFile, content, "utf8");
    res.json({ ok: true, slug });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// What the agent has learned: project memory, user profile, skill library
app.get("/api/knowledge/:name", (req, res) => {
  const name = req.params.name;
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
    // Idée #42 — personal identity layers (workspace-level, cross-project).
    identity: {
      language: loadLanguage(WORKSPACE_DIR),
      thinking: loadThinkingStyle(WORKSPACE_DIR),
      vision: loadVision(WORKSPACE_DIR),
    },
  });
});

// ── Idée #36 — Bibliothèque de composants inter-projets ──────────────────────

// List all component metas
app.get("/api/components", (_req, res) => {
  res.json({ components: listComponents(WORKSPACE_DIR) });
});

// Get a single component (meta + code)
app.get("/api/components/:name", (req, res) => {
  const entry = loadComponent(WORKSPACE_DIR, req.params.name);
  if (!entry) {
    res.status(404).json({ error: `Composant "${req.params.name}" introuvable` });
    return;
  }
  res.json(entry);
});

// Create or update a component (manual from the UI)
app.post("/api/components", (req, res) => {
  const { meta, code } = req.body as Partial<ComponentEntry>;
  if (!meta?.name?.trim() || !code?.trim()) {
    res.status(400).json({ error: "meta.name et code requis" });
    return;
  }
  const now = new Date().toISOString();
  const existing = loadComponent(WORKSPACE_DIR, meta.name);
  const entry: ComponentEntry = {
    meta: {
      name: meta.name.trim(),
      description: meta.description ?? "",
      tags: meta.tags ?? [],
      props: meta.props ?? [],
      usedIn: meta.usedIn ?? [],
      createdAt: existing?.meta.createdAt ?? now,
      updatedAt: now,
    },
    code: code.trim(),
  };
  try {
    saveComponent(WORKSPACE_DIR, entry);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Delete a component
app.delete("/api/components/:name", (req, res) => {
  try {
    deleteComponent(WORKSPACE_DIR, req.params.name);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// ── Idée #50 — Banque de références perso (mood library, workspace-level) ────

// Image upload middleware for references (10 MB limit, memory storage)
const refImageUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// List all reference metas
app.get("/api/references", (_req, res) => {
  res.json({ references: listReferences(WORKSPACE_DIR) });
});

// Get a single reference meta
app.get("/api/references/:slug", (req, res) => {
  const meta = loadReference(WORKSPACE_DIR, req.params.slug);
  if (!meta) {
    res.status(404).json({ error: `Référence "${req.params.slug}" introuvable` });
    return;
  }
  res.json(meta);
});

// Serve the image file of a reference
app.get("/api/references/:slug/image", (req, res) => {
  const imgPath = referenceImagePath(WORKSPACE_DIR, req.params.slug);
  if (!imgPath) {
    res.status(404).json({ error: "Pas d'image pour cette référence" });
    return;
  }
  res.sendFile(imgPath);
});

// Create or update a reference (JSON body)
app.post("/api/references", (req, res) => {
  const body = req.body as Partial<ReferenceMeta>;
  if (!body.title?.trim()) {
    res.status(400).json({ error: "title requis" });
    return;
  }
  if (!body.kind || !["url", "image", "palette"].includes(body.kind)) {
    res.status(400).json({ error: "kind doit être url, image ou palette" });
    return;
  }
  const slug = body.title.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
  const now = new Date().toISOString();
  const existing = loadReference(WORKSPACE_DIR, slug);
  const meta: ReferenceMeta = {
    slug,
    title: body.title.trim(),
    kind: body.kind,
    url: body.url ?? existing?.url,
    image: body.image ?? existing?.image,
    palette: body.palette ?? existing?.palette ?? [],
    ambiance: body.ambiance ?? existing?.ambiance,
    tags: body.tags ?? existing?.tags ?? [],
    note: body.note ?? existing?.note,
    usedIn: body.usedIn ?? existing?.usedIn ?? [],
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  try {
    saveReference(WORKSPACE_DIR, meta);
    res.json(meta);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Upload an image file for an existing reference
app.post("/api/references/:slug/image", refImageUpload.single("file"), (req, res) => {
  const slug = req.params["slug"] as string;
  const meta = loadReference(WORKSPACE_DIR, slug);
  if (!meta) {
    res.status(404).json({ error: `Référence "${slug}" introuvable` });
    return;
  }
  if (!req.file) {
    res.status(400).json({ error: "Fichier image requis (champ: file)" });
    return;
  }
  // Sanitize the original filename: strip path separators and dangerous chars
  const safeName = path.basename(req.file.originalname).replace(/[^a-zA-Z0-9._-]/g, "_");
  const refDir = path.join(WORKSPACE_DIR, ".references", slug);
  fs.mkdirSync(refDir, { recursive: true });
  const imgPath = path.join(refDir, safeName);
  fs.writeFileSync(imgPath, req.file.buffer);
  const updatedMeta: ReferenceMeta = { ...meta, image: safeName, kind: meta.kind === "palette" ? "image" : meta.kind, updatedAt: new Date().toISOString() };
  saveReference(WORKSPACE_DIR, updatedMeta);
  res.json(updatedMeta);
});

// Delete a reference
app.delete("/api/references/:slug", (req, res) => {
  try {
    deleteReference(WORKSPACE_DIR, req.params.slug);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// ── Idée #44 — Conseil d'experts (rattrapage projet dévié, lecture seule) ────

// Convoque le conseil : N lentilles diagnostiquent en lecture seule → plan de
// reprise priorisé sauvegardé en .recovery-plan.md. N'écrit jamais de code.
app.post("/api/council/:name", async (req, res) => {
  const name = req.params.name;
  const { problem } = req.body as { problem?: string };
  if (!projectExists(name)) {
    res.status(404).json({ error: `Projet "${name}" introuvable` });
    return;
  }
  try {
    const result = await runCouncil(name, typeof problem === "string" ? problem : "");
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Plan de reprise courant (s'il existe)
app.get("/api/council/:name", (req, res) => {
  const name = req.params.name;
  const dir = projectExists(name) ? projectDir(name) : null;
  res.json({ plan: dir ? loadRecoveryPlan(dir) : "" });
});

// Efface le plan de reprise (rattrapage terminé)
app.delete("/api/council/:name", (req, res) => {
  const name = req.params.name;
  if (projectExists(name)) clearRecoveryPlan(projectDir(name));
  res.json({ ok: true });
});

// ── Skills API ───────────────────────────────────────────────────────────────

// List all skills
app.get("/api/skills", (_req, res) => {
  res.json({ skills: listSkills().map(({ name, description }) => ({ name, description })) });
});

// Create a new skill
app.post("/api/skills", (req, res) => {
  const { name, description, content } = req.body as { name?: string; description?: string; content?: string };
  if (!name?.trim() || !content?.trim()) {
    res.status(400).json({ error: "name et content sont requis" });
    return;
  }
  const slug = name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const dir = path.join(SKILLS_DIR, slug);
  const file = path.join(dir, "SKILL.md");
  try {
    fs.mkdirSync(dir, { recursive: true });
    const frontmatter = `---\nname: ${name.trim()}\ndescription: ${(description ?? "").trim()}\n---\n\n${content.trim()}\n`;
    fs.writeFileSync(file, frontmatter, "utf8");
    res.json({ ok: true, slug });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Delete a skill
app.delete("/api/skills/:name", (req, res) => {
  const slug = req.params.name;
  const dir = path.join(SKILLS_DIR, slug);
  try {
    fs.rmSync(dir, { recursive: true, force: true });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Idée #42 — couches d'identité : lecture / écriture d'une couche
// (layer ∈ language | thinking | vision). Fichiers cross-projet à la racine du
// workspace. .vision.md est éditable ici (signal explicite de l'utilisateur),
// mais la revue en arrière-plan n'y touche jamais.
app.get("/api/identity/:layer", (req, res) => {
  const layer = req.params.layer as IdentityLayer;
  const store = IDENTITY_LAYERS[layer];
  if (!store) {
    res.status(400).json({ error: "layer invalide (language | thinking | vision)" });
    return;
  }
  res.json({ content: store.load(WORKSPACE_DIR) });
});

app.put("/api/identity/:layer", (req, res) => {
  const layer = req.params.layer as IdentityLayer;
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
app.put("/api/architecture/:name", (req, res) => {
  const name = req.params.name;
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
app.get("/api/lexique/:name", (req, res) => {
  const name = req.params.name;
  const dir = projectExists(name) ? projectDir(name) : null;
  res.json({ content: dir ? loadLexique(dir) : "" });
});

app.put("/api/lexique/:name", (req, res) => {
  const name = req.params.name;
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
app.get("/api/miroir/:name", (req, res) => {
  const name = req.params.name;
  const dir = projectExists(name) ? projectDir(name) : null;
  res.json({ content: dir ? loadMiroir(dir) : "" });
});

app.put("/api/miroir/:name", (req, res) => {
  const name = req.params.name;
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
app.get("/api/design-system", (_req, res) => {
  res.json({ content: loadDesignSystem(WORKSPACE_DIR) });
});

app.put("/api/design-system", (req, res) => {
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

app.get("/api/preferences", (_req, res) => {
  res.json({ content: loadPreferences(WORKSPACE_DIR) });
});

app.put("/api/preferences", (req, res) => {
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

app.post("/api/preferences/learn", async (_req, res) => {
  try {
    await learnPreferences(WORKSPACE_DIR);
    res.json({ ok: true, content: loadPreferences(WORKSPACE_DIR) });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// ── Chantier #35 — Backend généré (Express alongside React/Vite) ────────────

// Status: is the api/ server scaffolded and/or running for this project?
app.get("/api/backend-server/:name/status", (req, res) => {
  const dir = projectDir(req.params.name);
  const status = backendServerStatus();
  res.json({
    scaffolded: hasBackend(dir),
    running: status.running && status.projectDir === dir,
    url: status.projectDir === dir ? status.url : null,
    port: status.projectDir === dir ? status.port : null,
  });
});

// Scaffold: copy the Express template into api/ (idempotent).
app.post("/api/backend-server/:name/scaffold", (req, res) => {
  try {
    const dir = projectDir(req.params.name);
    scaffoldBackend(dir);
    res.json({ ok: true, message: "Backend scaffolded in api/. Run npm install then start." });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Start: install deps (if needed) then launch the Express dev server.
app.post("/api/backend-server/:name/start", async (req, res) => {
  try {
    const dir = projectDir(req.params.name);
    if (!hasBackend(dir)) {
      res.status(400).json({ error: "No api/ folder found. Scaffold the backend first." });
      return;
    }
    installBackendDeps(dir); // sync npm install if node_modules absent
    const { url, port } = await startBackendServer(dir);
    res.json({ ok: true, url, port });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Stop: kill the Express dev server.
app.post("/api/backend-server/:name/stop", async (_req, res) => {
  try {
    await stopBackendServer();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Persisted chat history of a project (empty for unknown/new projects)
app.get("/api/history/:name", (req, res) => {
  const name = req.params.name;
  if (!projectExists(name)) {
    res.json({ messages: [] });
    return;
  }
  res.json({ messages: loadHistory(projectDir(name)) });
});

// List all project files (relative paths, sorted, excluding heavy/useless dirs)
app.get("/api/files/:name", (req, res) => {
  const name = req.params.name as string;
  let dir: string;
  try {
    dir = projectDir(name);
  } catch {
    res.status(400).json({ error: "Nom invalide" });
    return;
  }
  if (!fs.existsSync(dir)) {
    res.json({ files: [] });
    return;
  }

  const IGNORE = new Set(["node_modules", ".git", "dist", ".vite", ".cache", ".assets", ".snapshots"]);
  const files: string[] = [];

  function walk(current: string, rel: string) {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (IGNORE.has(e.name) || e.name.startsWith(".")) continue;
      const relPath = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) {
        walk(path.join(current, e.name), relPath);
      } else {
        files.push(relPath);
      }
    }
  }

  walk(dir, "");
  files.sort();
  res.json({ files });
});

// Download a generated project as a zip (sources only, no node_modules)
app.get("/api/export/:name", (req, res) => {
  const name = req.params.name;
  if (!projectExists(name)) {
    res.status(404).json({ error: `Project "${name}" not found` });
    return;
  }
  const dir = projectDir(name);
  const filename = `${path.basename(dir)}.zip`;
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  const archive = new ZipArchive({ zlib: { level: 9 } });
  archive.on("error", (err: Error) => {
    console.error("[export]", err.message);
    res.destroy(err);
  });
  archive.pipe(res);
  archive.glob("**/*", {
    cwd: dir,
    dot: true,
    ignore: [
      "node_modules/**",
      "dist/**",
      ".git/**",
      ".env",
      ".env.local",
      ".chat-history.json",
      ".memory.md",
      `${ASSETS_DIR_NAME}/**`,
      `${SNAPSHOTS_DIR_NAME}/**`,
    ],
  });
  archive.finalize();
});

// Version history of a project (one commit per agent iteration, newest first)
app.get("/api/versions/:name", async (req, res) => {
  const name = req.params.name;
  if (!projectExists(name)) {
    res.status(404).json({ error: `Project "${name}" not found` });
    return;
  }
  try {
    res.json({ versions: await listVersions(projectDir(name)) });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Body: { projectName: string, hash: string } — hard reset to that version
app.post("/api/rollback", async (req, res) => {
  const { projectName, hash } = req.body as { projectName?: string; hash?: string };
  if (!projectName?.trim() || !hash?.trim()) {
    res.status(400).json({ error: "projectName and hash are required" });
    return;
  }
  if (agentBusy) {
    res.status(409).json({ error: "Agent is working — stop it before rolling back" });
    return;
  }
  if (!projectExists(projectName)) {
    res.status(404).json({ error: `Project "${projectName}" not found` });
    return;
  }
  try {
    const dir = projectDir(projectName);
    await rollbackTo(dir, hash);
    res.json({ ok: true, versions: await listVersions(dir) });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Interrupt the agent currently working (if any)
app.post("/api/feedback", async (req, res) => {
  const { projectName, rating, text } = req.body as { projectName?: string; rating?: string; text?: string };
  if (!projectName || !text || (rating !== "like" && rating !== "dislike")) {
    res.status(400).json({ error: "projectName, text et rating (like|dislike) requis" });
    return;
  }
  const escalate = checkAndUpdateStreak(projectName, rating as FeedbackRating);
  res.json({ ok: true, escalate });
  // Traitement en arrière-plan — ne bloque pas l'UI
  processFeedback(WORKSPACE_DIR, rating as FeedbackRating, text, projectName).catch((err) =>
    console.error("[feedback]", err instanceof Error ? err.message : err)
  );
});

// Idée #43 — Escalade par signal humain : l'utilisateur fournit une référence
// visuelle après 2 👎 consécutifs → axiome [validé-utilisateur] sur son goût.
app.post("/api/escalation-reference", async (req, res) => {
  const { projectName, referenceText } = req.body as { projectName?: string; referenceText?: string };
  if (!projectName?.trim() || !referenceText?.trim()) {
    res.status(400).json({ error: "projectName et referenceText requis" });
    return;
  }
  res.json({ ok: true });
  resetStreak(projectName);
  processEscalationReference(WORKSPACE_DIR, projectName, referenceText).catch((err) =>
    console.error("[escalation]", err instanceof Error ? err.message : err)
  );
});

const audioUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });
app.post("/api/transcribe", audioUpload.single("audio"), async (req, res) => {
  if (!req.file) { res.status(400).json({ error: "Aucun fichier audio reçu" }); return; }
  try {
    const text = await transcribeAudio(req.file.buffer, req.file.mimetype);
    res.json({ text });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.post("/api/stop", async (_req, res) => {
  const stopped = await interruptAgent();
  // Guaranteed escape hatch: free the slot even if a wedged turn's finally never
  // runs, so a hang can't keep the UI (and preview switching, which 409s while
  // "busy") frozen. Idempotent with the chat handler's own finally.
  agentBusy = false;
  res.json({ stopped });
});

registerPromptLabRoutes(app);
registerTokenizerRoutes(app);
registerIdeationRoutes(app);
registerVeilleRoutes(app);
registerModelRouterRoutes(app);
registerDocGeneratorRoutes(app);
registerVersionGraphRoutes(app);
registerQARoutes(app);
registerStripeRoutes(app);
registerCronRoutes(app);
registerMetricsDashboardRoutes(app);
registerNotesRAGRoutes(app);
registerAutoAblationRoutes(app);
registerMultiProjectRoutes(app);
registerDesignReviewRoutes(app);
registerSuperAgentRoutes(app);
registerTutorialRoutes(app);

app.listen(PORT, () => {
  console.log(`MangoAI backend → http://localhost:${PORT}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("⚠️  ANTHROPIC_API_KEY missing — copy .env.example to .env before chatting.");
  }
});
