import { useRef, useState } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";

// Idée #61 vague 2 — micro flottant global : capter une idée à la voix depuis
// n'importe quel écran. Enregistre → transcrit (Whisper, /api/transcribe) →
// sauvegarde une note (/api/notes, tags auto côté serveur). Réutilise le pattern
// MediaRecorder de Chat.jsx.
export default function QuickNoteMic({ onToast }) {
  const [listening, setListening] = useState(false);
  const [saving, setSaving] = useState(false);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);

  async function toggle() {
    if (listening) {
      recorderRef.current?.stop();
      return;
    }
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      onToast?.("error", "Micro indisponible (autorisation refusée ?)");
      return;
    }
    chunksRef.current = [];
    const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      setListening(false);
      setSaving(true);
      try {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const form = new FormData();
        form.append("audio", blob, "record.webm");
        const tr = await fetch("/api/transcribe", { method: "POST", body: form });
        if (!tr.ok) {
          const err = await tr.json().catch(() => ({}));
          onToast?.("error", err.error ? `Transcription échouée : ${err.error}` : `Transcription échouée (HTTP ${tr.status}).`);
          setSaving(false);
          return;
        }
        const { text } = await tr.json().catch(() => ({}));
        if (text?.trim()) {
          await fetch("/api/notes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: text.trim() }),
          });
          onToast?.("success", "Note vocale enregistrée 🎙️");
        } else {
          onToast?.("error", "Rien transcrit — réessaie");
        }
      } catch {
        onToast?.("error", "Échec de la note vocale");
      }
      setSaving(false);
    };
    recorder.start();
    recorderRef.current = recorder;
    setListening(true);
  }

  return (
    <button
      onClick={toggle}
      disabled={saving}
      title={listening ? "Arrêter et enregistrer la note" : saving ? "Transcription…" : "Note vocale rapide (dicter une idée)"}
      className={`fixed bottom-4 left-4 z-30 flex h-11 w-11 items-center justify-center rounded-full border shadow-lg transition-colors ${
        listening
          ? "animate-pulse border-err/50 bg-err/15 text-err"
          : saving
            ? "border-accent/50 bg-accent/15 text-accent"
            : "border-edge bg-panel text-accent hover:bg-panel/80"
      }`}
    >
      {saving ? <Loader2 size={18} className="animate-spin" /> : listening ? <MicOff size={18} /> : <Mic size={18} />}
    </button>
  );
}
