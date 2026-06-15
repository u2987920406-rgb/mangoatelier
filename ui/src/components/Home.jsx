import { useState } from "react";
import {
  ArrowUp,
  BarChart3,
  Clock,
  FileText,
  FolderOpen,
  Package,
  Search,
  ShoppingCart,
  Store,
} from "lucide-react";

const TEMPLATES = [
  { id: "", label: "Vierge", icon: Package, hint: "Page blanche" },
  { id: "vitrine", label: "Vitrine", icon: Store, hint: "Site d'entreprise" },
  { id: "ecommerce", label: "E-commerce", icon: ShoppingCart, hint: "Boutique en ligne" },
  { id: "dashboard", label: "Dashboard", icon: BarChart3, hint: "Tableau de bord" },
  { id: "blog", label: "Blog", icon: FileText, hint: "Articles & posts" },
];

const SUGGESTIONS = [
  "Une landing page pour ma pizzeria napolitaine",
  "Un portfolio de photographe minimaliste",
  "Un dashboard de suivi de dépenses",
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

export default function Home({ projects, templates, onOpen }) {
  const [prompt, setPrompt] = useState("");
  const [name, setName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [tpl, setTpl] = useState("");
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);

  const available = TEMPLATES.filter((t) => t.id === "" || templates.includes(t.id));
  const effectiveName = (nameTouched ? name : slugify(prompt)) || "mon-app";

  const lastProject = projects[0] ?? null;
  const filtered = search.trim()
    ? projects.filter((p) => p.toLowerCase().includes(search.toLowerCase()))
    : projects;
  const visible = showAll ? filtered : filtered.slice(0, PROJECTS_VISIBLE);

  function submit() {
    if (!prompt.trim()) return;
    onOpen(effectiveName, { template: tpl, prompt: prompt.trim() });
  }

  return (
    <div className="hero-glow flex min-h-screen flex-col items-center overflow-y-auto nice-scroll px-6 py-16">
      <div className="flex w-full max-w-2xl flex-col items-center">

        {/* Hero */}
        <div className="animate-fade-up text-6xl">🥭</div>
        <h1 className="animate-fade-up mt-4 text-4xl font-extrabold tracking-tight">
          Mango<span className="text-accent-soft">AI</span>
        </h1>
        <p className="animate-fade-up mt-3 text-lg text-dim">
          Décris ton idée, on la construit.
        </p>

        {/* Accès rapide — dernier projet */}
        {lastProject && (
          <div className="animate-fade-up mt-6 w-full">
            <button
              onClick={() => onOpen(lastProject, {})}
              className="flex w-full items-center gap-3 rounded-2xl border border-accent/30 bg-accent/[0.04] px-4 py-3 text-left hover:border-accent/60 hover:bg-accent/[0.07] transition-colors"
            >
              <Clock size={15} className="shrink-0 text-accent-soft" />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-faint">Reprendre</p>
                <p className="truncate font-mono text-sm text-ink">{lastProject}</p>
              </div>
              <ArrowUp size={14} className="ml-auto shrink-0 rotate-90 text-accent-soft" />
            </button>
          </div>
        )}

        {/* Prompt card */}
        <div className="animate-fade-up mt-5 w-full rounded-2xl border border-edge bg-panel/80 p-3 shadow-2xl shadow-black/30 backdrop-blur focus-within:border-accent/60 transition-colors">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Une landing page pour ma pizzeria, avec le menu et un formulaire de réservation…"
            rows={3}
            className="w-full resize-none bg-transparent text-[15px] leading-relaxed placeholder:text-faint focus:outline-none"
          />
          <div className="mt-2 flex items-center gap-2">
            <input
              value={effectiveName}
              onChange={(e) => {
                setNameTouched(true);
                setName(slugify(e.target.value) || e.target.value);
              }}
              spellCheck={false}
              placeholder="nom-du-projet"
              className="h-8 w-44 rounded-lg border border-edge bg-bg px-2.5 font-mono text-xs text-dim focus:border-accent focus:text-ink focus:outline-none transition-colors"
              title="Nom du projet (dossier de travail)"
            />
            <button
              onClick={submit}
              disabled={!prompt.trim()}
              className="ml-auto flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-white shadow-lg shadow-accent/30 hover:bg-accent-soft disabled:opacity-30 disabled:shadow-none transition"
              title="Créer (Entrée)"
            >
              <ArrowUp size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Templates */}
        <div className="animate-fade-up mt-5 flex w-full flex-wrap justify-center gap-2">
          {available.map((t) => {
            const active = tpl === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTpl(t.id)}
                className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-[13px] transition-colors ${
                  active
                    ? "border-accent/60 bg-accent/15 text-ink"
                    : "border-edge bg-panel/60 text-dim hover:border-faint hover:text-ink"
                }`}
                title={t.hint}
              >
                <t.icon size={15} className={active ? "text-accent-soft" : ""} />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Suggestions */}
        <div className="animate-fade-up mt-4 flex flex-wrap justify-center gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setPrompt(s)}
              className="rounded-full border border-edge-soft px-3 py-1.5 text-xs text-faint hover:border-faint hover:text-dim transition-colors"
            >
              {s}
            </button>
          ))}
        </div>

        {/* Projets */}
        {projects.length > 0 && (
          <div className="animate-fade-up mt-12 w-full">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-faint">
                Projets{projects.length > 1 ? ` · ${projects.length}` : ""}
              </h2>
              {projects.length > 3 && (
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" />
                  <input
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setShowAll(true); }}
                    placeholder="Filtrer…"
                    className="h-7 w-36 rounded-lg border border-edge bg-panel pl-7 pr-2.5 text-xs text-dim placeholder:text-faint focus:border-accent focus:outline-none transition-colors"
                  />
                </div>
              )}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {visible.map((p) => (
                <button
                  key={p}
                  onClick={() => onOpen(p, {})}
                  className="group flex items-center gap-2.5 rounded-xl border border-edge bg-panel/60 px-3.5 py-3 text-left hover:border-accent/50 transition-colors"
                >
                  <FolderOpen size={16} className="shrink-0 text-dim group-hover:text-accent-soft transition-colors" />
                  <span className="truncate font-mono text-[13px]">{p}</span>
                </button>
              ))}
            </div>

            {filtered.length > PROJECTS_VISIBLE && (
              <button
                onClick={() => setShowAll((v) => !v)}
                className="mt-3 w-full rounded-xl border border-edge py-2 text-xs text-faint hover:border-faint hover:text-dim transition-colors"
              >
                {showAll
                  ? "Voir moins"
                  : `Voir les ${filtered.length - PROJECTS_VISIBLE} autres projets`}
              </button>
            )}

            {search.trim() && filtered.length === 0 && (
              <p className="mt-4 text-center text-xs text-faint">Aucun projet ne correspond à « {search} »</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
