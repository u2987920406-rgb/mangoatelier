// Suite d'évaluation FIGÉE de l'Audit Scan (Phase Ultime, jalon D Phase 3).
//
// ⚠️ RÈGLE ABSOLUE — HELD-OUT : ces tâches ne doivent JAMAIS servir à extraire
// un axiome, ni inspirer une tâche de production. C'est un jeu de test caché :
// si l'Élève « apprenait » dessus, l'examen mesurerait du par-cœur, pas de la
// généralisation. On les fige ici, on ne les touche plus (sauf à versionner une
// nouvelle suite explicitement).
//
// Tâches ADDITIVES (création de fichiers) → elles ne cassent pas le build de base
// du projet support ; ce qu'on mesure, c'est la compétence propre de l'Élève
// (respect du contrat + code qui compile), pas la fragilité du projet hôte.

export interface AuditTask {
  id: string;
  complexity: "simple" | "moyen" | "composite";
  prompt: string;
}

export const AUDIT_TASKS: AuditTask[] = [
  {
    id: "slugify",
    complexity: "simple",
    prompt:
      'Crée le fichier "src/utils/slugify.js" qui exporte une fonction slugify(str) : minuscules, espaces remplacés par des tirets, accents retirés.',
  },
  {
    id: "format-price",
    complexity: "simple",
    prompt:
      'Crée le fichier "src/data/format.js" qui exporte formatPrice(n) renvoyant n formaté en euros via Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).',
  },
  {
    id: "use-toggle",
    complexity: "moyen",
    prompt:
      'Crée le hook React "src/hooks/useToggle.js" exportant useToggle(initial = false) qui renvoie un tableau [value, toggle] où toggle inverse la valeur.',
  },
  {
    id: "badge",
    complexity: "moyen",
    prompt:
      'Crée le composant React "src/components/Badge.jsx" (export default) affichant ses children dans un span dont la couleur dépend d\'une prop "tone" valant "ok", "warn" ou "err".',
  },
  {
    id: "stat-card",
    complexity: "composite",
    prompt:
      'Crée DEUX fichiers : le composant React "src/components/StatCard.jsx" (export default, props "label" et "value") ET sa feuille de style "src/components/StatCard.css" importée par le composant.',
  },
];
