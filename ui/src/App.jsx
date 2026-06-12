import { useCallback, useEffect, useRef, useState } from "react";
import Chat from "./Chat.jsx";
import Preview from "./Preview.jsx";
import Home from "./components/Home.jsx";
import Header from "./components/Header.jsx";
import Toasts from "./components/Toast.jsx";
import ConfirmModal from "./components/ConfirmModal.jsx";

export default function App() {
  const [screen, setScreen] = useState("home");
  // Project and model survive a page reload — otherwise a refresh silently
  // switches back to the default project and its (different) chat history.
  const [projectName, setProjectName] = useState(
    () => localStorage.getItem("mangoai.project") ?? "mon-app",
  );
  const [projects, setProjects] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [template, setTemplate] = useState(""); // applied only when the project gets created
  const [model, setModel] = useState(() => localStorage.getItem("mangoai.model") ?? "sonnet");
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewKey, setPreviewKey] = useState(0); // bump to force iframe reload
  const [cost, setCost] = useState(0);
  const [context, setContext] = useState(null); // { tokens, window } of the conversation
  const [versions, setVersions] = useState([]);
  const [previewErrors, setPreviewErrors] = useState([]);
  const [pendingPrompt, setPendingPrompt] = useState(null); // Home idea or fix request
  const [deploying, setDeploying] = useState(false);
  const [deployedUrl, setDeployedUrl] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [confirmCfg, setConfirmCfg] = useState(null);
  const toastId = useRef(1);

  const pushToast = useCallback((kind, text, linkUrl) => {
    const id = toastId.current++;
    setToasts((prev) => [...prev, { id, kind, text, linkUrl }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 8000);
  }, []);

  useEffect(() => {
    localStorage.setItem("mangoai.project", projectName);
  }, [projectName]);
  useEffect(() => {
    localStorage.setItem("mangoai.model", model);
  }, [model]);

  const refreshProjects = useCallback(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((d) => {
        setProjects(d.projects ?? []);
        setTemplates(d.templates ?? []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  // Auto-start the preview of the opened project. 404 for not-yet-created
  // projects is fine — the agent starts it on the first message.
  useEffect(() => {
    if (screen !== "workspace" || !projectName.trim()) return;
    fetch(`/api/preview/${encodeURIComponent(projectName)}`, { method: "POST" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.url) {
          setPreviewUrl(d.url);
          setPreviewKey((k) => k + 1);
        }
      })
      .catch(() => {});
  }, [screen, projectName]);

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

  function openProject(name, { template: tpl = "", prompt = null } = {}) {
    setProjectName(name);
    setTemplate(tpl);
    setPendingPrompt(prompt);
    setPreviewUrl(null);
    setPreviewErrors([]);
    setDeployedUrl(null);
    setContext(null);
    setScreen("workspace");
  }

  function goHome() {
    refreshProjects();
    setScreen("home");
  }

  async function deploy() {
    if (deploying) return;
    setDeploying(true);
    try {
      const res = await fetch(`/api/deploy/${encodeURIComponent(projectName)}`, {
        method: "POST",
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        pushToast("error", d.error ?? `Erreur HTTP ${res.status}`);
        return;
      }
      setDeployedUrl(d.url);
      pushToast("success", "Site publié en ligne 🎉", d.url);
    } catch (err) {
      pushToast("error", String(err));
    } finally {
      setDeploying(false);
    }
  }

  function askRollback(hash) {
    const v = versions.find((x) => x.hash === hash);
    if (!v) return;
    setConfirmCfg({
      title: "Revenir à cette version ?",
      body: `« ${v.message} »\nLes versions plus récentes seront définitivement perdues.`,
      confirmLabel: "Revenir",
      onConfirm: () => rollback(hash),
    });
  }

  async function rollback(hash) {
    try {
      const res = await fetch("/api/rollback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectName, hash }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        pushToast("error", d.error ?? `Erreur HTTP ${res.status}`);
        return;
      }
      setVersions(d.versions ?? []);
      setPreviewKey((k) => k + 1);
      pushToast("success", "Version restaurée");
    } catch (err) {
      pushToast("error", String(err));
    }
  }

  function requestFix() {
    if (previewErrors.length === 0) return;
    const list = previewErrors.map((e) => `- ${e}`).join("\n");
    setPendingPrompt(`Corrige ces erreurs détectées dans l'aperçu de l'app :\n${list}`);
    setPreviewErrors([]);
  }

  return (
    <>
      {screen === "home" ? (
        <Home projects={projects} templates={templates} onOpen={openProject} />
      ) : (
        <div className="flex h-screen flex-col">
          <Header
            projectName={projectName}
            onHome={goHome}
            model={model}
            onModel={setModel}
            versions={versions}
            onRollback={askRollback}
            canDeploy={projects.includes(projectName)}
            deploying={deploying}
            onDeploy={deploy}
            deployedUrl={deployedUrl}
            cost={cost}
            context={context}
          />
          <div className="flex min-h-0 flex-1">
            <Chat
              projectName={projectName}
              model={model}
              template={template}
              onPreviewUrl={setPreviewUrl}
              onCost={(c) => setCost((prev) => prev + c)}
              onContext={setContext}
              onAgentDone={() => {
                setPreviewErrors([]); // the reloaded iframe re-reports anything still broken
                setPreviewKey((k) => k + 1);
                refreshVersions();
                refreshProjects(); // a first message may have just created the project
              }}
              autoPrompt={pendingPrompt}
              onAutoPromptConsumed={() => setPendingPrompt(null)}
            />
            <Preview
              url={previewUrl}
              reloadKey={previewKey}
              errors={previewErrors}
              onFix={requestFix}
              onReload={() => setPreviewKey((k) => k + 1)}
            />
          </div>
        </div>
      )}
      <Toasts toasts={toasts} onDismiss={(id) => setToasts((p) => p.filter((t) => t.id !== id))} />
      <ConfirmModal config={confirmCfg} onClose={() => setConfirmCfg(null)} />
    </>
  );
}
