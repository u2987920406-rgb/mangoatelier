import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, Sparkles, Loader2, Copy, Check, Trash2, Tag, Wrench, MessageSquare, ChevronDown, ChevronUp, Bot } from 'lucide-react'

export default function SuperAgentBuilder({ onBack }) {
  const [domain, setDomain] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [agents, setAgents] = useState([])
  const [toast, setToast] = useState(null)
  const [expandedPrompt, setExpandedPrompt] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const showToast = useCallback((msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2200)
  }, [])

  const copyToClipboard = useCallback(async (text, label = 'Copié') => {
    try {
      await navigator.clipboard.writeText(text)
      showToast(label)
    } catch {
      showToast('Erreur copie')
    }
  }, [showToast])

  const fetchAgents = useCallback(async () => {
    try {
      const r = await fetch('/api/super-agent/list')
      const data = await r.json()
      setAgents(data.agents ?? [])
    } catch {
      // silencieux
    }
  }, [])

  useEffect(() => {
    fetchAgents()
  }, [fetchAgents])

  const handleBuild = async () => {
    if (!domain.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const r = await fetch('/api/super-agent/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: domain.trim(), description: description.trim() }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error ?? 'Erreur serveur')
      setResult(data.agent)
      await fetchAgents()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    setDeletingId(id)
    try {
      await fetch(`/api/super-agent/${id}`, { method: 'DELETE' })
      await fetchAgents()
      if (result?.id === id) setResult(null)
      showToast('Agent supprimé')
    } catch {
      showToast('Erreur suppression')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-bg text-ink font-mono">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-accent-soft text-bg px-4 py-2 rounded-lg shadow-lg text-sm animate-fade-in flex items-center gap-2">
          <Check size={14} />
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-40 bg-panel border-b border-edge px-4 py-3 flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-dim hover:text-ink transition-colors text-sm"
        >
          <ArrowLeft size={16} />
          Retour
        </button>
        <div className="w-px h-4 bg-edge" />
        <Bot size={18} className="text-accent-soft" />
        <h1 className="text-sm font-semibold text-ink">Super-agent spécialisé</h1>
        <span className="ml-auto text-xs text-faint">#40</span>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-10">

        {/* ── Section Créer ──────────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={16} className="text-accent-soft" />
            <h2 className="text-sm font-semibold text-ink uppercase tracking-wider">Créer un agent</h2>
          </div>

          <div className="bg-panel border border-edge rounded-xl p-5 space-y-4">
            <div>
              <label className="block text-xs text-dim mb-1.5">Domaine / expertise</label>
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !loading && handleBuild()}
                placeholder="ex: avocat spécialisé en droit du travail"
                className="w-full bg-bg border border-edge rounded-lg px-3 py-2.5 text-sm text-ink placeholder-faint focus:outline-none focus:border-accent-soft transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs text-dim mb-1.5">Description optionnelle</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Contexte, contraintes, style souhaité…"
                rows={3}
                className="w-full bg-bg border border-edge rounded-lg px-3 py-2.5 text-sm text-ink placeholder-faint focus:outline-none focus:border-accent-soft transition-colors resize-none"
              />
            </div>

            {error && (
              <div className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              onClick={handleBuild}
              disabled={loading || !domain.trim()}
              className="w-full flex items-center justify-center gap-2 bg-accent-soft text-bg font-semibold text-sm py-2.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Génération en cours…
                </>
              ) : (
                <>
                  <Sparkles size={15} />
                  Générer l'agent
                </>
              )}
            </button>
          </div>
        </section>

        {/* ── Résultat ──────────────────────────────────────────────────────── */}
        {result && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Bot size={16} className="text-accent-soft" />
              <h2 className="text-sm font-semibold text-ink uppercase tracking-wider">Agent généré</h2>
            </div>
            <AgentCard agent={result} onCopy={copyToClipboard} expandedPrompt={expandedPrompt} setExpandedPrompt={setExpandedPrompt} onDelete={handleDelete} deletingId={deletingId} highlight />
          </section>
        )}

        {/* ── Mes agents ────────────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Bot size={16} className="text-dim" />
            <h2 className="text-sm font-semibold text-ink uppercase tracking-wider">Mes agents</h2>
            <span className="ml-auto text-xs text-faint">{agents.length} agent{agents.length !== 1 ? 's' : ''}</span>
          </div>

          {agents.length === 0 ? (
            <div className="bg-panel border border-edge rounded-xl p-8 text-center text-faint text-sm">
              Aucun agent sauvegardé. Générez votre premier agent ci-dessus.
            </div>
          ) : (
            <div className="space-y-4">
              {[...agents].reverse().map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  onCopy={copyToClipboard}
                  expandedPrompt={expandedPrompt}
                  setExpandedPrompt={setExpandedPrompt}
                  onDelete={handleDelete}
                  deletingId={deletingId}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

// ── Composant AgentCard ──────────────────────────────────────────────────────

function AgentCard({ agent, onCopy, expandedPrompt, setExpandedPrompt, onDelete, deletingId, highlight = false }) {
  const [copiedExample, setCopiedExample] = useState(null)
  const isExpanded = expandedPrompt === agent.id

  const handleCopyExample = async (text, idx) => {
    await onCopy(text, 'Prompt copié !')
    setCopiedExample(idx)
    setTimeout(() => setCopiedExample(null), 1800)
  }

  return (
    <div className={`bg-panel border rounded-xl overflow-hidden transition-all ${highlight ? 'border-accent-soft shadow-lg shadow-accent-soft/10' : 'border-edge'}`}>
      {/* En-tête de la card */}
      <div className="px-5 py-4 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-ink">{agent.name}</h3>
            {highlight && <span className="text-xs bg-accent-soft/20 text-accent-soft px-2 py-0.5 rounded-full">Nouveau</span>}
          </div>
          <p className="text-xs text-faint mt-0.5">{agent.domain}</p>
          {agent.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {agent.tags.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 text-xs bg-bg border border-edge text-dim px-2 py-0.5 rounded-full">
                  <Tag size={9} />
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() => onDelete(agent.id)}
          disabled={deletingId === agent.id}
          className="flex-shrink-0 p-1.5 text-faint hover:text-red-400 transition-colors disabled:opacity-40"
          title="Supprimer"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* System Prompt */}
      <div className="px-5 pb-4">
        <div className="bg-bg border border-edge rounded-lg overflow-hidden">
          <div
            className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-panel/50 transition-colors"
            onClick={() => setExpandedPrompt(isExpanded ? null : agent.id)}
          >
            <span className="text-xs font-medium text-dim flex items-center gap-1.5">
              <MessageSquare size={11} />
              System Prompt
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); onCopy(agent.systemPrompt, 'System prompt copié !') }}
                className="p-1 text-faint hover:text-accent-soft transition-colors"
                title="Copier le system prompt"
              >
                <Copy size={12} />
              </button>
              {isExpanded ? <ChevronUp size={13} className="text-faint" /> : <ChevronDown size={13} className="text-faint" />}
            </div>
          </div>

          {isExpanded && (
            <div className="px-3 pb-3 border-t border-edge">
              <p className="text-xs text-dim leading-relaxed mt-2 whitespace-pre-wrap max-h-64 overflow-y-auto">
                {agent.systemPrompt}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Outils */}
      {agent.tools?.length > 0 && (
        <div className="px-5 pb-4">
          <p className="text-xs font-medium text-dim flex items-center gap-1.5 mb-2">
            <Wrench size={11} />
            Outils recommandés
          </p>
          <div className="flex flex-wrap gap-2">
            {agent.tools.map((tool) => (
              <div
                key={tool.name}
                title={tool.desc}
                className="inline-flex items-center gap-1 text-xs bg-bg border border-edge text-ink px-2.5 py-1 rounded-lg cursor-help"
              >
                <Wrench size={10} className="text-accent-soft" />
                {tool.name}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Exemples de prompts */}
      {agent.examples?.length > 0 && (
        <div className="px-5 pb-5">
          <p className="text-xs font-medium text-dim flex items-center gap-1.5 mb-2">
            <Copy size={11} />
            Prompts types — cliquez pour copier
          </p>
          <div className="space-y-2">
            {agent.examples.map((ex, i) => (
              <button
                key={i}
                onClick={() => handleCopyExample(ex, i)}
                className="w-full text-left flex items-start gap-2.5 bg-bg border border-edge hover:border-accent-soft rounded-lg px-3 py-2.5 transition-all group"
              >
                <span className="flex-shrink-0 mt-0.5">
                  {copiedExample === i
                    ? <Check size={13} className="text-accent-soft" />
                    : <Copy size={13} className="text-faint group-hover:text-accent-soft transition-colors" />
                  }
                </span>
                <span className="text-xs text-dim group-hover:text-ink transition-colors leading-relaxed">
                  {ex}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
