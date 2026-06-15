import type { Express, Request, Response } from 'express'
import fs from 'node:fs'
import path from 'node:path'

const WORKSPACE_DIR = path.join(process.cwd(), '..', 'workspace')

const EXCLUDED_DIRS = new Set(['node_modules', '.mango', 'dist', '.git', '.cache', '.next', '.nuxt'])

function isExcluded(name: string): boolean {
  return EXCLUDED_DIRS.has(name) || name.startsWith('.')
}

function findComponents(projectPath: string): string[] {
  const results: string[] = []

  // Chercher src/components/*.jsx|tsx
  const srcComponents = path.join(projectPath, 'src', 'components')
  if (fs.existsSync(srcComponents)) {
    try {
      const entries = fs.readdirSync(srcComponents, { withFileTypes: true })
      for (const entry of entries) {
        if (!entry.isDirectory() && /\.(jsx|tsx)$/.test(entry.name)) {
          results.push(path.join('src', 'components', entry.name))
        }
      }
    } catch {
      // ignorer
    }
  }

  // Chercher src/*.jsx (composants à la racine de src)
  const srcDir = path.join(projectPath, 'src')
  if (fs.existsSync(srcDir)) {
    try {
      const entries = fs.readdirSync(srcDir, { withFileTypes: true })
      for (const entry of entries) {
        if (!entry.isDirectory() && /\.(jsx|tsx)$/.test(entry.name)) {
          results.push(path.join('src', entry.name))
        }
      }
    } catch {
      // ignorer
    }
  }

  return results
}

function getPreview(filePath: string): string[] {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    return content.split('\n').slice(0, 3)
  } catch {
    return []
  }
}

export function registerMultiProjectRoutes(app: Express): void {
  // GET /api/multi-project/components
  app.get('/api/multi-project/components', (_req: Request, res: Response) => {
    if (!fs.existsSync(WORKSPACE_DIR)) {
      res.json({ projects: [] })
      return
    }

    let projectDirs: fs.Dirent[]
    try {
      projectDirs = fs.readdirSync(WORKSPACE_DIR, { withFileTypes: true })
    } catch {
      res.json({ projects: [] })
      return
    }

    const projects = projectDirs
      .filter((entry) => entry.isDirectory() && !isExcluded(entry.name))
      .map((entry) => {
        const projectPath = path.join(WORKSPACE_DIR, entry.name)
        const componentRelPaths = findComponents(projectPath)

        const components = componentRelPaths.map((relPath) => {
          const absPath = path.join(projectPath, relPath)
          let size = 0
          try {
            size = fs.statSync(absPath).size
          } catch {
            // ignorer
          }
          const preview = getPreview(absPath)
          return {
            file: relPath.replace(/\\/g, '/'),
            size,
            preview,
          }
        })

        return {
          name: entry.name,
          componentCount: components.length,
          components,
        }
      })
      .filter((p) => p.componentCount > 0)

    res.json({ projects })
  })

  // GET /api/multi-project/file?project=X&file=Y
  app.get('/api/multi-project/file', (req: Request, res: Response) => {
    const { project, file } = req.query as { project?: string; file?: string }

    if (!project?.trim() || !file?.trim()) {
      res.status(400).json({ error: 'project et file sont requis' })
      return
    }

    // Sécurité : éviter path traversal
    const safeProjName = path.basename(project)
    const fileRelative = file.replace(/\\/g, '/').replace(/^\/+/, '')
    if (fileRelative.includes('..')) {
      res.status(400).json({ error: 'Chemin invalide' })
      return
    }

    const absPath = path.join(WORKSPACE_DIR, safeProjName, fileRelative)

    // Vérifier que le chemin reste dans workspace
    if (!absPath.startsWith(WORKSPACE_DIR)) {
      res.status(403).json({ error: 'Accès refusé' })
      return
    }

    if (!fs.existsSync(absPath)) {
      res.status(404).json({ error: 'Fichier introuvable' })
      return
    }

    try {
      const content = fs.readFileSync(absPath, 'utf-8')
      res.json({ content })
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) })
    }
  })

  // POST /api/multi-project/copy
  // Body: { sourceProject, sourceFile, targetProject, targetFile }
  app.post('/api/multi-project/copy', (req: Request, res: Response) => {
    const { sourceProject, sourceFile, targetProject, targetFile } = req.body as {
      sourceProject?: string
      sourceFile?: string
      targetProject?: string
      targetFile?: string
    }

    if (!sourceProject?.trim() || !sourceFile?.trim() || !targetProject?.trim() || !targetFile?.trim()) {
      res.status(400).json({ error: 'sourceProject, sourceFile, targetProject et targetFile sont requis' })
      return
    }

    const srcFileRel = sourceFile.replace(/\\/g, '/').replace(/^\/+/, '')
    const tgtFileRel = targetFile.replace(/\\/g, '/').replace(/^\/+/, '')

    if (srcFileRel.includes('..') || tgtFileRel.includes('..')) {
      res.status(400).json({ error: 'Chemin invalide' })
      return
    }

    const srcProjSafe = path.basename(sourceProject)
    const tgtProjSafe = path.basename(targetProject)

    const srcAbs = path.join(WORKSPACE_DIR, srcProjSafe, srcFileRel)
    const tgtAbs = path.join(WORKSPACE_DIR, tgtProjSafe, tgtFileRel)

    if (!srcAbs.startsWith(WORKSPACE_DIR) || !tgtAbs.startsWith(WORKSPACE_DIR)) {
      res.status(403).json({ error: 'Accès refusé' })
      return
    }

    if (!fs.existsSync(srcAbs)) {
      res.status(404).json({ error: 'Fichier source introuvable' })
      return
    }

    try {
      // Créer le dossier cible si manquant
      const tgtDir = path.dirname(tgtAbs)
      fs.mkdirSync(tgtDir, { recursive: true })

      // Copier le fichier
      fs.copyFileSync(srcAbs, tgtAbs)

      res.json({ ok: true, target: tgtAbs })
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) })
    }
  })
}
