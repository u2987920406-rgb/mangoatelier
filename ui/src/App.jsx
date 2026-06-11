import { useState } from "react";
import Chat from "./Chat.jsx";
import Preview from "./Preview.jsx";

export default function App() {
  const [projectName, setProjectName] = useState("mon-app");
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewKey, setPreviewKey] = useState(0); // bump to force iframe reload
  const [cost, setCost] = useState(0);

  return (
    <div className="app">
      <header className="header">
        <span className="logo">✨ Mini-Lovable</span>
        <input
          className="project-input"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          placeholder="nom-du-projet"
          spellCheck={false}
        />
        <span className="cost">Coût session : ${cost.toFixed(4)}</span>
      </header>
      <div className="columns">
        <Chat
          projectName={projectName}
          onPreviewUrl={setPreviewUrl}
          onCost={(c) => setCost((prev) => prev + c)}
          onAgentDone={() => setPreviewKey((k) => k + 1)}
        />
        <Preview url={previewUrl} reloadKey={previewKey} />
      </div>
    </div>
  );
}
