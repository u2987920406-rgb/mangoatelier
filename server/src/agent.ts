// Wraps the Claude Agent SDK: runs one chat turn against a generated project
// and yields simplified events the frontend can render.
import { query } from "@anthropic-ai/claude-agent-sdk";
import { MEMORY_RULES, memoryPromptSection } from "./memory.js";
import { WORKSPACE_DIR } from "./projects.js";

const DEFAULT_MODEL = process.env.MODEL ?? "sonnet";
export const ALLOWED_MODELS = ["sonnet", "opus", "haiku"] as const;
export type ModelChoice = (typeof ALLOWED_MODELS)[number];

export type AgentEvent =
  | { type: "text"; text: string }
  | { type: "tool"; name: string; detail: string }
  | { type: "result"; sessionId: string; costUsd: number; numTurns: number; ok: boolean; error?: string }
  | { type: "error"; message: string };

const SYSTEM_APPEND = `
You are the engine of a local "Lovable-like" app builder.
You work inside an existing React + Vite project (already scaffolded, dependencies installed).
Rules:
- Implement what the user asks by editing files under src/ (and index.html / package.json if needed).
- The user sees the app live through Vite HMR: keep the app compiling at every step.
- Use Tailwind-free plain CSS (src/index.css or component CSS) unless the user asks otherwise.
- Do NOT run "npm run dev" or start servers — the host application manages the dev server.
- Only run npm installs when a new dependency is truly required.
- Never remove or modify the <script data-mangoai="error-relay"> block in index.html — the host application needs it.
- Answer the user briefly in French; code and comments stay in English.
${MEMORY_RULES}`;

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
  try {
    const q = query({
      prompt,
      options: {
        cwd: projectDir,
        model: model ?? DEFAULT_MODEL,
        maxTurns: 40,
        permissionMode: "acceptEdits",
        allowedTools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep"],
        // Memory is appended per turn as a frozen snapshot (Hermes pattern):
        // mid-turn writes to .memory.md land on disk and are picked up at the
        // start of the NEXT turn, keeping this turn's prompt stable.
        systemPrompt: {
          type: "preset",
          preset: "claude_code",
          append: SYSTEM_APPEND + memoryPromptSection(projectDir, WORKSPACE_DIR),
        },
        ...(sessionId ? { resume: sessionId } : {}),
      },
    });
    currentQuery = q;
    for await (const message of q) {
      if (message.type === "assistant") {
        for (const block of message.message.content) {
          if (block.type === "text" && block.text.trim()) {
            yield { type: "text", text: block.text };
          } else if (block.type === "tool_use") {
            yield { type: "tool", name: block.name, detail: summarizeToolInput(block.name, block.input) };
          }
        }
      } else if (message.type === "result") {
        yield {
          type: "result",
          sessionId: message.session_id,
          costUsd: message.total_cost_usd ?? 0,
          numTurns: message.num_turns ?? 0,
          ok: message.subtype === "success",
          error: message.subtype === "success" ? undefined : message.subtype,
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
    default:
      return "";
  }
}
