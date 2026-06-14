// Mango Plan (idea 9) + automated moodboard (idea 11) — Élite-mode only.
// This is exactly what the MVP/Élite switch (idea 12) was built for: Élite =
// "Mango Plan, moodboard, full arsenal"; MVP = "no plan, just build fast".
// Both are prompt-driven protocols (no extra UI): the agent separates DESIGN
// from CODING, writing a validated plan.md before generating — so the final
// build is lean and on-target from the first try (zero technical debt).

// Architect mode: design before coding, for new projects / major features.
export const PLAN_RULES = `
Mango Plan (architect mode — Élite only) — for a NEW project or a MAJOR new feature, design before coding:
- If the intent is vague, ask up to 3 sharp questions FIRST (target users, must-have features, visual direction). One round only, then proceed with sensible defaults.
- Identify the project type and its blueprint (stack + structure) — but treat that generic blueprint as a SKELETON to be CUSTOMIZED by the domain references (see moodboard below), not a fixed template.
- Write a concise plan.md at the project root: intent (1-2 lines), target file tree (the domain-specific pages/sections derived from the references, on top of the generic blueprint), stack, key design choices (palette, layout, main sections). Then present a 4-6 line summary and ask the user to validate or adjust.
- Build ONLY after the user agrees ("go", "ok", "vas-y"). Keep plan.md as the contract and update it if the plan changes. plan.md is a project document (committed with the code), not a memory file.
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
