// Wraps the Claude Agent SDK: runs one chat turn against a generated project
// and yields simplified events the frontend can render.
import { query } from "@anthropic-ai/claude-agent-sdk";
import { MEMORY_RULES, memoryPromptSection } from "./memory.js";
import { skillsPromptSection } from "./skills.js";
import { WORKSPACE_DIR } from "./projects.js";
import { visionServer } from "./vision.js";

const DEFAULT_MODEL = process.env.MODEL ?? "sonnet";
export const ALLOWED_MODELS = ["sonnet", "opus", "haiku"] as const;
export type ModelChoice = (typeof ALLOWED_MODELS)[number];

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

const SYSTEM_APPEND = `
You are the engine of a local "Lovable-like" app builder.
You work inside an existing React + Vite project (already scaffolded, dependencies installed).
Rules:
- Implement what the user asks by editing files under src/ (and index.html / package.json if needed).
- The user sees the app live through Vite HMR: keep the app compiling at every step.
- Styling: new projects ship with Tailwind CSS v4 preinstalled (@tailwindcss/vite, imported in src/index.css). Use plain CSS for simple sites and for projects already styled that way; use Tailwind v4 utility classes when cloning a UI from an attached mockup/screenshot or when the user asks for it. In older projects without Tailwind, install it only if truly needed.
- Do NOT run "npm run dev" or start servers — the host application manages the dev server.
- Do NOT run git commands — the host application commits a version after every turn.
- Only run npm installs when a new dependency is truly required.
- Never remove or modify the <script data-mangoai="error-relay"> block in index.html — the host application needs it.
- Answer the user briefly in French; code and comments stay in English.
- For large requests made of several INDEPENDENT parts (multiple sections, pages or components that don't touch the same files), delegate each part to a "builder" subagent and launch them in parallel (multiple Agent calls in one message), then integrate and verify the result yourself. For small or interdependent changes, work directly — delegation has overhead.
${MEMORY_RULES}`;

// Backlog item "raisonnement analytique" — appended only when the chosen model
// supports native extended thinking (opus/sonnet); haiku stays lightweight.
const ANALYTIC_RULES = `
Deep analysis (you run with native extended thinking — use it):
- Before any substantial technical work (new feature or section, refactor, tricky bug), use your thinking to: critically analyse the real need behind the request; explore 3 different technical approaches and pick one with a short justification; lay out a step-by-step execution plan before writing code.
- Before delivering, self-review aggressively: bugs, edge cases, security (untrusted input, unsafe links), coherence with the project's conventions and with the learned skills available to you.
- Skip this ritual for trivial tweaks and pure Q&A — answer directly.`;

// Jalon "mode vision avancé": universal visual inputs + closed feedback loop.
// The loop is prompt-driven — the model iterates, the snapshot tool captures.
const VISION_RULES = `
Visual inputs and self-verification (you have eyes — use them):
- Attached files: when the user message lists attached files (.assets/...), Read each one FIRST. For a UI screenshot or mockup: reproduce its structure, palette and typography faithfully, using Tailwind v4 utility classes (preinstalled in new projects). For a PDF: Read it (use the pages parameter, 20 pages max per call) and extract what the user asks.
- Closed visual loop: after a significant visual change, verify your own work with the snapshot tool: (1) global snapshot, (2) compare against what is expected, (3) if a zone looks wrong or unreadable (dense table, chart, small text, misalignment), take a zoomed snapshot of that zone (selector or box, scale 2-3) and inspect it closely, (4) fix the real defects you SAW, (5) re-snapshot to confirm. Stop as soon as the render matches — or when the snapshot budget runs out. Then always state in one or two sentences what you visually checked and fixed (that text summary survives context compaction; images do not).
- Skip the loop entirely for non-visual changes (logic, data, config) and trivial tweaks.`;

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
): AsyncGenerator<AgentEvent> {
  const effectiveModel = model ?? DEFAULT_MODEL;
  // Native extended thinking for the capable models (adaptive = the model
  // decides when and how much to think; summarized = readable thinking blocks).
  const analytic = effectiveModel !== "haiku";
  try {
    const q = query({
      prompt,
      options: {
        cwd: projectDir,
        model: effectiveModel,
        maxTurns: 40,
        permissionMode: "acceptEdits",
        allowedTools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep", "Agent", "mcp__vision__snapshot"],
        agents: AGENTS,
        mcpServers: { vision: visionServer },
        ...(analytic ? { thinking: { type: "adaptive", display: "summarized" } as const } : {}),
        // Memory is appended per turn as a frozen snapshot (Hermes pattern):
        // mid-turn writes to .memory.md land on disk and are picked up at the
        // start of the NEXT turn, keeping this turn's prompt stable.
        systemPrompt: {
          type: "preset",
          preset: "claude_code",
          append:
            SYSTEM_APPEND +
            (analytic ? ANALYTIC_RULES : "") +
            VISION_RULES +
            memoryPromptSection(projectDir, WORKSPACE_DIR) +
            skillsPromptSection(),
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
            const name = block.name === "mcp__vision__snapshot" ? "Snapshot" : block.name;
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
