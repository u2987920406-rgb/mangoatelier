// MangoAI backend: chat endpoint (SSE) + project/preview management.
import "dotenv/config";
import express from "express";
import cors from "cors";
import { ZipArchive } from "archiver";
import path from "node:path";
import { ALLOWED_MODELS, interruptAgent, runAgent, type ModelChoice } from "./agent.js";
import { createProject, listProjects, projectDir, projectExists } from "./projects.js";
import { previewStatus, startPreview } from "./preview.js";
import { clearSession, getSession, saveSession } from "./sessions.js";
import { commitVersion, ensureRepo, listVersions, rollbackTo } from "./versions.js";

const PORT = Number(process.env.PORT ?? 3000);
const app = express();
app.use(cors());
app.use(express.json());

let agentBusy = false;

app.get("/api/projects", (_req, res) => {
  res.json({ projects: listProjects(), preview: previewStatus() });
});

// Body: { prompt: string, projectName: string, sessionId?: string }
// Streams AgentEvent objects as SSE. Creates the project on first message.
app.post("/api/chat", async (req, res) => {
  const { prompt, projectName, sessionId, model } = req.body as {
    prompt?: string;
    projectName?: string;
    sessionId?: string;
    model?: string;
  };
  const chosenModel = ALLOWED_MODELS.includes(model as ModelChoice)
    ? (model as ModelChoice)
    : undefined;
  if (!prompt?.trim() || !projectName?.trim()) {
    res.status(400).json({ error: "prompt and projectName are required" });
    return;
  }
  if (agentBusy) {
    res.status(409).json({ error: "Agent is already working, wait for it to finish" });
    return;
  }
  agentBusy = true;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
  const send = (event: unknown) => res.write(`data: ${JSON.stringify(event)}\n\n`);

  try {
    let dir: string;
    if (!projectExists(projectName)) {
      send({ type: "status", text: "Création du projet (template + npm install)…" });
      dir = await createProject(projectName);
    } else {
      dir = projectDir(projectName);
    }
    // Snapshot the pre-agent state so the first rollback point always exists
    await ensureRepo(dir);

    send({ type: "status", text: "Démarrage de l'aperçu…" });
    const { url } = await startPreview(dir);
    send({ type: "preview", url });

    // Runs one agent turn. Returns "session-not-found" when resuming a session
    // the SDK no longer knows (e.g. the project folder was moved/renamed) so
    // the caller can retry with a fresh conversation. The failed "result"
    // event is held back until we know it isn't that case.
    const streamAgentTurn = async (session?: string): Promise<"ok" | "session-not-found"> => {
      let pendingFailure: unknown = null;
      for await (const event of runAgent(prompt, dir, session, chosenModel)) {
        if (session && event.type === "error" && /No conversation found/i.test(event.message)) {
          return "session-not-found";
        }
        if (session && event.type === "result" && !event.ok) {
          pendingFailure = event;
          continue;
        }
        if (event.type === "result" && event.sessionId) {
          saveSession(projectName, event.sessionId);
        }
        send(event);
      }
      if (pendingFailure) send(pendingFailure);
      return "ok";
    };

    // Resume the project's previous conversation if the client didn't pass one
    const effectiveSession = sessionId ?? getSession(projectName);
    send({ type: "status", text: "L'agent travaille…" });
    const outcome = await streamAgentTurn(effectiveSession);
    if (outcome === "session-not-found") {
      clearSession(projectName);
      send({ type: "status", text: "Ancienne conversation introuvable — nouvelle conversation démarrée." });
      await streamAgentTurn(undefined);
    }

    const version = await commitVersion(dir, prompt.replace(/\s+/g, " ").slice(0, 72));
    if (version) send({ type: "version", ...version });
  } catch (err) {
    send({ type: "error", message: err instanceof Error ? err.message : String(err) });
  } finally {
    agentBusy = false;
    send({ type: "done" });
    res.end();
  }
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
    ignore: ["node_modules/**", "dist/**", ".git/**"],
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
