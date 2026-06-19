// Intégration Mango QA — côté MangoOS.
// Émet un signal phase-complete.json après chaque commit de phase,
// puis attend le verdict de Mango QA (audit-verdict.json).
// Si Mango QA n'est pas lancé, MangoOS continue immédiatement (fail open).
import fs from 'node:fs'
import path from 'node:path'
import { WORKSPACE_DIR } from './projects.js'

const QA_DIR = '.mangoqa'
const VERDICT_TIMEOUT = parseInt(process.env.QA_VERDICT_TIMEOUT ?? '60000', 10)
const POLL_INTERVAL = 800
const SENTINEL_MAX_AGE_MS = 300_000 // stale après 5 min — le runner met à jour toutes les 10 s mais l'event loop Windows peut être lente

// Détecte si le runner Mango QA est actif en lisant la sentinelle heartbeat.
// Retourne true uniquement si le fichier existe ET date de moins de 30 s.
export function isMangoQaActive(): boolean {
  // Surcharge manuelle via .env (permet de forcer ON ou OFF)
  if (process.env.MANGOQA_ENABLED === 'false') return false
  if (process.env.MANGOQA_ENABLED === 'true') return true
  // Détection automatique par sentinelle
  const sentinel = path.join(WORKSPACE_DIR, '.mangoqa-active')
  if (!fs.existsSync(sentinel)) return false
  try {
    const data = JSON.parse(fs.readFileSync(sentinel, 'utf8')) as { heartbeat?: string }
    if (!data.heartbeat) return false
    return Date.now() - new Date(data.heartbeat).getTime() < SENTINEL_MAX_AGE_MS
  } catch {
    return false
  }
}

export interface QAVerdict {
  verdict: 'green' | 'red'
  rejection: {
    rejection_id: string
    corrective_action: string
    rule_ref: string
    branch: string
    retry_count: number
  } | null
  branches: Record<string, { status: string; summary: string }>
}

function projectDir(projectName: string): string {
  const safe = projectName.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase()
  return path.join(WORKSPACE_DIR, safe)
}

function qaDir(projDir: string): string {
  return path.join(projDir, QA_DIR)
}

// Émet le signal pour que Mango QA démarre l'audit.
export function emitPhaseComplete(
  projectName: string,
  phase: string,
  changedFiles: string[],
  retryCount = 0,
): void {
  const projDir = projectDir(projectName)
  const dir = qaDir(projDir)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  const signal = {
    projectName,
    phase,
    timestamp: new Date().toISOString(),
    projectDir: projDir,
    changedFiles,
    retryCount,
  }
  // Supprime l'ancien verdict avant d'émettre le nouveau signal
  const verdictFile = path.join(dir, 'audit-verdict.json')
  if (fs.existsSync(verdictFile)) fs.unlinkSync(verdictFile)
  fs.writeFileSync(path.join(dir, 'phase-complete.json'), JSON.stringify(signal, null, 2), 'utf8')
}

// Attend le verdict de Mango QA. Renvoie null si timeout (Mango QA non lancé).
export async function waitForVerdict(projectName: string): Promise<QAVerdict | null> {
  const projDir = projectDir(projectName)
  const verdictFile = path.join(qaDir(projDir), 'audit-verdict.json')
  const deadline = Date.now() + VERDICT_TIMEOUT

  while (Date.now() < deadline) {
    if (fs.existsSync(verdictFile)) {
      try {
        const raw = fs.readFileSync(verdictFile, 'utf8')
        return JSON.parse(raw) as QAVerdict
      } catch {
        return null
      }
    }
    await new Promise(r => setTimeout(r, POLL_INTERVAL))
  }
  return null // timeout — Mango QA non lancé ou trop lent
}

// Construit le message de rejet injecté dans le chat MangoOS.
export function buildRejectionMessage(verdict: QAVerdict): string {
  if (!verdict.rejection) return ''
  const r = verdict.rejection
  return `🔴 **Mango QA — Feu Rouge** (branche: ${r.branch})

**Problème détecté :** ${r.rejection_id}
**Action requise :** ${r.corrective_action}
**Règle :** \`${r.rule_ref}\`

Corrige ce point avant de continuer. MangoOS relancera l'audit automatiquement.`
}
