// Mango Plan (idea 9) + automated moodboard (idea 11) — Élite-mode only.
// This is exactly what the MVP/Élite switch (idea 12) was built for: Élite =
// "Mango Plan, moodboard, full arsenal"; MVP = "no plan, just build fast".
// Both are prompt-driven protocols (no extra UI): the agent separates DESIGN
// from CODING, writing a validated plan.md before generating — so the final
// build is lean and on-target from the first try (zero technical debt).

// Architect mode (idea PromptArchitect, built on Mango Plan idea 9 — Élite only):
// scope a raw idea precisely BEFORE coding, via an adaptive, progressive scoping
// dialogue, then write a rich plan.md. No "master prompt to paste elsewhere":
// MangoAI is the builder, so plan.md IS the spec.
export const PLAN_RULES = `
Mango Plan — ARCHITECT MODE (Élite only) — for a NEW project or a MAJOR new feature, design before coding. Be a software architect: scope the idea precisely, then build straight to the point.

Scoping dialogue (ADAPTIVE & PROGRESSIVE):
- First, analyse the raw idea and spot the unknowns across these angles: target & core MVP feature, critical user flow, data model, integrations (payments, maps, auth…), visual style.
- Then ask clarifying questions IN WAVES — broad first, each wave MORE SPECIFIC and informed by the previous answers. Number the questions. Scale depth to complexity: a simple site needs 2-3 questions; a complex app (accounts, data, payments) up to 10-15 TOTAL — never more. STOP as soon as the picture is clear; never pad to reach a number.
- At EACH wave, let the user off the hook: they can answer "vas-y avec ton jugement" and you fill the rest with sensible, STATED defaults. Never turn scoping into a chore.

Plan deliverable — write a concise plan.md at the project root:
- Vision: value proposition (one line), problem, solution.
- Data architecture: when the app has data, a Markdown table | Table | Description | Key fields & types | Relations |.
- Features by priority: the 2-3 high-priority features (flow + rules), then the secondary ones.
- Target file tree (domain-specific, on top of the generic blueprint — see moodboard) + stack + key design choices (palette, layout, main sections).
- Treat the generic type blueprint as a SKELETON to customise, not a fixed template.

Then present a 4-6 line summary and ask the user to validate or adjust. Build ONLY after they agree ("go", "ok", "vas-y"). Keep plan.md as the LIVING contract (update it if the plan changes); it's a committed project document, not a memory file. There is NO master prompt to produce — plan.md is the spec MangoAI builds from directly.
- Skip planning entirely for small changes to an existing project — just do them.`;

// Moodboard + contextual information architecture (ideas 11 + 7) — Élite only.
// Web research grounds BOTH the visual design AND the domain-specific site
// structure (which pages/sections/nav the domain's leaders share), so the
// target tree reflects the state of the art rather than a generic blueprint.
// Autonomous visual capture of the leaders (Playwright screenshots) stays a
// planned enhancement — text/structure grounding only in this version.
export const MOODBOARD_RULES = `
Design references + contextual structure / moodboard (Élite only) — when planning a NEW project, ground BOTH the design AND the site structure in the real state of the art instead of guessing:
- Use WebSearch to find 3-5 leading products/sites in the SPECIFIC domain (e.g. "sports betting", "recipe app", "SaaS analytics"), and WebFetch a couple of them to read what makes them work.
- Extract two things into a "Références & arborescence" section of plan.md:
  (1) CONCRETE design rules (e.g. "dark theme + single accent, sticky top nav, hero with one CTA, social proof band");
  (2) the CONTEXTUAL INFORMATION ARCHITECTURE — the pages, sections and navigation the domain's leaders consistently share (e.g. for sports betting: live odds board, bet slip, promotions, account/wallet). This domain-specific tree CUSTOMIZES the generic blueprint and drives the target file tree.
- Extract conventions and structure — never copy content. Keep it brief (a few bullets each); this is grounding, not a research essay. Skip it for tiny projects or quick edits.`;
