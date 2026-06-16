// Idée #56 — Système Tutorial Orchestral (Chantier A : squelette).
// 10 tutoriels progressifs (liberté 0% → 100%) qui font VIVRE les capacités
// réelles de MangoAI sur de vrais projets — pas une démo fictive. Double
// apprentissage : Raf apprend MangoAI pendant que MangoAI apprend Raf (les
// feedbacks → axiomes tagués viennent au Chantier C).
//
// Ce module porte les DÉFINITIONS (méta + étapes des tutos 1-2) et la
// PERSISTANCE de la progression (workspace-level, un seul "élève" = Raf),
// stockée dans workspace/.tutorial-progress.json — cohérent avec les autres
// magasins (.preferences.md, .axioms.md). Style calqué sur preferences.ts :
// lecture tolérante, jamais de throw.
import path from "node:path";
import fs from "node:fs";
import type { Express, Request, Response } from "express";
import { atomicWriteFileSync } from "./safe-io.js";
import { WORKSPACE_DIR } from "./projects.js";

export const TUTORIAL_PROGRESS_FILE = ".tutorial-progress.json";
export const TUTORIAL_COUNT = 10;

export type TutorialAction = "observe" | "click" | "type" | "send";

export interface TutorialStep {
  id: string;
  title: string;
  narration: string; // ce que MangoAI dit à cette étape
  target?: string; // sélecteur CSS du spotlight (utilisé au Chantier B)
  action: TutorialAction;
  prefilledPrompt?: string; // prompt pré-écrit proposé au composer
  freedomLevel: number; // 0-100, hérité du tuto sauf override
  checkpoint?: boolean; // → mini-review Haiku (Chantier C)
}

export interface TutorialDefinition {
  id: number;
  title: string;
  mode?: "mvp" | "elite" | "finition";
  freedomLevel: number; // 0-100 : niveau de liberté de l'UI pendant ce tuto
  durationLabel: string; // estimatif, jamais une minuterie
  steps: TutorialStep[];
}

export interface TutorialMeta {
  id: number;
  title: string;
  mode?: "mvp" | "elite" | "finition";
  freedomLevel: number;
  durationLabel: string;
  stepCount: number;
}

export interface TutorialProgress {
  currentTutorial: number; // tuto en cours (1-10)
  completedTutorials: number[]; // ids terminés
  steps: Record<string, string[]>; // tutorialId -> stepIds complétés
  startedAt: string;
  lastActivity: string;
}

// ── Contenu des tutoriels ────────────────────────────────────────────────────
// Tutos 1 & 2 entièrement définis (Chantier A). Tutos 3-10 = méta seulement
// (steps remplies au Chantier D). Le contenu reprend les tables de
// TUTORIAL-PLAN.md.

function step(
  id: string,
  title: string,
  narration: string,
  action: TutorialAction,
  freedomLevel: number,
  extra: Partial<TutorialStep> = {},
): TutorialStep {
  return { id, title, narration, action, freedomLevel, ...extra };
}

const TUTORIAL_1: TutorialStep[] = [
  step("t1-welcome", "Bienvenue", "Bienvenue dans MangoAI 🥭 — ton atelier qui construit des apps web à partir d'une simple description. Ce premier tutoriel te fait visiter l'interface. Aucune pression : avance à ton rythme.", "observe", 0, { target: "hero" }),
  step("t1-prompt-card", "La carte de création", "Ici tu décris ton idée en français. MangoAI la transforme en application React qui s'affiche en direct. C'est le point de départ de tout projet.", "observe", 0, { target: "prompt-card" }),
  step("t1-write-idea", "Écris une idée", "Essaie : clique dans la zone de texte et écris une idée d'app, même vague. Tu n'as encore rien à lancer — on découvre l'interface.", "type", 0, { target: "prompt-card" }),
  step("t1-templates", "Les modèles de départ", "Ces boutons (Vitrine, E-commerce, Dashboard…) pré-orientent la structure. Optionnel : MangoAI sait aussi partir d'une page blanche.", "observe", 0, { target: "templates" }),
  step("t1-header", "Le bandeau de l'atelier", "Une fois un projet ouvert, ce bandeau contient l'essentiel : projet courant, mode, modèle, versions, publication. On le détaille juste après.", "observe", 0, { target: "header" }),
  step("t1-modes", "Mode MVP / Élite / Finition", "Trois régimes : ⚡ MVP (rapide, économe), 💎 Élite (cadrage + tout l'arsenal), 🛡️ Finition (durcissement après 80%). Tu choisis selon l'ambition du moment.", "observe", 0, { target: "mode" }),
  step("t1-model", "Le choix du cerveau", "Tu peux changer le moteur : Haiku (rapide), Sonnet (équilibré), Opus (qualité max), ou l'Élève local ($0). Chaque tâche son cerveau.", "observe", 0, { target: "model" }),
  step("t1-preview", "L'aperçu live", "À droite, ton app tourne pour de vrai et se recharge à chaque modification. C'est ton retour visuel immédiat.", "observe", 0, { target: "preview" }),
  step("t1-memory", "La mémoire", "MangoAI retient ton style, ton vocabulaire et tes préférences entre les projets. Ce panneau montre ce qu'il a appris de toi.", "observe", 0, { target: "memory" }),
  step("t1-versions", "Les versions & le rollback", "Chaque tour est versionné. Tu peux comparer et revenir en arrière en un clic — itère sans peur de casser.", "observe", 0, { target: "versions" }),
  step("t1-snap", "La barre d'aperçu", "En haut de l'aperçu : bascule desktop/mobile, recharge, et ouvre l'app dans un onglet. De quoi vérifier ton rendu sur tous les écrans.", "observe", 0, { target: "preview" }),
  step("t1-inspect", "Le clic → source", "En mode inspection (la cible ⌖ en haut de l'aperçu), cliquer un élément arme une édition chirurgicale du bon fichier:ligne. Du pixel au code, directement.", "observe", 0, { target: "inspect" }),
  step("t1-iterate", "Itérer en conversation", "Tout se fait par échanges : « change la couleur », « ajoute une page contact ». La session est gardée, même après redémarrage.", "observe", 0),
  step("t1-deliver", "Livrer", "Quand c'est prêt : publication en 1 clic (Cloudflare/Vercel/Netlify), push GitHub, ou export. On verra ça dans un tuto dédié.", "observe", 0),
  step("t1-done", "Visite terminée 🎉", "Tu connais maintenant les repères de l'atelier. Prochain tutoriel : créer ta première vraie page en mode MVP. Quand tu veux.", "observe", 0, { checkpoint: true }),
];

const TUTORIAL_2: TutorialStep[] = [
  step("t2-intro", "Ton premier projet", "On passe à la pratique : une vraie landing page en mode ⚡ MVP (rapide). Tu vas voir MangoAI construire, puis tu l'affineras.", "observe", 10),
  step("t2-name", "Nomme le projet", "Donne un nom à ton projet — par exemple « landing-cafe ». Le nom devient le dossier de travail.", "type", 10, { target: "project-name" }),
  step("t2-first-prompt", "Le premier prompt", "Décris la page. Tu peux utiliser celui-ci tel quel ou l'adapter, puis lancer.", "send", 10, {
    target: "prompt-card",
    prefilledPrompt: "Crée une landing page pour un café parisien. Hero avec titre accrocheur, section menu en 3 colonnes, et un footer avec les horaires.",
  }),
  step("t2-watch", "Regarde construire", "MangoAI réfléchit puis écrit le code. L'aperçu se met à jour tout seul. Laisse-le finir le tour.", "observe", 10, { target: "preview" }),
  step("t2-feedback", "Donne ton avis", "Le résultat te plaît ? Utilise 👍 / 👎 (avec un mot). Chaque retour affine ce que MangoAI retient de ton goût — c'est ainsi qu'il te connaît mieux.", "observe", 10, { checkpoint: true }),
  step("t2-tweak-color", "Change une couleur", "Demande une retouche simple, par exemple : « passe l'ambiance en tons chauds, plus chaleureux ». Observe l'aperçu changer.", "send", 10, { prefilledPrompt: "Passe l'ambiance de la page en tons chauds (terracotta, crème), plus chaleureuse." }),
  step("t2-snap", "Cible un élément", "Active l'inspecteur (la cible ⌖ en haut de l'aperçu) puis clique un élément : MangoAI saura exactement quel bout de code retoucher.", "observe", 10, { target: "inspect" }),
  step("t2-rollback", "Reviens en arrière", "Ouvre les versions et reviens à un état précédent en un clic. Itérer sans risque, c'est le cœur du flux.", "observe", 10, { target: "versions" }),
  step("t2-deliver", "Garde ton travail", "Ta page existe pour de vrai dans l'atelier. Tu pourras la publier ou la reprendre quand tu veux.", "observe", 10),
  step("t2-done", "Première app livrée 🎉", "Tu as créé, itéré et sécurisé un vrai projet. Prochaine étape : le mode Finition pour durcir une app existante.", "observe", 10, { checkpoint: true }),
];

const TUTORIALS: TutorialDefinition[] = [
  { id: 1, title: "L'interface MangoAI", freedomLevel: 0, durationLabel: "~15 min", steps: TUTORIAL_1 },
  { id: 2, title: "Premier projet MVP — landing page", mode: "mvp", freedomLevel: 10, durationLabel: "~20 min", steps: TUTORIAL_2 },
  { id: 3, title: "Itérer et finir — mode Finition", mode: "finition", freedomLevel: 20, durationLabel: "~20 min", steps: [] },
  { id: 4, title: "Premier projet Élite — webapp", mode: "elite", freedomLevel: 35, durationLabel: "~25 min", steps: [] },
  { id: 5, title: "Design system + cohérence visuelle", mode: "elite", freedomLevel: 45, durationLabel: "~25 min", steps: [] },
  { id: 6, title: "Projet full-stack avec backend", mode: "elite", freedomLevel: 55, durationLabel: "~30 min", steps: [] },
  { id: 7, title: "Multi-projets + réutilisation", freedomLevel: 65, durationLabel: "~25 min", steps: [] },
  { id: 8, title: "Déploiement + GitHub", freedomLevel: 75, durationLabel: "~20 min", steps: [] },
  { id: 9, title: "Projet semi-libre avec guidage léger", freedomLevel: 88, durationLabel: "~30 min", steps: [] },
  { id: 10, title: "Ton premier projet 100% personnel", freedomLevel: 100, durationLabel: "libre", steps: [] },
];

// ── Accès aux définitions ────────────────────────────────────────────────────

/** Métadonnées de tous les tutoriels (sans le détail des étapes). */
export function getAllTutorials(): TutorialMeta[] {
  return TUTORIALS.map(({ id, title, mode, freedomLevel, durationLabel, steps }) => ({
    id,
    title,
    mode,
    freedomLevel,
    durationLabel,
    stepCount: steps.length,
  }));
}

/** Définition complète d'un tutoriel (avec ses étapes), ou null si inconnu. */
export function getTutorial(id: number): TutorialDefinition | null {
  return TUTORIALS.find((t) => t.id === id) ?? null;
}

// ── Persistance de la progression ────────────────────────────────────────────

export function defaultProgress(): TutorialProgress {
  const now = new Date().toISOString();
  return {
    currentTutorial: 1,
    completedTutorials: [],
    steps: {},
    startedAt: now,
    lastActivity: now,
  };
}

function progressPath(workspaceDir: string): string {
  return path.join(workspaceDir, TUTORIAL_PROGRESS_FILE);
}

/** Lecture tolérante : fichier absent ou corrompu → progression par défaut. */
export function loadProgress(workspaceDir: string): TutorialProgress {
  try {
    const raw = fs.readFileSync(progressPath(workspaceDir), "utf8");
    const parsed = JSON.parse(raw) as Partial<TutorialProgress>;
    return normalizeProgress(parsed);
  } catch {
    return defaultProgress();
  }
}

/** Borne les champs au cas où le fichier aurait été édité à la main. */
function normalizeProgress(p: Partial<TutorialProgress>): TutorialProgress {
  const base = defaultProgress();
  const completed = Array.isArray(p.completedTutorials)
    ? p.completedTutorials.filter((n) => typeof n === "number" && n >= 1 && n <= TUTORIAL_COUNT)
    : [];
  const current =
    typeof p.currentTutorial === "number" && p.currentTutorial >= 1 && p.currentTutorial <= TUTORIAL_COUNT
      ? p.currentTutorial
      : 1;
  const steps =
    p.steps && typeof p.steps === "object" && !Array.isArray(p.steps)
      ? (p.steps as Record<string, string[]>)
      : {};
  return {
    currentTutorial: current,
    completedTutorials: [...new Set(completed)].sort((a, b) => a - b),
    steps,
    startedAt: typeof p.startedAt === "string" ? p.startedAt : base.startedAt,
    lastActivity: typeof p.lastActivity === "string" ? p.lastActivity : base.lastActivity,
  };
}

export function saveProgress(workspaceDir: string, p: TutorialProgress): void {
  fs.mkdirSync(workspaceDir, { recursive: true });
  const next = { ...p, lastActivity: new Date().toISOString() };
  atomicWriteFileSync(progressPath(workspaceDir), JSON.stringify(next, null, 2));
}

/** Marque une étape comme complétée (idempotent) et persiste. */
export function markStepComplete(workspaceDir: string, tutorialId: number, stepId: string): TutorialProgress {
  const progress = loadProgress(workspaceDir);
  const key = String(tutorialId);
  const done = new Set(progress.steps[key] ?? []);
  done.add(stepId);
  progress.steps[key] = [...done];
  if (progress.currentTutorial < tutorialId) progress.currentTutorial = tutorialId;
  saveProgress(workspaceDir, progress);
  return progress;
}

/** Marque un tutoriel comme terminé (idempotent) et avance le curseur. */
export function markTutorialComplete(workspaceDir: string, tutorialId: number): TutorialProgress {
  const progress = loadProgress(workspaceDir);
  const completed = new Set(progress.completedTutorials);
  completed.add(tutorialId);
  progress.completedTutorials = [...completed].sort((a, b) => a - b);
  progress.currentTutorial = Math.min(tutorialId + 1, TUTORIAL_COUNT);
  saveProgress(workspaceDir, progress);
  return progress;
}

/** Prochain tutoriel non terminé (1-10), ou null si tous terminés. */
export function nextTutorialId(progress: TutorialProgress): number | null {
  for (let id = 1; id <= TUTORIAL_COUNT; id++) {
    if (!progress.completedTutorials.includes(id)) return id;
  }
  return null;
}

// ── Routes HTTP ──────────────────────────────────────────────────────────────

export function registerTutorialRoutes(app: Express): void {
  // Liste méta de tous les tutoriels.
  app.get("/api/tutorials", (_req: Request, res: Response) => {
    res.json({ tutorials: getAllTutorials() });
  });

  // Progression courante (+ prochain tuto à faire). DOIT précéder /:id sinon
  // "progress" serait capturé comme un :id.
  app.get("/api/tutorial/progress", (_req: Request, res: Response) => {
    const progress = loadProgress(WORKSPACE_DIR);
    res.json({ progress, nextTutorialId: nextTutorialId(progress) });
  });

  // Définition complète d'un tutoriel.
  app.get("/api/tutorial/:id", (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const tutorial = getTutorial(id);
    if (!tutorial) {
      res.status(404).json({ error: `Tutoriel ${req.params.id} introuvable` });
      return;
    }
    res.json({ tutorial });
  });

  // Mise à jour partielle de la progression. Actions reconnues dans le body :
  //   { stepComplete: { tutorialId, stepId } }  → marque une étape
  //   { tutorialComplete: tutorialId }          → marque un tuto terminé
  //   { currentTutorial: id }                   → déplace le curseur
  app.post("/api/tutorial/progress", (req: Request, res: Response) => {
    const body = req.body as {
      stepComplete?: { tutorialId?: unknown; stepId?: unknown };
      tutorialComplete?: unknown;
      currentTutorial?: unknown;
    };

    let progress = loadProgress(WORKSPACE_DIR);

    if (
      body.stepComplete &&
      typeof body.stepComplete.tutorialId === "number" &&
      typeof body.stepComplete.stepId === "string"
    ) {
      progress = markStepComplete(WORKSPACE_DIR, body.stepComplete.tutorialId, body.stepComplete.stepId);
    }

    if (typeof body.tutorialComplete === "number") {
      progress = markTutorialComplete(WORKSPACE_DIR, body.tutorialComplete);
    }

    if (
      typeof body.currentTutorial === "number" &&
      body.currentTutorial >= 1 &&
      body.currentTutorial <= TUTORIAL_COUNT
    ) {
      progress.currentTutorial = body.currentTutorial;
      saveProgress(WORKSPACE_DIR, progress);
    }

    res.json({ progress, nextTutorialId: nextTutorialId(progress) });
  });
}
