import { useState, useEffect } from 'react'

function ScoreGauge({ score }) {
  const color =
    score > 80 ? 'text-green-400' : score > 60 ? 'text-orange-400' : 'text-red-400'
  const barColor =
    score > 80 ? 'bg-green-400' : score > 60 ? 'bg-orange-400' : 'bg-red-400'

  return (
    <div className="flex flex-col items-center gap-2 py-4">
      <span className={`text-7xl font-bold tabular-nums ${color}`}>{score}</span>
      <span className="text-text-dim text-sm">/ 100</span>
      <div className="w-full max-w-xs h-2 rounded-full bg-bg-bg mt-2 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  )
}

function SeverityBadge({ severity }) {
  const map = {
    critical: 'bg-red-900/60 text-red-300 border border-red-700',
    warning: 'bg-orange-900/60 text-orange-300 border border-orange-700',
    info: 'bg-blue-900/60 text-blue-300 border border-blue-700',
  }
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold uppercase ${map[severity] ?? map.info}`}>
      {severity}
    </span>
  )
}

function IssueList({ issues }) {
  if (!issues || issues.length === 0) return (
    <p className="text-text-faint text-sm italic">Aucun problème détecté.</p>
  )

  const sorted = [...issues].sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 }
    return (order[a.severity] ?? 2) - (order[b.severity] ?? 2)
  })

  return (
    <ul className="space-y-2">
      {sorted.map((issue, i) => (
        <li key={i} className="flex flex-col gap-1 p-3 rounded-lg bg-bg-bg border border-edge-soft">
          <div className="flex items-center gap-2">
            <SeverityBadge severity={issue.severity} />
            <span className="font-mono text-xs text-text-dim truncate">{issue.file}</span>
          </div>
          <p className="text-sm text-text-accent-soft">{issue.description}</p>
        </li>
      ))}
    </ul>
  )
}

function HistoryBar({ result, maxScore }) {
  const color =
    result.score > 80 ? 'bg-green-400' : result.score > 60 ? 'bg-orange-400' : 'bg-red-400'
  const date = new Date(result.timestamp)
  const label = date.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-text-faint w-32 shrink-0 text-xs">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-bg-bg overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${result.score}%` }}
        />
      </div>
      <span className={`w-8 text-right font-semibold tabular-nums ${
        result.score > 80 ? 'text-green-400' : result.score > 60 ? 'text-orange-400' : 'text-red-400'
      }`}>{result.score}</span>
    </div>
  )
}

function timeAgo(isoTimestamp) {
  const diff = Date.now() - new Date(isoTimestamp).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return "à l'instant"
  if (minutes < 60) return `il y a ${minutes} minute${minutes > 1 ? 's' : ''}`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `il y a ${hours} heure${hours > 1 ? 's' : ''}`
  const days = Math.floor(hours / 24)
  return `il y a ${days} jour${days > 1 ? 's' : ''}`
}

export default function QAPanel({ projectName: initialProject, onBack }) {
  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState(initialProject || '')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!initialProject) {
      fetch('/api/projects')
        .then(r => r.json())
        .then(data => setProjects(Array.isArray(data) ? data : (data.projects ?? [])))
        .catch(() => {})
    }
  }, [initialProject])

  useEffect(() => {
    if (selectedProject) {
      fetch(`/api/qa/history/${encodeURIComponent(selectedProject)}`)
        .then(r => r.json())
        .then(data => setHistory(Array.isArray(data) ? data : []))
        .catch(() => setHistory([]))
    }
  }, [selectedProject])

  async function handleRun() {
    if (!selectedProject) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const resp = await fetch('/api/qa/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectName: selectedProject }),
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error || 'Erreur serveur')
      setResult(data)
      // Refresh history
      const histResp = await fetch(`/api/qa/history/${encodeURIComponent(selectedProject)}`)
      const histData = await histResp.json()
      setHistory(Array.isArray(histData) ? histData : [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full text-text-accent">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-edge shrink-0">
        {onBack && (
          <button
            onClick={onBack}
            className="text-text-dim hover:text-text-accent transition-colors text-sm"
          >
            ← Retour
          </button>
        )}
        <div>
          <h1 className="text-lg font-semibold">Agent QA</h1>
          <p className="text-text-dim text-xs">Analyse automatique de la qualité du code</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        {/* Project selector */}
        {!initialProject && (
          <div className="space-y-2">
            <label className="text-sm text-text-dim">Projet à analyser</label>
            <select
              value={selectedProject}
              onChange={e => { setSelectedProject(e.target.value); setResult(null); setError(null) }}
              className="w-full bg-bg-panel border border-edge rounded-lg px-3 py-2 text-text-accent text-sm focus:outline-none focus:border-text-accent"
            >
              <option value="">— Sélectionner un projet —</option>
              {projects.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        )}

        {initialProject && (
          <div className="text-sm text-text-dim">
            Projet : <span className="text-text-accent font-medium">{initialProject}</span>
          </div>
        )}

        {/* Run button */}
        <button
          onClick={handleRun}
          disabled={loading || !selectedProject}
          className="w-full py-3 rounded-xl font-semibold text-sm transition-all
            bg-text-accent text-bg-bg hover:opacity-90 active:scale-95
            disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-bg-bg border-t-transparent rounded-full animate-spin" />
              Analyse en cours…
            </>
          ) : (
            'Lancer l\'analyse QA'
          )}
        </button>

        {loading && (
          <p className="text-center text-text-faint text-xs animate-pulse">
            L'analyse peut prendre 20-30 secondes…
          </p>
        )}

        {/* Error */}
        {error && (
          <div className="p-3 rounded-lg bg-red-900/30 border border-red-700 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="space-y-4">
            <div className="bg-bg-panel border border-edge rounded-xl p-4">
              <ScoreGauge score={result.score} />
            </div>

            {/* Strengths */}
            {result.strengths && result.strengths.length > 0 && (
              <div className="bg-bg-panel border border-edge rounded-xl p-4 space-y-2">
                <h3 className="text-sm font-semibold text-green-400">Points forts</h3>
                <ul className="space-y-1">
                  {result.strengths.map((s, i) => (
                    <li key={i} className="text-sm text-text-accent-soft flex gap-2">
                      <span className="text-green-400 shrink-0">✓</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Issues */}
            {result.issues && result.issues.length > 0 && (
              <div className="bg-bg-panel border border-edge rounded-xl p-4 space-y-2">
                <h3 className="text-sm font-semibold text-orange-400">Avertissements</h3>
                <IssueList issues={result.issues} />
              </div>
            )}

            {/* Suggestions */}
            {result.suggestions && result.suggestions.length > 0 && (
              <div className="bg-bg-panel border border-edge rounded-xl p-4 space-y-2">
                <h3 className="text-sm font-semibold text-blue-400">Suggestions</h3>
                <ul className="space-y-1">
                  {result.suggestions.map((s, i) => (
                    <li key={i} className="text-sm text-text-accent-soft flex gap-2">
                      <span className="text-blue-400 shrink-0">→</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div className="bg-bg-panel border border-edge rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text-accent">Historique des scores</h3>
              <span className="text-xs text-text-faint">
                Dernière analyse : {timeAgo(history[0].timestamp)}
              </span>
            </div>
            <div className="space-y-2">
              {history.map((h, i) => (
                <HistoryBar key={i} result={h} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
