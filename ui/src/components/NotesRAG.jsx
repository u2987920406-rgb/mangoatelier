import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Plus, Trash2, Search, Send, Tag } from "lucide-react";

function relativeDate(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  return `il y a ${d} j`;
}

export default function NotesRAG({ onBack }) {
  const [notes, setNotes] = useState([]);
  const [search, setSearch] = useState("");
  const [content, setContent] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState(null);
  const [loadingAsk, setLoadingAsk] = useState(false);
  const [loadingAdd, setLoadingAdd] = useState(false);

  const fetchNotes = useCallback(async (q = "") => {
    const url = q ? `/api/notes?q=${encodeURIComponent(q)}` : "/api/notes";
    const res = await fetch(url);
    if (res.ok) setNotes(await res.json());
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  useEffect(() => {
    const id = setTimeout(() => fetchNotes(search), 250);
    return () => clearTimeout(id);
  }, [search, fetchNotes]);

  async function addNote() {
    if (!content.trim()) return;
    setLoadingAdd(true);
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, tags }),
    });
    setContent("");
    setTagsInput("");
    await fetchNotes(search);
    setLoadingAdd(false);
  }

  async function deleteNote(id) {
    await fetch(`/api/notes/${id}`, { method: "DELETE" });
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }

  async function ask() {
    if (!question.trim()) return;
    setLoadingAsk(true);
    setAnswer(null);
    const res = await fetch("/api/notes/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
    if (res.ok) {
      const data = await res.json();
      setAnswer(data.answer);
    }
    setLoadingAsk(false);
  }

  return (
    <div className="min-h-screen bg-bg text-ink p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-dim hover:text-ink transition-colors text-sm"
          >
            <ArrowLeft size={16} />
            Retour
          </button>
          <h1 className="text-xl font-semibold text-ink">Notes & RAG personnel</h1>
        </div>

        <div className="relative mb-5">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher dans les notes..."
            className="w-full bg-panel border border-edge rounded-lg pl-9 pr-4 py-2 text-sm text-ink placeholder:text-faint focus:outline-none focus:border-accent-soft"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-accent uppercase tracking-wide">Mes notes</h2>
            {notes.length === 0 && (
              <p className="text-faint text-sm">Aucune note{search ? " correspondant à la recherche" : ""}.</p>
            )}
            <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto pr-1">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="bg-panel border border-edge rounded-lg p-3 flex flex-col gap-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-ink leading-relaxed flex-1 whitespace-pre-wrap">{note.content}</p>
                    <button
                      onClick={() => deleteNote(note.id)}
                      className="text-faint hover:text-red-400 transition-colors shrink-0 mt-0.5"
                      title="Supprimer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {note.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 text-xs bg-bg border border-edge rounded px-2 py-0.5 text-accent-soft"
                      >
                        <Tag size={10} />
                        {tag}
                      </span>
                    ))}
                    <span className="text-xs text-faint ml-auto">{relativeDate(note.ts)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-5">
            <div className="bg-panel border border-edge rounded-lg p-4 flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-accent uppercase tracking-wide">Ajouter une note</h2>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Contenu de la note..."
                rows={4}
                className="w-full bg-bg border border-edge rounded-lg px-3 py-2 text-sm text-ink placeholder:text-faint focus:outline-none focus:border-accent-soft resize-none"
              />
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="Tags séparés par des virgules (ex: react, ux)"
                className="w-full bg-bg border border-edge rounded-lg px-3 py-2 text-sm text-ink placeholder:text-faint focus:outline-none focus:border-accent-soft"
              />
              <button
                onClick={addNote}
                disabled={loadingAdd || !content.trim()}
                className="flex items-center justify-center gap-2 bg-accent-soft text-bg font-semibold text-sm rounded-lg px-4 py-2 hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                <Plus size={15} />
                {loadingAdd ? "Ajout…" : "Ajouter"}
              </button>
            </div>

            <div className="bg-panel border border-edge rounded-lg p-4 flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-accent uppercase tracking-wide">Poser une question</h2>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && ask()}
                  placeholder="Que disent mes notes sur…"
                  className="flex-1 bg-bg border border-edge rounded-lg px-3 py-2 text-sm text-ink placeholder:text-faint focus:outline-none focus:border-accent-soft"
                />
                <button
                  onClick={ask}
                  disabled={loadingAsk || !question.trim()}
                  className="flex items-center gap-1 bg-accent-soft text-bg font-semibold text-sm rounded-lg px-3 py-2 hover:opacity-90 transition-opacity disabled:opacity-40 shrink-0"
                >
                  <Send size={14} />
                  {loadingAsk ? "…" : "Envoyer"}
                </button>
              </div>
              {loadingAsk && (
                <p className="text-xs text-faint animate-pulse">Analyse des notes en cours…</p>
              )}
              {answer && (
                <div className="bg-bg border border-edge rounded-lg p-3">
                  <p className="text-xs text-faint mb-1 uppercase tracking-wide">Réponse</p>
                  <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">{answer}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
