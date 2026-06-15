# Statut — MangoAI

*Dernière mise à jour : 2026-06-15 — Vague 2 : docs autonomes (#1), généalogie visuelle (#3), documentation multimodale (#4), Stripe (#39), skills panel (#2), agents cron (#C), + micro (#4), menu mode (#5), sélecteur contexte (#7).*

> **🟢 Où on en est (2026-06-15)** — `qwen2.5-coder:14b` élu Élève (8.8/10, ~23 Go libérés). Session du 2026-06-15 (matinée) : idées #35 backend Express, #36 composants inter-projets, #38 archi vivante, #41 RLHF 👍/👎, #42 identité 3 couches, #43 escalade UX, #A design system, #8 Sharingan — tous ✅. Session du 2026-06-15 (validation finale) : #1 SidePanel + #1a police + #1b couleur + #1c sélecteur, #6 Home repensée, #B Routing modèle auto, #19 PromptLab, #20 Tokenizer, #23 Veille IA dashboard, #37 Idéation visuelle — tous ✅ livrés. Session du 2026-06-15 (vague 2) : #1 Agent QA temporel, #3 Généalogie visuelle, #4 Documentation multimodale, #39 Paiements Stripe, roadmap #2 Skills panel, #C Agents cron, #4 Bouton micro, #5 Menu mode, #7 Sélecteur contexte — tous ✅ livrés, `tsc` 0, build UI OK (8s, 1937 modules).
>
> **📅 Date fixe** : audit coûts (idée 13) le **2026-06-22** · veille mensuelle le **13 de chaque mois**

*Pour le détail complet de chaque idée, les sessions passées, les analyses d'architecture → `historique.md`*

---

## 📊 Tableau consolidé — toutes les idées et chantiers

### Feuille de route principale (plan de bord)

| # | Quoi | Statut | Modèle optimal | Effort |
|---|------|--------|----------------|--------|
| — | Veille mensuelle | 📅 rappel 13/mois | ⚖️ Sonnet 4.6 | M |
| 1 | Contenu fichier cible à l'Élève | ✅ FAIT | — | — |
| 2 | Discipline d'ablation | ✅ FAIT | — | — |
| 3 | `selectAxioms` v2.1 | ✅ FAIT | — | — |
| 4 | Audit des coûts | 📅 2026-06-22 | 🧠 Opus 4.8 | L |
| 5 | Relais clic → source | ✅ FAIT | — | — |
| 6 | Édition visuelle chirurgicale | ✅ FAIT | — | — |
| 7 | MCP Figma | 🗑️ RETIRÉ | — | — |
| 8 | Inspiration web contextuelle | ✅ FAIT | — | — |
| 9 | Tests auto Vitest/Playwright | ✅ FAIT | — | — |
| 10 | Déploiement Vercel + Netlify | ✅ FAIT | — | — |
| 11 | Déléguer édition visuelle à Qwen-VL | 💤 | 🧠 Opus 4.8 | XL |

### Idées en attente / actives

| # | Idée | Statut | Modèle optimal | Effort |
|---|------|--------|----------------|--------|
| 1 | Agent QA temporel | ✅ FAIT | — | — |
| 2 | Design pair-programming | 💤 | 🧠 Opus 4.8 | XL |
| 3 | Généalogie visuelle (rollback graphique) | ✅ FAIT | — | — |
| 4 | Documentation multimodale autonome | ✅ FAIT | — | — |
| 5 | Guide utilisateur MangoAI | ✅ FAIT | — | — |
| 6 | Modèles full-stack par type | ✅ FAIT | — | — |
| 7 | Inspiration web & blueprint contextuel | ✅ FAIT | — | — |
| 8 | Blueprints d'arborescence par type | ✅ FAIT | — | — |
| 9 | Mode Architecte — Mango Plan | ✅ FAIT | — | — |
| 10 | Knowledge Flywheel (axiomes) | ✅ FAIT | — | — |
| 11 | Moodboard visuel automatisé | ✅ FAIT (v1) | — | — |
| 12 | Sélecteur MVP / Élite | ✅ FAIT | — | — |
| 13 | Audit & optimisation des coûts | 📅 2026-06-22 | 🧠 Opus 4.8 | M |
| 14 | Tableau de bord d'évolution (collecte) | 🔨 collecte active | ⚖️ Sonnet 4.6 | S |
| 15 | Veille & jouvence mensuelle | 📅 rappel actif | ⚖️ Sonnet 4.6 | M |
| 16 | Intégration GitHub native | ✅ FAIT | — | — |
| 17 | Intégration Supabase | ✅ FAIT | — | — |
| 18 | Déploiement étendu (Vercel + Netlify) | ✅ FAIT | — | — |
| 19 | Lab de prompts interactif | ✅ FAIT | — | — |
| 20 | Visualiseur de tokenisation | ✅ FAIT | — | — |
| 21 | Panneau de métriques avancé | ✅ FAIT | — | — |
| 22 | Agent de notes & RAG personnel | 💤 | 🧠 Opus 4.8 | L |
| 23 | Dashboard de veille IA automatisé | ✅ FAIT | — | — |
| 24 | Générateur de tests automatiques | ✅ FAIT | — | — |
| 25 | MCP Figma intégré | 🗑️ RETIRÉ | — | — |
| 26 | Mode multi-projets & composition | 💤 | 🧠 Opus 4.8 | XL |
| 27 | Click-to-Segment (SAM + VLM) | 💤 à phaser | ⚖️ Sonnet 4.6 | S |
| 28 | Clapet v4.0 — auto-élagage ablation | 💤 palier maturité | ⚖️ Sonnet 4.6 | M |
| 29 | Packaging bêta sans source | 💤 Phase B | 🧠 Opus 4.8 | XL |
| 30 | Mode Architecte v2 (PromptArchitect) | ✅ FAIT | — | — |
| 31 | Cloner depuis une URL (clone_url) | ✅ FAIT | — | — |
| 32 | Boucle d'entraînement nocturne | ✅ FAIT | — | — |
| 33 | `scrape_url` — aspirer info d'une URL | ✅ FAIT | — | — |
| 34 | Phase Finition + agent QA | ✅ FAIT | — | — |
| 35 | Backend généré (Express/Fastify) | ✅ FAIT | — | — |
| 36 | Bibliothèque de composants inter-projets | ✅ FAIT | — | — |
| 37 | Mode idéation visuelle (avant le code) | ✅ FAIT | — | — |
| 38 | Carte d'architecture vivante | ✅ FAIT | — | — |
| 39 | Paiements Stripe | ✅ FAIT | — | — |
| 40 | Invocation super-agent spécialisé | 💤 vision | 🧠 Opus 4.8 | XL |
| 41 | Signal humain 👍/👎 — RLHF personnel | ✅ FAIT | — | — |
| 42 | MangoAI cerveau personnel (3 couches identité) | ✅ FAIT | — | — |
| 43 | Escalade UX/UI par signal humain | ✅ FAIT | — | — |

### Roadmap haute couture — 11 chantiers

| # | Fonction | Statut | Modèle optimal | Effort |
|---|----------|--------|----------------|--------|
| A | Design system persistant | ✅ FAIT | — | — |
| B | Routing modèle automatique | ✅ FAIT | — | — |
| C | Agents autonomes (cron) | ✅ FAIT | — | — |
| 1 | Panel latéral pop-up (éditeur visuel) | ✅ FAIT | — | — |
| 1a | ↳ Modificateur de police | ✅ FAIT | — | — |
| 1b | ↳ Modificateur de couleur | ✅ FAIT | — | — |
| 1c | ↳ Sélecteur d'éléments | ✅ FAIT | — | — |
| 2 | Créateur de skills dans le panel | ✅ FAIT | — | — |
| 3 | Mode discret | ✅ DÉJÀ FAIT | — | — |
| 4 | Bouton micro (entrée vocale) | ✅ FAIT | — | — |
| 5 | Menu de mode dans le chat | ✅ FAIT | — | — |
| 6 | Menu d'accueil repensé | ✅ FAIT | — | — |
| 7 | Sélecteur de contexte fichier | ✅ FAIT | — | — |
| 8 | URL Analyser — Sharingan | ✅ FAIT | — | — |

### Phase Ultime — Jalons Compagnonnage

| Jalon | Contenu | Statut |
|-------|---------|--------|
| A — Coque Souple | Prompt dynamique `scenario.ts` | ✅ FAIT |
| B — Panneau métriques | Dashboard 📊 | ✅ FAIT |
| C — Contrat d'E/S | Coque Rigide `contract.ts` | ✅ FAIT (v1) |
| D — Branchement Élève | Qwen2.5-coder:14b via Ollama | ✅ FAIT |

---

## 🚀 Pour relancer après redémarrage

```bash
cd D:\IA\mangoai\server && npm run start
cd D:\IA\mangoai\ui && npm run dev
```
Puis ouvrir **http://localhost:5173**

**Élève local (facultatif — requis si cerveau « 🎓 Élève local ») :**
```bash
ollama serve
```
Modèle actif : `qwen2.5-coder:14b` (9 Go, D:\ollama\models)

**Tests déterministes utiles** (`cd server`) :
- `npx tsx src/audit-scan.ts` — scan rendement réel
- `npx tsx src/audit-scan.ts --ablate` — après un nouvel axiome
