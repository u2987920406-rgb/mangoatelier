import { useEffect, useRef, useState } from "react";
import {
  ExternalLink,
  Layers,
  Monitor,
  MonitorX,
  MousePointerClick,
  RefreshCw,
  Smartphone,
  TriangleAlert,
  Wrench,
  X,
} from "lucide-react";

export default function Preview({
  url,
  reloadKey,
  errors = [],
  onFix,
  onReload,
  inspecting = false,
  onToggleInspect,
  selectedElement = null,
  onClearSelection = () => {},
}) {
  const [device, setDevice] = useState("desktop");
  const iframeRef = useRef(null);

  // Relais clic→source (#5) : on (dé)active le mode inspection dans l'aperçu via
  // postMessage. Re-déclenché quand l'iframe se recharge (reloadKey/url) pour que
  // le mode survive à un rechargement. Cross-origin : la cible "*" est volontaire.
  useEffect(() => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    const send = () =>
      win.postMessage(
        { source: "mangoai-builder", type: inspecting ? "inspect-on" : "inspect-off" },
        "*",
      );
    send();
    // L'iframe peut ne pas avoir fini de charger son script au moment du toggle.
    const t = setTimeout(send, 400);
    return () => clearTimeout(t);
  }, [inspecting, reloadKey, url]);

  return (
    <section className="flex min-w-0 flex-1 flex-col bg-bg">
      {/* Browser-style toolbar */}
      <div className="flex h-11 shrink-0 items-center gap-2.5 border-b border-edge px-3.5">
        <span
          className={`h-2 w-2 shrink-0 rounded-full transition-colors ${
            url ? "bg-ok shadow-[0_0_6px_rgba(62,207,142,0.7)]" : "bg-edge"
          }`}
          title={url ? "Serveur de preview actif" : "Preview arrêtée"}
        />
        <span className="min-w-0 flex-1 truncate rounded-lg bg-panel px-3 py-1.5 font-mono text-xs text-dim">
          {url ?? "Aucun aperçu — envoie un premier message"}
        </span>

        <div className="flex rounded-lg border border-edge p-0.5">
          <button
            onClick={() => setDevice("desktop")}
            className={`flex h-7 w-8 items-center justify-center rounded-md transition-colors ${
              device === "desktop" ? "bg-edge-soft text-ink" : "text-faint hover:text-dim"
            }`}
            title="Aperçu desktop"
          >
            <Monitor size={14} />
          </button>
          <button
            onClick={() => setDevice("mobile")}
            className={`flex h-7 w-8 items-center justify-center rounded-md transition-colors ${
              device === "mobile" ? "bg-edge-soft text-ink" : "text-faint hover:text-dim"
            }`}
            title="Aperçu mobile (390px)"
          >
            <Smartphone size={14} />
          </button>
        </div>

        <button
          onClick={onToggleInspect}
          disabled={!url}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors disabled:opacity-30 ${
            inspecting
              ? "bg-accent/15 text-accent ring-1 ring-accent/40"
              : "text-dim hover:bg-panel hover:text-ink"
          }`}
          title={
            inspecting
              ? "Mode inspection actif — clique un élément de l'aperçu"
              : "Inspecter : clique un élément pour l'éditer (clic→code)"
          }
        >
          <MousePointerClick size={14} />
        </button>
        <button
          onClick={onReload}
          disabled={!url}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-dim hover:bg-panel hover:text-ink disabled:opacity-30 transition-colors"
          title="Recharger l'aperçu"
        >
          <RefreshCw size={14} />
        </button>
        <a
          href={url ?? "#"}
          target="_blank"
          rel="noreferrer"
          className={`flex h-8 w-8 items-center justify-center rounded-lg text-dim hover:bg-panel hover:text-ink transition-colors ${
            url ? "" : "pointer-events-none opacity-30"
          }`}
          title="Ouvrir dans un nouvel onglet"
        >
          <ExternalLink size={14} />
        </a>
      </div>

      {/* Runtime errors reported by the generated app */}
      {errors.length > 0 && (
        <div className="flex shrink-0 items-center gap-2.5 border-b border-err/40 bg-err/10 px-3.5 py-2 text-[13px] text-err">
          <TriangleAlert size={15} className="shrink-0" />
          <span className="min-w-0 flex-1 truncate">
            {errors.length} erreur{errors.length > 1 ? "s" : ""} détectée
            {errors.length > 1 ? "s" : ""} — {errors[0]}
          </span>
          <button
            onClick={onFix}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-err px-3 py-1.5 text-xs font-semibold text-white hover:brightness-110 transition"
          >
            <Wrench size={12} />
            Corriger
          </button>
        </div>
      )}

      {selectedElement && (
        <div className="flex shrink-0 items-center gap-2.5 border-b border-accent/30 bg-accent/[0.06] px-3.5 py-2 text-[13px]">
          <Layers size={13} className="shrink-0 text-accent-soft" />
          <code className="rounded bg-accent/10 px-1.5 py-0.5 text-xs text-accent">
            &lt;{selectedElement.tag}&gt;
          </code>
          {selectedElement.text && (
            <span className="min-w-0 flex-1 truncate text-dim">
              {selectedElement.text}
            </span>
          )}
          {selectedElement.src && (
            <span className="shrink-0 font-mono text-xs text-faint">
              {selectedElement.src}
            </span>
          )}
          <button
            onClick={onClearSelection}
            className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-faint hover:text-ink transition-colors"
            title="Effacer la sélection"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Framed live preview */}
      <div className="flex min-h-0 flex-1 p-4">
        {url ? (
          <div
            className={`flex overflow-hidden rounded-xl border border-edge bg-white shadow-2xl shadow-black/40 transition-all ${
              device === "mobile" ? "mx-auto w-[390px]" : "w-full"
            }`}
          >
            <iframe
              ref={iframeRef}
              key={`${url}-${reloadKey}`}
              src={url}
              title="Aperçu de l'app générée"
              className="h-full w-full border-0"
            />
          </div>
        ) : (
          <div className="m-auto flex flex-col items-center gap-3 text-faint">
            <MonitorX size={32} />
            <span className="text-sm">L'aperçu de ton app s'affichera ici</span>
          </div>
        )}
      </div>
    </section>
  );
}
