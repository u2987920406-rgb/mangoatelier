import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Check, FolderOpen, Loader2, Palette, Pencil, Plus, RefreshCw, Sparkles, User, Wrench, X } from "lucide-react";

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

  const empty = !data.memory && !data.profile && data.skills.length === 0 && !data.axioms && !data.designSystem;
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
      {data.axioms && (
        <Section icon={RefreshCw} title="Axiomes (flywheel)">
          <div className="md text-xs leading-relaxed">
            <ReactMarkdown>{stripFrontmatter(data.axioms)}</ReactMarkdown>
          </div>
        </Section>
      )}

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

function Section({ icon: Icon, title, children, action = null }) {
  return (
    <section className="rounded-lg px-2 py-2">
      <h3 className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-faint">
        <Icon size={12} />
        {title}
        {action && <span className="ml-auto">{action}</span>}
      </h3>
      {children}
    </section>
  );
}
