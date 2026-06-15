import type { Express, Request, Response } from 'express'

// Keywords scoring table for model selection
const OPUS_KEYWORDS = [
  'architecture', 'système', 'migration', 'refactor',
  'auth', 'database', 'security', 'api design', 'multi-projet',
  'intégration', 'scalabilité', 'infrastructure', 'cross-cutting', 'complexe',
]

const SONNET_KEYWORDS = [
  'feature', 'composant', 'formulaire', 'page', 'hook',
  'endpoint', 'validation', 'logique', 'service',
]

const HAIKU_KEYWORDS = [
  'couleur', 'texte', 'style', 'bouton', 'icône', 'typo',
  'correction', 'faute', 'majuscule',
]

interface SuggestResult {
  model: 'haiku' | 'sonnet' | 'opus'
  score: number
  reason: string
}

// Analyse le prompt et suggère le meilleur modèle
export function suggestModel(prompt: string, currentModel?: string): SuggestResult {
  const lower = prompt.toLowerCase()
  let score = 0
  const matchedOpus: string[] = []
  const matchedSonnet: string[] = []
  const matchedHaiku: string[] = []

  for (const kw of OPUS_KEYWORDS) {
    if (lower.includes(kw)) {
      score += 3
      matchedOpus.push(kw)
    }
  }

  for (const kw of SONNET_KEYWORDS) {
    if (lower.includes(kw)) {
      score += 1
      matchedSonnet.push(kw)
    }
  }

  for (const kw of HAIKU_KEYWORDS) {
    if (lower.includes(kw)) {
      score -= 1
      matchedHaiku.push(kw)
    }
  }

  // Longueur du prompt
  const len = prompt.length
  if (len > 800) {
    score += 2
  } else if (len > 400) {
    score += 1
  } else if (len < 100) {
    score -= 1
  }

  // Si currentModel est opus, ne jamais dégrader
  if (currentModel === 'opus') {
    const reason = buildReason(matchedOpus, matchedSonnet, matchedHaiku, len, score, 'opus', true)
    return { model: 'opus', score, reason }
  }

  let model: 'haiku' | 'sonnet' | 'opus'
  if (score >= 4) {
    model = 'opus'
  } else if (score >= 1) {
    model = 'sonnet'
  } else {
    model = 'haiku'
  }

  const reason = buildReason(matchedOpus, matchedSonnet, matchedHaiku, len, score, model, false)
  return { model, score, reason }
}

function buildReason(
  opus: string[],
  sonnet: string[],
  haiku: string[],
  len: number,
  score: number,
  model: string,
  locked: boolean,
): string {
  const parts: string[] = []

  if (opus.length > 0) {
    parts.push(`${opus.length} mot(s)-clé(s) architecture détecté(s) : ${opus.slice(0, 3).join(', ')}`)
  }
  if (sonnet.length > 0) {
    parts.push(`${sonnet.length} mot(s)-clé(s) feature détecté(s) : ${sonnet.slice(0, 3).join(', ')}`)
  }
  if (haiku.length > 0) {
    parts.push(`${haiku.length} mot(s)-clé(s) UI simple détecté(s) : ${haiku.slice(0, 3).join(', ')}`)
  }

  if (len > 800) {
    parts.push('prompt long (>800 chars)')
  } else if (len > 400) {
    parts.push('prompt moyen (>400 chars)')
  } else if (len < 100) {
    parts.push('prompt court (<100 chars)')
  }

  if (locked) {
    parts.push('modèle courant opus — dégradation bloquée')
  }

  if (parts.length === 0) {
    parts.push('aucun signal fort — modèle par défaut')
  }

  return `${model} sélectionné (score ${score}) — ${parts.join(' ; ')}`
}

export function registerModelRouterRoutes(app: Express): void {
  // GET /api/suggest-model?prompt=...
  app.get('/api/suggest-model', (req: Request, res: Response) => {
    const prompt = typeof req.query.prompt === 'string' ? req.query.prompt : ''
    const currentModel = typeof req.query.currentModel === 'string' ? req.query.currentModel : undefined

    if (!prompt) {
      res.status(400).json({ error: 'Le paramètre "prompt" est requis' })
      return
    }

    const result = suggestModel(prompt, currentModel)
    res.json(result)
  })

  // POST /api/suggest-model { prompt, currentModel? }
  app.post('/api/suggest-model', (req: Request, res: Response) => {
    const body = req.body as { prompt?: unknown; currentModel?: unknown }
    const prompt = typeof body.prompt === 'string' ? body.prompt : ''
    const currentModel = typeof body.currentModel === 'string' ? body.currentModel : undefined

    if (!prompt) {
      res.status(400).json({ error: 'Le champ "prompt" est requis dans le body' })
      return
    }

    const result = suggestModel(prompt, currentModel)
    res.json(result)
  })
}
