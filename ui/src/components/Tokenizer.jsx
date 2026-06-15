import { useState, useCallback } from 'react'

const COLOR_MAP = {
  code: 'text-blue-400 bg-blue-950/40',
  text: 'text-green-400',
  number: 'text-yellow-400',
  punct: 'text-zinc-500',
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function Tokenizer({ onBack }) {
  const [text, setText] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const localCount = Math.ceil(text.length / 3.5)

  const analyse = useCallback(async () => {
    if (!text.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/tokenize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) throw new Error(`Erreur ${res.status}`)
      const data = await res.json()
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [text])

  const formatUSD = (n) => {
    if (n < 0.0001) return '<$0.0001'
    return `$${n.toFixed(4)}`
  }

  return (
    <div className="min-h-screen bg-bg text-ink p-6 max-w-3xl mx-auto">
      {/* En-tête */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="text-accent-soft hover:text-accent transition-colors text-sm flex items-center gap-1"
        >
          ← Retour
        </button>
        <h1 className="text-xl font-semibold text-ink">Tokeniseur</h1>
      </div>

      {/* Textarea */}
      <div className="relative mb-4">
        <textarea
          className="w-full rows-10 bg-panel border border-edge rounded-lg p-4 text-ink placeholder:text-faint resize-y focus:outline-none focus:border-accent transition-colors font-mono text-sm"
          rows={10}
          placeholder="Collez votre texte ici…"
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setResult(null)
          }}
        />
        <span className="absolute bottom-3 right-3 text-faint text-xs select-none">
          ~{localCount} tokens
        </span>
      </div>

      {/* Bouton analyse */}
      <button
        onClick={analyse}
        disabled={loading || !text.trim()}
        className="mb-6 px-5 py-2 rounded-lg bg-accent text-white font-medium text-sm hover:opacity-90 disabled:opacity-40 transition-opacity"
      >
        Analyser en détail
      </button>

      {/* Loading */}
      {loading && <Spinner />}

      {/* Erreur */}
      {error && (
        <p className="text-err text-sm mb-4">{error}</p>
      )}

      {/* Résultats */}
      {result && !loading && (
        <div className="space-y-6">
          {/* Compteur précis */}
          <p className="text-dim text-sm">
            Estimation précise : <span className="text-ink font-semibold">{result.count}</span> tokens
          </p>

          {/* Texte segmenté */}
          <div>
            <h2 className="text-accent-soft text-xs uppercase tracking-wide mb-2">Segmentation</h2>
            <div className="bg-panel border border-edge rounded-lg p-4 leading-relaxed text-sm font-mono break-all">
              {result.segments.map((seg, i) => (
                <span
                  key={i}
                  className={`${COLOR_MAP[seg.type] || 'text-ink'} ${seg.type === 'code' ? 'rounded px-0.5' : ''}`}
                  title={`${seg.type} · ${seg.tokens} tok`}
                >
                  {seg.text}
                </span>
              ))}
            </div>
            <div className="mt-1 flex gap-4 text-xs text-faint">
              <span><span className="text-blue-400">■</span> code</span>
              <span><span className="text-green-400">■</span> texte</span>
              <span><span className="text-yellow-400">■</span> nombre</span>
              <span><span className="text-zinc-500">■</span> ponctuation</span>
            </div>
          </div>

          {/* Barre de contexte */}
          <div>
            <h2 className="text-accent-soft text-xs uppercase tracking-wide mb-2">Utilisation du contexte</h2>
            <div className="bg-panel border border-edge rounded-lg overflow-hidden h-6 relative">
              <div
                className="h-full bg-accent/60 transition-all duration-500"
                style={{ width: `${Math.min(result.contextPercent, 100)}%` }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-xs text-ink font-medium">
                {result.contextPercent.toFixed(2)}% du contexte 200k
              </span>
            </div>
          </div>

          {/* Tableau coûts */}
          <div>
            <h2 className="text-accent-soft text-xs uppercase tracking-wide mb-2">Estimation des coûts</h2>
            <div className="bg-panel border border-edge rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-edge-soft">
                    <th className="text-left text-dim px-4 py-2 font-medium">Modèle</th>
                    <th className="text-right text-dim px-4 py-2 font-medium">Input</th>
                    <th className="text-right text-dim px-4 py-2 font-medium">Output estimé</th>
                  </tr>
                </thead>
                <tbody>
                  {result.costs.map((c, i) => (
                    <tr key={i} className="border-b border-edge-soft last:border-0 hover:bg-white/5 transition-colors">
                      <td className="px-4 py-2 text-ink">{c.model}</td>
                      <td className="px-4 py-2 text-right text-green-400 font-mono">{formatUSD(c.inputCost)}</td>
                      <td className="px-4 py-2 text-right text-yellow-400 font-mono">{formatUSD(c.outputCostEstimate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-1 text-xs text-faint">Output estimé = même volume que l'input (hypothèse conservative)</p>
          </div>
        </div>
      )}
    </div>
  )
}
