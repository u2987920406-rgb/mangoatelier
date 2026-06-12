import { useEffect, useRef, useState } from "react";

let nextId = 1;
const uid = () => nextId++;

export default function Chat({
  projectName,
  model,
  onPreviewUrl,
  onCost,
  onAgentDone,
  autoPrompt,
  onAutoPromptConsumed,
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const sessionRef = useRef(null); // Agent SDK session_id, kept across turns
  const listRef = useRef(null);

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

  // Sends the "🔧 Corriger" request as soon as the agent is idle
  useEffect(() => {
    if (!autoPrompt || busy) return;
    onAutoPromptConsumed?.();
    send(autoPrompt);
  }, [autoPrompt, busy]); // eslint-disable-line react-hooks/exhaustive-deps

  async function send(textArg) {
    const prompt = (typeof textArg === "string" ? textArg : input).trim();
    if (!prompt || busy) return;
    if (typeof textArg !== "string") setInput("");
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
      case "tool":
        push({ role: "tool", text: `${toolIcon(ev.name)} ${ev.name} ${ev.detail}`.trim() });
        break;
      case "version":
        push({ role: "status", text: `📌 Version sauvegardée (${ev.hash})` });
        break;
      case "result":
        sessionRef.current = ev.sessionId;
        onCost(ev.costUsd);
        if (!ev.ok) push({ role: "error", text: `L'agent s'est arrêté : ${ev.error}` });
        break;
      case "error":
        push({ role: "error", text: ev.message });
        break;
      default:
        break;
    }
  }

  return (
    <section className="chat">
      <div className="messages" ref={listRef}>
        {messages.length === 0 && (
          <div className="empty">
            Décris l'application que tu veux créer.
            <br />
            <em>« Crée une landing page pour une pizzeria »</em>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`msg msg-${m.role}`}>
            {m.text}
          </div>
        ))}
        {busy && <div className="msg msg-status pulse">⏳ L'agent travaille…</div>}
      </div>
      <div className="input-row">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Décris ton app… (Entrée pour envoyer)"
          rows={3}
          disabled={busy}
        />
        {busy ? (
          <button
            className="stop"
            onClick={() => fetch("/api/stop", { method: "POST" }).catch(() => {})}
          >
            ■ Stop
          </button>
        ) : (
          <button onClick={send} disabled={!input.trim()}>
            Envoyer
          </button>
        )}
      </div>
    </section>
  );
}

function toolIcon(name) {
  switch (name) {
    case "Write":
      return "📄";
    case "Edit":
      return "✏️";
    case "Read":
      return "👁️";
    case "Bash":
      return "💻";
    case "Glob":
    case "Grep":
      return "🔍";
    default:
      return "🔧";
  }
}
