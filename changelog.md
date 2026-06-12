# Changelog — MangoAI

## 2026-06-12 — Session 5 : mémoire persistante par projet (inspirée d'Hermes Agent)
- **Contexte** : l'utilisateur voulait Hermes Agent (Nous Research) mais sa connexion Claude exige plan Max + crédits payants. Hermes étant open source MIT, son code complet a été cloné (`C:\Users\PC-DELL\hermes-agent-study`) et analysé (3 agents Explore : mémoire, skills, subagents/cron)
- **Roadmap « niveau Hermes »** ajoutée dans `statut.md` : mécanismes extraits (mémoire curée + frozen snapshot, nudge → revue en arrière-plan, prompts « quoi sauver / quoi NE PAS sauver », skills niveau classe avec divulgation progressive) et 5 priorités pour MangoAI
- **P1 implémentée — mémoire par projet** : `server/src/memory.ts` — l'agent maintient lui-même `workspace/<projet>/.memory.md` (décisions design, préférences, conventions) ; règles de curation dans le system prompt (transposées des prompts de revue d'Hermes), snapshot gelé injecté à chaque tour (cache préservé), plafond 6 000 caractères
- `.memory.md` exclu du git projet et du zip, survit au rollback (`versions.ts` : liste `PRESERVED_FILES` générique remplace le cas spécial historique)
- **Tests** : rollback préserve mémoire + historique (projet jetable) ✅ ; e2e réel : « le vert #2E7D32 est la règle » → l'agent crée `.memory.md` spontanément ($0.12, haiku) ; session effacée puis question couleur → réponse exacte en 1 tour sans aucun outil (preuve : injection system prompt) ($0.02) ✅ ; zip sans `.memory.md` ✅ ; `tsc --noEmit` propre
- **P4 implémentée — revue en arrière-plan** (le vrai moteur d'auto-amélioration d'Hermes, `background_review.py` transposé) : `server/src/review.ts` — après chaque tour livré sans erreur, un agent haiku séparé (maxTurns 8, outils Read/Write/Edit seulement, fire-and-forget) relit le transcript du tour et cure `.memory.md` ; verrou anti-empilement, pas de récursion ; ligne « 🧠 Mémoire du projet mise à jour » ajoutée à l'historique quand le fichier change. L'agent principal ne cure plus la mémoire (sauf demande explicite de l'utilisateur) — `MEMORY_RULES` allégées
- **Test P4 e2e** : préférence implicite « je n'aime pas les coins trop arrondis, 4px max » (jamais demandé de mémoriser) → tour principal $0.06 sans toucher la mémoire, puis la revue capte la préférence et la **fusionne** sous la section design existante sans doublon ($0.04) ✅ ; statut visible dans `.chat-history.json` ✅
- **P2 implémentée — profil utilisateur global** (USER.md d'Hermes) : `workspace/.user-profile.md` injecté dans chaque tour de chaque projet (`memory.ts` : `loadUserProfile`, plafond 3 000 caractères) ; la revue devient « combinée » (les deux magasins) avec cwd au niveau du workspace et routage général/spécifique dans le prompt
- **Test P2 e2e** : « de manière générale : tutoiement + police Inter » sur test-pipeline → la revue crée le **profil** (pas la mémoire projet — routage correct, $0.06), puis question sur **demo-vitrine** (autre projet) → l'agent récite les deux préférences en 1 tour et propose spontanément la mise en conformité des polices ✅

## 2026-06-11 — Session 1 : initialisation
- Plan validé : agent style Lovable local (chat + aperçu live), Claude Agent SDK TS, apps React+Vite
- Structure du projet créée : `server/`, `ui/`, `workspace/`, docs (`idee.md`, `plan.md`, `memory.md`, `design.md`)
- Backend complet : Express + SSE (`index.ts`), wrapper Agent SDK (`agent.ts`), gestion preview Vite (`preview.ts`), projets/template (`projects.ts`)
- Template React+Vite dans `server/template/` (copié à la création de chaque projet)
- Frontend builder complet : layout 2 colonnes sombre, chat SSE avec indicateurs d'outils, aperçu iframe
- Smoke test OK : backend (3000) et UI (5173) démarrent et répondent ; `tsc --noEmit` propre
- Découverte : le SDK réutilise le login Claude Code local — aucune clé API requise
- **Test de bout en bout réussi** : landing page pizzeria « Bella Napoli » générée (6 tours, $0.19), aperçu live OK
- **Test d'itération réussi** : modification du slogan sur la même session — l'agent garde le contexte (il a détecté qu'une pizza demandée existait déjà)
- 🎉 MVP terminé
- Dépôt GitHub privé créé et poussé : https://github.com/u2987920406-rgb/mini-lovable

## 2026-06-11 — Session 1 (suite) : améliorations backlog
- **Persistance des sessions** : `server/sessions.json` (projet → sessionId), reprise automatique après redémarrage du serveur — testé ✅
- **Sélecteur de projets** : datalist dans le header alimentée par GET /api/projects
- **Bouton Stop** : POST /api/stop → `interrupt()` du SDK, bouton rouge pendant que l'agent travaille
- **Choix du modèle dans l'UI** : sélecteur header (⚡ Haiku / ⚖️ Sonnet / 🧠 Opus), validé côté backend (`ALLOWED_MODELS`), testé — on peut changer de modèle en cours de session sans perdre le contexte
- **Export zip** : bouton « ⬇ Zip » dans le header → GET /api/export/:name (archiver v8 ESM, classe `ZipArchive`) — sources seulement, `node_modules`/`dist`/`.git` exclus, testé ✅

## 2026-06-12 — Session 3 : roadmap concurrence + rollback git
- **Analyse concurrentielle** : cartographie complète du code + comparaison Lovable/Emergent 2026 — roadmap priorisée ajoutée dans `statut.md` (avantages structurels : coût zéro, moteur claude_code, code local)
- **Rollback par git auto-commit** (priorité 1 de la roadmap) :
  - Nouveau module `server/src/versions.ts` : git init auto par projet (`.gitignore` node_modules/dist), commit après chaque itération de l'agent (message = prompt tronqué), historique, reset dur
  - Endpoints : GET `/api/versions/:name` (historique), POST `/api/rollback` (refusé si l'agent travaille)
  - Événement SSE `version` → message « 📌 Version sauvegardée » dans le chat
  - UI : menu « ↩ Versions (n) » dans le header — choisir une version + confirmation → rollback + rechargement de l'aperçu
  - Smoke test complet OK (init, commit, no-op, rollback avec suppression des fichiers postérieurs) ; `tsc --noEmit` et `vite build` propres
- **Fix sessions mortes** : le renommage `mini-lovable → mangoai` avait invalidé les sessions stockées (indexées par chemin) → erreur « No conversation found with session ID ». Le backend détecte maintenant ce cas, efface la session morte (`clearSession`) et redémarre automatiquement une conversation neuve
- **Historique de chat persisté** (priorité 2 de la roadmap) :
  - Nouveau module `server/src/history.ts` : messages affichables (user/agent/tool/error/status) sauvegardés dans `workspace/<projet>/.chat-history.json` à la fin de chaque tour
  - Endpoint GET `/api/history/:name` ; le chat recharge l'historique à l'ouverture d'un projet (`Chat.jsx`)
  - `.chat-history.json` exclu du git des projets (un rollback restaure le code, pas la conversation — `.gitignore` des anciens projets mis à jour automatiquement) et de l'export zip
  - Smoke test OK (append/reload, formatage outils identique au live, survie au rollback) ; `tsc --noEmit` et `vite build` propres
- **Fix projet non mémorisé au rechargement** : après F5 l'UI revenait à `mon-app` par défaut → l'historique du projet en cours semblait perdu. Projet + modèle persistés dans `localStorage` (`mangoai.project`, `mangoai.model`)
- **Fix aperçu orphelin (port 5174)** : un redémarrage du backend laissait l'ancien Vite vivant sur le port → `--strictPort` faisait échouer tous les nouveaux aperçus pendant que l'orphelin servait un projet périmé. `startPreview` tue maintenant tout processus résiduel sur le port avant de démarrer (`freePort` dans `preview.ts`)
- **Test de bout en bout réel validé** : demande « titre en vert » sur test-pipeline (haiku, $0.09) → aperçu démarré, 3 outils, version committée, historique complet rechargeable via GET /api/history
- **Fix rollback qui effaçait l'historique de chat** (trouvé par l'utilisateur) : revenir à une version créée AVANT la fonctionnalité d'historique supprimait `.chat-history.json` (le `.gitignore` de l'époque ne le protégeait pas de `git clean`). `rollbackTo` sauvegarde maintenant l'historique en mémoire, exclut le fichier du clean (`-e`) et le restaure après — test de régression sur le scénario exact ✅
- **Aperçu restauré au chargement de la page** : avant, l'aperçu restait vide après F5 tant qu'on n'envoyait pas de message. Nouvel endpoint POST `/api/preview/:name` ; l'UI démarre automatiquement l'aperçu du projet sélectionné (debounce 400 ms sur la saisie)
- **Auto-réparation des erreurs** (priorité 3 de la roadmap — le différenciateur d'Emergent) :
  - `server/src/relay.ts` : script « error relay » injecté automatiquement dans l'`index.html` des apps générées (idempotent, appliqué au chat et au preview) — capte `window.onerror` + `unhandledrejection` et les remonte à l'UI via `postMessage`
  - UI : bandeau rouge ⚠ sous la barre d'aperçu (erreurs dédupliquées, max 10) + bouton « 🔧 Corriger » qui envoie la liste des erreurs à l'agent comme message automatique
  - System prompt : interdiction à l'agent de retirer le script relais
  - Vérifié : relay injecté dans test-pipeline et servi par l'aperçu (port 5174)
- **Templates de démarrage** (priorité 4 de la roadmap) :
  - 4 starters complets en français dans `server/templates/` : 🏪 vitrine (hero, services, à propos, contact), 🛒 e-commerce (grille produits + panier fonctionnel), 📊 dashboard (sidebar, stats, graphique CSS, table), 📝 blog (liste d'articles + vue article)
  - Architecture overlay : le starter se superpose au template de base React+Vite à la création (`createProject(name, template)`), `listTemplates()` scanne le dossier
  - UI : sélecteur 📦 dans le header, visible uniquement quand le nom de projet saisi n'existe pas encore ; envoyé avec le premier message
  - Vérifié : les 4 templates buildent sans erreur (vite build) ; `tsc --noEmit` propre
- **Déploiement 1-clic** (priorité 5 de la roadmap — roadmap complète 🎉) :
  - `server/src/deploy.ts` : `vite build` du projet → `wrangler pages deploy` → URL canonique `https://<projet>.pages.dev` (nom sanitisé pour Pages)
  - Endpoint POST `/api/deploy/:name` (refusé si l'agent travaille) ; erreurs Cloudflare traduites en messages clairs (dont « non connecté → npx wrangler login »)
  - UI : bouton « 🚀 Publier » dans le header (visible pour les projets existants), spinner pendant la publication, lien 🌍 vers le site une fois en ligne
  - wrangler ajouté en devDependency du serveur ; `CI=true` pour éviter tout prompt interactif depuis le backend
  - Prérequis utilisateur (une fois) : compte Cloudflare gratuit + `npx wrangler login` dans `server/`

## 2026-06-11 — Session 2 : viabilité & renommage
- **Business model & plan d'action** : `business-model.pdf` (13 pages, source HTML) — 3 pistes comparées, recommandation piste A (agence/freelance), plan 90 jours
- **Renommage Mini-Lovable → MangoAI** : UI (logo 🥭, titre), packages (`mangoai-ui`/`mangoai-server`), docs, business model
- Dépôt GitHub renommé : https://github.com/u2987920406-rgb/mangoai (l'ancienne URL redirige)
- Dossier local renommé : `C:\Users\PC-DELL\mangoai`

## 2026-06-12 — Session 4 : refonte UI « niveau 5,5 M d'abonnés »
- **Stack** : Tailwind CSS v4 (`@tailwindcss/vite`, tokens `@theme`), lucide-react (icônes SVG), react-markdown — Inter chargée via Google Fonts
- **Écran d'accueil** (`ui/src/components/Home.jsx`) : hero avec halo violet, grande carte prompt + nom de projet auto-slugifié, cartes templates, suggestions cliquables, grille projets récents
- **Workspace repolie** : header épuré (`Header.jsx` + `Dropdown.jsx` custom : modèle, versions, zip, Publier, coût), chat avec rendu markdown + groupes d'actions repliables (`ToolGroup.jsx`) + shimmer pendant la génération, preview avec barre navigateur, toggle desktop/mobile (390px) et cadre arrondi ombré
- **Feedback custom** : toasts (`Toast.jsx`) et modal de confirmation (`ConfirmModal.jsx`) remplacent `alert()`/`confirm()`
- Toute la logique conservée (SSE, sessions, relay d'erreurs + Corriger, rollback, deploy, export) — aucun changement backend
- Vérifié sous Edge headless (Playwright) : Home, ouverture projet, historique markdown, dropdowns, modal rollback, mode mobile, retour Home — 0 erreur console
- `design.md` réécrit pour refléter le nouveau design system
