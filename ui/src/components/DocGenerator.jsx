import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'

export default function DocGenerator({ onBack }) {
  const [projects, setProjects] = useState([])
  const [selected, setSelected] = useState('')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState([])
  const [doc, setDoc] = useState(null)
  const [existingDoc, setExistingDoc] = useState(null)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch('/api/projects')
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : (data.projects ?? [])
        setProjects(list)
        if (list.length > 0) setSelected(list[0])
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!selected) return
    setExistingDoc(null)
    fetch(`/api/docs/${encodeURIComponent(selected)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.content) setExistingDoc(data.content)
      })
      .catch(() => {})
  }, [selected])

  const generate = async () => {
    if (!selected || loading) return
    setLoading(true)
    setProgress([])
    setDoc(null)
    setError(null)

    try {
      const res = await fetch('/api/docs/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectName: selected }),
      })

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop() ?? ''
        for (const part of parts) {
          const line = part.replace(/^data:\s*/, '')
          if (!line) continue
          try {
            const evt = JSON.parse(line)
            if (evt.type === 'progress') {
              setProgress((p) => [...p, evt.text])
            } else if (evt.type === 'done') {
              // reload doc
              const docRes = await fetch(`/api/docs/${encodeURIComponent(selected)}`)
              if (docRes.ok) {
                const data = await docRes.json()
                setDoc(data.content)
                setExistingDoc(data.content)
              }
            } else if (evt.type === 'error') {
              setError(evt.text)
            }
          } catch {
            // skip malformed event
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = () => {
    const content = doc ?? existingDoc
    if (!content) return
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const download = () => {
    const content = doc ?? existingDoc
    if (!content) return
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selected}-DOCUMENTATION.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const displayDoc = doc ?? null

  return (
    <div className="flex flex-col h-full bg-bg text-ink">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-edge">
        <button
          onClick={onBack}
          className="text-accent-soft hover:text-accent text-sm transition-colors"
        >
          ← Retour
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-accent">Documentation auto</h1>
          <p className="text-xs text-dim mt-0.5">
            Génère la doc technique de ton projet en un clic
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        {/* Project selector */}
        <div className="flex flex-col gap-2">
          <label className="text-sm text-accent-soft font-medium">Projet</label>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            disabled={loading}
            className="bg-panel border border-edge rounded-lg px-3 py-2 text-ink text-sm focus:outline-none focus:border-accent disabled:opacity-50"
          >
            {projects.length === 0 && (
              <option value="">Aucun projet trouvé</option>
            )}
            {projects.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        {/* Existing doc notice */}
        {existingDoc && !displayDoc && (
          <div className="flex items-center justify-between bg-panel border border-edge-soft rounded-lg px-4 py-3">
            <span className="text-sm text-accent-soft">Documentation existante disponible</span>
            <button
              onClick={() => setDoc(existingDoc)}
              className="text-sm text-accent hover:underline"
            >
              Voir la doc existante
            </button>
          </div>
        )}

        {/* Generate button */}
        <button
          onClick={generate}
          disabled={loading || !selected}
          className="w-full py-2.5 rounded-lg bg-accent text-bg font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          {loading ? 'Génération en cours...' : 'Générer la documentation'}
        </button>

        {/* Progress */}
        {loading && (
          <div className="space-y-2">
            <div className="h-1.5 w-full bg-panel rounded-full overflow-hidden">
              <div className="h-full bg-accent rounded-full animate-pulse w-3/4" />
            </div>
            <ul className="space-y-1">
              {progress.map((msg, i) => (
                <li key={i} className="text-xs text-dim flex items-start gap-2">
                  <span className="text-accent mt-0.5">›</span>
                  {msg}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-panel border border-err rounded-lg px-4 py-3 text-err text-sm">
            {error}
          </div>
        )}

        {/* Documentation result */}
        {displayDoc && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-accent-soft">Documentation générée</span>
              <div className="flex gap-2">
                <button
                  onClick={copyToClipboard}
                  className="text-xs px-3 py-1.5 rounded-md border border-edge text-accent-soft hover:text-accent hover:border-accent transition-colors"
                >
                  {copied ? 'Copié !' : 'Copier'}
                </button>
                <button
                  onClick={download}
                  className="text-xs px-3 py-1.5 rounded-md border border-edge text-accent-soft hover:text-accent hover:border-accent transition-colors"
                >
                  Télécharger
                </button>
              </div>
            </div>
            <div className="bg-panel border border-edge rounded-lg p-5 prose prose-invert prose-sm max-w-none text-ink">
              <ReactMarkdown>{displayDoc}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
