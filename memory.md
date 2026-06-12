# Memory — MangoAI

## État actuel (2026-06-13 — fin de session mode vision, jalon 2)
- **MVP + roadmap concurrence (5/5) + refonte UI + boucle d'apprentissage Hermes (5/5) + compression de contexte + raisonnement analytique + robustesse des magasins + mode vision en boucle fermée** : tout est FAIT, testé de bout en bout — détail dans `statut.md` et `changelog.md`
- Lancement : `npm run start` dans `server/` (port 3000) + `npm run dev` dans `ui/` (port 5173) → ouvrir http://localhost:5173
- Projet de test : `workspace/test-pipeline/` (landing Bella Napoli — sert de banc d'essai à toutes les features)
- **Travail à venir** : voir `statut.md` § « 🔜 Aussi à faire » — c'est la seule source de vérité du backlog ; et TOUJOURS montrer à l'utilisateur le tableau « 💡 Idées en attente » (tout en haut de `statut.md`) au démarrage d'une session, avant de coder quoi que ce soit

## Boucle d'apprentissage (architecture Hermes transposée)
- **3 magasins**, tous dans `workspace/` (git-ignoré, hors zip, survivent au rollback) :
  - `workspace/<projet>/.memory.md` — faits du projet (design, conventions) ; snapshot gelé injecté au system prompt à chaque tour (`server/src/memory.ts`)
  - `workspace/.user-profile.md` — préférences inter-projets de l'utilisateur (ton, typo)
  - `workspace/.skills/<nom-classe>/SKILL.md` — savoir-faire réutilisable ; divulgation progressive : seules les métadonnées au prompt, lecture à la demande (`server/src/skills.ts`)
- **Qui écrit ?** La revue en arrière-plan (`server/src/review.ts`) : agent haiku silencieux, fire-and-forget après chaque tour livré sans erreur, cwd = workspace, outils Read/Write/Edit, verrou anti-empilement, pas de récursion. L'agent principal ne cure PAS (sauf demande explicite de l'utilisateur)
- **Subagents** : agent `builder` via `options.agents` du SDK — outils fichiers seulement (pas de Bash → pas de conflit npm/preview entre builders), délégation réservée aux gros chantiers à volets indépendants
- **Panneau « 🧠 Mémoire »** dans le header : `GET /api/knowledge/:name` + `ui/src/components/Knowledge.jsx` (fetch à l'ouverture du menu = toujours frais)
- **Compression de contexte** (`server/src/compaction.ts`) : le SDK détient l'historique → on déclenche son `/compact` en arrière-plan (haiku) quand `contextTokens` (dernier appel API, mesuré dans `agent.ts`) dépasse 70 % de la fenêtre ; succès = présence d'un `compact_boundary` (un result « success » seul peut signifier « Not enough messages ») ; `interruptCompaction()` au début de `/api/chat` évite toute collision de session ; base incompressible ~33k tokens (system prompt + outils + mémoire)
- Clone d'étude Hermes : `C:\Users\PC-DELL\hermes-agent-study` — à NE PAS committer

## Règles spécifiques au projet
- **Langue** : réponses en français, code/commentaires en anglais
- **Agent SDK** : contrairement à la doc, le SDK v0.3.x **réutilise le login Claude Code local** — aucune `ANTHROPIC_API_KEY` nécessaire (vérifié le 2026-06-11). `.env` optionnel pour forcer une clé API
- **Modèle par défaut** : `sonnet` ; la revue en arrière-plan tourne toujours en `haiku` (~$0.02-0.08/revue)
- **Thinking** : `thinking: { type: "adaptive", display: "summarized" }` pour opus/sonnet (jamais `budget_tokens` — déprécié sur les modèles 4.6+) ; les blocs thinking arrivent comme `block.type === "thinking"` dans les messages assistant du SDK
- **Multi-tours** : capturer `session_id` du message `type: "result"` puis passer `options.resume` aux tours suivants
- **cwd absolu obligatoire** pour `query()` (les sessions sont stockées par cwd encodé dans ~/.claude/projects/)
- **Permissions agent principal** : `permissionMode: "acceptEdits"`, `allowedTools: ["Read","Write","Edit","Bash","Glob","Grep","Agent"]` + `agents: { builder }`
- **Interdits à l'agent** (system prompt) : lancer le dev server, toucher au script error-relay, lancer git (le backend versionne chaque tour)
- Un seul projet généré actif à la fois (un seul dev server preview sur le port 5174)
- Export zip : archiver v8 est ESM pur, importer `{ ZipArchive }` (pas de default export)
- **Robustesse** : les magasins JSON (`sessions.json`, `.chat-history.json`) passent par `safe-io.ts` (écriture atomique temp+rename) et sont validés au chargement (entrées invalides filtrées, jamais d'exception) ; les frontmatters `SKILL.md` sont plafonnés (80/240 car.) et une skill illisible est ignorée ; filet `unhandledRejection`/`uncaughtException` dans `index.ts`. Isolation : tous les outils/agents tournent en subprocess du SDK — pas de module `tools/` local, rien d'in-process à isoler
- **Vision** : le tool Read du preset claude_code lit nativement PNG/JPEG/PDF (paramètre pages, 20 max/appel) — les entrées visuelles passent par un fichier + chemin dans le prompt, JAMAIS par des blocs image dans le message utilisateur (un tool result se compacte, pas le message). Tool MCP in-process : `createSdkMcpServer` + `tool()` (zod), nom d'outil `mcp__<server>__<tool>`, `alwaysLoad: true` sinon différé derrière ToolSearch ; un bloc `{type:"image", data: base64, mimeType}` dans le retour du tool est VU par le modèle. Budget vision : env `VISION_BUDGET` (10/tour), reset + purge `.snapshots/` par `setVisionContext()` au début de chaque tour ; snapshots 1280×800 JPEG q80 ≈ 1 400 tokens chacun

## Décisions prises
- Template React+Vite pré-copié dans `server/template/` (plus rapide que `npm create vite` à chaque projet) ; **Tailwind v4 préinstallé** (`@tailwindcss/vite` + `@import "tailwindcss"`) — les starters, eux, importent theme+utilities SANS preflight (leur CSS pur garde son rendu) ; règle : utilities pour le clonage de maquette, CSS pur pour les sites simples
- Streaming backend → frontend en SSE (pas de WebSocket, plus simple)
- TypeScript exécuté via `tsx` (pas de build step en dev)
- Limites mémoire en **caractères** (6 000 projet / 3 000 profil), pas en tokens — indépendant du modèle (pattern Hermes)
- Posture de la revue skills : **active** (« une passe qui ne sauve rien est une occasion manquée ») mais noms niveau classe et pas de skill pour les tours Q&A — calibré après essai
- Playwright en devDependency de l'UI (channel msedge) pour les vérifications headless ; jamais committer les captures
