import { useState } from "react";
import {
  BarChart3, BrainCircuit, Briefcase, Download,
  Eye, EyeOff, GitFork, HelpCircle, History,
  Loader2, Server, X,
} from "lucide-react";
import Knowledge from "./Knowledge.jsx";
import Metrics from "./Metrics.jsx";
import Guide from "./Guide.jsx";
import { NEUTRAL } from "../neutral.js";

// ─── Bouton icône ────────────────────────────────────────────────────────────
function SideBtn({ icon: Icon, label, active = false, onClick, dataTour }) {
  return (
    <button
      onClick={onClick}
      data-tour={dataTour}
      title={label}
      className={`flex h-10 w-full items-center justify-center rounded-lg transition-colors ${
        active
          ? "bg-accent/15 text-accent"
          : "text-dim hover:bg-edge-soft hover:text-ink"
      }`}
    >
      <Icon size={17} />
    </button>
  );
}

// ─── Coque de panneau latéral ─────────────────────────────────────────────────
function PanelShell({ title, onClose, children }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-edge px-3 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-faint">
          {title}
        </span>
        <button
          onClick={onClose}
          className="rounded p-0.5 text-dim hover:text-ink transition-colors"
        >
          <X size={14} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto nice-scroll">
        {children}
      </div>
    </div>
  );
}

// ─── Panneau Versions ──────────────────────────────────────────────────────────
function VersionsPanel({ versions, onRollback, onClose }) {
  return (
    <PanelShell title="Versions" onClose={onClose}>
      <div className="flex flex-col gap-1 p-2">
        {versions.map((v) => (
          <button
            key={v.hash}
            onClick={() => { onRollback(v.hash); onClose(); }}
            className="flex flex-col rounded-lg px-2.5 py-2 text-left hover:bg-edge-soft transition-colors"
          >
            <span className="text-[13px] text-ink">{v.message}</span>
            <span className="text-[11px] text-faint">{formatDate(v.date)}</span>
          </button>
        ))}
      </div>
    </PanelShell>
  );
}

// ─── Panneau Backend ───────────────────────────────────────────────────────────
function BackendPanel({ status, onScaffold, onStart, onStop, onClose }) {
  const { scaffolded, running, url } = status;
  return (
    <PanelShell title="Backend" onClose={onClose}>
      <div className="flex flex-col gap-3 p-4">
        {!scaffolded ? (
          <>
            <p className="text-xs text-dim">Aucun backend Express pour ce projet.</p>
            <button
              onClick={onScaffold}
              className="rounded-lg border border-edge bg-panel px-3 py-2 text-sm text-dim hover:border-faint hover:text-ink transition-colors"
            >
              Ajouter un backend Express
            </button>
          </>
        ) : running ? (
          <>
            <div className="flex items-center gap-2 text-sm text-ok">
              <span className="h-2 w-2 animate-pulse rounded-full bg-ok" />
              Actif — {url}
            </div>
            <button
              onClick={onStop}
              className="rounded-lg border border-err/40 bg-err/10 px-3 py-2 text-sm text-err hover:bg-err/20 transition-colors"
            >
              Arrêter
            </button>
          </>
        ) : (
          <>
            <p className="text-xs text-dim">Backend arrêté.</p>
            <button
              onClick={onStart}
              className="rounded-lg border border-warn/40 bg-warn/10 px-3 py-2 text-sm text-warn hover:bg-warn/20 transition-colors"
            >
              Démarrer
            </button>
          </>
        )}
      </div>
    </PanelShell>
  );
}

// ─── Panneau GitHub ────────────────────────────────────────────────────────────
function GithubPanel({ pushingGithub, onGithub, githubUrl, onClose }) {
  return (
    <PanelShell title="GitHub" onClose={onClose}>
      <div className="flex flex-col gap-3 p-4">
        <button
          onClick={onGithub}
          disabled={pushingGithub}
          className="flex items-center gap-2 rounded-lg border border-edge bg-panel px-3 py-2 text-sm text-dim hover:border-faint hover:text-ink disabled:opacity-60 transition-colors"
        >
          {pushingGithub ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <GitFork size={14} />
          )}
          {pushingGithub ? "Envoi…" : githubUrl ? "Re-pousser" : "Pousser sur GitHub"}
        </button>
        {githubUrl && (
          <a
            href={githubUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-lg border border-edge bg-panel px-3 py-2 font-mono text-xs text-dim hover:border-faint hover:text-ink transition-colors"
          >
            <GitFork size={13} />
            <span className="truncate">
              {githubUrl.replace("https://github.com/", "")}
            </span>
          </a>
        )}
      </div>
    </PanelShell>
  );
}

function formatDate(iso) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Séparateur ───────────────────────────────────────────────────────────────
function Sep() {
  return <div className="my-1 w-7 border-t border-edge" />;
}

// ─── Sidebar principale ───────────────────────────────────────────────────────
export default function Sidebar({
  projectName,
  versions = [],
  onRollback,
  canGithub = false,
  pushingGithub = false,
  onGithub,
  githubUrl,
  backendStatus = null,
  onBackendScaffold,
  onBackendStart,
  onBackendStop,
  showThinking = true,
  onToggleThinking,
  clientMode = false,
  onClientMode,
}) {
  const [active, setActive] = useState(null);
  const toggle = (id) => setActive((v) => (v === id ? null : id));
  const close = () => setActive(null);

  return (
    <div className="relative flex h-full shrink-0">
      {/* Bande d'icônes */}
      <div className="z-10 flex w-12 flex-col items-center gap-0.5 border-r border-edge bg-panel py-2 px-1">

        {/* Groupe 1 — outils informatiels */}
        <SideBtn
          icon={BrainCircuit}
          label="Mémoire"
          active={active === "memoire"}
          onClick={() => toggle("memoire")}
          dataTour="memory"
        />
        {!NEUTRAL && (
          <SideBtn
            icon={BarChart3}
            label="Métriques"
            active={active === "metriques"}
            onClick={() => toggle("metriques")}
          />
        )}
        <SideBtn
          icon={HelpCircle}
          label="Aide"
          active={active === "aide"}
          onClick={() => toggle("aide")}
        />

        <Sep />

        {/* Groupe 2 — actions projet */}
        {versions.length > 0 && (
          <SideBtn
            icon={History}
            label={`Versions (${versions.length})`}
            active={active === "versions"}
            onClick={() => toggle("versions")}
            dataTour="versions"
          />
        )}
        {backendStatus && (
          <SideBtn
            icon={Server}
            label="Backend"
            active={active === "backend" || backendStatus.running}
            onClick={() => toggle("backend")}
            dataTour="backend"
          />
        )}
        {canGithub && (
          <SideBtn
            icon={GitFork}
            label="GitHub"
            active={active === "github"}
            onClick={() => toggle("github")}
            dataTour="github"
          />
        )}
        <a
          href={`/api/export/${encodeURIComponent(projectName)}`}
          download
          title="Télécharger le code (zip)"
          className="flex h-10 w-full items-center justify-center rounded-lg text-dim hover:bg-edge-soft hover:text-ink transition-colors"
        >
          <Download size={17} />
        </a>

        <Sep />

        {/* Groupe 3 — bascules affichage */}
        {onClientMode && (
          <SideBtn
            icon={Briefcase}
            label={clientMode ? "Mode Client actif" : "Mode Client"}
            active={clientMode}
            onClick={() => onClientMode(!clientMode)}
          />
        )}
        <SideBtn
          icon={showThinking ? Eye : EyeOff}
          label={showThinking ? "Masquer réflexion" : "Afficher réflexion"}
          onClick={onToggleThinking}
        />
      </div>

      {/* Panneau flottant */}
      {active && (
        <div className="absolute left-12 top-0 z-40 h-full w-72 overflow-hidden border-r border-edge bg-panel shadow-xl">
          {active === "memoire" && (
            <PanelShell title="Mémoire" onClose={close}>
              <Knowledge projectName={projectName} />
            </PanelShell>
          )}
          {active === "metriques" && !NEUTRAL && (
            <PanelShell title="Métriques" onClose={close}>
              <Metrics />
            </PanelShell>
          )}
          {active === "aide" && (
            <PanelShell title="Aide" onClose={close}>
              <Guide />
            </PanelShell>
          )}
          {active === "versions" && (
            <VersionsPanel
              versions={versions}
              onRollback={onRollback}
              onClose={close}
            />
          )}
          {active === "backend" && backendStatus && (
            <BackendPanel
              status={backendStatus}
              onScaffold={onBackendScaffold}
              onStart={onBackendStart}
              onStop={onBackendStop}
              onClose={close}
            />
          )}
          {active === "github" && (
            <GithubPanel
              pushingGithub={pushingGithub}
              onGithub={onGithub}
              githubUrl={githubUrl}
              onClose={close}
            />
          )}
        </div>
      )}
    </div>
  );
}
