import { useCallback, useEffect, useState } from "react";
import Chat from "./Chat.jsx";
import Preview from "./Preview.jsx";

export default function App() {
  // Project and model survive a page reload — otherwise a refresh silently
  // switches back to the default project and its (different) chat history.
  const [projectName, setProjectName] = useState(
    () => localStorage.getItem("mangoai.project") ?? "mon-app",
  );
  const [projects, setProjects] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [template, setTemplate] = useState(""); // applied only when the project gets created
  const [model, setModel] = useState(() => localStorage.getItem("mangoai.model") ?? "sonnet");

  useEffect(() => {
    localStorage.setItem("mangoai.project", projectName);
  }, [projectName]);

  // Auto-start the preview of the selected project (debounced: the input
  // fires on every keystroke). 404 for not-yet-created projects is fine.
  useEffect(() => {
    if (!projectName.trim()) return;
    const t = setTimeout(() => {
      fetch(`/api/preview/${encodeURIComponent(projectName)}`, { method: "POST" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d?.url) {
            setPreviewUrl(d.url);
            setPreviewKey((k) => k + 1);
          }
        })
        .catch(() => {});
    }, 400);
    return () => clearTimeout(t);
  }, [projectName]);
  useEffect(() => {
    localStorage.setItem("mangoai.model", model);
  }, [model]);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewKey, setPreviewKey] = useState(0); // bump to force iframe reload
  const [cost, setCost] = useState(0);
  const [versions, setVersions] = useState([]);
  const [previewErrors, setPreviewErrors] = useState([]);
  const [fixRequest, setFixRequest] = useState(null);
  const [deploying, setDeploying] = useState(false);
  const [deployedUrl, setDeployedUrl] = useState(null);

  useEffect(() => {
    setDeployedUrl(null);
  }, [projectName]);

  async function deploy() {
    if (deploying) return;
    setDeploying(true);
    try {
      const res = await fetch(`/api/deploy/${encodeURIComponent(projectName)}`, {
        method: "POST",
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(d.error ?? `Erreur HTTP ${res.status}`);
        return;
      }
      setDeployedUrl(d.url);
    } catch (err) {
      alert(String(err));
    } finally {
      setDeploying(false);
    }
  }

  // Runtime errors reported by the generated app (error-relay script)
  useEffect(() => {
    const onMessage = (e) => {
      const d = e.data;
      if (!d || d.source !== "mangoai-preview" || !d.message) return;
      setPreviewErrors((prev) =>
        prev.includes(d.message) || prev.length >= 10 ? prev : [...prev, d.message],
      );
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    setPreviewErrors([]);
  }, [projectName]);

  function requestFix() {
    if (previewErrors.length === 0) return;
    const list = previewErrors.map((e) => `- ${e}`).join("\n");
    setFixRequest(`Corrige ces erreurs détectées dans l'aperçu de l'app :\n${list}`);
    setPreviewErrors([]);
  }

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((d) => {
        setProjects(d.projects ?? []);
        setTemplates(d.templates ?? []);
      })
      .catch(() => {});
  }, []);

  const refreshVersions = useCallback(() => {
    if (!projectName.trim()) {
      setVersions([]);
      return;
    }
    fetch(`/api/versions/${encodeURIComponent(projectName)}`)
      .then((r) => (r.ok ? r.json() : { versions: [] }))
      .then((d) => setVersions(d.versions ?? []))
      .catch(() => setVersions([]));
  }, [projectName]);

  useEffect(() => {
    refreshVersions();
  }, [refreshVersions]);

  async function rollback(hash) {
    const v = versions.find((x) => x.hash === hash);
    if (!v) return;
    const ok = confirm(
      `Revenir à « ${v.message} » ?\nLes versions plus récentes seront perdues.`,
    );
    if (!ok) return;
    try {
      const res = await fetch("/api/rollback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectName, hash }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(d.error ?? `Erreur HTTP ${res.status}`);
        return;
      }
      setVersions(d.versions ?? []);
      setPreviewKey((k) => k + 1);
    } catch (err) {
      alert(String(err));
    }
  }

  return (
    <div className="app">
      <header className="header">
        <span className="logo">🥭 MangoAI</span>
        <input
          className="project-input"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          placeholder="nom-du-projet"
          spellCheck={false}
          list="projects-list"
        />
        <datalist id="projects-list">
          {projects.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
        {!projects.includes(projectName) && templates.length > 0 && (
          <select
            className="template-select"
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            title="Template de départ du nouveau projet"
          >
            <option value="">📦 Vierge</option>
            {templates.map((t) => (
              <option key={t} value={t}>
                {TEMPLATE_LABELS[t] ?? `📦 ${t}`}
              </option>
            ))}
          </select>
        )}
        <select
          className="model-select"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          title="Modèle utilisé par l'agent"
        >
          <option value="haiku">⚡ Haiku — rapide, simple</option>
          <option value="sonnet">⚖️ Sonnet — équilibré</option>
          <option value="opus">🧠 Opus — puissant, plus cher</option>
        </select>
        <select
          className="versions-select"
          value=""
          onChange={(e) => e.target.value && rollback(e.target.value)}
          disabled={versions.length === 0}
          title="Revenir à une version antérieure du projet"
        >
          <option value="">↩ Versions ({versions.length})</option>
          {versions.map((v) => (
            <option key={v.hash} value={v.hash}>
              {formatVersion(v)}
            </option>
          ))}
        </select>
        <a
          className="export-btn"
          href={`/api/export/${encodeURIComponent(projectName)}`}
          download
          title="Télécharger le code du projet (zip, sans node_modules)"
        >
          ⬇ Zip
        </a>
        {projects.includes(projectName) && (
          <button
            className="deploy-btn"
            onClick={deploy}
            disabled={deploying}
            title="Publier le site en ligne (Cloudflare Pages)"
          >
            {deploying ? "⏳ Publication…" : "🚀 Publier"}
          </button>
        )}
        {deployedUrl && (
          <a className="deployed-link" href={deployedUrl} target="_blank" rel="noreferrer">
            🌍 {deployedUrl.replace("https://", "")}
          </a>
        )}
        <span className="cost">Coût session : ${cost.toFixed(4)}</span>
      </header>
      <div className="columns">
        <Chat
          projectName={projectName}
          model={model}
          template={template}
          onPreviewUrl={setPreviewUrl}
          onCost={(c) => setCost((prev) => prev + c)}
          onAgentDone={() => {
            setPreviewErrors([]); // the reloaded iframe re-reports anything still broken
            setPreviewKey((k) => k + 1);
            refreshVersions();
          }}
          autoPrompt={fixRequest}
          onAutoPromptConsumed={() => setFixRequest(null)}
        />
        <Preview
          url={previewUrl}
          reloadKey={previewKey}
          errors={previewErrors}
          onFix={requestFix}
        />
      </div>
    </div>
  );
}

const TEMPLATE_LABELS = {
  vitrine: "🏪 Vitrine",
  ecommerce: "🛒 E-commerce",
  dashboard: "📊 Dashboard",
  blog: "📝 Blog",
};

function formatVersion(v) {
  const date = new Date(v.date).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const msg = v.message.length > 42 ? `${v.message.slice(0, 42)}…` : v.message;
  return `${date} — ${msg}`;
}
