// Background memory review, transposed from Hermes Agent's background_review.py:
// after the response is delivered to the user, a cheap silent agent (haiku)
// re-reads the turn and curates the two memory stores (Hermes' combined review):
//   - <project>/.memory.md  — facts about THIS project
//   - workspace/.user-profile.md — who the user is, across ALL projects
// It never competes with the user's task for attention or latency, and never
// recurses (it is not itself reviewed).
import path from "node:path";
import { query } from "@anthropic-ai/claude-agent-sdk";
import {
  MEMORY_FILE_NAME,
  USER_PROFILE_FILE_NAME,
  loadMemory,
  loadUserProfile,
} from "./memory.js";
import { WORKSPACE_DIR } from "./projects.js";
import { appendHistory, type ChatEntry } from "./history.js";

// One review at a time; a turn that ends while a review runs skips its review
// (same "best-effort, never pile up" stance as Hermes).
let reviewRunning = false;

export function reviewStatus(): { running: boolean } {
  return { running: reviewRunning };
}

// The two-store distinction is Hermes' MEMORY.md vs USER.md, adapted:
// project-scoped facts vs durable cross-project tastes.
const REVIEW_SYSTEM = `
You are a silent background reviewer for a "Lovable-like" app builder. Your ONLY
job is to curate two memory files (paths are given in the user message):
1. The PROJECT memory (${MEMORY_FILE_NAME} inside the project folder): design
   decisions, conventions, data shapes, pitfalls — facts scoped to THIS project.
2. The USER profile (${USER_PROFILE_FILE_NAME} at the workspace root): who the
   user is across ALL projects — language and tone they prefer, recurring design
   tastes, how they like to work. Only put a preference here when it is clearly
   general ("je n'aime pas...", "toujours", "de manière générale", or the same
   taste keeps coming back); when in doubt, keep it project-scoped.
User preferences and corrections ("stop doing X", "I don't like Y") are
FIRST-CLASS signals — save them in the right store.
Do NOT save: transient errors that were fixed, one-off task narratives, anything
obvious from reading the code, environment-dependent failures.
Rules for both files: short factual bullets, in French; under 50 lines for the
project memory, under 25 for the profile. MERGE and rewrite existing entries
instead of appending duplicates; delete entries that became wrong. When a
preference graduates to the profile, remove its duplicate from project memories
you are editing.
Do not modify ANY other file. Do not run commands.
If nothing is worth saving anywhere, reply exactly "Nothing to save." and stop.`;

const MAX_TRANSCRIPT_CHARS = 8000;

function formatTranscript(turn: ChatEntry[]): string {
  const lines = turn.map((e) => `[${e.role}] ${e.text}`).join("\n");
  return lines.length > MAX_TRANSCRIPT_CHARS
    ? `${lines.slice(0, MAX_TRANSCRIPT_CHARS)}\n[... transcript truncated]`
    : lines;
}

/** Fire-and-forget: reviews the finished turn and updates both memory stores. */
export function spawnBackgroundReview(projectDir: string, turn: ChatEntry[]): void {
  if (reviewRunning) return;
  reviewRunning = true;
  void (async () => {
    try {
      const memoryBefore = loadMemory(projectDir);
      const profileBefore = loadUserProfile(WORKSPACE_DIR);
      const memoryPath = path
        .join(path.relative(WORKSPACE_DIR, projectDir), MEMORY_FILE_NAME)
        .replaceAll("\\", "/");
      const prompt = [
        "Conversation turn to review:",
        formatTranscript(turn),
        "",
        `PROJECT memory file: ${memoryPath} — current content:`,
        memoryBefore || "(the file does not exist yet)",
        "",
        `USER profile file: ${USER_PROFILE_FILE_NAME} — current content:`,
        profileBefore || "(the file does not exist yet)",
        "",
        "Update the file(s) if warranted, then stop.",
      ].join("\n");

      const q = query({
        prompt,
        options: {
          // Workspace root so both the project memory and the profile are in
          // scope; the system prompt forbids touching anything else.
          cwd: WORKSPACE_DIR,
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

      const memoryChanged = loadMemory(projectDir) !== memoryBefore;
      const profileChanged = loadUserProfile(WORKSPACE_DIR) !== profileBefore;
      if (memoryChanged || profileChanged) {
        const what = [
          ...(memoryChanged ? ["mémoire du projet"] : []),
          ...(profileChanged ? ["profil utilisateur"] : []),
        ].join(" + ");
        console.log(`[review] ${what} updated ($${cost.toFixed(4)})`);
        // Visible on the next history reload, like the "version saved" line.
        appendHistory(projectDir, [
          { role: "status", text: `🧠 ${what.charAt(0).toUpperCase()}${what.slice(1)} mis à jour`, ts: new Date().toISOString() },
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
