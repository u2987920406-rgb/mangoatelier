# Statut — MangoAI

*Dernière mise à jour : 2026-06-12 (session compression de contexte)*

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
2. **Raisonnement analytique pour Opus/Sonnet (style Fable 5 / o1)** — activer l'**extended thinking natif** de Claude via le SDK (le vrai raisonnement interne du modèle, pas une balise simulée) quand le modèle choisi est Opus ou Sonnet. En complément, le system prompt doit exiger avant chaque réponse technique :
   - une analyse critique et profonde du besoin ;
   - l'exploration de 3 hypothèses techniques différentes avant de coder ;
   - une phase d'auto-critique agressive (sécurité, bugs, intégration avec les skills apprises) ;
   - un plan d'exécution étape par étape avant de livrer le code
3. **Démarrer le plan d'action 90 jours** (cf. `business-model.pdf`, section 8) — première étape : générer 2-3 sites démo avec MangoAI
4. *(Plus tard)* Supabase pour apps avec données/auth ; tâches planifiées façon cron d'Hermes si besoin

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
