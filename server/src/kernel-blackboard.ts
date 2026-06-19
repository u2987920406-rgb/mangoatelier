// MangoOS Kernel — Blackboard (pilier 3, cf. fondation.md).
//
// L'état partagé du Kernel, gardé par MangoOS. Deux rôles :
//
//   1. VERROUS (mutex par ressource) — résout le problème #2 (cohérence d'état).
//      Quand deux agents veulent toucher le même projet, MangoOS sérialise :
//      le second attend que le premier ait fini son commit. Strictement FIFO.
//
//   2. STORE d'artefacts — les agents ne s'échangent pas de données lourdes via
//      le Bus ; ils les déposent ici et passent une RÉFÉRENCE (le `file_pointer`
//      de l'Enveloppe). Pour l'instant en mémoire ; la persistance disque +
//      la recherche sémantique (SQLite-vec) viendront quand le besoin arrivera.
//
// Tout est déterministe et testable sans réseau ni I/O.

/** Pointeur logique vers une valeur du store (l'analogue du file_pointer). */
export interface BlackboardRef {
  scope: string
  key: string
}

export class Blackboard {
  // Verrous : une chaîne de promesses par ressource garantit l'ordre FIFO.
  private tails = new Map<string, Promise<void>>()
  // Store : scope (ex. projectId) → (clé → valeur).
  private store = new Map<string, Map<string, unknown>>()

  // ── Verrous ────────────────────────────────────────────────────────────────
  /** Acquiert le verrou d'une ressource. Renvoie la fonction de libération.
   * Les acquisitions concurrentes sur la même ressource sont sérialisées FIFO. */
  async acquire(resource: string): Promise<() => void> {
    const previous = this.tails.get(resource) ?? Promise.resolve()
    let release!: () => void
    const done = new Promise<void>((resolve) => {
      release = resolve
    })
    const tail = previous.then(() => done)
    this.tails.set(resource, tail)
    await previous // attend que le détenteur précédent libère
    let released = false
    return () => {
      if (released) return
      released = true
      release()
      // Nettoyage : si personne ne s'est enchaîné après nous, on retire l'entrée.
      if (this.tails.get(resource) === tail) this.tails.delete(resource)
    }
  }

  /** Exécute `fn` sous verrou — libère TOUJOURS, même si `fn` lève. */
  async withLock<T>(resource: string, fn: () => Promise<T> | T): Promise<T> {
    const release = await this.acquire(resource)
    try {
      return await fn()
    } finally {
      release()
    }
  }

  /** Y a-t-il un verrou en cours sur cette ressource ? (diagnostic/test). */
  isLocked(resource: string): boolean {
    return this.tails.has(resource)
  }

  // ── Store d'artefacts ────────────────────────────────────────────────────────
  /** Dépose une valeur et renvoie sa référence (à passer dans une enveloppe). */
  put<T>(scope: string, key: string, value: T): BlackboardRef {
    let bucket = this.store.get(scope)
    if (!bucket) {
      bucket = new Map<string, unknown>()
      this.store.set(scope, bucket)
    }
    bucket.set(key, value)
    return { scope, key }
  }

  /** Lit une valeur (undefined si absente). */
  get<T>(scope: string, key: string): T | undefined {
    return this.store.get(scope)?.get(key) as T | undefined
  }

  /** Résout une référence vers sa valeur. */
  deref<T>(ref: BlackboardRef): T | undefined {
    return this.get<T>(ref.scope, ref.key)
  }

  has(scope: string, key: string): boolean {
    return this.store.get(scope)?.has(key) ?? false
  }

  delete(scope: string, key: string): boolean {
    const bucket = this.store.get(scope)
    if (!bucket) return false
    const had = bucket.delete(key)
    if (bucket.size === 0) this.store.delete(scope)
    return had
  }

  /** Clés présentes dans un scope (ex. tous les artefacts d'un projet). */
  keys(scope: string): string[] {
    return [...(this.store.get(scope)?.keys() ?? [])]
  }
}

// ── Blackboard par défaut du Kernel (singleton) ──────────────────────────────
let current: Blackboard | null = null

export function getBlackboard(): Blackboard {
  if (current === null) current = new Blackboard()
  return current
}

export function setBlackboard(bb: Blackboard): void {
  current = bb
}

export function resetBlackboard(): void {
  current = null
}
