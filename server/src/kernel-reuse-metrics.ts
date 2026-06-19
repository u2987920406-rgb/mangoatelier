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
import { listArtifacts } from './kernel-artifacts.js'
import { getBlackboard, type Blackboard } from './kernel-blackboard.js'

/** Événement Bus émis quand un tour a réutilisé ≥ 1 artefact de bibliothèque. */
export const REUSE_EVENT = 'artifact.reuse'

export type ReuseKind = 'component' | 'skill' | 'procedure' | 'palette'
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

// ── Réutilisation de PALETTE (signal par recouvrement de couleurs) ───────────
//
// Une palette n'est pas un FICHIER que l'agent lit : elle est réinjectée dans le
// prompt (#118). Son signal de réutilisation est donc différent — c'est le
// RECOUVREMENT de couleurs réelles entre la palette PRODUITE par le build
// (design.produced) et une palette déjà en mémoire d'un AUTRE projet. Si une part
// suffisante des couleurs produites existe littéralement dans une palette gardée,
// l'agent a réutilisé cet univers visuel plutôt que d'en réinventer un. Honnête
// (couleur portée à l'identique, pas une simple ressemblance d'histogramme) et
// déterministe. On ignore les neutres purs (#000/#fff) : partager seulement du
// noir/blanc n'est pas « réutiliser une palette ».
const NEUTRAL = new Set(['#000000', '#ffffff'])

/** Canonise un hex en #rrggbb minuscule (3 → 6 chiffres). null si invalide. */
function canonHex(c: string): string | null {
  const h = c.trim().toLowerCase().replace(/^#/, '')
  if (/^[0-9a-f]{3}$/.test(h)) return '#' + h.split('').map((x) => x + x).join('')
  if (/^[0-9a-f]{6}$/.test(h)) return '#' + h
  return null
}

/** Couleurs produites non-neutres, canonisées et dédupliquées. */
function meaningfulColors(colors: string[]): string[] {
  const out = new Set<string>()
  for (const c of colors) {
    const h = canonHex(c)
    if (h && !NEUTRAL.has(h)) out.add(h)
  }
  return [...out]
}

/** Recouvrement palette produite → palette candidate : combien de couleurs
 * produites (non-neutres) existent littéralement dans la candidate. Pur. */
export function paletteOverlap(produced: string[], candidate: string[]): { ratio: number; shared: number } {
  const prod = meaningfulColors(produced)
  if (prod.length === 0) return { ratio: 0, shared: 0 }
  const cand = new Set<string>()
  for (const c of candidate) {
    const h = canonHex(c)
    if (h) cand.add(h)
  }
  const shared = prod.filter((c) => cand.has(c)).length
  return { ratio: shared / prod.length, shared }
}

export interface PaletteCandidate {
  project: string
  colors: string[]
}

/** Détecte la réutilisation de palette parmi des candidates (pur, testable).
 * Renvoie AU PLUS un hit (la palette la mieux recouverte) : un build produit une
 * palette, il en réutilise au plus une → comptage propre. */
export function detectPaletteReuseAmong(
  producedColors: string[],
  candidates: PaletteCandidate[],
  opts: { threshold?: number; minShared?: number } = {},
): ReuseHit[] {
  const threshold = opts.threshold ?? 0.5
  const minShared = opts.minShared ?? 2
  let best: { project: string; ratio: number } | null = null
  for (const cand of candidates) {
    const { ratio, shared } = paletteOverlap(producedColors, cand.colors)
    if (shared >= minShared && ratio >= threshold && (!best || ratio > best.ratio)) {
      best = { project: cand.project, ratio }
    }
  }
  return best ? [{ kind: 'palette', name: best.project }] : []
}

/** Réutilisation de palette pour le tour courant : compare les couleurs produites
 * aux palettes du Blackboard d'AUTRES projets. "" / [] si rien de probant. */
export function detectPaletteReuse(
  producedColors: string[],
  opts: { exclude?: string; threshold?: number; minShared?: number; bb?: Blackboard } = {},
): ReuseHit[] {
  if (!producedColors || producedColors.length === 0) return []
  const bb = opts.bb ?? getBlackboard()
  const candidates = listArtifacts(bb)
    .filter((h) => h.artifact.project !== opts.exclude)
    .map((h) => ({ project: h.artifact.project, colors: h.artifact.colors }))
  return detectPaletteReuseAmong(producedColors, candidates, opts)
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
