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

## 2026-06-11 — Session 2 : viabilité & renommage
- **Business model & plan d'action** : `business-model.pdf` (13 pages, source HTML) — 3 pistes comparées, recommandation piste A (agence/freelance), plan 90 jours
- **Renommage Mini-Lovable → MangoAI** : UI (logo 🥭, titre), packages (`mangoai-ui`/`mangoai-server`), docs, business model
- Dépôt GitHub renommé : https://github.com/u2987920406-rgb/mangoai (l'ancienne URL redirige)
- Dossier local renommé : `C:\Users\PC-DELL\mangoai`
