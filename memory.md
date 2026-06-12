# Memory — MangoAI

## État actuel (2026-06-12)
- **MVP terminé et testé de bout en bout** ✅ (génération pizzeria + itération avec contexte de session)
- Lancement : `npm run start` dans `server/` (port 3000) + `npm run dev` dans `ui/` (port 5173) → ouvrir http://localhost:5173
- Projet de test : `workspace/test-pipeline/` (landing Bella Napoli)
- Sessions persistées dans `server/sessions.json` (non committé) — le frontend n'a plus besoin de garder le sessionId, le backend reprend automatiquement
- Choix du modèle dans l'UI (haiku/sonnet/opus) — le modèle peut changer en cours de session, le resume garde le contexte
- Export zip : GET /api/export/:name — note : archiver v8 est ESM pur, importer `{ ZipArchive }` (pas de default export)
- Historique de chat persisté : FAIT — `workspace/<projet>/.chat-history.json` (exclu git/zip), endpoint `GET /api/history/:name`, rechargé par l'UI à l'ouverture du projet (`ui/src/Chat.jsx`)
- Roadmap concurrence (rollback git, auto-réparation, templates, déploiement Cloudflare) : tout FAIT — voir statut.md
- **Refonte UI FAITE** (2026-06-12) : Tailwind v4 + lucide-react + react-markdown, écran d'accueil Home + workspace repolie, toasts/modal custom — voir design.md et changelog.md. Vérifiée sous Edge headless, 0 erreur console
- **Mémoire par projet FAITE** (2026-06-12) : `workspace/<projet>/.memory.md`, snapshot injecté au system prompt à chaque tour (`server/src/memory.ts`), survit au rollback, exclu git/zip — concepts extraits du code source d'Hermes Agent (clone d'étude : `C:\Users\PC-DELL\hermes-agent-study`, à NE PAS committer)
- **Revue en arrière-plan FAITE** (2026-06-12) : `server/src/review.ts` — agent haiku silencieux après chaque tour réussi, cure `.memory.md` (c'est lui qui cure, plus l'agent principal). Suite de la roadmap Hermes (profil utilisateur global P2, skills apprises P3) : voir `statut.md`

## Règles spécifiques au projet
- **Langue** : réponses en français, code/commentaires en anglais
- **Agent SDK** : contrairement à la doc, le SDK v0.3.x **réutilise le login Claude Code local** — aucune `ANTHROPIC_API_KEY` nécessaire (vérifié le 2026-06-11, coût ~$0.17-0.19 par génération). `.env` optionnel pour forcer une clé API
- **Modèle par défaut** : `sonnet` (économie pendant l'apprentissage) — configurable dans `server/src/agent.ts`
- **Multi-tours** : capturer `session_id` du message `type: "result"` puis passer `options.resume` aux tours suivants
- **cwd absolu obligatoire** pour `query()` (les sessions sont stockées par cwd encodé dans ~/.claude/projects/)
- **Permissions agent** : `permissionMode: "acceptEdits"`, `allowedTools: ["Read","Write","Edit","Bash","Glob","Grep"]`
- Un seul projet généré actif à la fois (un seul dev server preview sur le port 5174)

## Décisions prises
- Template React+Vite pré-copié dans `server/template/` (plus rapide que `npm create vite` à chaque projet)
- Streaming backend → frontend en SSE (pas de WebSocket, plus simple)
- TypeScript exécuté via `tsx` (pas de build step en dev)
