// Tests de la mesure de réutilisation effective (#121).
//   npx tsx src/test-kernel-reuse-metrics.ts
import { KernelBus } from './kernel-bus.js'
import { CHAT_TURN_EVENT } from './kernel-chat-bridge.js'
import { Blackboard } from './kernel-blackboard.js'
import { ARTIFACT_SCOPE, type DesignArtifact } from './kernel-artifacts.js'
import {
  detectArtifactReads,
  paletteOverlap,
  detectPaletteReuseAmong,
  detectPaletteReuse,
  ReuseCollector,
  getReuseCollector,
  installReuseCollector,
  uninstallReuseCollector,
  publishReuse,
  REUSE_EVENT,
} from './kernel-reuse-metrics.js'

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

// ── detectArtifactReads ──────────────────────────────────────────────────────
{
  const hits = detectArtifactReads([
    'D:/IA/workspace/.components/SearchBar/component.tsx',
    'D:\\IA\\workspace\\.skills\\paginate-table\\SKILL.md', // backslash Windows
    '/ws/.procedures/auth-flow/PROCEDURE.md',
    '/ws/proj/src/App.jsx', // hors bibliothèque → ignoré
  ])
  check('détecte composant', hits.some((h) => h.kind === 'component' && h.name === 'SearchBar'))
  check('détecte skill (backslash)', hits.some((h) => h.kind === 'skill' && h.name === 'paginate-table'))
  check('détecte procédure', hits.some((h) => h.kind === 'procedure' && h.name === 'auth-flow'))
  check('ignore les fichiers hors bibliothèque', hits.length === 3)

  // Dédup : lire deux fois le même artefact = 1.
  const dedup = detectArtifactReads([
    '/ws/.components/Modal/component.tsx',
    '/ws/.components/Modal/meta.json',
  ])
  check('dédup même artefact lu 2×', dedup.length === 1 && dedup[0].name === 'Modal')

  check('aucune lecture → []', detectArtifactReads([]).length === 0)
}

// ── Réutilisation de PALETTE (recouvrement de couleurs) ──────────────────────
{
  // paletteOverlap : couleurs produites présentes dans la candidate (non-neutres).
  const o1 = paletteOverlap(['#ff0000', '#00ff00', '#0000ff'], ['#ff0000', '#00ff00', '#123456'])
  check('overlap 2/3', o1.shared === 2 && Math.abs(o1.ratio - 2 / 3) < 1e-9)

  // Canonisation 3 → 6 chiffres : #f00 == #ff0000.
  const o2 = paletteOverlap(['#f00', '#0f0'], ['#ff0000', '#00ff00'])
  check('overlap canonise 3↔6 chiffres', o2.shared === 2 && o2.ratio === 1)

  // Neutres purs ignorés : partager seulement #000/#fff ne compte pas.
  const o3 = paletteOverlap(['#000000', '#ffffff'], ['#000', '#fff'])
  check('neutres purs ignorés', o3.shared === 0 && o3.ratio === 0)

  // detectPaletteReuseAmong : au plus un hit (la mieux recouverte).
  const cands = [
    { project: 'projA', colors: ['#ff0000', '#00ff00', '#0000ff'] }, // recouvre tout
    { project: 'projB', colors: ['#ff0000', '#999999'] }, // recouvre 1
  ]
  const hits = detectPaletteReuseAmong(['#ff0000', '#00ff00', '#0000ff'], cands)
  check('palette reuse : un seul hit', hits.length === 1 && hits[0].kind === 'palette')
  check('palette reuse : meilleure candidate', hits[0].name === 'projA')

  // Sous le seuil de partage → aucun hit (1 seule couleur partagée).
  const none = detectPaletteReuseAmong(['#ff0000', '#abcdef', '#fedcba'], cands)
  check('palette reuse : sous minShared → aucun', none.length === 0)

  // detectPaletteReuse lit le Blackboard et exclut le projet courant.
  const bb = new Blackboard()
  const artA: DesignArtifact = { type: 'design.produced', project: 'projA', colors: ['#ff0000', '#00ff00', '#0000ff'], at: 1 }
  const artSelf: DesignArtifact = { type: 'design.produced', project: 'moi', colors: ['#ff0000', '#00ff00', '#0000ff'], at: 2 }
  bb.put(ARTIFACT_SCOPE, 'k:projA', artA, [])
  bb.put(ARTIFACT_SCOPE, 'k:moi', artSelf, [])
  const fromBb = detectPaletteReuse(['#ff0000', '#00ff00', '#0000ff'], { exclude: 'moi', bb })
  check('palette reuse (Blackboard) : exclut le projet courant', fromBb.length === 1 && fromBb[0].name === 'projA')
  check('palette reuse : aucune couleur → []', detectPaletteReuse([], { exclude: 'moi', bb }).length === 0)
}

// ── ReuseCollector ───────────────────────────────────────────────────────────
{
  const c = new ReuseCollector()
  c.recordTurn()
  c.recordTurn()
  c.recordTurn()
  c.recordReuse([{ kind: 'component', name: 'SearchBar' }, { kind: 'skill', name: 'auth' }])
  c.recordReuse([{ kind: 'component', name: 'SearchBar' }]) // 2e tour, réutilise SearchBar
  c.recordReuse([]) // tour sans réutilisation → ignoré

  const s = c.snapshot()
  check('totalTurns = 3', s.totalTurns === 3)
  check('reuseTurns = 2', s.reuseTurns === 2)
  check('reuseRatePct = 67', s.reuseRatePct === 67) // 2/3
  check('totalReuses = 3', s.totalReuses === 3)
  check('byKind component = 2', s.byKind.component === 2)
  check('byKind skill = 1', s.byKind.skill === 1)
  check('topReused : SearchBar en tête', s.topReused[0].key === 'component:SearchBar' && s.topReused[0].count === 2)

  c.reset()
  check('reset', c.snapshot().totalTurns === 0 && c.snapshot().totalReuses === 0)
}

// ── Branchement Bus ──────────────────────────────────────────────────────────
{
  getReuseCollector().reset()
  uninstallReuseCollector()
  const bus = new KernelBus()
  installReuseCollector(bus)
  installReuseCollector(bus) // idempotent

  await bus.publish({ type: CHAT_TURN_EVENT, sender: 'demo', kind: 'success', payload: { project: 'demo' } })
  await bus.publish({ type: CHAT_TURN_EVENT, sender: 'demo', kind: 'success', payload: { project: 'demo' } })
  publishReuse('demo', [{ kind: 'component', name: 'SearchBar' }], bus)
  publishReuse('demo', [], bus) // rien publié

  const s = getReuseCollector().snapshot()
  check('bus : 2 tours comptés', s.totalTurns === 2)
  check('bus : 1 tour avec réutilisation', s.reuseTurns === 1)
  check('bus : taux 50%', s.reuseRatePct === 50)
  check('bus : idempotent (pas de double abonnement)', s.totalReuses === 1)

  uninstallReuseCollector()
  getReuseCollector().reset()
}

console.log(`\n[reuse-metrics] ${passed} ✅  ${failed ? failed + ' ❌' : '0 ❌'}  (${passed + failed} assertions)`)
if (failed > 0) process.exit(1)
