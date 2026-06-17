import { useState } from "react";
import { Check, ClipboardCheck } from "lucide-react";

// Questionnaire de review d'un projet nocturne (#58/#59 vague 2) → axiomes.
// Source UNIQUE des cases (réutilisée par la galerie ET le Chat) ; même contrat
// que POST /api/nocturnal/:id/review (cases + aimé/pas aimé). Le backend
// (reviewToAxioms) prend les clés telles quelles → ajouter/séparer une case ne
// touche pas le serveur. « design » est séparé en charte graphique (esthétique
// pure) vs ergonomie/UX (placement, usage) : on aime souvent l'un sans l'autre.
export const REVIEW_QUESTIONS = [
  { key: "charte_graphique", label: "Charte graphique belle (couleurs, typo, esthétique)" },
  { key: "ergonomie", label: "Ergonomie & usage agréables (placement, navigation)" },
  { key: "fonctionnel", label: "C'est fonctionnel / complet" },
  { key: "originalite", label: "C'est original" },
  { key: "coherence", label: "Fidèle à mon style" },
  { key: "garder", label: "Je garderais ce code" },
];

export default function NocturnalReviewForm({ id, onReviewed = () => {}, onToast = () => {} }) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ answers: {}, liked: "", disliked: "" });

  async function submit() {
    if (sending) return;
    setSending(true);
    try {
      const r = await fetch(`/api/nocturnal/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setDone(true);
      onReviewed();
      onToast("success", "Review enregistrée → MangoAI apprend");
    } catch {
      onToast("error", "Échec de l'enregistrement de la review");
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <div className="self-start flex items-center gap-1.5 rounded-lg border border-ok/40 bg-ok/10 px-2.5 py-1 text-xs text-ok">
        <Check size={12} /> Reviewé → MangoAI a appris
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="self-start flex items-center gap-1 rounded-lg border border-accent/40 bg-accent/[0.06] px-2.5 py-1 text-xs text-accent-soft hover:bg-accent/[0.12] transition-colors"
      >
        <ClipboardCheck size={12} /> Reviewer ce projet
      </button>
    );
  }

  return (
    <div className="self-stretch flex flex-col gap-2 rounded-xl border border-accent/20 bg-accent/[0.04] p-3">
      <p className="text-xs font-semibold text-accent-soft">Review nocturne → axiomes</p>
      <div className="flex flex-col gap-1">
        {REVIEW_QUESTIONS.map((q) => (
          <label key={q.key} className="flex items-center gap-2 text-xs text-dim cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(form.answers[q.key])}
              onChange={(ev) => setForm((f) => ({ ...f, answers: { ...f.answers, [q.key]: ev.target.checked } }))}
            />
            {q.label}
          </label>
        ))}
      </div>
      <input
        value={form.liked}
        onChange={(ev) => setForm((f) => ({ ...f, liked: ev.target.value }))}
        placeholder="Ce que tu as aimé (optionnel)"
        className="rounded-md border border-edge bg-bg px-2 py-1 text-xs text-ink placeholder:text-faint focus:border-accent focus:outline-none"
      />
      <input
        value={form.disliked}
        onChange={(ev) => setForm((f) => ({ ...f, disliked: ev.target.value }))}
        placeholder="Ce que tu n'as pas aimé (optionnel)"
        className="rounded-md border border-edge bg-bg px-2 py-1 text-xs text-ink placeholder:text-faint focus:border-accent focus:outline-none"
      />
      <button
        onClick={submit}
        disabled={sending}
        className="self-start flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-soft disabled:opacity-50 transition-colors"
      >
        <Check size={13} /> {sending ? "…" : "Valider → MangoAI apprend"}
      </button>
    </div>
  );
}
