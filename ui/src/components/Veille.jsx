import { useState, useEffect, useCallback } from 'react'
import { RotateCcw, ArrowLeft, ExternalLink } from 'lucide-react'

function timeAgo(dateStr) {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return 'date inconnue'
  const diff = Date.now() - d.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor(diff / (1000 * 60))
  if (days > 0) return `il y a ${days} jour${days > 1 ? 's' : ''}`
  if (hours > 0) return `il y a ${hours} heure${hours > 1 ? 's' : ''}`
  if (minutes > 0) return `il y a ${minutes} minute${minutes > 1 ? 's' : ''}`
  return "à l'instant"
}

const SOURCE_STYLES = {
  HuggingFace: {
    badge: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
    header: 'bg-yellow-500/10 border border-yellow-500/20',
    dot: 'bg-yellow-400',
  },
  Anthropic: {
    badge: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
    header: 'bg-purple-500/10 border border-purple-500/20',
    dot: 'bg-purple-400',
  },
}

function SkeletonCard() {
  return (
    <div className="animate-pulse bg-panel h-20 rounded-xl border border-edge-soft" />
  )
}

function ArticleCard({ item }) {
  const style = SOURCE_STYLES[item.source] || {
    badge: 'bg-gray-500/20 text-gray-300 border border-gray-500/30',
  }

  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className="block group"
    >
      <div className="bg-panel border border-edge-soft rounded-xl px-4 py-3 hover:border-edge transition-colors duration-150 hover:bg-panel/80">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-ink text-sm font-medium leading-snug group-hover:text-accent transition-colors duration-150 line-clamp-2">
              {item.title}
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-faint text-xs">{timeAgo(item.date)}</span>
              <span className="text-faint text-xs">·</span>
              <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${style.badge}`}>
                {item.source}
              </span>
            </div>
          </div>
          <ExternalLink size={14} className="text-faint group-hover:text-accent-soft shrink-0 mt-0.5 transition-colors duration-150" />
        </div>
      </div>
    </a>
  )
}

function SourceSection({ sourceName, items }) {
  const style = SOURCE_STYLES[sourceName] || {
    header: 'bg-gray-500/10 border border-gray-500/20',
    dot: 'bg-gray-400',
    badge: 'bg-gray-500/20 text-gray-300 border border-gray-500/30',
  }

  if (!items.length) return null

  return (
    <div className="space-y-2">
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${style.header}`}>
        <span className={`w-2 h-2 rounded-full ${style.dot}`} />
        <span className="text-sm font-semibold text-ink">{sourceName}</span>
        <span className="text-xs text-faint ml-auto">{items.length} article{items.length > 1 ? 's' : ''}</span>
      </div>
      <div className="space-y-2 pl-1">
        {items.map((item, i) => (
          <ArticleCard key={`${sourceName}-${i}`} item={item} />
        ))}
      </div>
    </div>
  )
}

export default function Veille({ onBack }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [spinning, setSpinning] = useState(false)
  const [lastFetched, setLastFetched] = useState(null)
  const [error, setError] = useState(false)

  const loadItems = useCallback(async (forceRefresh = false) => {
    const endpoint = forceRefresh ? '/api/veille/refresh' : '/api/veille'
    try {
      const res = await fetch(endpoint)
      if (!res.ok) throw new Error('fetch failed')
      const data = await res.json()
      setItems(data.items || [])
      setLastFetched(data.lastFetched || null)
      setError(false)
    } catch {
      setError(true)
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    loadItems(false).finally(() => setLoading(false))
  }, [loadItems])

  const handleRefresh = async () => {
    setSpinning(true)
    await loadItems(true)
    setSpinning(false)
  }

  const grouped = items.reduce((acc, item) => {
    if (!acc[item.source]) acc[item.source] = []
    acc[item.source].push(item)
    return acc
  }, {})

  const sources = Object.keys(grouped)

  return (
    <div className="min-h-screen bg-bg text-ink">
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* En-tête */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-dim hover:text-ink transition-colors duration-150 text-sm"
            >
              <ArrowLeft size={16} />
              <span>Retour</span>
            </button>
            <span className="text-edge-soft">|</span>
            <h1 className="text-xl font-bold text-ink">Veille IA</h1>
          </div>
          <button
            onClick={handleRefresh}
            disabled={spinning || loading}
            className="flex items-center gap-1.5 text-accent-soft hover:text-accent transition-colors duration-150 text-sm disabled:opacity-50"
          >
            <RotateCcw
              size={15}
              className={spinning ? 'animate-spin' : ''}
            />
            <span>Actualiser</span>
          </button>
        </div>

        {/* Sous-titre */}
        <p className="text-dim text-sm mb-1">
          Dernières nouvelles — HuggingFace &amp; Anthropic
        </p>
        {lastFetched && (
          <p className="text-faint text-xs mb-6">
            Mis à jour {timeAgo(lastFetched)}
          </p>
        )}

        {/* Contenu */}
        {loading ? (
          <div className="space-y-3 mt-6">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : error || items.length === 0 ? (
          <div className="mt-12 text-center">
            <p className="text-err text-sm">
              Aucun article disponible — vérification de la connexion…
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {sources.map((source) => (
              <SourceSection
                key={source}
                sourceName={source}
                items={grouped[source]}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
