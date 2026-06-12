// Starter template: business showcase site (vitrine)
import { useState } from "react";

const SERVICES = [
  { icon: "✨", title: "Service premium", text: "Une prestation haut de gamme adaptée à vos besoins, avec un accompagnement personnalisé du début à la fin." },
  { icon: "🎯", title: "Sur mesure", text: "Chaque projet est unique : nous construisons une solution qui correspond exactement à vos objectifs." },
  { icon: "🤝", title: "Accompagnement", text: "Un interlocuteur dédié, des délais respectés et un suivi transparent à chaque étape." },
];

const STATS = [
  { value: "120+", label: "clients satisfaits" },
  { value: "10 ans", label: "d'expérience" },
  { value: "98 %", label: "de recommandations" },
];

export default function App() {
  const [sent, setSent] = useState(false);

  return (
    <div className="site">
      <header className="nav">
        <span className="brand">Mon Entreprise</span>
        <nav>
          <a href="#services">Services</a>
          <a href="#apropos">À propos</a>
          <a href="#contact">Contact</a>
        </nav>
        <a className="btn btn-small" href="#contact">Devis gratuit</a>
      </header>

      <section className="hero">
        <h1>Votre projet mérite le meilleur</h1>
        <p>
          Nous aidons les entreprises et les particuliers à concrétiser leurs idées
          avec savoir-faire, écoute et exigence.
        </p>
        <div className="hero-actions">
          <a className="btn" href="#contact">Demander un devis</a>
          <a className="btn btn-ghost" href="#services">Découvrir nos services</a>
        </div>
      </section>

      <section id="services" className="section">
        <h2>Nos services</h2>
        <div className="cards">
          {SERVICES.map((s) => (
            <article key={s.title} className="card">
              <span className="card-icon">{s.icon}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="apropos" className="section section-alt">
        <h2>À propos</h2>
        <p className="about-text">
          Depuis plus de dix ans, notre équipe met son expertise au service de vos
          projets. Notre priorité : un travail soigné, des délais tenus et une
          relation de confiance sur la durée.
        </p>
        <div className="stats">
          {STATS.map((s) => (
            <div key={s.label} className="stat">
              <strong>{s.value}</strong>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section id="contact" className="section">
        <h2>Contact</h2>
        {sent ? (
          <p className="form-ok">✅ Merci ! Votre message a bien été envoyé, nous revenons vers vous rapidement.</p>
        ) : (
          <form
            className="contact-form"
            onSubmit={(e) => {
              e.preventDefault();
              setSent(true);
            }}
          >
            <input type="text" placeholder="Votre nom" required />
            <input type="email" placeholder="Votre e-mail" required />
            <textarea placeholder="Votre message" rows={5} required />
            <button className="btn" type="submit">Envoyer</button>
          </form>
        )}
      </section>

      <footer className="footer">
        <span>© 2026 Mon Entreprise — Tous droits réservés</span>
      </footer>
    </div>
  );
}
