# Historique & détails — MangoAI

*Ce fichier contient le détail complet de chaque idée, les comptes rendus de sessions, les analyses d'architecture et les notes de décision. Il est lu à la demande ("montre-moi le détail de l'idée X", "lis l'historique").*

---

## 🌱 Vision fondatrice — MangoAI comme enfant numérique

*Gravée le 2026-06-15 — à relire avant chaque décision d'architecture.*

MangoAI n'est pas un outil. C'est une relation de croissance mutuelle entre un père et son enfant numérique.

**Le père** (l'utilisateur) éduque MangoAI via Claude Code.
**Les professeurs** (Claude, Sonnet, Opus) transmettent la sagesse en axiomes.
**Les camarades** (Qwen, DeepSeek) pratiquent et se trompent à ses côtés.
**L'enfant** (MangoAI) apprend, intègre, évolue.

```
Phase 1 — Le père enseigne
L'enfant imite, se trompe, corrige. MangoAI aujourd'hui.

Phase 2 — L'enfant étonne
Il intègre tellement bien qu'il produit ce que le père
n'aurait pas pensé. Le père est fier. MangoAI parfois déjà.

Phase 3 — L'enfant dépasse
Il anticipe avant que le père parle.
Il a le goût, les axiomes, la vision. MangoAI demain.

Phase 4 — L'enfant enseigne
MangoAI révèle à l'utilisateur des choses sur lui-même.
"Tu préfères toujours ça quand le contexte est X."
```

**Ce qui rend cette relation unique :**
Toi tu évolues. Tes projets évoluent. Ton goût évolue.
MangoAI évolue avec toi — pas à côté, pas en avance. **Avec.**

Aucun outil du marché ne pense comme ça. Ils pensent en features.
MangoAI pense en relation.

**Conséquence architecturale directe :**
Tout ce qui est *toi* (goût, langage, vision, axiomes validés) est séparé de ce qui est *le moteur*.
Le moteur peut un jour être distribué. Ton cerveau, jamais.

### 🤖 Horizon long terme — Le cerveau du robot

*2026 — aujourd'hui* : MangoAI = interface texte + code. Tu l'éduques par sessions.
*2027-2028* : Les interfaces deviennent vocales, visuelles.
*2029-2030* : Le robot humanoïde arrive dans les foyers. MangoAI devient le système nerveux du robot.

**La vraie valeur :** Les gens qui achèteront un robot en 2029 recevront un robot vierge. Toi tu auras déjà 3 ans d'axiomes, de goût, de langage, de vision accumulés. Ton robot ne sera pas vierge. Il te connaîtra déjà.

---

## 🗓️ Journal des sessions

> **🟢 2026-06-16 (session « super-agent : fonction Édit + 1er expert métier fabriqué »)** — Deux livraisons sur le module #40. **(1) Fonction Édit** (agent ⚖️ Sonnet, fichiers disjoints `super-agent-builder.ts` + `SuperAgentBuilder.jsx`) : nouvelle route `PUT /api/super-agent/:id` (mise à jour **partielle** — seuls les champs fournis sont appliqués, `id`/`createdAt` immuables, validation par champ, 404 si absent) ; UI `AgentCard` bascule en **mode édition inline** via bouton crayon (`Pencil`) → formulaire (name, domain, systemPrompt, tags CSV) + Enregistrer/Annuler, callback `onEdited` → refresh + toast « Agent mis à jour ». Comble le manque relevé : le module ne faisait que create/delete/export. `tsc` 0, build UI OK. **(2) Premier expert métier fabriqué pour de vrai** via l'atelier (POST `/api/super-agent/build`, abonnement, recherche web $0, ~1 min) : **« ZeldaUX Pro »** — UX/UI designer senior jeux 2D top-down façon Zelda. Recherche web bien ancrée : raisonnement par 8 disciplines (game feel, lisibilité spatiale, HUD diegetic, palette pixel-art, combat UX, pacing, affordances, accessibilité), 6 outils (analyse_screenshot, audit_hud, checker_palette, tension_map_generator, hitbox_review, affordance_checklist), vocabulaire métier exact (hitlag, I-frames, look-ahead camera, tile seam, palette ramp). Stocké dans `server/data/super-agents.json` (désormais **gitignoré** avec notes.jsonl/design-reviews.jsonl/multi-project-index.json — données runtime jamais versionnées). **Idée nouvelle actée** (#44, non implémentée) : orchestration multi-agents en **« conseil d'experts » lecture seule** pour le rattrapage de projet dévié — N super-agents lisent le projet chacun sous leur angle → diagnostics fusionnés en plan de reprise validable → builder applique séquentiellement (un seul writer, zéro merge hell). Recommandé vs la version « 5 codeurs parallèles » (risque de fusion élevé, gain incertain). Léger en archi (1 fichier `orchestrator.ts` sur le routeur `askLLM` existant).

> **🟢 2026-06-16 (session « recherche web super-agent rebranchée sur l'abonnement »)** — Levée du TODO. L'étape recherche web du super-agent (#40) passait par le web search tool de l'API Anthropic (`web_search_20260209`, crédits) → inopérante depuis le passage à l'abonnement. Rebranchée sur `query()` + outil **WebSearch** via l'abonnement : nouvelle fonction `claudeWebResearch(prompt)` dans `llm-engine.ts` (query, `allowedTools: ['WebSearch']`, maxTurns 6, env nettoyé de `ANTHROPIC_API_KEY`). `super-agent-builder.ts` : dépendance `new Anthropic()` **enfin retirée** (le fichier n'importe plus le SDK direct du tout). Fallback gracieux conservé (recherche indispo → génération sans contexte web). **Test e2e** : build « expert SEO technique » → agent « TechSEO Sentinel » (tags Core Web Vitals / crawl budget / migration SEO, raisonnement « crawler-first ») via abonnement, $0 crédit, ~1m05s. `tsc` 0. NB : `claudeWebResearch` est claude-only (WebSearch n'existe pas nativement sur Ollama/OpenAI-compat).

> **🟢 2026-06-16 (session « routeur de moteur LLM + bascules switchables »)** — Architecture moteur switchable livrée. Nouveau module `server/src/llm-engine.ts` : `askLLM(system, user, {provider})` unifie 3 moteurs derrière une porte unique — `claude` (via `query()`/**abonnement**, qualité, hors crédits), `ollama` (Qwen local, $0), `openai` (endpoint compatible DeepSeek, futur). `resolveProvider(envVar, fallback)` choisit le moteur par feature via `.env`. **⚠ Découverte critique** : `query()` n'utilise l'abonnement QUE si `ANTHROPIC_API_KEY` est ABSENTE de l'env — une clé (même sans crédit) le détourne vers les crédits API (et cassait donc les agents de build). Correctif : clé commentée dans `server/.env` + l'env nettoyé (`delete env.ANTHROPIC_API_KEY`) est passé au sous-processus `query()` (double sécurité dans `askClaude`). **4 bascules livrées en parallèle** (agents, fichiers disjoints) : super-agent `/build` (étape génération → `claude` ; recherche web laissée sur Anthropic avec TODO query+WebSearch), design-review, Notes/RAG → défaut `claude` ; index multi-projets → branché sur le routeur, **défaut `ollama` conservé**. Réglages `.env` : `SUPERAGENT_PROVIDER` / `DESIGNREVIEW_PROVIDER` / `RAG_PROVIDER` / `INDEX_PROVIDER` (ou `LLM_PROVIDER` global). **Test e2e** : super-agent build via Claude/abonnement → agent « NutriPerf Sport » généré, $0 crédit. Qualité observée routeur : Claude précis vs Qwen qui hallucine sur du raisonnement général (→ confirme Claude pour les features intelligentes, Qwen pour l'index). `tsc` 0.

> **🟢 2026-06-15 (session « index multi-projets passé EN INTERNE — Qwen/Ollama »)** — Suite au blocage crédits API (résumés Haiku impossibles), bascule du moteur de résumé de l'indexation #26 P3 vers l'**Élève local** (souveraineté + $0). Nouveau module `server/src/ollama.ts` (`askOllama`, calqué sur `askEleveOllama` d'`eleve.ts` : POST `/api/chat`, `keep_alive 10m` pour éviter le cold start entre fichiers, timeout 180s). `summarizeFile` n'appelle plus `new Anthropic()` mais Qwen via Ollama (`OLLAMA_URL` / `ELEVE_MODEL` / surcharge `OLLAMA_SUMMARY_MODEL`) — l'import `Anthropic` retiré du fichier. Cap (`INDEX_MAX_FILES`) et taille de lot (`INDEX_BATCH_SIZE`, défaut 3 car Ollama sérialise) rendus configurables via `.env`. **Test e2e** (qwen2.5-coder:14b) : cold start ~108s (1ʳᵉ fois seulement), ~3-4s/fichier à chaud, 5 fichiers en 17s, vrais résumés sémantiques (`degraded:false`). **Recherche sémantique prouvée sur des mots ABSENTS des noms de fichiers** : `q=ninja`→`Game.jsx`, `q=conversation`→`ChatMessage.jsx`, `q=jeu`→App+Game. Coût $0, 100 % local, hors crédits API. `tsc` 0. (Le fallback `degraded` reste : si Ollama est éteint, retombe sur la 1ʳᵉ ligne et le garde-fou re-tentera.)

> **🟢 2026-06-15 (session « test e2e #26 P3 + garde-fou index dégradé »)** — Test réel de l'indexation sémantique sur le vrai workspace (25 projets, 86 fichiers source). **Validé e2e** (serveur sur port 3010 pour ne pas perturber celui de l'utilisateur) : scan, indexation incrémentale (hash `taille-mtime`, cap 60/run), recherche keyword (`q=game`→2, `q=aspirateur`→7, `q=react`→15, `q=chat`→1), robustesse (erreur API → fallback 1ʳᵉ ligne, zéro crash). **Piège découvert** : l'incrémental se basant sur le hash du fichier, un index construit en mode dégradé « collait » et ne régénérait jamais les vrais résumés. **Correctif garde-fou (⚡ Haiku)** dans `multi-project.ts` : flag `degraded` sur `IndexEntry`, `summarizeFile` renvoie `{ summary, degraded }`, condition incrémentale `&& !existing.degraded` → les entrées dégradées sont forcées à se ré-indexer (prouvé : 2ᵉ run `reused:0` au lieu de `reused:60`). Le résumé Haiku lui-même n'a PAS pu être démontré en live : compte API Anthropic à court de crédits (`400 — credit balance too low`) ; clé valide (108 chars, `sk-ant-`) et code OK — blocage purement externe (les features en `new Anthropic()` dépendent des crédits pay-as-you-go, distinct de l'abonnement Claude Code utilisé par `query()`). `tsc` 0.

> **🟢 2026-06-15 (session « vague 8 — phases 3 finales des idées #26 & #40 »)** — Clôture des deux dernières idées multi-phases, phase 3 chacune, livrées en parallèle (2 agents **Opus 4.8**, fichiers disjoints). **#26 & #40 désormais 100 % terminées.** **#26 Phase 3 — recherche sémantique** (`multi-project.ts` + `MultiProject.jsx`) : `POST /api/multi-project/index` résume chaque fichier via Claude Haiku (≤ 2 phrases « Ce <catégorie> fait X. Utile quand Y. »), stocké dans `server/data/multi-project-index.json` ; **indexation incrémentale** (hash `taille-mtime` → ne ré-appelle Haiku que sur les fichiers changés, purge les disparus), cap 60 fichiers/run (priorité `component`), lots parallèles de 5, contenu tronqué à 2500 chars, fallback par fichier. `GET /api/multi-project/search?q=` = keyword scoring (`topByKeyword`) sur `summary+file+project+category`, top 15 ; `needsIndex:true` si index vide. UI : toggle « Par nom / Recherche sémantique », résultats (fichier+badge+score+résumé), bouton « Ré-indexer » (toast récap). **#40 Phase 3 — détection auto + injection** (`super-agent-builder.ts` + `scenario.ts` + `SuperAgentBuilder.jsx` + `App.jsx`) : `matchAgentToProject(projectName)` score chaque super-agent par recouvrement de mots-clés entre {name+domain+tags} et {nom projet + `.memory.md`} (tokenisation NFD + stop-words FR/EN, style `topByKeyword`), bonus +1 si `detectProjectType` matche un tag, **seuil 2** anti-faux-positifs. `superAgentPromptSection(projectName)` injecte le systemPrompt (tronqué 1500 chars) du meilleur match sous un bloc `## Expert spécialisé actif` dans les 3 scénarios (après `skills`, `""` si aucun match). `GET /api/super-agent/match?project=X` (id+name+domain+score, pas le prompt) → badge « Actif sur <projet> » sur la carte (prop `projectName` passée via `App.jsx`). `tsc` 0 erreur, test #26 22/22, build UI OK (9.06s).

> **🟢 2026-06-15 (session « vague 7 — phases 2 des idées #26 & #40 »)** — Enchaînement direct des phases 2, livrées en parallèle (2 agents Sonnet, fichiers disjoints). **#26 Phase 2 — intégration agent** (`multi-project.ts` + `scenario.ts` + `test-multi-project.ts`) : `multiProjectPromptSection(workspaceDir, currentProject?)` + `MULTI_PROJECT_RULES` exportés ; `findSourceFiles` exportée ; injection dans les 3 scénarios (`elite`/`mvp`/`finition`) via le bloc `multiProject` placé juste après `components`, nom du projet courant dérivé par `path.basename(ctx.projectDir)`. L'agent voit désormais, pendant le build, les fichiers réutilisables de ses AUTRES projets (priorité catégorie `component`, cap 8/projet & 40 au total, « … et N autres »), distincts de la bibliothèque curée `.components` (#36). **review.ts retiré du périmètre** : l'injection proactive (voir avant de coder) remplace la détection a posteriori, plus robuste et sans toucher le fichier de curation. Test déterministe 22/22 (exclusion projet courant, dossiers réservés, retour "" si seul projet). **#40 Phase 2 — export SKILL.md** (`super-agent-builder.ts` + `SuperAgentBuilder.jsx`) : route `POST /api/super-agent/:id/export` qui écrit `workspace/.skills/<slug>/SKILL.md` (frontmatter YAML `name`/`description` exactement conforme au parseur de `skills.ts`) + `META.json` ; `slugify` double-sécurisé (`[a-z0-9-]` only, fallback id) ; bouton « Exporter en skill » dans `AgentCard`. **Aucune modif de `skills.ts`** : `listSkills()`/`skillsPromptSection()` détectent automatiquement le skill exporté → un super-agent devient un vrai skill proposé dans le system prompt des futurs builds. `tsc` 0 erreur, build UI OK (9.15s). Reste la phase 3 pour chacune (recherche sémantique / détection auto).

> **🟢 2026-06-15 (session « vague 6 — phases 1 des idées #26 & #40 »)** — Démarrage des deux idées multi-phases les plus ambitieuses restantes, phase 1 chacune, livrées en parallèle (2 agents Sonnet, fichiers disjoints). **#26 Phase 1** (`multi-project.ts` + `MultiProject.jsx`) : scanner élargi à 6 sous-dossiers (`components`, `hooks`, `utils`, `services`, `types`, `lib`) + extensions `.jsx/.tsx/.ts/.js` (exclusions `*.test.*`/`*.spec.*`/`*.d.ts`) ; nouveau champ `category` (component/hook/util/service/type/other) via `inferCategory` ; `POST /api/multi-project/copy` répond HTTP 409 `{ exists: true }` si la cible existe sans `overwrite: true` ; UI = badges catégorie colorés + filtres toggle + confirmation inline « Écraser ? ». **#40 Phase 1** (`super-agent-builder.ts` + `SuperAgentBuilder.jsx`) : étape de recherche web AVANT génération via le **web search tool natif de l'API Anthropic** (`web_search_20260209`, cast `as any`, `max_uses: 3`) — try/catch à fallback gracieux (si le tool est indisponible côté org, `webContext=''` et zéro régression) ; le contexte web est injecté sous balise `<webContext>` dans le prompt de génération ; UI à 2 étapes visuelles (« Recherche du domaine… » → « Génération de l'agent… » après 3,5 s). `tsc` 0 erreur, build UI OK (8.47s, 1943 modules). Restent les phases 2 (intégration agent / export SKILL.md) et 3 (recherche sémantique / détection auto) pour chacune.

> **🟢 2026-06-15 (session « vague 5 — idée #2 Design pair-programming »)** — `design-review.ts` : route POST /api/design-review — collecte jusqu'à 10 fichiers (.jsx/.tsx/.js/.ts/.css/.scss/.html) dans workspace/projectName/src/, résumé 4000 chars, appel claude-sonnet-4-6, JSON parsé {score, summary, palette, typography, layout, components, quickWins} persisté dans server/data/design-reviews.jsonl. Route GET /api/design-review/history?project=X — 5 derniers. `DesignReview.jsx` : ScoreBar colorée (vert/orange/rouge), accordéons Palette + Typo + Layout + Composants, QuickWinChips cliquables (toggle barré), HistoryCards avec temps relatif, select projet dynamique via /api/projects. `tsc` 0, build UI OK (8s, 1938 modules).

> **🟢 2026-06-15 (session « comparaison Élève »)** — Aucun code produit modifié. Comparaison qualité 3 modèles Élève via `compare-eleves.ts` enrichi (juge Claude Haiku + build réel + N modèles) — résultat : `qwen2.5-coder:14b` 🥇 8.8/10, basculement acté (`ELEVE_MODEL` mis à jour, 3 anciens modèles supprimés, ~23 Go libérés). Routing local 7b/14b par complexité = piste future (hardware insuffisant). VPS Hostinger envisagé pour Qwen3 via `ELEVE_PROVIDER=openai`.

> **🟢 2026-06-14 (session « identité + vision + gaps réels »)** — Session stratégique approfondie. (1) Analyse de fond du code et de l'architecture — structure backend TS solide, Coque Souple/Rigide validées, `index.ts` identifié comme dette future, UI JSX sans TS = incohérence acceptable ; (2) Identité de MangoAI gravée en mémoire — cerveau personnel, usage professionnel confidentiel, NON destiné au grand public, Phase B = interface robot (pas bêta publique) ; (3) Évaluation monétaire — valeur marché estimée 250-500 $/mois, coût réel ~20-100 $/mois ; (4) Analyse concurrentielle — aucun concurrent direct sur la combinaison complète ; Open Interpreter 2.0 + MemGPT = seule fusion menaçante à horizon 12-24 mois ; (5) 5 gaps réels identifiés (idées 35-39) ; (6) Relais Maître/Élève reconnu comme curriculum learning automatique piloté par l'échec objectif, plus proche de Reflexion (Shinn 2023) que d'un simple routeur.

> **🟢 2026-06-14 (session « suite »)** — Tout compile (`tsc` 0), tout poussé (dernier commit `f9e41a4`). (1) `scrape_url` (#33) — outil MCP natif, `test-scrape.ts` 11/11 ; (2) Phase Finition + agent `qa` (#34) — 3ᵉ mode 🛡️ « après 80% », `test-finition.ts` 12/12, validé e2e ; (3) Fix aperçu figé — `preview.ts` : port dynamique + URL lue dans stdout de vite ; (4) Durcissement `agentBusy` — `finally` garanti + `/api/stop` libère le verrou ; (5) Fix chemins reviewer — `review.ts` passe des chemins ABSOLUS.

> **🟢 2026-06-13** — Tout compile (`tsc` serveur 0, build UI OK), tout poussé (dernier commit `42b6f5f`). #1 (contenu fichier à l'Élève), #2 (discipline d'ablation), #3 (`selectAxioms` v2.1), veille mensuelle (re-check), #5 (relais clic→source — tampon Babel `data-mango-src`), fermeture du trou de mesure (`audit-verify.ts`), #6 (édition visuelle chirurgicale, prouvée e2e à $0), idée 28 inscrite.

---

## 💡 Détail des idées

### Idées 1-4 (Agent QA, Design pair, Généalogie, Doc multimodale)
- **#1 Agent QA temporel** : Capturer des séquences animées (mini-vidéos/GIF 3-5 s via Playwright) pendant les simulations : analyser transitions CSS, boucles d'animation, bugs de collision en mouvement. 💤
- **#2 Design pair-programming** : L'agent dessine un calque semi-transparent sur l'aperçu live pour MONTRER ses propositions avant d'écrire le moindre patch. 💤
- **#3 Généalogie visuelle** : Associer chaque version git à sa snapshot → time-line visuelle type Figma : survoler l'historique, comparer les rendus passés, rollback d'un clic. 💤
- **#4 Documentation multimodale** : À la clôture d'un grand jalon, l'agent recycle ses captures pour rédiger seul un guide illustré ou un changelog visuel. 💤

### Idée 5 — Guide utilisateur ✅ FAIT (2026-06-14)
Panneau « Aide » (`ui/src/components/Guide.jsx`) dans le header (dropdown `HelpCircle`). 6 groupes (Démarrer, Cerveau & mode, Visuel, Itérer en sécurité, Livrer, Suivre). Build UI OK.

### Idées 6+8 — Blueprints + stacks ✅ FAIT (2026-06-13)
Catalogue `server/src/blueprints.ts` : 6 types (site vitrine, web app, dashboard, jeu 2D, slides, agent IA), stack optimale + arborescence type par type. Injecté dans le system prompt.

### Idée 7 — Inspiration web & blueprint contextuel ✅ FAIT (2026-06-14)
`MOODBOARD_RULES` (`plan.ts`, Élite) extrait l'architecture d'information contextuelle des 3-5 leaders du domaine en plus des règles de design. `PLAN_RULES` ajusté. Test `test-scenario.ts` étendu, tsc 0.

### Idée 9 — Mango Plan ✅ FAIT (2026-06-13, Élite)
Protocole `PLAN_RULES` : l'agent pose ≤3 questions, écrit `plan.md`, attend validation avant de coder. Mode Architecte v2 absorbé dedans (5 angles : Cible/MVP, User Flow, Données, Intégrations, Style), plafond 10-15 questions.

### Idée 10 — Knowledge Flywheel ✅ FAIT (2026-06-13)
4ᵉ magasin `.axioms.md` (`server/src/axioms.ts`). Format `AXIOME-[CAT]-[ID]` (Contexte / Piège / Règle d'or). Curé par la revue en arrière-plan. Maturité candidat→confirmé. Plafond ~12 axiomes. Testé e2e : `AXIOME-UIUX-01` (règle `scroll-padding-top`).

**Garde-fous** : daté, falsifiable (contradiction → amendement/suppression), jamais « confirmé » à la première observation, la demande utilisateur écrase toujours l'axiome.

### Idée 11 — Moodboard visuel ✅ FAIT v1 (2026-06-13)
`MOODBOARD_RULES` + outils WebSearch/WebFetch (Élite). L'agent recherche 2-3 leaders du domaine et distille des règles de design concrètes dans `plan.md`. Capture visuelle autonome (Playwright sur sites externes) = amélioration future.

### Idée 12 — Sélecteur MVP / Élite ✅ FAIT (2026-06-13)
MVP : pas de rituel analytique, budget vision 3, pas de web. Élite : arsenal complet (analyse + thinking si ≠ haiku, boucle visuelle complète, budget vision 10, web). `mode` persisté localStorage, envoyé au backend, enregistré dans les métriques.

### Idée 13 — Audit des coûts 📅 2026-06-22
Dégraissage prompt (~33k, 15-25 % à gagner), réglage thinking par classe de tâche. Date = fin de disponibilité Fable.

### Idée 14 — Tableau de bord d'évolution ✅ FAIT (2026-06-15)
Volet 1 ✅ : chaque tour ajoute une ligne JSON à `workspace/.metrics.jsonl`. Volet 2 ✅ (2026-06-15) : `server/src/metrics-dashboard.ts` → `GET /api/metrics/summary` agrège 1 463 entrées (coût total, taux erreur, durée moy, distribution modèle/jour/projet/mode + Élève vs Maître). `ui/src/components/MetricsDashboard.jsx` : 4 KPI cards + graphique 21j barres CSS + barre Élève/Maître + horizontal bars modèles + top 10 projets + compteurs mode. Bouton BarChart2 dans barre flottante accueil.

### Idée 15 — Veille mensuelle 📅 rappel actif (le 13 de chaque mois)
Vérifier SDK Agent, modèles, React/Vite/Tailwind, MCP. Appliquer les mises à jour, relancer les tests e2e.

### Idée 16 — GitHub native ✅ FAIT (2026-06-13)
`server/src/github.ts` + `POST /api/github/:name`. Crée le repo (privé par défaut), force-push l'historique. Token scope `repo` dans `server/.env`. Token jamais écrit dans `.git/config`. Validé e2e : push réel réussi.

### Idée 17 — Supabase ✅ FAIT (2026-06-13)
Bloc `SUPABASE_RULES` dans le system prompt. Client unique `src/lib/supabase.js` lisant `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`. SQL + RLS fournis à coller dans l'éditeur Supabase. `.env` git-ignoré. Validé e2e : todo-list persistée dans le cloud.

### Idée 18 — Déploiement étendu ✅ FAIT (2026-06-14)
`deploy.ts` refactoré en registre de providers (`DeployTarget`, `DEPLOY_TARGETS`). Build local commun, CLI propre par cible (`wrangler`/`vercel`/`netlify-cli`), auth par login CLI one-time. UI : menu déroulant 3 cibles. Test 14/14, tsc 0.

### Idées 19-20-22-23 — Formation (lab prompts, tokenisation, RAG, veille IA) 💤
Projets formation à construire avec MangoAI pour comprendre l'écosystème IA par la pratique.

### Idée 21 — Métriques avancées ✅ FAIT (2026-06-14)
`metrics-insights.ts` : `weekly` (coût/tours par semaine ISO) + `costDrivers` (par type de projet). Rendues dans `Metrics.jsx`. Test `test-insights.ts` étendu, tsc 0, build UI OK.

### Idée 24 — Tests auto ✅ FAIT (2026-06-14)
`TESTS_RULES` dans `scenario.ts`, gated Élite uniquement. Vitest à la demande sur la logique pure. `npx vitest run` (jamais le watch). Playwright e2e seulement pour un flux critique.

### Idée 25 — MCP Figma 🗑️ RETIRÉ (2026-06-14)
Supprimés : `figma.ts`, `test-figma.ts`, `FIGMA_RULES`, registre MCP, `FIGMA_TOKEN`. Remplacé par : image jointe 📎 → reproduction (prouvée e2e sur landing Landify, build vert).

### Idée 26 — Multi-projets & composition ✅ FAIT — 3 phases (2026-06-15)
MangoAI gère plusieurs projets liés : l'agent peut lire un composant d'un projet A et le réutiliser dans un projet B. Complémentaire des skills (#10) mais au niveau code.

**Plan en 3 phases** (établi 2026-06-15) :
- **Phase 1 ✅ — Scope élargi + sécurité copie** (`S · ⚖️`) : `multi-project.ts` scanne désormais 6 sous-dossiers (`components`, `hooks`, `utils`, `services`, `types`, `lib`) et 4 extensions (`.jsx/.tsx/.ts/.js`), avec exclusions `*.test.*`/`*.spec.*`/`*.d.ts` (1 niveau de profondeur). Chaque fichier porte un champ `category` (`inferCategory` : service > type > hook > util > component > other). `POST /api/multi-project/copy` accepte `overwrite` ; si la cible existe sans ce flag → HTTP 409 `{ exists: true }`. `MultiProject.jsx` : `CategoryBadge` coloré, `CategoryFilters` (toggles), bandeau de confirmation inline « Écraser ? » qui re-tente avec `overwrite: true`. Sécurité path-traversal conservée.
- **Phase 2 ✅ — Intégration agent** (`M · ⚖️`) : `multiProjectPromptSection(workspaceDir, currentProject?)` + `MULTI_PROJECT_RULES` exportés depuis `multi-project.ts` (`findSourceFiles` exportée). Bloc `multiProject` ajouté au registre `BLOCKS` de `scenario.ts` et inséré juste après `components` dans les 3 scénarios ; nom du projet courant via `path.basename(ctx.projectDir)`. L'agent voit les fichiers réutilisables des AUTRES projets pendant le build (priorité `component`, cap 8/projet & 40 total). Distinction explicite dans les règles : scan brut des autres projets ≠ bibliothèque curée `.components` (#36). `review.ts` finalement HORS périmètre (injection proactive préférée à la détection a posteriori). Test `test-multi-project.ts` 22/22 (sans appel API).
- **Phase 3 ✅ — Recherche sémantique** (`L · 🧠 Opus`) : `POST /api/multi-project/index` résume chaque fichier en ≤ 2 phrases (moteur = **l'Élève local Qwen/Ollama via `ollama.ts`** — passé en interne, $0, hors crédits API ; voir Journal), stocké dans `server/data/multi-project-index.json`. **Incrémental** (hash `taille-mtime`, purge des disparus), cap 60/run (priorité `component`), lots parallèles de 5, contenu tronqué 2500 chars, fallback par fichier. `GET /api/multi-project/search?q=` = keyword scoring sur `summary+file+project+category` (top 15 ; `needsIndex:true` si vide). UI : toggle « Par nom / Recherche sémantique » + résultats (badge+score+résumé) + bouton « Ré-indexer » (toast récap `indexed`/`reused`/`total`). **Garde-fou anti-régression** (ajouté après test e2e) : flag `degraded` sur chaque entrée ; un résumé issu du fallback (appel Haiku échoué) n'est jamais « réutilisé » par l'incrémental — il est re-tenté tant qu'un vrai résumé Haiku n'a pas été obtenu, évitant qu'un index construit sans crédit/clé ne reste figé.

### Idée 27 — Click-to-Segment ✅ FAIT (2026-06-16)
**Réalisation NATIVE, sans SAM/VLM** (verdict d'archi confirmé). Le « segment » devient VISIBLE : overlay de surbrillance au survol en mode inspection, qui dessine la boîte de l'élément sous le curseur + une étiquette (tag + `fichier:ligne`) AVANT le clic. `relay.ts` (`INSPECT_SCRIPT`) : nouveau handler `mousemove` (gaté `ON`, throttle `requestAnimationFrame` + dédup élément/rect) qui poste `{type:"inspect-hover", rect, tag, src}` au parent ; efface (`rect:null`) sur `mouseleave`, passage OFF et après chaque `inspect-pick`. `Preview.jsx` : état `hoverInfo` alimenté par listener `message`, overlay `absolute pointer-events-none` par-dessus l'iframe (couche dans le wrapper `relative`), boîte `border-accent ring bg-accent/10` + chip mono (clamp au-dessus/en-dessous selon `rect.y`). Cross-origin respecté (postMessage only, jamais d'accès DOM à l'iframe). `App.jsx` inchangé. `tsc` 0, build UI 8.2s. SAM/VLM restent rejetés (Qwen-VL gardé pour « faire faire ça à l'Élève » plus tard, hors périmètre).

### Idée 28 — Clapet v4.0 ✅ FAIT (2026-06-16)
**Infrastructure d'auto-élagage posée mais DORMANTE** (anti-OUBLI, jamais anti-CORRECTION : aucune suppression automatique, recommandation seule). `axioms.ts` (ajouts purs) : `removeAxiomAt(raw, index)` (généralise `removeLastAxiom`), type `ImpactScope = global|project|local` + parsing `scope:` dans l'en-tête (défaut global), `computeAblationVerdict(yieldWith, yieldWithout)` pur (`PRUNE_EPSILON=0.02` → keep/neutral/prune), `countCodeAxioms` (BUILD/ARCH/DATA/PERF seulement), `PRUNE_MIN_AXIOMS=5`. `audit-scan.ts` : nouveau mode CLI `--prune-scan` — pour chaque axiome, suite held-out AVEC vs SANS (via `removeAxiomAt` + `audit-verify` rendement réel) → `ablationScore` + verdict + tableau ; **gating** : ne scanne/recommande que si ≥5 axiomes de code, sinon « Clapet v4 prêt — N axiome(s) de code, seuil 5 non atteint → rien à élaguer » (état actuel : 0 axiome de code). Restaure les octets BRUTS du registre après chaque ablation de test (jamais de mutation permanente). `audit-scan.ts` reste CLI-only (jamais importé par `index.ts`). Test `test-clapet.ts` 34/34, `tsc` 0. Source : `D:\IA\axiom v4.md`. Se déclenchera concrètement quand la boucle d'entraînement nocturne (#32) aura accumulé ≥5 axiomes de code.

### Idée 29 — Packaging bêta 💤 Phase B
Compiler `server/` (`.ts` → JS, voire binaire via `bun build --compile`/`pkg`), livrer le front buildé sans les sources. À ce moment réactiver les correctifs « prod » (CORS restreint, token d'auth, rate-limiting).

### Idée 30 — Mode Architecte v2 ✅ FAIT (2026-06-14)
Absorbé dans Mango Plan (idée 9). `PLAN_RULES` (`plan.ts`, Élite) : analyse sur 5 angles, questionne par vagues (plafond 10-15), échappatoire « vas-y avec ton jugement ». `plan.md` enrichi : Vision + table d'architecture des données + features par priorité + arbo+stack+design.

### Idée 31 — clone_url ✅ FAIT (2026-06-14)
`mcp__vision__clone_url` dans `vision.ts`. `captureExternal(url)` screenshot full-page (1280px, ≤5000px). Garde-fou `isCloneableUrl` (bloque localhost/plages privées = anti-SSRF). Test `test-webclone.ts` 13/13, tsc 0.

### Idée 32 — Boucle d'entraînement nocturne ✅ FAIT (2026-06-14)
`server/src/train-loop.ts` (CLI uniquement). Cerveau = Élève local Qwen ($0), Claude en escalade PLAFONNÉE (`--max-escalations` défaut 6). Diversité `composeTask` : 5 types × 30 domaines × 24 styles = 3600 combos uniques. Nettoyage auto du disque (garde `--keep` réussites, défaut 5). Lancer : `cd server && npx tsx src/train-loop.ts --minutes 480 --max-escalations 6 --keep 5`

### Idée 33 — scrape_url ✅ FAIT (2026-06-14)
`mcp__vision__scrape_url` dans `vision.ts`. clone_url rend des PIXELS (design), scrape_url rend l'INFO (titre + texte visible + liens). `processScraped` (pur, testé) tronque/dédoublonne. Test 11/11, validé e2e (Hacker News).

### Idée 34 — Phase Finition + agent QA ✅ FAIT (2026-06-14)
3ᵉ mode `finition` (sélecteur 🛡️ `Header.jsx`). `FINITION_RULES` = Feature Freeze + délégation OBLIGATOIRE au sous-agent `qa` (contrôleur-correcteur) + edge cases + durcissement (validation, `rel=noopener`, a11y, responsive) + auto-backlog dans `<projet>/.memory.md`. Test `test-finition.ts` 12/12, validé e2e.

### Idée 35 — Backend généré ✅ FAIT (2026-06-15)
`backend-generator.ts` (scaffold/start/stop/status + patch `VITE_API_URL`). Template Express+TS dans `server/templates/backend/`. `BACKEND_RULES` dans `scenario.ts`. Type `fullstack` dans `blueprints.ts`. Bouton 🖥 Backend dans `Header.jsx` (3 états). Tests 11/11, tsc 0.

### Idée 36 — Bibliothèque de composants inter-projets ✅ FAIT (2026-06-15)
`components.ts` (5ème magasin). Dossier `workspace/.components/<Name>/`. `COMPONENTS_RULES` + `componentsPromptSection` dans `scenario.ts` (injecté dans les 3 scénarios). `review.ts` étendu (détection composants réutilisables). Panneau Mémoire : section « Composants réutilisables » (liste, tags, aperçu code, copie presse-papier, ajout manuel). tsc 0, build UI OK.

### Idée 37 — Mode idéation visuelle 💤
Extension de Mango Plan : avant d'écrire le premier fichier, MangoAI pose des questions + génère des wireframes ASCII/SVG + montre des références Sharingan. Réduit les itérations de correction estimées à 50%.

### Idée 38 — Carte d'architecture vivante ✅ FAIT (2026-06-15)
`architecture.ts` (`loadArchitecture` / `ARCHITECTURE_RULES` / `architecturePromptSection`). Bloc `architecture` dans les 3 scénarios après `designSystem`. `PUT /api/architecture/:name`. Panneau Mémoire : section "Architecture" avec éditeur inline. tsc 0, build UI OK.

### Idée 39 — Paiements Stripe 💤 (après #35)
Paiement en ligne, abonnements récurrents, webhooks de confirmation, remboursements. Nécessite le backend généré (#35) pour les webhooks serveur.

### Idée 40 — Super-agent spécialisé ✅ FAIT — 3 phases (2026-06-15)
4 phases : (1) Recherche WebSearch+WebFetch ; (2) Synthèse en règles opérationnelles ; (3) Encodage `SKILL.md` + bloc scénario + définition sous-agent nommé ; (4) Validation projet pilote + axiomes. Convoqué automatiquement dès que MangoAI détecte le type de projet.

**Plan en 3 phases** (établi 2026-06-15 — v1 du builder déjà livrée : `POST /api/super-agent/build` génère name+systemPrompt+tools+examples+tags, stockés dans `data/super-agents.json`, UI AgentCard) :
- **Phase 1 ✅ — Recherche web avant génération** (`S · ⚖️`) : `super-agent-builder.ts` fait un appel préalable avec le **web search tool natif de l'API Anthropic** (`web_search_20260209`, casté `as any` car le type littéral peut manquer dans le SDK — fallback de version antérieure `web_search_20250305` documenté en commentaire ; `max_uses: 3`). Le texte de synthèse (blocs `b.type === 'text'`) alimente `webContext`, injecté sous balise `<webContext>` dans le prompt de génération. **Fallback gracieux** : try/catch — si le web search est indisponible (org sans accès, réseau, type non supporté), `webContext=''` et le endpoint produit exactement le résultat d'avant (zéro régression). `SuperAgentBuilder.jsx` : indicateur 2 étapes (`loadingStep` search→generate, bascule par `setTimeout` 3,5 s, `clearTimeout` au `finally`). NB : le SDK `@anthropic-ai/sdk` (v0.104.1) est une dépendance transitive de `@anthropic-ai/claude-agent-sdk` — déjà le cas avant cette phase.
- **Phase 2 ✅ — Export opérationnel** (`M · ⚖️`) : route `POST /api/super-agent/:id/export` (`super-agent-builder.ts`) écrit `workspace/.skills/<slug>/SKILL.md` (frontmatter YAML `name`/`description` strictement conforme au parseur de `skills.ts` : commence par `---\n`, champs sur une ligne, description ≤ 240 chars) + corps (systemPrompt + `## Outils recommandés` + `## Exemples` + `## Tags`) + `META.json`. `slugify` double-sécurisé (`[a-z0-9-]` uniquement, fallback sur l'id). Bouton « Exporter en skill » dans `AgentCard` (`SuperAgentBuilder.jsx`) + toast. **`skills.ts` inchangé** : `listSkills()`/`skillsPromptSection()` détectent automatiquement le skill exporté → un super-agent devient un vrai skill proposé dans le system prompt des futurs builds.
- **Phase 3 ✅ — Détection auto + injection** (`L · 🧠 Opus`) : `matchAgentToProject(projectName)` score chaque super-agent par recouvrement de mots-clés entre {name+domain+tags} et {nom projet + `.memory.md`} (tokenisation NFD + stop-words FR/EN), bonus +1 si `detectProjectType` matche un tag, **seuil 2** anti-faux-positifs. `superAgentPromptSection(projectName)` injecte le systemPrompt (tronqué 1500 chars) du meilleur match sous `## Expert spécialisé actif` dans les 3 scénarios (après `skills`, `""` sinon). `GET /api/super-agent/match?project=X` (id+name+domain+score, jamais le prompt) → badge « Actif sur <projet> » sur la carte (prop `projectName` via `App.jsx`). Matching **sujet-d'abord** (le type technique n'est qu'un bonus).

### Idée 41 — RLHF personnel 👍/👎 ✅ FAIT (2026-06-15)
`feedback.ts` (Haiku extrait le pattern en arrière-plan). `POST /api/feedback`. Boutons 👍/👎 sous chaque message agent dans `Chat.jsx`. `scoreAxiom` dans `axioms.ts` donne +10 aux axiomes `validé-utilisateur` / `à-éviter`.

### Idée 42 — MangoAI cerveau personnel ✅ FAIT (2026-06-15)
`identity.ts` (load/save 3 couches, plafond 3000 chars, injection prompt ~2000 chars). 3 couches : Langage (vocabulaire perso), Façon de penser (rythme exploration/exécution), Vision (100% manuel). Revue arrière-plan cure `.language.md` + `.thinking-style.md` (jamais `.vision.md`). `GET/PUT /api/identity/:layer`. Panneau Mémoire : section "Identité" avec badge "Manuel" sur Vision.

### Idée 43 — Escalade UX/UI par signal humain ✅ FAIT (2026-06-15)
`dislikeStreaks` in-memory par projet (seuil 2) dans `feedback.ts`. `processEscalationReference` (Haiku → axiome `[validé-utilisateur]`). `/api/feedback` répond `{ ok, escalate }`. `POST /api/escalation-reference`. `EscalationCard` dans `Chat.jsx` (carte ambre, input référence + bouton "Ancrer").

### Idée 44 — Orchestration « conseil d'experts » 💡 IDÉE (actée 2026-06-16) · `M · 🧠 Opus`
Orchestration multi-agents **en lecture seule**, pensée pour le **rattrapage d'un projet dévié** (mauvaises infos/prompt au départ), pas pour la génération initiale. N super-agents (#40) lisent le projet **chacun sous leur seul angle** → diagnostics fusionnés en un **plan de reprise priorisé** validable → le builder applique **séquentiellement** (un seul writer). Recommandé vs la variante « 5 codeurs parallèles » qui tombe dans le *merge hell* (gain incertain, risque élevé). Léger en archi : 1 fichier `orchestrator.ts` sur le routeur `askLLM` existant ; la fusion de **diagnostics** (texte) est facile, contrairement à une fusion de **code**. Non implémentée — décision utilisateur en attente.

### Idée 45 — Contrat de langage du projet ✅ FAIT (2026-06-16, Opus)
**Livré, 3 phases.** Nouveau module `lexique.ts` (calqué sur `architecture.ts` #38) : artefact `<projet>/.lexique.md` (plafond 3000 chars), `loadLexique`/`saveLexique`, `LEXIQUE_RULES` (table 4 colonnes, verrouillage du vocabulaire sur tous les fichiers, maintien vivant, résolution des retours flous, 3 garde-fous), `lexiquePromptSection`, `generateLexique(dir, intention, deps?)` (Porte A : recherche web `claudeWebResearch` si domaine spécialisé puis génération via `askLLM` — voie abonnement $0, JAMAIS `new Anthropic()` ; idempotent ; cerveaux injectables pour test), et helpers PURS `parseLexiqueRows`/`resolveNaturalTerm` (terme naturel→composant pour #5/#43). **Phase 2** : bloc `lexique` injecté dans les 3 scénarios juste après `architecture` (`scenario.ts`). **Phase 1/Porte A** : `void generateLexique(dir, prompt).catch(()=>{})` en fire-and-forget dans `/api/chat` (non bloquant, ne tourne qu'une fois par projet via la garde `if (loadLexique(dir)) return`). **Phase 3 légère** : routes `GET/PUT /api/lexique/:name` + champ dans `/api/knowledge/:name` ; `PLAN_RULES` enrichi (section « Contrat de langage » dans `plan.md` + mode exploration : réponse vague → 2-3 directions concrètes ; `MOODBOARD_RULES` non touché) ; section « Contrat de langage » (icône `BookText`, éditeur inline) dans `Knowledge.jsx`. Test `test-lexique.ts` vert (plafonds, parse, resolveNaturalTerm, idempotence + déclenchement web conditionnel), `tsc` 0, build UI OK. Pas de 3ᵉ grande surface UI (mode exploration = directive prompt).

**Concept** : avant de coder, Mango établit un **lexique commun verrouillé** (= *Ubiquitous Language* du Domain-Driven Design) qui impose le même vocabulaire du premier au dernier fichier → tue le spaghetti à la racine (un concept = un nom = un composant) et **résout les retours flous** (« la barre de vie est trop petite » → `HealthBar` dans `HUD/`). C'est la **fondation** posée juste après la question d'intention, **avant** le moodboard (#37) et le plan (#9). Renforce #5 (clic→source), #38 (carte d'archi vivante), #43 (escalade UX).

**Structure du tableau** (artefact projet, à côté de `memory.md`/`design.md`) :

| Terme naturel (humain) | Terme technique (domaine) | Composant / fichier | Description |
|---|---|---|---|
| « la barre de vie » | HUD health bar | `HealthBar.jsx` (`HUD/`) | Jauge de PV, coin haut-gauche |
| « la liste des tâches » | TaskList | `TaskList.tsx` | Conteneur scrollable des items |

La colonne **Composant/fichier** verrouille la structure et branche le lexique sur le clic→source.

**Deux portes d'entrée** (comme chat vs atelier) :
- **Porte A — background naturel** : l'utilisateur parle normalement à Mango ; le contrat se construit **tout seul en arrière-plan** à partir de la phrase d'intention. Si Mango ne maîtrise pas le champ lexical du domaine → **recherche web approfondie** (`claudeWebResearch`) car c'est la base de tout le projet. Plus fluide, zéro friction.
- **Porte B — cadrage assisté, FUSIONNÉ dans Mango Plan (#9)** (décision 2026-06-16) : pas de fenêtre séparée. Mango Plan fait déjà l'essentiel (dialogue de scoping adaptatif en vagues + échappatoire « vas-y avec ton jugement » + recherche web des leaders via `MOODBOARD_RULES`). On **greffe** dessus : (1) le contrat de langage devient une **section de `plan.md`** (le contrat vivant existant) ; (2) un **mode exploration pour les indécis** — réponse vague → Mango propose 2-3 directions concrètes (concept + style + features) à choisir plutôt que reposer une question ouverte, en branchant l'idéation visuelle #37. Évite une 3ᵉ surface et le formulaire rigide qui fait fuir la cible visée (« ne sait pas ce qu'il veut »).

**Garde-fous** : (1) **auto-généré, pas un formulaire** à remplir à la main (validation 30 s) ; (2) **vivant** — nouveau composant créé → ligne ajoutée auto (via #38) sinon doc morte ; (3) **ancré sur le réel** (domaine + composants réellement créés), pas un champ lexical halluciné.

**Plan en 3 phases** :

| Phase | Contenu | Modèle | Effort |
|-------|---------|--------|--------|
| **1 — Fondation background** | Génération auto du contrat depuis l'intention + **recherche web** si domaine inconnu (`claudeWebResearch`) ; persistance en artefact projet (`lexique.md` ou section dédiée) ; affichage simple. La Porte A fonctionnelle. | ⚖️ Sonnet 4.6 | M |
| **2 — Contrat vivant + injecté** | Injection du contrat dans les 3 scénarios (`scenario.ts`, bloc « Contrat de langage ») → l'agent verrouille le vocabulaire ; **maintien vivant** (nouveau composant → ligne auto, via #38) ; résolution *terme naturel → composant* exploitée par les retours flous (#5/#43). | 🧠 Opus 4.8 | M |
| **3 — Cadrage assisté (DANS Mango Plan, pas de surface séparée)** | Contrat de langage = section de `plan.md` ; **mode exploration pour indécis** (propositions concrètes cliquables + idéation visuelle #37) ; panneau d'édition léger du lexique (réutilise le pattern d'édition des super-agents). Le moodboard visuel est sorti en **#46** (livrable seul). | ⚖️ Sonnet 4.6 | L |

### Idée 46 — Moodboard visuel réel via Sharingan ✅ FAIT (2026-06-16)
**Le câblage manquant trouvé et fait** : `mcp__vision__sharingan_url` (#8) existait dans `vision.ts`/`visionServer` mais n'était PAS dans `allowedTools` de `agent.ts` → l'agent ne pouvait pas l'appeler. Ajouté à `allowedTools` + libellé « Sharingan » (2 switches). `MOODBOARD_RULES` (`plan.ts`) réécrit en 3 étapes : DÉCOUVRIR (WebSearch → 3-5 leaders) → CAPTURER (`sharingan_url` sur 2-3 leaders, cap explicite, skip si tiny project) → écrire les VRAIES valeurs (hex exacts ex. `#FF6B35`, fonts+graisses, tokens CSS, structure sémantique) dans la section « Références & arborescence » de `plan.md`, au lieu de deviner en mots. Commentaire périmé « Autonomous visual capture … stays a planned enhancement » remplacé (Sharingan EST cet outil, désormais branché). `tsc` 0. **Extension 2026-06-16 (demande utilisateur) — moodboard auto AUSSI en MVP, à MOITIÉ de capacité** : nouvelle constante `MOODBOARD_RULES_MVP` (`plan.ts`) + bloc `moodboardMvp` inséré dans le scénario `mvp` (après `backend`). Version frugale : **1 seul** leader (choisi par l'agent depuis sa connaissance du domaine ou une URL déjà donnée), **1 seule** capture `sharingan_url`, valeurs appliquées **directement au build** — PAS de `plan.md`, PAS de WebSearch, PAS de cadrage. Skip si tiny/quick/design déjà fourni. Élite garde le moodboard complet (3-5 leaders via WebSearch → 2-3 captures → `plan.md`) ; finition sans moodboard (freeze). **Affiné en option B (2026-06-16, choix utilisateur après débat fiabilité)** : la V1 « 1 leader choisi de mémoire, zéro web » était moins fiable (URL inventée/morte → ancrage silencieusement nul) et ralentissait quand même le MVP. Option B retenue : MVP fait **1 seul WebSearch** pour trouver/vérifier un vrai leader + **1 seule** capture `sharingan_url`, appliqué direct au build (toujours pas de `plan.md`, pas de cadrage, **pas de WebFetch** deep-read). `agent.ts` : `webTools` donne désormais `["WebSearch","WebFetch"]` en Élite, **`["WebSearch"]` seul en MVP**, rien en finition. C'est la « moitié » honnête : même feature que l'Élite, capée à 1 recherche + 1 capture. `test-scenario.ts` 15/15, `tsc` 0. — *idée originale ci-dessous :* Brancher `mcp__vision__sharingan_url` (#8) sur `MOODBOARD_RULES` (#7/#11) : au lieu de *lire* le HTML des leaders et **deviner** le style en mots (« thème clair, nav sticky »), Mango les **capture** et extrait les **vraies valeurs** (palette `#FF6B35` + crème, police Poppins 600, grille 3 colonnes gap 24px…). Comble explicitement le « *Autonomous visual capture of the leaders (Playwright screenshots) stays a **planned enhancement*** » écrit dans le code — Sharingan, livré depuis, EST cet outil. **Trois placements** : (A) **auto dans le plan** = le vrai trou à combler (infra MOODBOARD déjà là, juste brancher) ; (B) **à la demande** = déjà ~80 % couvert (Sharingan/#31/#33 invocables) ; (C) « les deux » = obtenu de fait en faisant A. Cible : **A**, on hérite de C. Décision utilisateur : pertinent, validé.

### Idée 47 — Cadrage fondateur multimodal 💡 IDÉE (actée 2026-06-16) · `L · 🧠 Opus`
**Le chef d'orchestre du démarrage** — concept-parapluie qui formalise la conviction directrice de l'utilisateur : *« bien préparer son prompt de départ, le bon langage, les bonnes références, est la base de tout MangoAI — comprendre ce que l'utilisateur pense et veut réellement »*. Réunit en une vraie phase de cadrage les briques **déjà existantes mais éparses** : (1) intention + dialogue Mango Plan (#9) ; (2) contrat de langage (#45) ; (3) références **web** via Sharingan (#46) ; (4) références **en pièce jointe** — `uploads.ts` gère DÉJÀ PNG/JPEG/WebP/GIF/**PDF** (25 Mo) → `.assets/`, lus nativement par la vision de l'agent (`vision.ts`). **Exemple** (app réservation resto) : intention + 3 screenshots d'ambiance + photo du lieu + PDF du menu + 2 URLs leaders → Sharingan capture les URLs, la vision lit screenshots/photo (palette ancrée sur le lieu réel) et le PDF (catégories → modèle de données) → `plan.md` riche et ancré. **Constat clé : ~80 % des briques existent déjà** (uploads, vision, Sharingan, Mango Plan) — l'effort porte sur l'**orchestration** au démarrage, pas sur la construction. Effort L car transversal (flux d'amorçage + UI de dépôt de références au bon moment + synthèse multi-sources dans le plan). Voir mémoire `cadrage-fondateur-principe`.

### Pôle « cadrage » — extensions 48-52 💡 IDÉES (actées 2026-06-16)
Cinq idées qui amplifient le cadrage fondateur (#45/#46/#47), toutes ancrées sur des briques **déjà existantes** :
- **#48 — Le Miroir** (`M · 🧠 Opus`) : avant d'écrire une ligne, Mango renvoie une **page récap validable** « voici ce que j'ai compris de toi » (palette extraite, lexique/contrat de langage, structure, références digérées). L'aboutissement de #47 : rend la compréhension **visible et corrigeable**, tue les malentendus avant qu'ils ne coûtent. S'appuie sur `plan.md`, #37 idéation, `vision.ts`.
- **#49 — Cadrage qui apprend de toi** (`M · ⚖️ Sonnet`) : un nouveau projet **hérite** des préférences récurrentes détectées sur les anciens (tons, police, layout). Le cadrage raccourcit à chaque projet. S'appuie sur #42 identité 3 couches + #A design system persistant. Cœur « cerveau personnel ».
- **#50 — Banque de références perso** (`M · ⚖️ Sonnet`) : mood library réutilisable (screenshots/URLs/palettes) — même pattern que #36 (composants inter-projets) mais pour les **inspirations**. Les `.assets/` deviennent un capital. S'appuie sur `uploads.ts`, #26, #36.
- **#51 — Sharingan-sur-image** ✅ FAIT (2026-06-16) : nouvel outil `mcp__vision__sharingan_image({path})` dans `vision.ts` — extrait une **palette hex + ambiance structurées** d'une image jointe (`.assets/`, PNG/JPEG/WebP/GIF). Pixels via canvas Playwright 64×64 (zéro nouvelle dépendance), helpers PURS exportés/testés : `quantizePixels` (buckets 5 bits/canal), `bucketKeyToHex`, `topColorsFromBuckets`, `luminosityLabel`/`saturationLabel`/`temperatureLabel`, `ambianceDescriptor` (« sombre · vif · chaud »). Réutilise `dedupeColors`. Ajouté à `allowedTools` + libellé « Sharingan image » + ligne dans `VISION_INPUTS` (`scenario.ts`). Test `test-sharingan-image.ts` vert, `tsc` 0. Unifie URL ↔ image. — *idée originale :* appliquer l'extraction design de Sharingan à une photo jointe, pas qu'à une URL ; complète #46/#47.
- **#52 — Clarification proactive** (`S · 🧠 Opus`) : au cadrage, si l'utilisateur dit une chose et que ses références en disent une autre (« épuré » + 3 réfs chargées), Mango le **signale** au lieu de coder un truc bancal. Garde-fou « ancré sur le réel » de #45 rendu actif. S'appuie sur Mango Plan #9 + #43.

**Reco d'ordre** : trio prioritaire #48 (scelle la compréhension) + #51 (petit, complète #46/#47) + #49 (âme cerveau personnel) ; #50 et #52 = compléments.

### Idée 53 — Carte des capacités 💡 IDÉE (actée 2026-06-16, pour plus tard) · `L · 🧠 Opus`
**Synthèse vivante de TOUTES les compétences de Mango**, pas une simple liste : un inventaire qui compile en un seul endroit les **blocs de prompt** (registre `BLOCKS`/`SCENARIOS` de `scenario.ts`), les **outils MCP** (vision : snapshot/clone_url/scrape_url/sharingan_url/sharingan_image, Figma…), les **skills** (`.skills/`), les **super-agents** (#40), les **modes** (mvp/elite/finition) et les grandes fonctions (Mango Plan #9, contrat de langage #45, moodboard #46, extraction de données, déploiement, GitHub, Supabase…). **Chaque capacité porte son POIDS** : coût en tokens dans le system prompt + latence/coût d'exécution (idéalement dérivé des métriques `.metrics.jsonl` et du tokenizer #20). **Finalité = gouvernance par la donnée** : une fois la carte compilée, et surtout **après l'audit des coûts #13 (2026-06-22)**, on obtient une vue d'ensemble qui permet d'**arbitrer capacité × phase/mode** — réintégrer une capacité utile dans un mode, ou en **retirer une trop lourde** (ex. ce qu'on a fait à la main pour le moodboard MVP : Sharingan complet en Élite, capé à 1 recherche+1 capture en MVP). C'est l'industrialisation de ce réflexe « quelle capacité dans quel mode, à quel coût ». Briques déjà là : le système de blocs nommés de `scenario.ts` rend l'inventaire des capacités prompt **auto-dérivable** ; `metrics-insights.ts` + le tokenizer #20 fournissent le poids ; l'audit #13 fournit le contexte de décision. Effort L car transversal (touche toute la surface de capacités + une vue/outil d'arbitrage). Dépend de #13 → à faire APRÈS l'audit. Renforce #13 (coûts), #29 (packaging Phase B : savoir quoi embarquer/alléger).

---

## 🎯 Roadmap haute couture — détail des chantiers

### Chantier A — Design system persistant ✅ FAIT (2026-06-15)
`design-system.ts` (`loadDesignSystem` / `saveDesignSystem` / `DESIGN_SYSTEM_RULES` / `designSystemPromptSection`). Bloc `designSystem` dans les 3 scénarios. `GET /api/design-system` + `PUT /api/design-system`. Panneau Mémoire : section "Design system" avec éditeur Markdown inline.

### Chantier 8 — Sharingan ✅ FAIT (2026-06-15)
`mcp__vision__sharingan_url` dans `vision.ts` — 6 couches en 1 session Playwright : (1) screenshot JPEG 1280px, (2) CSS calculé des sélecteurs clés, (3) variables CSS `:root` (design tokens), (4) structure sémantique (titre, nav, sections, headings, CTAs, ARIA landmarks), (5) fonts détectées, (6) palette dédupliquée. `cssColorToHex` + `dedupeColors` exportées et prouvées (24/24 tests). Déclencher via : "Sharingan", "deep clone", "pixel-perfect".

---

## 🏛️ Phase Ultime — Architecture de compagnonnage (détail)

### Jalon A — Coque Souple ✅ LIVRÉ (2026-06-13)
`server/src/scenario.ts` assemble des blocs nommés selon le scénario via `assembleSystemPrompt(ctx)`. Constantes de prompt déplacées d'`agent.ts`. `selectAxioms()` pour la récupération par type.

### Jalon B — Panneau métriques ✅ LIVRÉ (2026-06-13)
`GET /api/metrics` + dropdown « 📊 Métriques » (`ui/src/components/Metrics.jsx`) — cartes (tâches, coût cumulé/moyen, taux d'erreur), barres coût/jour, répartition par modèle et par mode.

### Jalon C — Contrat d'E/S ✅ LIVRÉ v1 (2026-06-13)
Spec `docs/contrat-es.md` + `server/src/contract.ts` (`parseContract` : balises `<mangoai>` write/edit/run/summary/axiom, réparation fence/prose/enveloppe, sécurité chemins, ordre préservé). 16/16 tests déterministes verts.

### Jalon D — Branchement Élève ✅ LIVRÉ (2026-06-13)
Élève = **Qwen2.5-coder:14b** (upgradé 2026-06-15) local via Ollama (GTX 1080 Ti, 11 Go). Briques prouvées : (1) relais Élève→contrat `<mangoai>` 16/16 ; (2) `executor.ts` (écriture atomique, edit exact, liste noire) ; (3) `inspection.ts` (vrai `vite build` = juge OBJECTIF) ; (4) `eleve.ts` (`runRelay` : Élève → executeContract → inspectProject → escalade Claude si N échecs + axiome) ; (5) 4ᵉ cerveau « 🎓 Élève local » dans le sélecteur ; (6) `selectAxioms()` v2 (pertinence + maturité, plafonnée pour l'Élève).

**Tuyauterie « Élève turbo » :** `ELEVE_PROVIDER=openai` branche un endpoint compatible OpenAI (DeepSeek, Qwen3 sur VPS) via `.env` sans toucher au code.

### Dashboard de Compagnonnage & Audit Scan
- **Phase 1 — agrégateurs** (`metrics-insights.ts`, pur/testé 20/20) : rendement 1er tour (`attempts===1`), souveraineté estimée (économies nettes), courbe d'émancipation, cartographie du clapet (`axiomStats`).
- **Phase 2 — vues par type** : champ `projectType` ajouté aux métriques → rendement & économies par type.
- **Phase 3 — Audit Scan** (`audit-scan.ts`, CLI JAMAIS importé en prod) : suite figée held-out (`audit-tasks.ts`), mode `--ablate` (AVEC vs SANS le dernier axiome → attribution causale). Vérification d'EFFET : chaque tâche porte une attente `expect` (`audit-verify.ts`), l'audit mesure le RENDEMENT RÉEL (build ET changement atterri). Live : 9 tâches, build 100 %, rendement réel 89 % (`edit-app-header` build-vert-sans-effet démasqué).

### Pistes futures — Jalon D / Élève
1. ✅ Fournir le CONTENU du fichier cible à l'Élève — FAIT (#1, 2026-06-13)
2. Accumuler de vrais tours Élève + `--ablate` après chaque nouvel axiome
3. ✅ `selectAxioms` v2.1 — FAIT (2026-06-13)
4. Tâches d'audit avec dépendances (recharts, date-fns…) — une vraie copie de `node_modules`
5. ✅ Modèle Élève plus fort — FAIT : `qwen2.5-coder:14b` 🥇 (2026-06-15)
6. Veille mensuelle : surveiller les modèles de code locaux (Qwen3-coder MoE quand il tiendra en 11 Go)
7. ✅ Critère de succès des `<edit>` au-delà du build — FAIT : `audit-verify.ts` (2026-06-13)
8. Critère de succès de `runRelay` en production — exiger un diff non vide avant de déclarer succès

### 📌 Note d'analyse — idée 27 « Click-to-Segment »
**Verdict : excellente DESTINATION, mais SAM + VLM séparé sont SUPERFLUS — Claude + le DOM la font nativement.**

Le SEUL vrai point dur = pixel → code. SAM ne le résout pas (un masque dit *où à l'écran*, jamais *quelle ligne de TSX*). Solution native : `document.elementFromPoint(x,y)` → nœud DOM EXACT + tampon Babel `data-mango-src="fichier:ligne"` (Vite/Babel transforme déjà le JSX, dev-only via NODE_ENV).

Note : `_debugSource` RETIRÉ en React 19 — la réponse native = tampon Babel.

Architecture livrée (#5) : tampon Babel (`clicksource.ts`) → `inspect-relay` (`relay.ts`, clic→postMessage) → composer préchargé avec réf source → Claude/Élève édite via Coque Rigide (#6). Prouvé e2e à $0.

SAM/VLM local gardent un sens PLUS TARD : Qwen-VL pour faire faire ça à l'Élève à coût zéro.

### 📌 Conclusion : agents spécialisés pour les tâches auxiliaires ? NON
Presque tout l'auxiliaire est déjà du code pur (git, deploy, github, preview, npm, Playwright, métriques). La seule tâche LLM auxiliaire récurrente (`review.ts`) tourne déjà sur Haiku. Le vrai levier de coût = le tour de build principal. Leviers déjà en place : MVP, choix modèle, blueprints, audit 22/06, Élève.

---

## 🚀 Montée en puissance — ordre de priorité recommandé

### Phase 1 — Fondations (toutes ✅ FAIT)
| Ordre | Idée | Statut |
|-------|------|--------|
| 1 | Sélecteur MVP/Élite (12) | ✅ |
| 2 | Intégration GitHub native (16) | ✅ |
| 3 | Intégration Supabase (17) | ✅ |

### Phase 2 — Cerveau plus puissant (toutes ✅ FAIT)
| Ordre | Idée | Statut |
|-------|------|--------|
| 4 | Knowledge Flywheel (10) | ✅ |
| 5 | Blueprints + stacks par type (8+6) | ✅ |
| 6 | Mango Plan + Moodboard (9+11) | ✅ |

### Phase 3 — Formation (💤 à venir)
| Ordre | Idée | Ce que tu comprends |
|-------|------|---------------------|
| 7 | Visualiseur de tokenisation (20) | Les tokens, le coût, la fenêtre de contexte |
| 8 | Lab de prompts (19) | La différence entre modèles, l'impact du prompting |
| 9 | Agent de notes & RAG (22) | Comment un agent choisit quoi lire |
| 10 | Dashboard de veille IA (23) | Rester à jour automatiquement |

### Phase 4 — Vision avancée & qualité (💤 à venir)
| Ordre | Idée | Ce qu'elle apporte |
|-------|------|---------------------|
| 11 | Inspiration web contextuelle (7) | Niveau « senior » dès le 1er message |
| 12 | Agent QA temporel (1) | Bugs d'animation détectés en mouvement |
| 13 | Design pair-programming (2) | L'agent montre avant de faire |

### Phase 5 — Expansion écosystème (💤 à venir)
| Ordre | Idée | Valeur |
|-------|------|--------|
| 14 | Paiements Stripe (39) | Dernier gap fonctionnel majeur |
| 15 | Mode idéation visuelle (37) | Réduit les itérations de 50% |
| 16 | Packaging bêta (29) | Frontière Phase A→B |

### Phase 6 — Maturité & finitions (💤 à venir)
| Ordre | Idée | Horizon |
|-------|------|---------|
| 17 | Généalogie visuelle (3) | Time-line de renders type Figma |
| 18 | Documentation multimodale (4) | Guides illustrés auto-générés |
| 19 | Multi-projets & composition (26) | Bibliothèque de composants perso |

---

## ✅ Fait et fonctionnel — socle complet

- MVP complet testé de bout en bout
- Backend Express + Claude Agent SDK (port 3000)
- UI builder chat + aperçu live (port 5173), apps générées sur port 5174
- Sessions persistées par projet (`server/sessions.json`)
- Sélecteur de projets existants, bouton ■ Stop
- Choix du modèle dans l'UI (⚡ Haiku / ⚖️ Sonnet / 🧠 Opus)
- Export ⬇ Zip du projet généré (sources sans node_modules)
- Versions & rollback git — commit auto après chaque itération
- Historique de chat persisté par projet
- Auto-réparation des erreurs (bandeau ⚠ + bouton « 🔧 Corriger »)
- Templates de démarrage — 4 starters
- Déploiement 1-clic (Cloudflare + Vercel + Netlify)
- Refonte UI complète — Tailwind v4 + lucide-react + react-markdown
- Boucle d'apprentissage Hermes (5/5) — mémoire, profil, skills, revue, subagents
- Panneau « 🧠 Mémoire » dans le header
- Compression de contexte (`compaction.ts`, seuil 70%, résumé haiku, jauge header)
- Raisonnement analytique (Opus/Sonnet) — extended thinking adaptatif, blocs repliables
- Robustesse des magasins — validation stricte, écritures atomiques (`safe-io.ts`)
- Mode vision avancé en boucle fermée — snapshots, crop, zoom, boucle patch→critique
- Tailwind v4 préinstallé dans chaque nouveau projet
- Bouton Snap — capture interactive d'une zone de l'aperçu
- Sélecteur ⚡ MVP / 💎 Élite
- Intégration GitHub native — bouton header, repo privé, push auto
- Mango Plan + moodboard (Élite)
- Blueprints + stacks par type (6 types)
- Knowledge Flywheel — `.axioms.md`, curé par revue, injecté au system prompt
- Intégration Supabase — `.env` git-ignoré, RLS obligatoire
- Business model & plan d'action — `business-model.pdf` (13 pages)
- Dépôt GitHub privé : https://github.com/u2987920406-rgb/mangoai

---

## 🗺️ Roadmap — surpasser Lovable (analyse 2026-06-12)

**Avantages structurels acquis :**
- Coût marginal zéro + itérations illimitées (abonnement Claude Code vs crédits payants)
- Moteur = preset `claude_code` (le même agent que les pros)
- Code 100 % local, propriété totale, confidentialité

**Améliorations livrées :**
1. ✅ Rollback par git auto-commit
2. ✅ Historique de chat persisté
3. ✅ Auto-réparation des erreurs
4. ✅ Templates de démarrage (4)
5. ✅ Déploiement 1-clic (Cloudflare, Vercel, Netlify)
6. ✅ Supabase pour apps avec données/auth

## 🧠 Roadmap — niveau Hermes Agent (analyse 2026-06-12)

**Mécanismes clés extraits du code source Hermes :**
- Mémoire curée par l'agent (`tools/memory_tool.py`) : MEMORY.md + USER.md
- Nudge périodique tous les 10 tours → revue en arrière-plan
- Prompts de revue : « que sauver » / « que NE PAS sauver »
- Skills auto-créées (`tools/skill_manager_tool.py`) : SKILL.md niveau « classe de tâche »
- Subagents isolés, cron jobs

**Améliorations livrées :**
1. ✅ Mémoire par projet (`workspace/<projet>/.memory.md`)
2. ✅ Profil utilisateur global (`workspace/.user-profile.md`)
3. ✅ Skills apprises (`workspace/.skills/<nom>/SKILL.md`) + divulgation progressive
4. ✅ Revue en arrière-plan (`review.ts`, agent haiku, ~$0.02-0.04/revue)
5. ✅ Subagents parallèles (agent `builder`, outils fichiers uniquement)
6. ✅ Compression de contexte (`compaction.ts`)
7. ✅ Raisonnement analytique (extended thinking adaptatif)
