// Tests de la preuve d'efficacité de la curation orientée (#126).
//   npx tsx src/test-kernel-curation-effect.ts
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import type { ReuseKind } from './kernel-reuse-metrics.js'
import type { RankedFamily } from './kernel-curation-priority.js'
import {
  familyYieldScore,
  buildCurationSample,
  analyzeCurationEffect,
  appendCurationSample,
  loadLedger,
  getTunedCurationPriority,
  type CurationSample,
} from './kernel-curation-effect.js'

let passed = 0
let failed = 0
function check(name: string, cond: boolean): void {
  if (cond) {
    passed++
  } else {
    failed++
    console.error(`  ❌ ${name}`)
  }
}

// Fabrique un échantillon : familles {kind, yieldScore, pushed}.
function sample(ts: string, fams: Array<[ReuseKind, number | null, boolean]>): CurationSample {
  return { ts, families: fams.map(([kind, yieldScore, pushed]) => ({ kind, yieldScore, pushed })) }
}

// ── familyYieldScore ─────────────────────────────────────────────────────────
{
  check('yieldScore mesuré = coût + 1.5·succès', familyYieldScore({ measured: true, costSavingPct: 40, successRatePts: 10 }) === 55)
  check('yieldScore non mesuré → null', familyYieldScore({ measured: false, costSavingPct: null, successRatePts: null }) === null)
  check('yieldScore mesuré avec nulls → 0', familyYieldScore({ measured: true, costSavingPct: null, successRatePts: null }) === 0)
}

// ── buildCurationSample : top-2 non-deprioritize = pushed ────────────────────
{
  const ranked: RankedFamily[] = [
    { kind: 'component', score: 110, measured: true, costSavingPct: 80, successRatePts: 20, reason: 'exploit' },
    { kind: 'palette', score: 15, measured: false, costSavingPct: null, successRatePts: null, reason: 'explore' },
    { kind: 'skill', score: 5, measured: true, costSavingPct: 5, successRatePts: 0, reason: 'exploit' },
    { kind: 'procedure', score: -40, measured: true, costSavingPct: -30, successRatePts: -10, reason: 'deprioritize' },
  ]
  const s = buildCurationSample(ranked, 'T1')
  const byKind = Object.fromEntries(s.families.map((f) => [f.kind, f]))
  check('sample : composant poussé (top-1)', byKind.component.pushed === true)
  check('sample : palette poussée (top-2)', byKind.palette.pushed === true)
  check('sample : skill non poussé (3e)', byKind.skill.pushed === false)
  check('sample : procedure jamais poussée (dud)', byKind.procedure.pushed === false)
  check('sample : yieldScore composant = 110', byKind.component.yieldScore === 110)
  check('sample : yieldScore palette null (non mesuré)', byKind.palette.yieldScore === null)
}

// ── analyzeCurationEffect : la curation orientée précède la hausse ───────────
{
  // 4 échantillons. À chaque transition, la famille POUSSÉE (component) gagne +10
  // de rendement, la NON poussée (skill) stagne (+0). Effet positif net attendu.
  const ledger: CurationSample[] = [
    sample('T1', [['component', 10, true], ['skill', 50, false]]),
    sample('T2', [['component', 20, true], ['skill', 50, false]]),
    sample('T3', [['component', 30, true], ['skill', 50, false]]),
    sample('T4', [['component', 40, true], ['skill', 50, false]]),
  ]
  const e = analyzeCurationEffect(ledger)
  check('effet : 3 transitions × 2 familles = 6 obs', e.observations === 6)
  check('effet : Δpoussées = +10', e.avgDeltaPushed === 10)
  check('effet : Δautres = 0', e.avgDeltaOther === 0)
  check('effet : lift = +10', e.lift === 10)
  check('effet : verdict positif', e.verdict === 'positive')

  // Cas inverse : la poussée précède une BAISSE → verdict négatif.
  const bad: CurationSample[] = [
    sample('T1', [['component', 40, true], ['skill', 50, false]]),
    sample('T2', [['component', 30, true], ['skill', 50, false]]),
    sample('T3', [['component', 20, true], ['skill', 50, false]]),
    sample('T4', [['component', 10, true], ['skill', 50, false]]),
  ]
  check('effet : verdict négatif si la poussée précède une baisse', analyzeCurationEffect(bad).verdict === 'negative')

  // Pas assez d'observations → insufficient (honnêteté).
  const thin: CurationSample[] = [
    sample('T1', [['component', 10, true]]),
    sample('T2', [['component', 20, true]]),
  ]
  check('effet : insufficient si trop peu de données', analyzeCurationEffect(thin).verdict === 'insufficient')

  // Familles non mesurées (yieldScore null) ne contribuent à aucun Δ.
  const withNulls: CurationSample[] = [
    sample('T1', [['palette', null, true], ['component', 10, true]]),
    sample('T2', [['palette', null, true], ['component', 20, true]]),
  ]
  const en = analyzeCurationEffect(withNulls, { minObservations: 1, minPushed: 1 })
  check('effet : null exclu du calcul (1 obs, pas 2)', en.observations === 1 && en.avgDeltaPushed === 10)

  // Ledger vide → insufficient, pas de crash.
  check('effet : ledger vide → insufficient', analyzeCurationEffect([]).verdict === 'insufficient')
}

// ── Persistance du ledger (round-trip + cap) ─────────────────────────────────
{
  const tmp = path.join(os.tmpdir(), `mangoos-ledger-${process.pid}.json`)
  try {
    fs.rmSync(tmp, { force: true })
    appendCurationSample(sample('A', [['component', 1, true]]), tmp)
    appendCurationSample(sample('B', [['component', 2, true]]), tmp)
    const loaded = loadLedger(tmp)
    check('ledger : round-trip 2 échantillons', loaded.length === 2 && loaded[1].ts === 'B')
    check('ledger : fichier absent → []', loadLedger(path.join(os.tmpdir(), 'nope-xyz.json')).length === 0)
  } finally {
    fs.rmSync(tmp, { force: true })
  }
}

// ── getTunedCurationPriority : la boucle se règle sur son verdict (#127) ─────
{
  const tmp = path.join(os.tmpdir(), `mangoos-tuned-${process.pid}.json`)
  try {
    fs.rmSync(tmp, { force: true })
    // Ledger sans transition → verdict insufficient → poids par défaut (explore 15).
    appendCurationSample(sample('T0', [['component', 10, true]]), tmp)
    const dflt = getTunedCurationPriority(tmp)
    check('tuned : verdict insufficient → knobs défaut', dflt.verdict === 'insufficient' && dflt.knobs.exploreBaseline === 15)

    // Ledger prouvant un effet positif (poussée +10, contrôle 0 sur 3 transitions).
    fs.rmSync(tmp, { force: true })
    for (let i = 0; i < 4; i++) {
      appendCurationSample(sample(`P${i}`, [['component', 10 + i * 10, true], ['skill', 50, false]]), tmp)
    }
    const tuned = getTunedCurationPriority(tmp)
    check('tuned : verdict positif détecté depuis le ledger', tuned.verdict === 'positive')
    check('tuned : poids passent en mode exploitation (explore 8)', tuned.knobs.exploreBaseline === 8 && tuned.knobs.exploitGain === 1.3)
    check('tuned : renvoie un classement + directive', Array.isArray(tuned.ranked) && typeof tuned.directive === 'string')
  } finally {
    fs.rmSync(tmp, { force: true })
  }
}

console.log(`\n[curation-effect] ${passed} ✅  ${failed ? failed + ' ❌' : '0 ❌'}  (${passed + failed} assertions)`)
if (failed > 0) process.exit(1)
