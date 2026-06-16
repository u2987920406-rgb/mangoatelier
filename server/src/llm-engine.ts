// Routeur de moteur LLM — porte d'entrée UNIQUE pour toutes les features IA de
// MangoAI. Chaque feature appelle askLLM() ; le moteur réel se choisit dans
// `.env`, sans toucher au code. Généralise le askEleveDispatch de l'Élève.
//
//   - 'claude'   → query() via l'ABONNEMENT Claude Code (qualité, pas de crédits API)
//   - 'ollama'   → modèle local (Qwen) — $0, souverain
//   - 'openai'   → endpoint compatible OpenAI générique (LLM_OPENAI_URL / LLM_OPENAI_KEY)
//   - 'deepseek' → DeepSeek API (OpenAI-compat) — DEEPSEEK_API_KEY
//   - 'mistral'  → Mistral API (OpenAI-compat) — MISTRAL_API_KEY
//   - 'groq'     → Groq API (OpenAI-compat)    — GROQ_API_KEY
//
// Réglage par feature : <FEATURE>_PROVIDER dans .env (ex. SUPERAGENT_PROVIDER),
// sinon LLM_PROVIDER global, sinon le défaut passé par la feature.
import { query } from '@anthropic-ai/claude-agent-sdk'
import { askOllama } from './ollama.js'

export type LLMProvider = 'claude' | 'ollama' | 'openai' | 'deepseek' | 'mistral' | 'groq'

export interface AskLLMOptions {
  provider?: LLMProvider
  model?: string
  maxTokens?: number
  timeoutMs?: number
}

interface ProviderPreset {
  baseURL: string
  defaultModel: string
  apiKeyEnv: string
}

/** Presets OpenAI-compat pour deepseek / mistral / groq. */
export const PROVIDER_PRESETS: Record<'deepseek' | 'mistral' | 'groq', ProviderPreset> = {
  deepseek: {
    baseURL: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    apiKeyEnv: 'DEEPSEEK_API_KEY',
  },
  mistral: {
    baseURL: 'https://api.mistral.ai/v1',
    defaultModel: 'mistral-large-latest',
    apiKeyEnv: 'MISTRAL_API_KEY',
  },
  groq: {
    baseURL: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    apiKeyEnv: 'GROQ_API_KEY',
  },
}

/** Résout un provider depuis une valeur .env (ou le défaut global), borné aux
 * 6 valeurs valides. `envValue` = la variable dédiée d'une feature. */
export function resolveProvider(envValue?: string, fallback: LLMProvider = 'claude'): LLMProvider {
  const raw = (envValue ?? process.env.LLM_PROVIDER ?? '').trim().toLowerCase()
  const valid: LLMProvider[] = ['claude', 'ollama', 'openai', 'deepseek', 'mistral', 'groq']
  return (valid.includes(raw as LLMProvider) ? raw : fallback) as LLMProvider
}

function defaultModel(provider: LLMProvider): string {
  if (provider === 'claude') return process.env.LLM_CLAUDE_MODEL ?? 'sonnet'
  if (provider === 'ollama') return process.env.OLLAMA_SUMMARY_MODEL ?? process.env.ELEVE_MODEL ?? 'qwen2.5-coder:7b'
  if (provider === 'deepseek' || provider === 'mistral' || provider === 'groq') {
    return PROVIDER_PRESETS[provider].defaultModel
  }
  // openai generic
  return process.env.LLM_OPENAI_MODEL ?? process.env.ELEVE_MODEL ?? 'deepseek-chat'
}

// ── Provider claude : query() via l'ABONNEMENT ───────────────────────────────
// CRUCIAL : query() utilise l'abonnement UNIQUEMENT si ANTHROPIC_API_KEY est
// absente de l'env. Une clé (même sans crédit) le détourne vers les crédits API.
// On nettoie donc l'env passé au sous-processus, en plus du .env commenté.
async function askClaude(system: string, user: string, model: string): Promise<string> {
  const env: Record<string, string | undefined> = { ...process.env }
  delete env.ANTHROPIC_API_KEY
  const q = query({
    prompt: user,
    options: {
      model,
      systemPrompt: { type: 'preset', preset: 'claude_code', append: system },
      maxTurns: 1,
      allowedTools: [],
      env,
    },
  })
  let text = ''
  for await (const m of q) {
    if (m.type === 'assistant') {
      const content = (m as { message?: { content?: Array<{ type: string; text?: string }> } }).message?.content ?? []
      for (const b of content) if (b.type === 'text' && b.text) text += b.text
    }
  }
  return text.trim()
}

// ── Recherche web via l'ABONNEMENT (query + outil WebSearch, multi-tours) ────
// claude-only : WebSearch est un outil Claude Code (ni Ollama ni OpenAI-compat
// ne l'ont nativement). Renvoie la synthèse texte ("" si rien). Plus lent
// (~1 min) car c'est une vraie recherche web. Comme askClaude, on neutralise
// ANTHROPIC_API_KEY pour forcer l'abonnement.
export async function claudeWebResearch(
  prompt: string,
  opts: { model?: string; maxTurns?: number } = {},
): Promise<string> {
  const env: Record<string, string | undefined> = { ...process.env }
  delete env.ANTHROPIC_API_KEY
  const q = query({
    prompt,
    options: {
      model: opts.model ?? process.env.LLM_CLAUDE_MODEL ?? 'sonnet',
      allowedTools: ['WebSearch'],
      maxTurns: opts.maxTurns ?? 6,
      env,
    },
  })
  let text = ''
  for await (const m of q) {
    if (m.type === 'assistant') {
      const content = (m as { message?: { content?: Array<{ type: string; text?: string }> } }).message?.content ?? []
      for (const b of content) if (b.type === 'text' && b.text) text += b.text + '\n'
    }
  }
  return text.trim()
}

// ── Provider openai-compatible (generic + deepseek / mistral / groq) ─────────
// `baseURL` and `apiKey` are optional: when provided they override env lookups
// (used for preset providers). For the plain 'openai' provider they fall back
// to LLM_OPENAI_URL / LLM_OPENAI_KEY / ELEVE_API_KEY as before.
async function askOpenAI(
  system: string,
  user: string,
  model: string,
  maxTokens: number,
  timeoutMs: number,
  baseURLOverride?: string,
  apiKeyOverride?: string,
): Promise<string> {
  const rawBase = (baseURLOverride ?? process.env.LLM_OPENAI_URL ?? process.env.ELEVE_API_URL ?? 'https://api.deepseek.com/v1')
    .trim()
    .replace(/\/+$/, '')
  const url = rawBase.endsWith('/chat/completions') ? rawBase : `${rawBase}/chat/completions`
  const key = (apiKeyOverride ?? process.env.LLM_OPENAI_KEY ?? process.env.ELEVE_API_KEY ?? '').trim()
  if (!key) throw new Error('Clé OpenAI-compatible manquante (LLM_OPENAI_KEY ou ELEVE_API_KEY dans server/.env).')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        stream: false,
        temperature: 0,
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`OpenAI-compat HTTP ${res.status}`)
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
    return (data.choices?.[0]?.message?.content ?? '').trim()
  } finally {
    clearTimeout(timer)
  }
}

/** Porte d'entrée unique : (system, user) → texte. Lève si le provider échoue ;
 * l'appelant décide du fallback (ex. dégradé). */
export async function askLLM(system: string, user: string, opts: AskLLMOptions = {}): Promise<string> {
  const provider = opts.provider ?? resolveProvider()
  const model = opts.model ?? defaultModel(provider)
  const maxTokens = opts.maxTokens ?? 1024
  const timeoutMs = opts.timeoutMs ?? 180_000
  if (provider === 'ollama') return askOllama(system, user, { model, timeoutMs })
  if (provider === 'deepseek' || provider === 'mistral' || provider === 'groq') {
    const preset = PROVIDER_PRESETS[provider]
    const key = (process.env[preset.apiKeyEnv] ?? process.env.LLM_OPENAI_KEY ?? process.env.ELEVE_API_KEY ?? '').trim()
    if (!key) throw new Error(`Clé manquante pour le provider "${provider}" (${preset.apiKeyEnv} dans server/.env).`)
    return askOpenAI(system, user, model, maxTokens, timeoutMs, preset.baseURL, key)
  }
  if (provider === 'openai') return askOpenAI(system, user, model, maxTokens, timeoutMs)
  return askClaude(system, user, model)
}
