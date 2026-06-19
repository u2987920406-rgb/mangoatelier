// Onboarding bootstrap: génère le profil utilisateur initial depuis un questionnaire
// 5 questions → .user-profile.md + amorce de .axioms.md depuis les universaux.
// Appelé une seule fois au premier lancement (profil absent ou vide).
import path from "node:path";
import fs from "node:fs";
import { USER_PROFILE_FILE_NAME } from "./memory.js";
import { AXIOMS_FILE_NAME, AXIOMS_UNIVERSAL_FILE_NAME } from "./axioms.js";

export interface OnboardingAnswers {
  domain: string;  // "vitrine" | "webapp" | "dashboard" | "jeu" | "autre"
  stack: string;   // "react" | "vue" | "svelte" | "vanilla" | "indifferent"
  style: string;   // "minimal" | "bold" | "corporate" | "creative"
  usage: string;   // "clients" | "perso" | "formation" | "proto"
  level: string;   // "debutant" | "intermediaire" | "expert"
}

const DOMAIN_LABELS: Record<string, string> = {
  vitrine: "sites vitrines, landing pages, portfolios",
  webapp: "applications web (SaaS, CRUD, outils internes)",
  dashboard: "tableaux de bord et visualisations de données",
  jeu: "jeux (canvas 2D, Phaser, Three.js)",
  autre: "projets variés — je touche à tout",
};

const STACK_LABELS: Record<string, string> = {
  react: "React + Vite + Tailwind (stack par défaut de Mango)",
  vue: "Vue 3 + Composition API",
  svelte: "SvelteKit",
  vanilla: "Vanilla JS / HTML / CSS pur",
  indifferent: "pas de préférence — Mango choisira selon le projet",
};

const STYLE_LABELS: Record<string, string> = {
  minimal: "minimaliste (blanc, espaces, typographie fine)",
  bold: "moderne & impactant (couleurs fortes, contrastes élevés)",
  corporate: "professionnel / institutionnel (sobre, structuré)",
  creative: "créatif & organique (animations, textures, profondeur)",
};

const USAGE_LABELS: Record<string, string> = {
  clients: "freelance / clients externes — projets livrables",
  perso: "projets personnels et expérimentations",
  formation: "formation et apprentissage du développement IA",
  proto: "prototypage rapide d'idées",
};

const LEVEL_LABELS: Record<string, string> = {
  debutant: "débutant — je découvre le développement web avec l'IA",
  intermediaire: "intermédiaire — je connais les bases, je veux progresser",
  expert: "expert — je maîtrise le développement, Mango est mon accélérateur",
};

export function hasProfile(workspaceDir: string): boolean {
  try {
    return fs.readFileSync(path.join(workspaceDir, USER_PROFILE_FILE_NAME), "utf8").trim().length > 10;
  } catch {
    return false;
  }
}

export function bootstrapProfile(answers: OnboardingAnswers, workspaceDir: string): void {
  const profile = `# Profil utilisateur — MangoOS
*Créé lors de l'onboarding initial. Mango affinera ce profil automatiquement au fil des projets.*

## Domaine principal
${DOMAIN_LABELS[answers.domain] ?? answers.domain}

## Stack préférée
${STACK_LABELS[answers.stack] ?? answers.stack}

## Style visuel
${STYLE_LABELS[answers.style] ?? answers.style}

## Usage principal
${USAGE_LABELS[answers.usage] ?? answers.usage}

## Niveau
${LEVEL_LABELS[answers.level] ?? answers.level}

## Notes
Profil bootstrapé à l'onboarding. Les axiomes, préférences visuelles et procédures s'accumuleront au fil des projets pour former un vrai profil de goût personnalisé.
`;

  fs.writeFileSync(path.join(workspaceDir, USER_PROFILE_FILE_NAME), profile, "utf8");

  // Si .axioms.md est vide, l'amorcer depuis les principes universaux
  const axiomsPath = path.join(workspaceDir, AXIOMS_FILE_NAME);
  const alreadyHasAxioms = (() => {
    try { return fs.readFileSync(axiomsPath, "utf8").trim().length > 10; } catch { return false; }
  })();

  if (!alreadyHasAxioms) {
    try {
      const universal = fs.readFileSync(path.join(workspaceDir, AXIOMS_UNIVERSAL_FILE_NAME), "utf8").trim();
      if (universal) {
        fs.writeFileSync(
          axiomsPath,
          `# Axiomes personnels\n# Amorcés depuis les principes universaux — Mango les enrichira au fil de tes projets.\n\n${universal}`,
          "utf8",
        );
      }
    } catch {
      // fichier universel absent — axioms reste vide, c'est OK
    }
  }
}
