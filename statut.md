# Statut — MangoAI

*Dernière mise à jour : 2026-06-15 — Vague 8 : phases 3 finales des idées #26 (recherche sémantique) & #40 (détection auto) ✅ — les deux idées 100 % terminées.*

> **🟢 Où on en est (2026-06-15)** — `qwen2.5-coder:14b` élu Élève (8.8/10, ~23 Go libérés). Session du 2026-06-15 (matinée) : idées #35 backend Express, #36 composants inter-projets, #38 archi vivante, #41 RLHF 👍/👎, #42 identité 3 couches, #43 escalade UX, #A design system, #8 Sharingan — tous ✅. Session du 2026-06-15 (validation finale) : #1 SidePanel + #1a police + #1b couleur + #1c sélecteur, #6 Home repensée, #B Routing modèle auto, #19 PromptLab, #20 Tokenizer, #23 Veille IA dashboard, #37 Idéation visuelle — tous ✅ livrés. Session du 2026-06-15 (vague 2) : #1 Agent QA temporel, #3 Généalogie visuelle, #4 Documentation multimodale, #39 Paiements Stripe, roadmap #2 Skills panel, #C Agents cron, #4 Bouton micro, #5 Menu mode, #7 Sélecteur contexte — tous ✅ livrés. Session du 2026-06-15 (vague 3) : #14 Dashboard d'évolution ✅ — KPI cards + graphique 21j + Élève vs Maître + distribution modèles + top projets + modes. Session du 2026-06-15 (vague 4) : #22 Agent de notes & RAG personnel ✅ — CRUD JSONL (POST/GET/DELETE /api/notes) + RAG Claude Haiku (/api/notes/ask, keyword match → top 5 → prompt). Session du 2026-06-15 (vague 5) : #2 Design pair-programming ✅ — POST /api/design-review (collecte jusqu'à 10 fichiers src, appel Sonnet 4.6, JSON structuré score+palette+typo+layout+composants+quickWins) + historique JSONL + DesignReview.jsx (ScoreBar, accordéons, QuickWinChips, HistoryCards). `tsc` 0, build UI OK (8s, 1938 modules). Session du 2026-06-15 (vague 6) : démarrage des 2 idées multi-phases restantes, **phase 1 chacune, en parallèle** (2 agents Sonnet, fichiers disjoints). #26 P1 ✅ — scanner élargi (6 dossiers, 4 extensions, champ `category`) + copy HTTP 409 anti-collision + UI badges/filtres/confirmation « Écraser ? ». #40 P1 ✅ — recherche web native Anthropic (`web_search_20260209`, fallback gracieux) injectée avant la génération + UI 2 étapes. Restent P2/P3 pour chacune. `tsc` 0, build UI OK (8.47s, 1943 modules). Session du 2026-06-15 (vague 7) : **phases 2 enchaînées, en parallèle**. #26 P2 ✅ — `multiProjectPromptSection` + `MULTI_PROJECT_RULES` injectés dans les 3 scénarios (l'agent voit les fichiers réutilisables de ses autres projets pendant le build, distincts du store curé `.components`) ; test 22/22 ; review.ts hors périmètre (injection proactive préférée). #40 P2 ✅ — route `POST /api/super-agent/:id/export` écrit un vrai `workspace/.skills/<slug>/SKILL.md` (frontmatter conforme à `skills.ts`, slug sécurisé) + bouton « Exporter en skill » ; détection auto par `listSkills` sans modif de skills.ts → un super-agent devient un skill proposé aux futurs builds. Restent P3 pour chacune. `tsc` 0, test 22/22, build UI OK (9.15s). Session du 2026-06-15 (vague 8) : **phases 3 finales enchaînées, en parallèle (2 agents Opus 4.8)** — #26 et #40 désormais **100 % terminées**. #26 P3 ✅ — recherche sémantique : `POST /api/multi-project/index` (résumé Haiku par fichier, incrémental par hash, cap 60/run, lots de 5) + `GET /api/multi-project/search` (keyword scoring) + UI toggle « Par nom / Sémantique » + bouton « Ré-indexer ». #40 P3 ✅ — détection auto : `matchAgentToProject` (recouvrement mots-clés nom+mémoire projet ↔ name+domain+tags agent, seuil 2) + `superAgentPromptSection` injecté dans les 3 scénarios (bloc « Expert spécialisé actif », tronqué 1500 chars) + `GET /api/super-agent/match` + badge « Actif sur <projet> ». `tsc` 0, test 22/22, build UI OK (9.06s). Session du 2026-06-15 (test e2e #26 P3) : indexation testée sur le vrai workspace (25 projets, 86 fichiers) — scan, incrémental, recherche, robustesse tous validés ; **garde-fou `degraded`** ajouté (un résumé en mode fallback est re-tenté, jamais figé). Résumé Haiku non démontrable en live : **compte API à court de crédits** (`400 credit balance too low`) — code/clé OK, blocage externe. `tsc` 0. Session du 2026-06-15 (index passé EN INTERNE) : moteur de résumé basculé de l'API Anthropic vers l'**Élève local Qwen/Ollama** (nouveau `ollama.ts`) → indexation sémantique **$0, 100 % locale, hors crédits**. Test e2e validé (qwen2.5-coder:14b, ~3-4s/fichier à chaud) : vrais résumés + recherche par le sens (`q=ninja`→Game.jsx, `q=conversation`→ChatMessage.jsx — mots absents des noms). Cap/lot configurables (`INDEX_MAX_FILES`/`INDEX_BATCH_SIZE`). `tsc` 0.
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
| 2 | Design pair-programming | ✅ FAIT | — | — |
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
| 14 | Tableau de bord d'évolution | ✅ FAIT | — | — |
| 15 | Veille & jouvence mensuelle | 📅 rappel actif | ⚖️ Sonnet 4.6 | M |
| 16 | Intégration GitHub native | ✅ FAIT | — | — |
| 17 | Intégration Supabase | ✅ FAIT | — | — |
| 18 | Déploiement étendu (Vercel + Netlify) | ✅ FAIT | — | — |
| 19 | Lab de prompts interactif | ✅ FAIT | — | — |
| 20 | Visualiseur de tokenisation | ✅ FAIT | — | — |
| 21 | Panneau de métriques avancé | ✅ FAIT | — | — |
| 22 | Agent de notes & RAG personnel | ✅ FAIT | — | — |
| 23 | Dashboard de veille IA automatisé | ✅ FAIT | — | — |
| 24 | Générateur de tests automatiques | ✅ FAIT | — | — |
| 25 | MCP Figma intégré | 🗑️ RETIRÉ | — | — |
| 26 | Mode multi-projets & composition | ✅ FAIT | — | — |
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
| 40 | Invocation super-agent spécialisé | ✅ FAIT | — | — |
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
