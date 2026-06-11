// Mini-Lovable backend: chat endpoint (SSE) + project/preview management.
import "dotenv/config";
import express from "express";
import cors from "cors";
import { ALLOWED_MODELS, interruptAgent, runAgent, type ModelChoice } from "./agent.js";
import { createProject, listProjects, projectDir, projectExists } from "./projects.js";
import { previewStatus, startPreview } from "./preview.js";
import { getSession, saveSession } from "./sessions.js";

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

    send({ type: "status", text: "Démarrage de l'aperçu…" });
    const { url } = await startPreview(dir);
    send({ type: "preview", url });

    // Resume the project's previous conversation if the client didn't pass one
    const effectiveSession = sessionId ?? getSession(projectName);
    send({ type: "status", text: "L'agent travaille…" });
    for await (const event of runAgent(prompt, dir, effectiveSession, chosenModel)) {
      if (event.type === "result" && event.sessionId) {
        saveSession(projectName, event.sessionId);
      }
      send(event);
    }
  } catch (err) {
    send({ type: "error", message: err instanceof Error ? err.message : String(err) });
  } finally {
    agentBusy = false;
    send({ type: "done" });
    res.end();
  }
});

// Interrupt the agent currently working (if any)
app.post("/api/stop", async (_req, res) => {
  const stopped = await interruptAgent();
  res.json({ stopped });
});

app.listen(PORT, () => {
  console.log(`Mini-Lovable backend → http://localhost:${PORT}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("⚠️  ANTHROPIC_API_KEY missing — copy .env.example to .env before chatting.");
  }
});
