// Tests des artefacts design dans le Blackboard.
//   npx tsx src/test-kernel-artifacts.ts
// Déterministe : embedding de palette pur, dépôt en mémoire, observateur Bus, et
// persistance SQLite réelle (survie au redémarrage) sur fichier temporaire.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { KernelBus } from './kernel-bus.js'
import { Blackboard } from './kernel-blackboard.js'
import { SqliteStore } from './kernel-blackboard-sqlite.js'
import {
  paletteEmbedding,
  paletteHash,
  recordDesignArtifact,
  installArtifactStore,
  uninstallArtifactStore,
  listArtifacts,
  searchArtifacts,
  ARTIFACT_SCOPE,
  type DesignArtifact,
} from './kernel-artifacts.js'

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

function refEnv(project: string, palette: string[], source = 'perfect-plan') {
  return { type: 'design.reference', sender: project, payload: { project, palette, source }, ts: 1 } as never
}
function producedEnv(project: string, palette: string[]) {
  return { type: 'design.produced', sender: project, payload: { project, palette, usedColors: palette }, ts: 1 } as never
}

// ── Embedding de palette (histogramme RGB, pur) ──────────────────────────────
{
  const e = paletteEmbedding(['#000000', '#ffffff'])
  check('embedding = 27 dims', e.length === 27)
  check('embedding normalisé (somme = 1)', Math.abs(e.reduce((s, v) => s + v, 0) - 1) < 1e-9)
  check('noir → bin 0', e[0] === 0.5)
  check('blanc → bin 26', e[26] === 0.5)
  check('invariant à l’ordre', JSON.stringify(paletteEmbedding(['#fff', '#000'])) === JSON.stringify(paletteEmbedding(['#000', '#fff'])))
  check('palette vide → []', paletteEmbedding([]).length === 0)
  check('hex invalides ignorés → []', paletteEmbedding(['nope', 'zzz']).length === 0)
}

// ── Hash / dédup ─────────────────────────────────────────────────────────────
{
  check('même palette (ordre/casse) → même hash', paletteHash(['#FFF', '#000']) === paletteHash(['#000', '#fff']))
  check('palettes différentes → hash différents', paletteHash(['#fff']) !== paletteHash(['#000']))
}

// ── recordDesignArtifact (en mémoire) ────────────────────────────────────────
{
  const bb = new Blackboard()
  const ref = recordDesignArtifact(refEnv('demo', ['#7c5cff', '#0b0b12']), bb, () => 100)
  check('record renvoie une ref', ref !== null && ref!.scope === ARTIFACT_SCOPE)
  const art = bb.get<DesignArtifact>(ARTIFACT_SCOPE, ref!.key)!
  check('artefact type', art.type === 'design.reference')
  check('artefact project', art.project === 'demo')
  check('artefact colors', JSON.stringify(art.colors) === JSON.stringify(['#7c5cff', '#0b0b12']))
  check('artefact source', art.source === 'perfect-plan')
  check('artefact at', art.at === 100)

  // Dédup : re-déposer la même palette/projet n'empile pas.
  recordDesignArtifact(refEnv('demo', ['#0b0b12', '#7c5cff']), bb, () => 200)
  check('dédup même palette → 1 clé', bb.keys(ARTIFACT_SCOPE).length === 1)

  // Palette vide → rien.
  check('palette vide → pas de dépôt', recordDesignArtifact(refEnv('demo', []), bb) === null)
}

// ── Observateur Bus → Blackboard ─────────────────────────────────────────────
{
  uninstallArtifactStore()
  const bus = new KernelBus()
  const bb = new Blackboard()
  installArtifactStore(bus, bb)
  installArtifactStore(bus, bb) // idempotent

  await bus.publish(refEnv('projA', ['#ff0000', '#00ff00']))
  await bus.publish(producedEnv('projB', ['#0000ff', '#ffffff']))
  await bus.publish({ type: 'chat.turn', sender: 'projA', payload: { project: 'projA' }, ts: 1 } as never) // ignoré

  check('observateur : 2 artefacts (chat.turn ignoré)', bb.keys(ARTIFACT_SCOPE).length === 2)
  const list = listArtifacts(bb)
  check('liste cross-projet', list.some((h) => h.artifact.project === 'projA') && list.some((h) => h.artifact.project === 'projB'))
  uninstallArtifactStore()
}

// ── Recherche par similarité de palette (le « vec ») ─────────────────────────
{
  const bb = new Blackboard()
  recordDesignArtifact(refEnv('rouge1', ['#ff0000', '#cc0000']), bb, () => 1)
  recordDesignArtifact(refEnv('bleu1', ['#0000ff', '#0000cc']), bb, () => 2)
  recordDesignArtifact(refEnv('rouge2', ['#ee0000']), bb, () => 3)

  const hits = searchArtifacts(['#ff0000'], 2, bb)
  check('recherche : 2 résultats', hits.length === 2)
  check('recherche : les rouges en tête', hits.every((h) => h.artifact.project.startsWith('rouge')))
  check('recherche : score présent', typeof hits[0].score === 'number')
  check('recherche palette vide → []', searchArtifacts([], 5, bb).length === 0)
}

// ── Persistance SQLite réelle (survie au redémarrage) ────────────────────────
{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mangoos-art-'))
  const dbPath = path.join(dir, 'art.db')

  {
    const bb = new Blackboard(new SqliteStore(dbPath))
    recordDesignArtifact(refEnv('persist', ['#7c5cff', '#0b0b12']), bb, () => 42)
    bb.close()
  }
  {
    const bb2 = new Blackboard(new SqliteStore(dbPath))
    const list = listArtifacts(bb2)
    check('SQLite : artefact survit au redémarrage', list.length === 1 && list[0].artifact.project === 'persist')
    const hits = searchArtifacts(['#7c5cff'], 1, bb2)
    check('SQLite : recherche sémantique persistée', hits.length === 1 && hits[0].artifact.project === 'persist')
    bb2.close()
  }
  fs.rmSync(dir, { recursive: true, force: true })
}

console.log(`\n[kernel-artifacts] ${passed} ✅  ${failed ? failed + ' ❌' : '0 ❌'}  (${passed + failed} assertions)`)
if (failed > 0) process.exit(1)
