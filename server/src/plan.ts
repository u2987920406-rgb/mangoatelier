import { LEXIQUE_FILE_NAME } from "./lexique.js";

// Mango Plan (idea 9) + automated moodboard (idea 11) — Élite-mode only.
// This is exactly what the MVP/Élite switch (idea 12) was built for: Élite =
// "Mango Plan, moodboard, full arsenal"; MVP = "no plan, just build fast".
// Both are prompt-driven protocols (no extra UI): the agent separates DESIGN
// from CODING, writing a validated plan.md before generating — so the final
// build is lean and on-target from the first try (zero technical debt).

// Architect mode (idea PromptArchitect, built on Mango Plan idea 9 — Élite only):
// scope a raw idea precisely BEFORE coding, via an adaptive, progressive scoping
// dialogue, then write a rich plan.md. No "master prompt to paste elsewhere":
// MangoOS is the builder, so plan.md IS the spec.
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

Then present a 4-6 line summary and ask the user to validate or adjust. Build ONLY after they agree ("go", "ok", "vas-y"). Keep plan.md as the LIVING contract (update it if the plan changes); it's a committed project document, not a memory file. There is NO master prompt to produce — plan.md is the spec MangoOS builds from directly.
- Skip planning entirely for small changes to an existing project — just do them.

Language contract (Contrat de langage — Ubiquitous Language) — establish it during scoping:
- Add a "Contrat de langage" section to plan.md: the SHARED LEXICON that locks naming for the whole project (one concept = one name = one component). A 4-column table | Terme naturel (humain) | Terme technique (domaine) | Composant / fichier | Description |. Ground it in the real domain, never a hallucinated lexical field. It is the naming source of truth every file must follow (it is also persisted/maintained automatically in ${LEXIQUE_FILE_NAME}).

Exploration mode — when the user is vague or undecided:
- If the user answers a scoping question vaguely or says they don't know, do NOT just re-ask an open question. Propose 2-3 CONCRETE directions to pick from — each a short bundle (concept + visual style + key features) — so they choose rather than invent. Then proceed from their pick (with stated defaults for the rest).`;

// Cadrage fondateur multimodal (idée #47) — Élite only. THE CONDUCTOR of the
// founding phase: it does NOT add a new capability, it ORCHESTRATES the ones
// that already exist but were scattered — intention/scoping (Mango Plan #9),
// language contract (#45), web references via Sharingan (#46), and attached
// references (images/photos/PDF via uploads.ts → vision + sharingan_image #51).
// The conviction it formalises: a well-prepared founding prompt — right
// language, right references — is the base of everything. Prompt-driven (no new
// UI): the agent SOLICITS the missing references at the founding moment, DIGESTS
// each source with the right tool, and TRIANGULATES them into one plan.md.
export const CADRAGE_RULES = `
Cadrage fondateur — multimodal grounding (Élite only) — at the START of a NEW project, run a deliberate founding phase BEFORE coding. Its goal: understand what the user truly thinks and wants, anchored on real references, not guesses. This phase feeds the Mango Plan and language contract below — it is their multi-source front door.
- INVENTORY the founding inputs already present in the user's message: the intention itself, attached files (.assets/… — ambiance screenshots, a photo of the real place, a PDF menu/spec/brand book), and any URLs of sites the user likes or named as leaders.
- SOLICIT what is missing — ONCE, here, as part of the first scoping wave (never later, piecemeal): ask whether the user has references to anchor the design — "des écrans/photos d'ambiance, des URLs de sites que tu aimes, un PDF (menu, charte, cahier des charges) ?". Then let them off the hook: they can say "vas-y avec ton jugement" and you proceed with stated defaults. Do not turn it into a chore.
- DIGEST each source with the RIGHT tool (see the vision and moodboard rules for the how): URLs → mcp__vision__sharingan_url (real palette/fonts/tokens/structure); attached UI mockups/screenshots → native Read + reproduce; a photo of the real subject or an ambiance image → mcp__vision__sharingan_image to anchor the palette on its REAL colours; a PDF → Read it (pages param) and turn its content into structure (e.g. menu categories → data model).
- TRIANGULATE across sources into ONE coherent founding picture in plan.md (a "Cadrage fondateur" synthesis): reconcile what each source says — e.g. palette anchored on the real venue photo, information architecture from the web leaders, data model from the PDF, naming from the intention (→ language contract). When two sources disagree (the user says "épuré" but loads three busy references), SAY SO and ask which wins before coding — do not silently average them.
- Keep it grounding, not a research essay: a few precise, sourced bullets. Then continue into the Mango Plan scoping + validation below. SKIP this whole phase for a small change to an existing project.`;

// Moodboard visuel automatique — version MVP (idea 11 light, idea #46 extension).
// Half-capacity: 1 WebSearch to find/verify a real leader, 1 Sharingan capture,
// applied directly to the build. No WebFetch deep-reads (Élite only).
export const MOODBOARD_RULES_MVP = `
Visual moodboard — MVP auto-grounding (half capacity: 1 search, 1 capture):
- WHEN to run: at the start of a NEW project when no precise design has been provided (no mockup, no URL, no image). SKIP for tiny projects, quick edits, or when the user already supplied a design reference.
- HOW: do ONE WebSearch to find a single real leader of the project's domain (verify it exists — never invent a URL), then call mcp__vision__sharingan_url on that ONE URL to extract REAL values: palette hex, fonts, CSS tokens, semantic structure. This is the economical half of the Élite moodboard — exactly ONE search and ONE capture, no WebFetch deep-reads, no extra leaders.
- APPLY the captured values directly to the build (inject CSS variables, match palette, import fonts). Do NOT write plan.md and do NOT ask scoping questions.`;

// Moodboard + contextual information architecture (ideas 11 + 7) — Élite only.
// Web research grounds BOTH the visual design AND the domain-specific site
// structure (which pages/sections/nav the domain's leaders share), so the
// target tree reflects the state of the art rather than a generic blueprint.
// Sharingan (chantier #8, idea #46) is now wired: the agent can call
// mcp__vision__sharingan_url to capture REAL hex values, fonts and CSS tokens
// from 2-3 leaders instead of guessing them from text descriptions.
export const MOODBOARD_RULES = `
Design references + contextual structure / moodboard (Élite only) — when planning a NEW project, ground BOTH the design AND the site structure in the real state of the art instead of guessing:
- DISCOVER: Use WebSearch to find 3-5 leading products/sites in the SPECIFIC domain (e.g. "sports betting", "recipe app", "SaaS analytics"), and WebFetch a couple to understand what makes them work.
- CAPTURE (2-3 leaders max — Sharingan is heavy; skip for tiny projects or quick edits): call mcp__vision__sharingan_url on 2-3 of those leaders to extract REAL values: exact palette hex (e.g. #FF6B35), fonts + weights, CSS variables/tokens, and semantic structure (sections, nav, CTAs).
- Write a "Références & arborescence" section in plan.md with:
  (1) CONCRETE design rules anchored on the captured data (e.g. "palette: #1A1A2E / #FF6B35 — dark base + warm accent; font: Inter 700 headings + 400 body; sticky top nav; hero with one CTA");
  (2) the CONTEXTUAL INFORMATION ARCHITECTURE — pages, sections, nav the domain's leaders consistently share (e.g. for sports betting: live odds board, bet slip, promotions, account/wallet). This drives the target file tree.
- Extract conventions and structure — never copy content. Keep it brief (a few bullets each); this is grounding, not a research essay.`;
