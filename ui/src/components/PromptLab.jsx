import { useState, useRef, useCallback } from "react";
import { ArrowLeft, Zap, Scale, Brain, Play, Clock } from "lucide-react";

const MODELS = [
  {
    key: "haiku",
    label: "Haiku",
    icon: <Zap size={14} />,
    badge: "bg-green-500/20 text-green-400 border border-green-500/30",
    header: "bg-green-500/10 border-green-500/20",
    ring: "ring-green-500/30",
    emoji: "⚡",
  },
  {
    key: "sonnet",
    label: "Sonnet",
    icon: <Scale size={14} />,
    badge: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
    header: "bg-blue-500/10 border-blue-500/20",
    ring: "ring-blue-500/30",
    emoji: "⚖️",
  },
  {
    key: "opus",
    label: "Opus",
    icon: <Brain size={14} />,
    badge: "bg-violet-500/20 text-violet-400 border border-violet-500/30",
    header: "bg-violet-500/10 border-violet-500/20",
    ring: "ring-violet-500/30",
    emoji: "🧠",
  },
];

function useTimer() {
  const [elapsed, setElapsed] = useState(null);
  const intervalRef = useRef(null);
  const startRef = useRef(null);

  const start = useCallback(() => {
    setElapsed(null);
    startRef.current = Date.now();
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setElapsed(((Date.now() - startRef.current) / 1000).toFixed(1));
    }, 100);
  }, []);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (startRef.current) {
      setElapsed(((Date.now() - startRef.current) / 1000).toFixed(1));
    }
  }, []);

  const reset = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    startRef.current = null;
    setElapsed(null);
  }, []);

  return { elapsed, start, stop, reset };
}

function ModelColumn({ model, text, done, elapsed, selected }) {
  if (!selected) {
    return (
      <div className="flex-1 flex flex-col rounded-xl border border-edge bg-panel/40 opacity-40">
        <div className="px-4 py-3 border-b border-edge flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${model.badge}`}>
            {model.emoji} {model.label}
          </span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-faint text-sm">Non sélectionné</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex-1 flex flex-col rounded-xl border border-edge bg-panel/60 ${done ? "" : "ring-1 " + model.ring}`}>
      <div className={`px-4 py-3 border-b border-edge flex items-center justify-between ${model.header} rounded-t-xl`}>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${model.badge}`}>
          {model.emoji} {model.label}
        </span>
        {elapsed !== null && (
          <span className="flex items-center gap-1 text-xs text-dim">
            <Clock size={11} />
            {elapsed}s
          </span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-4 min-h-0">
        {text ? (
          <pre className="text-ink text-sm whitespace-pre-wrap font-sans leading-relaxed">
            {text}
            {!done && (
              <span className="inline-block w-1.5 h-4 bg-accent ml-0.5 animate-pulse align-middle" />
            )}
          </pre>
        ) : (
          <div className="flex items-center gap-2 text-dim text-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            En attente…
          </div>
        )}
      </div>
      {done && (
        <div className="px-4 py-2 border-t border-edge">
          <span className="text-xs text-faint">
            {text.length} caractères
          </span>
        </div>
      )}
    </div>
  );
}

export default function PromptLab({ onBack }) {
  const [prompt, setPrompt] = useState("");
  const [selected, setSelected] = useState({ haiku: true, sonnet: true, opus: true });
  const [running, setRunning] = useState(false);

  const [texts, setTexts] = useState({ haiku: "", sonnet: "", opus: "" });
  const [done, setDone] = useState({ haiku: false, sonnet: false, opus: false });

  const timers = {
    haiku: useTimer(),
    sonnet: useTimer(),
    opus: useTimer(),
  };

  const toggleModel = (key) => {
    setSelected((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const selectedModels = MODELS.filter((m) => selected[m.key]).map((m) => m.key);
  const canRun = prompt.trim().length > 0 && selectedModels.length > 0 && !running;

  const handleRun = async () => {
    if (!canRun) return;

    setRunning(true);
    setTexts({ haiku: "", sonnet: "", opus: "" });
    setDone({ haiku: false, sonnet: false, opus: false });

    // Start timers for selected models
    selectedModels.forEach((key) => {
      timers[key].start();
    });
    // Reset unselected
    MODELS.forEach((m) => {
      if (!selected[m.key]) timers[m.key].reset();
    });

    try {
      const res = await fetch("/api/promptlab/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), models: selectedModels }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error("PromptLab error:", err);
        setRunning(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop();

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data: ")) continue;
          let ev;
          try {
            ev = JSON.parse(line.slice(6));
          } catch {
            continue;
          }

          if (ev.type === "chunk" && ev.model) {
            setTexts((prev) => ({ ...prev, [ev.model]: prev[ev.model] + ev.text }));
          } else if (ev.type === "done" && ev.model) {
            timers[ev.model].stop();
            setDone((prev) => ({ ...prev, [ev.model]: true }));
          } else if (ev.type === "error" && ev.model) {
            timers[ev.model].stop();
            setTexts((prev) => ({
              ...prev,
              [ev.model]: prev[ev.model] + `\n[Erreur: ${ev.message}]`,
            }));
            setDone((prev) => ({ ...prev, [ev.model]: true }));
          }
        }
      }
    } catch (err) {
      console.error("PromptLab fetch error:", err);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 bg-bg text-ink">
      {/* Panneau gauche */}
      <div className="w-2/5 flex flex-col border-r border-edge bg-panel p-5 gap-4 min-h-0">
        {/* En-tête */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-dim hover:text-ink transition-colors text-sm"
          >
            <ArrowLeft size={16} />
            Retour
          </button>
          <span className="text-edge-soft">|</span>
          <h1 className="text-lg font-semibold text-accent">Lab de Prompts</h1>
        </div>

        {/* Textarea */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-dim uppercase tracking-wider">
            Prompt
          </label>
          <textarea
            rows={8}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Entre un prompt à tester…"
            className="w-full resize-none rounded-lg border border-edge bg-bg text-ink placeholder:text-faint p-3 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors leading-relaxed"
          />
        </div>

        {/* Sélection des modèles */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-dim uppercase tracking-wider">
            Modèles
          </span>
          <div className="flex flex-col gap-2">
            {MODELS.map((m) => (
              <label
                key={m.key}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <input
                  type="checkbox"
                  checked={selected[m.key]}
                  onChange={() => toggleModel(m.key)}
                  className="w-4 h-4 rounded border-edge accent-accent cursor-pointer"
                />
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium transition-opacity ${m.badge} ${
                    selected[m.key] ? "opacity-100" : "opacity-40"
                  }`}
                >
                  {m.emoji} {m.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Bouton Lancer */}
        <button
          onClick={handleRun}
          disabled={!canRun}
          className={`mt-auto flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium text-sm transition-all ${
            canRun
              ? "bg-accent text-white hover:bg-accent/90 active:scale-95 shadow-lg shadow-accent/20"
              : "bg-panel border border-edge text-faint cursor-not-allowed"
          }`}
        >
          <Play size={15} />
          {running ? "En cours…" : "Lancer"}
        </button>
      </div>

      {/* Panneau droit */}
      <div className="flex-1 flex flex-col min-h-0 p-5 gap-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-dim uppercase tracking-wider">
            Résultats
          </span>
          {running && (
            <span className="flex items-center gap-1.5 text-xs text-accent-soft">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
              Streaming…
            </span>
          )}
        </div>

        <div className="flex gap-3 flex-1 min-h-0">
          {MODELS.map((m) => (
            <ModelColumn
              key={m.key}
              model={m}
              text={texts[m.key]}
              done={done[m.key]}
              elapsed={timers[m.key].elapsed}
              selected={selected[m.key]}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
