# Statut — MangoAI

*Dernière mise à jour : 2026-06-13 (session mode vision avancé — jalon 2)*

## 💡 Idées en attente — à relire avant de commencer à coder

| # | Idée | Détail | Priorité | Statut |
|---|------|--------|----------|--------|
| 1 | **Agent QA temporel** (time-travel debugging visuel) | Capturer des séquences animées (mini-vidéos/GIF 3-5 s via Playwright) pendant les simulations : analyser transitions CSS, boucles d'animation, bugs de collision en mouvement — au-delà de la capture statique | à définir | 💤 en attente |
| 2 | **Design pair-programming** (canevas collaboratif) | L'agent dessine un calque semi-transparent sur l'aperçu live pour MONTRER ses propositions (re-paddings, déplacements de boutons) avant d'écrire le moindre patch | à définir | 💤 en attente |
| 3 | **Généalogie visuelle** (rollback graphique) | Associer chaque version git à sa snapshot de validation → time-line visuelle type Figma : survoler l'historique, comparer les rendus passés, rollback d'un clic sur l'image | à définir | 💤 en attente |
| 4 | **Documentation multimodale autonome** | À la clôture d'un grand jalon, l'agent recycle ses captures/crops/zooms pour rédiger seul un guide illustré ou un changelog visuel (captures fléchées et expliquées) | à définir | 💤 en attente |
| 5 | **Information complète sur l'utilisation de MangoAI** | Guide utilisateur complet de MangoAI : tout ce qu'on peut faire (chat, modèles, 📎 pièces jointes, Snap, versions/rollback, publier, export…), comment et quand s'en servir | à définir | 💤 en attente |
| 6 | **Modèles full-stack par type de création** | Un modèle prédéfini optimisé pour chaque style de projet — site web, jeu (mobile/web), web app, présentation type PowerPoint/slides, dashboard type Excel, etc. — stack, structure et libs déjà choisies pour aller droit au but (extension du système de starters actuel) | à définir | 💤 en attente |
| 7 | **Inspiration web & blueprint d'arborescence contextuelle** | Ex. « site de paris sportifs » : à la première requête, MangoAI cherche sur le web les ~5 plus gros sites du domaine, capture 1-2 écrans de chacun (Playwright), brainstorme sur ces références et en déduit un blueprint d'arborescence contextuelle (pages, sections, navigation propres au domaine) pour générer un modèle de base très proche de l'état de l'art — zéro base de templates à stocker, l'inspiration est récupérée à la volée | à définir | 💤 en attente |
| 8 | **Blueprints d'arborescence de base par type de projet** | Pour chaque type (site web, slides type PowerPoint, jeu, dashboard…), l'arborescence de fichiers est presque toujours la même — des standards existent déjà dans le monde actuel. Définir ces squelettes prédéfinis (structure de dossiers/fichiers type) que l'agent suit par défaut, tout en gardant une marge de manœuvre pour s'en écarter quand le projet le demande. Complément structurel de l'idée 6 (stacks) et de l'idée 7 (contenu contextuel) | à définir | 💤 en attente |
| 9 | **Mode Architecte & idéation guidée — « Mango Plan »** | Module d'avant-projet qui sépare la conception du codage : l'utilisateur pose ses idées en quelques phrases (ou via écoute active / questions chirurgicales de l'IA) ; en tâche de fond, MangoAI synthétise l'intention dans un `plan.md`/`intentions.json`, dresse l'arborescence cible (blueprint, cf. idées 7-8) et présélectionne les assets. La génération finale est épurée et rapide car guidée par un plan validé en amont — zéro dette technique | haute | 💤 en attente |
| 10 | **Knowledge Flywheel — clapet anti-retour de connaissance** | Faire évoluer la boucle d'apprentissage (revue + skills) vers un registre d'**axiomes logiques universels** : à la fin de chaque tâche/correction visuelle/blueprint validé, interdiction de noter des faits divers techniques (« modifié la ligne 42 du CSS ») — extraction obligatoire au format `AXIOME-[CATÉGORIE]-[ID]` : contexte abstrait + piège invisible + règle d'or, indépendant du langage et du projet. Philosophie : accumuler l'expérience sans s'alourdir, jamais régresser, zéro « gras » informationnel (détail complet : `D:\IA\fichier tampon session\kwolegede flywheel.md`). **⚠ Garde-fous obligatoires (discussion 2026-06-13)** : le clapet est anti-oubli, PAS anti-correction — axiomes datés et falsifiables (une contradiction observée = amendement/suppression), niveaux de maturité (candidat → confirmé), l'axiome est un défaut que la demande utilisateur écrase toujours, plafond du registre pour forcer la curation | à définir | 💤 en attente |
| 11 | **Moodboard visuel automatisé** (inspiration & benchmark) | Concrétisation de l'idée 7 au sein de Mango Plan (idée 9) : dès le type de projet validé, en tâche de fond — (1) recherche web des leaders/concepts clés (ex. *Vampire Survivors* + foot), (2) captures autonomes via Playwright headless, (3) stockage éphémère dans `.assets/.moodboard/` (hors git/zip), (4) corrélation visuelle → règles de design extraites (palette, placement des menus, type de caméra), (5) purge complète du dossier une fois le plan validé. Effet : standards de design réels dès le premier commit, zéro hallucination UI, projet local ultra-léger | à définir | 💤 en attente |
| 12 | **Sélecteur de mode ⚡ MVP / 💎 Élite** | Un bouton dans le header (comme le choix du modèle) qui pilote le compromis temps/qualité par tâche : mode MVP = flux actuel rapide (pas de plan, boucle visuelle minimale) ; mode Élite = tout l'arsenal (Mango Plan, moodboard, boucle visuelle complète, QA temporel, calques). Deux axes orthogonaux : quel cerveau (modèle) × quelle exigence (mode). **Prérequis des idées 1, 2, 9, 11** : à implémenter en premier pour que chaque future fonctionnalité naisse branchée sur l'interrupteur ; protège aussi le quota Claude | **haute** | 💤 en attente |
| 13 | **Audit & optimisation des coûts de l'agent** — *programmée : à partir du 2026-06-22* | Étudier la marge d'optimisation propre à l'agent avec des métriques réelles (collectées par l'idée 14) : traque des relectures redondantes, réduction du nombre de tours, consolidation chirurgicale du system prompt (~33k incompressibles, 15-25 % à gagner), réglage du thinking par classe de tâche. **Date choisie : fin de disponibilité de Fable le 22 juin** — moment idéal pour mesurer comment les sessions de développement MangoAI tournent sur Sonnet ou Opus et analyser l'historique de consommation accumulé d'ici là | moyenne | 📅 planifiée (2026-06-22) |
| 14 | **Tableau de bord d'évolution** (métriques avant/après) | Suivre MangoAI comme un humain en plein apprentissage : courbe d'apprentissage (coût moyen et tours par type de tâche dans le temps — vérifie la promesse du Knowledge Flywheel), fiabilité (taux d'erreurs, auto-réparations, rollbacks), marque datée de chaque jalon sur la courbe (avant/après chiffré). **Volet 1 — collecte : ✅ FAIT (2026-06-13)** : chaque tour ajoute une ligne JSON à `workspace/.metrics.jsonl` (date, projet, modèle, coût, tours, tokens, snapshots, durée, erreur) via `server/src/metrics.ts`. Volet 2 — visualisation (panneau 📊, courbes par semaine et type de tâche) : plus tard, nourrit l'audit du 22 juin | moyenne | 🔨 collecte active |

| 15 | **Veille & jouvence** — *rappel mensuel obligatoire* | Passe périodique (mensuelle ou à la demande) : vérifier les versions du SDK Agent (@anthropic-ai/claude-agent-sdk), des modèles disponibles, du template React/Vite/Tailwind et de l'écosystème MCP ; appliquer les mises à jour, relancer les tests e2e, noter dans le changelog ce qui a changé. Garantit le « toujours à la page » sans dépendre d'une mise à jour automatique. **Rappel mensuel actif** : déclenché le 13 de chaque mois dans Claude Code | **haute** | 📅 rappel mensuel actif |

*Source : `D:\IA\idée d'amelioration MangoAi.md.md` — vision long terme : passer d'un agent réactif à un système autonome prédictif et collaboratif.*

## ✅ Fait et fonctionnel
- MVP complet testé de bout en bout (génération pizzeria + itération avec contexte)
- Backend Express + Claude Agent SDK (port 3000) — auth via login Claude Code local, pas de clé API
- UI builder chat + aperçu live (port 5173), apps générées servies sur le port 5174
- Sessions persistées par projet (`server/sessions.json`) — reprise après redémarrage
- Sélecteur de projets existants (datalist dans le header)
- Bouton ■ Stop (interruption de l'agent en cours)
- Choix du modèle dans l'UI (⚡ Haiku / ⚖️ Sonnet / 🧠 Opus) — changeable en cours de session
- Export ⬇ Zip du projet généré (sources sans node_modules)
- Versions & rollback git — commit auto après chaque itération de l'agent, menu « ↩ Versions » pour revenir en arrière
- Historique de chat persisté par projet — le chat se recharge à l'ouverture du projet, survit au rollback
- Auto-réparation des erreurs — les erreurs runtime de l'app générée remontent dans un bandeau ⚠, bouton « 🔧 Corriger » qui les envoie à l'agent
- Templates de démarrage — 4 starters (vitrine, e-commerce, dashboard, blog) sélectionnables à la création d'un projet
- Déploiement 1-clic — bouton « 🚀 Publier » vers Cloudflare Pages (nécessite `npx wrangler login` une fois)
- **Refonte UI complète** — Tailwind v4 + lucide-react + react-markdown : écran d'accueil (hero, templates, projets récents), workspace repolie (dropdowns, toasts, modal, mode mobile)
- **Boucle d'apprentissage Hermes (5/5)** — mémoire par projet, profil utilisateur inter-projets, skills apprises, revue silencieuse en arrière-plan après chaque tâche, subagents `builder` parallèles (détail : roadmap Hermes ci-dessous)
- **Panneau « 🧠 Mémoire »** dans le header — voir d'un clic ce que MangoAI sait : le projet, vous, les skills (`GET /api/knowledge/:name`)
- **Compression de contexte** (context_compressor d'Hermes transposé) — mesure du contexte à chaque tour, compaction proactive en arrière-plan au-delà de 70 % (`server/src/compaction.ts`, résumé en haiku via /compact), jauge de contexte dans le header, ligne « 🗜 » dans l'historique
- **Raisonnement analytique (Opus/Sonnet)** — extended thinking adaptatif natif du SDK (`thinking: adaptive/summarized`) + règles d'analyse dans le system prompt (3 hypothèses, auto-critique, plan avant code) ; blocs « 🧠 Réflexion » repliables dans le chat, persistés dans l'historique
- **Robustesse des magasins (jalon 1)** — validation stricte à l'exécution de `sessions.json`, `.chat-history.json` et des frontmatters `SKILL.md` (guards TS, plafonds anti-inondation du prompt), écritures atomiques (`server/src/safe-io.ts`), filet global `unhandledRejection`/`uncaughtException` : aucun fichier corrompu par la revue d'arrière-plan ne peut plus planter un tour ni le serveur. Isolation des outils vérifiée : tout (outils agent, revue, compaction, Vite, git, wrangler) tourne en subprocess — le crash d'un outil ne touche jamais le process serveur
- **Mode vision avancé en boucle fermée (jalon 2)** — entrées multimodales (📎 images/PDF dans le chat → `.assets/`, lus nativement par Read) + tool `snapshot` MCP in-process (`server/src/vision.ts` : Playwright msedge, crop par sélecteur/box, zoom ×1-3, budget par tour façon IterationBudget d'Hermès) + boucle « patch → snapshot → critique → crop zoomé → re-patch » pilotée par le system prompt ; hygiène contexte (purge `.snapshots/` par tour, compaction qui jette les images analysées). Validé e2e : l'agent a détecté À L'ŒIL un bandeau recouvert par la nav fixed et l'a corrigé seul
- **Tailwind v4 préinstallé** — chaque nouveau projet embarque Tailwind v4 (`@tailwindcss/vite`) ; le clonage d'UI depuis une maquette jointe se fait en utilities Tailwind, le CSS pur reste la règle pour les sites simples ; starters préservés (import sans preflight)
- **Bouton Snap** — capture interactive d'une zone de l'aperçu : overlay + rectangle au glisser, le backend re-rend l'aperçu à la taille de l'iframe et croppe la zone (`POST /api/snap`, PNG ×2), l'image rejoint les pièces jointes (vignette dans le chip) ; double analyse OCR + visuel par l'agent
- Dépôt GitHub privé à jour : https://github.com/u2987920406-rgb/mangoai
- **Business model & plan d'action livrés** : `business-model.pdf` (13 pages, source `business-model.html`) — comparaison des 3 pistes de monétisation, recommandation (piste A agence/freelance), plan 90 jours

## 🗺️ Roadmap — surpasser Lovable/Emergent (analyse 2026-06-12)

**Avantages structurels déjà acquis** (aucun concurrent ne peut copier) :
- Coût marginal zéro + itérations illimitées (abonnement Claude vs crédits payants)
- Moteur = preset `claude_code` (le même agent que les pros, pas un agent propriétaire bridé)
- Code 100 % local, propriété totale, confidentialité — argument de vente piste A

**Améliorations par priorité (effort/impact)** :
1. ✅ **Rollback par git auto-commit** — FAIT (2026-06-12) : commit auto après chaque itération (`server/src/versions.ts`), menu « ↩ Versions » dans le header, endpoints `/api/versions/:name` + `/api/rollback`
2. ✅ **Historique de chat persisté** — FAIT (2026-06-12) : messages sauvegardés par projet (`workspace/<projet>/.chat-history.json`, exclu du git et du zip), rechargés à l'ouverture du projet, endpoint `GET /api/history/:name`
3. ✅ **Auto-réparation des erreurs** — FAIT (2026-06-12) : script relais injecté dans les apps générées (`server/src/relay.ts`), erreurs runtime remontées à l'UI via postMessage, bandeau ⚠ + bouton « 🔧 Corriger » qui envoie les erreurs à l'agent
4. ✅ **Templates de démarrage** — FAIT (2026-06-12) : 4 templates (🏪 vitrine, 🛒 e-commerce, 📊 dashboard, 📝 blog) dans `server/templates/`, superposés au template de base à la création, sélecteur 📦 dans l'UI (visible pour les nouveaux projets)
5. ✅ **Déploiement 1-clic** — FAIT (2026-06-12) : bouton « 🚀 Publier » → build + Cloudflare Pages (`server/src/deploy.ts`, wrangler), URL `https://<projet>.pages.dev` affichée dans le header. Compte Cloudflare connecté (wrangler login fait le 2026-06-12) — testé et validé par l'utilisateur ✅
6. *(Plus tard)* **Supabase** pour apps avec données/auth — autoriser dans le system prompt

❌ Écarté : édition visuelle WYSIWYG (énorme effort, pas là que se joue la valeur)

## 🧠 Roadmap — niveau Hermes Agent (analyse 2026-06-12)

**Contexte** : Hermes Agent (Nous Research) est open source MIT — code complet étudié dans `C:\Users\PC-DELL\hermes-agent-study` (clone). Sa connexion Claude exige plan Max + crédits payants ; MangoAI garde son avantage coût zéro (login Claude Code local) en réimplémentant ses concepts.

**Mécanismes clés extraits du code source** :
- **Mémoire curée par l'agent** (`tools/memory_tool.py`) : 2 fichiers — MEMORY.md (faits projet/environnement) + USER.md (préférences utilisateur) — injectés en *frozen snapshot* au début de session (le prompt reste stable → cache préservé) ; limites en caractères, pas en tokens
- **Nudge périodique** (`agent/turn_context.py`) : tous les 10 tours, déclenche une **revue en arrière-plan** (`agent/background_review.py`) APRÈS la livraison de la réponse — ne ralentit jamais l'utilisateur
- **Prompts de revue** : « que sauver » (préférences, corrections de l'utilisateur = signaux de premier ordre) et surtout « que NE PAS sauver » (erreurs transitoires corrigées, échecs liés à l'environnement, récits de tâches ponctuelles) — transposés dans `server/src/memory.ts`
- **Skills auto-créées** (`tools/skill_manager_tool.py`) : SKILL.md niveau « classe de tâche » + `references/`/`templates/`/`scripts/`, divulgation progressive (métadonnées dans le prompt, contenu à la demande), nudge après 10 itérations d'outils
- **Subagents** : enfants isolés, intersection des toolsets, résultats via callbacks ; **cron** : jobs.json + tick()

**Améliorations par priorité (effort/impact pour un builder d'apps)** :
1. ✅ **Mémoire par projet** — FAIT (2026-06-12) : `workspace/<projet>/.memory.md` curé par l'agent lui-même (règles dans le system prompt : quoi sauver / quoi ne pas sauver, fusion plutôt qu'ajout), snapshot injecté à chaque tour (`server/src/memory.ts`), exclu du git projet/zip, survit au rollback
2. ✅ **Profil utilisateur global** — FAIT (2026-06-12) : `workspace/.user-profile.md` (équivalent du USER.md d'Hermes), injecté dans le system prompt de chaque tour de chaque projet. La revue en arrière-plan route chaque préférence vers le bon magasin : générale (« de manière générale », « toujours », goût récurrent) → profil ; spécifique → mémoire du projet. Hors git (workspace/ ignoré), plafond 3 000 caractères
3. ✅ **Skills apprises** — FAIT (2026-06-12) : bibliothèque `workspace/.skills/<nom-classe>/SKILL.md` (frontmatter name/description + le code qui a marché), curée par la revue en arrière-plan (ordre d'Hermes : patcher > enrichir > créer, noms niveau classe, posture active). **Divulgation progressive** : seuls nom + description injectés au system prompt, l'agent lit le SKILL.md à la demande (`server/src/skills.ts`). Première skill créée toute seule : `accordeon-faq`, visible et proposée depuis les autres projets
4. ✅ **Revue en arrière-plan** — FAIT (2026-06-12) : `server/src/review.ts` — après chaque tour réussi, un agent haiku silencieux relit le transcript et cure `.memory.md` (signaux de premier ordre : préférences et corrections de l'utilisateur ; interdits : erreurs transitoires, récits ponctuels). Zéro latence pour l'utilisateur, ~$0.02-0.04/revue, pas de récursion (la revue n'est pas revue), ligne « 🧠 Mémoire du projet mise à jour » dans l'historique. L'agent principal ne cure plus la mémoire lui-même (sauf demande explicite)
5. ✅ **Subagents parallèles** — FAIT (2026-06-12) : agent `builder` défini via l'option `agents` du SDK (outils fichiers seulement, pas de Bash — pas de conflit npm/dev server entre builders). L'agent principal délègue les grosses demandes à volets indépendants et intègre le résultat ; consigne « pas de délégation pour les petits changements » (surcoût). Validé : 2 sections construites par 2 builders en parallèle (sonnet, $0.75), app compile. Outil `Agent` affiché 🤖/Bot dans le chat. *(Tâches planifiées : plus tard si besoin)*
6. Système prompt durci : interdiction des commandes git à l'agent (le backend versionne déjà chaque tour)

## 🔜 Aussi à faire
1. ✅ **Compression de contexte** — FAIT (2026-06-12) : `server/src/compaction.ts` — le SDK détient l'historique (pas de liste de messages à découper comme Hermes), donc transposition des CONCEPTS : taille du contexte mesurée sur le dernier appel API de chaque tour (`agent.ts` → événement `result`), au-delà de 70 % de la fenêtre un `/compact` tourne en arrière-plan après la livraison (zéro latence, résumé écrit par haiku, instructions de préservation style Hermes) ; un nouveau message de l'utilisateur interrompt la compaction (best-effort) ; anti-thrashing ; jauge de contexte dans le header (vert/orange/rouge) ; ligne « 🗜 Contexte compressé (42k → 6k tokens) » dans l'historique. Testé e2e : compaction réelle vérifiée dans le transcript (`compact_boundary`), reprise de session avec souvenirs intacts ✅. Seuil réglable via env `COMPACT_THRESHOLD`
2. ✅ **Raisonnement analytique pour Opus/Sonnet** — FAIT (2026-06-12) : option `thinking: { type: "adaptive", display: "summarized" }` du SDK quand le modèle ≠ haiku (le thinking adaptatif est LE mode des modèles 4.6+, `budget_tokens` est déprécié) + bloc `ANALYTIC_RULES` dans le system prompt (analyse critique du besoin, 3 hypothèses techniques, auto-critique sécurité/bugs/skills apprises, plan étape par étape — escamoté pour les changements triviaux et le Q&A). Les blocs thinking remontent en SSE (événement `thinking`), s'affichent repliés « 🧠 Réflexion » dans le chat et sont persistés dans l'historique. Testé e2e sur sonnet : le raisonnement analyse le code existant, formule des hypothèses et identifie la vraie cause avant de coder ✅
3. *(Plus tard)* Supabase pour apps avec données/auth ; tâches planifiées façon cron d'Hermes si besoin

## 🚀 Pour relancer après redémarrage
*(Projet déplacé sur D: le 2026-06-12 — libération du disque C ; ouvrir les sessions Claude Code dans `D:\IA\mangoai`)*
```
cd D:\IA\mangoai\server
npm run start
```
```
cd D:\IA\mangoai\ui
npm run dev
```
Puis ouvrir **http://localhost:5173** — les conversations des projets reprennent automatiquement (sessions persistées).
