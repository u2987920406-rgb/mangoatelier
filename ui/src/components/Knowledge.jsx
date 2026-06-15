import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Blocks, BrainCircuit, Check, Clipboard, ClipboardCheck, Compass, FolderOpen, GitBranch, Languages, Loader2, Lock, Palette, Pencil, Plus, RefreshCw, Sparkles, User, Wrench, X } from "lucide-react";

// The reviewer sometimes writes a YAML frontmatter header — metadata, not
// content; hide it from the rendered view.
const stripFrontmatter = (text) => text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "").trim();

// Dropdown body showing what MangoAI has learned. Mounted only while the menu
// is open, so it re-fetches and is always fresh (the background review may
// have updated the stores seconds after the last turn).
export default function Knowledge({ projectName }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", body: "" });
  const [saving, setSaving] = useState(false);
  // Design system inline editor
  const [editingDS, setEditingDS] = useState(false);
  const [dsDraft, setDsDraft] = useState("");
  const [savingDS, setSavingDS] = useState(false);
  // Architecture map inline editor
  const [editingArch, setEditingArch] = useState(false);
  const [archDraft, setArchDraft] = useState("");
  const [savingArch, setSavingArch] = useState(false);
  // Component library (idée #36)
  const [expandedComponent, setExpandedComponent] = useState(null);
  const [componentCode, setComponentCode] = useState({});
  const [loadingComponent, setLoadingComponent] = useState(null);
  const [copiedComponent, setCopiedComponent] = useState(null);
  const [creatingComponent, setCreatingComponent] = useState(false);
  const [componentForm, setComponentForm] = useState({ name: "", description: "", tags: "", code: "" });
  const [savingComponent, setSavingComponent] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(`/api/knowledge/${encodeURIComponent(projectName)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`Erreur HTTP ${r.status}`))))
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e.message ?? String(e)));
    return () => {
      alive = false;
    };
  }, [projectName]);

  const skillForm = (
    <div className="border-t border-edge mt-1 pt-1 px-1 pb-1">
      {!creating ? (
        <button
          onClick={() => setCreating(true)}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-xs text-faint hover:bg-edge-soft hover:text-dim transition-colors"
        >
          <Plus size={13} />
          Créer une skill manuellement
        </button>
      ) : (
        <div className="space-y-2 py-1">
          <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-faint">Nouvelle skill</p>
          <input
            placeholder="Nom (ex: carousel-react)"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full rounded-lg border border-edge bg-bg px-2.5 py-1.5 text-xs text-ink placeholder:text-faint focus:border-accent focus:outline-none transition-colors"
          />
          <input
            placeholder="Description courte"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className="w-full rounded-lg border border-edge bg-bg px-2.5 py-1.5 text-xs text-ink placeholder:text-faint focus:border-accent focus:outline-none transition-colors"
          />
          <textarea
            placeholder="Contenu de la skill (règles, exemples, code...)"
            value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            rows={4}
            className="w-full resize-none rounded-lg border border-edge bg-bg px-2.5 py-1.5 text-xs text-ink placeholder:text-faint focus:border-accent focus:outline-none transition-colors"
          />
          <div className="flex gap-2">
            <button
              onClick={() => { setCreating(false); setForm({ name: "", description: "", body: "" }); }}
              className="flex-1 rounded-lg border border-edge py-1.5 text-xs text-dim hover:text-ink transition-colors"
            >
              Annuler
            </button>
            <button
              disabled={!form.name.trim() || !form.body.trim() || saving}
              onClick={async () => {
                setSaving(true);
                try {
                  await fetch("/api/skill", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(form),
                  });
                  setCreating(false);
                  setForm({ name: "", description: "", body: "" });
                  // Refresh data
                  fetch(`/api/knowledge/${encodeURIComponent(projectName)}`)
                    .then((r) => r.ok ? r.json() : null)
                    .then((d) => d && setData(d))
                    .catch(() => {});
                } finally {
                  setSaving(false);
                }
              }}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent py-1.5 text-xs font-semibold text-white hover:bg-accent-soft disabled:opacity-40 transition-colors"
            >
              <Sparkles size={12} />
              {saving ? "Création…" : "Créer"}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  if (error) {
    return (
      <div>
        <p className="px-3 py-3 text-xs text-dim">⚠ {error}</p>
        {skillForm}
      </div>
    );
  }
  if (!data) {
    return (
      <div className="flex items-center justify-center py-6 text-dim">
        <Loader2 size={16} className="animate-spin" />
      </div>
    );
  }

  const id = data.identity || { language: "", thinking: "", vision: "" };
  const hasIdentity = id.language || id.thinking || id.vision;
  const components = data.components || [];
  const empty =
    !data.memory && !data.profile && data.skills.length === 0 && !data.axioms &&
    !data.designSystem && !data.architecture && !hasIdentity && components.length === 0;
  if (empty) {
    return (
      <div>
        <p className="px-3 py-3 text-xs leading-relaxed text-dim">
          MangoAI n'a encore rien appris ici. La mémoire se remplit toute seule,
          en arrière-plan, après chaque tâche.
        </p>
        {skillForm}
      </div>
    );
  }

  return (
    <div className="space-y-1 px-1 py-1">
      {data.memory && (
        <Section icon={FolderOpen} title="Ce projet">
          <div className="md text-xs leading-relaxed">
            <ReactMarkdown>{stripFrontmatter(data.memory)}</ReactMarkdown>
          </div>
        </Section>
      )}
      {data.profile && (
        <Section icon={User} title="Vous — tous projets">
          <div className="md text-xs leading-relaxed">
            <ReactMarkdown>{stripFrontmatter(data.profile)}</ReactMarkdown>
          </div>
        </Section>
      )}
      {data.skills.length > 0 && (
        <Section icon={Wrench} title="Skills apprises">
          <ul className="space-y-1.5">
            {data.skills.map((s) => (
              <li key={s.name} className="text-xs leading-snug">
                <span className="font-mono text-ink">{s.name}</span>
                {s.description && <span className="block text-dim">{s.description}</span>}
              </li>
            ))}
          </ul>
        </Section>
      )}
      {/* Idée #36 — Bibliothèque de composants inter-projets */}
      <Section
        icon={Blocks}
        title="Composants réutilisables"
        action={
          <span className="text-[10px] font-medium text-faint">{components.length > 0 ? `${components.length}` : ""}</span>
        }
      >
        {components.length === 0 ? (
          <p className="text-xs text-faint italic">
            Vide — l'agent sauvegarde automatiquement les composants réutilisables qu'il crée.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {components.map((c) => (
              <li key={c.name} className="text-xs">
                <button
                  onClick={async () => {
                    if (expandedComponent === c.name) {
                      setExpandedComponent(null);
                      return;
                    }
                    setExpandedComponent(c.name);
                    if (!componentCode[c.name]) {
                      setLoadingComponent(c.name);
                      try {
                        const r = await fetch(`/api/components/${encodeURIComponent(c.name)}`);
                        if (r.ok) {
                          const d = await r.json();
                          setComponentCode((prev) => ({ ...prev, [c.name]: d.code }));
                        }
                      } finally {
                        setLoadingComponent(null);
                      }
                    }
                  }}
                  className="flex w-full items-start gap-1.5 rounded-lg px-1.5 py-1 text-left hover:bg-edge-soft transition-colors"
                >
                  <span className="font-mono font-semibold text-ink">{c.name}</span>
                  {c.description && <span className="text-dim truncate flex-1">{c.description}</span>}
                </button>
                {c.tags?.length > 0 && (
                  <div className="ml-1.5 mt-0.5 flex flex-wrap gap-1">
                    {c.tags.map((t) => (
                      <span key={t} className="rounded bg-edge-soft px-1.5 py-0.5 text-[10px] text-faint">{t}</span>
                    ))}
                  </div>
                )}
                {expandedComponent === c.name && (
                  <div className="mt-1.5 ml-1.5 space-y-1">
                    {loadingComponent === c.name ? (
                      <Loader2 size={12} className="animate-spin text-faint" />
                    ) : componentCode[c.name] ? (
                      <>
                        <pre className="max-h-48 overflow-auto rounded-lg border border-edge bg-bg p-2 text-[10px] leading-relaxed font-mono text-ink whitespace-pre-wrap">
                          {componentCode[c.name]}
                        </pre>
                        <button
                          onClick={async () => {
                            await navigator.clipboard.writeText(componentCode[c.name]);
                            setCopiedComponent(c.name);
                            setTimeout(() => setCopiedComponent(null), 2000);
                          }}
                          className="flex items-center gap-1 rounded-lg border border-edge px-2 py-1 text-[10px] text-dim hover:text-ink transition-colors"
                        >
                          {copiedComponent === c.name ? <ClipboardCheck size={11} className="text-accent" /> : <Clipboard size={11} />}
                          {copiedComponent === c.name ? "Copié !" : "Copier le code"}
                        </button>
                      </>
                    ) : null}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        {/* Formulaire d'ajout manuel */}
        <div className="border-t border-edge mt-1 pt-1">
          {!creatingComponent ? (
            <button
              onClick={() => setCreatingComponent(true)}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-xs text-faint hover:bg-edge-soft hover:text-dim transition-colors"
            >
              <Plus size={13} />
              Ajouter un composant manuellement
            </button>
          ) : (
            <div className="space-y-2 py-1">
              <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-faint">Nouveau composant</p>
              <input
                placeholder="Nom PascalCase (ex: SearchBar)"
                value={componentForm.name}
                onChange={(e) => setComponentForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-lg border border-edge bg-bg px-2.5 py-1.5 text-xs text-ink placeholder:text-faint focus:border-accent focus:outline-none transition-colors"
              />
              <input
                placeholder="Description courte"
                value={componentForm.description}
                onChange={(e) => setComponentForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full rounded-lg border border-edge bg-bg px-2.5 py-1.5 text-xs text-ink placeholder:text-faint focus:border-accent focus:outline-none transition-colors"
              />
              <input
                placeholder="Tags séparés par des virgules (ex: form, input)"
                value={componentForm.tags}
                onChange={(e) => setComponentForm((f) => ({ ...f, tags: e.target.value }))}
                className="w-full rounded-lg border border-edge bg-bg px-2.5 py-1.5 text-xs text-ink placeholder:text-faint focus:border-accent focus:outline-none transition-colors"
              />
              <textarea
                placeholder="Code JSX/TSX du composant"
                value={componentForm.code}
                onChange={(e) => setComponentForm((f) => ({ ...f, code: e.target.value }))}
                rows={5}
                className="w-full resize-none rounded-lg border border-edge bg-bg px-2.5 py-1.5 font-mono text-xs text-ink placeholder:text-faint focus:border-accent focus:outline-none transition-colors"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { setCreatingComponent(false); setComponentForm({ name: "", description: "", tags: "", code: "" }); }}
                  className="flex-1 rounded-lg border border-edge py-1.5 text-xs text-dim hover:text-ink transition-colors"
                >
                  Annuler
                </button>
                <button
                  disabled={!componentForm.name.trim() || !componentForm.code.trim() || savingComponent}
                  onClick={async () => {
                    setSavingComponent(true);
                    try {
                      await fetch("/api/components", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          meta: {
                            name: componentForm.name.trim(),
                            description: componentForm.description.trim(),
                            tags: componentForm.tags.split(",").map((t) => t.trim()).filter(Boolean),
                            props: [],
                            usedIn: [],
                          },
                          code: componentForm.code.trim(),
                        }),
                      });
                      setCreatingComponent(false);
                      setComponentForm({ name: "", description: "", tags: "", code: "" });
                      fetch(`/api/knowledge/${encodeURIComponent(projectName)}`)
                        .then((r) => r.ok ? r.json() : null)
                        .then((d) => d && setData(d))
                        .catch(() => {});
                    } finally {
                      setSavingComponent(false);
                    }
                  }}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent py-1.5 text-xs font-semibold text-white hover:bg-accent-soft disabled:opacity-40 transition-colors"
                >
                  <Blocks size={12} />
                  {savingComponent ? "Ajout…" : "Ajouter"}
                </button>
              </div>
            </div>
          )}
        </div>
      </Section>

      {data.axioms && (
        <Section icon={RefreshCw} title="Axiomes (flywheel)">
          <div className="md text-xs leading-relaxed">
            <ReactMarkdown>{stripFrontmatter(data.axioms)}</ReactMarkdown>
          </div>
        </Section>
      )}

      {/* Chantier #38 — Carte d'architecture vivante (par projet) */}
      {(data.architecture || true) && (
        <Section
          icon={GitBranch}
          title="Architecture"
          action={
            !editingArch ? (
              <button
                onClick={() => { setArchDraft(data.architecture || ""); setEditingArch(true); }}
                className="rounded p-0.5 text-faint hover:text-ink transition-colors"
                title="Modifier la carte d'architecture"
              >
                <Pencil size={11} />
              </button>
            ) : null
          }
        >
          {!editingArch ? (
            data.architecture ? (
              <div className="md text-xs leading-relaxed">
                <ReactMarkdown>{stripFrontmatter(data.architecture)}</ReactMarkdown>
              </div>
            ) : (
              <p className="text-xs text-faint italic">
                Vide — l'agent remplit automatiquement cette carte après chaque changement structurel.
              </p>
            )
          ) : (
            <div className="space-y-2">
              <textarea
                value={archDraft}
                onChange={(e) => setArchDraft(e.target.value)}
                rows={8}
                placeholder={"## Stack\n- React + Vite + Tailwind v4\n\n## Composants\n- Header : navigation\n- Hero : section principale\n\n## API\n- (aucune pour l'instant)"}
                className="w-full resize-y rounded-lg border border-edge bg-bg px-2.5 py-1.5 font-mono text-xs text-ink placeholder:text-faint focus:border-accent focus:outline-none transition-colors"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingArch(false)}
                  className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-edge py-1.5 text-xs text-dim hover:text-ink transition-colors"
                >
                  <X size={11} /> Annuler
                </button>
                <button
                  disabled={savingArch}
                  onClick={async () => {
                    setSavingArch(true);
                    try {
                      await fetch(`/api/architecture/${encodeURIComponent(projectName)}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ content: archDraft }),
                      });
                      setData((d) => ({ ...d, architecture: archDraft }));
                      setEditingArch(false);
                    } finally {
                      setSavingArch(false);
                    }
                  }}
                  className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-accent py-1.5 text-xs font-semibold text-white hover:bg-accent-soft disabled:opacity-40 transition-colors"
                >
                  {savingArch ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                  {savingArch ? "Sauvegarde…" : "Sauvegarder"}
                </button>
              </div>
            </div>
          )}
        </Section>
      )}

      {/* Idée #42 — Couches d'identité (cross-projet) */}
      <IdentityLayer
        icon={Languages}
        title="Vocabulaire personnel"
        layer="language"
        value={id.language}
        placeholder={"## Raccourcis\n- \"on attaque\" = implémente maintenant\n- \"on creuse\" = approfondir sans coder\n\n## Erreurs de transcription\n- \"Obama\" = Ollama"}
        emptyHint="Vide — la revue en arrière-plan détecte tes formulations récurrentes."
        onSaved={(v) => setData((d) => ({ ...d, identity: { ...(d.identity || {}), language: v } }))}
      />
      <IdentityLayer
        icon={BrainCircuit}
        title="Style de pensée"
        layer="thinking"
        value={id.thinking}
        placeholder={"## Décision\n- Explore avant d'agir\n- Valide par la logique\n- Pense en analogies\n- Questionne avant d'accepter"}
        emptyHint="Vide — la revue en arrière-plan détecte tes patterns de décision."
        onSaved={(v) => setData((d) => ({ ...d, identity: { ...(d.identity || {}), thinking: v } }))}
      />
      <IdentityLayer
        icon={Compass}
        title="Vision validée"
        layer="vision"
        value={id.vision}
        manual
        placeholder={"## Patterns validés\n- (ajoute ici ce que tu veux garder et réutiliser)"}
        emptyHint="Vide — 100% manuel. Note ici les approches et patterns que tu valides explicitement ; MangoAI n'y écrit jamais seul."
        onSaved={(v) => setData((d) => ({ ...d, identity: { ...(d.identity || {}), vision: v } }))}
      />

      {/* Chantier A — Design system persistant (cross-projet) */}
      <Section
        icon={Palette}
        title="Design system"
        action={
          !editingDS ? (
            <button
              onClick={() => { setDsDraft(data.designSystem || ""); setEditingDS(true); }}
              className="rounded p-0.5 text-faint hover:text-ink transition-colors"
              title="Modifier le design system"
            >
              <Pencil size={11} />
            </button>
          ) : null
        }
      >
        {!editingDS ? (
          data.designSystem ? (
            <div className="md text-xs leading-relaxed">
              <ReactMarkdown>{stripFrontmatter(data.designSystem)}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-xs text-faint italic">
              Vide — l'agent le remplit quand tu valides un choix visuel, ou clique ✏ pour initialiser.
            </p>
          )
        ) : (
          <div className="space-y-2">
            <textarea
              value={dsDraft}
              onChange={(e) => setDsDraft(e.target.value)}
              rows={8}
              placeholder={"## Palette\n- Primaire : #6366f1\n\n## Typographie\n- Police : Inter\n\n## Conventions\n- Arrondis : 8px"}
              className="w-full resize-y rounded-lg border border-edge bg-bg px-2.5 py-1.5 font-mono text-xs text-ink placeholder:text-faint focus:border-accent focus:outline-none transition-colors"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setEditingDS(false)}
                className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-edge py-1.5 text-xs text-dim hover:text-ink transition-colors"
              >
                <X size={11} /> Annuler
              </button>
              <button
                disabled={savingDS}
                onClick={async () => {
                  setSavingDS(true);
                  try {
                    await fetch("/api/design-system", {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ content: dsDraft }),
                    });
                    setData((d) => ({ ...d, designSystem: dsDraft }));
                    setEditingDS(false);
                  } finally {
                    setSavingDS(false);
                  }
                }}
                className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-accent py-1.5 text-xs font-semibold text-white hover:bg-accent-soft disabled:opacity-40 transition-colors"
              >
                {savingDS ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                {savingDS ? "Sauvegarde…" : "Sauvegarder"}
              </button>
            </div>
          </div>
        )}
      </Section>

      {skillForm}
    </div>
  );
}

// Idée #42 — one editable identity layer (inline editor, same pattern as the
// Design system / Architecture sections). `manual` adds a "Manuel" badge for
// .vision.md, which the background review never curates.
function IdentityLayer({ icon, title, layer, value, placeholder, emptyHint, manual = false, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  return (
    <Section
      icon={icon}
      title={title}
      badge={manual ? <span className="flex items-center gap-1 rounded bg-edge-soft px-1.5 py-0.5 text-[10px] font-medium text-dim"><Lock size={9} /> Manuel</span> : null}
      action={
        !editing ? (
          <button
            onClick={() => { setDraft(value || ""); setEditing(true); }}
            className="rounded p-0.5 text-faint hover:text-ink transition-colors"
            title={`Modifier — ${title}`}
          >
            <Pencil size={11} />
          </button>
        ) : null
      }
    >
      {!editing ? (
        value ? (
          <div className="md text-xs leading-relaxed">
            <ReactMarkdown>{stripFrontmatter(value)}</ReactMarkdown>
          </div>
        ) : (
          <p className="text-xs text-faint italic">{emptyHint}</p>
        )
      ) : (
        <div className="space-y-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={8}
            placeholder={placeholder}
            className="w-full resize-y rounded-lg border border-edge bg-bg px-2.5 py-1.5 font-mono text-xs text-ink placeholder:text-faint focus:border-accent focus:outline-none transition-colors"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setEditing(false)}
              className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-edge py-1.5 text-xs text-dim hover:text-ink transition-colors"
            >
              <X size={11} /> Annuler
            </button>
            <button
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                try {
                  await fetch(`/api/identity/${layer}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ content: draft }),
                  });
                  onSaved(draft);
                  setEditing(false);
                } finally {
                  setSaving(false);
                }
              }}
              className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-accent py-1.5 text-xs font-semibold text-white hover:bg-accent-soft disabled:opacity-40 transition-colors"
            >
              {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
              {saving ? "Sauvegarde…" : "Sauvegarder"}
            </button>
          </div>
        </div>
      )}
    </Section>
  );
}

function Section({ icon: Icon, title, children, action = null, badge = null }) {
  return (
    <section className="rounded-lg px-2 py-2">
      <h3 className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-faint">
        <Icon size={12} />
        {title}
        {badge}
        {action && <span className="ml-auto">{action}</span>}
      </h3>
      {children}
    </section>
  );
}
