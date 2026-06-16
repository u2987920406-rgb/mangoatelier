import { query } from '@anthropic-ai/claude-agent-sdk'
import type { Express, Request, Response } from 'express'

// The Lab runs a raw prompt against several models side by side. It goes
// through the Agent SDK (which reuses the local Claude Code login) rather than
// the direct Anthropic SDK, so it needs NO ANTHROPIC_API_KEY / pay-as-you-go
// credits — consistent with the rest of the app's subscription posture.
const ALLOWED_MODELS = new Set(['haiku', 'sonnet', 'opus'])

export function registerPromptLabRoutes(app: Express): void {
  // POST /api/promptlab/run
  // Body: { prompt: string, models: ('haiku'|'sonnet'|'opus')[] }
  // Stream SSE : un event par chunk de chaque modèle
  // Format SSE : data: {"type":"chunk","model":"haiku","text":"..."}
  // Puis : data: {"type":"done","model":"haiku","totalChars":123}
  // Lance les modèles en parallèle (Promise.all) mais stream au fur et à mesure
  app.post('/api/promptlab/run', async (req: Request, res: Response) => {
    const { prompt, models } = req.body as { prompt: string; models: string[] }

    if (!prompt || !Array.isArray(models) || models.length === 0) {
      res.status(400).json({ error: 'prompt and models[] are required' })
      return
    }

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders()

    const sendEvent = (data: Record<string, unknown>) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`)
    }

    const runModel = async (modelKey: string) => {
      if (!ALLOWED_MODELS.has(modelKey)) {
        sendEvent({ type: 'error', model: modelKey, message: `Unknown model: ${modelKey}` })
        return
      }

      let totalChars = 0

      try {
        // A bare single-shot answer so the comparison reflects the raw model
        // and nothing else: maxTurns 1, no tools, empty system prompt (override
        // the claude_code preset). includePartialMessages → token-by-token
        // streaming, matching the previous direct-SDK behaviour.
        const q = query({
          prompt,
          options: {
            model: modelKey,
            maxTurns: 1,
            allowedTools: [],
            includePartialMessages: true,
            systemPrompt: '',
          },
        })

        for await (const message of q) {
          if (message.type === 'stream_event') {
            const ev = message.event
            if (ev.type === 'content_block_delta' && ev.delta.type === 'text_delta') {
              const text = ev.delta.text
              totalChars += text.length
              sendEvent({ type: 'chunk', model: modelKey, text })
            }
          }
        }

        sendEvent({ type: 'done', model: modelKey, totalChars })
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        sendEvent({ type: 'error', model: modelKey, message })
      }
    }

    try {
      await Promise.all(models.map((m) => runModel(m)))
    } finally {
      res.end()
    }
  })
}
