// Partition GEMMA — famille Gemma 3, Gemma 4 (Google DeepMind), via Ollama.
//
// Gemma 4 12B dispose d'un contexte 256K et d'une capacité de codage solide,
// mais présente l'antipattern observé sur tous les petits modèles locaux en
// boucle d'entraînement : ils ratent systématiquement le find/replace (<edit>)
// — indentation fantôme, emoji, apostrophe — ce qui produit des builds verts
// mais des specs à 0 %. Remède : régime WRITE-ONLY, <edit> retiré du
// vocabulaire offert à l'Élève.
//
// Intégration #54 — caps à calibrer au benchmark (#54).

import type { ModelProfile } from "./profile.js";

// Contrat WRITE-ONLY (pas de <edit>).
// La règle d'or « fichier entier, jamais de squelette » est inscrite en dur.
const GEMMA_SYSTEM = `Tu es un développeur qui propose des actions à MangoOS.
Tu ne touches JAMAIS au disque : tu DÉCRIS les actions, MangoOS les exécutera.
Tu DOIS répondre UNIQUEMENT dans ce format à balises, sans aucune prose autour :

<mangoos>
  <write path="chemin/relatif">contenu COMPLET et final du fichier</write>
  <run>commande shell éventuelle</run>
  <summary>résumé court de ce que tu fais</summary>
</mangoos>

Règles strictes :
- path TOUJOURS relatif au projet (jamais C:\\, jamais /, jamais ..).
- Projet Vite + React (ESM) : utilise "export"/"import", JAMAIS "module.exports"/"require".
- RÈGLE D'OR : pour CHAQUE fichier, écris-le ENTIER et FINAL en un seul <write>.
  Jamais de squelette à compléter ensuite, jamais d'édition partielle : un fichier
  livré incomplet est un échec, même si le build passe.
- N'émets JAMAIS <run>npm install</run> (ni aucune installation de dépendances) :
  MangoOS installe les dépendances lui-même, hors de ton contrat. Limite-toi aux
  <write> de fichiers sources ; un npm install dans <run> dépasse le délai et échoue.
- Termine TOUJOURS par un <summary>. AUCUN texte hors de <mangoos>.`;

export const gemmaProfile: ModelProfile = {
  id: "gemma",
  // Reconnaît toute la famille Gemma : gemma4:12b, gemma4:e4b, gemma3:27b, etc.
  matches: (model) => /gemma/i.test(model),
  system: GEMMA_SYSTEM,
  // Universels (partagés + Claude) PUIS mécaniques propres à la famille.
  axiomFiles: [".axioms.md", ".axioms.gemma.md"],
  // Routage des axiomes appris à l'escalade — consommé tel quel par le core.
  escalateAppendix:
    "\n\nNOTE PARTITION : l'Élève est de la famille Gemma, en régime WRITE-ONLY. " +
    "Range l'axiome selon sa portée :\n" +
    "- piège lié au FORMAT/OUTIL de l'Élève (find/replace, squelette→édition, " +
    "indentation, contrat à balises) → écris-le dans .axioms.gemma.md ;\n" +
    "- vérité d'ingénierie/écosystème indépendante du modèle → .axioms.md.",
  // valeurs de départ, à affiner au benchmark (#54)
  caps: { axiomCap: 6, fileBudget: 14000, fileMax: 3500, maxAttempts: 2 },
};
