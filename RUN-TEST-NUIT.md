# Run test nocturne — 2026-06-18 → réveil 2026-06-19

But : faire défiler en une nuit la **plupart des capacités** de Mango (récentes ET
anciennes) sur **5 projets** aux noms classiques, avec **l'Élève local en cerveau
économe** pour la masse et **Claude pour pousser 2 projets jusqu'au bout**
(Élite → ✨ Esthétique → 🛡️ Finition). Au réveil : 5 projets buildés + jugés, leurs
diffs visuels, les rapports des patrouilleurs et une analyse d'évolution des règles.

---

## Répartition des cerveaux (le cœur du design Jalon D)

- **Élève local Gemma 4 12B (`runRelay`, $0, souverain)** = construction de la masse.
  Ce qui prouve : génération locale, auto-réparation du build, juge esthétique #59,
  diversité train-loop, **moodboard Sharingan en freeStyle** (sans DA imposée).
- **Claude (abonnement, `runAgent` mode Élite)** = les 2 projets « haute couture ».
  Seul chemin qui injecte constellations #74, super-agent #40, cadrage multimodal,
  puis les phases ✨ Esthétique (#68) et 🛡️ Finition (#34).
- **Escalade Élève→Claude** bornée si un build local résiste → un axiome appris
  (carburant de l'auto-réécriture #76).

---

## Lot Élève — 3 projets en **freeStyle** (pas de DA imposée → teste le Sharingan)

| # | Nom | Template | Capacités exercées |
|---|-----|----------|--------------------|
| **A** | `portfolio-test` | `vitrine` | freeStyle → **moodboard Sharingan #46/#8** (2 leaders web) · patrouilleurs a11y/SEO #73 · juge #59 |
| **B** | `dashboard-test` | `mantine` | table KPI · patrouilleurs perf/a11y · auto-réparation build · mémoire procédurale #75 |
| **D** | `mini-jeu-test` | `phaser` | jeu 2D canvas · patrouilleur bundle · diversité train-loop |

## Lot Claude — 2 projets menés **jusqu'au bout** (Élite → ✨ Esthétique → 🛡️ Finition)

| # | Nom | Template | Capacités exercées |
|---|-----|----------|--------------------|
| **C** | `saas-contact-test` | `shadcn` | **Constellation Formulaire #74** · **super-agent « UX SaaS senior » #40** · **Supabase #17** (auth/inscription) · **tests auto #24** · patrouilleur sécurité · **diff vision avant/après #80** · → ✨ Esthétique → 🛡️ Finition + sous-agent QA |
| **E** | `vitrine-showcase-test` | `vitrine` | **Cadrage multimodal #47** + **moodboard Sharingan #46** · constellation · **composant réutilisé de C #36** · **diff vision avant/après #80** · → ✨ Esthétique → 🛡️ Finition. **LE projet « waouh ».** |

---

## Couverture des capacités (la checklist du « waouh »)

**Récentes (cette semaine)** : patrouilleurs #73 · constellations #74 · mémoire
procédurale #75 · auto-réécriture des règles #76 (passe finale) · diff vision
avant/après #80 · modes ✨ Esthétique #68 + 🛡️ Finition #34.
**Plus anciennes** : Élève local souverain (Jalon D) · moodboard **Sharingan**
#46/#8 · super-agent métier #40 · cadrage multimodal #47 · **Supabase #17** ·
**tests auto Vitest #24** · **composants inter-projets #36** · juge nocturne #59 ·
templates variés (vitrine/mantine/shadcn/phaser).
**Hors run (à tester à la main)** : Miroir #79 (édite l'UI de Mango) · GitHub #16 /
déploiement #18 (pas la nuit) · backend Express #35 (Supabase couvre la partie données).

---

## Mécanisme & lancement

Un driver `run-showcase.ts` (modèle `drive-game-test.ts`, déjà utilisé pour le test
A/B Mango Crypt) :
- pour A/B/D : appelle `runRelay` (Élève) façon train-loop, option **freeStyle** ;
- pour C/E : pilote `/api/chat` en SSE côté Claude/Élite, **répond automatiquement
  aux portes** (« vas-y avec ton jugement »), puis rebascule en mode `esthetique`
  puis `finition` sur le même projet ;
- garde les 5 projets, journalise (build ok/ko, score juge, capacités déclenchées) ;
- en fin de nuit : déclenche une analyse **auto-réécriture des règles #76**.

À coder (~1 fichier) puis lancer en tâche de fond.

---

## Coût / temps / prérequis

- **Lot Élève** : **$0** (local), plus lent (~3-4 s/tour à chaud + builds) → ~30-60 min.
- **Lot Claude** : 2 cycles Élite→Esthétique→Finition sur l'**abonnement** (repère :
  1 build Élite→Finition ≈ 57 min) → ~2-3 h.
- **Total ≈ 3-4 h.** Prérequis : **backend (3000) + `ollama serve` lancés, PC sans
  veille toute la nuit.**

---

## Au réveil
5 projets ouvrables (portfolio / dashboard / mini-jeu / saas-contact / vitrine-showcase),
leurs **rapports 🛡️ patrouilleurs**, les **diffs avant/après** (C, E), les **propositions
d'évolution des règles #76** à valider, et un **bilan** que je rédige en fin de run.

---

## GO / NO-GO
Dis **« go »** → je code `run-showcase.ts` et je lance pour la nuit. Sinon ajuste
(répartition Élève/Claude, templates, nombre…). Rien n'est lancé sans ton feu vert.
