// MangoOS Kernel — Backend SQLite du Blackboard (persistance disque réelle).
//
// Utilise `node:sqlite`, le module SQLite INTÉGRÉ au runtime Node (≥ 22.5, stable
// en 25) : aucune dépendance native, aucun node-gyp, aucun risque de build sur
// Windows — fidèle au principe local-first « ça marche toujours ». Les artefacts
// (valeur JSON + embedding optionnel) survivent au redémarrage du serveur.
//
// Le « vec » de SQLite-vec : les embeddings sont rangés en colonne et la recherche
// se fait par COSINUS en JS (rankByCosine) — proven, déterministe, sans extension.
// L'extension native sqlite-vec (index ANN) pourra se brancher sur la MÊME table
// plus tard pour accélérer `search` à grande échelle, sans changer l'interface.
import { DatabaseSync } from 'node:sqlite'
import { rankByCosine, type BlackboardStore, type SearchHit } from './kernel-blackboard-store.js'

export class SqliteStore implements BlackboardStore {
  private db: DatabaseSync

  constructor(dbPath: string) {
    this.db = new DatabaseSync(dbPath)
    // WAL : lectures concurrentes pendant une écriture (serveur long-running).
    this.db.exec('PRAGMA journal_mode = WAL')
    this.db.exec(
      `CREATE TABLE IF NOT EXISTS artifacts (
         scope     TEXT NOT NULL,
         key       TEXT NOT NULL,
         value     TEXT NOT NULL,
         embedding TEXT,
         PRIMARY KEY (scope, key)
       )`,
    )
  }

  put(scope: string, key: string, value: unknown, embedding?: number[]): void {
    this.db
      .prepare(
        `INSERT INTO artifacts (scope, key, value, embedding) VALUES (?, ?, ?, ?)
         ON CONFLICT(scope, key) DO UPDATE SET value = excluded.value, embedding = excluded.embedding`,
      )
      .run(scope, key, JSON.stringify(value ?? null), embedding ? JSON.stringify(embedding) : null)
  }

  get(scope: string, key: string): unknown | undefined {
    const row = this.db.prepare('SELECT value FROM artifacts WHERE scope = ? AND key = ?').get(scope, key) as
      | { value: string }
      | undefined
    if (!row) return undefined
    try {
      return JSON.parse(row.value)
    } catch {
      return undefined
    }
  }

  has(scope: string, key: string): boolean {
    const row = this.db.prepare('SELECT 1 FROM artifacts WHERE scope = ? AND key = ? LIMIT 1').get(scope, key)
    return row !== undefined
  }

  delete(scope: string, key: string): boolean {
    const info = this.db.prepare('DELETE FROM artifacts WHERE scope = ? AND key = ?').run(scope, key)
    return Number(info.changes) > 0
  }

  keys(scope: string): string[] {
    const rows = this.db.prepare('SELECT key FROM artifacts WHERE scope = ?').all(scope) as Array<{ key: string }>
    return rows.map((r) => r.key)
  }

  search(scope: string, queryEmbedding: number[], k: number): SearchHit[] {
    const rows = this.db
      .prepare('SELECT key, value, embedding FROM artifacts WHERE scope = ? AND embedding IS NOT NULL')
      .all(scope) as Array<{ key: string; value: string; embedding: string }>
    const entries = rows.map((r) => ({
      key: r.key,
      value: safeParse(r.value),
      embedding: safeParse(r.embedding) as number[] | undefined,
    }))
    return rankByCosine(entries, queryEmbedding, k)
  }

  close(): void {
    try {
      this.db.close()
    } catch {
      /* déjà fermée */
    }
  }
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s)
  } catch {
    return undefined
  }
}
