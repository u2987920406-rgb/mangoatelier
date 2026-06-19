// Tests de la réinjection composants/blueprints (#119).
//   npx tsx src/test-kernel-reuse.ts
// Déterministe : embedder injecté (mappe un texte → vecteur), composants écrits
// sur un workspace temporaire, Blackboard en mémoire.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { Blackboard } from './kernel-blackboard.js'
import { saveComponent } from './components.js'
import {
  keywordRank,
  blueprintHintSection,
  indexComponents,
  relevantComponentsSection,
  COMPONENT_SCOPE,
  type Embed,
} from './kernel-reuse.js'

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

// ── keywordRank ──────────────────────────────────────────────────────────────
{
  const items = ['table de données triable', 'fenêtre modale', 'barre de navigation']
  const ranked = keywordRank(items, (s) => s, 'je veux une table triable', 3)
  check('keywordRank : meilleur = table', ranked[0] === 'table de données triable')
  check('keywordRank : requête vide → ordre d’origine', keywordRank(items, (s) => s, '', 2).length === 2)
  check('keywordRank : stable à égalité', JSON.stringify(keywordRank(['aaa', 'bbb'], (s) => s, 'zzz', 2)) === JSON.stringify(['aaa', 'bbb']))
}

// ── blueprintHintSection ─────────────────────────────────────────────────────
{
  check('blueprint : dashboard détecté', blueprintHintSection('crée un dashboard analytics').includes('dashboard'))
  check('blueprint : jeu détecté', blueprintHintSection('un petit jeu canvas arcade').includes('jeu'))
  check('blueprint : générique → ""', blueprintHintSection('change la couleur du bouton') === '')
}

// ── indexComponents + relevantComponentsSection ──────────────────────────────
{
  const ws = fs.mkdtempSync(path.join(os.tmpdir(), 'mangoos-reuse-'))
  const mk = (name: string, description: string, tags: string[]) =>
    saveComponent(ws, {
      meta: { name, description, tags, props: [], usedIn: [], createdAt: 'x', updatedAt: '1' },
      code: '// ' + name,
    })
  mk('DataTable', 'table de données triable et paginée', ['table', 'data'])
  mk('Modal', 'fenêtre modale accessible', ['modal', 'overlay'])
  mk('ChartCard', 'carte avec graphique recharts', ['chart', 'stat'])

  // Embedder de test : vecteur [table?, modal?, chart?] selon le contenu.
  const fakeEmbed: Embed = async (t) => {
    const s = t.toLowerCase()
    return [s.includes('table') ? 1 : 0, s.includes('modal') ? 1 : 0, s.includes('chart') || s.includes('graph') ? 1 : 0]
  }

  // Sous le seuil k → tout est listé (pas d'embedding requis).
  const full = await relevantComponentsSection('peu importe', ws, { embed: fakeEmbed, k: 8 })
  check('composants : sous le seuil → tout listé', full.includes('DataTable') && full.includes('Modal') && full.includes('ChartCard'))

  // Au-dessus du seuil (k=1) → tri sémantique via Blackboard.
  const bb = new Blackboard()
  const tableReq = await relevantComponentsSection('je veux une table triable', ws, { bb, embed: fakeEmbed, k: 1 })
  check('composants : top-1 sémantique = DataTable', tableReq.includes('DataTable') && !tableReq.includes('Modal'))
  check('composants : en-tête « PERTINENTS »', tableReq.includes('PERTINENTS'))
  check('composants : indexés dans le Blackboard', bb.keys(COMPONENT_SCOPE).length === 3)

  const chartReq = await relevantComponentsSection('ajoute un graphique de stats', ws, { bb, embed: fakeEmbed, k: 1 })
  check('composants : top-1 = ChartCard pour une demande graphique', chartReq.includes('ChartCard'))

  // Repli mots-clés quand l'embedder est indisponible ([]).
  const noEmbed: Embed = async () => []
  const bb2 = new Blackboard()
  const fallback = await relevantComponentsSection('une fenêtre modale', ws, { bb: bb2, embed: noEmbed, k: 1 })
  check('composants : repli mots-clés → Modal', fallback.includes('Modal') && !fallback.includes('DataTable'))

  // Idempotence de l'indexation (même updatedAt → pas de ré-embed).
  let embedCalls = 0
  const counting: Embed = async (t) => { embedCalls++; return [t.length % 3, 0, 0] }
  const bb3 = new Blackboard()
  await indexComponents(ws, bb3, counting)
  const after1 = embedCalls
  await indexComponents(ws, bb3, counting)
  check('indexComponents : idempotent (pas de ré-embed)', embedCalls === after1)

  fs.rmSync(ws, { recursive: true, force: true })
}

// ── Aucun composant → "" ─────────────────────────────────────────────────────
{
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'mangoos-reuse-empty-'))
  const section = await relevantComponentsSection('quoi que ce soit', empty, { embed: async () => [] })
  check('aucun composant → ""', section === '')
  fs.rmSync(empty, { recursive: true, force: true })
}

console.log(`\n[kernel-reuse] ${passed} ✅  ${failed ? failed + ' ❌' : '0 ❌'}  (${passed + failed} assertions)`)
if (failed > 0) process.exit(1)
