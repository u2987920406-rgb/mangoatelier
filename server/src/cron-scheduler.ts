import Anthropic from '@anthropic-ai/sdk'
import fs from 'node:fs'
import path from 'node:path'
import type { Express } from 'express'

interface CronTask {
  id: string
  name: string
  projectName: string
  prompt: string
  schedule: 'hourly' | 'daily' | 'weekly'
  enabled: boolean
  lastRun?: string
  lastResult?: string
  createdAt: string
}

const DATA_DIR = path.join(process.cwd(), 'data')
const DATA_FILE = path.join(DATA_DIR, 'cron-tasks.json')

function loadTasks(): CronTask[] {
  if (!fs.existsSync(DATA_FILE)) return []
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')) as CronTask[]
  } catch {
    return []
  }
}

function saveTasks(tasks: CronTask[]): void {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(DATA_FILE, JSON.stringify(tasks, null, 2), 'utf-8')
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

function shouldRun(task: CronTask): boolean {
  if (!task.lastRun) return true
  const last = new Date(task.lastRun).getTime()
  const now = Date.now()
  const elapsed = now - last
  if (task.schedule === 'hourly') return elapsed >= 60 * 60 * 1000
  if (task.schedule === 'daily') return elapsed >= 24 * 60 * 60 * 1000
  if (task.schedule === 'weekly') return elapsed >= 7 * 24 * 60 * 60 * 1000
  return false
}

async function executeTask(task: CronTask): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const systemPrompt = `Tu es MangoAI, un agent autonome. Le projet cible est "${task.projectName}". Exécute la tâche demandée de façon concise et utile.`
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    system: systemPrompt,
    messages: [{ role: 'user', content: task.prompt }]
  })
  const block = response.content[0]
  return block.type === 'text' ? block.text : '(résultat vide)'
}

async function startScheduler(): Promise<void> {
  fs.mkdirSync(DATA_DIR, { recursive: true })

  const tick = async () => {
    const tasks = loadTasks()
    const updated: CronTask[] = []
    for (const task of tasks) {
      if (task.enabled && shouldRun(task)) {
        try {
          const result = await executeTask(task)
          updated.push({ ...task, lastRun: new Date().toISOString(), lastResult: result })
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          updated.push({ ...task, lastRun: new Date().toISOString(), lastResult: `Erreur: ${msg}` })
        }
      } else {
        updated.push(task)
      }
    }
    saveTasks(updated)
  }

  setInterval(() => {
    tick().catch(console.error)
  }, 5 * 60 * 1000)
}

export function registerCronRoutes(app: Express): void {
  // GET /api/cron/tasks
  app.get('/api/cron/tasks', (_req, res) => {
    const tasks = loadTasks()
    res.json(tasks)
  })

  // POST /api/cron/tasks
  app.post('/api/cron/tasks', (req, res) => {
    const { name, projectName, prompt, schedule } = req.body as {
      name: string
      projectName: string
      prompt: string
      schedule: 'hourly' | 'daily' | 'weekly'
    }
    if (!name || !projectName || !prompt || !schedule) {
      res.status(400).json({ error: 'Champs manquants: name, projectName, prompt, schedule' })
      return
    }
    const tasks = loadTasks()
    const task: CronTask = {
      id: generateId(),
      name,
      projectName,
      prompt,
      schedule,
      enabled: true,
      createdAt: new Date().toISOString()
    }
    tasks.push(task)
    saveTasks(tasks)
    res.json({ task })
  })

  // PATCH /api/cron/tasks/:id
  app.patch('/api/cron/tasks/:id', (req, res) => {
    const { id } = req.params
    const { enabled } = req.body as { enabled: boolean }
    const tasks = loadTasks()
    const idx = tasks.findIndex(t => t.id === id)
    if (idx === -1) {
      res.status(404).json({ error: 'Tâche introuvable' })
      return
    }
    tasks[idx] = { ...tasks[idx], enabled }
    saveTasks(tasks)
    res.json({ task: tasks[idx] })
  })

  // DELETE /api/cron/tasks/:id
  app.delete('/api/cron/tasks/:id', (req, res) => {
    const { id } = req.params
    const tasks = loadTasks()
    const filtered = tasks.filter(t => t.id !== id)
    if (filtered.length === tasks.length) {
      res.status(404).json({ error: 'Tâche introuvable' })
      return
    }
    saveTasks(filtered)
    res.json({ ok: true })
  })

  // POST /api/cron/tasks/:id/run
  app.post('/api/cron/tasks/:id/run', async (req, res) => {
    const { id } = req.params
    const tasks = loadTasks()
    const idx = tasks.findIndex(t => t.id === id)
    if (idx === -1) {
      res.status(404).json({ error: 'Tâche introuvable' })
      return
    }
    try {
      const result = await executeTask(tasks[idx])
      tasks[idx] = { ...tasks[idx], lastRun: new Date().toISOString(), lastResult: result }
      saveTasks(tasks)
      res.json({ result, task: tasks[idx] })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      res.status(500).json({ error: msg })
    }
  })

  // Démarrer le scheduler en arrière-plan
  startScheduler().catch(console.error)
}
