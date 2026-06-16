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

## Comment reprendre à la maison

1. `git pull origin master` (pour avoir ce brief + le plan du tutoriel)
2. Lis ce fichier (SESSION-BRIEF.md) et `TUTORIAL-PLAN.md`
3. **Supprime SESSION-BRIEF.md immédiatement après lecture**
4. Dis à Raf : "J'ai lu le brief de session de l'atelier, je suis prêt à reprendre le Chantier A du tutoriel. On commence par `tutorial.ts` ?"
5. Garde `TUTORIAL-PLAN.md` — c'est le document de référence du projet tutoriel.

---

## Préférences et règles importantes

- Toujours répondre en français
- Tutoyer Raf, l'appeler par son prénom
- Style concis mais expliquer quand c'est important
- Ne jamais faire de git push/pull de façon autonome
- `origin` (mangoai) = repo principal, intouchable sans demande explicite
- Le workspace/ est dans .gitignore — jamais versionné, jamais touché par git
