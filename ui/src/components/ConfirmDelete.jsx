import { useEffect, useRef, useState } from "react";

// Bouton de suppression dont la confirmation apparaît dans un popover ancré
// JUSTE sous le bouton (au lieu du window.confirm() natif, centré loin du
// curseur). Le bouton de confirmation tombe à quelques pixels sous la souris.
// Réutilisé pour la poubelle d'une carte projet ET le bouton de suppression en
// lot (Home), comme dans le header de l'atelier.
export default function ConfirmDelete({
  onConfirm,
  message = "Supprimer ? Cette action est irréversible.",
  confirmLabel = "Supprimer",
  align = "right", // côté d'ancrage du popover
  width = "w-56",
  disabled = false,
  className = "", // classes du conteneur relative (ex. self-stretch dans un flex)
  triggerClassName = "",
  triggerTitle = "Supprimer",
  children, // contenu du bouton déclencheur (icône et/ou texte)
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        disabled={disabled}
        title={triggerTitle}
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) setOpen((v) => !v);
        }}
        // !flex : garde le déclencheur visible tant que le popover est ouvert,
        // même si le parent le masque par défaut (hidden group-hover:flex).
        className={`${triggerClassName} ${open ? "!flex" : ""}`}
      >
        {children}
      </button>
      {open && (
        <div
          className={`absolute top-full z-50 mt-2 ${width} rounded-xl border border-edge bg-panel p-3 shadow-xl shadow-black/30 ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          <p className="mb-2.5 text-xs leading-relaxed text-dim">{message}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                onConfirm?.();
              }}
              className="flex-1 rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition-colors"
            >
              {confirmLabel}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
              }}
              className="flex-1 rounded-lg border border-edge px-2.5 py-1.5 text-xs text-dim hover:text-ink transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
