import fs from 'node:fs'
import path from 'node:path'
import type { Express, Request, Response } from 'express'

const WORKSPACE_DIR = path.join(process.cwd(), '..', 'workspace')
const AXIOMS_FILE = path.join(WORKSPACE_DIR, '.axioms.md')

type Maturite = 'golden' | 'prouvé' | 'candidat' | 'inconnu'
type Recommandation = 'pruning candidat' | 'garder' | 'promouvoir golden'

interface AxiomEntry {
  id: string
  cat: string
  maturite: Maturite
  recurrence: number
  score: number
  recommandation: Recommandation
  extrait: string
}

function parseMaturite(header: string): Maturite {
  if (/golden/i.test(header)) return 'golden'
  if (/prouvé|prouve/i.test(header)) return 'prouvé'
  if (/candidat/i.test(header)) return 'candidat'
  return 'inconnu'
}

function parseRecurrence(header: string): number {
  const m = /récurrence\s*[:\s]*×(\d+)/i.exec(header) ?? /×(\d+)/i.exec(header)
  return m ? parseInt(m[1], 10) : 1
}

function computeScore(recurrence: number, maturite: Maturite): number {
  const matScore = maturite === 'golden' ? 5 : maturite === 'prouvé' ? 2 : 0
  return recurrence * 2 + matScore
}

function computeRecommandation(score: number): Recommandation {
  if (score < 2) return 'pruning candidat'
  if (score < 5) return 'garder'
  return 'promouvoir golden'
}

function parseAxioms(raw: string): AxiomEntry[] {
  // Split on each AXIOME-XXX header line
  const chunks = raw.split(/(?=^AXIOME-)/m).filter((c) => c.trim())
  const entries: AxiomEntry[] = []

  for (const chunk of chunks) {
    const lines = chunk.split(/\r?\n/)
    const header = lines[0].trim()
    if (!/^AXIOME-/i.test(header)) continue

    // ID: AXIOME-BUILD-02
    const idMatch = /^(AXIOME-[A-Z0-9]+-\d+)/i.exec(header)
    const id = idMatch ? idMatch[1].toUpperCase() : header.slice(0, 30)

    // Category: second segment e.g. AXIOME-BUILD-02 → BUILD
    const catMatch = /^AXIOME-([A-Z0-9]+)-/i.exec(id)
    const cat = catMatch ? catMatch[1].toUpperCase() : '?'

    const maturite = parseMaturite(header)
    const recurrence = parseRecurrence(header)
    const score = computeScore(recurrence, maturite)
    const recommandation = computeRecommandation(score)

    // Premier contenu non-vide après le header comme extrait
    const extrait = lines.slice(1).find((l) => l.trim())?.trim() ?? ''

    entries.push({ id, cat, maturite, recurrence, score, recommandation, extrait })
  }

  return entries
}

export function registerAutoAblationRoutes(app: Express): void {
  // GET /api/ablation/report — analyse le registre d'axiomes
  app.get('/api/ablation/report', (_req: Request, res: Response) => {
    let raw = ''
    try {
      raw = fs.readFileSync(AXIOMS_FILE, 'utf8')
    } catch {
      res.json({ total: 0, axioms: [] })
      return
    }

    const axioms = parseAxioms(raw)
    res.json({ total: axioms.length, axioms })
  })

  // POST /api/ablation/promote/:id — passe la maturité en "prouvé"
  app.post('/api/ablation/promote/:id', (req: Request, res: Response) => {
    const { id } = req.params as { id: string }

    let raw: string
    try {
      raw = fs.readFileSync(AXIOMS_FILE, 'utf8')
    } catch {
      res.status(404).json({ ok: false, error: 'Fichier .axioms.md introuvable' })
      return
    }

    // Trouve la ligne header de cet axiome et remplace la maturité
    // Ex : "AXIOME-BUILD-02 (maturité: candidat · …)" → "maturité: prouvé"
    const idEscaped = id.replace(/[-]/g, '\\-')
    const re = new RegExp(`(${idEscaped}[^\\n]*maturité\\s*:\\s*)(?:candidat|golden|prouvé|inconnu)`, 'i')

    if (!re.test(raw)) {
      // Essai sans accent
      const re2 = new RegExp(`(${idEscaped}[^\\n]*maturite\\s*:\\s*)(?:candidat|golden|prouvé|inconnu)`, 'i')
      if (!re2.test(raw)) {
        res.status(404).json({ ok: false, error: `Axiome ${id} non trouvé ou maturité absente` })
        return
      }
      const updated = raw.replace(re2, '$1prouvé')
      fs.writeFileSync(AXIOMS_FILE, updated, 'utf8')
      res.json({ ok: true })
      return
    }

    const updated = raw.replace(re, '$1prouvé')
    fs.writeFileSync(AXIOMS_FILE, updated, 'utf8')
    res.json({ ok: true })
  })
}
