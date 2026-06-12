import { CheckCircle2, AlertCircle, X, ExternalLink } from "lucide-react";

// Toast stack (bottom-right). App owns the list and auto-dismisses entries.
export default function Toasts({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-80">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`animate-pop flex items-start gap-2.5 rounded-xl border p-3 shadow-xl shadow-black/40 backdrop-blur bg-raised/95 ${
            t.kind === "error" ? "border-err/40" : "border-ok/40"
          }`}
        >
          {t.kind === "error" ? (
            <AlertCircle size={17} className="text-err shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 size={17} className="text-ok shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0 text-sm leading-snug">
            <div className="break-words">{t.text}</div>
            {t.linkUrl && (
              <a
                href={t.linkUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-ok font-mono text-xs hover:underline break-all"
              >
                <ExternalLink size={11} className="shrink-0" />
                {t.linkUrl.replace("https://", "")}
              </a>
            )}
          </div>
          <button
            onClick={() => onDismiss(t.id)}
            className="text-dim hover:text-ink shrink-0"
            aria-label="Fermer"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
