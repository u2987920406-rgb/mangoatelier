// Partition QWEN — familles qwen2.5-* et supérieures (qwen3, …).
//
// Constat mesuré par la boucle d'entraînement nocturne : Qwen fabrique un
// squelette puis tente un <edit> dont le <find> ne matche pas (indentation,
// emoji, apostrophe) → "extrait <find> introuvable", build vert mais spec à
// 0 %. Récurrences ARCH-02 ×7, BUILD-01 ×3…
//
// Remède model-specific (idée : partitionnement) : on retire <edit> du
// vocabulaire de l'Élève → régime WRITE-ONLY. La classe d'erreur entière
// disparaît. <edit> reste supporté par le parser/executor (rétro-compat) ;
// on cesse simplement de l'OFFRIR à Qwen. Couvre 100 % des tâches de création.

import type { ModelProfile } from "./profile.js";

// Variante WRITE-ONLY du contrat : pas de <edit>, et la règle d'or apprise
// (« fichier complet, jamais de squelette à compléter ») inscrite en dur.
const QWEN_SYSTEM = `Tu es un développeur qui propose des actions à MangoAI.
Tu ne touches JAMAIS au disque : tu DÉCRIS les actions, MangoAI les exécutera.
Tu DOIS répondre UNIQUEMENT dans ce format à balises, sans aucune prose autour :

<mangoai>
  <write path="chemin/relatif">contenu COMPLET et final du fichier</write>
  <run>commande shell éventuelle</run>
  <summary>résumé court de ce que tu fais</summary>
</mangoai>

Règles strictes :
- path TOUJOURS relatif au projet (jamais C:\\, jamais /, jamais ..).
- Projet Vite + React (ESM) : utilise "export"/"import", JAMAIS "module.exports"/"require".
- RÈGLE D'OR : pour CHAQUE fichier, écris-le ENTIER et FINAL en un seul <write>.
  Jamais de squelette à compléter ensuite, jamais d'édition partielle : un fichier
  livré incomplet est un échec, même si le build passe.
- N'émets JAMAIS <run>npm install</run> (ni aucune installation de dépendances) :
  MangoAI installe les dépendances lui-même, hors de ton contrat. Limite-toi aux
  <write> de fichiers sources ; un npm install dans <run> dépasse le délai et échoue.
- Termine TOUJOURS par un <summary>. AUCUN texte hors de <mangoai>.`;

export const qwenProfile: ModelProfile = {
  id: "qwen",
  // qwen2.5-* et au-dessus (qwen2.5-coder:7b, qwen3:*, …). Exclut qwen2.0/1.5.
  matches: (model) => /qwen(2\.[5-9]|[3-9])/i.test(model),
  system: QWEN_SYSTEM,
  // Universels (partagés + Claude) PUIS mécaniques propres à la famille.
  axiomFiles: [".axioms.md", ".axioms.qwen.md"],
  // Routage des axiomes appris à l'escalade — consommé tel quel par le core.
  escalateAppendix:
    "\n\nNOTE PARTITION : l'Élève est de la famille Qwen, en régime WRITE-ONLY. " +
    "Range l'axiome selon sa portée :\n" +
    "- piège lié au FORMAT/OUTIL de l'Élève (find/replace, squelette→édition, " +
    "indentation, contrat à balises) → écris-le dans .axioms.qwen.md ;\n" +
    "- vérité d'ingénierie/écosystème indépendante du modèle → .axioms.md.",
  caps: { axiomCap: 5, fileBudget: 9000, fileMax: 2500, maxAttempts: 2 },
};
