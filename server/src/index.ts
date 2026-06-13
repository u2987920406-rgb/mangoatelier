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
import { listSkills } from "./skills.js";
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
  const { prompt, projectName, sessionId, model, mode, template, editTarget } = req.body as {
    prompt?: string;
    projectName?: string;
    sessionId?: string;
    model?: string;
    mode?: string;
    template?: string;
    editTarget?: EditTarget; // #6 : cible d'une édition visuelle (clic→source)
  };
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
  agentBusy = true;
  // A background compaction may be rewriting this project's session — stop it
  // and wait so the turn resumes a stable session id (old or new, both valid).
  await interruptCompaction();

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
      for await (const event of runAgent(agentPrompt, dir, session, chosenModel, chosenMode)) {
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

// What the agent has learned: project memory, user profile, skill library
app.get("/api/knowledge/:name", (req, res) => {
  const name = req.params.name;
  res.json({
    memory: projectExists(name) ? loadMemory(projectDir(name)) : "",
    profile: loadUserProfile(WORKSPACE_DIR),
    skills: listSkills().map(({ name: skill, description }) => ({ name: skill, description })),
    axioms: loadAxioms(WORKSPACE_DIR),
  });
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
app.post("/api/stop", async (_req, res) => {
  const stopped = await interruptAgent();
  res.json({ stopped });
});

app.listen(PORT, () => {
  console.log(`MangoAI backend → http://localhost:${PORT}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("⚠️  ANTHROPIC_API_KEY missing — copy .env.example to .env before chatting.");
  }
});
