import { BarChart3, Brain, BrainCircuit, Download, Gauge, Gem, GitFork, Globe, GraduationCap, History, Loader2, Rocket, Zap } from "lucide-react";
import Dropdown, { DropdownItem } from "./Dropdown.jsx";
import Knowledge from "./Knowledge.jsx";
import Metrics from "./Metrics.jsx";

const MODELS = [
  { id: "haiku", label: "Haiku", hint: "Rapide, projets simples", icon: Zap },
  { id: "sonnet", label: "Sonnet", hint: "Équilibré (recommandé)", icon: Gauge },
  { id: "opus", label: "Opus", hint: "Puissant, plus cher", icon: Brain },
  // Phase Ultime jalon D — 3e cerveau : le modèle local (Qwen via Ollama) traite
  // la tâche à coût zéro, Claude n'intervient qu'en secours (escalade objective).
  { id: "eleve", label: "Élève local", hint: "Qwen local (gratuit) — Claude en secours", icon: GraduationCap },
];

// Effort mode (idea 12) — orthogonal to the model: which rigour, not which brain.
const MODES = [
  { id: "mvp", label: "MVP", hint: "Rapide & économe — droit au but", icon: Zap },
  { id: "elite", label: "Élite", hint: "Qualité max — analyse + vérif visuelle", icon: Gem },
];

export default function Header({
  projectName,
  onHome,
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
  cost,
  context,
}) {
  const current = MODELS.find((m) => m.id === model) ?? MODELS[1];
  const currentMode = MODES.find((m) => m.id === mode) ?? MODES[1];

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-edge bg-panel px-4">
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
          width="w-96"
          button={
            <>
              <BrainCircuit size={14} className="text-accent-soft" />
              Mémoire
            </>
          }
        >
          <Knowledge projectName={projectName} />
        </Dropdown>

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

        <Dropdown
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

        {canDeploy && (
          <button
            onClick={onDeploy}
            disabled={deploying}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-accent px-3.5 text-[13px] font-semibold text-white shadow-lg shadow-accent/25 hover:bg-accent-soft disabled:opacity-60 transition"
            title="Publier le site en ligne (Cloudflare Pages)"
          >
            {deploying ? <Loader2 size={14} className="animate-spin" /> : <Rocket size={14} />}
            {deploying ? "Publication…" : "Publier"}
          </button>
        )}

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

function formatDate(iso) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
