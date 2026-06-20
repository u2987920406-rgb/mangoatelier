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
import type { ReuseKind } from './kernel-reuse-metrics.js'
import { getReuseImpactCollector, type ReuseImpactSnapshot } from './kernel-reuse-metrics.js'

const IMPACT_KINDS: ReuseKind[] = ['component', 'skill', 'procedure', 'palette']

// Poids du score mesuré : le succès prime (un artefact pas cher mais qui fait
// échouer ne vaut rien), le coût ensuite, la vitesse en appoint.
const WEIGHTS = { cost: 1, success: 1.5, duration: 0.3 }

// ── Boutons de réglage exploit/explore (#127, réglés par le verdict #126) ────
// L'arbitrage exploit/explore n'est pas figé : il s'ADAPTE selon que la curation
// orientée s'est avérée efficace ou non.
//   • exploreBaseline — score d'une famille NON mesurée. Plus il est haut, plus on
//     explore l'inconnu ; plus il est bas, plus on exploite les gagnants prouvés.
//   • exploitGain     — multiplie le score mesuré. > 1 : on se fie davantage au
//     rendement mesuré (sépare plus nettement) ; < 1 : on s'en méfie (l'aplatit).
export interface TuningKnobs {
  exploreBaseline: number
  exploitGain: number
}

// Défaut : explore-penchant prudent (au-dessus d'un gagnant marginal, sous un
// gagnant net), pleine confiance au signal mesuré.
export const DEFAULT_KNOBS: TuningKnobs = { exploreBaseline: 15, exploitGain: 1 }

/** Règle les boutons selon le verdict d'efficacité #126 (pur). On ne couple PAS
 * ce module à kernel-curation-effect : le verdict entre par paramètre.
 *   • positive — l'exploitation MARCHE → on exploite plus (explore moins, gain ↑).
 *   • negative — l'exploitation se RETOURNE contre nous → on explore plus et on se
 *     méfie du rendement cumulé (gain ↓).
 *   • neutral  — pas d'effet prouvé → léger penchant exploration.
 *   • insufficient / inconnu — données insuffisantes → défaut (explore pour collecter). */
export function tuneKnobs(verdict: string): TuningKnobs {
  switch (verdict) {
    case 'positive':
      return { exploreBaseline: 8, exploitGain: 1.3 }
    case 'negative':
      return { exploreBaseline: 25, exploitGain: 0.7 }
    case 'neutral':
      return { exploreBaseline: 18, exploitGain: 1 }
    default:
      return DEFAULT_KNOBS
  }
}

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
 * en tête, EXPLORE (non mesuré) au milieu, DEPRIORITIZE (rendement −) en queue.
 * `knobs` règle l'arbitrage exploit/explore (réglé par le verdict #126). */
export function rankFamiliesByYield(
  snapshot: ReuseImpactSnapshot,
  knobs: TuningKnobs = DEFAULT_KNOBS,
): RankedFamily[] {
  const byKind = snapshot.byKind ?? []
  const families: RankedFamily[] = byKind.map((f) => {
    const cost = f.delta.costSavingPct
    const succ = f.delta.successRatePts
    const dur = f.delta.durationSavingPct
    const measured = cost !== null || succ !== null
    let score: number
    let reason: CurationReason
    if (!measured) {
      score = knobs.exploreBaseline
      reason = 'explore'
    } else {
      const raw = WEIGHTS.cost * (cost ?? 0) + WEIGHTS.success * (succ ?? 0) + WEIGHTS.duration * (dur ?? 0)
      score = knobs.exploitGain * raw // exploitGain > 0 ne change pas le signe → exploit/dud préservés
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
  knobs: TuningKnobs
}

/** Priorité de curation courante, lue sur le collecteur d'impact #124 (live).
 * `knobs` règle l'arbitrage exploit/explore — l'orchestration auto-réglée (lecture
 * du verdict #126 → tuneKnobs) vit dans kernel-curation-effect pour éviter un
 * cycle d'import. Sans knobs : comportement par défaut (#125). */
export function getCurationPriority(knobs: TuningKnobs = DEFAULT_KNOBS): CurationPriority {
  const ranked = rankFamiliesByYield(getReuseImpactCollector().snapshot(), knobs)
  return { ranked, directive: curationDirective(ranked), knobs }
}
