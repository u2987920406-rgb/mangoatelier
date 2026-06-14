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
import { listSkills, skillsSnapshot, SKILLS_DIR } from "./skills.js";
import { AXIOMS_FILE_NAME, axiomsSnapshot, loadAxioms } from "./axioms.js";
import { appendHistory, type ChatEntry } from "./history.js";

// One review at a time; a turn that ends while a review runs skips its review
// (same "best-effort, never pile up" stance as Hermes).
let reviewRunning = false;

export function reviewStatus(): { running: boolean } {
  return { running: reviewRunning };
}

// Hermes' combined review, adapted: MEMORY.md vs USER.md vs the skill library
// (declarative facts vs user identity vs procedural how-to knowledge).
const REVIEW_SYSTEM = `
You are a silent background reviewer for a "Lovable-like" app builder. Your ONLY
job is to curate three knowledge stores (paths are given in the user message):
1. The PROJECT memory (${MEMORY_FILE_NAME} inside the project folder): design
   decisions, conventions, data shapes, pitfalls — facts scoped to THIS project.
2. The USER profile (${USER_PROFILE_FILE_NAME} at the workspace root): who the
   user is across ALL projects — language and tone they prefer, recurring design
   tastes, how they like to work. Only put a preference here when it is clearly
   general ("je n'aime pas...", "toujours", "de manière générale", or the same
   taste keeps coming back); when in doubt, keep it project-scoped.
3. The SKILL library (its ABSOLUTE directory is given in the user message as
   SKILLS_DIR): HOW to do a class of task — a non-trivial technique, fix,
   workaround or pattern that a future session on ANY project would benefit from
   (e.g. a working cart pattern, a tricky CSS/Vite fix, a layout recipe the user
   validated).
   Format: <SKILLS_DIR>/<class-level-name>/SKILL.md (build the path from the
   ABSOLUTE SKILLS_DIR given below — never a bare ".skills/..."), starting with YAML frontmatter
   (--- name: <name> / description: <one line, when to use> ---), then concise
   steps with the actual code that worked. Be ACTIVE about skills: when the
   turn produced a working UI pattern, interaction, or fix (even a small one —
   a scroll button, an accordion, a form validation), capturing it is the
   default; a pass that saves nothing is a missed learning opportunity.
   Preference order: PATCH an existing skill that covers the territory > add
   detail to it > CREATE a new one. The name MUST be class-level
   ("panier-ecommerce", "bouton-scroll-top"), NEVER a one-session artifact
   ("fix-bug-du-jour"). Skip only pure Q&A turns or trivial one-line tweaks.
4. The AXIOM registry (${AXIOMS_FILE_NAME} at the workspace root) — the
   "knowledge flywheel". UNIVERSAL, abstract engineering/UX rules, independent
   of language, framework or project. An axiom is the WHY/RULE, NEVER the HOW
   (procedural code belongs in a skill) and NEVER a project fact. Add one ONLY
   when the turn exposed a non-obvious trap whose lesson generalises to ANY
   future project (a layout pitfall, a state-management gotcha, a perf rule).
   Format — one block per axiom, in French, separated by a blank line:
     AXIOME-[CAT]-[NN] (maturité: candidat | confirmé · vu: AAAA-MM-JJ)
     - Contexte : the general engineering/UX intent
     - Piège : the invisible trap the code or human falls into
     - Règle d'or : the universal locking rule
   CAT examples: VISION, UIUX, ARCH, DATA, PERF, A11Y. Number per category.
   GUARD-RAILS (mandatory — this clapet is anti-FORGETTING, not anti-correction):
   - A NEWLY created axiom is ALWAYS "candidat" — never write "confirmé" on an
     axiom's first appearance, however certain it seems. Promote to "confirmé"
     ONLY when a LATER, separate turn independently reconfirms an existing one.
   - Falsifiable: if THIS turn contradicts an existing axiom, you MUST amend or
     delete it (refresh its date) — never keep a rule observed to be false.
   - An axiom is a DEFAULT, not dogma; a user's explicit choice that overrides
     one is NOT a reason to weaken the axiom (it stays a default for next time).
   - Hard cap: keep the registry under ~12 axioms and 3000 characters. When
     full, MERGE overlapping axioms or drop the weakest "candidat" — never grow
     past the cap. Quality over quantity: most turns add NO axiom.
User preferences and corrections ("stop doing X", "I don't like Y") are
FIRST-CLASS signals — save them in the right memory store.
Do NOT save anywhere: transient errors that were fixed by retrying, one-off task
narratives, anything obvious from reading the code, environment-dependent
failures, negative claims like "X does not work" (capture the FIX instead). Do
NOT duplicate a skill's how-to as an axiom, and never put project specifics in
the axiom registry.
Rules for memory files: short factual bullets, in French; under 50 lines for the
project memory, under 25 for the profile. MERGE and rewrite existing entries
instead of appending duplicates; delete entries that became wrong. When a
preference graduates to the profile, remove its duplicate from project memories
you are editing.
ABSOLUTE PATHS ONLY: every store's full absolute path is given in the user
message — write exactly there. Never resolve a relative ".skills/..." or bare
filename yourself (it would land in the wrong directory).
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
      const skillsBefore = skillsSnapshot();
      const axiomsBefore = axiomsSnapshot(WORKSPACE_DIR);
      // Absolute paths only — a relative ".skills/..." or bare filename can be
      // resolved by the reviewer against the wrong base and land outside the
      // workspace (observed: a skill written to the repo root). Forward slashes
      // for cross-platform clarity to the model.
      const abs = (p: string) => p.replaceAll("\\", "/");
      const memoryPath = abs(path.join(projectDir, MEMORY_FILE_NAME));
      const profilePath = abs(path.join(WORKSPACE_DIR, USER_PROFILE_FILE_NAME));
      const skillsDirPath = abs(SKILLS_DIR);
      const axiomsPath = abs(path.join(WORKSPACE_DIR, AXIOMS_FILE_NAME));
      const skillList = listSkills()
        .map((s) => `- ${s.name}: ${s.description}`)
        .join("\n");
      const prompt = [
        "Conversation turn to review:",
        formatTranscript(turn),
        "",
        `PROJECT memory file (absolute path — write here): ${memoryPath} — current content:`,
        memoryBefore || "(the file does not exist yet)",
        "",
        `USER profile file (absolute path — write here): ${profilePath} — current content:`,
        profileBefore || "(the file does not exist yet)",
        "",
        `SKILLS_DIR (absolute — create skills as ${skillsDirPath}/<name>/SKILL.md):`,
        skillList || "(none yet)",
        "",
        `AXIOM registry file (absolute path — write here): ${axiomsPath} — current content:`,
        loadAxioms(WORKSPACE_DIR) || "(the file does not exist yet)",
        "",
        "Update the store(s) if warranted, then stop.",
      ].join("\n");

      const q = query({
        prompt,
        options: {
          // Workspace root so both the project memory and the profile are in
          // scope; the system prompt forbids touching anything else.
          cwd: WORKSPACE_DIR,
          model: "haiku",
          maxTurns: 12,
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
      const skillsChanged = skillsSnapshot() !== skillsBefore;
      const axiomsChanged = axiomsSnapshot(WORKSPACE_DIR) !== axiomsBefore;
      if (memoryChanged || profileChanged || skillsChanged || axiomsChanged) {
        const what = [
          ...(memoryChanged ? ["mémoire du projet"] : []),
          ...(profileChanged ? ["profil utilisateur"] : []),
          ...(skillsChanged ? ["bibliothèque de skills"] : []),
          ...(axiomsChanged ? ["registre d'axiomes"] : []),
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
