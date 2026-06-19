// Tests de la mesure de réutilisation effective (#121).
//   npx tsx src/test-kernel-reuse-metrics.ts
import { KernelBus } from './kernel-bus.js'
import { CHAT_TURN_EVENT } from './kernel-chat-bridge.js'
import {
  detectArtifactReads,
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
