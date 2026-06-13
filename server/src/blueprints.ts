// Project blueprints (ideas 6 + 8): per project type, the optimal STACK
// (idea 6 — which libs) and a default FOLDER STRUCTURE (idea 8 — the tree).
// Injected as a compact catalogue into the agent's system prompt: when the
// user's request matches a type, the agent starts from a known stack and
// structure instead of improvising — fewer turns, fewer tokens, a result
// closer to the state of the art from the very first message.
//
// Depth chosen by the user: "structured but flexible" — clear folders adapted
// to the type, but the agent stays free to deviate when the project needs it.
// Kept terse on purpose (it rides in every turn's prompt; idea 13 watches the
// ~33k base). Stacks stay within what the Vite-SPA preview can run.

export const BLUEPRINTS_RULES = `
Project blueprints — when the request matches a type below, DEFAULT to its stack and folder structure; adapt freely when the project genuinely needs it. All types are React + Vite (the preview runs a Vite SPA); Tailwind v4 is preinstalled.
- Site vitrine / landing: plain CSS or Tailwind, no backend. src/components/<Section>.jsx (Hero, Features, Pricing, Contact…), assembled in src/App.jsx; single page, smooth anchor nav (remember scroll-padding-top under a fixed header).
- Web app interactive: state + data. src/components/, src/hooks/, src/lib/ (helpers + supabase.js if data/auth — see the Supabase rules), src/views/ or src/pages/ for routes; state via hooks/context, keep side-effects in hooks.
- Dashboard / admin: install recharts. src/layout/ (Sidebar, Topbar), src/widgets/ (StatCard, ChartCard, DataTable), src/data/ (mock or supabase); App.jsx = responsive grid. Numbers right-aligned, accessible color contrast.
- Jeu 2D: HTML <canvas> + a fixed-timestep requestAnimationFrame loop. src/game/ (loop.js, entities.js, input.js, render.js), src/components/GameCanvas.jsx, App.jsx. Sync the canvas to devicePixelRatio before the first frame for crisp sprites; decouple update() from render().
- Présentation / slides: src/slides/ (one component per slide), src/components/Deck.jsx (←/→ + space nav, progress bar, 16:9), App.jsx renders the deck. Keyboard-first.
- Agent spécialisé (AI assistant app): install @anthropic-ai/sdk. src/lib/claude.js (client reading import.meta.env.VITE_ANTHROPIC_API_KEY, never hardcoded), src/prompts/ (the assistant's system prompt), src/components/Chat.jsx (message list + streaming), App.jsx. Default to a current model (claude-opus-4-8, or claude-sonnet-4-6 for speed) and stream responses. SECURITY: the key sits in .env (git-ignored, excluded from the zip, NEVER deployed) — this is fine for local/personal use; tell the user a production deploy needs a small backend proxy so the key isn't shipped to the browser.`;

// Lightweight classifier (jalon D Phase 2): maps a prompt to one of the blueprint
// types, for the metrics' "par type" breakdowns. Heuristic and order-sensitive —
// the most specific types are tested first. Returns "autre" when nothing matches.
export type ProjectType = "dashboard" | "jeu" | "slides" | "agent" | "vitrine" | "webapp" | "autre";

export function inferProjectType(text: string): ProjectType {
  const t = (text ?? "").toLowerCase();
  if (/dashboard|tableau de bord|\badmin\b|graphique|\bchart|\bstat(s|istique)?\b/.test(t)) return "dashboard";
  if (/\bjeu\b|\bgame\b|canvas|sprite|collision|arcade|platformer/.test(t)) return "jeu";
  if (/\bslides?\b|présentation|presentation|powerpoint|\bdeck\b|diapo/.test(t)) return "slides";
  if (/\bagent\b|chatbot|\bllm\b|assistant ia|\bia\b\s+(qui|conversationnel)/.test(t)) return "agent";
  if (/vitrine|landing|page d'accueil|site (web|vitrine)|portfolio/.test(t)) return "vitrine";
  if (/\bapp(lication)?\b|formulaire|\bauth\b|login|signup|\bcrud\b|supabase|panier|e-?commerce|todo/.test(t)) return "webapp";
  return "autre";
}

/** selectAxioms v2.1 (jalon D) — type de projet ROBUSTE pour la récupération
 * d'axiomes. La tâche courante prime (intention la plus spécifique : "crée un
 * dashboard…"), mais si elle est neutre ("ajoute un bouton", "corrige l'espacement"),
 * on retombe sur la MÉMOIRE PERSISTANTE du projet, qui sait de quel type il s'agit.
 * Bien plus fiable que le seul prompt du tour. Renvoie "autre" si aucun signal. */
export function detectProjectType(task: string, projectMemory?: string): ProjectType {
  const fromTask = inferProjectType(task);
  if (fromTask !== "autre") return fromTask;
  return inferProjectType(projectMemory ?? "");
}
