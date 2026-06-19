# Contrat d'E/S — la Coque Rigide (Phase Ultime, Jalon C)

> Le langage strict et standardisé par lequel **n'importe quel modèle** parle à
> MangoOS. Le modèle **propose** des actions ; MangoOS **valide → répare →
> exécute**. Le modèle ne touche jamais au disque. C'est ce cadre qui rend un
> modèle faible/non fiable (l'« Élève ») sûr et interchangeable.

## Principe
- **Coque Rigide** : la *forme* est immuable. Tout modèle qui dévie de la forme
  voit sa réponse réparée (si possible) ou rejetée — jamais exécutée à l'aveugle.
- **Propose, n'exécute pas** : le modèle décrit *quoi faire* ; c'est MangoOS qui
  écrit les fichiers et lance les commandes. Sécurité par construction.
- **Balises, pas JSON** : les actions portent du code brut. Les balises tolèrent
  n'importe quel contenu ; JSON forcerait un échappement que les petits modèles
  cassent. C'est le choix de robustesse central.

## Face ENTRÉE (ce que MangoOS envoie) — *spec, branchée au Jalon D*
Enveloppe standardisée : objectif, scénario (mode), type de projet + blueprint,
axiomes pertinents (récupérés), contexte (fichiers, erreur), et la contrainte
« réponds UNIQUEMENT au format de SORTIE ci-dessous ».

## Face SORTIE (ce que le modèle DOIT renvoyer) — *implémentée : `server/src/contract.ts`*
```
<mangoos>
  <write path="src/lib/supabase.js">
  ...contenu brut du fichier...
  </write>
  <edit path="src/App.jsx">
    <find>ancien extrait exact</find>
    <replace>nouvel extrait</replace>
  </edit>
  <run>npm install @supabase/supabase-js</run>
  <summary>Résumé textuel court de ce qui a été fait.</summary>
  <axiom>(optionnel) règle d'or universelle extraite</axiom>
</mangoos>
```

## Actions reconnues
| Balise | Attribut | Contenu | Effet (Jalon D) |
|--------|----------|---------|------------------|
| `<write path="…">` | `path` (relatif) | contenu du fichier (brut) | écrit/écrase le fichier |
| `<edit path="…">` | `path` (relatif) | `<find>` + `<replace>` | remplacement exact |
| `<run>` | — | commande shell | exécutée par MangoOS |
| `<summary>` | — | texte | résumé (survit à la compaction) |
| `<axiom>` | — | texte | candidat axiome pour le flywheel |

L'ordre des actions est **préservé** (write/edit/run scannés dans la séquence d'origine).

## Validation
- Enveloppe `<mangoos>…</mangoos>` requise (ou réparable, voir ci-dessous).
- `path` **project-relatif obligatoire** : refus si absolu, lettre de lecteur
  (`C:`), ou remontée `..`. Le modèle ne sort jamais du projet.
- `<write>` exige `path` ; `<edit>` exige `path` + `<find>` + `<replace>` ;
  `<run>` exige une commande non vide.
- Au moins une action **ou** un résumé, sinon rejet.

## Réparation (normalisation AVANT rejet — la Coque Rigide n'est pas cassante)
1. Fence markdown autour de l'enveloppe (```` ```xml … ``` ````) → retirée.
2. Prose avant/après l'enveloppe → enveloppe extraite.
3. Enveloppe oubliée mais balises d'action présentes → enveloppe reconstituée.
4. Sauts de ligne d'habillage en tête/fin de contenu → coupés (whitespace
   interne préservé).

Si la réponse reste non récupérable → `{ ok: false, error }`. **Dans le système
vivant (Jalon D), ce rejet est le signal d'escalade vers Claude (le Maître).**

## Périmètre par version
- **v1 (Jalon C, fait)** : la spec + `parseContract()` (parse/répare/valide →
  `ActionPlan`), logique de chaîne pure, prouvée par tests déterministes. **Ne
  touche pas** à la boucle agentique actuelle (Claude continue en direct via le SDK).
- **v2 (Jalon D, avec l'Élève)** : l'**exécuteur** (`executeContract` : applique
  write/edit/run au disque, sandboxé au projet), le branchement à un modèle
  vivant en « mode contrat », l'inspection automatique + le relais d'escalade,
  et la validation de chaque axiome contre l'Élève.
