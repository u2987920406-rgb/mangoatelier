// Wraps the Claude Agent SDK: runs one chat turn against a generated project
// and yields simplified events the frontend can render.
import { query } from "@anthropic-ai/claude-agent-sdk";
import { assembleSystemPrompt } from "./scenario.js";
import { visionServer } from "./vision.js";
import { figmaServer } from "./figma.js";

const DEFAULT_MODEL = process.env.MODEL ?? "sonnet";
export const ALLOWED_MODELS = ["sonnet", "opus", "haiku"] as const;
export type ModelChoice = (typeof ALLOWED_MODELS)[number];

// Second axis, orthogonal to the model (which brain): the effort mode (which
// rigour). MVP = fast and cheap (no analytic ritual, no extended thinking,
// minimal visual loop); Élite = the full arsenal. This is the switch every
// future advanced feature (Mango Plan, moodboard, temporal QA…) plugs into.
export const ALLOWED_MODES = ["mvp", "elite"] as const;
export type Mode = (typeof ALLOWED_MODES)[number];
const DEFAULT_MODE: Mode = "elite";

export type AgentEvent =
  | { type: "text"; text: string }
  | { type: "thinking"; text: string }
  | { type: "tool"; name: string; detail: string }
  | {
      type: "result";
      sessionId: string;
      costUsd: number;
      numTurns: number;
      ok: boolean;
      error?: string;
      // Size of the conversation context (prompt tokens of the turn's last
      // API call) and the model's window — drives the proactive compaction.
      contextTokens?: number;
      contextWindow?: number;
    }
  | { type: "error"; message: string };

// Hermes-style parallel workstreams: an isolated builder subagent that owns
// one well-scoped slice of the app. Tools restricted to file work — no Bash,
// so parallel builders can't fight over npm or the dev server.
const BUILDER_PROMPT = `You are a builder subagent inside a local "Lovable-like" app builder, implementing ONE well-scoped part of an existing React + Vite project while sibling subagents may be working on other parts in parallel.
Rules:
- Implement ONLY the part described in your task; never touch files outside your scope (shared files like index.css are listed in the task when you may edit them).
- Keep the app compiling at every step. Follow the styling approach stated in the task (plain CSS or Tailwind v4 — the template has Tailwind preinstalled).
- Never remove or modify the <script data-mangoai="error-relay"> block in index.html.
- When done, return a short summary: files created/edited and what the parent must wire up (imports, routes, CSS hooks).`;

const AGENTS = {
  builder: {
    description:
      "Implements one well-scoped, independent part of the app (a section, component or page) in parallel with other builders. Give it a precise task: what to build, which files it owns, and any shared conventions (colors, fonts) it must follow.",
    prompt: BUILDER_PROMPT,
    tools: ["Read", "Write", "Edit", "Glob", "Grep"],
  },
};

// Handle to the in-flight query so the HTTP layer can interrupt it.
let currentQuery: ReturnType<typeof query> | null = null;

export async function interruptAgent(): Promise<boolean> {
  if (!currentQuery) return false;
  try {
    await currentQuery.interrupt();
    return true;
  } catch (err) {
    console.warn("[agent] interrupt failed:", err instanceof Error ? err.message : err);
    return false;
  }
}

export async function* runAgent(
  prompt: string,
  projectDir: string,
  sessionId?: string,
  model?: ModelChoice,
  mode?: Mode,
): AsyncGenerator<AgentEvent> {
  const effectiveModel = model ?? DEFAULT_MODEL;
  const effectiveMode = mode ?? DEFAULT_MODE;
  // Élite + a thinking-capable model = the analytic ritual and native extended
  // thinking (adaptive = the model decides when/how much to think). MVP stays
  // lean: no ritual, no thinking — faster and cheaper, protects the quota.
  // Thinking option rides on the analytic ritual: Élite + a thinking-capable
  // model. (The matching ANALYTIC_RULES block is in the Élite scenario and
  // self-gates on the model — the two stay in sync.)
  const analytic = effectiveMode === "elite" && effectiveModel !== "haiku";
  // Mango Plan + moodboard (ideas 9/11) are Élite-only — and the moodboard
  // needs the web. MVP stays lean (no plan, no web research) for speed/quota.
  const webTools = effectiveMode === "elite" ? ["WebSearch", "WebFetch"] : [];
  try {
    const q = query({
      prompt,
      options: {
        cwd: projectDir,
        model: effectiveModel,
        maxTurns: 40,
        permissionMode: "acceptEdits",
        allowedTools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep", "Agent", "mcp__vision__snapshot", "mcp__vision__clone_url", "mcp__figma__import", ...webTools],
        agents: AGENTS,
        mcpServers: { vision: visionServer, figma: figmaServer },
        ...(analytic ? { thinking: { type: "adaptive", display: "summarized" } as const } : {}),
        // Memory is appended per turn as a frozen snapshot (Hermes pattern):
        // mid-turn writes to .memory.md land on disk and are picked up at the
        // start of the NEXT turn, keeping this turn's prompt stable.
        systemPrompt: {
          type: "preset",
          preset: "claude_code",
          // Coque Souple: the append is assembled from named blocks following
          // the scenario (= effort mode). Behavior-constant vs the old inline
          // concatenation (verified byte-for-byte).
          append: assembleSystemPrompt({ mode: effectiveMode, model: effectiveModel, projectDir }),
        },
        ...(sessionId ? { resume: sessionId } : {}),
      },
    });
    currentQuery = q;
    // Usage of the most recent MAIN-loop API call (subagent calls excluded):
    // input + cache tokens = how full the conversation context currently is.
    let lastUsage: {
      input_tokens?: number;
      cache_read_input_tokens?: number | null;
      cache_creation_input_tokens?: number | null;
    } | null = null;
    for await (const message of q) {
      if (message.type === "assistant") {
        if (!message.parent_tool_use_id && message.message.usage) {
          lastUsage = message.message.usage;
        }
        for (const block of message.message.content) {
          if (block.type === "text" && block.text.trim()) {
            yield { type: "text", text: block.text };
          } else if (block.type === "thinking" && block.thinking?.trim()) {
            yield { type: "thinking", text: block.thinking };
          } else if (block.type === "tool_use") {
            // MCP names are noisy ("mcp__vision__snapshot") — show a clean label.
            const name =
              block.name === "mcp__vision__snapshot"
                ? "Snapshot"
                : block.name === "mcp__vision__clone_url"
                  ? "Clone web"
                  : block.name === "mcp__figma__import"
                    ? "Figma"
                    : block.name;
            yield { type: "tool", name, detail: summarizeToolInput(name, block.input) };
          }
        }
      } else if (message.type === "result") {
        const contextTokens = lastUsage
          ? (lastUsage.input_tokens ?? 0) +
            (lastUsage.cache_read_input_tokens ?? 0) +
            (lastUsage.cache_creation_input_tokens ?? 0)
          : undefined;
        const contextWindow =
          Object.values(message.modelUsage ?? {})
            .map((u) => u.contextWindow ?? 0)
            .reduce((a, b) => Math.max(a, b), 0) || undefined;
        yield {
          type: "result",
          sessionId: message.session_id,
          costUsd: message.total_cost_usd ?? 0,
          numTurns: message.num_turns ?? 0,
          ok: message.subtype === "success",
          error: message.subtype === "success" ? undefined : message.subtype,
          contextTokens,
          contextWindow,
        };
      }
    }
  } catch (err) {
    yield { type: "error", message: err instanceof Error ? err.message : String(err) };
  } finally {
    currentQuery = null;
  }
}

function summarizeToolInput(name: string, input: unknown): string {
  const i = input as Record<string, unknown>;
  switch (name) {
    case "Read":
    case "Write":
    case "Edit":
      return String(i?.file_path ?? "");
    case "Bash":
      return String(i?.command ?? "").slice(0, 120);
    case "Glob":
    case "Grep":
      return String(i?.pattern ?? "");
    case "Agent":
    case "Task":
      return String(i?.description ?? i?.prompt ?? "").slice(0, 120);
    case "Figma":
    case "Clone web":
      return String(i?.url ?? "").slice(0, 100);
    case "Snapshot": {
      const scale = i?.scale && Number(i.scale) > 1 ? ` ×${i.scale}` : "";
      if (i?.selector) return `${String(i.selector).slice(0, 80)}${scale}`;
      if (i?.box) {
        const b = i.box as Record<string, number>;
        return `zone ${b.width}×${b.height}${scale}`;
      }
      return i?.fullPage ? "page entière" : "aperçu";
    }
    default:
      return "";
  }
}
