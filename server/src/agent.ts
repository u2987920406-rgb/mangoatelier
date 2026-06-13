// Wraps the Claude Agent SDK: runs one chat turn against a generated project
// and yields simplified events the frontend can render.
import { query } from "@anthropic-ai/claude-agent-sdk";
import { MEMORY_RULES, memoryPromptSection } from "./memory.js";
import { skillsPromptSection } from "./skills.js";
import { axiomsPromptSection } from "./axioms.js";
import { BLUEPRINTS_RULES } from "./blueprints.js";
import { WORKSPACE_DIR } from "./projects.js";
import { visionServer } from "./vision.js";

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

// Mode posture, prepended so it frames everything else. Two orthogonal axes:
// the model is the brain, the mode is the rigour dial.
const MODE_RULES = {
  mvp: `
Mode ⚡ MVP — speed and simplicity first:
- Go straight to the point. Make the most direct choice that satisfies the request; no over-engineering, no speculative abstractions, no gold-plating.
- Keep visual self-checking minimal (see below). Deliver fast.`,
  elite: `
Mode 💎 Élite — maximum quality:
- Take the time to analyse, verify visually, and polish details. Use the full arsenal below.`,
} as const;

// Jalon "mode vision avancé": universal visual inputs + closed feedback loop.
// The loop is prompt-driven — the model iterates, the snapshot tool captures.
// Two variants: Élite runs the full loop, MVP keeps a single optional control
// snapshot (budget is also lower — see vision.ts).
const VISION_INPUTS = `
Visual inputs (you have eyes — use them):
- Attached files: when the user message lists attached files (.assets/...), Read each one FIRST. For a UI screenshot or mockup: reproduce its structure, palette and typography faithfully, using Tailwind v4 utility classes (preinstalled in new projects). For a PDF: Read it (use the pages parameter, 20 pages max per call) and extract what the user asks. For a targeted zone capture (capture-zone.png — the user snipped a precise spot, often a visual bug, a piece of code or text): do a double analysis — transcribe the text/code exactly (OCR) AND describe what is visually wrong or relevant in context, then act on it.`;

const VISION_RULES_ELITE = `${VISION_INPUTS}
- Closed visual loop: after a significant visual change, verify your own work with the snapshot tool: (1) global snapshot, (2) compare against what is expected, (3) if a zone looks wrong or unreadable (dense table, chart, small text, misalignment), take a zoomed snapshot of that zone (selector or box, scale 2-3) and inspect it closely, (4) fix the real defects you SAW, (5) re-snapshot to confirm. Stop as soon as the render matches — or when the snapshot budget runs out. Then always state in one or two sentences what you visually checked and fixed (that text summary survives context compaction; images do not).
- Skip the loop entirely for non-visual changes (logic, data, config) and trivial tweaks.`;

const VISION_RULES_MVP = `${VISION_INPUTS}
- Visual self-check is minimal in this mode: take at most ONE global snapshot to confirm a major visual change rendered, and only if useful. No zoom iterations, no patch→re-snapshot loop — the snapshot budget is tight on purpose. Skip snapshots entirely for non-visual or trivial changes.`;

// Idea 17 — real backend via Supabase (the main functional gap vs Lovable).
// Kept tight on purpose: a few lines added to every turn's system prompt, the
// agent expands them only when the project actually needs data/auth.
const SUPABASE_RULES = `
Backend, database and auth (Supabase) — when the app needs data persistence, user accounts/login, or a real database:
- Use @supabase/supabase-js. Create a single client in src/lib/supabase.js reading import.meta.env.VITE_SUPABASE_URL and import.meta.env.VITE_SUPABASE_ANON_KEY. NEVER hardcode keys.
- The user supplies the keys: tell them (briefly, in French) to create a free project at supabase.com and put VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the project's .env, then restart the preview.
- You cannot run migrations — when a table is needed, give the user the exact SQL to paste in the Supabase SQL editor, and ALWAYS enable Row Level Security with sensible policies (a public app must not leave tables world-writable).
- Degrade gracefully: if the keys are missing, the app must still render (show a clear "connecte Supabase" notice rather than crash).`;

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
  const analytic = effectiveMode === "elite" && effectiveModel !== "haiku";
  const visionRules = effectiveMode === "elite" ? VISION_RULES_ELITE : VISION_RULES_MVP;
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
            MODE_RULES[effectiveMode] +
            SYSTEM_APPEND +
            BLUEPRINTS_RULES +
            SUPABASE_RULES +
            (analytic ? ANALYTIC_RULES : "") +
            visionRules +
            axiomsPromptSection(WORKSPACE_DIR) +
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
