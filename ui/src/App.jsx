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
  // Effort mode (idea 12), orthogonal to the model — survives reload like it.
  const [mode, setMode] = useState(() => localStorage.getItem("mangoai.mode") ?? "elite");
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewKey, setPreviewKey] = useState(0); // bump to force iframe reload
  const [cost, setCost] = useState(0);
  const [context, setContext] = useState(null); // { tokens, window } of the conversation
  const [versions, setVersions] = useState([]);
  const [previewErrors, setPreviewErrors] = useState([]);
  const [pendingPrompt, setPendingPrompt] = useState(null); // Home idea or fix request
  const [inspecting, setInspecting] = useState(false); // mode inspection clic→source (#5)
  const [seedInput, setSeedInput] = useState(null); // texte préchargé dans le composer (sélection)
  const [editTarget, setEditTarget] = useState(null); // cible d'édition visuelle (#6) : { src, tag, text }
  const [deploying, setDeploying] = useState(false);
  const [deployedUrl, setDeployedUrl] = useState(null);
  const [githubEnabled, setGithubEnabled] = useState(false);
  const [githubUrl, setGithubUrl] = useState(null);
  const [pushingGithub, setPushingGithub] = useState(false);
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
  useEffect(() => {
    localStorage.setItem("mangoai.mode", mode);
  }, [mode]);

  const refreshProjects = useCallback(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((d) => {
        setProjects(d.projects ?? []);
        setTemplates(d.templates ?? []);
        setGithubEnabled(Boolean(d.githubEnabled));
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

  // Messages de l'aperçu : erreurs runtime (error-relay) ET sélections clic→source
  // (inspect-relay, #5). Un seul écouteur global, on aiguille sur le type.
  useEffect(() => {
    const onMessage = (e) => {
      const d = e.data;
      if (!d || d.source !== "mangoai-preview") return;
      // Relais clic→source : l'utilisateur a cliqué un élément en mode inspection.
      if (d.type === "inspect-pick") {
        setInspecting(false);
        const label = d.text ? `« ${d.text} »` : `<${d.tag}>`;
        if (d.src) {
          // On précharge le composer ET on arme la cible structurée (#6) : le
          // prochain message déclenchera un edit CHIRURGICAL à ce fichier:ligne.
          setEditTarget({ src: d.src, tag: d.tag, text: d.text });
          setSeedInput(`Modifie l'élément ${label} (source : ${d.src}) : `);
          pushToast("success", `Élément ciblé : ${d.src}`);
        } else {
          setEditTarget(null);
          setSeedInput(`Modifie l'élément <${d.tag}> ${label} : `);
          pushToast("error", "Élément ciblé (source non tracée — recharge l'aperçu)");
        }
        return;
      }
      if (!d.message) return;
      setPreviewErrors((prev) =>
        prev.includes(d.message) || prev.length >= 10 ? prev : [...prev, d.message],
      );
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [pushToast]);

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
    setGithubUrl(null);
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

  async function pushGithub() {
    if (pushingGithub) return;
    setPushingGithub(true);
    try {
      const res = await fetch(`/api/github/${encodeURIComponent(projectName)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ private: true }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        pushToast("error", d.error ?? `Erreur HTTP ${res.status}`);
        return;
      }
      setGithubUrl(d.url);
      pushToast("success", "Projet poussé sur GitHub 🐙", d.url);
    } catch (err) {
      pushToast("error", String(err));
    } finally {
      setPushingGithub(false);
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
            mode={mode}
            onMode={setMode}
            versions={versions}
            onRollback={askRollback}
            canDeploy={projects.includes(projectName)}
            deploying={deploying}
            onDeploy={deploy}
            deployedUrl={deployedUrl}
            canGithub={githubEnabled && projects.includes(projectName)}
            pushingGithub={pushingGithub}
            onGithub={pushGithub}
            githubUrl={githubUrl}
            cost={cost}
            context={context}
          />
          <div className="flex min-h-0 flex-1">
            <Chat
              projectName={projectName}
              model={model}
              mode={mode}
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
              seedInput={seedInput}
              onSeedConsumed={() => setSeedInput(null)}
              editTarget={editTarget}
              onEditTargetConsumed={() => setEditTarget(null)}
            />
            <Preview
              url={previewUrl}
              reloadKey={previewKey}
              errors={previewErrors}
              onFix={requestFix}
              onReload={() => setPreviewKey((k) => k + 1)}
              inspecting={inspecting}
              onToggleInspect={() => setInspecting((v) => !v)}
            />
          </div>
        </div>
      )}
      <Toasts toasts={toasts} onDismiss={(id) => setToasts((p) => p.filter((t) => t.id !== id))} />
      <ConfirmModal config={confirmCfg} onClose={() => setConfirmCfg(null)} />
    </>
  );
}
