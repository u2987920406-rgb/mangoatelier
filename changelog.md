# Changelog — MangoAI

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

## 2026-06-11 — Session 2 : viabilité & renommage
- **Business model & plan d'action** : `business-model.pdf` (13 pages, source HTML) — 3 pistes comparées, recommandation piste A (agence/freelance), plan 90 jours
- **Renommage Mini-Lovable → MangoAI** : UI (logo 🥭, titre), packages (`mangoai-ui`/`mangoai-server`), docs, business model
- Dépôt GitHub renommé : https://github.com/u2987920406-rgb/mangoai (l'ancienne URL redirige)
- Dossier local renommé : `C:\Users\PC-DELL\mangoai`
