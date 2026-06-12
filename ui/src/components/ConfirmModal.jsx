// Themed replacement for window.confirm(). `config` is null when closed:
// { title, body, confirmLabel, onConfirm }
export default function ConfirmModal({ config, onClose }) {
  if (!config) return null;
  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="animate-pop w-[420px] max-w-[90vw] rounded-2xl border border-edge bg-raised p-5 shadow-2xl shadow-black/50">
        <h2 className="font-bold text-base">{config.title}</h2>
        <p className="mt-2 text-sm text-dim leading-relaxed whitespace-pre-wrap">{config.body}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-edge px-4 py-2 text-sm text-dim hover:text-ink hover:border-faint transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={() => {
              config.onConfirm();
              onClose();
            }}
            className="rounded-lg bg-err px-4 py-2 text-sm font-semibold text-white hover:brightness-110 transition"
          >
            {config.confirmLabel ?? "Confirmer"}
          </button>
        </div>
      </div>
    </div>
  );
}
