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
  complexity: "simple" | "moyen" | "composite" | "difficile";
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

  // ── Tâches DIFFICILES (discriminantes) ──────────────────────────────────────
  // Le `vite build` ne juge que la COMPILATION : pour faire trébucher un 7B, il
  // faut des contraintes que le build sait vérifier (imports inter-fichiers qui
  // doivent résoudre, dépendances manquantes) ou une retouche d'un fichier que
  // l'Élève ne voit pas (il ne reçoit que la LISTE des fichiers, pas leur contenu).
  {
    id: "storage-hook",
    complexity: "difficile",
    prompt:
      'Crée DEUX fichiers COHÉRENTS : "src/lib/storage.js" exportant saveItem(key, value) et loadItem(key) (via window.localStorage + JSON), ET "src/hooks/useStorage.js" qui IMPORTE saveItem et loadItem depuis "../lib/storage.js" et exporte useStorage(key, initial). Les noms importés doivent correspondre EXACTEMENT aux exports, sinon le build casse.',
  },
  {
    id: "dashboard-grid",
    complexity: "difficile",
    prompt:
      'Crée "src/components/Dashboard.jsx" (export default) qui IMPORTE le composant Metric depuis "./Metric" et en affiche trois dans une grille. Crée AUSSI "src/components/Metric.jsx" (export default, props label/value) — sinon l\'import "./Metric" ne se résoudra pas et le build échouera.',
  },
  {
    id: "accordion",
    complexity: "difficile",
    prompt:
      'Crée "src/components/Accordion.jsx" (export default) : un composant React avec useState recevant une prop "items" (tableau de { title, content }) et n\'affichant qu\'UNE section ouverte à la fois (cliquer un titre ouvre/ferme sa section).',
  },
  {
    id: "edit-app-header",
    complexity: "difficile",
    prompt:
      'Modifie le fichier EXISTANT "src/App.jsx" par un EDIT ciblé (find/replace, sans réécrire tout le fichier) : insère, juste après la balise ouvrante de l\'élément racine retourné, un <header><h1>Bella Napoli</h1></header>. Conserve tout le reste du fichier intact.',
  },
];
