import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { ArrowUp, Bookmark, BrainCircuit, Paperclip, Scan, Sparkles, Square, X } from "lucide-react";
import ToolGroup from "./components/ToolGroup.jsx";

let nextId = 1;
const uid = () => nextId++;

const CHAT_MODES = [
  { id: "construire", label: "Construire", model: "sonnet", mode: "elite" },
  { id: "planifier",  label: "Planifier",  model: "opus",   mode: "elite" },
  { id: "discuter",   label: "Discuter",   model: "haiku",  mode: "mvp"   },
];

export default function Chat({
  projectName,
  model,
  mode,
  template,
  onPreviewUrl,
  onCost,
  onContext,
  onAgentDone,
  autoPrompt,
  onAutoPromptConsumed,
  seedInput,
  onSeedConsumed,
  editTarget,
  onEditTargetConsumed,
  onChatMode = () => {},
  showThinking = true,
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [attachments, setAttachments] = useState([]); // File[] — images/PDF joints
  const sessionRef = useRef(null); // Agent SDK session_id, kept across turns
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const fileRef = useRef(null);

  const ACCEPTED = /\.(png|jpe?g|webp|gif|pdf)$/i;
  const addFiles = (files) => {
    const valid = [...files].filter((f) => f && ACCEPTED.test(f.name || ".png"));
    if (valid.length === 0) return;
    setAttachments((prev) => [...prev, ...valid].slice(0, 6));
  };

  // Snap mode: the user draws a rectangle over the preview; the backend
  // re-renders the preview at the iframe's exact size and crops that zone.
  const [snapMode, setSnapMode] = useState(false);
  const [snapBusy, setSnapBusy] = useState(false);
  const [snapRect, setSnapRect] = useState(null); // {x, y, w, h} viewport coords
  const snapStart = useRef(null);

  useEffect(() => {
    if (!snapMode) return;
    const onKey = (e) => e.key === "Escape" && cancelSnap();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [snapMode]);

  const cancelSnap = () => {
    setSnapMode(false);
    setSnapRect(null);
    snapStart.current = null;
  };

  async function finishSnap() {
    const rect = snapRect;
    cancelSnap();
    if (!rect || rect.w < 8 || rect.h < 8) return;
    const iframe = document.querySelector("iframe");
    if (!iframe) {
      push({ role: "status", text: "Aucun aperçu à capturer — lance d'abord l'app." });
      return;
    }
    // Intersect the drawn rectangle with the preview iframe
    const r = iframe.getBoundingClientRect();
    const x1 = Math.max(rect.x, r.left);
    const y1 = Math.max(rect.y, r.top);
    const x2 = Math.min(rect.x + rect.w, r.right);
    const y2 = Math.min(rect.y + rect.h, r.bottom);
    if (x2 - x1 < 8 || y2 - y1 < 8) {
      push({ role: "status", text: "La zone capturée doit recouvrir l'aperçu (panneau de droite)." });
      return;
    }
    setSnapBusy(true);
    try {
      const res = await fetch("/api/snap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName,
          viewport: { width: Math.round(r.width), height: Math.round(r.height) },
          box: {
            x: Math.round(x1 - r.left),
            y: Math.round(y1 - r.top),
            width: Math.round(x2 - x1),
            height: Math.round(y2 - y1),
          },
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? `Erreur HTTP ${res.status}`);
      const bytes = Uint8Array.from(atob(d.data), (c) => c.charCodeAt(0));
      addFiles([new File([bytes], "capture-zone.png", { type: "image/png" })]);
    } catch (err) {
      push({ role: "error", text: `Capture impossible : ${err.message ?? err}` });
    } finally {
      setSnapBusy(false);
    }
  }

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

  // Précharge le composer depuis la sélection clic→source (#5) — SANS envoyer :
  // l'utilisateur complète par le changement voulu, puis envoie lui-même.
  useEffect(() => {
    if (!seedInput) return;
    onSeedConsumed?.();
    setInput(seedInput);
    const el = inputRef.current;
    if (el) {
      el.focus();
      requestAnimationFrame(() => {
        el.style.height = "auto";
        el.style.height = `${el.scrollHeight}px`;
        el.setSelectionRange(el.value.length, el.value.length);
      });
    }
  }, [seedInput]); // eslint-disable-line react-hooks/exhaustive-deps

  async function send(textArg) {
    const typed = (typeof textArg === "string" ? textArg : input).trim();
    // Auto-prompts (fix requests) never carry attachments
    const files = typeof textArg === "string" ? [] : attachments;
    if ((!typed && files.length === 0) || busy) return;
    // Cible d'édition visuelle (#6) : seulement pour un envoi utilisateur (pas un
    // auto-prompt), capturée puis consommée pour ce message.
    const useEdit = typeof textArg !== "string" ? editTarget : null;
    if (typeof textArg !== "string") {
      setInput("");
      setAttachments([]);
      if (inputRef.current) inputRef.current.style.height = "auto";
      if (useEdit) onEditTargetConsumed?.();
    }
    setBusy(true);

    try {
      // Upload attachments first; their paths are prepended to the prompt so
      // the agent Reads them (Read handles PNG/JPEG/PDF natively).
      let prompt = typed || "Analyse les fichiers joints et dis-moi ce que tu en comprends.";
      if (files.length > 0) {
        const paths = [];
        for (const f of files) {
          const r = await fetch(
            `/api/upload/${encodeURIComponent(projectName)}?filename=${encodeURIComponent(f.name || "collage.png")}`,
            { method: "POST", body: f },
          );
          const d = await r.json().catch(() => ({}));
          if (!r.ok) throw new Error(d.error ?? `Échec de l'envoi de ${f.name}`);
          paths.push(d.path);
        }
        prompt = `[Fichiers joints : ${paths.join(", ")}]\n\n${prompt}`;
      }
      push({ role: "user", text: prompt });

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          projectName,
          model,
          mode,
          template: template || undefined,
          sessionId: sessionRef.current ?? undefined,
          editTarget: useEdit ?? undefined,
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
      {snapMode && (
        <div
          className="fixed inset-0 z-50 cursor-crosshair bg-black/30"
          onMouseDown={(e) => {
            snapStart.current = { x: e.clientX, y: e.clientY };
            setSnapRect({ x: e.clientX, y: e.clientY, w: 0, h: 0 });
          }}
          onMouseMove={(e) => {
            const s = snapStart.current;
            if (!s) return;
            setSnapRect({
              x: Math.min(s.x, e.clientX),
              y: Math.min(s.y, e.clientY),
              w: Math.abs(e.clientX - s.x),
              h: Math.abs(e.clientY - s.y),
            });
          }}
          onMouseUp={finishSnap}
        >
          <div className="pointer-events-none absolute left-1/2 top-6 -translate-x-1/2 rounded-xl border border-edge bg-panel px-4 py-2 text-sm text-dim shadow-lg">
            Glisse pour capturer une zone de l'aperçu — Échap pour annuler
          </div>
          {snapRect && snapRect.w > 0 && (
            <div
              className="pointer-events-none absolute border-2 border-accent bg-accent/10"
              style={{ left: snapRect.x, top: snapRect.y, width: snapRect.w, height: snapRect.h }}
            />
          )}
        </div>
      )}
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
            <Message key={g.key} m={g.message} showThinking={showThinking} />
          ),
        )}
        {busy && (
          <div className="shimmer-text self-start px-1 py-0.5 text-[13px] font-medium">
            MangoAI travaille…
          </div>
        )}
      </div>

      <div className="border-t border-edge p-3">
        <div
          className="rounded-2xl border border-edge bg-bg p-2 focus-within:border-accent/60 transition-colors"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            addFiles(e.dataTransfer.files);
          }}
        >
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-1.5 pb-2">
              {attachments.map((f, i) => (
                <span
                  key={`${f.name}-${i}`}
                  className="flex items-center gap-1.5 rounded-lg border border-edge bg-panel px-2 py-1 text-xs text-dim"
                >
                  <AttachmentThumb file={f} />
                  <span className="max-w-40 truncate">{f.name}</span>
                  <button
                    onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}
                    className="text-faint hover:text-err transition-colors"
                    title="Retirer"
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-1 px-1.5 pb-2">
            {CHAT_MODES.map((cm) => {
              const active = cm.model === model && cm.mode === mode;
              return (
                <button
                  key={cm.id}
                  onClick={() => onChatMode({ model: cm.model, mode: cm.mode })}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                    active
                      ? "bg-accent/15 text-accent"
                      : "text-faint hover:text-dim hover:bg-edge-soft"
                  }`}
                >
                  {cm.label}
                </button>
              );
            })}
          </div>
          <div className="flex items-end gap-1.5 pl-1.5">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-faint hover:text-ink disabled:opacity-30 transition-colors"
            title="Joindre une image ou un PDF (ou colle/glisse-le ici)"
          >
            <Paperclip size={16} />
          </button>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept=".png,.jpg,.jpeg,.webp,.gif,.pdf"
            className="hidden"
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <button
            onClick={() => setSnapMode(true)}
            disabled={busy || snapBusy}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors disabled:opacity-30 ${
              snapBusy ? "animate-pulse text-accent" : "text-faint hover:text-ink"
            }`}
            title="Snap : capturer une zone de l'aperçu"
          >
            <Scan size={16} />
          </button>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onInput={autoGrow}
            onPaste={(e) => {
              const pasted = [...e.clipboardData.items]
                .filter((it) => it.kind === "file")
                .map((it) => it.getAsFile())
                .filter(Boolean);
              if (pasted.length > 0) {
                e.preventDefault();
                addFiles(pasted);
              }
            }}
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
              disabled={!input.trim() && attachments.length === 0}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-white hover:bg-accent-soft disabled:opacity-30 transition"
              title="Envoyer (Entrée)"
            >
              <ArrowUp size={17} strokeWidth={2.5} />
            </button>
          )}
          </div>
        </div>
      </div>
    </section>
  );
}

// Image attachments get a live thumbnail in their chip; other files (PDF)
// keep the paperclip icon. The object URL is revoked on unmount.
function AttachmentThumb({ file }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (!file.type?.startsWith("image/")) return undefined;
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  if (!url) return <Paperclip size={10} className="shrink-0 text-accent-soft" />;
  return <img src={url} alt="" className="h-5 w-5 shrink-0 rounded object-cover" />;
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

function Message({ m, showThinking = true }) {
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
      if (!showThinking) return null;
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
