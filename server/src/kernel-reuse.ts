// MangoOS Kernel — Réinjection des composants & blueprints (#119, « de la même
// façon » que les artefacts design #118).
//
// #118 réinjecte les PALETTES proches de la cible avant un build. Ici on étend le
// principe aux deux autres bibliothèques réutilisables :
//   • COMPOSANTS (#36) — vraie bibliothèque qui grandit. Aujourd'hui le prompt
//     DUMPE tous les composants ; on les indexe dans le Blackboard (embedding
//     texte) et on ne réinjecte que les PLUS PERTINENTS à la tâche du tour.
//   • BLUEPRINTS (#8) — catalogue statique de 7 types. La « pertinence » = le type
//     inféré de la demande ; on rappelle le blueprint qui colle.
//
// Embedding texte best-effort via Ollama (comme notes-rag/procédures) avec REPLI
// MOTS-CLÉS déterministe → marche toujours, sans Ollama. L'embedder est injectable
// (tests déterministes). La recherche passe par le Blackboard #115 (cosinus).
import { listComponents, COMPONENTS_DIR_NAME, type ComponentMeta } from './components.js'
import { getBlackboard, type Blackboard } from './kernel-blackboard.js'
import { embedOllama } from './ollama.js'
import { inferProjectType } from './blueprints.js'

export const COMPONENT_SCOPE = 'artifact:component'

export type Embed = (text: string) => Promise<number[]>

/** Embedder par défaut : Ollama, [] si indisponible (déclenche le repli mots-clés). */
const defaultEmbed: Embed = async (t) => {
  try {
    return await embedOllama(t)
  } catch {
    return []
  }
}

function componentText(c: ComponentMeta): string {
  return `${c.name}. ${c.description}. ${(c.tags ?? []).join(' ')} ${(c.props ?? []).join(' ')}`
}

// ── Repli mots-clés (déterministe, sans réseau) ──────────────────────────────
function tokenize(s: string): string[] {
  return (s.toLowerCase().match(/[a-zàâäéèêëîïôöùûüç0-9]+/g) ?? []).filter((t) => t.length >= 3)
}

/** Classe des items par chevauchement de tokens avec la requête (desc). Stable. */
export function keywordRank<T>(items: T[], textOf: (t: T) => string, query: string, k: number): T[] {
  const q = new Set(tokenize(query))
  if (q.size === 0) return items.slice(0, k)
  const scored = items.map((item, i) => {
    const toks = new Set(tokenize(textOf(item)))
    let overlap = 0
    for (const t of toks) if (q.has(t)) overlap++
    return { item, overlap, i }
  })
  scored.sort((a, b) => b.overlap - a.overlap || a.i - b.i) // stable : ordre d'origine à égalité
  return scored.slice(0, k).map((s) => s.item)
}

// ── Indexation des composants dans le Blackboard ─────────────────────────────
/** Indexe (ou met à jour) les composants dans le Blackboard avec leur embedding
 * texte. Idempotent : un composant inchangé (même updatedAt) n'est pas ré-embeddé. */
export async function indexComponents(workspaceDir: string, bb: Blackboard, embed: Embed): Promise<void> {
  for (const c of listComponents(workspaceDir)) {
    const existing = bb.get<ComponentMeta>(COMPONENT_SCOPE, c.name)
    if (existing && existing.updatedAt === c.updatedAt) continue
    const emb = await embed(componentText(c))
    bb.put(COMPONENT_SCOPE, c.name, c, emb.length ? emb : undefined)
  }
}

function formatComponents(list: ComponentMeta[]): string {
  const lines = list.map((c) => {
    const tagStr = c.tags?.length ? ` [${c.tags.join(', ')}]` : ''
    const propStr = c.props?.length ? ` — props: ${c.props.join(', ')}` : ''
    return `- **${c.name}**: ${c.description}${tagStr}${propStr}`
  })
  return (
    `\n\nComposants réutilisables PERTINENTS pour cette tâche (lis workspace/${COMPONENTS_DIR_NAME}/<Name>/component.tsx pour réutiliser) :\n` +
    lines.join('\n')
  )
}

/** Section de prompt : les k composants les plus PERTINENTS à la tâche du tour
 * (recherche sémantique Blackboard, repli mots-clés). "" s'il n'y a aucun
 * composant. Async (embedding best-effort) ; ne lève jamais. */
export async function relevantComponentsSection(
  prompt: string,
  workspaceDir: string,
  opts: { bb?: Blackboard; embed?: Embed; k?: number } = {},
): Promise<string> {
  const all = listComponents(workspaceDir)
  if (all.length === 0) return ''
  const bb = opts.bb ?? getBlackboard()
  const embed = opts.embed ?? defaultEmbed
  const k = opts.k ?? 8

  // Sous le seuil k, tout tient : on garde le dump complet (juste reformulé
  // « pertinents »), inutile d'embedder. Au-dessus, on trie par pertinence.
  if (all.length <= k) return formatComponents(all)

  await indexComponents(workspaceDir, bb, embed)
  const qEmb = await embed(prompt)
  let ranked: ComponentMeta[]
  if (qEmb.length > 0) {
    const hits = bb.search(COMPONENT_SCOPE, qEmb, k)
    ranked = hits.map((h) => h.value as ComponentMeta).filter(Boolean)
    if (ranked.length === 0) ranked = keywordRank(all, componentText, prompt, k) // aucun embedding stocké
  } else {
    ranked = keywordRank(all, componentText, prompt, k)
  }
  return formatComponents(ranked.slice(0, k))
}

// ── Blueprints : rappel du type pertinent ────────────────────────────────────
/** Section de prompt : rappelle le blueprint du TYPE détecté pour la demande.
 * "" si le type est « autre » (aucun blueprint dédié). Pur et synchrone. */
export function blueprintHintSection(prompt: string): string {
  const type = inferProjectType(prompt)
  if (type === 'autre') return ''
  return (
    `\n\n→ Type de projet détecté pour cette demande : **${type}**. ` +
    `Pars du blueprint « ${type} » ci-dessus (stack + arborescence) plutôt que d'improviser ; adapte si le projet l'exige.`
  )
}
