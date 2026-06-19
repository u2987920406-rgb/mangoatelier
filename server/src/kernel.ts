// MangoOS Kernel — fondation de l'écosystème d'agents.
//
// Ce fichier pose le NOYAU de MangoOS, conçu pour durer 10 ans (voir
// `fondation.md` à la racine). Premier pilier livré ici : le BRAIN ADAPTER.
//
// ── Brain Adapter (le HAL de MangoOS) ───────────────────────────────────────
// Le LLM n'est PAS une dépendance câblée : c'est un composant remplaçable.
// MangoOS ne sait pas quel cerveau il utilise — il parle à un `MangosBrain`
// qui expose toujours la même interface. Aujourd'hui Claude (abonnement, $0),
// demain Qwen 72B local, après-demain un modèle fine-tuné. Zéro changement
// dans le reste du système : on change une variable d'env.
//
// Le Brain Adapter ENVELOPPE `llm-engine.ts` (la porte d'entrée unique déjà
// mature : 7 providers dont 'litellm' = proxy OpenAI-compat vers 100+ modèles).
// Il n'en duplique rien — il offre une façade objet propre, swappable et
// injectable (pour des tests déterministes sans réseau).
//
// Piliers du Kernel encore à venir (cf. fondation.md) : Event Bus (A2A),
// Blackboard (SQLite-vec + mutex), MCP, OpenTelemetry. Ils s'ajouteront ici
// sans toucher au Brain Adapter.

import {
  askLLM,
  resolveProvider,
  type LLMProvider,
  type AskLLMOptions,
} from './llm-engine.js'

// ── Le contrat universel du cerveau ──────────────────────────────────────────
// Tout ce que MangoOS demande à un LLM passe par cette interface. Rien d'autre.
export interface MangosBrain {
  /** Provider actif (claude / ollama / litellm / …). */
  readonly provider: LLMProvider
  /** Modèle actif, ou '' si on laisse llm-engine choisir son défaut. */
  readonly model: string
  /** (system, user) → texte. Lève si le provider échoue ; l'appelant décide
   * du fallback (le Kernel centralisera retry/fallback à l'étape Event Bus). */
  complete(system: string, user: string, opts?: BrainCompleteOptions): Promise<string>
  /** Étiquette lisible pour logs / OpenTelemetry / UI. */
  describe(): string
}

export interface BrainCompleteOptions {
  /** Surcharge ponctuelle du modèle pour cet appel. */
  model?: string
  maxTokens?: number
  timeoutMs?: number
}

export interface BrainConfig {
  /** Provider forcé. Défaut : lu depuis BRAIN_PROVIDER, sinon 'claude'. */
  provider?: LLMProvider
  /** Modèle par défaut du cerveau. Vide ('') = défaut de llm-engine. */
  model?: string
  maxTokens?: number
  timeoutMs?: number
}

// ── Injection de dépendance (pattern maison : cerveau injectable pour tests) ──
// Par défaut on tape `askLLM` (réseau réel). Les tests fournissent un faux
// `ask` pour valider le routage sans aucun appel réseau.
export interface BrainDeps {
  ask?: (system: string, user: string, opts?: AskLLMOptions) => Promise<string>
}

/** Résout la config du cerveau depuis l'environnement (BRAIN_PROVIDER /
 * BRAIN_MODEL). Bornée aux providers valides via `resolveProvider`. */
export function resolveBrainConfig(env: NodeJS.ProcessEnv = process.env): {
  provider: LLMProvider
  model: string
} {
  return {
    provider: resolveProvider(env.BRAIN_PROVIDER),
    model: (env.BRAIN_MODEL ?? '').trim(),
  }
}

/** Construit un cerveau. `config` surcharge l'environnement ; `deps` permet
 * d'injecter un faux `ask` (tests). */
export function createBrain(config: BrainConfig = {}, deps: BrainDeps = {}): MangosBrain {
  const ask = deps.ask ?? askLLM
  const base = resolveBrainConfig()
  const provider = config.provider ?? base.provider
  const model = (config.model ?? base.model).trim()
  const maxTokens = config.maxTokens
  const timeoutMs = config.timeoutMs

  return {
    provider,
    model,
    async complete(system, user, opts = {}) {
      const chosenModel = (opts.model ?? model).trim()
      const askOpts: AskLLMOptions = {
        provider,
        // '' → undefined : laisse llm-engine appliquer son defaultModel(provider).
        model: chosenModel || undefined,
        maxTokens: opts.maxTokens ?? maxTokens,
        timeoutMs: opts.timeoutMs ?? timeoutMs,
      }
      return ask(system, user, askOpts)
    },
    describe() {
      return `MangosBrain(provider=${provider}, model=${model || 'default'})`
    },
  }
}

// ── Cerveau par défaut du Kernel (singleton, swappable à chaud) ───────────────
// Un seul cerveau « courant » pour tout MangoOS. `setBrain` permet de basculer
// (changement de provider à l'exécution) ; `resetBrain` force une relecture de
// la config au prochain accès.
let current: MangosBrain | null = null

/** Le cerveau courant de MangoOS (créé à la première demande). */
export function getBrain(): MangosBrain {
  if (current === null) current = createBrain()
  return current
}

/** Bascule le cerveau courant (nouveau provider/modèle, ou faux cerveau de test). */
export function setBrain(brain: MangosBrain): void {
  current = brain
}

/** Oublie le cerveau courant — le prochain getBrain() relira l'environnement. */
export function resetBrain(): void {
  current = null
}
