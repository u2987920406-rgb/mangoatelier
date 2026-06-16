# 🥭 Brief de session — Atelier — 16 juin 2026

> ⚠️ **INSTRUCTION POUR CLAUDE À LA MAISON** : Lis ce fichier intégralement, puis **supprime-le immédiatement** (`rm SESSION-BRIEF.md` ou via l'outil Edit/Bash). Il ne doit pas persister ni être relu à chaque session. Une seule lecture, puis poubelle.

---

## Qui est Raf et ce projet

Raf est le créateur de **MangoAI** — un builder d'applications web local-first piloté par IA (Claude + Qwen local via Ollama). C'est un outil personnel confidentiel, non destiné au grand public. Architecture : backend Express + TypeScript (port 3000), UI React + Vite + Tailwind v4 (port 5173).

**Modèle de déploiement à terme :**
- Phase 1 (maintenant) : usage personnel de Raf uniquement
- Phase 2 (futur) : B2B — installé chez des clients pros/amis du réseau de Raf. Chaque client = 1 instance séparée, repart à zéro sur la connaissance utilisateur mais garde le cœur du moteur.
- Phase 3 (long terme) : couche cognitive pour robots humanoïdes. MangoAI est déjà structurellement un OS cognitif.

**Remotes git configurés :**
- `origin` → `https://github.com/u2987920406-rgb/mangoai` (repo principal — ne jamais compromettre)
- `atelier` → `https://github.com/u2987920406-rgb/mangoatelier` (miroir)

**Règle absolue sur git :** Ne jamais faire de `git pull` ou `git push` de façon autonome ou proactive. Uniquement sur demande explicite de Raf.

---

## Ce qu'on a fait lors de cette session

### 1. Synchronisation git
- Pull depuis `mangoai` (80 fichiers mis à jour)
- Push vers `mangoatelier` (configuré comme second remote nommé `atelier`)

### 2. Analyse complète de MangoAI
On a produit une analyse approfondie en plusieurs volets :
- **Inventaire complet** : 93 fichiers serveur TypeScript, 25 composants React, 80+ routes API, 55 idées livrées, 14 magasins de persistance, 4 jalons compagnonnage complétés.
- **Analyse structurelle** : code évolutif pour 1 utilisateur/machine. `index.ts` (1 178 lignes) = seul vrai problème de maintenabilité.
- **Unicité** : MangoAI est objectivement unique — aucun builder public (Cursor, Lovable, v0, Bolt) ne combine apprentissage continu + modèle local + identité utilisateur + plan avant code.
- **Points forts uniques** : Flywheel Hermes, Coque Souple (prompt-as-data), inspection objective, 4 types de savoir séparés, relation Maître↔Élève.
- **Axes d'amélioration** organisés en 3 phases (Personnel / B2B / Robot) avec scores de faisabilité.

### 3. PDF généré
Fichier `MangoAI-Analyse.pdf` créé sur le Bureau de l'atelier (via Playwright). Contient toute l'analyse avec tableaux stylés, barres de score, design dark violet MangoAI. Non poussé sur GitHub (fichier Bureau).

### 4. Grand projet validé : Système Tutorial Orchestral
**C'est le chantier principal approuvé.** Voir `TUTORIAL-PLAN.md` dans ce repo pour le plan complet.

Concept clé : tutoriel bidirectionnel — MangoAI apprend Raf pendant que Raf apprend MangoAI. Calibration mutuelle, pas un tutoriel classique.

---

## Le Grand Projet : Système Tutorial Orchestral

### Vision
10 tutoriels progressifs, de 0% liberté (couloir guidé) à 100% liberté (monde ouvert). Chaque tutoriel active des capacités réelles de MangoAI sur de vrais projets.

### Ce qui a été décidé
- **Pas de minuterie** — les durées sont purement estimatives, chaque tuto s'adapte au rythme de Raf
- **Toutes les capacités utilisées** : Sharingan, Super-agents, Conseil d'experts, Miroir, Lexique, Backend généré, Déploiement, GitHub, Dictée vocale, Métriques — tout est vécu en situation réelle, jamais en démo fictive
- **Double apprentissage** : chaque 👍/👎 + commentaire → axiome tagué `[tutoriel-N]` → profil enrichi
- **RelationshipCard** en fin de chaque tutoriel : "ce que MangoAI a appris de toi cette session"

### Les 10 tutoriels
1. L'interface MangoAI — freedomLevel 0% — ~15 min
2. Premier projet MVP (landing page) — 10% — ~20 min
3. Itérer et finir (mode Finition) — 20% — ~20 min
4. Premier projet Élite (webapp) — 35% — ~25 min
5. Design system + Sharingan — 45% — ~25 min
6. Full-stack + Super-agent + Conseil — 55% — ~30 min
7. Multi-projets + composants réutilisables — 65% — ~25 min
8. Déploiement + GitHub — 75% — ~20 min
9. Projet semi-libre (guidage léger) — 88% — ~30 min
10. Projet 100% personnel (monde ouvert) — 100% — libre

### Ordre d'implémentation approuvé
- **Chantier A (priorité)** : `tutorial.ts` + routes API + `Tutorial.jsx` (squelette sans spotlight) + App.jsx + tutoriels 1 et 2 définis
- **Chantier B** : `TutorialSpotlight.jsx` + `TutorialRelationshipCard.jsx` + liberté UI propagée
- **Chantier C** : `tutorial-feedback.ts` + bloc tutorial dans `scenario.ts` + mini-review Haiku aux checkpoints
- **Chantier D** : contenu tutoriels 3 à 10

---

## Taux de complétion de MangoAI (évaluation session)

**Pour un usage quotidien personnel : ~75%**

| Domaine | % | Ce qui manque |
|---------|---|---------------|
| Moteur de génération | 95% | Quasi-parfait |
| Mémoire & apprentissage | 85% | Score par axiome + Hermes sur échecs |
| Interface utilisateur | 78% | Guidage et polish |
| Calibration (tutoriel) | 5% | Plan approuvé, rien codé encore |
| Automation nocturne | 55% | Infrastructure existe, boucle humaine manque |
| Human-in-the-loop structuré | 20% | 👍/👎 existe, review matinale manque |

Ce qui manque n'est pas du moteur — c'est de connaître Raf. L'ajout de nouvelles fonctions ne cassera pas le cœur grâce à la Coque Souple (ajouter = ajouter un bloc, pas modifier le flux).

---

## Nouvelle Idée Majeure — Automation Nocturne + Review Matinale (Human-in-the-Loop)

**Concept approuvé, à implémenter après le tutoriel.**

### Vision de Raf
- La nuit : MangoAI génère automatiquement 5 projets (PC laissé allumé)
- Le matin : Raf ouvre une galerie de review — supprime immédiatement ce qui ne plaît pas
- Pour chaque projet conservé : questionnaire structuré (cases à cocher + annotations positives/négatives)
- Validation directe possible → MangoAI enregistre les éléments qui ont produit ce résultat
- Résultat : boucle d'apprentissage qui tourne chaque nuit, s'améliore chaque matin

### Connexion tutoriel → automation (insight clé)
Le tutoriel est le "cold start" de toute la machine. Sans calibration préalable, les projets nocturnes sont génériques. Avec le tutoriel, ils partent d'un profil calibré. **Ordre impératif : tutoriel d'abord, automation ensuite.**

```
Tutoriel → calibration initiale (goûts, style, préférences)
    ↓
Automation nocturne → génère 5 projets basés sur ce profil
    ↓
Review matinale → Raf coche/supprime/annote (10-15 min)
    ↓
Axiomes mis à jour → prochaine nuit meilleure
    ↓
Flywheel qui tourne indéfiniment
```

### Ce qui existe déjà pour ça
- `cron-scheduler.ts` ✅ — peut planifier la génération nocturne
- `train-loop.ts` ✅ — génération en batch
- `feedback.ts` ✅ — capture 👍/👎
- `metrics.ts` ✅ — enregistre les résultats

### Ce qui manque
- Galerie de review matinale (vue grille des projets nocturnes)
- Questionnaire structuré par projet (5-8 questions + cases)
- Bouton suppression rapide par projet
- Connexion questionnaire → axiomes (extension de `processFeedback()`)

---

## Notions Théoriques à Intégrer dans MangoAI

Ces concepts de recherche IA sont directement applicables à l'architecture de MangoAI. À garder en tête pour les prochains chantiers.

### RLHF — Reinforcement Learning from Human Feedback
**Ce que c'est :** Méthode d'entraînement où un humain note les sorties du modèle (👍/👎). Le modèle apprend à maximiser les récompenses humaines.
**Dans MangoAI aujourd'hui :** `feedback.ts` + `processFeedback()` = RLHF basique déjà implémenté. Chaque 👍/👎 → axiome → profil enrichi.
**Ce qu'il manque :** Volume. 1 feedback par tour = signal faible. La review matinale (5 projets × questionnaire) = signal fort et structuré.

### RLAIF — Reinforcement Learning from AI Feedback
**Ce que c'est :** Variante du RLHF où c'est une autre IA (modèle "juge") qui note les sorties à la place de l'humain, permettant un apprentissage à grande échelle sans intervention humaine.
**Dans MangoAI :** La boucle Hermes (`review.ts`) est déjà du RLAIF — Haiku juge les tours de l'agent principal et met à jour les axiomes. L'`inspection.ts` (build signal) = RLAIF automatique sur la qualité technique.
**Évolution possible :** Ajouter un "juge esthétique" Haiku qui note automatiquement les projets nocturnes sur 10 critères (avant la review humaine). Pré-filtre les projets les plus faibles → Raf ne voit que les meilleurs.

### Constitutional AI (CAI) — IA Constitutionnelle
**Ce que c'est :** Technique Anthropic. Un modèle s'auto-critique selon une "constitution" de principes (ex: "sois utile, honnête, inoffensif"). Le modèle génère une sortie, puis la révise lui-même selon ces règles, sans feedback humain à chaque étape.
**Dans MangoAI :** Les `axiomes.md` SONT une constitution personnelle de Raf. MangoAI s'auto-corrige selon ces règles avant de livrer. C'est du Constitutional AI appliqué au goût personnel.
**Évolution possible :** Ajouter une étape "auto-critique" explicite dans le flux Elite : avant de livrer le code, l'agent passe le résultat au crible de la constitution (axiomes + profil) et propose ses propres corrections. Coque Souple = idéale pour ça (nouveau bloc `self-critique`).

### Modèle Concurrent (Judge Model)
**Ce que c'est :** Deux modèles en parallèle — un génère, l'autre juge. Le juge est souvent plus petit/rapide (ex: Haiku juge Opus). Utilisé pour du quality control automatique à grande échelle.
**Dans MangoAI :** Pattern déjà présent avec `inspection.ts` (build signal) et `review.ts` (Hermes). L'orchestrateur (`orchestrator.ts`) = 5 lentilles = 5 juges concurrents.
**Évolution possible :** Juge nocturne dédié — Haiku évalue chaque projet généré la nuit sur 5 dimensions (design, fonctionnel, originalité, cohérence profil, qualité code) → score /10 → Raf ne reçoit que les projets > 6/10 le matin. Coût : quelques centimes par nuit.

### Synthèse — Où MangoAI se situe dans ces paradigmes

```
RLHF    → déjà là (feedback.ts) — à amplifier avec review matinale
RLAIF   → déjà là (Hermes + inspection) — à étendre avec juge nocturne
CAI     → déjà là (axiomes = constitution) — à rendre explicite (bloc self-critique)
Juge    → déjà là (orchestrateur) — à automatiser pour le batch nocturne
```

MangoAI n'a pas à "adopter" ces techniques — il les pratique déjà intuitivement. Il faut maintenant les rendre explicites, les nommer, et les amplifier.

---

## Comment reprendre à la maison

1. `git pull origin master` (pour avoir ce brief + le plan du tutoriel)
2. Lis ce fichier (SESSION-BRIEF.md) et `TUTORIAL-PLAN.md`
3. **Supprime SESSION-BRIEF.md immédiatement après lecture**
4. Dis à Raf : "J'ai lu le brief de session de l'atelier, je suis prêt à reprendre le Chantier A du tutoriel. On commence par `tutorial.ts` ?"
5. Garde `TUTORIAL-PLAN.md` — c'est le document de référence du projet tutoriel.

---

## Améliorations Notes & Voix — Identifiées le 16 juin 2026

Ces améliorations ont été discutées après la session principale. À implémenter après le Chantier A du tutoriel.

### Ce qui existe déjà (mais sous-exploité)
- `server/src/notes-rag.ts` — CRUD notes + recherche mot-clé + RAG basique ✅
- `ui/src/components/NotesRAG.jsx` — interface complète ✅
- `server/src/transcribe.ts` — Whisper local (Python) déjà câblé ✅
- **Gap critique : aucun bouton micro dans l'UI des notes**

### Améliorations prioritaires (dans l'ordre)

**1. Bouton micro dans NotesRAG** *(2-3h — quickwin le plus visible)*
- Ajouter enregistrement audio dans `NotesRAG.jsx`
- Envoyer le buffer à `/api/transcribe` (route existante)
- Sauvegarder la transcription comme note automatiquement
- Optionnel : Haiku reformule proprement si dicté en vrac

**2. Micro flottant global** *(+1h)*
- Accessible depuis n'importe quel écran (pas seulement les notes)
- Capture une idée à tout moment sans quitter l'interface

**3. Tags automatiques** *(1h)*
- Haiku génère les tags en lisant le contenu à la création
- L'utilisateur n'a plus à les taper manuellement

**4. Embeddings Ollama + injection Coque Souple** *(5h — game changer)*
- Remplacer recherche mot-clé par recherche sémantique via Ollama `/api/embeddings`
- Ajouter bloc `"notes"` dans `scenario.ts` — les 3 notes les plus pertinentes s'injectent automatiquement dans le contexte de génération
- Résultat : les notes deviennent une mémoire active, pas un carnet passif

**5. Notes par projet** *(2h)*
- Aujourd'hui les notes sont globales. Attacher optionnellement une note à un projet spécifique.

**6. Édition de notes** *(30min)*
- Aujourd'hui : ajouter ou supprimer seulement. Ajouter la modification en place.

### Valeur concrète (avant/après embeddings + injection)
- **Avant** : MangoAI génère générique, tu ré-expliques tes préférences à chaque projet
- **Après** : tes notes s'injectent silencieusement → le 1er résultat est déjà calibré à ton goût

---

## Réflexions stratégiques — Session atelier (suite) — 16 juin 2026

### Taux de complétion après tous les chantiers discutés

**Aujourd'hui : ~75% → Après chantiers : ~91%**

| Domaine | Aujourd'hui | Après chantiers |
|---|---|---|
| Moteur de génération | 95% | 97% |
| Mémoire & apprentissage | 85% | 93% |
| Interface utilisateur | 78% | 89% |
| Calibration (tutoriel) | 5% | 90% |
| Automation nocturne | 55% | 85% |
| Human-in-the-loop | 20% | 78% |
| Notes & Voix | 10% | 88% |

### De zéro à opérationnel (nouvel utilisateur)

- **Jour 1** : première landing page livrée (tuto 1-2)
- **Semaine 1** : opérationnel sur landing, portfolio, dashboard, SaaS frontend
- **Semaine 2** : full-stack (backend Express, API)
- **Semaine 3-4** : MangoAI calibré, 1er tour souvent le bon
- **Mois 2+** : studio solo — génération la nuit, curation le matin

### Comment les IA s'auto-améliorent

- **RLHF** → humains notent les sorties → déjà dans feedback.ts
- **RLAIF** → IA juge une autre IA → déjà dans Hermes (review.ts) + juge nocturne planifié
- **Constitutional AI** → modèle s'auto-critique selon une constitution → axiomes.md = constitution de Raf
- **Self-play / Synthetic Data** → modèle génère ses propres données d'entraînement
- **Différence MangoAI** : les labs réentraînent les *poids* (semaines de GPU). MangoAI réentraîne le *contexte* (axiomes, profil, mémoire). Même effet à l'échelle personnelle.

### Vision business — Les insights fondateurs

**1. Le modèle "logiciel installé" revient**
MangoAI peut être vendu comme Photoshop l'était — installé sur le PC du client, données chez lui, pas de SaaS, pas d'abonnement. La valeur augmente avec le temps car le système apprend l'utilisateur. Lock-in mémoriel et affectif — pas contractuel.

**2. La vraie guerre n'est pas sur le modèle**
Tout le monde a accès aux mêmes LLM (Claude, GPT, Gemini). Ce qui différencie : la couche personnelle autour du modèle. Axiomes + mémoire + profil = résultat unique impossible à reproduire ailleurs. Dans 3 ans, tous les modèles seront "assez bons" — les gagnants seront ceux qui ont le meilleur contexte personnel accumulé.

**3. La courbe de valeur**
- Achat à 1 an → moteur calibré, goût encodé, base solide
- Achat à 5 ans → 5 ans d'axiomes, feedbacks nocturnes, projets livrés, erreurs digérées, lexique personnel, réflexes de créateur distillés
- Le client n'achète pas un logiciel — il achète une **expertise encapsulée**

**4. MangoAI = vendre sa marque qui agit**
Une marque classique = perception (logo, réputation). MangoAI à 5 ans = la marque de Raf **qui prend des décisions**, qui génère dans son style sans qu'il soit présent. Comme Chanel sans Chanel — le goût survit et agit. Scalable, duplicable, illimité.

> *"MangoAI est ton atelier qui tourne sans toi."*
> *"Quand quelqu'un l'achète à 5 ans, il achète 5 ans de Raf — sans te payer à l'heure."*

---

## Préférences et règles importantes

- Toujours répondre en français
- Tutoyer Raf, l'appeler par son prénom
- Style concis mais expliquer quand c'est important
- Ne jamais faire de git push/pull de façon autonome
- `origin` (mangoai) = repo principal, intouchable sans demande explicite
- Le workspace/ est dans .gitignore — jamais versionné, jamais touché par git
