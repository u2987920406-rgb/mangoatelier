# ⚙️ Veille & jouvence MangoAI — Passe mensuelle
*À faire le 13 de chaque mois — idée 15 du tableau statut.md*

## Checklist (30-45 min)

### 1. SDK & dépendances serveur
```
cd D:\IA\mangoai\server
npm outdated
```
Mettre à jour si nouvelle version mineure/majeure de :
- `@anthropic-ai/claude-agent-sdk` → tester que `query()` / `resume` fonctionnent toujours
- `playwright` → relancer `npx playwright install msedge --with-deps`

### 2. Modèles disponibles
- Nouveaux modèles Anthropic annoncés ? → mettre à jour `ALLOWED_MODELS` dans `server/src/agent.ts`
- Les alias `sonnet` / `opus` / `haiku` pointent-ils encore vers les meilleurs rapports qualité/prix ?
- Fable 5 disponible en forfait Pro Max ? → ajouter l'alias `fable` dans le sélecteur UI

### 3. Template des projets générés
```
cat server/template/package.json
```
- React, Vite, Tailwind v4 — une version majeure a-t-elle changé les conventions ?
- Mettre à jour `server/template/package.json` si besoin et tester `npm install` dans le template

### 4. Écosystème MCP
- Nouveaux serveurs MCP officiels utiles ? (Figma, GitHub, Supabase, Notion…)
- Un nouveau serveur branché = capacités gratuites pour l'agent
- Si oui : ajouter dans `server/src/agent.ts` (mcpServers option)

### 4b. Élève local / Ollama (Jalon D) — *ajouté 2026-06-13*
- `ollama --version` et `ollama list` — modèle Élève à jour ?
- **Un modèle de code local plus fort tient-il dans 11 Go ?** (ex. `qwen3-coder` MoE quantifié, nouveau coder 7-14B) → candidat Élève, à comparer via l'Audit Scan
- Santé de l'Élève : `cd server && npx tsx src/audit-scan.ts` (score de build/1er tour) ; après un nouvel axiome : `… --ablate` (vérifier qu'il ne dégrade pas)
- Vérifier `OLLAMA_MODELS` toujours sur `D:\ollama\models` (espace disque C:)

### 5. Test e2e rapide
1. Démarrer MangoAI (`npm run start` + `npm run dev`)
2. Créer un projet test « pizzeria-veille-MMMYYYY »
3. Demander : « crée une landing page simple avec un snapshot de validation »
4. Vérifier : snapshot dans le flux, aperçu OK, rollback disponible

### 6. Métriques & apprentissage
```
cat workspace/.metrics.jsonl | tail -20
```
- Tendances du coût moyen par tour ce mois ?
- Nombre de snapshots par tour — la boucle visuelle s'améliore-t-elle ?
- Préparer les données pour l'audit du 2026-06-22 (idée 13)

### 7. Changelog
- Ouvrir `changelog.md` et noter une entrée « Session veille MMMYYYY »
- Ce qui a changé dans l'écosystème + actions appliquées

---
## Historique des passes
- **2026-06-13** : 1ʳᵉ passe. SDK 0.3.173→0.3.177, lucide 1.18, tailwind 4.3.1 appliqués. Majeures vite 8 / plugin-react 6 reportées (à tester). Modèles inchangés (alias OK). Métriques : 6 tours, $1.61. Détail dans `changelog.md`.
- **2026-06-13 (re-check post-Jalon D)** : serveur à jour (`npm outdated` vide). UI : `vite 7.3.5→8.0.16` et `@vitejs/plugin-react 5.2→6.0.2` toujours reportées (saut majeur touchant UI + build des apps générées → session dédiée). Modèles inchangés. Stack Élève/Ollama (0.30.8, qwen2.5-coder:7b) ajoutée à la checklist (§4b). Rien appliqué — état sain.
- **À planifier (session dédiée)** : montée Vite 8 + plugin-react 6, avec test e2e complet (UI + génération + build d'une app).

*Dernier passage : 2026-06-13*
*Prochain passage : 2026-07-13*
