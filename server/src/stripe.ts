import type { Express, Request, Response } from 'express'

// Plans disponibles
const PLANS = [
  { id: 'free', name: 'Gratuit', price: 0, features: ['3 projets', '100 messages/mois', 'Modèle Haiku'] },
  { id: 'pro', name: 'Pro', price: 19, features: ['Projets illimités', 'Messages illimités', 'Tous les modèles', 'Déploiement 1-clic', 'GitHub intégré'] },
  { id: 'elite', name: 'Elite', price: 49, features: ['Tout Pro', 'Agents autonomes', 'Support prioritaire', 'Modèles locaux inclus'] },
]

export function registerStripeRoutes(app: Express): void {
  // GET /api/billing/plans → PLANS[]
  app.get('/api/billing/plans', (req: Request, res: Response) => { res.json({ plans: PLANS }) })

  // POST /api/billing/checkout { planId: string }
  // Si STRIPE_SECRET_KEY configuré : crée une Checkout Session Stripe et retourne { url }
  // Si non configuré : retourne { error: 'Stripe non configuré', configured: false }
  app.post('/api/billing/checkout', async (req: Request, res: Response) => {
    const stripeKey = process.env.STRIPE_SECRET_KEY
    if (!stripeKey) {
      res.json({ error: 'Stripe non configuré — ajoute STRIPE_SECRET_KEY dans .env', configured: false })
      return
    }
    try {
      const Stripe = (await import('stripe' as any)).default
      const stripe = new (Stripe as any)(stripeKey)
      const plan = PLANS.find(p => p.id === req.body.planId)
      if (!plan || plan.price === 0) { res.json({ error: 'Plan invalide' }); return }
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        line_items: [{ price_data: { currency: 'eur', product_data: { name: plan.name + ' — MangoAI' }, recurring: { interval: 'month' }, unit_amount: plan.price * 100 }, quantity: 1 }],
        success_url: 'http://localhost:5173?billing=success',
        cancel_url: 'http://localhost:5173?billing=cancel',
      })
      res.json({ url: session.url })
    } catch (err: any) {
      res.status(500).json({ error: err.message })
    }
  })

  // GET /api/billing/status → { configured: boolean, plan: string }
  app.get('/api/billing/status', (req: Request, res: Response) => {
    res.json({ configured: Boolean(process.env.STRIPE_SECRET_KEY), plan: 'free' })
  })
}
