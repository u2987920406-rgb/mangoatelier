import { useState, useEffect } from 'react'
import { ArrowLeft, TrendingUp, Zap, AlertCircle, Clock, BarChart2, RefreshCw } from 'lucide-react'

function fmt(n, decimals = 2) {
  return n.toFixed(decimals)
}
function fmtMs(ms) {
  if (ms < 1000) return `${Math.round(ms)} ms`
  return `${(ms / 1000).toFixed(1)} s`
}
function fmtPct(v) {
  return `${(v * 100).toFixed(1)} %`
}

function KpiCard({ label, value, sub, icon: Icon, accent }) {
  return (
    <div className="bg-panel border border-edge rounded-xl p-5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-dim uppercase tracking-wide">{label}</span>
        {Icon && <Icon size={15} className={accent || 'text-dim'} />}
      </div>
      <p className={`text-2xl font-bold ${accent || 'text-accent'}`}>{value}</p>
      {sub && <p className="text-xs text-dim">{sub}</p>}
    </div>
  )
}

function HBar({ label, value, max, color, sub }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-accent-soft truncate max-w-[160px]">{label}</span>
        <span className="text-dim">{sub}</span>
      </div>
      <div className="h-2 bg-bg rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color || 'bg-accent'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function DayChart({ days }) {
  const maxCost = Math.max(...days.map((d) => d.cost), 0.001)
  return (
    <div className="flex items-end gap-1 h-24">
      {days.map((d) => {
        const h = maxCost > 0 ? (d.cost / maxCost) * 100 : 0
        const label = d.day.slice(5) // MM-DD
        return (
          <div key={d.day} className="flex-1 flex flex-col items-center gap-1 group relative">
            <div
              className="w-full rounded-t bg-accent/40 group-hover:bg-accent transition-colors"
              style={{ height: `${Math.max(h, d.runs > 0 ? 4 : 0)}%` }}
              title={`${d.day} — ${fmt(d.cost)} $ — ${d.runs} runs`}
            />
            {d.runs > 0 && (
              <div className="absolute -top-5 hidden group-hover:flex bg-panel border border-edge text-xs text-accent px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap z-10">
                {fmt(d.cost)} $ · {d.runs} runs
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

const MODEL_COLORS = {
  haiku: 'bg-green-500',
  sonnet: 'bg-blue-500',
  opus: 'bg-purple-500',
  eleve: 'bg-yellow-500',
  unknown: 'bg-dim',
}

export default function MetricsDashboard({ onBack }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)

  const load = () => {
    setLoading(true)
    setErr(null)
    fetch('/api/metrics/summary')
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false) })
      .catch((e) => { setErr(e.message); setLoading(false) })
  }

  useEffect(load, [])

  return (
    <div className="min-h-screen bg-bg text-accent p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-dim hover:text-accent transition-colors text-sm"
          >
            <ArrowLeft size={16} />
            Retour
          </button>
          <h1 className="text-2xl font-bold text-accent">Dashboard d'évolution</h1>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 text-xs text-dim hover:text-accent transition-colors border border-edge px-3 py-1.5 rounded-lg"
        >
          <RefreshCw size={13} />
          Actualiser
        </button>
      </div>

      {loading && (
        <div className="text-dim text-center py-20 text-sm">Chargement des métriques…</div>
      )}

      {err && (
        <div className="text-err text-center py-20 text-sm">Erreur : {err}</div>
      )}

      {data?.empty && (
        <div className="text-dim text-center py-20 text-sm">Aucune métrique enregistrée pour l'instant.</div>
      )}

      {data && !data.empty && (
        <div className="space-y-8">
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard
              label="Coût total"
              value={`$${fmt(data.totalCost)}`}
              sub={`${data.totalRuns} runs`}
              icon={TrendingUp}
              accent="text-accent"
            />
            <KpiCard
              label="Coût moyen / run"
              value={`$${fmt(data.totalCost / data.totalRuns)}`}
              sub={`${fmt(data.avgTurns, 1)} tours en moy.`}
              icon={Zap}
              accent="text-yellow-400"
            />
            <KpiCard
              label="Taux d'erreur"
              value={fmtPct(data.errorRate)}
              sub={`${Math.round(data.errorRate * data.totalRuns)} erreurs`}
              icon={AlertCircle}
              accent={data.errorRate > 0.1 ? 'text-red-400' : 'text-green-400'}
            />
            <KpiCard
              label="Durée moyenne"
              value={fmtMs(data.avgDurationMs)}
              sub="par run"
              icon={Clock}
              accent="text-blue-400"
            />
          </div>

          {/* Élève vs Maître */}
          {(data.eleveRuns > 0 || data.maitrRuns > 0) && (
            <div className="bg-panel border border-edge rounded-xl p-5">
              <h2 className="text-sm font-semibold text-accent mb-4 flex items-center gap-2">
                <BarChart2 size={15} /> Résolution Élève vs Maître
              </h2>
              <div className="flex gap-4 text-sm mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-yellow-400 inline-block" />
                  <span className="text-accent-soft">Élève : {data.eleveRuns}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-accent inline-block" />
                  <span className="text-accent-soft">Maître : {data.maitrRuns}</span>
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-dim text-xs">
                    {data.eleveRuns + data.maitrRuns > 0
                      ? `${fmtPct(data.eleveRuns / (data.eleveRuns + data.maitrRuns))} autonome`
                      : '—'}
                  </span>
                </div>
              </div>
              <div className="h-4 rounded-full overflow-hidden bg-bg flex">
                <div
                  className="h-full bg-yellow-400 transition-all"
                  style={{ width: `${data.eleveRuns + data.maitrRuns > 0 ? (data.eleveRuns / (data.eleveRuns + data.maitrRuns)) * 100 : 0}%` }}
                />
                <div
                  className="h-full bg-accent transition-all"
                  style={{ width: `${data.eleveRuns + data.maitrRuns > 0 ? (data.maitrRuns / (data.eleveRuns + data.maitrRuns)) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}

          {/* Coût par jour */}
          <div className="bg-panel border border-edge rounded-xl p-5">
            <h2 className="text-sm font-semibold text-accent mb-1">Coût par jour — 21 derniers jours</h2>
            <p className="text-xs text-dim mb-4">Survoler une barre pour le détail</p>
            <DayChart days={data.byDay} />
            <div className="flex items-end justify-between mt-2 text-[10px] text-dim">
              <span>{data.byDay[0]?.day.slice(5)}</span>
              <span>{data.byDay[10]?.day.slice(5)}</span>
              <span>{data.byDay[20]?.day.slice(5)}</span>
            </div>
          </div>

          {/* Modèles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-panel border border-edge rounded-xl p-5">
              <h2 className="text-sm font-semibold text-accent mb-4">Distribution par modèle</h2>
              <div className="space-y-3">
                {data.byModel.map((m) => (
                  <HBar
                    key={m.name}
                    label={m.name}
                    value={m.cost}
                    max={data.byModel[0]?.cost || 1}
                    color={MODEL_COLORS[m.name] || 'bg-accent'}
                    sub={`$${fmt(m.cost)} · ${m.runs} runs`}
                  />
                ))}
              </div>
            </div>

            {/* Top projets */}
            <div className="bg-panel border border-edge rounded-xl p-5">
              <h2 className="text-sm font-semibold text-accent mb-4">Top projets (coût)</h2>
              <div className="space-y-3">
                {data.topProjects.map((p) => (
                  <HBar
                    key={p.name}
                    label={p.name}
                    value={p.cost}
                    max={data.topProjects[0]?.cost || 1}
                    color="bg-blue-500"
                    sub={`$${fmt(p.cost)} · ${p.runs} runs`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Modes */}
          {Object.keys(data.byMode).length > 0 && (
            <div className="bg-panel border border-edge rounded-xl p-5">
              <h2 className="text-sm font-semibold text-accent mb-4">Runs par mode</h2>
              <div className="flex gap-6 flex-wrap">
                {Object.entries(data.byMode)
                  .sort((a, b) => b[1] - a[1])
                  .map(([mode, count]) => (
                    <div key={mode} className="text-center">
                      <p className="text-2xl font-bold text-accent">{count}</p>
                      <p className="text-xs text-dim capitalize">{mode}</p>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
