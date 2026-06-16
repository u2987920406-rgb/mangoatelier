# MangoAI — Système Tutorial Orchestral
# Plan approuvé le 16 juin 2026 — Atelier

## Vision : Le Double Apprentissage

```
Raf utilise → MangoAI observe → Haiku extrait → axiomes + profil enrichis
MangoAI guide → Raf réagit 👍/👎 → boucle d'enseignement affinée → session suivante meilleure
```

Ce n'est pas un tutoriel classique. C'est une **session de calibration mutuelle** — comme deux musiciens qui s'accordent ensemble pour la première fois. L'objectif : après 10 tutoriels, le profil est calibré, les axiomes sont personnalisés, Raf est autonome.

---

## Architecture — 4 couches

```
┌─────────────────────────────────────────────────────────┐
│  UI LAYER           Tutorial.jsx + TutorialSpotlight.jsx │
│  Overlay, beacon, tooltip, progress, freedom slider      │
├─────────────────────────────────────────────────────────┤
│  STATE MACHINE      App.jsx — tutorialActive/stepIndex   │
│  Avancement, liberté UI, verrous, auto-validation        │
├─────────────────────────────────────────────────────────┤
│  BACKEND            tutorial.ts + tutorial-feedback.ts   │
│  Définitions étapes, persistance, routes API             │
├─────────────────────────────────────────────────────────┤
│  LEARNING ENGINE    feedback.ts + review.ts (existants)  │
│  Feedback → axiomes → profil — tout déjà câblé          │
└─────────────────────────────────────────────────────────┘
```

---

## Les 10 Tutoriels

*Les durées sont purement estimatives. Pas de minuterie — chaque tutoriel s'adapte au rythme de Raf.*

| # | Titre | Mode | Liberté | Durée estimée |
|---|-------|------|---------|---------------|
| 1 | L'interface MangoAI | — | 0% | ~15 min |
| 2 | Premier projet MVP — landing page | MVP | 10% | ~20 min |
| 3 | Itérer et finir — mode Finition | MVP→Finition | 20% | ~20 min |
| 4 | Premier projet Élite — webapp | Élite | 35% | ~25 min |
| 5 | Design system + cohérence visuelle | Élite | 45% | ~25 min |
| 6 | Projet full-stack avec backend | Élite | 55% | ~30 min |
| 7 | Multi-projets + réutilisation | Tous | 65% | ~25 min |
| 8 | Déploiement + GitHub | Tous | 75% | ~20 min |
| 9 | Projet semi-libre avec guidage léger | Tous | 88% | ~30 min |
| 10 | Ton premier projet 100% personnel | Tous | 100% | libre |

### Règle de progression
- Tuto 1-3 : **couloir** — un seul élément cliquable à la fois
- Tuto 4-6 : **chemin** — 3-4 zones accessibles, suggestions pas ordres
- Tuto 7-9 : **carte semi-ouverte** — "as-tu pensé à X ?" léger
- Tuto 10 : **monde ouvert total** — MangoAI observe et apprend en silence

---

## Mécanique de Liberté UI (freedomLevel 0-100)

```
0%   → Seul le spotlight cible est cliquable. Tout le reste = overlay sombre.
25%  → Chat + mode actuel déverrouillés. Header = locked.
50%  → Header partiellement ouvert (sans deploy/github). Snap/inspect déverrouillés.
75%  → Tout ouvert sauf deploy.
100% → Aucun verrou. MangoAI disparaît du devant de la scène.
```

---

## Toutes les Capacités de MangoAI Activées

Règle : aucune capacité n'est montrée en démo fictive. Toujours vécue sur un vrai projet, avec un vrai résultat visible dans l'aperçu.

| Capacité | Tutoriel | Comment elle est vécue |
|----------|----------|------------------------|
| Mode MVP | 2 | Premier prompt, résultat rapide |
| Mode Élite + Mango Plan | 4 | 15 questions avant de coder |
| Mode Finition / QA | 3 | Durcissement du projet tuto 2 |
| Snap zone | 2 | Dessiner une zone à corriger |
| Click→source (Inspect) | 3 | Clic sur élément → édition chirurgicale |
| Le Miroir | 4 | MangoAI reformule, Raf valide |
| Sharingan (URL→palette) | 5 | URL d'inspiration → palette extraite |
| Moodboard automatique | 5 | 3 leaders scrapés → règles design |
| Design system cross-projet | 5 | Sauvegardé, réutilisé au tuto 7 |
| Contrat de langage (Lexique) | 4 | Généré auto, Raf l'enrichit |
| Backend généré (Express) | 6 | Scaffold + start + test route API |
| Super-agent spécialisé | 6 | Expert API REST invoqué |
| Conseil d'experts | 6 | 5 lentilles si backend bloque |
| Notes RAG | 7 | Notes → réinjectées automatiquement |
| Bibliothèque composants | 7 | Composant tuto 2 réutilisé |
| Multi-projets + recherche | 7 | Recherche sémantique cross-projets |
| Versions + rollback | 3 | Erreur volontaire → rollback 1 clic |
| Déploiement 3 cibles | 8 | Cloudflare 1 clic |
| GitHub natif | 8 | Push repo privé auto-créé |
| Dictée vocale (Whisper) | 9 | Dicter au lieu d'écrire |
| Métriques + dashboard | 9 | Coût et rendement des 8 tutos |
| Axiomes + flywheel | tous | Chaque 👍/👎 → axiome tagué |
| Profil utilisateur | tous | Mis à jour Hermes après chaque tour |
| RLHF personnel | tous | Feedback → axiomes en temps réel |
| Identité 3 couches | 10 | MangoAI présente ce qu'il a appris |

---

## Composants UI à Créer

### `TutorialSpotlight.jsx`
Overlay sombre avec "trou" révélant l'élément cible.
- `box-shadow: 0 0 0 9999px rgba(0,0,0,0.75)` centré sur `getBoundingClientRect()` de la cible
- Beacon animé (pulse) sur l'élément
- Prop `freedomLevel` contrôle quels éléments restent accessibles

### `Tutorial.jsx`
Orchestrateur principal (rendu conditionnel depuis App.jsx).
- Barre de progression (étape X/N)
- Tooltip positionné (texte + bouton "J'ai compris ✓")
- Feedback 👍/👎 + commentaire court (après action utilisateur)
- Indicateur "Liberté" (slider visuel bas gauche)
- Bouton "Passer cette étape" (dispo après 30s, jamais bloquant)

### `TutorialRelationshipCard.jsx`
Carte de fin de tutoriel.
- "Ce que MangoAI a appris de toi" → axiomes ajoutés
- "Ce que tu as appris de MangoAI" → fonctionnalités découvertes
- Jauge "Niveau de connaissance mutuelle" (X/10 tutos)
- CTA → tutoriel suivant ou projet libre

---

## Backend à Créer

### `server/src/tutorial.ts`
```typescript
interface TutorialStep {
  id: string;
  title: string;
  narration: string;         // Ce que MangoAI dit
  target?: string;           // CSS selector spotlight
  action: 'observe'|'click'|'type'|'send';
  autoAdvance?: boolean;
  prefilledPrompt?: string;
  mode?: 'mvp'|'elite'|'finition';
  freedomLevel: number;      // 0-100
  checkpoint?: boolean;      // → mini-review Haiku
}

// Persistance → .mango/tutorial-progress.json
interface TutorialProgress {
  currentTutorial: number;
  completedTutorials: number[];
  steps: Record<string, string[]>;
  startedAt: string;
  lastActivity: string;
}

export function getTutorial(id: number): TutorialDefinition
export function getAllTutorials(): TutorialDefinition[]
export async function loadProgress(workspaceDir: string): Promise<TutorialProgress>
export async function saveProgress(workspaceDir: string, p: TutorialProgress): Promise<void>
export async function markStepComplete(workspaceDir, tutId, stepId): Promise<void>
```

### `server/src/tutorial-feedback.ts`
Wrapper de `processFeedback()` avec contexte tutoriel :
```typescript
export async function processTutorialFeedback(
  workspaceDir: string,
  tutorialId: number,
  stepId: string,
  rating: 'like'|'dislike',
  comment: string,
  timeSpent: number,
): Promise<void>
// Axiome généré tagué [tutoriel-N-étape-X]
```

### Routes dans `index.ts`
```
GET  /api/tutorial/progress
POST /api/tutorial/progress
GET  /api/tutorial/:id
POST /api/tutorial/feedback
POST /api/tutorial/complete/:id   → mini-review Haiku
GET  /api/tutorial/relationship   → score X/10 tutos
```

---

## Modifications Fichiers Existants

### `ui/src/App.jsx`
```jsx
const [tutorialActive, setTutorialActive] = useState(false);
const [tutorialId, setTutorialId] = useState(null);
const [tutorialStep, setTutorialStep] = useState(0);
const [tutorialFreedom, setTutorialFreedom] = useState(0);
// + rendu conditionnel <Tutorial ... />
// + prop tutorialFreedom propagée aux enfants
```

### `ui/src/components/Home.jsx`
```jsx
// Bouton si tutoriels non terminés
<button onClick={() => onStartTutorial(nextTutorialId)}>
  🎓 Reprendre le tutoriel ({nextTutorialId}/10)
</button>
```

### `server/src/scenario.ts`
```typescript
// Bloc optionnel "tutorial" — premier de la liste dans les 3 scénarios
tutorial: (ctx) => ctx.tutorialActive
  ? `\nTUTORIAL MODE: tutoriel ${ctx.tutorialId}, étape "${ctx.stepId}". Reste concis, encourage.\n`
  : "",
```

---

## Fonctions Existantes à Réutiliser

| Fonction | Fichier |
|----------|---------|
| `processFeedback()` | `server/src/feedback.ts` |
| `spawnBackgroundReview()` | `server/src/review.ts` |
| `selectAxioms()` | `server/src/axioms.ts` |
| `loadUserProfile()` / `loadMemory()` | `server/src/memory.ts` |
| `assembleSystemPrompt()` | `server/src/scenario.ts` |

---

## Contenu Tutoriel 1 — L'interface (15 étapes, freedomLevel 0%)

| # | Étape | Cible CSS | Action |
|---|-------|-----------|--------|
| 1 | Bienvenue | `.hero` | observe |
| 2 | Le prompt card | `.prompt-card` | observe |
| 3 | Écris ta première idée | `textarea#prompt` | type |
| 4 | Les templates | `.templates` | click |
| 5 | Lance la création | `button[type=submit]` | click |
| 6 | L'espace de travail — 3 zones | `.workspace` | observe |
| 7 | Le Header | `.header` | observe |
| 8 | Mode MVP vs Élite vs Finition | `.mode-dropdown` | click |
| 9 | Le modèle | `.model-dropdown` | click |
| 10 | L'aperçu live | `.preview-iframe` | observe |
| 11 | La mémoire | `button[data-panel=knowledge]` | click |
| 12 | Versions — rollback | `button[data-panel=versions]` | click |
| 13 | Le Snap | `button[data-snap]` | observe |
| 14 | L'inspection click→source | `button[data-inspect]` | observe |
| 15 | ✅ RelationshipCard | — | observe |

## Contenu Tutoriel 2 — Premier MVP (20 étapes, freedomLevel 10%)

| # | Étape | Prompt pré-écrit |
|---|-------|-----------------|
| 1-3 | Créer projet "landing-café" | — |
| 4-6 | Premier prompt MVP | "Crée une landing page pour un café parisien. Hero avec titre accrocheur, section menu 3 colonnes, footer." |
| 7-9 | Observer résultat, feedback 👍/👎 | — |
| 10-12 | Modifier couleur avec SidePanel | — |
| 13-15 | Snap pour cibler zone à corriger | — |
| 16-18 | Rollback version précédente | — |
| 19-20 | ✅ RelationshipCard | — |

---

## Ordre d'Implémentation

### Chantier A — Squelette (priorité immédiate)
1. `server/src/tutorial.ts` — définitions + persistance
2. Routes API dans `server/src/index.ts`
3. `ui/src/components/Tutorial.jsx` — sans spotlight (tooltip + progress)
4. `ui/src/App.jsx` — intégration états + rendu
5. Tutoriels 1 et 2 complètement définis

### Chantier B — Expérience visuelle
6. `ui/src/components/TutorialSpotlight.jsx` — overlay + beacon
7. `ui/src/components/TutorialRelationshipCard.jsx`
8. Prop `tutorialFreedom` propagée à Header/Chat/Home

### Chantier C — Learning engine
9. `server/src/tutorial-feedback.ts`
10. Bloc "tutorial" dans `server/src/scenario.ts`
11. Mini-review Haiku aux checkpoints

### Chantier D — Contenu
12. Tutoriels 3-5 définis
13. Tutoriels 6-10 définis

---

## Vérification End-to-End

1. `npm run start` (server/) → port 3000
2. `npm run dev` (ui/) → port 5173
3. Home → bouton "🎓 Commencer le tutoriel" visible
4. Clic → Tutorial 1 → spotlight sur `.hero`
5. Navigation étapes → progress bar avance
6. Feedback 👍 → `POST /api/tutorial/feedback` → `.axioms.md` mis à jour
7. Fin tutoriel → RelationshipCard avec axiomes appris
8. Home → bouton "Tutoriel 2/10"
9. `.mango/tutorial-progress.json` créé et persistant
