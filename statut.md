# Statut — MangoAI

*Dernière mise à jour : 2026-06-16 — Rapatriement de la **session d'atelier** (`session atelier.md`) : grand projet « Système Tutorial Orchestral » + 8 chantiers/idées issus de la session, injectés au tableau (#56→#64). Précédemment : TEST A/B « Mango Crypt » (apport de la pile de capacités, verdict consigné).*

> **🟢 Où on en est (2026-06-15)** — `qwen2.5-coder:14b` élu Élève (8.8/10, ~23 Go libérés). Session du 2026-06-15 (matinée) : idées #35 backend Express, #36 composants inter-projets, #38 archi vivante, #41 RLHF 👍/👎, #42 identité 3 couches, #43 escalade UX, #A design system, #8 Sharingan — tous ✅. Session du 2026-06-15 (validation finale) : #1 SidePanel + #1a police + #1b couleur + #1c sélecteur, #6 Home repensée, #B Routing modèle auto, #19 PromptLab, #20 Tokenizer, #23 Veille IA dashboard, #37 Idéation visuelle — tous ✅ livrés. Session du 2026-06-15 (vague 2) : #1 Agent QA temporel, #3 Généalogie visuelle, #4 Documentation multimodale, #39 Paiements Stripe, roadmap #2 Skills panel, #C Agents cron, #4 Bouton micro, #5 Menu mode, #7 Sélecteur contexte — tous ✅ livrés. Session du 2026-06-15 (vague 3) : #14 Dashboard d'évolution ✅ — KPI cards + graphique 21j + Élève vs Maître + distribution modèles + top projets + modes. Session du 2026-06-15 (vague 4) : #22 Agent de notes & RAG personnel ✅ — CRUD JSONL (POST/GET/DELETE /api/notes) + RAG Claude Haiku (/api/notes/ask, keyword match → top 5 → prompt). Session du 2026-06-15 (vague 5) : #2 Design pair-programming ✅ — POST /api/design-review (collecte jusqu'à 10 fichiers src, appel Sonnet 4.6, JSON structuré score+palette+typo+layout+composants+quickWins) + historique JSONL + DesignReview.jsx (ScoreBar, accordéons, QuickWinChips, HistoryCards). `tsc` 0, build UI OK (8s, 1938 modules). Session du 2026-06-15 (vague 6) : démarrage des 2 idées multi-phases restantes, **phase 1 chacune, en parallèle** (2 agents Sonnet, fichiers disjoints). #26 P1 ✅ — scanner élargi (6 dossiers, 4 extensions, champ `category`) + copy HTTP 409 anti-collision + UI badges/filtres/confirmation « Écraser ? ». #40 P1 ✅ — recherche web native Anthropic (`web_search_20260209`, fallback gracieux) injectée avant la génération + UI 2 étapes. Restent P2/P3 pour chacune. `tsc` 0, build UI OK (8.47s, 1943 modules). Session du 2026-06-15 (vague 7) : **phases 2 enchaînées, en parallèle**. #26 P2 ✅ — `multiProjectPromptSection` + `MULTI_PROJECT_RULES` injectés dans les 3 scénarios (l'agent voit les fichiers réutilisables de ses autres projets pendant le build, distincts du store curé `.components`) ; test 22/22 ; review.ts hors périmètre (injection proactive préférée). #40 P2 ✅ — route `POST /api/super-agent/:id/export` écrit un vrai `workspace/.skills/<slug>/SKILL.md` (frontmatter conforme à `skills.ts`, slug sécurisé) + bouton « Exporter en skill » ; détection auto par `listSkills` sans modif de skills.ts → un super-agent devient un skill proposé aux futurs builds. Restent P3 pour chacune. `tsc` 0, test 22/22, build UI OK (9.15s). Session du 2026-06-15 (vague 8) : **phases 3 finales enchaînées, en parallèle (2 agents Opus 4.8)** — #26 et #40 désormais **100 % terminées**. #26 P3 ✅ — recherche sémantique : `POST /api/multi-project/index` (résumé Haiku par fichier, incrémental par hash, cap 60/run, lots de 5) + `GET /api/multi-project/search` (keyword scoring) + UI toggle « Par nom / Sémantique » + bouton « Ré-indexer ». #40 P3 ✅ — détection auto : `matchAgentToProject` (recouvrement mots-clés nom+mémoire projet ↔ name+domain+tags agent, seuil 2) + `superAgentPromptSection` injecté dans les 3 scénarios (bloc « Expert spécialisé actif », tronqué 1500 chars) + `GET /api/super-agent/match` + badge « Actif sur <projet> ». `tsc` 0, test 22/22, build UI OK (9.06s). Session du 2026-06-15 (test e2e #26 P3) : indexation testée sur le vrai workspace (25 projets, 86 fichiers) — scan, incrémental, recherche, robustesse tous validés ; **garde-fou `degraded`** ajouté (un résumé en mode fallback est re-tenté, jamais figé). Résumé Haiku non démontrable en live : **compte API à court de crédits** (`400 credit balance too low`) — code/clé OK, blocage externe. `tsc` 0. Session du 2026-06-15 (index passé EN INTERNE) : moteur de résumé basculé de l'API Anthropic vers l'**Élève local Qwen/Ollama** (nouveau `ollama.ts`) → indexation sémantique **$0, 100 % locale, hors crédits**. Test e2e validé (qwen2.5-coder:14b, ~3-4s/fichier à chaud) : vrais résumés + recherche par le sens (`q=ninja`→Game.jsx, `q=conversation`→ChatMessage.jsx — mots absents des noms). Cap/lot configurables (`INDEX_MAX_FILES`/`INDEX_BATCH_SIZE`). `tsc` 0. Session du 2026-06-16 (routeur moteur switchable) : nouveau `llm-engine.ts` (`askLLM` unifiant claude/ollama/openai, provider par feature via `.env`). 4 features basculées : super-agent, design-review, Notes/RAG → défaut **claude** (abonnement, via `query()`) ; index → switchable, défaut **ollama**. Piège résolu : `ANTHROPIC_API_KEY` dans `.env` détournait `query()` vers les crédits → clé commentée. Test e2e super-agent via abonnement OK (agent « NutriPerf Sport », $0). `tsc` 0. Recherche web du super-agent **rebranchée sur l'abonnement** (`claudeWebResearch` = query + outil WebSearch) — `new Anthropic()` enfin retiré de `super-agent-builder.ts` ; e2e OK (« TechSEO Sentinel », tags actuels, $0). Design-review + Notes/RAG aussi validés e2e via abonnement. Session du 2026-06-16 (super-agent enrichi) : **fonction Édit** ajoutée au module #40 (route `PUT /api/super-agent/:id` mise à jour partielle + édition inline `AgentCard` via bouton crayon) — comble create/delete/export ; `tsc` 0, build UI OK. **Premier expert métier fabriqué** via l'atelier : **« ZeldaUX Pro »** (UX/UI senior jeux 2D façon Zelda, 8 disciplines + 6 outils, recherche web $0). Data runtime (`super-agents.json` & co.) désormais **gitignorée**. **Idée #44 actée (non faite)** : orchestration « conseil d'experts » lecture seule pour rattraper un projet dévié (N experts diagnostiquent → plan de reprise → 1 seul writer applique) — recommandée vs « 5 codeurs parallèles ». **Idée #45 actée + plan 3 phases** (détail dans `historique.md`) : contrat de langage du projet (= Ubiquitous Language) — lexique bidirectionnel naturel↔technique↔composant établi en amont (verrouille la structure, résout les retours flous), 2 portes (background naturel avec recherche web si domaine inconnu / questionnaire rigoureux), garde-fous auto-généré + vivant + ancré réel. **Session nuit du 2026-06-16 — 5 idées « prêtes à coder » livrées en 3 vagues (orchestration agents au modèle préconisé, fichiers disjoints en ∥) : #27 Click-to-Segment natif (overlay de segmentation au survol, sans SAM/VLM) ✅ · #28 Clapet v4.0 (ablationScore par axiome + impactScope + élagage gaté ≥5 axiomes de code, recommandation seule, dormant) ✅ · #46 Moodboard Sharingan réel (`sharingan_url` enfin branché dans `allowedTools` + capture des vraies valeurs hex/fonts/tokens) ✅ · #51 Sharingan-sur-image (`sharingan_image`, palette+ambiance d'une photo jointe via canvas Playwright) ✅ · #45 Contrat de langage (3 phases : `lexique.ts` + injection 3 scénarios + Porte A fire-and-forget + routes + panneau Mémoire) ✅. `tsc` 0, builds UI verts, tests déterministes verts à chaque vague. Restent en idées : #44, #48, #49, #50, #52. **Session du 2026-06-16 (suite) — idée #47 « Cadrage fondateur multimodal » ✅ livrée** : nouveau bloc nommé `cadrage` (Élite-only) dans `scenario.ts`, chef d'orchestre de la phase de démarrage — il n'ajoute pas de capacité, il ORCHESTRE celles déjà là (intention/Mango Plan #9 + contrat de langage #45 + références web Sharingan #46 + pièces jointes images/photo/PDF via vision #51) : INVENTAIRE des sources présentes → SOLLICITE les références manquantes une seule fois au bon moment → DIGÈRE chaque source avec le bon outil → TRIANGULE le tout dans une synthèse « Cadrage fondateur » de `plan.md`, en signalant les contradictions avant de coder. `CADRAGE_RULES` dans `plan.ts`, inséré avant `plan` dans le scénario elite. Test de gating étendu (18/18) : présent Élite, absent MVP/finition. `tsc` 0, build UI vert. **Puis idée #48 « Le Miroir » ✅ livrée** (aboutissement de #47) : porte de VALIDATION qui clôt le cadrage avant de coder. Nouveau module `miroir.ts` (artefact `.miroir.md`, même moule que #45, zéro réseau) + bloc nommé `miroir` (Élite-only, après `plan`) : le build agent écrit « Voici ce que j'ai compris de toi » (intention reformulée + palette RÉELLE extraite + ambiance + structure + langage + références digérées avec leur source), le présente et demande validation point par point ; il ne code l'app QU'après accord, sinon corrige `.miroir.md` et re-confirme. Routes `GET/PUT /api/miroir/:name` + section « Le Miroir » dans le panneau Connaissances avec **pastilles de palette réelles** (parse hex) + éditeur de correction. Tests `test-miroir.ts` 12/12 (extraction/dédup palette, persistance/cap) + gating 21/21. `tsc` 0, build UI vert. Restent en idées : #44, #49, #50, #52 (+ #53 après audit). **Puis idée #52 « Clarification proactive » ✅ livrée** : garde-fou « ancré sur le réel » de #45 rendu ACTIF. Nouveau module `clarification.ts` (`CLARIFICATION_RULES`, prompt-only, zéro état) + bloc nommé `clarification` câblé **dans les deux modes** (elite après `cadrage`, mvp après `moodboardMvp`), absent en finition (freeze). Mango vérifie activement les contradictions dit↔montré (mot « épuré » vs références chargées · ambiance/palette annoncée vs extraite · scope « petit site » vs PDF d'app complète · contradiction interne) et, sur une contradiction FRANCHE, pose UNE question courte nommant les deux camps + 2-3 options — au lieu de moyenner un truc bancal. Capé à 1 question en ⚡ MVP (philosophie ½ capacité), intégré au scoping + Miroir en 💎 Élite. Gating 24/24 (présent Élite+MVP, absent finition). `tsc` 0, build UI vert. **Pôle cadrage : cœur complet (#45/#46/#47/#48/#51/#52).** Restent : #49, #50 (⚖️ Sonnet) + #44 (🧠 Opus) + #53 (après audit #13). **Puis idée #49 « Cadrage qui apprend de toi » ✅ livrée (déléguée à un agent ⚖️ Sonnet, orchestrateur Opus vérifie)** : un nouveau projet HÉRITE des préférences récurrentes détectées sur les anciens. Nouveau module `preferences.ts` (workspace-level, artefact `.preferences.md`, moule de `design-system.ts`/`lexique.ts`, **askLLM abonnement $0, jamais `new Anthropic()`**) : `learnPreferences` agrège les signaux cross-projet (design system #A + identité langage/pensée #42 + chaque `.miroir.md` #48, capé 12 projets) et synthétise UNIQUEMENT les tendances RÉCURRENTES (ton, typo, layout, palette, habitudes UX) ; `preferencesPromptSection` les injecte comme défauts hérités, énoncés et SURCHARGEABLES — **zéro poids tant que `.preferences.md` est vide**. Bloc nommé `preferences` après `designSystem` dans elite+mvp (absent finition). Routes `GET/PUT /api/preferences` + `POST /api/preferences/learn` + ajout au knowledge. Section « Préférences apprises » (panneau Connaissances) avec bouton **Ré-apprendre** + éditeur. `test-preferences.ts` 16/16 + non-régression (scenario 24/24, miroir 12/12, lexique 18/18). `tsc` 0, build UI vert. **Pôle cadrage quasi terminé** : restent #50 (⚖️ Sonnet, banque de réfs) + #44 (🧠 Opus, conseil d'experts) + #53 (après audit #13). **Puis idée #50 « Banque de références perso » ✅ livrée (déléguée à un agent ⚖️ Sonnet, vérif Opus)** : mood library réutilisable cross-projet (même moule que #36 mais pour les inspirations). Nouveau module `references.ts` (`workspace/.references/<slug>/meta.json`, kinds url|image|palette + palette hex/tags/note/usedIn/ambiance) avec CRUD `listReferences/loadReference/saveReference/deleteReference/referenceImagePath/referencesSnapshot`, `slugify`+`isSafeSlug` (anti path-traversal, double-check du chemin résolu), `REFERENCES_RULES` (PROPOSE au cadrage / SAVE une inspi réutilisable / UPDATE usedIn / SKIP jetable) + `referencesPromptSection` (liste injectée quand non vide). Bloc `references` après `components` dans elite+mvp (absent finition). 6 routes (`GET` liste/:slug/:slug/image · `POST` meta · `POST` :slug/image multipart 10 Mo · `DELETE`) + knowledge. Section « Banque de références » (panneau) : cartes (titre/kind/tags/pastilles palette/vignette image/lien URL/suppr) + formulaire d'ajout. `test-references.ts` 35/35 (CRUD, tri, snapshot, section, **sécurité slug**, image) + non-régression (scenario 24/24, preferences, miroir, lexique). `tsc` 0, build UI vert. **🎉 Pôle cadrage COMPLET : #45/#46/#47/#48/#49/#50/#51/#52 tous ✅.** Restent hors cadrage : #44 (🧠 Opus, conseil d'experts) + #53 (après audit #13). **Puis idée #44 « Conseil d'experts » ✅ livrée (🧠 Opus, implémentée par l'orchestrateur)** : orchestration LECTURE SEULE pour rattraper un projet dévié. Nouveau `orchestrator.ts` (sur `askLLM` abonnement $0) : `gatherProjectContext` (snapshot borné read-only : plan.md + mémoire/archi/lexique/miroir + ~14 fichiers source capés), `buildCouncil` (5 lentilles fixes — archi/produit/UX/données/robustesse — + le super-agent #40 matché comme lentille métier), `diagnose` (chaque lentille audite sous son seul angle, en ∥, erreurs avalées → une lentille morte ne tue pas le conseil), `synthesizeRecoveryPlan` (fusion des DIAGNOSTICS texte → plan de reprise priorisé, facile vs fusion de code = merge hell évité). Le seul fichier écrit est le DOC `.recovery-plan.md` (jamais de code) ; bloc nommé `recovery` (elite+mvp, zéro poids si absent) l'injecte pour que le builder = SEUL writer l'applique SÉQUENTIELLEMENT. Routes `POST/GET/DELETE /api/council/:name` + section « Conseil d'experts » (panneau) : textarea problème + bouton Convoquer → plan de reprise + diagnostics dépliables + « rattrapage terminé ». `test-orchestrator.ts` 18/18 + non-régression (toutes suites vertes). `tsc` 0, build UI vert. **Tableau prioritaire VIDÉ : il ne reste que #53 (gouvernance, après l'audit #13 du 22/06) et les 💤 Phase B (#11, #29).** **Nouvelle idée #53 « Carte des capacités » ajoutée (pour plus tard, après l'audit #13) : synthèse vivante de toutes les compétences de Mango + leur poids → arbitrer quelle capacité dans quel mode/phase selon le coût.** **Session du 2026-06-16 (soir) — TEST A/B « Mango Crypt » exécuté (driver `drive-game-test.ts`, backend piloté en SSE, modèle CONSTANT `sonnet` A et B → seule variable = la pile Mango).** Build B (MVP nu, 2 phases) : 2/2 OK, ~4,72 $, 43 turns, 27 min. Build A (Élite-full → Finition, 6 phases) : 6/6 OK, 12,13 $, 132 turns, 57 min. **Les DEUX builds atteignent la complétude fonctionnelle** (toutes les features de la spec présentes). **Différenciateurs RÉELS de la pile** (mesurés sur livrables, les deux buildent `vite build` ✅) : **tests 0 → 154** (7 fichiers, 1287 l., tous verts) · **dette technique** monolithe MVP (`GameCanvas.jsx` 692 l. + `renderer.js` 585 l.) vs Élite modulaire (plus gros fichier 209 l., arbo entities/systems/world/render/screens) · **robustesse** Élite durcie en Finition (localStorage try/catch, seed NaN, a11y clavier 100 %, WCAG AA, responsive 320px, 6 edge cases) vs 0 passe MVP · **cohérence de nommage** contrat de langage Élite explicite (idee.md : run/seed/room/heart/i-frame/fog) tenu jusque dans les noms de fichiers · **artefacts de cadrage** Élite (idee.md + Miroir + plan.md) absents du MVP. **Coût : ×2,5 / temps ×2.** **Verdict : pour un MVP jetable → B ; pour un produit qu'on garde/fait évoluer → A nettement supérieur (code testé, modulaire, durci ; le MVP serait à refactorer avant toute Phase 2).** **Investigation boucle vision (→ alimente #53)** : faux signal corrigé — le dossier `.snapshots/` est un scratch **purgé à chaque tour** (`setVisionContext`), le lire post-build ne mesure que le DERNIER tour. Via les logs driver : la boucle vision a bien tourné dans les deux (Élite **5** captures sur 6 phases, MVP 3 sur 2). **Vraie observation** : Élite SOUS-exploite son budget vision (5 captures alors que budget = 10/tour, ≈60 possibles) — pour un jeu **canvas** un snapshot statique ne montre ni déplacement ni combat (besoin d'input clavier live), donc la capacité « boucle vision » est intrinsèquement faible sur ce type de produit interactif. **À nourrir dans #53 : capacités qui ont VRAIMENT pesé = contrat de langage + Mango Plan + tests auto + Finition/QA ; capacités diffuses/non mesurables sur livrables = moodboard Sharingan, super-agent ZeldaUX, boucle vision (faible sur canvas).** **Session d'atelier rapatriée (2026-06-16) : `session atelier.md` (fait sur l'autre poste, remote `atelier`) digéré et injecté ici → 9 nouvelles entrées #56→#64. Tête de file = le grand projet approuvé #56 « Système Tutorial Orchestral » (10 tutoriels 0→100 % de liberté, double apprentissage, détail dans `TUTORIAL-PLAN.md`). Ordre de marche recommandé par le brief : (1) #57 Indépendance fournisseur LLM [prioritaire, 2-3h] → (2) #56 Tutoriel Chantier A → (3) #61 Notes & Voix → (4) #58 Automation nocturne + #59 juge → (5) #60 Radar IA. Règle git de l'atelier gravée : remote `origin`=mangoai (principal, intouchable), `atelier`=miroir ; JAMAIS de pull/push autonome, uniquement sur demande explicite de Raf.**
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
| 27 | Click-to-Segment (overlay natif, sans SAM/VLM) | ✅ FAIT | — | — |
| 28 | Clapet v4.0 — auto-élagage ablation | ✅ FAIT | — | — |
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
| 44 | Orchestration « conseil d'experts » (rattrapage projet dévié, lecture seule) | ✅ FAIT | — | — |
| 45 | Contrat de langage du projet (lexique bidirectionnel humain↔technique ; Porte A background + Porte B fusionnée dans Mango Plan #9) | ✅ FAIT | — | — |
| 46 | Moodboard VISUEL réel via Sharingan #8 (capture auto des leaders dans Mango Plan, comble le "planned enhancement" de MOODBOARD_RULES) | ✅ FAIT | — | — |
| 47 | Cadrage fondateur multimodal (chef d'orchestre : intention + contrat #45 + références web #46 + pièces jointes images/PDF via `uploads.ts` → `plan.md`) | ✅ FAIT | — | — |
| 48 | Le Miroir — « voici ce que j'ai compris de toi » : récap visuel validable avant de coder | ✅ FAIT | — | — |
| 49 | Cadrage qui apprend de toi — héritage cross-projet des préférences récurrentes (#42 + #A) | ✅ FAIT | — | — |
| 50 | Banque de références perso (mood library réutilisable — `.assets`, esprit #36) | ✅ FAIT | — | — |
| 51 | Sharingan-sur-image — extraire palette/ambiance d'une photo jointe comme d'une URL (`vision.ts`) | ✅ FAIT | — | — |
| 52 | Clarification proactive — Mango signale les contradictions au cadrage (#9 + #43) | ✅ FAIT | — | — |
| 53 | **Carte des capacités** — synthèse vivante de TOUTES les compétences de Mango (blocs prompt `scenario.ts`, outils MCP, skills, super-agents, modes, Mango Plan, contrat de langage, extraction…) avec leur POIDS (tokens/latence) → vue d'ensemble après l'audit #13 pour arbitrer par phase/mode : réintégrer ou retirer une capacité selon son coût | 💡 idée · pour plus tard (après audit #13) | 🧠 Opus 4.8 | L |
| 54 | **Élève local Gemma 4** — intégrer **Gemma 4 12B** (unifié, ~6,7 Go en Q4, donc plus léger que Qwen 14B actuel ≈ 9 Go, **vision+audio natifs**, contexte **256K**, function calling agentique, Apache 2.0) comme Élève **sélectionnable** via le moteur switchable `llm-engine.ts` + entrée sélecteur UI + **benchmark Qwen vs Gemma 4** sur tâches réelles (code/vision/indexation) → décider sur données l'Élève par défaut. **E4B (4,5 Go)** en repli ultra-léger. (`ollama pull` lancé par l'utilisateur.) **Périmètre décidé : env-switch + benchmark, SANS nouvelle UI.** Code livré (profil `models/gemma.ts` Write-only + benchmark `compare-eleves.ts` déjà là) ; reste runtime côté utilisateur : pull → benchmark Qwen vs Gemma → `ELEVE_MODEL` si Gemma gagne. | 🚧 code prêt · bascule au benchmark | ⚖️ Sonnet 4.6 | S |
| 55 | **Fine-tuning LoRA de l'Élève** — le VRAI palier « auto-amélioration du *modèle* » (vs #32 qui n'apprend qu'au niveau système). Constituer un dataset à partir des **runs validés** de la boucle nocturne #32 (`.train.jsonl` + projets gardés + escalades Élève→Maître = paires « tâche → bonne solution Claude ») → entraîner un **adaptateur LoRA local** sur l'Élève (Qwen/Gemma 4) → l'Élève code *réellement* mieux nuit après nuit, ses poids évoluent. Aujourd'hui #32 = pratique/éval/axiomes, **zéro mise à jour de poids**. Infra ML (dataset, LoRA, éval avant/après, garde-fou régression). Exploratoire. | 💡 idée · plus tard (exploratoire) | 🧠 Opus 4.8 | XL |
| 56 | **Système Tutorial Orchestral** — 10 tutoriels progressifs (liberté **0 → 100 %**), **double apprentissage** (Mango apprend Raf ↔ Raf apprend Mango), chantiers A→D. Plan complet dans `TUTORIAL-PLAN.md`. **Chantiers A+B ✅** : A = squelette navigable + persistance + tutos 1-2 ; B = `TutorialSpotlight` (trou + beacon + gradient de liberté **0=couloir bloquant → 100=ouvert**, marqueurs `data-tour` sur Home/Header/Preview), `TutorialRelationshipCard` de fin (jauge X/10 + capacités découvertes), enchaînement auto du tuto suivant. Restent C (feedback→axiomes `[tutoriel-N]` + bloc `scenario.ts` + mini-review), D (tutos 3-10) | 🚧 Chantiers A+B ✅ · C/D à venir | 🧠 Opus 4.8 | XL |
| 57 | **Indépendance fournisseur LLM** — 6 features one-shot (feedback, qa-temporal, ideation, docgenerator, cron + déjà-faites) routées par `askLLM` ; alias providers **deepseek/mistral/groq** (presets OpenAI-compat + clé dédiée) ; `REVIEW_MODEL` configurable. Défaut `claude`/abonnement. Génération principale = voie Claude (`query()`) + voie Élève (Ollama/OpenAI) déjà en place ; `promptlab` laissé hors scope (comparateur 3 modèles Claude) | ✅ FAIT (2026-06-16) | ⚖️ Sonnet 4.6 | S |
| 58 | **Automation nocturne + review matinale** (Human-in-the-Loop) — nuit : génère 5 projets ; matin : **galerie de review** (garder/supprimer) + questionnaire structuré par projet → axiomes. Sur cron #C + train-loop #32 + feedback #41 + metrics. **APRÈS #56** (impératif : sans calibration, projets génériques) | 💡 approuvé (après #56) | 🧠 Opus 4.8 | L |
| 59 | **Juge nocturne esthétique** (RLAIF) — Haiku note chaque projet nocturne **/10 sur 5 axes** (design / fonctionnel / originalité / cohérence profil / qualité code) → pré-filtre, Raf ne voit que les > 6/10. Sous-composant de #58 (quelques centimes/nuit) | 💡 (avec #58) | ⚖️ Sonnet 4.6 | M |
| 60 | **Radar IA hebdomadaire** — cron lundi 6h → fetch Anthropic/HuggingFace/GitHub/r/LocalLLaMA → Haiku filtre « pertinent pour MangoAI ? » → brief structuré (modèles/API/outils/prix) + vue « Radar IA ». Sur cron #C + `llm-engine`. Étend la veille #15/#23 au plan **techno** | 💡 approuvé (après #56/#58) | ⚖️ Sonnet 4.6 | M |
| 61 | **Améliorations Notes & Voix** — bouton **micro** dans NotesRAG (route `/api/transcribe` Whisper existe déjà), micro flottant global, tags auto Haiku, **embeddings Ollama + injection bloc `notes` dans `scenario.ts`** (game changer : notes = mémoire active), notes par projet, édition en place. Étend #22 + débloque le Whisper WIP | 💡 (après Chantier A #56) | ⚖️ Sonnet 4.6 | M |
| 62 | **Bloc self-critique** (Constitutional AI explicite) — nouveau bloc nommé `self-critique` (Élite) : avant de livrer, l'agent passe le code au crible des **axiomes + profil** (= constitution de Raf) et propose ses propres corrections. Rend explicite ce que la Coque Souple fait déjà implicitement | 💡 (notion théorique à rendre active) | ⚖️ Sonnet 4.6 | S |
| 63 | **Chantier « Clé USB »** — launcher `MangoAI.exe` double-clic (**Tauri** ou pkg) : vérifie/installe Node + Ollama, setup guidé (clés/préférences), lance serveur + ouvre le navigateur. Transforme MangoAI en produit installable par un non-développeur. Adhérence avec #29 (packaging Phase B) | 💤 Phase B | 🧠 Opus 4.8 | XL |
| 64 | **Protection du code B2B** — pour la distribution chez des clients : **bytecode Node** (bytenode, `.jsc`) + **binaire** (pkg/Tauri) + **clé d'activation par client** + **workspace chiffré**. Posture honnête : la vraie protection est structurelle (le code sans les axiomes/profil de Raf = moteur sans carburant). Adhérence avec #29 | 💤 Phase B | 🧠 Opus 4.8 | L |

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
