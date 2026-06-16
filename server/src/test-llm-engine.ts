// Pure unit tests for llm-engine.ts — zero network calls.
// Tests: resolveProvider (6 providers, fallback, LLM_PROVIDER env),
//        PROVIDER_PRESETS coherence (baseURL / defaultModel / apiKeyEnv).
//
// Run: npx tsx src/test-llm-engine.ts

import { resolveProvider, PROVIDER_PRESETS } from './llm-engine.js'

const line = (c = '─') => console.log(c.repeat(64))
let pass = 0
let fail = 0

function check(label: string, cond: boolean): void {
  if (cond) {
    console.log(`  ✓ ${label}`)
    pass++
  } else {
    console.log(`  ✗ ${label}`)
    fail++
  }
}

// ── Save and restore env between groups ──────────────────────────────────────
function withEnv(vars: Record<string, string | undefined>, fn: () => void): void {
  const saved: Record<string, string | undefined> = {}
  for (const k of Object.keys(vars)) saved[k] = process.env[k]
  for (const [k, v] of Object.entries(vars)) {
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
  try {
    fn()
  } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k]
      else process.env[k] = v
    }
  }
}

line('═')
console.log('resolveProvider — 6 valid providers')
line()

withEnv({ LLM_PROVIDER: undefined }, () => {
  // All 6 valid providers accepted when passed directly
  check("'claude' → 'claude'", resolveProvider('claude') === 'claude')
  check("'ollama' → 'ollama'", resolveProvider('ollama') === 'ollama')
  check("'openai' → 'openai'", resolveProvider('openai') === 'openai')
  check("'deepseek' → 'deepseek'", resolveProvider('deepseek') === 'deepseek')
  check("'mistral' → 'mistral'", resolveProvider('mistral') === 'mistral')
  check("'groq' → 'groq'", resolveProvider('groq') === 'groq')
})

line()
console.log('resolveProvider — fallback on unknown / empty values')
line()

withEnv({ LLM_PROVIDER: undefined }, () => {
  check("unknown value → default fallback 'claude'", resolveProvider('banana') === 'claude')
  check("empty string → default fallback 'claude'", resolveProvider('') === 'claude')
  check("undefined → default fallback 'claude'", resolveProvider(undefined) === 'claude')
  check("unknown value with custom fallback 'ollama'", resolveProvider('??', 'ollama') === 'ollama')
})

line()
console.log('resolveProvider — LLM_PROVIDER global env fallback')
line()

withEnv({ LLM_PROVIDER: 'deepseek' }, () => {
  // empty string '' is NOT null/undefined — ?? operator keeps it, so LLM_PROVIDER is NOT read
  check("LLM_PROVIDER=deepseek: envValue='' → default fallback 'claude' ('' bypasses LLM_PROVIDER)", resolveProvider('') === 'claude')
  check("LLM_PROVIDER=deepseek → 'deepseek' when envValue is undefined", resolveProvider(undefined) === 'deepseek')
  check("explicit envValue 'groq' overrides LLM_PROVIDER", resolveProvider('groq') === 'groq')
  // unknown explicit value uses its own raw, LLM_PROVIDER is NOT consulted (raw='banana' → fallback)
  check("LLM_PROVIDER=deepseek: unknown explicit 'banana' → default fallback 'claude'", resolveProvider('banana') === 'claude')
})

withEnv({ LLM_PROVIDER: 'totally-invalid' }, () => {
  check("LLM_PROVIDER=totally-invalid → default fallback 'claude'", resolveProvider(undefined) === 'claude')
})

line()
console.log('PROVIDER_PRESETS — coherence for deepseek / mistral / groq')
line()

const presetProviders = ['deepseek', 'mistral', 'groq'] as const

for (const p of presetProviders) {
  const preset = PROVIDER_PRESETS[p]
  check(`${p}: baseURL is a non-empty string`, typeof preset.baseURL === 'string' && preset.baseURL.length > 0)
  check(`${p}: baseURL starts with https://`, preset.baseURL.startsWith('https://'))
  check(`${p}: defaultModel is a non-empty string`, typeof preset.defaultModel === 'string' && preset.defaultModel.length > 0)
  check(`${p}: apiKeyEnv is a non-empty string`, typeof preset.apiKeyEnv === 'string' && preset.apiKeyEnv.length > 0)
  check(`${p}: apiKeyEnv contains '_API_KEY'`, preset.apiKeyEnv.includes('_API_KEY'))
}

// Spot-check specific values
check("deepseek baseURL = https://api.deepseek.com/v1", PROVIDER_PRESETS.deepseek.baseURL === 'https://api.deepseek.com/v1')
check("deepseek defaultModel = deepseek-chat", PROVIDER_PRESETS.deepseek.defaultModel === 'deepseek-chat')
check("deepseek apiKeyEnv = DEEPSEEK_API_KEY", PROVIDER_PRESETS.deepseek.apiKeyEnv === 'DEEPSEEK_API_KEY')

check("mistral baseURL = https://api.mistral.ai/v1", PROVIDER_PRESETS.mistral.baseURL === 'https://api.mistral.ai/v1')
check("mistral defaultModel = mistral-large-latest", PROVIDER_PRESETS.mistral.defaultModel === 'mistral-large-latest')
check("mistral apiKeyEnv = MISTRAL_API_KEY", PROVIDER_PRESETS.mistral.apiKeyEnv === 'MISTRAL_API_KEY')

check("groq baseURL = https://api.groq.com/openai/v1", PROVIDER_PRESETS.groq.baseURL === 'https://api.groq.com/openai/v1')
check("groq defaultModel = llama-3.3-70b-versatile", PROVIDER_PRESETS.groq.defaultModel === 'llama-3.3-70b-versatile')
check("groq apiKeyEnv = GROQ_API_KEY", PROVIDER_PRESETS.groq.apiKeyEnv === 'GROQ_API_KEY')

line('═')
const total = pass + fail
if (fail === 0) {
  console.log(`✅ All ${total}/${total} checks passed.`)
  process.exit(0)
} else {
  console.log(`❌ ${fail}/${total} check(s) failed.`)
  process.exit(1)
}
