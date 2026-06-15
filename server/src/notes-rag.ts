import { Express } from "express";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { askLLM, resolveProvider } from "./llm-engine.js";

const DATA_DIR = path.join(process.cwd(), "..", "server", "data");
const NOTES_FILE = path.join(DATA_DIR, "notes.jsonl");

interface Note {
  id: string;
  ts: string;
  content: string;
  tags: string[];
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadNotes(): Note[] {
  ensureDataDir();
  if (!fs.existsSync(NOTES_FILE)) return [];
  const lines = fs.readFileSync(NOTES_FILE, "utf-8").split("\n").filter(Boolean);
  return lines.map((l) => JSON.parse(l) as Note);
}

function saveNotes(notes: Note[]) {
  ensureDataDir();
  fs.writeFileSync(NOTES_FILE, notes.map((n) => JSON.stringify(n)).join("\n") + (notes.length ? "\n" : ""), "utf-8");
}

function matchNote(note: Note, q: string): boolean {
  const lower = q.toLowerCase();
  return (
    note.content.toLowerCase().includes(lower) ||
    note.tags.some((t) => t.toLowerCase().includes(lower))
  );
}

function topByKeyword(notes: Note[], question: string, limit = 5): Note[] {
  const words = question.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  const scored = notes.map((n) => {
    const text = (n.content + " " + n.tags.join(" ")).toLowerCase();
    const score = words.reduce((acc, w) => acc + (text.includes(w) ? 1 : 0), 0);
    return { note: n, score };
  });
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.note);
}

export function registerNotesRAGRoutes(app: Express): void {
  app.post("/api/notes", (req, res) => {
    const { content, tags } = req.body as { content?: string; tags?: string[] };
    if (!content?.trim()) {
      res.status(400).json({ error: "content required" });
      return;
    }
    const notes = loadNotes();
    const note: Note = {
      id: randomUUID(),
      ts: new Date().toISOString(),
      content: content.trim(),
      tags: Array.isArray(tags) ? tags.map((t) => t.trim()).filter(Boolean) : [],
    };
    notes.push(note);
    saveNotes(notes);
    res.json(note);
  });

  app.get("/api/notes", (req, res) => {
    const q = (req.query.q as string | undefined)?.trim();
    let notes = loadNotes();
    if (q) notes = notes.filter((n) => matchNote(n, q));
    res.json(notes.slice().reverse());
  });

  app.delete("/api/notes/:id", (req, res) => {
    const { id } = req.params;
    const notes = loadNotes();
    const idx = notes.findIndex((n) => n.id === id);
    if (idx === -1) {
      res.status(404).json({ error: "not found" });
      return;
    }
    notes.splice(idx, 1);
    saveNotes(notes);
    res.json({ ok: true });
  });

  app.post("/api/notes/ask", async (req, res) => {
    const { question } = req.body as { question?: string };
    if (!question?.trim()) {
      res.status(400).json({ error: "question required" });
      return;
    }
    const notes = loadNotes();
    const relevant = topByKeyword(notes, question);
    const provider = resolveProvider(process.env.RAG_PROVIDER, "claude");

    try {
      if (relevant.length === 0) {
        const answer = await askLLM(
          "",
          `Tu es un assistant personnel. L'utilisateur n'a pas encore de notes enregistrées (ou aucune note ne correspond à sa question).\n\nQuestion : ${question}\n\nRéponds brièvement en le précisant.`,
          { provider, maxTokens: 1024 }
        );
        res.json({ answer, sources: [] });
        return;
      }

      const context = relevant
        .map((n, i) => `[Note ${i + 1} — ${n.ts.slice(0, 10)}${n.tags.length ? ` | tags: ${n.tags.join(", ")}` : ""}]\n${n.content}`)
        .join("\n\n");

      const answer = await askLLM(
        "",
        `Tu es un assistant personnel qui répond en te basant sur les notes de l'utilisateur.\n\nNotes pertinentes :\n${context}\n\nQuestion : ${question}\n\nRéponds de façon concise et précise en t'appuyant sur les notes ci-dessus.`,
        { provider, maxTokens: 1024 }
      );
      res.json({ answer, sources: relevant.map((n) => n.id) });
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error });
    }
  });
}
