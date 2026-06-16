# Plan de test — Jeu 2D top-down « Zelda-like / roguelike »

> **But du test** : faire travailler MangoAI de bout en bout sur un **produit complet et cohérent** (un jeu 2D), en activant **TOUTES** les capacités accumulées (cadrage, plan, moodboard, contrat de langage, Miroir, design system, composants, axiomes, vision, super-agent métier, finition QA), pour **mesurer si cette pile rend Mango nettement plus puissant** qu'un build « nu ». Le jeu est le prétexte ; la vraie cible mesurée, c'est **Mango**.

## 0. Concept du produit (fixe, pour la cohérence du test)
**« Mango Crypt »** — roguelike 2D top-down façon Zelda :
- Déplacement 4/8 directions sur une grille de tuiles, collisions.
- Donjon **procédural** (run-based, permadeath) composé de **salles** reliées par des portes.
- **Combat** temps réel (attaque mêlée, hitbox, I-frames, knockback), ennemis avec IA simple (patrouille → poursuite).
- **HP / cœurs**, **stamina**, **loot** (clés, cœurs, pièces, arme/relique), **inventaire**.
- **Minimap** du donjon, brouillard de guerre par salle.
- **Boucle de run** : entrée → salles → boss de fin d'étage → mort/victoire → écran de résumé → relance.
- Persistance légère (meilleur score / runs) en localStorage (Supabase optionnel).

## 1. Capacités MangoAI à exercer (couverture = objet du test)
| Capacité | # | Comment ce jeu la sollicite |
|---|---|---|
| Cadrage fondateur multimodal | 47 | Intention + références (URLs de roguelikes, images d'ambiance pixel-art) digérées en une phase de démarrage |
| Moodboard Sharingan (web) | 46 | Capture de palettes/UX de vrais jeux de référence |
| Sharingan-sur-image | 51 | Palette pixel-art ancrée sur une image d'ambiance jointe |
| Contrat de langage | 45 | Lexique du domaine : player, heart, room, tile, mob, loot, run, seed… (verrouille le nommage des fichiers) |
| Le Miroir | 48 | Récap validable « voici le jeu que j'ai compris » avant de coder |
| Clarification proactive | 52 | Détecte « zelda » (salles travaillées) vs « roguelike » (procédural) = tension à arbitrer |
| Préférences apprises | 49 | Hérite des goûts récurrents (ton, palette) |
| Super-agent métier « ZeldaUX Pro » | 40 | Auto-injecté : game feel, lisibilité spatiale, HUD diegetic, hitbox, I-frames |
| Mango Plan (architecte) | 9/30 | plan.md : entités, features priorisées, arborescence cible |
| Blueprints d'arborescence | 8 | Squelette de projet jeu |
| Design system persistant | A | Palette/typo cohérentes |
| Bibliothèque de composants | 36 | HUD, barre de vie, boutons réutilisables |
| Knowledge Flywheel (axiomes) | 10 | Principes de build injectés |
| Boucle vision (closed loop) | — | Snapshots Élite : vérifier le rendu du jeu, zoomer les défauts |
| Tests auto | 24 | Logique PURE : RNG de donjon, maths de combat, pathfinding, collisions |
| Backend généré (option) | 35 | Si scores en ligne |
| Phase Finition + QA | 34 | Gel des features → sous-agent qa adversarial → edge cases, états manquants, a11y, responsive |

## 2. Déroulé structuré (Élite → Finition)
| Phase | Contenu | Mode | Modèle optimal | Effort |
|---|---|---|---|---|
| P0 — Cadrage | Intention + références → contrat de langage + Miroir validé | 💎 Élite | 🧠 Opus 4.8 | S |
| P1 — Mango Plan | plan.md : entités (Player, Room, Mob, Item, Run), features priorisées, arborescence, choix design ancrés moodboard | 💎 Élite | 🧠 Opus 4.8 | S |
| P2 — Cœur jouable | Tilemap + déplacement + collisions + boucle de jeu (le squelette qui tourne) | 💎 Élite | 🧠 Opus 4.8 | M |
| P3a — Combat | Attaque, hitbox, I-frames, knockback, mort | 💎 Élite | ⚖️ Sonnet 4.6 | M |
| P3b — Donjon procédural | Génération de salles + portes + seed + minimap | 💎 Élite | 🧠 Opus 4.8 | M |
| P3c — Ennemis & IA | Patrouille → poursuite, spawn par salle, boss d'étage | 💎 Élite | ⚖️ Sonnet 4.6 | M |
| P3d — Loot & inventaire & HUD | Cœurs, stamina, clés, pièces, relique, HUD diegetic | 💎 Élite | ⚖️ Sonnet 4.6 | M |
| P4 — Boucle de run & méta | Écran d'accueil, résumé de run, permadeath, meilleur score localStorage | 💎 Élite | ⚖️ Sonnet 4.6 | S |
| P5 — Tests logique pure | RNG donjon, maths combat, collisions, pathfinding (Vitest) | 💎 Élite | ⚖️ Sonnet 4.6 | S |
| P6 — Finition | Gel features → QA adversarial → edge cases, états loading/empty/error, a11y clavier, responsive, durcissement, backlog | 🛡️ Finition | 🧠 Opus 4.8 | M |

> P3a→P3d touchent des zones largement **disjointes** (combat / génération / IA / HUD) → candidats à la **parallélisation** (agents builders en ∥, fichiers disjoints), intégrés et vérifiés ensuite.

## 3. Protocole de MESURE (le vrai livrable du test)
Pour répondre à « est-ce que la pile rend Mango plus puissant ? », on compare **deux builds du même concept** :
- **A — Élite-full** : toutes capacités ON (le déroulé ci-dessus).
- **B — Baseline MVP** : même concept, mode ⚡ MVP, sans cadrage/plan/Miroir/finition.

Grille d'évaluation (juge = Claude, + observation) :
| Critère | A (Élite-full) | B (Baseline) |
|---|---|---|
| Complétude vs spec (P0-P4) | | |
| Cohérence de nommage (contrat de langage tenu ?) | | |
| Qualité visuelle / game feel (boucle vision + ZeldaUX) | | |
| Robustesse (bugs, états manquants — révélés en Finition) | | |
| Couverture de tests (logique pure) | | |
| Nb de tours / coût pour atteindre « jouable » | | |
| Dette technique au final | | |

**Sortie attendue** : un verdict chiffré « la pile complète apporte +X en complétude / −Y bugs / +Z cohérence », + la liste des capacités qui ont **réellement** pesé vs celles passées inaperçues (→ alimente l'idée #53 Carte des capacités).

## 4. Garde-fous d'exécution
- `tsc` (server) + build UI restent verts à chaque jalon (règle MangoAI) — ne concerne PAS le projet jeu généré, mais le repo MangoAI s'il est touché.
- Le jeu généré vit dans `workspace/<projet>/` (jamais committé dans MangoAI sauf décision explicite).
- Élite = boucle vision active (snapshots) ; Finition = gel des features + sous-agent qa obligatoire.
- Cadrage autonome : aux portes de validation (Mango Plan, Miroir), répondre « vas-y avec ton jugement » pour ne pas bloquer la session non-interactive, avec défauts énoncés.
