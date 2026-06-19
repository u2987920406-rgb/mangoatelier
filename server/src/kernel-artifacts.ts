// MangoOS Kernel — Artefacts réels dans le Blackboard (cf. fondation.md).
//
// Le Blackboard #115 est persistant (node:sqlite) mais tournait à vide. Ici on y
// branche les PREMIERS vrais artefacts : les événements design qui coulent déjà
// sur le Bus (#113). Un observateur écoute `design.reference` (palette Sharingan
// cible) et `design.produced` (palette du rendu) et les DÉPOSE dans le Blackboard
// — durable, et surtout CROSS-PROJET : une palette capturée sur un projet devient
// réutilisable et retrouvable depuis n'importe quel autre.
//
// Le « vec » s'exerce enfin sur des vraies données : chaque artefact porte un
// EMBEDDING de palette DÉTERMINISTE (histogramme RGB 3×3×3 = 27 dims, normalisé,
// invariant à l'ordre des couleurs). La recherche du Blackboard (cosinus) trouve
// alors « les designs aux couleurs proches » — sans Ollama, sans réseau, pur.
import type { Express, Request, Response } from 'express'
import { getBus, type KernelBus, type MangoEnvelope } from './kernel-bus.js'
import { getBlackboard, type Blackboard, type BlackboardRef } from './kernel-blackboard.js'

/** Scope unique du store d'artefacts design (cross-projet). */
export const ARTIFACT_SCOPE = 'artifact:design'

export interface DesignArtifact {
  type: 'design.reference' | 'design.produced'
  project: string
  colors: string[]
  source?: string
  at: number
}

// ── Embedding de palette : histogramme RGB 3×3×3 (déterministe, pur) ─────────
function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const h = hex.trim().replace(/^#/, '')
  if (/^[0-9a-fA-F]{3}$/.test(h)) {
    return { r: parseInt(h[0] + h[0], 16), g: parseInt(h[1] + h[1], 16), b: parseInt(h[2] + h[2], 16) }
  }
  if (/^[0-9a-fA-F]{6}$/.test(h)) {
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) }
  }
  return null
}

/** Histogramme RGB 27 bins normalisé. Vide si aucune couleur valide. Invariant à
 * l'ordre → deux palettes de mêmes couleurs ont le même vecteur. */
export function paletteEmbedding(colors: string[]): number[] {
  const hist = new Array(27).fill(0)
  let n = 0
  for (const c of colors) {
    const rgb = parseHex(c)
    if (!rgb) continue
    const rb = Math.min(2, Math.floor(rgb.r / 86))
    const gb = Math.min(2, Math.floor(rgb.g / 86))
    const bb = Math.min(2, Math.floor(rgb.b / 86))
    hist[rb * 9 + gb * 3 + bb] += 1
    n++
  }
  if (n === 0) return []
  return hist.map((v) => v / n)
}

/** Hash stable d'une liste de couleurs (dédup : même palette → même clé). */
export function paletteHash(colors: string[]): string {
  const norm = colors.map((c) => c.trim().toLowerCase()).sort().join(',')
  let h = 5381
  for (let i = 0; i < norm.length; i++) h = (((h << 5) + h) ^ norm.charCodeAt(i)) >>> 0
  return h.toString(36)
}

// ── Extraction des couleurs depuis un payload design ─────────────────────────
function colorsFrom(payload: unknown): string[] {
  if (!payload || typeof payload !== 'object') return []
  const p = payload as Record<string, unknown>
  const pal = Array.isArray(p.palette) ? (p.palette as unknown[]) : []
  const used = Array.isArray(p.usedColors) ? (p.usedColors as unknown[]) : []
  const src = pal.length > 0 ? pal : used // la palette déclarée prime sur les couleurs employées
  return src.filter((c): c is string => typeof c === 'string')
}

function projectFrom(env: MangoEnvelope): string {
  const p = env.payload as Record<string, unknown> | undefined
  return (p && typeof p.project === 'string' && p.project) || env.sender || 'unknown'
}

/** Dépose un artefact design dans le Blackboard. Renvoie sa ref (ou null si pas
 * de couleur exploitable — on ne stocke pas un artefact vide). */
export function recordDesignArtifact(
  env: MangoEnvelope,
  bb: Blackboard = getBlackboard(),
  now: () => number = () => Date.now(),
): BlackboardRef | null {
  const colors = colorsFrom(env.payload)
  if (colors.length === 0) return null
  const type = env.type === 'design.produced' ? 'design.produced' : 'design.reference'
  const project = projectFrom(env)
  const source = (env.payload as Record<string, unknown>)?.source
  const artifact: DesignArtifact = {
    type,
    project,
    colors,
    source: typeof source === 'string' ? source : undefined,
    at: now(),
  }
  // Clé : type + projet + hash de palette → dédup (re-capturer la même palette
  // sur le même projet n'empile pas de doublons).
  const key = `${type}:${project}:${paletteHash(colors)}`
  return bb.put(ARTIFACT_SCOPE, key, artifact, paletteEmbedding(colors))
}

// ── Observateur : design.* du Bus → Blackboard ───────────────────────────────
let unsubs: Array<() => void> = []

/** Branche l'observateur : chaque design.reference/produced est persisté dans le
 * Blackboard. Idempotent. Fire-and-forget (une erreur de dépôt ne casse rien).
 * `bb` non fourni → résolu via getBlackboard() À CHAQUE événement (le boot bascule
 * sur le store SQLite de façon ASYNC après l'install ; on doit voir le store courant). */
export function installArtifactStore(bus: KernelBus = getBus(), bb?: Blackboard): void {
  if (unsubs.length > 0) return
  for (const type of ['design.reference', 'design.produced'] as const) {
    unsubs.push(
      bus.subscribe(type, 'artifact-store', (env) => {
        try {
          recordDesignArtifact(env, bb ?? getBlackboard())
        } catch {
          /* le dépôt d'artefact ne doit jamais casser le flux */
        }
      }),
    )
  }
}

export function uninstallArtifactStore(): void {
  for (const u of unsubs) u()
  unsubs = []
}

// ── Lecture / recherche ──────────────────────────────────────────────────────
export interface ArtifactHit {
  key: string
  artifact: DesignArtifact
  score?: number
}

/** Tous les artefacts design persistés (cross-projet), plus récents en tête. */
export function listArtifacts(bb: Blackboard = getBlackboard()): ArtifactHit[] {
  return bb
    .keys(ARTIFACT_SCOPE)
    .map((key) => ({ key, artifact: bb.get<DesignArtifact>(ARTIFACT_SCOPE, key)! }))
    .filter((h) => h.artifact)
    .sort((a, b) => (b.artifact.at ?? 0) - (a.artifact.at ?? 0))
}

/** Les k artefacts dont la palette est la plus proche (cosinus) de `colors`. */
export function searchArtifacts(colors: string[], k = 5, bb: Blackboard = getBlackboard()): ArtifactHit[] {
  const emb = paletteEmbedding(colors)
  if (emb.length === 0) return []
  return bb
    .search(ARTIFACT_SCOPE, emb, k)
    .map((hit) => ({ key: hit.key, artifact: hit.value as DesignArtifact, score: hit.score }))
}

// ── Réinjection : la bibliothèque reboucle vers la génération ─────────────────
/** Bloc de system prompt rappelant à l'agent les palettes DÉJÀ créées proches de
 * la cible du projet courant → réutiliser au lieu de réinventer. "" si pas de
 * cible, ou aucune palette proche (au-dessus du seuil), ou seulement celles du
 * projet courant. Pur et synchrone (embedding = histogramme, pas d'Ollama). */
export function relevantArtifactsSection(
  currentProject: string,
  targetColors: string[],
  opts: { k?: number; threshold?: number; bb?: Blackboard } = {},
): string {
  if (targetColors.length === 0) return ''
  const k = opts.k ?? 4
  const threshold = opts.threshold ?? 0.6
  const hits = searchArtifacts(targetColors, k + 8, opts.bb)
    .filter((h) => h.artifact.project !== currentProject) // pas la cible du projet courant
    .filter((h) => (h.score ?? 0) >= threshold)
    .slice(0, k)
  if (hits.length === 0) return ''
  const lines = hits.map((h) => {
    const a = h.artifact
    const role = a.type === 'design.reference' ? 'cible' : 'rendu'
    const pct = Math.round((h.score ?? 0) * 100)
    return `- ${a.project} (${role}, ~${pct}% proche) : ${a.colors.slice(0, 8).join(' ')}`
  })
  return (
    `\n\n## Palettes réutilisables — mémoire du Blackboard\n` +
    `Tu as déjà travaillé des palettes proches de la cible de ce projet (capturées ou produites ailleurs). ` +
    `Pour la cohérence de ton univers visuel, RÉUTILISE-les de préférence plutôt que d'en réinventer une — sauf demande explicite contraire :\n` +
    lines.join('\n') +
    `\n`
  )
}

// ── Routes ───────────────────────────────────────────────────────────────────
export function registerArtifactRoutes(app: Express): void {
  app.get('/api/artifacts', (_req: Request, res: Response) => {
    res.json({ artifacts: listArtifacts() })
  })
  app.post('/api/artifacts/search', (req: Request, res: Response) => {
    const colors = Array.isArray((req.body as { colors?: unknown })?.colors)
      ? ((req.body as { colors: unknown[] }).colors.filter((c) => typeof c === 'string') as string[])
      : []
    const k = Number((req.body as { k?: unknown })?.k) || 5
    res.json({ hits: searchArtifacts(colors, k) })
  })
}
