// MangoOS Kernel — Priorité de curation nocturne pondérée par le rendement (#125).
//
// #124 mesure, PAR FAMILLE d'artefact (composants/skills/procédures/palettes), ce
// que la réutilisation fait gagner (économie de coût, points de succès). #125
// ferme la boucle de l'auto-amélioration : la boucle nocturne #58 récolte déjà des
// artefacts réutilisables (l'agent SAVE ses composants dans .components/, etc., et
// les palettes sont auto-capturées) — mais à l'aveugle. Ici on ORIENTE cette
// récolte vers les familles dont le rendement mesuré est le plus fort : on
// enrichit en priorité la bibliothèque qui paie le plus.
//
// Politique (bandit honnête) :
//   • EXPLOIT  — famille au rendement mesuré POSITIF → on en récolte plus.
//   • EXPLORE  — famille encore peu/pas mesurée → on l'essaie (on ne peut pas
//                savoir si elle paie sans données : on en produit pour mesurer).
//   • DEPRIORITIZE — famille au rendement mesuré NÉGATIF → on n'y pousse pas.
//
// Pur et déterministe (le tri ne dépend que du snapshot d'impact). Aucune I/O.
import type { Express, Request, Response } from 'express'
import type { ReuseKind } from './kernel-reuse-metrics.js'
import { getReuseImpactCollector, type ReuseImpactSnapshot } from './kernel-reuse-metrics.js'

const IMPACT_KINDS: ReuseKind[] = ['component', 'skill', 'procedure', 'palette']

// Poids : le succès prime (un artefact pas cher mais qui fait échouer ne vaut
// rien), le coût ensuite, la vitesse en appoint.
const WEIGHTS = { cost: 1, success: 1.5, duration: 0.3 }
// Score neutre d'une famille non mesurée : la place AU-DESSUS d'un gagnant
// marginal (on préfère explorer l'inconnu qu'exploiter un gain faible) mais sous
// un gagnant net.
const EXPLORE_BASELINE = 15

export type CurationReason = 'exploit' | 'explore' | 'deprioritize'

export interface RankedFamily {
  kind: ReuseKind
  score: number
  measured: boolean
  costSavingPct: number | null
  successRatePts: number | null
  reason: CurationReason
}

/** Classe les familles par rendement décroissant (pur). EXPLOIT (rendement +)
 * en tête, EXPLORE (non mesuré) au milieu, DEPRIORITIZE (rendement −) en queue. */
export function rankFamiliesByYield(snapshot: ReuseImpactSnapshot): RankedFamily[] {
  const byKind = snapshot.byKind ?? []
  const families: RankedFamily[] = byKind.map((f) => {
    const cost = f.delta.costSavingPct
    const succ = f.delta.successRatePts
    const dur = f.delta.durationSavingPct
    const measured = cost !== null || succ !== null
    let score: number
    let reason: CurationReason
    if (!measured) {
      score = EXPLORE_BASELINE
      reason = 'explore'
    } else {
      score = WEIGHTS.cost * (cost ?? 0) + WEIGHTS.success * (succ ?? 0) + WEIGHTS.duration * (dur ?? 0)
      reason = score >= 0 ? 'exploit' : 'deprioritize'
    }
    return { kind: f.kind, score, measured, costSavingPct: cost, successRatePts: succ, reason }
  })
  // Tri par score desc, départage stable par l'ordre canonique des familles.
  const order = (k: ReuseKind): number => IMPACT_KINDS.indexOf(k)
  return families.sort((a, b) => b.score - a.score || order(a.kind) - order(b.kind))
}

const LABEL: Record<ReuseKind, string> = {
  component: 'composants',
  skill: 'skills',
  procedure: 'procédures',
  palette: 'palettes',
}

// Comment récolter concrètement chaque famille (l'agent sait déjà SAUVEGARDER :
// ces consignes ne font qu'orienter l'effort, pas réinventer le mécanisme).
const HARVEST: Record<ReuseKind, string> = {
  component:
    'extrais au moins un composant réutilisable propre dans workspace/.components/ (API de props claire, aucune donnée métier en dur)',
  skill: 'consigne un skill réutilisable (savoir-faire how-to) dans workspace/.skills/',
  procedure: 'capture une procédure réutilisable (démarche étape par étape) dans workspace/.procedures/',
  palette: 'soigne une palette cohérente et distinctive (elle est automatiquement mémorisée pour réemploi)',
}

function yieldLabel(f: RankedFamily): string {
  if (!f.measured || f.costSavingPct === null) return 'encore peu mesuré — à explorer'
  const cost =
    f.costSavingPct >= 0 ? `économie de coût ${f.costSavingPct}%` : `surcoût ${Math.abs(f.costSavingPct)}%`
  const succ = f.successRatePts !== null ? `, ${f.successRatePts >= 0 ? '+' : ''}${f.successRatePts} pts de succès` : ''
  return `rendement mesuré : ${cost}${succ}`
}

/** Fragment de prompt pour la génération nocturne : oriente la récolte d'artefacts
 * vers les familles prioritaires. "" si aucune famille à pousser (toutes au
 * rendement négatif, ou aucune donnée). On ne pousse JAMAIS vers une famille de
 * rendement prouvé négatif. */
export function curationDirective(ranked: RankedFamily[], opts: { top?: number } = {}): string {
  const top = ranked.filter((f) => f.reason !== 'deprioritize').slice(0, opts.top ?? 2)
  if (top.length === 0) return ''
  const lines = top.map((f, i) => `${i + 1}. ${LABEL[f.kind]} (${yieldLabel(f)}) → ${HARVEST[f.kind]}`)
  return (
    `\n\nCuration nocturne — priorité de récolte d'artefacts (pondérée par le rendement mesuré de la mémoire). ` +
    `En construisant cette app, privilégie la production d'artefacts RÉUTILISABLES des familles ci-dessous, dans cet ordre :\n` +
    lines.join('\n') +
    `\nNe force rien d'artificiel : ne récolte un artefact que s'il est réellement réutilisable et propre.`
  )
}

export interface CurationPriority {
  ranked: RankedFamily[]
  directive: string
}

/** Priorité de curation courante, lue sur le collecteur d'impact #124 (live). */
export function getCurationPriority(): CurationPriority {
  const ranked = rankFamiliesByYield(getReuseImpactCollector().snapshot())
  return { ranked, directive: curationDirective(ranked) }
}

export function registerCurationRoutes(app: Express): void {
  app.get('/api/curation/priority', (_req: Request, res: Response) => {
    res.json(getCurationPriority())
  })
}
