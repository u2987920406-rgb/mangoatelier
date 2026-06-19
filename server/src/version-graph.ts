// Version graph: enriched version history + rollback route for the UI.
import type { Express, Request, Response } from 'express'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { listVersions, rollbackTo } from './versions.js'
import { projectDir, projectExists } from './projects.js'

const execFileAsyncFn = promisify(execFile)

export interface VersionNode {
  hash: string
  shortHash: string
  message: string
  date: string
  author: string
  isCurrent: boolean
  filesChanged: number
}

async function gitCmd(dir: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsyncFn('git', args, { cwd: dir })
  return stdout
}

async function getVersionGraph(projectName: string): Promise<VersionNode[]> {
  const dir = projectDir(projectName)
  const versions = await listVersions(dir)
  if (versions.length === 0) return []

  const currentHash = versions[0]?.hash ?? ''

  const nodes: VersionNode[] = []

  for (const v of versions) {
    let author = 'MangoOS'
    let filesChanged = 0

    try {
      // Get author from full log
      const logOut = await gitCmd(dir, [
        'log',
        '-1',
        '--format=%an',
        v.hash,
      ])
      author = logOut.trim() || 'MangoOS'

      // Get files changed count
      const statOut = await gitCmd(dir, [
        'diff-tree',
        '--no-commit-id',
        '-r',
        '--name-only',
        v.hash,
      ])
      filesChanged = statOut.trim().split('\n').filter(Boolean).length
    } catch {
      // git enrichment failed — use defaults
    }

    nodes.push({
      hash: v.hash,
      shortHash: v.hash.slice(0, 7),
      message: v.message,
      date: v.date,
      author,
      isCurrent: v.hash === currentHash,
      filesChanged,
    })
  }

  return nodes
}

export function registerVersionGraphRoutes(app: Express): void {
  // GET /api/versions/:projectName/graph → VersionNode[]
  app.get('/api/versions/:projectName/graph', async (req: Request, res: Response) => {
    const projectName = req.params.projectName as string
    if (!projectExists(projectName)) {
      res.status(404).json({ error: 'Project not found' })
      return
    }
    try {
      const graph = await getVersionGraph(projectName)
      res.json(graph)
    } catch (err) {
      res.status(500).json({ error: String(err) })
    }
  })

  // POST /api/versions/:projectName/rollback { hash: string } → { ok: boolean, message: string }
  app.post('/api/versions/:projectName/rollback', async (req: Request, res: Response) => {
    const projectName = req.params.projectName as string
    const { hash } = req.body as { hash?: string }

    if (!projectExists(projectName)) {
      res.status(404).json({ ok: false, message: 'Project not found' })
      return
    }
    if (!hash || typeof hash !== 'string') {
      res.status(400).json({ ok: false, message: 'Missing hash' })
      return
    }
    try {
      const dir = projectDir(projectName)
      await rollbackTo(dir, hash)
      res.json({ ok: true, message: `Restored to ${hash.slice(0, 7)}` })
    } catch (err) {
      res.status(500).json({ ok: false, message: String(err) })
    }
  })
}
