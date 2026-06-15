import type { Express, Request, Response } from 'express'
import fs from 'node:fs'
import path from 'node:path'

const WORKSPACE_DIR = path.join(process.cwd(), '..', 'workspace')

const EXCLUDED_DIRS = new Set(['node_modules', '.mango', 'dist', '.git', '.cache', '.next', '.nuxt'])

// Sous-dossiers de src/ à scanner (relatifs à src/)
const SRC_SUBDIRS = ['components', 'hooks', 'utils', 'services', 'types', 'lib']

// Extensions acceptées
const ACCEPTED_EXT = /\.(jsx|tsx|ts|js)$/
// Fichiers à exclure
const EXCLUDED_FILE = /\.(test|spec)\.(jsx|tsx|ts|js)$|\.d\.ts$/

type FileCategory = 'component' | 'hook' | 'util' | 'service' | 'type' | 'other'

function isExcluded(name: string): boolean {
  return EXCLUDED_DIRS.has(name) || name.startsWith('.')
}

function inferCategory(relPath: string): FileCategory {
  const normalized = relPath.replace(/\\/g, '/')
  const fileName = normalized.split('/').pop() ?? ''

  if (normalized.includes('src/services/')) return 'service'
  if (normalized.includes('src/types/')) return 'type'
  if (normalized.includes('src/hooks/') || fileName.startsWith('use')) return 'hook'
  if (normalized.includes('src/utils/') || normalized.includes('src/lib/')) return 'util'
  if (normalized.includes('src/components/') || /\.(jsx|tsx)$/.test(fileName)) return 'component'
  return 'other'
}

interface SourceFile {
  file: string
  size: number
  preview: string[]
  category: FileCategory
}

export function findSourceFiles(projectPath: string): string[] {
  const results: string[] = []

  // Scanner chaque sous-dossier connu de src/
  for (const subdir of SRC_SUBDIRS) {
    const dirAbs = path.join(projectPath, 'src', subdir)
    if (!fs.existsSync(dirAbs)) continue
    try {
      const entries = fs.readdirSync(dirAbs, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isDirectory()) continue
        if (!ACCEPTED_EXT.test(entry.name)) continue
        if (EXCLUDED_FILE.test(entry.name)) continue
        results.push(path.join('src', subdir, entry.name))
      }
    } catch {
      // ignorer les erreurs de lecture
    }
  }

  // Scanner src/ lui-même (fichiers à la racine)
  const srcDir = path.join(projectPath, 'src')
  if (fs.existsSync(srcDir)) {
    try {
      const entries = fs.readdirSync(srcDir, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isDirectory()) continue
        if (!ACCEPTED_EXT.test(entry.name)) continue
        if (EXCLUDED_FILE.test(entry.name)) continue
        results.push(path.join('src', entry.name))
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

// ── Phase 2 idée #26 — injection prompt multi-projets ───────────────────────

/**
 * Règles injectées dans le system prompt pour que l'agent consulte les fichiers
 * des AUTRES projets du workspace avant de recoder un composant/hook/util.
 *
 * DISTINCTION avec la bibliothèque curée `.components` (idée #36) :
 * - `.components/` = composants VALIDÉS, génériques, extraits manuellement
 *   (bibliothèque curated — voir COMPONENTS_RULES dans components.ts).
 * - La section ci-dessous = scan BRUT de tes autres projets réels `workspace/<projet>/src/…`
 *   Ce sont tes chantiers vivants, non filtrés — une mine d'inspiration et de
 *   code fonctionnel, mais pas encore « promu » en bibliothèque.
 */
export const MULTI_PROJECT_RULES = `
Cross-project source files (your other workspace projects — raw, not curated):
IMPORTANT DISTINCTION — two separate knowledge stores exist:
  1. Curated component library (workspace/.components/) → listed by COMPONENTS_RULES above. These are validated, generic, deliberately extracted components.
  2. Raw project files (below) → source files found in your OTHER real projects (workspace/<project>/src/…). These are living code, project-specific, NOT yet promoted to the library.
Before coding a new component, hook, util or service:
- Check the list of raw project files injected below.
- If a file from another project looks relevant, READ it (workspace/<project>/<path>) to understand its API; then ADAPT or COPY it to the current project — do not recode what already works.
- Mention explicitly what you reused and from which project.
- If the reused code is generic enough (≥ 20 lines, clean props/API, no hard-coded project data), save it to the curated library too (workspace/.components/ per COMPONENTS_RULES).`;

/**
 * Construit la section du system prompt listant les fichiers source des AUTRES
 * projets du workspace (scan brut via findSourceFiles).
 *
 * @param workspaceDir  Chemin absolu du dossier workspace/.
 * @param currentProject Nom du projet courant (basename) — exclu de la liste.
 * @returns Section formatée, ou "" si aucun autre projet ne contient de fichiers.
 */
export function multiProjectPromptSection(workspaceDir: string, currentProject?: string): string {
  if (!fs.existsSync(workspaceDir)) return "";

  let projectDirs: fs.Dirent[];
  try {
    projectDirs = fs.readdirSync(workspaceDir, { withFileTypes: true });
  } catch {
    return "";
  }

  // Constantes de plafonnement pour rester économe en tokens
  const MAX_FILES_PER_PROJECT = 8;
  const MAX_TOTAL = 40;

  const sections: string[] = [];
  let totalCount = 0;

  for (const entry of projectDirs) {
    if (!entry.isDirectory()) continue;
    if (isExcluded(entry.name)) continue;
    if (currentProject && entry.name === currentProject) continue;
    if (totalCount >= MAX_TOTAL) break;

    const projectPath = path.join(workspaceDir, entry.name);
    const allFiles = findSourceFiles(projectPath);

    if (allFiles.length === 0) continue;

    // Prioriser les composants (category === 'component') puis les autres
    const components = allFiles.filter((f) => inferCategory(f) === 'component');
    const others = allFiles.filter((f) => inferCategory(f) !== 'component');
    const ordered = [...components, ...others];

    const available = MAX_TOTAL - totalCount;
    const capped = ordered.slice(0, Math.min(MAX_FILES_PER_PROJECT, available));
    const omitted = ordered.length - capped.length;

    const lines = capped.map((relPath) => {
      const cat = inferCategory(relPath);
      const fwd = relPath.replace(/\\/g, '/');
      return `  - [${cat}] ${entry.name}/${fwd}`;
    });
    if (omitted > 0) {
      lines.push(`  - … et ${omitted} autre${omitted > 1 ? 's' : ''} fichier${omitted > 1 ? 's' : ''}`);
    }

    sections.push(`**${entry.name}** (${allFiles.length} fichier${allFiles.length > 1 ? 's' : ''}):\n${lines.join('\n')}`);
    totalCount += capped.length;
  }

  if (sections.length === 0) return "";

  return (
    `\n\nRaw source files from your other projects (${totalCount} listed` +
    (totalCount === MAX_TOTAL ? `, capped at ${MAX_TOTAL}` : '') +
    `):\n` +
    sections.join('\n')
  );
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
        const fileRelPaths = findSourceFiles(projectPath)

        const components: SourceFile[] = fileRelPaths.map((relPath) => {
          const absPath = path.join(projectPath, relPath)
          let size = 0
          try {
            size = fs.statSync(absPath).size
          } catch {
            // ignorer
          }
          const preview = getPreview(absPath)
          const category = inferCategory(relPath)
          return {
            file: relPath.replace(/\\/g, '/'),
            size,
            preview,
            category,
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
  // Body: { sourceProject, sourceFile, targetProject, targetFile, overwrite? }
  app.post('/api/multi-project/copy', (req: Request, res: Response) => {
    const { sourceProject, sourceFile, targetProject, targetFile, overwrite } = req.body as {
      sourceProject?: string
      sourceFile?: string
      targetProject?: string
      targetFile?: string
      overwrite?: boolean
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

    // Vérifier si la cible existe déjà
    if (fs.existsSync(tgtAbs) && !overwrite) {
      res.status(409).json({ exists: true, error: 'Le fichier cible existe déjà.' })
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
