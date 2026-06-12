import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { ArrowUp, Bookmark, BrainCircuit, Sparkles, Square } from "lucide-react";
import ToolGroup from "./components/ToolGroup.jsx";

let nextId = 1;
const uid = () => nextId++;

export default function Chat({
  projectName,
  model,
  template,
  onPreviewUrl,
  onCost,
  onContext,
  onAgentDone,
  autoPrompt,
  onAutoPromptConsumed,
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const sessionRef = useRef(null); // Agent SDK session_id, kept across turns
  const listRef = useRef(null);
  const inputRef = useRef(null);

  // Switching projects = different conversation; the backend will resume
  // the project's stored session on the next message. The persisted chat
  // history of the project replaces whatever is on screen.
  useEffect(() => {
    sessionRef.current = null;
    let cancelled = false;
    if (!projectName.trim()) {
      setMessages([]);
      return;
    }
    fetch(`/api/history/${encodeURIComponent(projectName)}`)
      .then((r) => (r.ok ? r.json() : { messages: [] }))
      .then((d) => {
        if (cancelled) return;
        setMessages((d.messages ?? []).map((m) => ({ id: uid(), role: m.role, text: m.text })));
        requestAnimationFrame(() => {
          listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [projectName]);

  const push = (msg) => {
    setMessages((prev) => [...prev, { id: uid(), ...msg }]);
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    });
  };

  // Sends the auto-prompt (fix request or Home's initial idea) once idle
  useEffect(() => {
    if (!autoPrompt || busy) return;
    onAutoPromptConsumed?.();
    send(autoPrompt);
  }, [autoPrompt, busy]); // eslint-disable-line react-hooks/exhaustive-deps

  async function send(textArg) {
    const prompt = (typeof textArg === "string" ? textArg : input).trim();
    if (!prompt || busy) return;
    if (typeof textArg !== "string") {
      setInput("");
      if (inputRef.current) inputRef.current.style.height = "auto";
    }
    setBusy(true);
    push({ role: "user", text: prompt });

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          projectName,
          model,
          template: template || undefined,
          sessionId: sessionRef.current ?? undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        push({ role: "error", text: err.error ?? `Erreur HTTP ${res.status}` });
        return;
      }

      // Parse the SSE stream manually
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop();
        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data: ")) continue;
          handleEvent(JSON.parse(line.slice(6)));
        }
      }
    } catch (err) {
      push({ role: "error", text: String(err) });
    } finally {
      setBusy(false);
      onAgentDone();
    }
  }

  function handleEvent(ev) {
    switch (ev.type) {
      case "status":
        push({ role: "status", text: ev.text });
        break;
      case "preview":
        onPreviewUrl(ev.url);
        break;
      case "text":
        push({ role: "agent", text: ev.text });
        break;
      case "thinking":
        push({ role: "thinking", text: ev.text });
        break;
      case "tool":
        push({ role: "tool", name: ev.name, detail: ev.detail });
        break;
      case "version":
        push({ role: "version", text: `Version sauvegardée (${ev.hash})` });
        break;
      case "result":
        sessionRef.current = ev.sessionId;
        onCost(ev.costUsd);
        if (ev.contextTokens && ev.contextWindow) {
          onContext?.({ tokens: ev.contextTokens, window: ev.contextWindow });
        }
        if (!ev.ok) push({ role: "error", text: `L'agent s'est arrêté : ${ev.error}` });
        break;
      case "error":
        push({ role: "error", text: ev.message });
        break;
      default:
        break;
    }
  }

  function autoGrow(e) {
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }

  return (
    <section className="flex w-2/5 min-w-[360px] flex-col border-r border-edge bg-panel">
      <div ref={listRef} className="nice-scroll flex flex-1 flex-col gap-2.5 overflow-y-auto p-4">
        {messages.length === 0 && !busy && (
          <div className="m-auto flex flex-col items-center gap-3 text-center text-dim">
            <Sparkles size={28} className="text-accent-soft" />
            <p className="leading-relaxed">
              Décris ce que tu veux construire,
              <br />
              MangoAI s'occupe du code.
            </p>
          </div>
        )}
        {groupMessages(messages).map((g) =>
          g.kind === "tools" ? (
            <ToolGroup key={g.key} items={g.items} busy={busy && g.isLast} />
          ) : (
            <Message key={g.key} m={g.message} />
          ),
        )}
        {busy && (
          <div className="shimmer-text self-start px-1 py-0.5 text-[13px] font-medium">
            MangoAI travaille…
          </div>
        )}
      </div>

      <div className="border-t border-edge p-3">
        <div className="flex items-end gap-2 rounded-2xl border border-edge bg-bg p-2 pl-3.5 focus-within:border-accent/60 transition-colors">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onInput={autoGrow}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Décris ton app ou demande une modification…"
            rows={1}
            className="max-h-40 flex-1 resize-none bg-transparent py-1.5 text-sm leading-relaxed placeholder:text-faint focus:outline-none"
          />
          {busy ? (
            <button
              onClick={() => fetch("/api/stop", { method: "POST" }).catch(() => {})}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-err/90 text-white hover:bg-err transition-colors"
              title="Arrêter l'agent"
            >
              <Square size={14} fill="currentColor" />
            </button>
          ) : (
            <button
              onClick={send}
              disabled={!input.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-white hover:bg-accent-soft disabled:opacity-30 transition"
              title="Envoyer (Entrée)"
            >
              <ArrowUp size={17} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

// Collapse consecutive tool messages into one expandable group
function groupMessages(messages) {
  const out = [];
  for (const m of messages) {
    const prev = out[out.length - 1];
    if (m.role === "tool") {
      if (prev?.kind === "tools") prev.items.push(m);
      else out.push({ kind: "tools", key: `g${m.id}`, items: [m] });
    } else {
      out.push({ kind: "msg", key: m.id, message: m });
    }
  }
  out.forEach((g, i) => {
    g.isLast = i === out.length - 1;
  });
  return out;
}

function Message({ m }) {
  switch (m.role) {
    case "user":
      return (
        <div className="animate-fade-up max-w-[85%] self-end rounded-2xl rounded-br-md bg-bubble px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words">
          {m.text}
        </div>
      );
    case "agent":
      return (
        <div className="animate-fade-up max-w-[95%] self-start">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-accent-soft">
            <Sparkles size={12} />
            MangoAI
          </div>
          <div className="md rounded-2xl rounded-tl-md border border-accent/15 bg-accent/[0.06] px-3.5 py-2.5 text-sm leading-relaxed break-words">
            <ReactMarkdown>{m.text}</ReactMarkdown>
          </div>
        </div>
      );
    case "thinking":
      return (
        <details className="animate-fade-up max-w-[95%] self-start">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 px-1 text-xs font-medium text-faint transition-colors hover:text-dim">
            <BrainCircuit size={12} />
            Réflexion
          </summary>
          <div className="mt-1 rounded-xl border border-edge-soft bg-panel px-3.5 py-2.5 text-xs leading-relaxed text-dim whitespace-pre-wrap break-words">
            {m.text}
          </div>
        </details>
      );
    case "version":
      return (
        <div className="animate-fade-up flex items-center gap-1.5 self-start px-1 font-mono text-xs text-ok/80">
          <Bookmark size={11} />
          {m.text}
        </div>
      );
    case "error":
      return (
        <div className="animate-fade-up self-stretch rounded-xl border border-err/50 bg-err/10 px-3.5 py-2.5 text-sm text-err whitespace-pre-wrap break-words">
          {m.text}
        </div>
      );
    case "status":
    default:
      return (
        <div className="animate-fade-up self-start px-1 font-mono text-xs text-faint">
          {m.text}
        </div>
      );
  }
}
