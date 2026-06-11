import { useEffect, useState } from "react";
import Chat from "./Chat.jsx";
import Preview from "./Preview.jsx";

export default function App() {
  const [projectName, setProjectName] = useState("mon-app");
  const [projects, setProjects] = useState([]);
  const [model, setModel] = useState("sonnet");
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewKey, setPreviewKey] = useState(0); // bump to force iframe reload
  const [cost, setCost] = useState(0);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((d) => setProjects(d.projects ?? []))
      .catch(() => {});
  }, []);

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
          onAgentDone={() => setPreviewKey((k) => k + 1)}
        />
        <Preview url={previewUrl} reloadKey={previewKey} />
      </div>
    </div>
  );
}
