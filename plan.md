# Plan — Mini-Lovable

## Roadmap

### Phase 1 — Fondations ✅
- [x] Structure du projet + fichiers docs
- [x] Backend init (Express + Agent SDK + dotenv + tsx)
- [x] Auth : le SDK réutilise le login Claude Code local — aucune clé API requise (`.env` optionnel pour surcharger)

### Phase 2 — Backend agent ✅
- [x] `server/src/agent.ts` — `runAgent(prompt, projectDir, sessionId?)` qui stream les messages du SDK
- [x] `server/src/index.ts` — `POST /api/chat` (SSE), `GET /api/projects`
- [x] `server/src/preview.ts` — démarre/arrête le dev server Vite du projet généré (port 5174)
- [x] `server/template/` — template React+Vite copié à la création d'un projet

### Phase 3 — Frontend builder ✅
- [x] `ui/` — React+Vite port 5173, layout 2 colonnes sombre
- [x] `Chat.jsx` — streaming SSE, indicateurs d'outils, coût cumulé
- [x] `Preview.jsx` — iframe → localhost:5174, badge d'état

### Phase 4 — Test de bout en bout ✅
- [x] Smoke test : backend + UI démarrent et répondent, tsc propre
- [x] Scénario pizzeria : génération complète (6 tours, $0.19) → aperçu OK sur 5174
- [x] Itération sur la même session : l'agent garde le contexte (resume), Edit + HMR OK
- [x] Documentation memory.md + changelog.md

## ✅ MVP terminé (2026-06-11)
Utilisation : `npm run start` dans `server/` + `npm run dev` dans `ui/` → http://localhost:5173

### Idées pour la suite (backlog)
- [x] Sélecteur de projets existants dans le header (datalist alimentée par GET /api/projects)
- [x] Persister le sessionId par projet (`server/sessions.json`) pour reprendre après redémarrage
- [x] Bouton « Stop » pour interrompre l'agent en cours (POST /api/stop → interrupt() du SDK)
- [ ] Export / téléchargement du projet généré (zip)
- [x] Choix du modèle (haiku/sonnet/opus) dans l'UI — sélecteur dans le header, changeable en cours de session
- [ ] Historique de chat persisté par projet (aujourd'hui le chat repart vide au rechargement de la page)

## Règles de collaboration
- Lire `memory.md` au démarrage de chaque session
- Mettre à jour `changelog.md` à chaque session de travail
- « save » = git add + commit + push (quand le repo git sera initialisé)

## Ports
| Service | Port |
|---|---|
| Backend Express | 3000 |
| UI builder (Vite) | 5173 |
| App générée (Vite) | 5174 |
