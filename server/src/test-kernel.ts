// Pure unit tests for kernel.ts (Brain Adapter) — zero network calls.
// A fake `ask` captures what complete() forwards to llm-engine, so we test the
// routing/config without hitting any provider.
//
// Run: npx tsx src/test-kernel.ts

import {
  createBrain,
  resolveBrainConfig,
  getBrain,
  setBrain,
  resetBrain,
  type MangosBrain,
  type BrainDeps,
} from './kernel.js'
import type { AskLLMOptions } from './llm-engine.js'

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

function withEnv(vars: Record<string, string | undefined>, fn: () => void | Promise<void>): void | Promise<void> {
  const saved: Record<string, string | undefined> = {}
  for (const k of Object.keys(vars)) saved[k] = process.env[k]
  for (const [k, v] of Object.entries(vars)) {
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
  const restore = () => {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k]
      else process.env[k] = v
    }
  }
  try {
    const r = fn()
    if (r instanceof Promise) return r.finally(restore)
    restore()
  } catch (e) {
    restore()
    throw e
  }
}

/** Fake ask that records the last call and returns a canned reply. */
function spyDeps(): { deps: BrainDeps; last: () => { system: string; user: string; opts?: AskLLMOptions } | null } {
  let captured: { system: string; user: string; opts?: AskLLMOptions } | null = null
  const deps: BrainDeps = {
    ask: async (system, user, opts) => {
      captured = { system, user, opts }
      return `ECHO:${user}`
    },
  }
  return { deps, last: () => captured }
}

async function main(): Promise<void> {
  line('═')
  console.log('resolveBrainConfig — env reading')
  line()

  await withEnv({ BRAIN_PROVIDER: undefined, BRAIN_MODEL: undefined, LLM_PROVIDER: undefined }, () => {
    const c = resolveBrainConfig()
    check("no BRAIN_PROVIDER → provider 'claude'", c.provider === 'claude')
    check('no BRAIN_MODEL → model ""', c.model === '')
  })

  await withEnv({ BRAIN_PROVIDER: 'litellm', BRAIN_MODEL: 'qwen2.5:72b' }, () => {
    const c = resolveBrainConfig()
    check("BRAIN_PROVIDER=litellm → provider 'litellm'", c.provider === 'litellm')
    check('BRAIN_MODEL is read', c.model === 'qwen2.5:72b')
  })

  await withEnv({ BRAIN_PROVIDER: 'banana' }, () => {
    const c = resolveBrainConfig()
    check("invalid BRAIN_PROVIDER → fallback 'claude'", c.provider === 'claude')
  })

  line('═')
  console.log('createBrain — config + describe')
  line()

  await withEnv({ BRAIN_PROVIDER: undefined, BRAIN_MODEL: undefined }, () => {
    const b = createBrain()
    check("default brain provider = 'claude'", b.provider === 'claude')
    check('default brain model = "" (let engine choose)', b.model === '')
    check('describe() shows default', b.describe() === 'MangosBrain(provider=claude, model=default)')
  })

  {
    const b = createBrain({ provider: 'ollama', model: 'gemma4:12b' })
    check("explicit config provider = 'ollama'", b.provider === 'ollama')
    check('explicit config model is kept', b.model === 'gemma4:12b')
    check('describe() shows explicit model', b.describe() === 'MangosBrain(provider=ollama, model=gemma4:12b)')
  }

  line('═')
  console.log('complete — forwards correct provider/model/opts to ask')
  line()

  {
    const { deps, last } = spyDeps()
    const b = createBrain({ provider: 'litellm', model: 'gpt-4o-mini' }, deps)
    const out = await b.complete('SYS', 'hello')
    check('complete returns the ask result', out === 'ECHO:hello')
    const c = last()
    check('ask received system + user', c?.system === 'SYS' && c?.user === 'hello')
    check("ask received provider 'litellm'", c?.opts?.provider === 'litellm')
    check('ask received configured model', c?.opts?.model === 'gpt-4o-mini')
  }

  {
    // Empty model must become undefined so llm-engine picks its own default.
    const { deps, last } = spyDeps()
    const b = createBrain({ provider: 'claude', model: '' }, deps)
    await b.complete('S', 'U')
    check('empty model → forwarded as undefined', last()?.opts?.model === undefined)
  }

  {
    // Per-call model override wins over the brain's default model.
    const { deps, last } = spyDeps()
    const b = createBrain({ provider: 'claude', model: 'sonnet' }, deps)
    await b.complete('S', 'U', { model: 'opus', maxTokens: 42, timeoutMs: 1234 })
    check('per-call model override applied', last()?.opts?.model === 'opus')
    check('per-call maxTokens forwarded', last()?.opts?.maxTokens === 42)
    check('per-call timeoutMs forwarded', last()?.opts?.timeoutMs === 1234)
  }

  line('═')
  console.log('singleton — getBrain / setBrain / resetBrain')
  line()

  await withEnv({ BRAIN_PROVIDER: undefined }, () => {
    resetBrain()
    const a = getBrain()
    const b = getBrain()
    check('getBrain returns a stable singleton', a === b)

    const fake: MangosBrain = {
      provider: 'ollama',
      model: 'fake',
      async complete() {
        return 'FAKE'
      },
      describe() {
        return 'fake-brain'
      },
    }
    setBrain(fake)
    check('setBrain swaps the current brain', getBrain() === fake)

    resetBrain()
    check('resetBrain forces a fresh brain', getBrain() !== fake)
  })

  line('═')
  const total = pass + fail
  if (fail === 0) {
    console.log(`✅ All ${total}/${total} checks passed.`)
    process.exit(0)
  } else {
    console.log(`❌ ${fail}/${total} check(s) failed.`)
    process.exit(1)
  }
}

void main()
