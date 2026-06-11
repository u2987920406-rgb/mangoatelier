import { useCallback, useEffect, useState } from "react";
import Chat from "./Chat.jsx";
import Preview from "./Preview.jsx";

export default function App() {
  const [projectName, setProjectName] = useState("mon-app");
  const [projects, setProjects] = useState([]);
  const [model, setModel] = useState("sonnet");
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewKey, setPreviewKey] = useState(0); // bump to force iframe reload
  const [cost, setCost] = useState(0);
  const [versions, setVersions] = useState([]);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((d) => setProjects(d.projects ?? []))
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
        <span className="cost">Coût session : ${cost.toFixed(4)}</span>
      </header>
      <div className="columns">
        <Chat
          projectName={projectName}
          model={model}
          onPreviewUrl={setPreviewUrl}
          onCost={(c) => setCost((prev) => prev + c)}
          onAgentDone={() => {
            setPreviewKey((k) => k + 1);
            refreshVersions();
          }}
        />
        <Preview url={previewUrl} reloadKey={previewKey} />
      </div>
    </div>
  );
}

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
