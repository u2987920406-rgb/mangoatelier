import { useState } from 'react'
import { ArrowLeft, Zap, ShieldCheck, Star, Scissors, TrendingUp, RefreshCw } from 'lucide-react'

// Couleur par catégorie d'axiome
const CAT_COLORS = {
  BUILD:  'bg-blue-900/60 text-blue-300 border-blue-700',
  UIUX:   'bg-purple-900/60 text-purple-300 border-purple-700',
  ARCH:   'bg-yellow-900/60 text-yellow-300 border-yellow-700',
  DATA:   'bg-green-900/60 text-green-300 border-green-700',
  PERF:   'bg-orange-900/60 text-orange-300 border-orange-700',
  VISION: 'bg-pink-900/60 text-pink-300 border-pink-700',
  A11Y:   'bg-teal-900/60 text-teal-300 border-teal-700',
}
function catColor(cat) {
  return CAT_COLORS[cat] ?? 'bg-zinc-800/60 text-zinc-300 border-zinc-600'
}

// Couleur par maturité
const MATURITE_STYLES = {
  golden:   { label: 'golden',   cls: 'bg-amber-900/60 text-amber-300 border-amber-600',  icon: Star },
  'prouvé': { label: 'prouvé',   cls: 'bg-emerald-900/60 text-emerald-300 border-emerald-600', icon: ShieldCheck },
  candidat: { label: 'candidat', cls: 'bg-sky-900/60 text-sky-300 border-sky-700',        icon: Zap },
  inconnu:  { label: '?',        cls: 'bg-zinc-800/60 text-zinc-400 border-zinc-600',      icon: Zap },
}
function maturiteStyle(m) {
  return MATURITE_STYLES[m] ?? MATURITE_STYLES.inconnu
}

// Couleur par recommandation
function recoStyle(reco) {
  if (reco === 'pruning candidat') return { cls: 'text-red-400',    icon: Scissors }
  if (reco === 'garder')           return { cls: 'text-emerald-400', icon: ShieldCheck }
  return                                   { cls: 'text-accent-soft', icon: TrendingUp }
}

// Mini barre de score /10
function ScoreBar({ score }) {
  const capped = Math.min(score, 10)
  const pct = (capped / 10) * 100
  const color = score < 2 ? 'bg-red-500' : score < 5 ? 'bg-emerald-500' : 'bg-violet-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-bg rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-dim w-10 text-right">{score} / 10</span>
    </div>
  )
}

function Badge({ cls, children }) {
  return (
    <span className={`text-xs border rounded px-1.5 py-0.5 font-mono ${cls}`}>
      {children}
    </span>
  )
}

function StatCard({ label, value, sub, color }) {
  return (
    <div className="bg-panel border border-edge rounded-xl p-4 flex flex-col gap-1">
      <span className="text-xs text-dim uppercase tracking-wide">{label}</span>
      <p className={`text-2xl font-bold ${color ?? 'text-accent'}`}>{value}</p>
      {sub && <p className="text-xs text-dim">{sub}</p>}
    </div>
  )
}

export default function AutoAblation({ onBack }) {
  const [loading, setLoading]     = useState(false)
  const [report, setReport]       = useState(null)
  const [promoting, setPromoting] = useState(null)
  const [error, setError]         = useState(null)

  async function analyse() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ablation/report')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setReport(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function promote(id) {
    setPromoting(id)
    try {
      const res = await fetch(`/api/ablation/promote/${encodeURIComponent(id)}`, { method: 'POST' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      // Relancer l'analyse pour rafraîchir les données
      await analyse()
    } catch (e) {
      setError(e.message)
    } finally {
      setPromoting(null)
    }
  }

  // Compteurs
  const total   = report?.total ?? 0
  const axioms  = report?.axioms ?? []
  const pruning = axioms.filter((a) => a.recommandation === 'pruning candidat').length
  const golden  = axioms.filter((a) => a.maturite === 'golden').length

  return (
    <div className="min-h-screen bg-bg text-ink p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-panel border border-transparent hover:border-edge transition-colors text-dim hover:text-ink"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-accent-soft">Clapet v4.0 — Ablation automatique</h1>
          <p className="text-xs text-dim mt-0.5">Analyse et élagage du registre d'axiomes</p>
        </div>
        <div className="ml-auto">
          <button
            onClick={analyse}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-accent-soft/20 hover:bg-accent-soft/30 border border-accent-soft/40 rounded-lg text-accent-soft text-sm font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Analyse…' : 'Analyser'}
          </button>
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <div className="bg-red-950/40 border border-red-800/60 rounded-lg px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* État vide avant analyse */}
      {!report && !loading && !error && (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3 text-dim">
          <Scissors size={32} className="opacity-30" />
          <p className="text-sm">Cliquez sur "Analyser" pour scanner le registre</p>
        </div>
      )}

      {/* Stats */}
      {report && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <StatCard
              label="Total axiomes"
              value={total}
              sub="dans .axioms.md"
              color="text-accent"
            />
            <StatCard
              label="Candidats à pruner"
              value={pruning}
              sub="score < 2"
              color="text-red-400"
            />
            <StatCard
              label="Golden"
              value={golden}
              sub="score ≥ 5"
              color="text-amber-400"
            />
          </div>

          {/* Liste axiomes */}
          {axioms.length === 0 ? (
            <div className="text-center text-dim text-sm py-10">
              Aucun axiome trouvé dans le registre.
            </div>
          ) : (
            <div className="space-y-3">
              {axioms.map((ax) => {
                const ms = maturiteStyle(ax.maturite)
                const rs = recoStyle(ax.recommandation)
                const MIcon = ms.icon
                const RIcon = rs.icon
                const isPruning  = ax.recommandation === 'pruning candidat'
                const isGolden   = ax.recommandation === 'promouvoir golden'
                const canPromote = ax.maturite !== 'golden' && ax.maturite !== 'prouvé'

                return (
                  <div
                    key={ax.id}
                    className={`bg-panel border rounded-xl p-4 space-y-3 transition-colors ${
                      isPruning ? 'border-red-900/60' : isGolden ? 'border-violet-800/60' : 'border-edge'
                    }`}
                  >
                    {/* Ligne 1 : ID + badges */}
                    <div className="flex items-center flex-wrap gap-2">
                      <span className="font-mono text-sm text-ink font-semibold">{ax.id}</span>
                      <Badge cls={catColor(ax.cat)}>{ax.cat}</Badge>
                      <Badge cls={ms.cls}>
                        <span className="flex items-center gap-1">
                          <MIcon size={10} />
                          {ms.label}
                        </span>
                      </Badge>
                      <span className={`ml-auto flex items-center gap-1 text-xs font-medium ${rs.cls}`}>
                        <RIcon size={12} />
                        {ax.recommandation}
                      </span>
                    </div>

                    {/* Score */}
                    <ScoreBar score={ax.score} />

                    {/* Extrait */}
                    {ax.extrait && (
                      <p className="text-xs text-faint leading-relaxed line-clamp-2">{ax.extrait}</p>
                    )}

                    {/* Meta + bouton */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-dim">
                        récurrence ×{ax.recurrence} &nbsp;·&nbsp; score {ax.score}
                      </span>
                      {canPromote && (
                        <button
                          onClick={() => promote(ax.id)}
                          disabled={promoting === ax.id}
                          className="flex items-center gap-1.5 px-3 py-1 text-xs rounded-lg bg-accent-soft/10 hover:bg-accent-soft/20 border border-accent-soft/30 text-accent-soft transition-colors disabled:opacity-50"
                        >
                          <TrendingUp size={11} />
                          {promoting === ax.id ? 'Promotion…' : 'Promouvoir'}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
