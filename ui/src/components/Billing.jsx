import { useState, useEffect } from 'react'
import { ArrowLeft, Check, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'

const FAQ_ITEMS = [
  {
    q: 'Puis-je annuler à tout moment ?',
    a: "Oui, tu peux annuler ton abonnement à tout moment depuis ton espace Stripe. L'abonnement reste actif jusqu'à la fin de la période en cours.",
  },
  {
    q: 'Y a-t-il une politique de remboursement ?',
    a: "Les 7 premiers jours sont remboursables sans condition. Passé ce délai, les paiements ne sont pas remboursés (conformément aux CGV).",
  },
  {
    q: 'Que devient mes données si je résilie ?',
    a: "Tes projets et données restent accessibles en lecture pendant 30 jours après résiliation, puis sont supprimés définitivement.",
  },
]

const PLAN_STYLES = {
  free: {
    border: 'border-edge',
    badge: { text: 'Actuel', cls: 'bg-bg text-dim border border-edge' },
    btn: 'bg-bg text-dim border border-edge cursor-not-allowed opacity-60',
    disabled: true,
  },
  pro: {
    border: 'border-accent',
    badge: { text: 'Recommandé', cls: 'bg-accent text-ink font-semibold' },
    btn: 'bg-accent hover:opacity-90 text-ink font-semibold',
    disabled: false,
    highlight: true,
  },
  elite: {
    border: 'border-purple-500',
    badge: { text: 'Premium', cls: 'bg-purple-600 text-white font-semibold' },
    btn: 'bg-purple-600 hover:bg-purple-500 text-white font-semibold',
    disabled: false,
  },
}

export default function Billing({ onBack }) {
  const [plans, setPlans] = useState([])
  const [stripeConfigured, setStripeConfigured] = useState(true)
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState(null)
  const [toast, setToast] = useState(null)
  const [openFaq, setOpenFaq] = useState(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/billing/plans').then(r => r.json()),
      fetch('/api/billing/status').then(r => r.json()),
    ]).then(([plansData, statusData]) => {
      setPlans(plansData.plans || [])
      setStripeConfigured(statusData.configured)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  const handleChoose = async (planId) => {
    if (planId === 'free') return
    setCheckoutLoading(planId)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else if (data.configured === false) {
        showToast('Configure STRIPE_SECRET_KEY dans server/.env pour activer les paiements.', 'warn')
      } else {
        showToast(data.error || 'Erreur inconnue', 'err')
      }
    } catch {
      showToast('Impossible de contacter le serveur.', 'err')
    } finally {
      setCheckoutLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-bg text-accent p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-dim hover:text-accent transition-colors text-sm"
        >
          <ArrowLeft size={16} />
          Retour
        </button>
        <h1 className="text-2xl font-bold text-accent">Abonnement MangoOS</h1>
      </div>

      {/* Badge Stripe non configuré */}
      {!stripeConfigured && (
        <div className="flex items-center gap-3 bg-panel border border-yellow-600/40 rounded-lg px-4 py-3 mb-8 text-sm text-yellow-400">
          <AlertTriangle size={16} className="shrink-0" />
          <span>
            Mode démo — Stripe non configuré. Ajoute{' '}
            <code className="font-mono bg-bg px-1 rounded text-accent-soft">STRIPE_SECRET_KEY</code>{' '}
            dans <code className="font-mono bg-bg px-1 rounded text-accent-soft">server/.env</code> pour activer les paiements.
          </span>
        </div>
      )}

      {/* Plans */}
      {loading ? (
        <div className="text-dim text-center py-16 text-sm">Chargement des plans…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {plans.map(plan => {
            const style = PLAN_STYLES[plan.id] || PLAN_STYLES.free
            const isLoading = checkoutLoading === plan.id
            return (
              <div
                key={plan.id}
                className={`relative flex flex-col bg-panel border-2 ${style.border} rounded-xl p-6 ${style.highlight ? 'ring-1 ring-accent/30 shadow-lg shadow-accent/10' : ''}`}
              >
                {/* Badge */}
                <span className={`self-start text-xs px-2 py-0.5 rounded-full mb-4 ${style.badge.cls}`}>
                  {style.badge.text}
                </span>

                {/* Nom + Prix */}
                <div className="mb-5">
                  <p className="text-lg font-bold text-accent mb-1">{plan.name}</p>
                  <p className="text-3xl font-extrabold text-accent">
                    {plan.price === 0 ? (
                      <span>Gratuit</span>
                    ) : (
                      <>
                        {plan.price}
                        <span className="text-base font-normal text-dim"> €/mois</span>
                      </>
                    )}
                  </p>
                </div>

                {/* Features */}
                <ul className="flex-1 space-y-2 mb-6">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-accent-soft">
                      <Check size={14} className="text-green-400 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                {/* Bouton */}
                <button
                  onClick={() => !style.disabled && handleChoose(plan.id)}
                  disabled={style.disabled || isLoading}
                  className={`w-full py-2 rounded-lg text-sm transition-all ${style.btn} ${isLoading ? 'opacity-70 cursor-wait' : ''}`}
                >
                  {style.disabled
                    ? 'Plan actuel'
                    : isLoading
                    ? 'Chargement…'
                    : 'Choisir ce plan'}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* FAQ */}
      <div className="border-t border-edge pt-8">
        <h2 className="text-base font-semibold text-accent mb-4">Questions fréquentes</h2>
        <div className="space-y-3">
          {FAQ_ITEMS.map((item, i) => (
            <div key={i} className="bg-panel border border-edge rounded-lg overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm text-accent-soft hover:text-accent transition-colors text-left"
              >
                <span>{item.q}</span>
                {openFaq === i ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </button>
              {openFaq === i && (
                <div className="px-4 pb-4 text-sm text-dim leading-relaxed border-t border-edge-soft pt-3">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-lg text-sm shadow-xl z-50 transition-all
            ${toast.type === 'err' ? 'bg-err text-white' : toast.type === 'warn' ? 'bg-yellow-700 text-yellow-100' : 'bg-panel border border-edge text-accent'}`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  )
}
