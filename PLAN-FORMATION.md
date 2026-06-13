# Plan de formation & développement — MangoAI
*Document vivant — cocher les cases au fur et à mesure*
*Dernière mise à jour : 2026-06-13*

---

## Comment lire ce document

Il y a deux types de travail distincts :

- 🔧 **Type A — Amélioration de MangoAI** : on travaille ensemble ici dans Claude Code. Je code, tu testes, tu dis "save".
- 🧪 **Type B — Projet formation** : tu ouvres MangoAI dans ton navigateur (`http://localhost:5173`) et tu construis l'app en parlant à l'agent. Je ne code pas — c'est ton terrain d'entraînement.

Le cercle vertueux : les projets Type B révèlent ce qui manque dans MangoAI → on l'améliore (Type A) → MangoAI devient meilleur pour les projets suivants.

---

## Phase 1 — Fondations (débloquent tout le reste)
> Estimation : 3–5 sessions · À faire en priorité absolue

- [ ] **Idée 12 · Sélecteur ⚡ MVP / 💎 Élite** 🔧 *Type A — ~1-2 sessions*
  - Bouton dans le header (comme le choix de modèle)
  - Mode MVP = flux rapide actuel ; Mode Élite = tout l'arsenal
  - Prérequis de toutes les fonctions avancées futures
  - **Statut :** 💤 en attente

- [ ] **Idée 16 · Intégration GitHub native** 🔧 *Type A — ~1-2 sessions*
  - Push vers un repo GitHub en 1 clic depuis MangoAI
  - Commits auto par itération, bouton "Ouvrir sur GitHub"
  - Prérequis : token GitHub dans `.env`
  - **Statut :** 💤 en attente

- [ ] **Idée 17 · Intégration Supabase** 🔧 *Type A — ~1-2 sessions*
  - L'agent génère le schéma SQL, les migrations, le code auth
  - Ouvre la génération d'apps avec login + base de données
  - Comble le vrai manque vs Lovable
  - **Statut :** 💤 en attente

---

## Phase 2 — Cerveau plus puissant
> Estimation : 4–6 sessions · Après Phase 1

- [ ] **Idée 10 · Knowledge Flywheel** 🔧 *Type A — ~2 sessions*
  - Modifier `review.ts` pour extraire des axiomes universels
  - Format `AXIOME-[CATÉGORIE]-[ID]` + niveaux de maturité
  - Garde-fous obligatoires : falsifiable, plafond, demande user prime
  - **Statut :** 💤 en attente

- [ ] **Idées 8 + 6 · Blueprints + Stacks par type de projet** 🔧 *Type A — ~1-2 sessions*
  - Squelettes de dossiers prédéfinis (site, jeu, dashboard, slides)
  - Stacks optimisées choisies automatiquement selon le type
  - Moins de tours, moins de tokens, meilleur résultat dès le 1er message
  - **Statut :** 💤 en attente

- [ ] **Idées 9 + 11 · Mango Plan + Moodboard automatisé** 🔧 *Type A — ~2-3 sessions*
  - Module d'avant-projet : plan.md + intentions.json avant de coder
  - Captures des leaders du domaine via Playwright, règles de design extraites
  - Zéro dette technique : concevoir avant de coder
  - **Statut :** 💤 en attente

---

## Phase 3 — Ta formation IA (projets dans MangoAI)
> Estimation : 4–8 sessions · Toi aux commandes dans MangoAI
> 💡 Pour chaque projet : ouvrir MangoAI, créer un nouveau projet, suivre le guide ci-dessous

### 🧪 Projet Formation A · Visualiseur de tokenisation *(Idée 20)*
- [ ] **Construire l'app dans MangoAI** — *~30-60 min*

  **Prompt de départ à envoyer à MangoAI :**
  > *"Crée une app React avec un textarea. En temps réel, pendant que je tape, chaque token du texte doit être colorié d'une couleur différente (comme tokenizer.openai.com). En dessous : affiche le nombre total de tokens, et le coût estimé pour chaque modèle (Haiku à $1/M tokens input, Sonnet à $3/M, Opus à $5/M). Interface simple, fond sombre."*

  **Ce que tu apprendras :**
  - Ce que « tokens » veut vraiment dire (un mot ≠ un token)
  - Pourquoi certains mots coûtent plus cher que d'autres
  - Comment piloter les coûts à la source
  - Note : utilise l'API de tokenisation `@anthropic-ai/tokenizer` (npm)

  **Statut :** 💤 en attente

### 🧪 Projet Formation B · Lab de prompts *(Idée 19)*
- [ ] **Construire l'app dans MangoAI** — *~1-2h*

  **Prompt de départ :**
  > *"Crée une app React avec : à gauche un éditeur de prompt (textarea), un sélecteur de modèle (cases à cocher : Haiku, Sonnet, Opus), un bouton Lancer. À droite, les réponses s'affichent côte à côte en colonnes — une par modèle sélectionné. Sous chaque réponse : durée et coût estimé. L'app appelle l'API Anthropic directement depuis le frontend avec une clé dans un champ de settings. Interface claire type split-screen."*

  **Ce que tu apprendras :**
  - La différence concrète entre Haiku, Sonnet et Opus sur le même prompt
  - L'impact du prompting : même question, formulation différente = résultats très différents
  - Comment faire un appel API Anthropic direct depuis React
  - Le prix comparé sur des cas réels

  **Statut :** 💤 en attente

### 🧪 Projet Formation C · Agent de notes & RAG *(Idée 22)*
- [ ] **Construire l'app dans MangoAI** — *~1-2h*

  **Prompt de départ :**
  > *"Crée une app React + backend Express. L'utilisateur dépose des fichiers .md dans un dossier notes/ via un bouton upload. L'app crée un index simple (liste des fichiers + leur contenu). En bas, un chat : l'utilisateur pose une question, le backend envoie à Claude le contenu de tous les fichiers .md + la question, Claude répond en citant ses sources (nom du fichier). Interface minimaliste : panneau fichiers à gauche, chat à droite."*

  **Ce que tu apprendras :**
  - Le RAG (Retrieval-Augmented Generation) dans sa forme la plus simple
  - Comment un agent choisit dans quels fichiers chercher
  - Pourquoi le contexte passé à Claude change tout à la qualité de la réponse
  - La limite de la fenêtre de contexte en conditions réelles

  **Statut :** 💤 en attente

### 🧪 Projet Formation D · Dashboard de veille IA *(Idée 23)*
- [ ] **Construire l'app dans MangoAI** — *~1-2h*

  **Prompt de départ :**
  > *"Crée une app React + backend Express. Le backend récupère le flux RSS du blog Anthropic (https://www.anthropic.com/rss.xml) et du changelog OpenAI. Il passe les derniers articles à Claude qui génère un résumé en 3 bullet points par article. L'UI affiche un fil de veille avec : titre, date, source (logo), résumé Claude. Un bouton Rafraîchir. Badge rouge si nouveaux articles depuis la dernière visite (localStorage). Interface type fil d'actualités, fond sombre."*

  **Ce que tu apprendras :**
  - Le scraping/RSS et la récupération de données externes
  - Le résumé automatisé par Claude (prompt d'extraction structurée)
  - Comment construire un outil de veille qui te fait gagner du temps
  - Les limites du rate-limiting et comment les gérer

  **Statut :** 💤 en attente

---

## Phase 4 — Vision avancée & qualité
> Estimation : 3–5 sessions · Après Phase 1 (dépend du sélecteur MVP/Élite)

- [ ] **Idée 7 · Inspiration web & blueprint contextuel** 🔧 *Type A — ~2 sessions*
  - L'agent analyse les leaders du domaine avant de coder
  - Recherche web + captures Playwright + extraction de structure
  - **Statut :** 💤 en attente

- [ ] **Idée 1 · Agent QA temporel** 🔧 *Type A — ~1-2 sessions*
  - Séquences animées / GIF via Playwright (3-5s)
  - Détecte les bugs d'animation et de transition en mouvement
  - **Statut :** 💤 en attente

- [ ] **Idée 2 · Design pair-programming** 🔧 *Type A — ~1-2 sessions*
  - Calque semi-transparent sur l'aperçu live : l'agent montre avant de faire
  - **Statut :** 💤 en attente

---

## Phase 5 — Expansion écosystème
> Estimation : 4–6 sessions

- [ ] **Idée 25 · MCP Figma intégré** 🔧 *Type A — ~1-2 sessions*
  - Brancher le serveur MCP Figma officiel
  - URL Figma → l'agent lit le design → génère le code React
  - **Statut :** 💤 en attente

- [ ] **Idée 18 · Déploiement étendu** 🔧 *Type A — ~1 session*
  - Vercel + Netlify en plus de Cloudflare Pages
  - **Statut :** 💤 en attente

- [ ] **Idée 24 · Générateur de tests automatiques** 🔧 *Type A — ~1-2 sessions*
  - Vitest + Playwright, mode Élite uniquement
  - **Statut :** 💤 en attente

- [ ] **Idée 21 · Panneau de métriques avancé** 🔧 *Type A — ~1 session*
  - Graphiques recharts à partir de `workspace/.metrics.jsonl`
  - Nourrit l'audit du 2026-06-22 (idée 13)
  - **Statut :** 💤 en attente

---

## Phase 6 — Maturité & finitions
> Estimation : 4–6 sessions · Horizon long terme

- [ ] **Idée 3 · Généalogie visuelle** 🔧 *Type A — ~2 sessions*
  - Timeline visuelle des renders liée à l'historique git
  - **Statut :** 💤 en attente

- [ ] **Idée 4 · Documentation multimodale autonome** 🔧 *Type A — ~1-2 sessions*
  - Guides illustrés auto-générés à la clôture d'un jalon
  - **Statut :** 💤 en attente

- [ ] **Idée 26 · Multi-projets & composition** 🔧 *Type A — ~2 sessions*
  - Bibliothèque de composants perso cross-projets
  - **Statut :** 💤 en attente

- [ ] **Idée 5 · Guide utilisateur MangoAI complet** 🧪 *Type B — ~1h dans MangoAI*
  - Quand tout le reste est stable : documenter l'outil complet
  - **Statut :** 💤 en attente

---

## Planifiées (dates fixes)

- [ ] **Idée 13 · Audit coûts** — *à partir du 2026-06-22* 🔧 *Type A — ~1 session*
  - Analyse de `workspace/.metrics.jsonl` accumulé depuis le 2026-06-13
  - Optimisation du system prompt (~33k tokens, 15-25 % à gagner)
  - **Statut :** 📅 planifiée (2026-06-22)

- [ ] **Idée 15 · Veille & jouvence** — *le 13 de chaque mois* — voir `VEILLE-MENSUELLE.md`
  - **Statut :** 📅 rappel mensuel actif

---

## Vue d'ensemble — timing estimé

| Phase | Contenu | Qui | Durée estimée | Horizon |
|-------|---------|-----|---------------|---------|
| 1 | Fondations (12, 16, 17) | Nous (Type A) | 3–5 sessions | Juillet 2026 |
| 2 | Cerveau (10, 8+6, 9+11) | Nous (Type A) | 4–6 sessions | Juillet–Août 2026 |
| 3 | Formation IA (20, 19, 22, 23) | Toi (Type B) | 4–8 sessions | Août 2026 |
| 4 | Vision avancée (7, 1, 2) | Nous (Type A) | 3–5 sessions | Septembre 2026 |
| 5 | Écosystème (25, 18, 24, 21) | Nous (Type A) | 4–6 sessions | Septembre–Octobre 2026 |
| 6 | Maturité (3, 4, 26, 5) | Nous (Type A) | 4–6 sessions | Fin 2026 |
| — | Audit coûts (13) | Nous (Type A) | 1 session | 2026-06-22 |
| — | Veille mensuelle (15) | Nous | 30–45 min/mois | Chaque 13 du mois |

**Total estimé : 22–36 sessions** — à raison de 2-4 sessions par mois, horizon fin 2026.

---

## Prochaine étape recommandée

**→ Idée 12 · Sélecteur MVP/Élite** — c'est le verrou de tout, 1-2 sessions.
Dis "on attaque la 12" et on démarre.
