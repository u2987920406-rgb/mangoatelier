// Starter template: blog with post list and client-side article view
import { useState } from "react";

const POSTS = [
  {
    id: 1,
    emoji: "🌱",
    title: "Bien démarrer un nouveau projet",
    date: "10 juin 2026",
    excerpt: "Les trois questions à se poser avant de se lancer, et les pièges classiques à éviter dès la première semaine.",
    body: [
      "Tout projet commence par une intention claire. Avant d'écrire la moindre ligne ou de poser la moindre brique, prenez le temps de formuler en une phrase le problème que vous résolvez, et pour qui.",
      "Ensuite, découpez. Un grand objectif intimidant devient une série de petites étapes dont chacune se termine en une journée. C'est le rythme de ces petites victoires qui maintient un projet vivant.",
      "Enfin, montrez votre travail tôt. Le retour d'une vraie personne vaut mieux que des semaines de polissage en solitaire.",
    ],
  },
  {
    id: 2,
    emoji: "✍️",
    title: "Écrire régulièrement change tout",
    date: "2 juin 2026",
    excerpt: "Pourquoi la régularité bat le talent, et comment tenir le rythme sans s'épuiser.",
    body: [
      "On surestime ce qu'on peut faire en une journée et on sous-estime ce qu'on peut faire en un an. Écrire trois cents mots par jour semble dérisoire ; au bout d'un an, c'est un livre.",
      "Le secret n'est pas la motivation mais le rituel : même heure, même endroit, même durée. La décision d'écrire est prise une fois pour toutes, plus besoin d'y dépenser de la volonté.",
    ],
  },
  {
    id: 3,
    emoji: "🧭",
    title: "Choisir ses outils sans se perdre",
    date: "24 mai 2026",
    excerpt: "Le meilleur outil est celui qu'on n'a pas besoin de changer tous les mois.",
    body: [
      "La quête de l'outil parfait est une procrastination déguisée. Un carnet et un éditeur de texte suffisent à 90 % des projets.",
      "Posez-vous une seule question : est-ce que cet outil me fait gagner du temps cette semaine ? Si la réponse est non, c'est un jouet, pas un outil.",
    ],
  },
  {
    id: 4,
    emoji: "🌊",
    title: "Apprendre en public",
    date: "12 mai 2026",
    excerpt: "Documenter son apprentissage attire les bonnes personnes et clarifie les idées.",
    body: [
      "Partager ce qu'on apprend, même imparfaitement, a un double effet : on comprend mieux en expliquant, et on attire des personnes qui s'intéressent aux mêmes sujets.",
      "Personne n'attend de vous l'exhaustivité. Un court billet honnête sur un problème résolu aujourd'hui aide plus que la promesse d'un guide complet qui ne sortira jamais.",
    ],
  },
];

export default function App() {
  const [current, setCurrent] = useState(null);
  const post = POSTS.find((p) => p.id === current);

  return (
    <div className="blog">
      <header className="blog-header">
        <h1 className="blog-title" onClick={() => setCurrent(null)}>Mon Carnet</h1>
        <p className="blog-tagline">Notes sur les projets, l'écriture et l'apprentissage</p>
      </header>

      {post ? (
        <article className="article">
          <button className="back-btn" onClick={() => setCurrent(null)}>← Tous les articles</button>
          <span className="article-emoji">{post.emoji}</span>
          <h2>{post.title}</h2>
          <time>{post.date}</time>
          {post.body.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </article>
      ) : (
        <main className="post-list">
          {POSTS.map((p) => (
            <article key={p.id} className="post-card" onClick={() => setCurrent(p.id)}>
              <span className="post-emoji">{p.emoji}</span>
              <div className="post-info">
                <h2>{p.title}</h2>
                <time>{p.date}</time>
                <p>{p.excerpt}</p>
                <span className="read-more">Lire la suite →</span>
              </div>
            </article>
          ))}
        </main>
      )}

      <footer className="blog-footer">© 2026 Mon Carnet — écrit avec soin</footer>
    </div>
  );
}
