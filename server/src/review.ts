// Background memory review, transposed from Hermes Agent's background_review.py:
// after the response is delivered to the user, a cheap silent agent (haiku)
// re-reads the turn and curates .memory.md. It never competes with the user's
// task for model attention or latency, and never recurses (it is not reviewed).
import { query } from "@anthropic-ai/claude-agent-sdk";
import { MEMORY_FILE_NAME, loadMemory } from "./memory.js";
import { appendHistory, type ChatEntry } from "./history.js";

// One review at a time; a turn that ends while a review runs skips its review
// (same "best-effort, never pile up" stance as Hermes).
let reviewRunning = false;

export function reviewStatus(): { running: boolean } {
  return { running: reviewRunning };
}

const REVIEW_SYSTEM = `
You are a silent background reviewer for a "Lovable-like" app builder. Your ONLY
job is to curate the project memory file ${MEMORY_FILE_NAME} at the project root.
You receive the transcript of the turn that just ended. Decide what is durable:
- User preferences and corrections (style, colors, tone, wording, "stop doing X",
  "I don't like Y") are FIRST-CLASS signals — save them.
- Design decisions, project conventions, data shapes, pitfalls specific to this
  project: save them.
Do NOT save: transient errors that were fixed, one-off task narratives, anything
obvious from reading the code, environment-dependent failures.
Rules for the file: short factual bullets, under 50 lines, in French. MERGE and
rewrite existing entries instead of appending duplicates; delete entries that
became wrong.
Do not modify ANY other file. Do not run commands.
If nothing is worth saving, reply exactly "Nothing to save." and stop.`;

const MAX_TRANSCRIPT_CHARS = 8000;

function formatTranscript(turn: ChatEntry[]): string {
  const lines = turn.map((e) => `[${e.role}] ${e.text}`).join("\n");
  return lines.length > MAX_TRANSCRIPT_CHARS
    ? `${lines.slice(0, MAX_TRANSCRIPT_CHARS)}\n[... transcript truncated]`
    : lines;
}

/** Fire-and-forget: reviews the finished turn and updates the memory file. */
export function spawnBackgroundReview(projectDir: string, turn: ChatEntry[]): void {
  if (reviewRunning) return;
  reviewRunning = true;
  void (async () => {
    try {
      const before = loadMemory(projectDir);
      const prompt = [
        "Conversation turn to review:",
        formatTranscript(turn),
        "",
        `Current content of ${MEMORY_FILE_NAME}:`,
        before || "(the file does not exist yet)",
        "",
        "Update the memory file if warranted, then stop.",
      ].join("\n");

      const q = query({
        prompt,
        options: {
          cwd: projectDir,
          model: "haiku",
          maxTurns: 8,
          permissionMode: "acceptEdits",
          allowedTools: ["Read", "Write", "Edit"],
          systemPrompt: { type: "preset", preset: "claude_code", append: REVIEW_SYSTEM },
        },
      });
      let cost = 0;
      for await (const message of q) {
        if (message.type === "result") cost = message.total_cost_usd ?? 0;
      }

      const after = loadMemory(projectDir);
      if (after !== before) {
        console.log(`[review] project memory updated ($${cost.toFixed(4)})`);
        // Visible on the next history reload, like the "version saved" line.
        appendHistory(projectDir, [
          { role: "status", text: "🧠 Mémoire du projet mise à jour", ts: new Date().toISOString() },
        ]);
      } else {
        console.log(`[review] nothing to save ($${cost.toFixed(4)})`);
      }
    } catch (err) {
      console.warn("[review]", err instanceof Error ? err.message : err);
    } finally {
      reviewRunning = false;
    }
  })();
}
