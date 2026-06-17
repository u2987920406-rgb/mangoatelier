import { ArrowLeft, BarChart3, Brain, BrainCircuit, Cloud, Download, Eye, EyeOff, Gauge, Gem, GitFork, Globe, GraduationCap, HelpCircle, History, Loader2, Rocket, Server, Shield, Sparkles, Triangle, Zap } from "lucide-react";
import Dropdown, { DropdownItem } from "./Dropdown.jsx";
import Knowledge from "./Knowledge.jsx";
import Metrics from "./Metrics.jsx";
import Guide from "./Guide.jsx";
import { NEUTRAL, t } from "../neutral.js";

// Static-host targets for one-click publish (idea 18). Each maps to a CLI in
// server/src/deploy.ts; the id is sent as { target } to POST /api/deploy.
const DEPLOY_TARGETS = [
  { id: "cloudflare", label: "Cloudflare Pages", hint: "Edge gratuit — défaut", icon: Cloud },
  { id: "vercel", label: "Vercel", hint: "Idéal Next.js / SSR", icon: Triangle },
  { id: "netlify", label: "Netlify", hint: "Sites statiques + forms", icon: Globe },
];

const MODELS = [
  { id: "haiku", label: "Haiku", hint: "Rapide, projets simples", icon: Zap },
  { id: "sonnet", label: "Sonnet", hint: "Équilibré (recommandé)", icon: Gauge },
  { id: "opus", label: "Opus", hint: "Puissant, plus cher", icon: Brain },
  // Phase Ultime jalon D — 3e cerveau : le modèle local (Gemma via Ollama) traite
  // la tâche à coût zéro, Claude n'intervient qu'en secours (escalade objective).
  // En mode neutre (Phase B), le jargon interne est remplacé par un libellé produit.
  { id: "eleve", label: t("Élève local", "Local"), hint: t("Gemma local (gratuit) — Claude en secours", "Modèle local gratuit"), icon: GraduationCap },
];

// Effort mode (idea 12) — orthogonal to the model: which rigour, not which brain.
const MODES = [
  { id: "mvp", label: "MVP", hint: "Rapide & économe — droit au but", icon: Zap },
  { id: "elite", label: "Élite", hint: "Qualité max — analyse + vérif visuelle", icon: Gem },
  // Finition (after ~80%): hardening & QA pass — no new features, delegates to qa.
  { id: "finition", label: "Finition", hint: "Durcissement & QA — pas de nouvelle feature", icon: Shield },
  // Esthetique (#68): high-fidelity graphic polish — micro-interactions, animations, design tokens.
  { id: "esthetique", label: "Esthétique", hint: "Raffinement graphique — micro-interactions, animations, finitions", icon: Sparkles },
];

export default function Header({
  projectName,
  onHome,
  onBack = null,
  backLabel = "Retour",
  model,
  onModel,
  mode,
  onMode,
  versions,
  onRollback,
  canDeploy,
  deploying,
  onDeploy,
  deployedUrl,
  canGithub,
  pushingGithub,
  onGithub,
  githubUrl,
  backendStatus,
  onBackendScaffold,
  onBackendStart,
  onBackendStop,
  cost,
  context,
  showThinking,
  onToggleThinking,
}) {
  const current = MODELS.find((m) => m.id === model) ?? MODELS[1];
  const currentMode = MODES.find((m) => m.id === mode) ?? MODES[1];

  return (
    <header data-tour="header" className="flex h-14 shrink-0 items-center gap-3 border-b border-edge bg-panel px-4">
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-1 rounded-lg px-1.5 py-1 text-sm text-dim hover:text-ink hover:bg-edge-soft transition-colors"
          title={`Retour — ${backLabel}`}
        >
          <ArrowLeft size={16} />
          <span className="hidden sm:inline">{backLabel}</span>
        </button>
      )}
      <button
        onClick={onHome}
        className="flex items-center gap-2 font-extrabold tracking-tight hover:opacity-80 transition-opacity"
        title="Retour à l'accueil"
      >
        <span className="text-xl">🥭</span>
        <span>
          Mango<span className="text-accent-soft">AI</span>
        </span>
      </button>

      <span className="text-edge">/</span>
      <span className="truncate font-mono text-[13px] text-dim" title="Projet actif">
        {projectName}
      </span>

      <div className="ml-auto flex items-center gap-2">
        {deployedUrl && (
          <a
            href={deployedUrl}
            target="_blank"
            rel="noreferrer"
            className="flex h-9 max-w-52 items-center gap-1.5 rounded-lg border border-ok/40 bg-ok/10 px-3 font-mono text-xs text-ok hover:bg-ok/20 transition-colors"
            title="Site publié"
          >
            <Globe size={13} className="shrink-0" />
            <span className="truncate">{deployedUrl.replace("https://", "")}</span>
          </a>
        )}

        <Dropdown
          width="w-[28rem]"
          button={
            <>
              <HelpCircle size={14} className="text-accent-soft" />
              Aide
            </>
          }
        >
          <Guide />
        </Dropdown>

        <Dropdown
          width="w-96"
          dataTour="memory"
          button={
            <>
              <BrainCircuit size={14} className="text-accent-soft" />
              Mémoire
            </>
          }
        >
          <Knowledge projectName={projectName} />
        </Dropdown>

        {!NEUTRAL && (
          <Dropdown
            width="w-96"
            button={
              <>
                <BarChart3 size={14} className="text-accent-soft" />
                Métriques
              </>
            }
          >
            <Metrics />
          </Dropdown>
        )}

        <Dropdown
          dataTour="mode"
          button={
            <>
              <currentMode.icon
                size={14}
                className={mode === "elite" ? "text-accent-soft" : "text-dim"}
              />
              {currentMode.label}
            </>
          }
        >
          {(close) =>
            MODES.map((m) => (
              <DropdownItem
                key={m.id}
                icon={m.icon}
                label={m.label}
                hint={m.hint}
                active={m.id === mode}
                onClick={() => {
                  onMode(m.id);
                  close();
                }}
              />
            ))
          }
        </Dropdown>

        <Dropdown
          dataTour="model"
          button={
            <>
              <current.icon size={14} className="text-accent-soft" />
              {current.label}
            </>
          }
        >
          {(close) =>
            MODELS.map((m) => (
              <DropdownItem
                key={m.id}
                icon={m.icon}
                label={m.label}
                hint={m.hint}
                active={m.id === model}
                onClick={() => {
                  onModel(m.id);
                  close();
                }}
              />
            ))
          }
        </Dropdown>

        <Dropdown
          disabled={versions.length === 0}
          width="w-72"
          dataTour="versions"
          button={
            <>
              <History size={14} className="text-dim" />
              Versions
              <span className="rounded-md bg-edge-soft px-1.5 text-[11px] font-mono text-dim">
                {versions.length}
              </span>
            </>
          }
        >
          {(close) =>
            versions.map((v) => (
              <DropdownItem
                key={v.hash}
                icon={History}
                label={v.message}
                hint={formatDate(v.date)}
                onClick={() => {
                  onRollback(v.hash);
                  close();
                }}
              />
            ))
          }
        </Dropdown>

        <a
          href={`/api/export/${encodeURIComponent(projectName)}`}
          download
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-edge bg-panel text-dim hover:border-faint hover:text-ink transition-colors"
          title="Télécharger le code (zip)"
        >
          <Download size={15} />
        </a>

        {canGithub && (
          <button
            onClick={onGithub}
            disabled={pushingGithub}
            data-tour="github"
            className="flex h-9 items-center gap-1.5 rounded-lg border border-edge bg-panel px-3 text-[13px] font-medium text-dim hover:border-faint hover:text-ink disabled:opacity-60 transition-colors"
            title={githubUrl ? `Re-pousser sur ${githubUrl}` : "Pousser le projet sur GitHub (dépôt privé)"}
          >
            {pushingGithub ? <Loader2 size={14} className="animate-spin" /> : <GitFork size={14} />}
            {pushingGithub ? "Envoi…" : githubUrl ? "Push" : "GitHub"}
          </button>
        )}

        {githubUrl && (
          <a
            href={githubUrl}
            target="_blank"
            rel="noreferrer"
            className="flex h-9 max-w-44 items-center gap-1.5 rounded-lg border border-edge bg-panel px-3 font-mono text-xs text-dim hover:border-faint hover:text-ink transition-colors"
            title="Ouvrir le dépôt sur GitHub"
          >
            <GitFork size={13} className="shrink-0" />
            <span className="truncate">{githubUrl.replace("https://github.com/", "")}</span>
          </a>
        )}

        {backendStatus && (
          <BackendButton
            status={backendStatus}
            onScaffold={onBackendScaffold}
            onStart={onBackendStart}
            onStop={onBackendStop}
          />
        )}

        {canDeploy && (
          <Dropdown
            width="w-64"
            align="right"
            dataTour="deploy"
            button={
              <>
                {deploying ? <Loader2 size={14} className="animate-spin" /> : <Rocket size={14} />}
                {deploying ? "Publication…" : "Publier"}
              </>
            }
            buttonClass="flex h-9 items-center gap-1.5 rounded-lg bg-accent px-3.5 text-[13px] font-semibold text-white shadow-lg shadow-accent/25 hover:bg-accent-soft disabled:opacity-60 transition"
            disabled={deploying}
          >
            {(close) =>
              DEPLOY_TARGETS.map((t) => (
                <DropdownItem
                  key={t.id}
                  icon={t.icon}
                  label={t.label}
                  hint={t.hint}
                  onClick={() => {
                    onDeploy(t.id);
                    close();
                  }}
                />
              ))
            }
          </Dropdown>
        )}

        <button
          onClick={onToggleThinking}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-edge bg-panel text-dim hover:border-faint hover:text-ink transition-colors"
          title={showThinking ? "Masquer les blocs Réflexion" : "Afficher les blocs Réflexion"}
        >
          {showThinking ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>

        {context && <ContextGauge tokens={context.tokens} window={context.window} />}

        <span
          className="font-mono text-xs text-faint"
          title="Coût cumulé de la session"
        >
          ${cost.toFixed(4)}
        </span>
      </div>
    </header>
  );
}

// Conversation context gauge — turns orange near the compaction threshold
// (70%, where the backend compacts in the background) and red beyond it.
function ContextGauge({ tokens, window: win }) {
  const pct = Math.min(100, Math.round((tokens / win) * 100));
  const color = pct >= 70 ? "bg-err" : pct >= 50 ? "bg-warn" : "bg-ok";
  return (
    <span
      className="flex items-center gap-1.5 font-mono text-xs text-faint"
      title={`Contexte de la conversation : ${Math.round(tokens / 1000)}k / ${Math.round(win / 1000)}k tokens — compression automatique au-delà de 70 %`}
    >
      <span className="h-1.5 w-12 overflow-hidden rounded-full bg-edge-soft">
        <span className={`block h-full ${color}`} style={{ width: `${pct}%` }} />
      </span>
      {pct}%
    </span>
  );
}

function BackendButton({ status, onScaffold, onStart, onStop }) {
  const { scaffolded, running, url } = status;

  if (!scaffolded) {
    return (
      <button
        onClick={onScaffold}
        data-tour="backend"
        className="flex h-9 items-center gap-1.5 rounded-lg border border-edge bg-panel px-3 text-[13px] font-medium text-dim hover:border-faint hover:text-ink transition-colors"
        title="Ajouter un backend Express à ce projet"
      >
        <Server size={14} />
        Backend
      </button>
    );
  }

  if (running) {
    return (
      <button
        onClick={onStop}
        data-tour="backend"
        className="flex h-9 items-center gap-1.5 rounded-lg border border-ok/40 bg-ok/10 px-3 text-[13px] font-medium text-ok hover:bg-ok/20 transition-colors"
        title={`Backend actif : ${url} — cliquer pour arrêter`}
      >
        <span className="h-2 w-2 rounded-full bg-ok animate-pulse" />
        <Server size={14} />
        api
      </button>
    );
  }

  return (
    <button
      onClick={onStart}
      data-tour="backend"
      className="flex h-9 items-center gap-1.5 rounded-lg border border-warn/40 bg-warn/10 px-3 text-[13px] font-medium text-warn hover:bg-warn/20 transition-colors"
      title="Démarrer le backend Express (api/)"
    >
      <Server size={14} />
      Démarrer api
    </button>
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
