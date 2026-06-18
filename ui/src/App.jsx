import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { BarChart2, BookOpen, Bot, Clock, CreditCard, FileText, FlaskConical, GitBranch, Hash, Layers, Lightbulb, Moon, Palette, Rss, Satellite, Scissors, Sliders, ShieldCheck, Squircle } from "lucide-react";
import Chat from "./Chat.jsx";
import Preview from "./Preview.jsx";
import Home from "./components/Home.jsx";
import Header from "./components/Header.jsx";
import Sidebar from "./components/Sidebar.jsx";
import Toasts from "./components/Toast.jsx";
import ConfirmModal from "./components/ConfirmModal.jsx";
import SidePanel from "./components/SidePanel.jsx";
import Onboarding from "./components/Onboarding.jsx";
import { NEUTRAL } from "./neutral.js";

// Panneaux lourds chargés à la demande (code-splitting)
const PromptLab       = lazy(() => import("./components/PromptLab.jsx"));
const Tokenizer       = lazy(() => import("./components/Tokenizer.jsx"));
const Ideation        = lazy(() => import("./components/Ideation.jsx"));
const Veille          = lazy(() => import("./components/Veille.jsx"));
const DocGenerator    = lazy(() => import("./components/DocGenerator.jsx"));
const VersionGraph    = lazy(() => import("./components/VersionGraph.jsx"));
const QAPanel         = lazy(() => import("./components/QAPanel.jsx"));
const Billing         = lazy(() => import("./components/Billing.jsx"));
const CronManager     = lazy(() => import("./components/CronManager.jsx"));
const MetricsDashboard= lazy(() => import("./components/MetricsDashboard.jsx"));
const NotesRAG        = lazy(() => import("./components/NotesRAG.jsx"));
const AutoAblation    = lazy(() => import("./components/AutoAblation.jsx"));
const MultiProject    = lazy(() => import("./components/MultiProject.jsx"));
const SuperAgentBuilder= lazy(() => import("./components/SuperAgentBuilder.jsx"));
const DesignReview    = lazy(() => import("./components/DesignReview.jsx"));
const Tutorial        = lazy(() => import("./components/Tutorial.jsx"));
const NocturnalReview = lazy(() => import("./components/NocturnalReview.jsx"));
const Radar           = lazy(() => import("./components/Radar.jsx"));

// Fallback léger partagé par tous les panneaux lazy
function PanelLoader() {
  return (
    <div className="flex h-full w-full items-center justify-center text-sm text-muted">
      Chargement…
    </div>
  );
}

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

  const handleChatMode = useCallback(({ model: m, mode: md }) => {
    setModel(m);
    setMode(md);
    localStorage.setItem("mangoai.model", m);
    localStorage.setItem("mangoai.mode", md);
  }, []);

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
  const [showThinking, setShowThinking] = useState(() => localStorage.getItem("mangoai.showThinking") !== "false");
  const [deploying, setDeploying] = useState(false);
  const [deployedUrl, setDeployedUrl] = useState(null);
  const [githubEnabled, setGithubEnabled] = useState(false);
  const [githubUrl, setGithubUrl] = useState(null);
  const [pushingGithub, setPushingGithub] = useState(false);
  const [backendStatus, setBackendStatus] = useState(null); // { scaffolded, running, url, port }
  const [toasts, setToasts] = useState([]);
  const [confirmCfg, setConfirmCfg] = useState(null);
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  // D'où le workspace a été ouvert (ex. "nocturnal") → bouton retour contextuel.
  const [workspaceOrigin, setWorkspaceOrigin] = useState(null);
  // Tâche initiale d'un projet sans historique de chat (ex. généré la nuit) :
  // affichée à gauche en repli si .chat-history.json est vide.
  const [initialTask, setInitialTask] = useState(null);
  // Projet nocturne ouvert ({ id, reviewed }) → bouton Reviewer sous le prompt.
  const [nocturnalEntry, setNocturnalEntry] = useState(null);
  // Mode Client per-projet : persiste dans localStorage sous "mangoai.clientMode.<projet>"
  const [clientMode, setClientMode] = useState(false);
  // Tutoriel (#56) : overlay guidé. Le niveau de liberté du spotlight est dérivé
  // de la définition du tuto (côté Tutorial), pas d'un état ici.
  const [tutorialActive, setTutorialActive] = useState(false);
  const [tutorialId, setTutorialId] = useState(null);
  const [tutorialNextId, setTutorialNextId] = useState(1);
  const [onboardingNeeded, setOnboardingNeeded] = useState(false);
  const [perfectPlanContract, setPerfectPlanContract] = useState(null);
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

  const handleDeleteProject = useCallback(async (name) => {
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(name)}`, { method: "DELETE" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        pushToast("error", d.error ?? `Suppression impossible (HTTP ${res.status})`);
        return false;
      }
      refreshProjects();
      return true;
    } catch (err) {
      pushToast("error", `Suppression impossible : ${err.message ?? err}`);
      return false;
    }
  }, [refreshProjects, pushToast]);

  const handleDeleteProjects = useCallback(async (names) => {
    const failed = [];
    for (const name of names) {
      try {
        const res = await fetch(`/api/projects/${encodeURIComponent(name)}`, { method: "DELETE" });
        if (!res.ok) failed.push(name);
      } catch { failed.push(name); }
    }
    refreshProjects();
    if (failed.length) {
      pushToast("error", `${failed.length}/${names.length} non supprimé(s) — ${failed.join(", ")}`);
    } else {
      pushToast("success", `${names.length} projet(s) supprimé(s)`);
    }
  }, [refreshProjects, pushToast]);

  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  useEffect(() => {
    fetch("/api/onboarding/status")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d && !d.hasProfile) setOnboardingNeeded(true); })
      .catch(() => {});
  }, []);

  // Progression du tutoriel (#56) : détermine le prochain tuto à proposer.
  const refreshTutorialProgress = useCallback(() => {
    fetch("/api/tutorial/progress")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setTutorialNextId(d ? d.nextTutorialId : 1))
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshTutorialProgress();
  }, [refreshTutorialProgress]);

  const startTutorial = useCallback((tutId) => {
    setTutorialId(tutId);
    setTutorialActive(true);
  }, []);

  // Bascule l'app sur l'écran requis par l'étape courante du tutoriel : "home",
  // "workspace" (Header/Chat/Preview) ou n'importe quel panneau plein écran
  // ("notes", "metrics", "superagent", "multi"…) pour que la feature soit VISIBLE.
  const enterTutorialContext = useCallback((ctx) => {
    if (ctx) setScreen(ctx);
  }, []);

  const exitTutorial = useCallback(() => {
    setTutorialActive(false);
    setTutorialId(null);
    setScreen("home"); // ne pas laisser l'utilisateur échoué dans un atelier vide
    refreshTutorialProgress();
  }, [refreshTutorialProgress]);

  // Depuis la RelationshipCard : enchaîner directement sur le tuto suivant.
  const startNextTutorial = useCallback(
    (tutId) => {
      refreshTutorialProgress();
      setTutorialId(tutId);
      setTutorialActive(true);
    },
    [refreshTutorialProgress],
  );

  const completeTutorial = useCallback(
    (nextId) => {
      setTutorialNextId(nextId);
      setTutorialActive(false);
      setTutorialId(null);
      setScreen("home");
      if (nextId) {
        pushToast("success", `Tutoriel terminé 🎓 — prochain : ${nextId}/10`);
      } else {
        pushToast("success", "Tous les tutoriels sont terminés 🎉");
      }
    },
    [pushToast],
  );

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

  // Charger le Perfect Plan du projet courant quand on entre dans le workspace.
  useEffect(() => {
    if (screen !== "workspace" || !projectName.trim()) { setPerfectPlanContract(null); return; }
    fetch(`/api/perfect-plan/${encodeURIComponent(projectName)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setPerfectPlanContract(d))
      .catch(() => setPerfectPlanContract(null));
  }, [screen, projectName]);

  const refreshBackendStatus = useCallback(() => {
    if (!projectName.trim()) { setBackendStatus(null); return; }
    fetch(`/api/backend-server/${encodeURIComponent(projectName)}/status`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setBackendStatus(d))
      .catch(() => setBackendStatus(null));
  }, [projectName]);

  useEffect(() => {
    refreshBackendStatus();
  }, [refreshBackendStatus]);

  async function scaffoldBackend() {
    await fetch(`/api/backend-server/${encodeURIComponent(projectName)}/scaffold`, { method: "POST" });
    pushToast("ok", "Backend Express scaffoldé dans api/ — cliquer 'Démarrer api' pour le lancer");
    refreshBackendStatus();
  }

  async function startBackend() {
    pushToast("info", "Démarrage du backend (npm install si nécessaire)…");
    const r = await fetch(`/api/backend-server/${encodeURIComponent(projectName)}/start`, { method: "POST" });
    const d = await r.json();
    if (d.ok) {
      pushToast("ok", `Backend actif sur ${d.url}`);
    } else {
      pushToast("err", `Erreur backend : ${d.error}`);
    }
    refreshBackendStatus();
  }

  async function stopBackend() {
    await fetch(`/api/backend-server/${encodeURIComponent(projectName)}/stop`, { method: "POST" });
    pushToast("ok", "Backend arrêté");
    refreshBackendStatus();
  }

  async function openProject(name, { template: tpl = "", prompt = null, origin = null, task = null, nocturnal = null, contract = null } = {}) {
    if (contract) {
      try {
        await fetch(`/api/perfect-plan/${encodeURIComponent(name)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(contract),
        });
      } catch { /* non-bloquant */ }
    }
    setProjectName(name);
    setTemplate(tpl);
    setPendingPrompt(prompt);
    setWorkspaceOrigin(origin);
    setInitialTask(task);
    setNocturnalEntry(nocturnal);
    setPreviewUrl(null);
    setPreviewErrors([]);
    setDeployedUrl(null);
    setGithubUrl(null);
    setContext(null);
    setPerfectPlanContract(null);
    // Restaure le mode client sauvegardé pour ce projet (ou false par défaut).
    setClientMode(localStorage.getItem(`mangoai.clientMode.${name}`) === "true");
    setScreen("workspace");
  }

  function handleClientMode(val) {
    setClientMode(val);
    localStorage.setItem(`mangoai.clientMode.${projectName}`, String(val));
  }

  function goHome() {
    refreshProjects();
    setScreen("home");
  }

  async function deploy(target = "cloudflare") {
    if (deploying) return;
    setDeploying(true);
    try {
      const res = await fetch(`/api/deploy/${encodeURIComponent(projectName)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target }),
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

  async function pushGithub(targetRepo) {
    if (pushingGithub) return;
    setPushingGithub(true);
    try {
      const res = await fetch(`/api/github/${encodeURIComponent(projectName)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ private: true, ...(targetRepo ? { targetRepo } : {}) }),
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

  // Overlay du tutoriel : monté quel que soit l'écran (y compris sur les panneaux
  // plein écran), pour que l'auto-contexte puisse y conduire sans le masquer.
  const tutorialOverlay =
    tutorialActive && tutorialId != null ? (
      <Suspense fallback={null}>
        <Tutorial
          id={tutorialId}
          onComplete={completeTutorial}
          onExit={exitTutorial}
          onStartNext={startNextTutorial}
          onContext={enterTutorialContext}
        />
      </Suspense>
    ) : null;
  const globalChrome = (
    <>
      {tutorialOverlay}
      <Toasts toasts={toasts} onDismiss={(id) => setToasts((p) => p.filter((t) => t.id !== id))} />
      <ConfirmModal config={confirmCfg} onClose={() => setConfirmCfg(null)} />
    </>
  );

  let panelContent = null;
  if (screen === "promptlab") panelContent = <PromptLab onBack={() => setScreen("home")} />;
  if (screen === "tokenizer") panelContent = <Tokenizer onBack={() => setScreen("home")} />;
  if (screen === "ideation") panelContent = <Ideation onBack={() => setScreen("home")} onStartCoding={(desc) => { setPendingPrompt(desc); setScreen("chat"); }} />;
  if (screen === "veille") panelContent = <Veille onBack={() => setScreen("home")} />;
  if (screen === "docs") panelContent = <DocGenerator onBack={() => setScreen("home")} />;
  if (screen === "versions") panelContent = <VersionGraph projectName={projectName} onBack={() => setScreen("chat")} />;
  if (screen === "qa") panelContent = <QAPanel projectName={projectName} onBack={() => setScreen("chat")} />;
  if (screen === "billing") panelContent = <Billing onBack={() => setScreen("home")} />;
  if (screen === "cron") panelContent = <CronManager onBack={() => setScreen("home")} />;
  if (screen === "metrics") panelContent = <MetricsDashboard onBack={() => setScreen("home")} />;
  if (screen === "notes") panelContent = <NotesRAG onBack={() => setScreen("home")} onToast={pushToast} />;
  if (screen === "ablation") panelContent = <AutoAblation onBack={() => setScreen("home")} />;
  if (screen === "multi") panelContent = <MultiProject onBack={() => setScreen("home")} />;
  if (screen === "superagent") panelContent = <SuperAgentBuilder onBack={() => setScreen("home")} projectName={projectName} />;
  if (screen === "design") panelContent = <DesignReview onBack={() => setScreen("home")} projectName={projectName} />;
  if (screen === "nocturnal") panelContent = <NocturnalReview onBack={() => setScreen("home")} onOpenProject={(name, entry) => openProject(name, { origin: "nocturnal", task: entry?.task ?? null, nocturnal: entry ? { id: entry.id, reviewed: Boolean(entry.reviewed) } : null })} />;
  if (screen === "radar") panelContent = <Radar onBack={() => setScreen("home")} />;

  if (onboardingNeeded) {
    return <Onboarding onDone={() => setOnboardingNeeded(false)} />;
  }

  if (panelContent) {
    return (
      <>
        <Suspense fallback={<PanelLoader />}>
          {panelContent}
        </Suspense>
        {globalChrome}
      </>
    );
  }

  return (
    <>
      {screen === "home" ? (
        <>
          <Home
            projects={projects}
            templates={templates}
            onOpen={openProject}
            onDelete={handleDeleteProject}
            onDeleteMany={handleDeleteProjects}
            onStartTutorial={startTutorial}
            nextTutorialId={tutorialNextId}
          />
          <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
            <button
              onClick={() => setSidePanelOpen(true)}
              title="Editeur visuel"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-edge bg-panel shadow-lg hover:bg-panel/80 transition-colors"
            >
              <Sliders size={18} className="text-accent" />
            </button>
            <button
              onClick={() => setScreen("promptlab")}
              title="Lab de prompts"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-edge bg-panel shadow-lg hover:bg-panel/80 transition-colors"
            >
              <FlaskConical size={18} className="text-accent" />
            </button>
            <button
              onClick={() => setScreen("tokenizer")}
              title="Tokeniseur"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-edge bg-panel shadow-lg hover:bg-panel/80 transition-colors"
            >
              <Hash size={18} className="text-accent" />
            </button>
            <button
              onClick={() => setScreen("ideation")}
              title="Mode Ideation"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-edge bg-panel shadow-lg hover:bg-panel/80 transition-colors"
            >
              <Lightbulb size={18} className="text-accent" />
            </button>
            <button
              onClick={() => setScreen("veille")}
              title="Veille IA"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-edge bg-panel shadow-lg hover:bg-panel/80 transition-colors"
            >
              <Rss size={18} className="text-accent" />
            </button>
            <button
              onClick={() => setScreen("docs")}
              title="Générateur de docs"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-edge bg-panel shadow-lg hover:bg-panel/80 transition-colors"
            >
              <FileText size={18} className="text-accent" />
            </button>
            <button
              onClick={() => setScreen("billing")}
              title="Billing / Stripe"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-edge bg-panel shadow-lg hover:bg-panel/80 transition-colors"
            >
              <CreditCard size={18} className="text-accent" />
            </button>
            <button
              onClick={() => setScreen("cron")}
              title="Cron / Tâches planifiées"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-edge bg-panel shadow-lg hover:bg-panel/80 transition-colors"
            >
              <Clock size={18} className="text-accent" />
            </button>
            {!NEUTRAL && (
              <button
                onClick={() => setScreen("metrics")}
                title="Dashboard d'évolution"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-edge bg-panel shadow-lg hover:bg-panel/80 transition-colors"
              >
                <BarChart2 size={18} className="text-accent" />
              </button>
            )}
            <button
              onClick={() => setScreen("notes")}
              title="Notes & RAG"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-edge bg-panel shadow-lg hover:bg-panel/80 transition-colors"
            >
              <BookOpen size={18} className="text-accent" />
            </button>
            {!NEUTRAL && (
              <button
                onClick={() => setScreen("ablation")}
                title="Auto-Ablation"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-edge bg-panel shadow-lg hover:bg-panel/80 transition-colors"
              >
                <Scissors size={18} className="text-accent" />
              </button>
            )}
            <button
              onClick={() => setScreen("multi")}
              title="Multi-Projet"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-edge bg-panel shadow-lg hover:bg-panel/80 transition-colors"
            >
              <Layers size={18} className="text-accent" />
            </button>
            <button
              onClick={() => setScreen("superagent")}
              title="Super Agent Builder"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-edge bg-panel shadow-lg hover:bg-panel/80 transition-colors"
            >
              <Bot size={18} className="text-accent" />
            </button>
            <button
              onClick={() => setScreen("design")}
              title="Design Review"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-edge bg-panel shadow-lg hover:bg-panel/80 transition-colors"
            >
              <Palette size={18} className="text-accent" />
            </button>
            <button
              onClick={() => setScreen("nocturnal")}
              title="Review nocturne (#58/#59)"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-edge bg-panel shadow-lg hover:bg-panel/80 transition-colors"
            >
              <Moon size={18} className="text-accent" />
            </button>
            <button
              onClick={() => setScreen("radar")}
              title="Radar IA"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-edge bg-panel shadow-lg hover:bg-panel/80 transition-colors"
            >
              <Satellite size={18} className="text-accent" />
            </button>
          </div>
          <SidePanel isOpen={sidePanelOpen} onClose={() => setSidePanelOpen(false)} />
        </>
      ) : (
        <div className="flex h-screen">
          <Sidebar
            projectName={projectName}
            versions={versions}
            onRollback={askRollback}
            canGithub={githubEnabled && projects.includes(projectName)}
            pushingGithub={pushingGithub}
            onGithub={pushGithub}
            githubUrl={githubUrl}
            backendStatus={projects.includes(projectName) ? backendStatus : null}
            onBackendScaffold={scaffoldBackend}
            onBackendStart={startBackend}
            onBackendStop={stopBackend}
            showThinking={showThinking}
            onToggleThinking={() => {
              setShowThinking((v) => {
                const next = !v;
                localStorage.setItem("mangoai.showThinking", String(next));
                return next;
              });
            }}
            clientMode={clientMode}
            onClientMode={handleClientMode}
            perfectPlanContract={perfectPlanContract}
            onDeletePerfectPlan={async () => {
              await fetch(`/api/perfect-plan/${encodeURIComponent(projectName)}`, { method: "DELETE" }).catch(() => {});
              setPerfectPlanContract(null);
            }}
          />
          <div className="flex min-w-0 flex-1 flex-col">
          <Header
            projectName={projectName}
            onHome={goHome}
            onBack={() => (workspaceOrigin ? setScreen(workspaceOrigin) : goHome())}
            backLabel={workspaceOrigin === "nocturnal" ? "Review nocturne" : "Accueil"}
            model={model}
            onModel={setModel}
            mode={mode}
            onMode={setMode}
            canDeploy={projects.includes(projectName)}
            deploying={deploying}
            onDeploy={deploy}
            deployedUrl={deployedUrl}
            cost={cost}
            context={context}
            canDelete={projects.includes(projectName) && projectName !== "__mirror__"}
            onDeleteProject={async () => {
              const ok = await handleDeleteProject(projectName);
              if (ok) goHome();
            }}
          />
          {projectName === "__mirror__" && (
            <div className="flex shrink-0 items-center gap-2 border-b border-accent/30 bg-accent/[0.06] px-4 py-1.5 text-xs text-accent-soft">
              <Squircle size={13} />
              <span>Mode Miroir — l'agent édite l'interface de Mango. Vite HMR applique les changements en direct. Tout est récupérable via git.</span>
            </div>
          )}
          <div className="flex min-h-0 flex-1">
            <Chat
              projectName={projectName}
              model={model}
              mode={mode}
              template={template}
              seedHistory={initialTask}
              nocturnalEntry={nocturnalEntry}
              onReviewed={() => setNocturnalEntry((e) => (e ? { ...e, reviewed: true } : e))}
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
              showThinking={showThinking}
              onChatMode={handleChatMode}
              onToast={pushToast}
              tutorialId={tutorialActive ? tutorialId : null}
              clientMode={clientMode}
            />
            <Preview
              url={previewUrl}
              reloadKey={previewKey}
              errors={previewErrors}
              onFix={requestFix}
              onReload={() => setPreviewKey((k) => k + 1)}
              inspecting={inspecting}
              onToggleInspect={() => setInspecting((v) => !v)}
              selectedElement={editTarget}
              onClearSelection={() => setEditTarget(null)}
              onApplyStyle={(msg) => setSeedInput(msg)}
            />
          </div>
          <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
            <button
              onClick={() => openProject("__mirror__")}
              title="Mode Miroir — éditer l'interface de Mango elle-même"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-accent/40 bg-accent/10 shadow-lg hover:bg-accent/20 transition-colors"
            >
              <Squircle size={16} className="text-accent-soft" />
            </button>
            <button
              onClick={() => setScreen("versions")}
              title="Historique des versions"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-edge bg-panel shadow-lg hover:bg-panel/80 transition-colors"
            >
              <GitBranch size={16} className="text-accent-soft" />
            </button>
            <button
              onClick={() => setScreen("qa")}
              title="Audit QA"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-edge bg-panel shadow-lg hover:bg-panel/80 transition-colors"
            >
              <ShieldCheck size={16} className="text-accent-soft" />
            </button>
          </div>
          </div>{/* end flex-col wrapper */}
        </div>
      )}
      {globalChrome}
    </>
  );
}
