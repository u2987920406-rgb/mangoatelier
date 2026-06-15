import https from 'https'
import type { Express, Request, Response } from 'express'

interface VeilleItem { title: string; link: string; date: string; source: string }

// Cache mémoire 30min
let cache: { items: VeilleItem[]; fetchedAt: number } | null = null
const CACHE_TTL = 30 * 60 * 1000

// Fetch une URL avec https natif, retourne le body string
function fetchUrl(url: string): Promise<string> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve('')
    }, 5000)

    const req = https.get(url, (res) => {
      let body = ''
      res.on('data', (chunk: Buffer) => { body += chunk.toString() })
      res.on('end', () => {
        clearTimeout(timeout)
        resolve(body)
      })
      res.on('error', () => {
        clearTimeout(timeout)
        resolve('')
      })
    })

    req.on('error', () => {
      clearTimeout(timeout)
      resolve('')
    })

    req.on('timeout', () => {
      clearTimeout(timeout)
      req.destroy()
      resolve('')
    })
  })
}

// Parse XML RSS brut avec regex : extrait <item>...</item> puis title, link, pubDate
function parseRss(xml: string, sourceName: string): VeilleItem[] {
  if (!xml) return []

  const itemRegex = /<item[\s>]([\s\S]*?)<\/item>/gi
  const titleRegex = /<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i
  const linkRegex = /<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i
  const pubDateRegex = /<pubDate>([\s\S]*?)<\/pubDate>/i

  const items: VeilleItem[] = []
  let match: RegExpExecArray | null

  while ((match = itemRegex.exec(xml)) !== null && items.length < 5) {
    const block = match[1]

    const titleMatch = titleRegex.exec(block)
    const linkMatch = linkRegex.exec(block)
    const pubDateMatch = pubDateRegex.exec(block)

    const title = titleMatch ? titleMatch[1].trim() : ''
    const link = linkMatch ? linkMatch[1].trim() : ''
    const rawDate = pubDateMatch ? pubDateMatch[1].trim() : ''

    let date: string
    try {
      const parsed = new Date(rawDate)
      date = isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString()
    } catch {
      date = new Date().toISOString()
    }

    if (title && link) {
      items.push({ title, link, date, source: sourceName })
    }
  }

  return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

// Sources (si une source échoue → items vides pour cette source, pas d'erreur globale)
const SOURCES = [
  { url: 'https://huggingface.co/blog/feed.xml', name: 'HuggingFace' },
  { url: 'https://www.anthropic.com/rss.xml', name: 'Anthropic' },
]

export async function fetchVeilleItems(): Promise<VeilleItem[]> {
  const results = await Promise.all(
    SOURCES.map(async (source) => {
      try {
        const xml = await fetchUrl(source.url)
        return parseRss(xml, source.name)
      } catch {
        return []
      }
    })
  )

  const all = results.flat()
  return all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export function registerVeilleRoutes(app: Express): void {
  // GET /api/veille → { items: VeilleItem[], lastFetched: string, fromCache: boolean }
  app.get('/api/veille', async (req: Request, res: Response) => {
    const now = Date.now()
    if (cache && now - cache.fetchedAt < CACHE_TTL) {
      return res.json({
        items: cache.items,
        lastFetched: new Date(cache.fetchedAt).toISOString(),
        fromCache: true,
      })
    }

    const items = await fetchVeilleItems()
    cache = { items, fetchedAt: now }
    return res.json({
      items,
      lastFetched: new Date(now).toISOString(),
      fromCache: false,
    })
  })

  // GET /api/veille/refresh → force refresh, même réponse
  app.get('/api/veille/refresh', async (req: Request, res: Response) => {
    const now = Date.now()
    const items = await fetchVeilleItems()
    cache = { items, fetchedAt: now }
    return res.json({
      items,
      lastFetched: new Date(now).toISOString(),
      fromCache: false,
    })
  })
}
