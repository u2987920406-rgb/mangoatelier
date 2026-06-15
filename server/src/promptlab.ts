import Anthropic from '@anthropic-ai/sdk'
import type { Express, Request, Response } from 'express'

const client = new Anthropic()

const MODEL_MAP: Record<string, string> = {
  haiku: 'claude-haiku-4-5-20251001',
  sonnet: 'claude-sonnet-4-6',
  opus: 'claude-opus-4-8',
}

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
      const modelId = MODEL_MAP[modelKey]
      if (!modelId) {
        sendEvent({ type: 'error', model: modelKey, message: `Unknown model: ${modelKey}` })
        return
      }

      let totalChars = 0

      try {
        const stream = client.messages.stream({
          model: modelId,
          max_tokens: 2048,
          messages: [{ role: 'user', content: prompt }],
        })

        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            const text = event.delta.text
            totalChars += text.length
            sendEvent({ type: 'chunk', model: modelKey, text })
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
