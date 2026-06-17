// Starter DaisyUI + Tailwind v4 — Landing page MVP
// Navbar · Hero · Features · Pricing · Footer
// Décris le produit dans le chat : Mango remplace les textes, sections et thème
const FEATURES = [
  { icon: '⚡', titre: 'Ultra rapide', desc: 'Performance optimale dès le premier rendu.' },
  { icon: '🎨', titre: 'Personnalisable', desc: 'Couleurs, typo et composants en un mot.' },
  { icon: '📱', titre: 'Responsive', desc: 'Mobile, tablette, desktop — rien ne brise.' },
  { icon: '🔒', titre: 'Sécurisé', desc: 'Bonnes pratiques intégrées par défaut.' },
  { icon: '📦', titre: 'Prêt à déployer', desc: 'Build en 1 commande, hébergement 1 clic.' },
  { icon: '🤝', titre: 'Open source', desc: 'Code libre, communauté active.' },
];

const PLANS = [
  {
    nom: 'Gratuit', prix: '€0', desc: 'Pour commencer',
    features: ['1 projet', '5 Go stockage', 'Support email'],
    cls: 'btn-outline', badge: false,
  },
  {
    nom: 'Pro', prix: '€19/mois', desc: 'Le plus populaire',
    features: ['Projets illimités', '100 Go stockage', 'Support prioritaire', 'Accès API'],
    cls: 'btn-primary', badge: true,
  },
  {
    nom: 'Entreprise', prix: 'Sur devis', desc: 'Grandes équipes',
    features: ['Tout Pro +', 'SSO / SAML', 'SLA 99,9 %', 'Onboarding dédié'],
    cls: 'btn-outline', badge: false,
  },
];

export default function App() {
  return (
    <div data-theme="dark" className="min-h-screen">

      {/* Navbar */}
      <div className="navbar bg-base-100 shadow-sm sticky top-0 z-50">
        <div className="navbar-start">
          <a className="btn btn-ghost text-xl font-bold">MonApp</a>
        </div>
        <div className="navbar-center hidden lg:flex">
          <ul className="menu menu-horizontal px-1 gap-1">
            <li><a>Fonctionnalités</a></li>
            <li><a>Tarifs</a></li>
            <li><a>À propos</a></li>
          </ul>
        </div>
        <div className="navbar-end gap-2">
          <a className="btn btn-ghost btn-sm">Connexion</a>
          <a className="btn btn-primary btn-sm">Démarrer</a>
        </div>
      </div>

      {/* Hero */}
      <div className="hero min-h-[80vh] bg-gradient-to-br from-base-100 to-base-300">
        <div className="hero-content text-center">
          <div className="max-w-2xl">
            <div className="badge badge-primary mb-4">Nouveau — v2.0</div>
            <h1 className="text-5xl font-bold leading-tight mb-6">
              Le titre accrocheur<br />de votre produit
            </h1>
            <p className="text-xl text-base-content/70 mb-8">
              Description percutante en deux phrases. Simple, directe, convaincante.
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <button className="btn btn-primary btn-lg">Commencer gratuitement</button>
              <button className="btn btn-outline btn-lg">Voir la démo</button>
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="py-20 px-4 bg-base-200">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-3">Tout ce dont vous avez besoin</h2>
          <p className="text-center text-base-content/60 mb-12">Aucune configuration. Prêt en 5 minutes.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(({ icon, titre, desc }) => (
              <div key={titre} className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="card-body">
                  <div className="text-3xl mb-2">{icon}</div>
                  <h3 className="card-title text-base">{titre}</h3>
                  <p className="text-base-content/60 text-sm">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Tarifs simples</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANS.map(({ nom, prix, desc, features, cls, badge }) => (
              <div key={nom} className={`card bg-base-100 shadow ${badge ? 'border-2 border-primary' : ''}`}>
                <div className="card-body">
                  {badge && <div className="badge badge-primary mb-2">Populaire</div>}
                  <h3 className="text-xl font-bold">{nom}</h3>
                  <p className="text-3xl font-black mt-1">{prix}</p>
                  <p className="text-base-content/50 text-sm mb-4">{desc}</p>
                  <ul className="space-y-2 mb-6 flex-1">
                    {features.map(f => (
                      <li key={f} className="flex items-center gap-2 text-sm">
                        <span className="text-success">✓</span>{f}
                      </li>
                    ))}
                  </ul>
                  <button className={`btn ${cls} w-full`}>Choisir</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="footer footer-center p-10 bg-base-200 text-base-content">
        <p className="font-bold text-lg">MonApp</p>
        <p className="text-base-content/50 text-sm">© 2026 · Construit avec Mango + DaisyUI</p>
      </footer>

    </div>
  );
}
