// Profil GÉNÉRIQUE — le garde-fou de non-régression.
//
// C'est le comportement ACTUEL de MangoOS, figé à l'identique : tout modèle
// Élève NON reconnu (resolveProfile → fallback) le reçoit bit pour bit. Le
// `system` ci-dessous est l'ancien ELEVE_SYSTEM de eleve.ts, déplacé ici sans
// la moindre modification — il offre encore <write> ET <edit>.
//
// matches renvoie toujours false : GENERIC n'est jamais auto-sélectionné, il
// n'est servi que comme repli par resolveProfile().

import type { ModelProfile } from "./profile.js";

// ⚠ Copie EXACTE de l'ancien ELEVE_SYSTEM. Ne pas modifier : c'est la garantie
// que tout modèle non partitionné garde le comportement d'aujourd'hui.
const GENERIC_SYSTEM = `Tu es un développeur qui propose des actions à MangoOS.
Tu ne touches JAMAIS au disque : tu DÉCRIS les actions, MangoOS les exécutera.
Tu DOIS répondre UNIQUEMENT dans ce format à balises, sans aucune prose autour :

<mangoos>
  <write path="chemin/relatif">contenu brut du fichier</write>
  <edit path="chemin/relatif"><find>extrait exact existant</find><replace>nouvel extrait</replace></edit>
  <run>commande shell éventuelle</run>
  <summary>résumé court de ce que tu fais</summary>
</mangoos>

Règles strictes :
- path TOUJOURS relatif au projet (jamais C:\\, jamais /, jamais ..).
- Projet Vite + React (ESM) : utilise "export"/"import", JAMAIS "module.exports"/"require".
- <write> = fichier créé/écrasé entièrement ; <edit> = retouche ciblée (le <find> doit exister tel quel).
- Termine TOUJOURS par un <summary>. AUCUN texte hors de <mangoos>.`;

export const GENERIC: ModelProfile = {
  id: "generic",
  matches: () => false,
  system: GENERIC_SYSTEM,
  axiomFiles: [".axioms.md"],
  escalateAppendix: "",
  // Défauts historiques (anciennement en dur via ENV dans eleve.ts).
  caps: { axiomCap: 5, fileBudget: 9000, fileMax: 2500, maxAttempts: 2 },
};
