import fs from "node:fs";
import path from "node:path";

export interface PerfectPlanAnswer {
  id: string;
  value: string;
  label: string;
}

export interface PerfectPlanRef {
  kind: "url" | "palette" | "note";
  value: string;
  label?: string;
}

export interface PerfectPlanContract {
  answers: PerfectPlanAnswer[];
  refs: PerfectPlanRef[];
  createdAt: string;
}

export const PERFECT_PLAN_QUESTIONS = [
  {
    id: "type",
    text: "Quel type de projet ?",
    options: [
      { value: "webapp", label: "App web", example: "Notion, Vercel" },
      { value: "vitrine", label: "Site vitrine", example: "Apple, Airbnb" },
      { value: "jeu", label: "Jeu", example: "Vampire Survivors, Mario" },
      { value: "dashboard", label: "Dashboard", example: "Linear, Figma" },
      { value: "fullstack", label: "Full-stack", example: "Discord, Trello" },
    ],
  },
  {
    id: "style",
    text: "Style visuel ?",
    options: [
      { value: "epure", label: "Épuré & minimaliste", example: "façon Apple" },
      { value: "vivant", label: "Vivant & chaleureux", example: "façon Airbnb" },
      { value: "corporate", label: "Strict & corporate", example: "façon IBM" },
      { value: "colore", label: "Coloré & joueur", example: "façon Google, Duolingo" },
    ],
  },
  {
    id: "navigation",
    text: "Comment l'utilisateur navigue ?",
    options: [
      { value: "scroll", label: "Scroll unique", example: "landing page" },
      { value: "pages", label: "Plusieurs pages", example: "site multi-sections" },
      { value: "sidebar", label: "Sidebar + tableau de bord", example: "app métier" },
    ],
  },
  {
    id: "data",
    text: "Les données ?",
    options: [
      { value: "memory", label: "En mémoire", example: "pas de compte, simple" },
      { value: "auth", label: "Avec comptes", example: "connexion Supabase" },
      { value: "static", label: "Fictives fixes", example: "démo ou portfolio" },
    ],
  },
  {
    id: "ambiance",
    text: "Ambiance générale ?",
    options: [
      { value: "tech", label: "Moderne / tech", example: "dark, glassmorphism" },
      { value: "humain", label: "Chaleureux / humain", example: "clair, organique" },
      { value: "pro", label: "Classique / pro", example: "neutre, corporate" },
      { value: "joyeux", label: "Joyeux / créatif", example: "couleurs vives, décalé" },
    ],
  },
] as const;

const FILE = ".perfect-plan.json";

export function hasContract(dir: string): boolean {
  return fs.existsSync(path.join(dir, FILE));
}

export function loadContract(dir: string): PerfectPlanContract | null {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, FILE), "utf8")) as PerfectPlanContract;
  } catch {
    return null;
  }
}

export function saveContract(
  dir: string,
  data: { answers: PerfectPlanAnswer[]; refs: PerfectPlanRef[] },
): void {
  fs.mkdirSync(dir, { recursive: true });
  const contract: PerfectPlanContract = { ...data, createdAt: new Date().toISOString() };
  fs.writeFileSync(path.join(dir, FILE), JSON.stringify(contract, null, 2), "utf8");
}

export function deleteContract(dir: string): void {
  try {
    fs.unlinkSync(path.join(dir, FILE));
  } catch {
    /* already gone */
  }
}

/** Returns the injection block for the system prompt. "" when no contract exists (zero weight). */
export function perfectPlanSection(dir: string): string {
  const contract = loadContract(dir);
  if (!contract?.answers.length) return "";

  const lines = [
    "## PERFECT PLAN — CONTRAT CONTRAIGNANT",
    "L'utilisateur a défini ces choix AVANT de démarrer. Tu les respectes à la lettre, sans les réinterpréter ni les remettre en cause.",
    "",
    "### Choix validés",
  ];
  for (const a of contract.answers) {
    lines.push(`- **${a.id}** : ${a.label} (\`${a.value}\`)`);
  }

  const activeRefs = contract.refs.filter((r) => r.value.trim());
  if (activeRefs.length > 0) {
    lines.push("", "### Références imposées");
    for (const r of activeRefs) {
      if (r.kind === "url")
        lines.push(
          `- Site de référence : ${r.value}${r.label ? ` — ${r.label}` : ""} *(appelle sharingan_url pour en extraire palette et structure)*`,
        );
      else if (r.kind === "palette")
        lines.push(`- Palette imposée : ${r.value}`);
      else if (r.kind === "note")
        lines.push(`- Contrainte de style : ${r.value}`);
    }
  }

  lines.push(
    "",
    "### Règles d'application",
    "- Pour tout ce que ce contrat couvre : applique-le sans dévier.",
    "- Pour tout ce qu'il ne couvre pas : comble librement à ta manière.",
    "- Le bloc `clarification` ne repose PAS les questions déjà traitées ici.",
  );

  return lines.join("\n");
}
