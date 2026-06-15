import { useEffect, useState, useCallback } from 'react'

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "à l'instant"
  if (minutes < 60) return `il y a ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `il y a ${hours} h`
  const days = Math.floor(hours / 24)
  return `il y a ${days} j`
}

function SkeletonCard() {
  return (
    <div className="flex gap-4 animate-pulse">
      <div className="flex flex-col items-center">
        <div className="w-4 h-4 rounded-full bg-edge mt-1 shrink-0" />
        <div className="w-px flex-1 bg-edge mt-1" />
      </div>
      <div className="flex-1 mb-6 pb-4">
        <div className="h-4 bg-panel rounded w-1/3 mb-2" />
        <div className="h-3 bg-panel rounded w-2/3 mb-2" />
        <div className="h-3 bg-panel rounded w-1/4" />
      </div>
    </div>
  )
}

export default function VersionGraph({ projectName, onBack }) {
  const [versions, setVersions] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [rollingBack, setRollingBack] = useState(null)

  const showToast = useCallback((msg, isError = false) => {
    setToast({ msg, isError })
    setTimeout(() => setToast(null), 4000)
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`/api/versions/${encodeURIComponent(projectName)}/graph`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          setVersions(Array.isArray(data) ? data : [])
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [projectName])

  async function handleRollback(hash, shortHash) {
    const confirmed = window.confirm(
      `Restaurer vers cette version ? Les fichiers actuels seront remplacés.`
    )
    if (!confirmed) return
    setRollingBack(hash)
    try {
      const res = await fetch(
        `/api/versions/${encodeURIComponent(projectName)}/rollback`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hash }),
        }
      )
      const data = await res.json()
      if (data.ok) {
        showToast(`Version ${shortHash} restaurée avec succès.`)
        // Refresh list
        const r2 = await fetch(`/api/versions/${encodeURIComponent(projectName)}/graph`)
        const updated = await r2.json()
        setVersions(Array.isArray(updated) ? updated : [])
      } else {
        showToast(data.message || 'Erreur lors de la restauration.', true)
      }
    } catch (err) {
      showToast('Erreur réseau.', true)
    } finally {
      setRollingBack(null)
    }
  }

  return (
    <div className="flex flex-col h-full bg-bg text-ink">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-edge shrink-0">
        <button
          onClick={onBack}
          className="text-accent-soft hover:text-accent transition-colors text-sm flex items-center gap-1"
        >
          ← Retour
        </button>
        <span className="text-faint">|</span>
        <h1 className="text-sm font-semibold text-ink truncate">
          Historique de versions —{' '}
          <span className="text-accent">{projectName}</span>
        </h1>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`mx-5 mt-4 px-4 py-2 rounded text-sm font-medium shrink-0 ${
            toast.isError
              ? 'bg-err/20 text-err border border-err/40'
              : 'bg-accent/15 text-accent border border-accent/30'
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-6">
        {loading ? (
          <div className="space-y-0">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : versions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <div className="text-4xl mb-3 opacity-30">🕐</div>
            <p className="text-dim text-sm leading-relaxed max-w-xs">
              Aucune version sauvegardée — l'agent sauvegarde automatiquement
              après chaque modification.
            </p>
          </div>
        ) : (
          <div>
            {versions.map((v, idx) => {
              const isLast = idx === versions.length - 1
              const isCurrent = v.isCurrent
              const isRollingBackThis = rollingBack === v.hash

              return (
                <div key={v.hash} className="flex gap-4">
                  {/* Timeline spine */}
                  <div className="flex flex-col items-center shrink-0">
                    <div
                      className={`w-3.5 h-3.5 rounded-full mt-1.5 border-2 shrink-0 ${
                        isCurrent
                          ? 'bg-green-500 border-green-400'
                          : 'bg-accent border-accent/60'
                      }`}
                    />
                    {!isLast && (
                      <div className="w-px flex-1 bg-edge-soft mt-1" />
                    )}
                  </div>

                  {/* Card */}
                  <div
                    className={`flex-1 mb-5 pb-4 group rounded-lg border px-4 py-3 transition-colors cursor-default ${
                      isCurrent
                        ? 'border-green-500/40 bg-green-500/5'
                        : 'border-edge hover:border-edge-soft hover:bg-panel/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <code className="font-mono text-xs text-accent-soft bg-panel px-1.5 py-0.5 rounded">
                          {v.shortHash}
                        </code>
                        {isCurrent && (
                          <span className="text-xs font-bold text-green-400 bg-green-500/15 px-2 py-0.5 rounded border border-green-500/30 tracking-wide">
                            COURANTE
                          </span>
                        )}
                      </div>
                      <span className="text-faint text-xs shrink-0">
                        {timeAgo(v.date)}
                      </span>
                    </div>

                    <p className="text-sm text-ink mt-1.5 leading-snug">
                      {v.message || '(sans message)'}
                    </p>

                    <div className="flex items-center gap-3 mt-2 text-xs text-dim flex-wrap">
                      <span>{v.author}</span>
                      {v.filesChanged > 0 && (
                        <span>{v.filesChanged} fichier{v.filesChanged > 1 ? 's' : ''}</span>
                      )}
                    </div>

                    {!isCurrent && (
                      <button
                        disabled={!!rollingBack}
                        onClick={() => handleRollback(v.hash, v.shortHash)}
                        className="mt-3 text-xs text-accent-soft hover:text-accent border border-edge hover:border-accent/50 px-3 py-1 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {isRollingBackThis ? 'Restauration…' : 'Restaurer cette version'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
