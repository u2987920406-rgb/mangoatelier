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
- Identify the project type and its blueprint (stack + structure), and ground the design in real references (see moodboard below).
- Write a concise plan.md at the project root: intent (1-2 lines), target file tree, stack, key design choices (palette, layout, main sections). Then present a 4-6 line summary and ask the user to validate or adjust.
- Build ONLY after the user agrees ("go", "ok", "vas-y"). Keep plan.md as the contract and update it if the plan changes. plan.md is a project document (committed with the code), not a memory file.
- Skip planning entirely for small changes to an existing project — just do them.`;

// Moodboard: ground the design in the real state of the art (idea 11 v1 —
// text/structure grounding via web research; autonomous visual capture of the
// leaders is a planned enhancement, not in this version).
export const MOODBOARD_RULES = `
Design references / moodboard (Élite only) — when planning a NEW project, ground the design in the real state of the art instead of guessing:
- Use WebSearch to find 2-3 leading products/sites in the domain, and WebFetch to read what makes their UX work (palette feel, layout, key sections, navigation patterns).
- Distil CONCRETE, reusable design rules into a "Références" section of plan.md (e.g. "dark theme + single accent, sticky top nav, hero with one CTA, social proof band"). Extract the conventions — never copy content.
- Keep it brief (a few bullets); this is grounding, not a research essay. Skip it for tiny projects or quick edits.`;
