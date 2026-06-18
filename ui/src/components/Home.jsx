import { useState, useEffect } from "react";
import {
  ArrowRight,
  BarChart3,
  Box,
  Boxes,
  Braces,
  Calculator,
  Check,
  ChevronDown,
  Crosshair,
  Database,
  FileText,
  Flower2,
  FolderOpen,
  Gamepad2,
  GraduationCap,
  Layers,
  LayoutDashboard,
  Network,
  Package,
  PieChart,
  Plus,
  Search,
  ShoppingCart,
  Store,
  Workflow,
} from "lucide-react";

const TEMPLATES = [
  { id: "",          label: "Vierge",     icon: Package,         family: "Base",          hint: "Page blanche — structure libre",                                          examples: [] },
  { id: "vitrine",   label: "Vitrine",    icon: Store,           family: "Site",          hint: "Site d'entreprise, présentation de services",                            examples: ["Apple.com", "Agence créative", "Cabinet d'avocats"] },
  { id: "ecommerce", label: "E-commerce", icon: ShoppingCart,    family: "Site",          hint: "Boutique, catalogue produits, panier",                                   examples: ["Boutique sneakers", "Librairie en ligne", "Cave à vin"] },
  { id: "dashboard", label: "Dashboard",  icon: BarChart3,       family: "App",           hint: "Tableau de bord, monitoring, KPIs",                                      examples: ["Stripe Dashboard", "Vercel Analytics", "Linear"] },
  { id: "blog",      label: "Blog",       icon: FileText,        family: "Site",          hint: "Articles, newsletter web, tutoriels",                                    examples: ["Medium", "Substack-like", "Dev blog perso"] },
  { id: "shadcn",    label: "shadcn/ui",  icon: Layers,          family: "App",           hint: "App soignée avec composants accessibles",                                examples: ["Notion", "Clerk", "Cal.com"] },
  { id: "phaser",    label: "Jeu 2D",     icon: Gamepad2,        family: "Jeu",           hint: "Phaser 3 — plateforme, RPG, puzzle",                                     examples: ["Clone Mario", "Zelda 2D", "Candy Crush"] },
  { id: "threejs",   label: "Jeu 3D",     icon: Box,             family: "Jeu",           hint: "Three.js — WebGL, configurateur 3D, démo",                              examples: ["Nike By You", "Portfolio 3D", "Showroom voiture"] },
  { id: "pixi",      label: "2D rapide",  icon: Crosshair,       family: "Jeu",           hint: "PixiJS — centaines de sprites, bullet-hell",                            examples: ["Vampire Survivors", "Brotato", "Tower defense"] },
  { id: "r3f",       label: "R3F",        icon: Boxes,           family: "Jeu",           hint: "React Three Fiber — 3D intégré à React",                                examples: ["Jeu de course", "Shooter 3D", "Musée virtuel"] },
  { id: "mantine",   label: "Data App",   icon: LayoutDashboard, family: "App",           hint: "Mantine + TanStack — tableau lourd, CRM, back-office",                  examples: ["Airtable", "Monday.com", "Retool"] },
  { id: "daisy",     label: "Landing",    icon: Flower2,         family: "Site",          hint: "DaisyUI — landing page, MVP rapide, site de démo",                      examples: ["Linear.app landing", "Page SaaS", "Site lancement"] },
  { id: "panda",     label: "Outil",      icon: Calculator,      family: "App",           hint: "PandaCSS + Ark UI — calculateur, simulateur, configurateur",            examples: ["Simulateur de prêt", "Calculateur macro", "Convertisseur"] },
  { id: "radix",     label: "Design Sys", icon: Braces,          family: "App",           hint: "Radix + Vanilla Extract — tokens stricts, multi-plateforme",            examples: ["Material Design", "Carbon (IBM)", "Primer (GitHub)"] },
  { id: "supabase",  label: "Supabase",   icon: Database,        family: "Full-stack",    hint: "Auth + CRUD + Realtime + RLS — app sans serveur dédié",                 examples: ["Trello-like", "App de tickets", "Chat collaboratif"] },
  { id: "cytoscape", label: "Mind Map",   icon: Network,         family: "Visualisation", hint: "Cytoscape.js — organigramme, arbre, graphe de relations",               examples: ["Ancestry / arbre généalogique", "Organigramme RH", "Réseau de personnages"] },
  { id: "d3tree",    label: "Treemap",    icon: PieChart,        family: "Visualisation", hint: "D3-Hierarchy — treemap, répartition proportionnelle",                   examples: ["Bundle analyzer", "Carte boursière", "Répartition budget"] },
  { id: "reactflow", label: "Flow",       icon: Workflow,        family: "Builder",       hint: "React Flow — workflow n8n-like, pipeline IA, éditeur visuel",           examples: ["n8n", "Flowise", "Make (ex-Integromat)"] },
];

function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 4)
    .join("-")
    .slice(0, 40);
}

const PROJECTS_VISIBLE = 6;

export default function Home({ projects, templates, onOpen, onStartTutorial, nextTutorialId }) {
  const [name, setName] = useState("");
  const [tpl, setTpl] = useState("");
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [showTutorials, setShowTutorials] = useState(false);
  const [tutorialsList, setTutorialsList] = useState([]);
  const [tutorialsDone, setTutorialsDone] = useState([]);

  const available = TEMPLATES.filter((t) => t.id === "" || templates.includes(t.id));
  const filtered = search.trim()
    ? projects.filter((p) => p.toLowerCase().includes(search.toLowerCase()))
    : projects;
  const visible = showAll ? filtered : filtered.slice(0, PROJECTS_VISIBLE);

  function toggleTutorials() {
    const next = !showTutorials;
    setShowTutorials(next);
    if (next && tutorialsList.length === 0) {
      fetch("/api/tutorials")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => setTutorialsList(d?.tutorials ?? []))
        .catch(() => {});
      fetch("/api/tutorial/progress")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => setTutorialsDone(d?.progress?.completedTutorials ?? []))
        .catch(() => {});
    }
  }

  function submit() {
    const safeName = slugify(name) || "mon-projet";
    onOpen(safeName, { template: tpl, prompt: "" });
  }

  return (
    <div className="flex min-h-screen flex-col items-center overflow-y-auto nice-scroll bg-bg px-6 py-14">
      <div className="flex w-full max-w-xl flex-col gap-8">

        {/* ── Logo ── */}
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="text-4xl">🥭</span>
          <h1 className="text-2xl font-bold tracking-tight">
            Mango<span className="text-accent-soft">AI</span>
          </h1>
          <p className="text-sm text-faint">Donne un nom à ton idée, on construit le reste.</p>
        </div>

        {/* ── Créer un projet ── */}
        <div className="rounded-2xl border border-edge bg-panel/80 p-4 shadow-lg shadow-black/20 backdrop-blur">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-faint">
            Nouveau projet
          </p>

          {/* Champ nom */}
          <div className="flex items-center gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
              placeholder="Mon projet — vitrine pour boutique de coiffure…"
              className="flex-1 rounded-xl border border-edge bg-bg px-4 py-3 text-[15px] placeholder:text-faint focus:border-accent focus:outline-none transition-colors"
              autoFocus
            />
            <button
              onClick={submit}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-white shadow-md shadow-accent/30 hover:opacity-90 transition"
              title="Créer le projet (Entrée)"
            >
              <Plus size={20} strokeWidth={2.5} />
            </button>
          </div>

          {/* Templates */}
          <div className="mt-4 flex flex-wrap gap-1.5">
            {available.map((t) => {
              const active = tpl === t.id;
              return (
                <div key={t.id} className="relative group">
                  <button
                    onClick={() => setTpl(t.id === tpl ? "" : t.id)}
                    className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                      active
                        ? "border-accent/60 bg-accent/15 text-ink"
                        : "border-edge bg-bg text-dim hover:border-faint hover:text-ink"
                    }`}
                  >
                    <t.icon size={12} className={active ? "text-accent-soft" : ""} />
                    {t.label}
                  </button>

                  {/* Popover au survol */}
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-52 -translate-x-1/2 translate-y-1 rounded-xl border border-edge bg-panel/95 p-3 shadow-xl shadow-black/40 opacity-0 backdrop-blur transition-all duration-150 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100">
                    <p className="mb-1 text-[9px] font-semibold uppercase tracking-widest text-faint">{t.family}</p>
                    <p className="mb-1 text-[13px] font-semibold text-ink leading-tight">{t.label}</p>
                    <p className="text-[11px] leading-snug text-dim">{t.hint}</p>
                    {t.examples.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {t.examples.map((ex) => (
                          <span key={ex} className="rounded-full border border-edge-soft bg-bg px-2 py-0.5 text-[10px] text-faint">
                            {ex}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="absolute -bottom-[5px] left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 border-b border-r border-edge bg-panel/95" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Tutoriels ── */}
        {onStartTutorial && (
          <div className="rounded-2xl border border-edge bg-panel/60 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GraduationCap size={16} className="text-accent-soft" />
                <p className="text-sm font-semibold text-ink">Tutoriels</p>
                <span className="rounded-full border border-edge px-2 py-0.5 text-[10px] text-faint">10 niveaux</span>
              </div>
              <button
                onClick={toggleTutorials}
                className="flex items-center gap-1 rounded-lg border border-edge px-2.5 py-1.5 text-xs text-dim hover:border-faint hover:text-ink transition-colors"
              >
                {nextTutorialId != null && nextTutorialId === 1 ? "Commencer" : nextTutorialId != null ? `Reprendre (${nextTutorialId}/10)` : "Voir tous"}
                <ChevronDown size={12} className={`transition-transform ${showTutorials ? "rotate-180" : ""}`} />
              </button>
            </div>

            {/* Accès rapide au prochain tuto */}
            {nextTutorialId != null && !showTutorials && (
              <button
                onClick={() => onStartTutorial(nextTutorialId)}
                className="mt-3 flex w-full items-center gap-3 rounded-xl border border-accent/30 bg-accent/[0.05] px-3 py-2.5 text-left hover:border-accent/60 hover:bg-accent/[0.09] transition-colors"
              >
                <span className="text-lg">🎓</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink">
                    {nextTutorialId === 1 ? "Découvrir MangoAI — Tutoriel 1" : `Tutoriel ${nextTutorialId}/10`}
                  </p>
                  <p className="text-[11px] text-faint">Cliquer pour démarrer</p>
                </div>
                <ArrowRight size={14} className="shrink-0 text-accent-soft" />
              </button>
            )}

            {/* Liste dépliable */}
            {showTutorials && (
              <div className="mt-3 flex flex-col gap-1 rounded-xl border border-edge bg-bg/60 p-1.5">
                {tutorialsList.length === 0 && (
                  <p className="py-2 text-center text-xs text-faint">Chargement…</p>
                )}
                {tutorialsList.map((t) => {
                  const done = tutorialsDone.includes(t.id);
                  const soon = t.stepCount === 0;
                  return (
                    <button
                      key={t.id}
                      disabled={soon}
                      onClick={() => onStartTutorial(t.id)}
                      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors ${
                        soon ? "cursor-not-allowed text-faint" : "text-ink hover:bg-edge-soft"
                      }`}
                    >
                      <span className="w-5 shrink-0 text-center font-mono text-xs text-faint">{t.id}</span>
                      <span className="min-w-0 flex-1 truncate">{t.title}</span>
                      {done && <Check size={12} className="shrink-0 text-accent-soft" />}
                      {soon ? (
                        <span className="shrink-0 rounded-full border border-edge px-1.5 text-[10px] text-faint">bientôt</span>
                      ) : (
                        <span className="shrink-0 text-[10px] text-faint">{done ? "Rejouer" : "→"}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Projets ── */}
        {projects.length > 0 && (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderOpen size={14} className="text-accent-soft" />
                <h2 className="text-xs font-semibold uppercase tracking-widest text-faint">
                  Projets
                </h2>
                <span className="rounded-full border border-edge px-2 py-0.5 text-[10px] text-faint">
                  {projects.length}
                </span>
              </div>
              {projects.length > 3 && (
                <div className="relative">
                  <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" />
                  <input
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setShowAll(true); }}
                    placeholder="Filtrer…"
                    className="h-7 w-32 rounded-lg border border-edge bg-panel pl-7 pr-2.5 text-xs text-dim placeholder:text-faint focus:border-accent focus:outline-none transition-colors"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {visible.map((p) => (
                <button
                  key={p}
                  onClick={() => onOpen(p, {})}
                  className="group flex items-center gap-2.5 rounded-xl border border-edge bg-panel/60 px-3.5 py-3 text-left hover:border-accent/50 hover:bg-panel transition-colors"
                >
                  <FolderOpen size={14} className="shrink-0 text-dim group-hover:text-accent-soft transition-colors" />
                  <span className="min-w-0 flex-1 truncate font-mono text-[13px] text-ink">{p}</span>
                  <ArrowRight size={12} className="shrink-0 text-faint group-hover:text-accent-soft transition-colors" />
                </button>
              ))}
            </div>

            {filtered.length > PROJECTS_VISIBLE && (
              <button
                onClick={() => setShowAll((v) => !v)}
                className="mt-2.5 w-full rounded-xl border border-edge py-2 text-xs text-faint hover:border-faint hover:text-dim transition-colors"
              >
                {showAll ? "Voir moins" : `Voir les ${filtered.length - PROJECTS_VISIBLE} autres projets`}
              </button>
            )}

            {search.trim() && filtered.length === 0 && (
              <p className="mt-4 text-center text-xs text-faint">Aucun projet ne correspond à « {search} »</p>
            )}
          </div>
        )}

        {/* État vide */}
        {projects.length === 0 && (
          <p className="text-center text-sm text-faint">
            Ton premier projet apparaîtra ici une fois créé.
          </p>
        )}

      </div>
    </div>
  );
}
