import { useState, useEffect, useCallback, useRef } from "react";
import {
  ArrowLeft, Bot, Play, Square, RotateCcw, Plus, Trash2,
  ChevronDown, ChevronRight, Loader2, Send, RefreshCw,
} from "lucide-react";

// Idée #103 — Mango Agent Factory. Galerie + création + gestion des agents autonomes.

const CATEGORY_LABELS = {
  collecteur:   { label: "Collecteur",   desc: "Polling récurrent (API, web, fichiers)", color: "text-blue-400" },
  processeur:   { label: "Processeur",   desc: "Transformation one-shot d'un payload",   color: "text-purple-400" },
  acteur:       { label: "Acteur",       desc: "Agit sur événement (webhook, fichier)",  color: "text-yellow-400" },
  coordinateur: { label: "Coordinateur", desc: "Orchestre d'autres agents via missions",  color: "text-accent" },
};

const STATUS_STYLES = {
  idle:      { dot: "bg-dim",         label: "En attente" },
  running:   { dot: "bg-ok animate-pulse", label: "En cours" },
  stopped:   { dot: "bg-faint",       label: "Arrêté" },
  error:     { dot: "bg-err",         label: "Erreur" },
  completed: { dot: "bg-blue-400",    label: "Terminé" },
};

function StatusDot({ status }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.idle;
  return (
    <span className={`inline-block h-2 w-2 flex-shrink-0 rounded-full ${s.dot}`} title={s.label} />
  );
}

function AgentCard({ agent, state, onStart, onStop, onRestart, onSelect, selected }) {
  const cat  = CATEGORY_LABELS[agent.category] ?? CATEGORY_LABELS.collecteur;
  const stat = STATUS_STYLES[state?.status] ?? STATUS_STYLES.idle;
  return (
    <div
      onClick={() => onSelect(agent)}
      className={`cursor-pointer rounded-xl border p-4 transition-colors hover:border-accent/40 ${
        selected ? "border-accent/60 bg-accent/5" : "border-edge bg-panel"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <StatusDot status={state?.status ?? "idle"} />
            <span className="truncate text-[14px] font-medium text-ink">{agent.name}</span>
          </div>
          <span className={`text-[11px] font-medium ${cat.color}`}>{cat.label}</span>
          <p className="mt-1 line-clamp-2 text-[12px] text-dim">{agent.description}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1.5">
        {(state?.status === "idle" || state?.status === "stopped" || state?.status === "error" || !state) ? (
          <button
            onClick={(e) => { e.stopPropagation(); onStart(agent.id); }}
            className="flex items-center gap-1 rounded-lg bg-ok/10 px-2.5 py-1 text-[12px] text-ok hover:bg-ok/20 transition-colors"
          >
            <Play size={11} /> Démarrer
          </button>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); onStop(agent.id); }}
            className="flex items-center gap-1 rounded-lg bg-err/10 px-2.5 py-1 text-[12px] text-err hover:bg-err/20 transition-colors"
          >
            <Square size={11} /> Arrêter
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onRestart(agent.id); }}
          className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-[12px] text-dim hover:bg-edge-soft transition-colors"
        >
          <RotateCcw size={11} /> Redémarrer
        </button>
        {state?.taskCount !== undefined && (
          <span className="ml-auto text-[11px] text-faint">{state.taskCount} tâche{state.taskCount !== 1 ? "s" : ""}</span>
        )}
      </div>
      {state?.lastTaskResult && (
        <p className="mt-2 truncate text-[11px] text-faint italic">{state.lastTaskResult}</p>
      )}
    </div>
  );
}

function AgentLogs({ agentId }) {
  const [lines, setLines] = useState([]);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!agentId) return;
    const fetch_ = () =>
      fetch(`/api/agents/${agentId}/logs?lines=80`)
        .then((r) => r.ok ? r.json() : { lines: [] })
        .then((d) => setLines(d.lines ?? []))
        .catch(() => {});
    fetch_();
    const t = setInterval(fetch_, 2000);
    return () => clearInterval(t);
  }, [agentId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [lines]);

  return (
    <div className="h-64 overflow-y-auto rounded-lg bg-black/40 p-3 font-mono text-[11px] nice-scroll">
      {lines.length === 0 ? (
        <span className="text-faint">Aucun log…</span>
      ) : (
        lines.map((line, i) => {
          let parsed = null;
          try { parsed = JSON.parse(line); } catch { /* ignore */ }
          const level = parsed?.level ?? "info";
          const msg   = parsed?.message ?? line;
          const color = level === "error" ? "text-err" : level === "warn" ? "text-warn" : "text-dim";
          return (
            <div key={i} className={`${color} leading-relaxed`}>
              <span className="text-faint">{parsed?.ts?.slice(11, 19) ?? ""} </span>{msg}
            </div>
          );
        })
      )}
      <div ref={bottomRef} />
    </div>
  );
}

function AgentDetail({ agent, state, onDelete }) {
  const [tab, setTab] = useState("state");
  const [msgs, setMsgs] = useState([]);
  const [msgInput, setMsgInput] = useState("");

  const fetchInbox = useCallback(() => {
    fetch(`/api/agents/${agent.id}/inbox`)
      .then((r) => r.ok ? r.json() : { messages: [] })
      .then((d) => setMsgs(d.messages ?? []))
      .catch(() => {});
  }, [agent.id]);

  useEffect(() => { if (tab === "messages") fetchInbox(); }, [tab, fetchInbox]);

  function sendMsg(type) {
    fetch("/api/agents/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: agent.id, type, payload: msgInput || null }),
    }).then(() => { setMsgInput(""); fetchInbox(); }).catch(() => {});
  }

  const tabs = ["state", "config", "logs", "messages"];
  const tabLabel = { state: "État", config: "Config", logs: "Logs", messages: "Messages" };

  return (
    <div className="flex flex-col gap-3">
      {/* Onglets */}
      <div className="flex gap-1 rounded-lg bg-edge-soft p-1">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-md px-2 py-1 text-[12px] font-medium transition-colors ${
              tab === t ? "bg-panel text-ink shadow-sm" : "text-dim hover:text-ink"
            }`}
          >
            {tabLabel[t]}
          </button>
        ))}
      </div>

      {tab === "state" && (
        <div className="flex flex-col gap-2 rounded-lg bg-panel p-3 text-[12px]">
          {state ? (
            <>
              <Row label="Statut" value={<><StatusDot status={state.status} /> <span className="ml-1">{STATUS_STYLES[state.status]?.label ?? state.status}</span></>} />
              {state.pid && <Row label="PID" value={state.pid} />}
              {state.startedAt && <Row label="Démarré" value={new Date(state.startedAt).toLocaleString()} />}
              {state.stoppedAt && <Row label="Arrêté" value={new Date(state.stoppedAt).toLocaleString()} />}
              <Row label="Tâches" value={state.taskCount} />
              <Row label="Erreurs" value={state.errorCount} />
              {state.lastHeartbeat && <Row label="Heartbeat" value={relativeTime(state.lastHeartbeat)} />}
              {state.lastTaskResult && (
                <div className="mt-1 rounded bg-edge-soft p-2 text-[11px] text-dim italic">{state.lastTaskResult}</div>
              )}
            </>
          ) : <span className="text-faint">Aucun état disponible</span>}
        </div>
      )}

      {tab === "config" && (
        <div className="rounded-lg bg-panel p-3">
          <pre className="overflow-auto text-[11px] text-dim whitespace-pre-wrap nice-scroll max-h-64">
            {JSON.stringify(agent, null, 2)}
          </pre>
        </div>
      )}

      {tab === "logs" && <AgentLogs agentId={agent.id} />}

      {tab === "messages" && (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              value={msgInput}
              onChange={(e) => setMsgInput(e.target.value)}
              placeholder="Payload (texte ou JSON)"
              className="flex-1 rounded-lg border border-edge bg-panel px-3 py-1.5 text-[12px] text-ink placeholder:text-faint focus:outline-none focus:border-accent"
            />
            <button onClick={() => sendMsg("task")} className="rounded-lg bg-accent/20 px-3 py-1.5 text-[12px] text-accent hover:bg-accent/30 transition-colors">
              <Send size={12} />
            </button>
          </div>
          <div className="flex gap-1">
            {["ping", "abort"].map((t) => (
              <button key={t} onClick={() => sendMsg(t)}
                className="rounded-lg border border-edge px-2 py-1 text-[11px] text-dim hover:bg-edge-soft transition-colors capitalize"
              >{t}</button>
            ))}
            <button onClick={fetchInbox} className="ml-auto text-[11px] text-faint hover:text-dim transition-colors flex items-center gap-1">
              <RefreshCw size={10} /> Rafraîchir
            </button>
          </div>
          <div className="max-h-40 overflow-y-auto rounded-lg bg-panel p-2 nice-scroll">
            {msgs.length === 0
              ? <span className="text-[11px] text-faint">Inbox vide</span>
              : msgs.map((m, i) => (
                <div key={i} className="rounded py-1 text-[11px] border-b border-edge last:border-0">
                  <span className="text-faint">{m.type}</span>
                  {" · "}
                  <span className="text-dim">{JSON.stringify(m.payload)?.slice(0, 80)}</span>
                </div>
              ))
            }
          </div>
        </div>
      )}

      {/* Danger zone */}
      <button
        onClick={() => onDelete(agent.id)}
        className="mt-1 flex items-center gap-1 self-start rounded-lg px-2.5 py-1 text-[12px] text-err/60 hover:text-err hover:bg-err/10 transition-colors"
      >
        <Trash2 size={11} /> Supprimer cet agent
      </button>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-faint">{label}</span>
      <span className="text-ink text-right">{value}</span>
    </div>
  );
}

function relativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return `il y a ${Math.round(diff / 1000)}s`;
  if (diff < 3_600_000) return `il y a ${Math.round(diff / 60_000)}min`;
  return new Date(iso).toLocaleTimeString();
}

function CreateForm({ onCreate }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("collecteur");
  const [description, setDescription] = useState("");
  const [intervalMs, setIntervalMs] = useState(60000);
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  async function submit() {
    if (!name.trim() || !description.trim()) return;
    setGenerating(true);
    setStatusMsg("Génération en cours…");

    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, category, description, intervalMs }),
      });
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop();
        for (const part of parts) {
          if (!part.trim().startsWith("data: ")) continue;
          try {
            const ev = JSON.parse(part.slice(6));
            if (ev.type === "status") setStatusMsg(ev.text);
            if (ev.type === "result") {
              setStatusMsg(`✅ Agent "${ev.agent?.name}" créé`);
              onCreate();
              setName(""); setDescription(""); setOpen(false);
            }
            if (ev.type === "error") setStatusMsg(`❌ ${ev.message}`);
          } catch { /* ignore */ }
        }
      }
    } catch (err) {
      setStatusMsg(`❌ ${err.message}`);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="rounded-xl border border-edge bg-panel overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-[13px] font-medium text-ink hover:bg-edge-soft transition-colors"
      >
        <span className="flex items-center gap-2"><Plus size={14} /> Créer un nouvel agent</span>
        {open ? <ChevronDown size={14} className="text-dim" /> : <ChevronRight size={14} className="text-dim" />}
      </button>

      {open && (
        <div className="flex flex-col gap-3 border-t border-edge p-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-[11px] text-faint">Nom de l'agent</label>
              <input
                value={name} onChange={(e) => setName(e.target.value)}
                placeholder="ex : Veilleur de Prix Amazon"
                className="w-full rounded-lg border border-edge bg-bg px-3 py-1.5 text-[13px] text-ink placeholder:text-faint focus:outline-none focus:border-accent"
              />
            </div>
            <div className="w-40">
              <label className="mb-1 block text-[11px] text-faint">Catégorie</label>
              <select
                value={category} onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-edge bg-bg px-3 py-1.5 text-[13px] text-ink focus:outline-none focus:border-accent"
              >
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[11px] text-faint">Description (ce que l'agent doit faire)</label>
            <textarea
              value={description} onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="ex : Surveille le prix d'un produit Amazon toutes les heures et m'alerte si ça descend sous 50€"
              className="w-full resize-none rounded-lg border border-edge bg-bg px-3 py-2 text-[13px] text-ink placeholder:text-faint focus:outline-none focus:border-accent"
            />
          </div>

          {(category === "collecteur" || category === "acteur") && (
            <div className="w-40">
              <label className="mb-1 block text-[11px] text-faint">Intervalle (ms)</label>
              <input
                type="number" min={5000} step={1000} value={intervalMs}
                onChange={(e) => setIntervalMs(Number(e.target.value))}
                className="w-full rounded-lg border border-edge bg-bg px-3 py-1.5 text-[13px] text-ink focus:outline-none focus:border-accent"
              />
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={submit}
              disabled={generating || !name.trim() || !description.trim()}
              className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-[13px] font-medium text-bg disabled:opacity-50 hover:bg-accent/90 transition-colors"
            >
              {generating ? <Loader2 size={13} className="animate-spin" /> : <Bot size={13} />}
              Générer l'agent
            </button>
            {statusMsg && <span className="text-[12px] text-dim">{statusMsg}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AgentFactory({ onBack }) {
  const [agents, setAgents] = useState([]);
  const [states, setStates] = useState({});
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("tous");
  const timer = useRef(null);

  const refresh = useCallback(() => {
    fetch("/api/agents")
      .then((r) => r.ok ? r.json() : { agents: [], states: {} })
      .then((d) => {
        setAgents(d.agents ?? []);
        setStates(d.states ?? {});
        // Mise à jour de l'agent sélectionné
        setSelected((prev) => prev ? (d.agents ?? []).find((a) => a.id === prev.id) ?? prev : null);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
    timer.current = setInterval(refresh, 3000);
    return () => clearInterval(timer.current);
  }, [refresh]);

  function doStart(id) {
    fetch(`/api/agents/${id}/start`, { method: "POST" }).then(refresh).catch(() => {});
  }
  function doStop(id) {
    fetch(`/api/agents/${id}/stop`, { method: "POST" }).then(refresh).catch(() => {});
  }
  function doRestart(id) {
    fetch(`/api/agents/${id}/restart`, { method: "POST" }).then(refresh).catch(() => {});
  }
  function doDelete(id) {
    fetch(`/api/agents/${id}`, { method: "DELETE" }).then(() => {
      setSelected(null);
      refresh();
    }).catch(() => {});
  }

  const categories = ["tous", "collecteur", "processeur", "acteur", "coordinateur"];
  const filtered = filter === "tous" ? agents : agents.filter((a) => a.category === filter);
  const running = agents.filter((a) => states[a.id]?.status === "running").length;

  return (
    <div className="flex h-screen flex-col bg-bg text-ink">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 border-b border-edge px-4 py-3">
        <button onClick={onBack} className="rounded-lg p-1.5 text-dim hover:bg-edge-soft transition-colors">
          <ArrowLeft size={16} />
        </button>
        <Bot size={18} className="text-accent" />
        <span className="text-[15px] font-semibold">Agent Factory</span>
        <span className="ml-1 rounded-full bg-ok/15 px-2 py-0.5 text-[11px] text-ok">
          {running} actif{running !== 1 ? "s" : ""}
        </span>
        <span className="ml-1 text-[12px] text-faint">{agents.length} agent{agents.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Colonne gauche */}
        <div className="flex w-[420px] shrink-0 flex-col gap-3 overflow-y-auto border-r border-edge p-4 nice-scroll">
          {/* Formulaire de création */}
          <CreateForm onCreate={refresh} />

          {/* Filtres */}
          <div className="flex flex-wrap gap-1">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setFilter(c)}
                className={`rounded-full px-3 py-1 text-[12px] capitalize transition-colors ${
                  filter === c
                    ? "bg-accent/20 text-accent"
                    : "border border-edge text-dim hover:border-accent/40 hover:text-ink"
                }`}
              >
                {c === "tous" ? `Tous (${agents.length})` : `${CATEGORY_LABELS[c]?.label} (${agents.filter((a) => a.category === c).length})`}
              </button>
            ))}
          </div>

          {/* Galerie */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <Bot size={32} className="text-faint" />
              <p className="text-[13px] text-faint">
                {agents.length === 0
                  ? "Aucun agent créé. Décris ce que tu veux automatiser ↑"
                  : "Aucun agent dans cette catégorie"}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filtered.map((a) => (
                <AgentCard
                  key={a.id}
                  agent={a}
                  state={states[a.id] ?? null}
                  onStart={doStart}
                  onStop={doStop}
                  onRestart={doRestart}
                  onSelect={setSelected}
                  selected={selected?.id === a.id}
                />
              ))}
            </div>
          )}
        </div>

        {/* Panneau détail */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 nice-scroll">
          {selected ? (
            <>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-[16px] font-semibold">{selected.name}</h2>
                  <span className={`text-[12px] font-medium ${CATEGORY_LABELS[selected.category]?.color}`}>
                    {CATEGORY_LABELS[selected.category]?.label} · {CATEGORY_LABELS[selected.category]?.desc}
                  </span>
                </div>
                <div className="flex gap-2">
                  {(states[selected.id]?.status === "running") ? (
                    <button onClick={() => doStop(selected.id)}
                      className="flex items-center gap-1.5 rounded-lg bg-err/10 px-3 py-1.5 text-[13px] text-err hover:bg-err/20 transition-colors">
                      <Square size={12} /> Arrêter
                    </button>
                  ) : (
                    <button onClick={() => doStart(selected.id)}
                      className="flex items-center gap-1.5 rounded-lg bg-ok/10 px-3 py-1.5 text-[13px] text-ok hover:bg-ok/20 transition-colors">
                      <Play size={12} /> Démarrer
                    </button>
                  )}
                  <button onClick={() => doRestart(selected.id)}
                    className="flex items-center gap-1.5 rounded-lg border border-edge px-3 py-1.5 text-[13px] text-dim hover:bg-edge-soft transition-colors">
                    <RotateCcw size={12} /> Redémarrer
                  </button>
                </div>
              </div>
              <AgentDetail
                agent={selected}
                state={states[selected.id] ?? null}
                onDelete={doDelete}
              />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
              <Bot size={40} className="text-faint" />
              <p className="text-[14px] text-faint">Sélectionne un agent pour voir ses détails</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
