// MangoOS — Mesure de la RÉUTILISATION EFFECTIVE des artefacts (#121).
//
// #118→#120 réinjectent les artefacts pertinents (palettes, composants, skills…)
// avant un build. Mais l'agent les utilise-t-il VRAIMENT ? Ce module ferme la
// boucle de preuve. Signal concret et objectif : l'agent LIT le fichier d'un
// artefact de bibliothèque (`.components/`, `.skills/`, `.procedures/`) pendant un
// tour → c'est une réutilisation effective (les règles disent « READ its code and
// adapt it »). On agrège : taux de tours avec réutilisation + artefacts les plus
// réutilisés. Live sur le Bus, en mémoire, déterministe.
import type { Express, Request, Response } from 'express'
import { getBus, type KernelBus } from './kernel-bus.js'
import { CHAT_TURN_EVENT } from './kernel-chat-bridge.js'

/** Événement Bus émis quand un tour a réutilisé ≥ 1 artefact de bibliothèque. */
export const REUSE_EVENT = 'artifact.reuse'

export type ReuseKind = 'component' | 'skill' | 'procedure'
export interface ReuseHit {
  kind: ReuseKind
  name: string
}

const PATTERNS: Array<{ kind: ReuseKind; re: RegExp }> = [
  { kind: 'component', re: /[\\/]\.components[\\/]([^\\/]+)/ },
  { kind: 'skill', re: /[\\/]\.skills[\\/]([^\\/]+)/ },
  { kind: 'procedure', re: /[\\/]\.procedures[\\/]([^\\/]+)/ },
]

/** Détecte les artefacts réutilisés à partir des CHEMINS lus par l'agent ce tour.
 * Pur. Déduplique (lire deux fois le même artefact = une réutilisation). */
export function detectArtifactReads(readPaths: string[]): ReuseHit[] {
  const seen = new Set<string>()
  const hits: ReuseHit[] = []
  for (const p of readPaths) {
    for (const { kind, re } of PATTERNS) {
      const m = re.exec(p)
      if (m) {
        const key = `${kind}:${m[1]}`
        if (!seen.has(key)) {
          seen.add(key)
          hits.push({ kind, name: m[1] })
        }
        break
      }
    }
  }
  return hits
}

export interface ReuseSnapshot {
  totalTurns: number
  reuseTurns: number
  reuseRatePct: number
  totalReuses: number
  byKind: Record<string, number>
  topReused: Array<{ key: string; count: number }>
}

export class ReuseCollector {
  private totalTurns = 0
  private reuseTurns = 0
  private totalReuses = 0
  private byKind = new Map<string, number>()
  private byName = new Map<string, number>()

  /** Un tour de chat a eu lieu (dénominateur du taux). */
  recordTurn(): void {
    this.totalTurns++
  }

  /** Les artefacts réutilisés pendant un tour (numérateur + détail). */
  recordReuse(hits: ReuseHit[]): void {
    if (!hits || hits.length === 0) return
    this.reuseTurns++
    for (const h of hits) {
      this.totalReuses++
      this.byKind.set(h.kind, (this.byKind.get(h.kind) ?? 0) + 1)
      const key = `${h.kind}:${h.name}`
      this.byName.set(key, (this.byName.get(key) ?? 0) + 1)
    }
  }

  snapshot(): ReuseSnapshot {
    const top = [...this.byName.entries()]
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
    return {
      totalTurns: this.totalTurns,
      reuseTurns: this.reuseTurns,
      reuseRatePct: this.totalTurns ? Math.round((this.reuseTurns / this.totalTurns) * 100) : 0,
      totalReuses: this.totalReuses,
      byKind: Object.fromEntries(this.byKind),
      topReused: top,
    }
  }

  reset(): void {
    this.totalTurns = 0
    this.reuseTurns = 0
    this.totalReuses = 0
    this.byKind.clear()
    this.byName.clear()
  }
}

// ── Singleton + branchement Bus ──────────────────────────────────────────────
let collector: ReuseCollector | null = null
let unsubs: Array<() => void> = []

export function getReuseCollector(): ReuseCollector {
  if (!collector) collector = new ReuseCollector()
  return collector
}

/** Abonne le collecteur : compte les tours (chat.turn) et les réutilisations
 * (artifact.reuse). Le taux = reuseTurns / totalTurns. Idempotent. */
export function installReuseCollector(bus: KernelBus = getBus()): void {
  if (unsubs.length > 0) return
  const c = getReuseCollector()
  unsubs.push(bus.subscribe(CHAT_TURN_EVENT, 'reuse-collector', () => c.recordTurn()))
  unsubs.push(
    bus.subscribe(REUSE_EVENT, 'reuse-collector', (env) => {
      const hits = (env.payload as { hits?: ReuseHit[] })?.hits
      if (Array.isArray(hits)) c.recordReuse(hits)
    }),
  )
}

export function uninstallReuseCollector(): void {
  for (const u of unsubs) u()
  unsubs = []
}

/** Publie une réutilisation détectée sur le Bus (rien si aucun hit). */
export function publishReuse(project: string, hits: ReuseHit[], bus: KernelBus = getBus()): void {
  if (!hits || hits.length === 0) return
  try {
    void bus.publish({ type: REUSE_EVENT, sender: project, kind: 'progress', payload: { project, hits } })
  } catch {
    /* la mesure ne casse jamais un tour */
  }
}

export function registerReuseRoutes(app: Express): void {
  app.get('/api/reuse', (_req: Request, res: Response) => {
    res.json(getReuseCollector().snapshot())
  })
}
