// ============================================================
// MANGO AGENT — généré par MangoOS Agent Factory (#103)
//
// Standalone : node agent.js
// Géré       : MangoOS démarre / arrête / surveille ce process
//
// Sections [MANGO:CORE]   → invariantes, ne pas modifier
// Sections [MANGO:CUSTOM] → personnalisées par Claude lors de la génération
// ============================================================

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import https from "node:https";
import http from "node:http";

// ── [MANGO:CORE] Bootstrap ────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_FILE = path.join(__dirname, "config.json");
const STATE_FILE  = path.join(__dirname, "state.json");
const LOG_DIR     = path.join(__dirname, "logs");

const config = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
const AGENT_ID       = config.id;
const CATEGORY       = config.category;
const INTERVAL_MS    = config.intervalMs ?? 60_000;
const MANGO_BASE_URL = process.env.MANGO_BASE_URL ?? "http://localhost:3000";

// ── [MANGO:CORE] Logging ──────────────────────────────────────

const today = () => new Date().toISOString().slice(0, 10);
let _currentDay  = today();
let _logStream   = openLogStream();

function openLogStream() {
  fs.mkdirSync(LOG_DIR, { recursive: true });
  return fs.createWriteStream(path.join(LOG_DIR, `${today()}.log`), { flags: "a" });
}

function log(level, message) {
  const entry = JSON.stringify({ ts: new Date().toISOString(), level, message });
  const d = today();
  if (d !== _currentDay) {
    _logStream.end();
    _currentDay = d;
    _logStream  = openLogStream();
  }
  _logStream.write(entry + "\n");
  process.stdout.write(entry + "\n"); // capturé par MangoOS
}

// ── [MANGO:CORE] State ────────────────────────────────────────

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
  } catch {
    return { id: AGENT_ID, status: "idle", taskCount: 0, errorCount: 0 };
  }
}

function saveState(patch) {
  const current = loadState();
  const next    = { ...current, ...patch, id: AGENT_ID };
  const tmp     = STATE_FILE + ".tmp";
  const data    = JSON.stringify(next, null, 2);
  fs.writeFileSync(tmp, data);
  try { fs.renameSync(tmp, STATE_FILE); }
  catch { fs.writeFileSync(STATE_FILE, data); fs.rmSync(tmp, { force: true }); }
}

// ── [MANGO:CORE] HTTP helper ──────────────────────────────────

function mangoRequest(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const url     = new URL(MANGO_BASE_URL + urlPath);
    const mod     = url.protocol === "https:" ? https : http;
    const payload = body ? JSON.stringify(body) : undefined;
    const req     = mod.request(
      {
        hostname: url.hostname,
        port:     url.port || (url.protocol === "https:" ? 443 : 80),
        path:     url.pathname + url.search,
        method,
        headers: {
          "Content-Type": "application/json",
          ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => { data += chunk; });
        res.on("end", () => {
          try { resolve(JSON.parse(data)); } catch { resolve({ raw: data }); }
        });
      },
    );
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// Appel LLM via MangoOS — abonnement Claude Code, $0 extra, JAMAIS new Anthropic().
async function askMango(system, user, maxTokens = 800) {
  try {
    const res = await mangoRequest("POST", "/api/agents/llm", {
      agentId: AGENT_ID, system, user, maxTokens,
    });
    return res.text ?? "";
  } catch (err) {
    log("warn", `LLM indisponible (mode dégradé) : ${err.message}`);
    return "";
  }
}

// ── [MANGO:CORE] Bus de messages ──────────────────────────────

async function checkInbox() {
  try {
    const res = await mangoRequest("GET", `/api/agents/${AGENT_ID}/inbox`);
    return res.messages ?? [];
  } catch {
    return [];
  }
}

async function sendToAgent(toAgentId, type, payload) {
  try {
    return mangoRequest("POST", "/api/agents/messages", {
      from: AGENT_ID, to: toAgentId, type, payload, ttlMs: 3_600_000,
    });
  } catch {
    return null;
  }
}

// ── [MANGO:CORE] Heartbeat ─────────────────────────────────────

function startHeartbeat() {
  const tick = () => saveState({ lastHeartbeat: new Date().toISOString(), status: "running" });
  tick();
  return setInterval(tick, 30_000);
}

// ── [MANGO:CUSTOM] System prompt ──────────────────────────────
// Claude remplace cette fonction lors de la génération pour décrire
// précisément le rôle et la mission de cet agent.

function getSystemPrompt() {
  return `Tu es un agent MangoOS de catégorie "${CATEGORY}" nommé "${config.name}".
${config.description}
Réponds de façon concise et structurée. Renvoie uniquement le résultat de ta tâche.`;
}

// ── [MANGO:CUSTOM] Logique métier principale ──────────────────
// Claude remplace cette fonction avec la logique propre à l'agent.
// context = { messages (inbox), input (payload du dernier message 'task'), config }

async function runTask(context) {
  const result = await askMango(
    getSystemPrompt(),
    `Effectue ta tâche. Contexte : ${JSON.stringify({ category: CATEGORY, input: context.input ?? null })}`,
  );
  return result;
}

// ── [MANGO:CUSTOM] Condition d'arrêt ──────────────────────────
// collecteur  → false (tourne indéfiniment)
// processeur  → true après un run
// acteur      → false (écoute en permanence)
// coordinateur→ false (écoute en permanence)

function shouldStop(state, _lastResult) {
  if (CATEGORY === "processeur") return state.taskCount >= 1;
  return false;
}

// ── [MANGO:CORE] Boucle principale ────────────────────────────

async function main() {
  log("info", `Agent ${AGENT_ID} démarré (catégorie: ${CATEGORY}, interval: ${INTERVAL_MS}ms)`);
  saveState({ status: "running", startedAt: new Date().toISOString(), taskCount: 0, errorCount: 0 });

  const heartbeatTimer = startHeartbeat();
  let stopping = false;

  const shutdown = async (reason = "signal") => {
    if (stopping) return;
    stopping = true;
    clearInterval(heartbeatTimer);
    log("info", `Agent ${AGENT_ID} arrêté (${reason})`);
    saveState({ status: "stopped", stoppedAt: new Date().toISOString() });
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT",  () => shutdown("SIGINT"));

  const tick = async () => {
    if (stopping) return;
    try {
      const messages = await checkInbox();

      // Abort prioritaire
      if (messages.some((m) => m.type === "abort")) {
        log("info", "Message abort reçu");
        await shutdown("abort");
        return;
      }

      const taskMsg = messages.find((m) => m.type === "task");
      const input   = taskMsg?.payload ?? null;
      const state   = loadState();
      const result  = await runTask({ messages, input, config });

      const newCount = (state.taskCount ?? 0) + 1;
      saveState({
        lastTaskResult:  String(result ?? "").slice(0, 500),
        taskCount:       newCount,
        errorCount:      0,
        lastHeartbeat:   new Date().toISOString(),
        status:          "running",
      });
      log("info", `Task #${newCount} terminée`);

      // Répondre si un ping attendait une réponse
      const pingMsg = messages.find((m) => m.type === "ping" && m.payload?.replyTo);
      if (pingMsg) {
        await sendToAgent(pingMsg.payload.replyTo, "result", {
          result,
          stepId: pingMsg.payload.stepId ?? null,
        });
      }

      if (shouldStop(loadState(), result)) {
        log("info", "Condition d'arrêt atteinte");
        saveState({ status: "completed" });
        await shutdown("completed");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log("error", `Erreur dans runTask : ${msg}`);
      const state      = loadState();
      const errorCount = (state.errorCount ?? 0) + 1;
      saveState({ errorCount, status: errorCount >= 5 ? "error" : "running" });
      if (errorCount >= 5) {
        log("error", "5 erreurs consécutives — arrêt automatique");
        await shutdown("circuit-breaker");
      }
    }
  };

  // Tick immédiat puis intervalles
  if (INTERVAL_MS <= 0) {
    await tick(); // processeur one-shot
  } else {
    await tick();
    if (!stopping) {
      const interval = setInterval(async () => {
        if (stopping) { clearInterval(interval); return; }
        await tick();
      }, INTERVAL_MS);
    }
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
