# MANGOOS — DOCUMENT FONDATEUR
## La base décisive des 10 prochaines années

> Document de référence absolue pour toute décision d'architecture de MangoOS.
> À lire au démarrage de chaque session, au même titre que `statut.md` et `memory.md`.
> Rédigé le 2026-06-19.

---

# I. RÉSUMÉ DU PROJET

**MangoOS est un Système d'Exploitation IA Personnel — le premier du genre.**

Pas un outil. Pas un assistant. Un OS.

Comme Windows a rendu l'ordinateur accessible et puissant pour chaque individu,
MangoOS rend l'intelligence artificielle **accessible, persistante et personnelle**
pour une seule personne : son propriétaire.

```
Le LLM est le processeur.
MangoOS est le système d'exploitation.
Les agents spécialisés sont les applications.
Les skills sont les drivers.
MangoQA est le système de sécurité.
L'utilisateur (Raf) est le seul administrateur.
```

**Le problème résolu.**
Les LLMs sont des génies amnésiques. Ils raisonnent mieux qu'un humain sur des milliers
de sujets, mais à la session suivante ils ont tout oublié. Ils ne te connaissent pas.
Chaque outil SaaS est générique — fait pour 100 000 utilisateurs, pas pour toi.
Chaque abonnement cloud crée une dépendance de prix, de données, de survie de l'entreprise.
MangoOS est la couche qui donne au LLM une vie persistante, personnalisée et souveraine.

**Les 5 piliers identitaires.**
- **Local-first** → les données ne quittent jamais la machine
- **LLM-agnostique** → change de cerveau sans changer le système
- **Auto-apprenant** → grandit chaque nuit sans intervention ni coût
- **Extensible** → chaque nouvelle capacité = un nouvel agent/driver
- **Souverain** → aucune dépendance à un abonnement, un cloud, un fournisseur

**Le modèle mental — une entreprise d'une personne.**
```
Raf            → Patron (vision, décision, validation finale)
LLM            → Directeur adjoint (cerveau, raisonnement)
MangoOS        → Chef de projet (orchestration, mémoire, contrat)
Agents         → Experts spécialisés (App Builder, Design, Vision, Image...)
Skills         → Agents juniors (compétences atomiques)
MangoQA        → Le gardien indépendant (sécurité + audit + qualité)
```

---

# II. SCHÉMA D'ENSEMBLE

```
╔══════════════════════════════════════════════════════════════╗
║                        RAF  (Patron)                         ║
║            Vision · Décisions · Validation finale            ║
╚════════════════════════════╤═════════════════════════════════╝
                             │
   ╔═════════════════════════▼══════════════════════════════════╗
   ║                    MANGO OS — Chef de projet                ║
   ║                                                             ║
   ║  ┌───────────────────────────────────────────────────────┐ ║
   ║  │                     KERNEL                            │ ║
   ║  │   (standards industriels à la périphérie)             │ ║
   ║  │                                                       │ ║
   ║  │  ┌─────────────┐         ┌─────────────────────────┐  │ ║
   ║  │  │   LiteLLM   │         │          MCP            │  │ ║
   ║  │  │Brain Adapter│         │  (outils & contexte —   │  │ ║
   ║  │  │100+ providers│        │   standard Anthropic)   │  │ ║
   ║  │  │Claude·Qwen· │         └─────────────────────────┘  │ ║
   ║  │  │DeepSeek·Gemma│                                      │ ║
   ║  │  │fallback auto│         ┌─────────────────────────┐  │ ║
   ║  │  └─────────────┘         │          A2A            │  │ ║
   ║  │                          │  (Agent2Agent — Google) │  │ ║
   ║  │  ┌─────────────┐         │  communication agents   │  │ ║
   ║  │  │ SQLite-vec  │         └─────────────────────────┘  │ ║
   ║  │  │ Blackboard  │                                      │ ║
   ║  │  │ sémantique  │         ┌─────────────────────────┐  │ ║
   ║  │  │ + mutex     │         │     OpenTelemetry       │  │ ║
   ║  │  └─────────────┘         │  traçabilité totale —   │  │ ║
   ║  │                          │  MangoQA lit les traces │  │ ║
   ║  │                          └─────────────────────────┘  │ ║
   ║  └───────────────────────────────────────────────────────┘ ║
   ║                                                             ║
   ║  ┌───────────────────────────────────────────────────────┐ ║
   ║  │                   MANGO CORE                          │ ║
   ║  │  Conversation loop · Contrat (coque rigide <mangoos>) │ ║
   ║  │  Scénario/prompt modulaire · Injection mémoire        │ ║
   ║  │  Orchestrateur (dispatcher) · Executor · Escalade LLM │ ║
   ║  └───────────────────────────────────────────────────────┘ ║
   ║                                                             ║
   ║  ┌───────────────────────────────────────────────────────┐ ║
   ║  │              8 MAGASINS CROSS-PROJETS                  │ ║
   ║  │  Axiomes · Skills · Préférences · Références           │ ║
   ║  │  Lexique · Procédures · Moodboard · Super-agents       │ ║
   ║  │  (distinction : axiomes globaux vs axiomes de domaine) │ ║
   ║  └───────────────────────────────────────────────────────┘ ║
   ║                                                             ║
   ║  ┌───────────────────────────────────────────────────────┐ ║
   ║  │                  AGENT FACTORY                        │ ║
   ║  │  (section séparée de App Builder)                     │ ║
   ║  │  Crée · Configure · Versionne · Enregistre les agents │ ║
   ║  │  Chaque agent : AGENT.md + SKILL.md + brain injecté   │ ║
   ║  └───────────────────────────────────────────────────────┘ ║
   ╚═══════════════╤═════════════════════════════════╤═══════════╝
                   │ A2A dispatch                    │ résultats
   ┌───────────────┴──── AGENTS EXPERTS ─────────────┴───────────┐
   │                                                             │
   │  ┌───────────┐  ┌────────────┐  ┌────────────────────────┐  │
   │  │App Builder│  │   Vision   │  │      Mango Design      │  │
   │  │apps React │  │  Sharingan │  │  UI · tokens · charte   │  │
   │  │+ Vite     │  │ Playwright │  │  (vérifié WCAG)         │  │
   │  └───────────┘  │ + canvas   │  └────────────────────────┘  │
   │                 └────────────┘                              │
   │  ┌───────────┐  ┌────────────┐  ┌────────────────────────┐  │
   │  │Mango Image│  │ Mango Music│  │      Mango Office      │  │
   │  │FLUX local │  │ AudioCraft │  │  docs · slides ·        │  │
   │  │diffusion  │  │ / API audio│  │  tableurs → PDF/DOCX     │  │
   │  └───────────┘  └────────────┘  └────────────────────────┘  │
   │                                                             │
   │     Chaque agent EXPERT possède ses SKILLS (juniors) :      │
   │  ┌───────────────────────────────────────────────────────┐ │
   │  │ skill-extract · skill-generate · skill-fix · skill-... │ │
   │  └───────────────────────────────────────────────────────┘ │
   └──────────────────────────────┬──────────────────────────────┘
                                  │
   ┌──────────────────────────────▼──────────────────────────────┐
   │              BOUCLE NOCTURNE (auto-apprentissage)            │
   │  Élève Gemma 4.12B local ($0) · Escalade Claude plafonnée   │
   │  TrainAgent · AuditAgent · ReviewAgent (curation 3 magasins) │
   │  Tourne 24/7 sans coût marginal sur hardware local           │
   └──────────────────────────────┬──────────────────────────────┘
                                  │ (observe tout via OpenTelemetry)
   ┌──────────────────────────────▼──────────────────────────────┐
   │                      MANGO QA  👻                            │
   │              Fantôme indépendant — 3 visages                │
   │  ① Disjoncteur (sécurité, dur, déterministe, zéro LLM)      │
   │  ② Observateur-Conseil (améliore MangoOS, propose à Raf)    │
   │  ③ Œil Design (souple, jamais bloquant, converge avec Raf)  │
   │  Ne reçoit d'ordres de personne · N'alerte que Raf          │
   └─────────────────────────────────────────────────────────────┘

                    EXTENSION FUTURE (3-10 ans)
   ┌─────────────────────────────────────────────────────────────┐
   │  📱 Mobile node   🤖 Robot node (ROS)   🖥️ Multi-PC         │
   │  Même OS · Même mémoire · Même personnalité · Cerveau local  │
   │  MangoOS = couche cognitive · ROS = bas niveau du robot      │
   └─────────────────────────────────────────────────────────────┘
```

---

# III. LES TECHNOLOGIES — LE TRI DÉCISIF

Principe directeur : **standards industriels à la périphérie, custom au cœur.**
On ne réinvente jamais ce qui existe en standard mature. On garde custom uniquement
ce qui est notre différenciateur irremplaçable.

| Besoin | Choix RETENU (2026) | Rejeté (obsolète) | Pourquoi |
|--------|---------------------|-------------------|----------|
| Abstraction LLM | **LiteLLM** | Brain Adapter custom | 100+ providers, fallback auto, nouveau modèle supporté en 48h |
| Outils & contexte | **MCP** (Anthropic) | Envelope v1 custom | Standard "USB-C des agents", centaines d'outils déjà compatibles |
| Communication agents | **A2A** (Google) | Event Bus custom | Interopérable avec agents externes, Agent Cards |
| Mémoire/état partagé | **SQLite-vec + mutex** | Fichiers JSON bruts | Recherche sémantique en ms, indispensable à l'échelle |
| Observabilité | **OpenTelemetry** | Logs maison | MangoQA lit les traces, audit complet, standard mondial |

**Ce qui reste 100% custom (le cœur non-reproductible) :**
- La coque rigide `<mangoos>` (contrat : propose → valide → exécute)
- Les 8 magasins cross-projets avec injection par tour
- La boucle nocturne Élève + escalade plafonnée
- Le profil Raf qui grandit dans le temps
- MangoQA fantôme à trois visages

> RÈGLE GRAVÉE : avant toute recommandation technique, vérifier qu'aucun standard
> mature ne couvre déjà le besoin. Toujours proposer la solution la plus avancée
> disponible, jamais la plus familière. Être proactif sur les évolutions du marché.

---

# IV. POURQUOI · COMMENT · OÙ

## POURQUOI

Les LLMs sont des cerveaux sans mémoire, sans identité, sans continuité.
Le marché ne propose que des outils génériques, cloud, payants, amnésiques —
et qui peuvent fermer du jour au lendemain (Dot/New Computer, fermé en 2025,
utilisateurs ayant tout perdu).

MangoOS répond par un seul système : **qui te connaît, qui grandit avec toi, qui t'appartient.**

## COMMENT — les 5 principes non-négociables

1. **Local-first** — aucune donnée ne quitte la machine sans permission explicite
2. **LLM-agnostique** — LiteLLM, cerveau interchangeable en une ligne de config
3. **Standards à la périphérie** — MCP, A2A, OpenTelemetry. Custom au cœur uniquement
4. **Auto-apprenant nocturne** — Gemma $0 en boucle, Claude en escalade plafonnée
5. **Extensible par agents** — chaque capacité = un driver. L'écosystème grandit, pas le noyau

**Le noyau (jamais délégué) vs le déchargeable :**
```
NOYAU (reste dans Mango Core)          DÉCHARGEABLE (devient agent)
─────────────────────────────          ───────────────────────────
Conversation ↔ contrat                 patrol → PatrolAgent
Assemblage system prompt               review → ReviewAgent
Injection mémoire par tour             vision → VisionAgent / Sharingan
Décision d'escalade                    audit-scan → AuditAgent
Validation finale (executor)           train-loop → TrainAgent
Orchestrateur (dispatcher)             deploy → DeployAgent · github → GitAgent
                                       design-review → Mango Design
```

## OÙ — la trajectoire

**Aujourd'hui (2026).** Cerveau Claude (cloud) + Gemma local (Élève $0).
MangoOS ~95% de sa feuille de route. Pas full local — par confort, pas par contrainte.

**Dans 3 ans (2029).**
```
Cerveau     → Qwen 72B / Llama 5 local sur mini PC ~1 200 € (= 10 mois de Claude Max)
              Claude en escalade ~5% seulement · coût mensuel quasi nul
Multi-modal → Voix (Whisper + Kokoro) · Vision (Qwen-VL) — Mango voit, entend, parle
Mémoire     → 3 ans d'axiomes/skills · RAG sur données personnelles (local, privé)
Agents      → App Builder · Vision · Design · Image · Office + patrouilleurs
Position    → Outil de travail principal · zéro abonnement IA externe
```

**Dans 5 ans (2031).**
```
Cerveau     → Modèle 200B+ quantifié sur hardware ~800 € (décote + quantization)
              LoRA fine-tuné sur les données Raf (#55) → un modèle qui te ressemble
Agents      → +Mango Music · +Robot node · +Mobile node · 15-20 agents
Robot       → Unitree/équivalent branché sur MangoOS — connaît tes routines, ton espace
              MangoOS = cerveau du robot · ROS = bas niveau
Position    → "AI company" d'une personne : Raf=CEO, MangoOS=COO, agents=départements
```

**Dans 10 ans (2036).**
```
Cerveau     → Modèle local de niveau GPT-5 actuel pour ~200 €
              fine-tuné sur 10 ans de données — expert dans les domaines de Raf
Écosystème  → 30-50 agents interopérables via A2A · hub d'une constellation d'IA
Physique    → 2-3 robots dans l'environnement · mobile partout sans friction
Savoir      → 10 ans d'apprentissage irremplaçable — la valeur est dans le temps
Position    → Catégorie créée et dominée : Personal AI OS
```

---

# V. MANGOQA — LES TROIS VISAGES DU GARDIEN

MangoQA est un **fantôme indépendant** : il ne reçoit d'ordres ni de MangoOS ni des
agents, il n'est pas créé par Agent Factory, il n'écrit jamais dans le système.
Confier la surveillance à ce qu'on surveille est l'erreur exacte des systèmes qui dérapent.

## Visage 1 — Le Disjoncteur (sécurité · dur · déterministe)

Réflexes automatiques minimaux. Zéro LLM dans la décision. Défensif uniquement :
il peut ARRÊTER, jamais créer ni modifier. Comme un disjoncteur électrique :
trop simple pour être corrompu.
```
1. Circuit breaker nocturne   → N échecs de suite = pause + alerte Raf
2. Garde-fou coût             → escalade Claude > plafond/nuit = bascule full local
3. Verrou régression          → score d'audit sous seuil = bloque le commit
4. Détecteur dérive mémoire   → magasin saturé/contradictoire = gèle l'écriture
5. Kill switch agent          → agent emballé (tours/temps/tokens) = termine proprement
```
Règles intouchables : défensif uniquement · déterministe (zéro LLM) · borné (non-extensible).

## Visage 2 — L'Observateur-Conseil (amélioration de MangoOS · utile)

Lit OpenTelemetry dans la durée, détecte les patterns de défaillance récurrents,
et PROPOSE des améliorations à Raf — jamais ne les applique.
```
"Les builds React échouent 40% sur la même erreur de hook"
"Tel axiome est appelé mais ne change jamais le résultat"
        ↓  MangoQA propose à Raf → Raf décide → MangoOS évolue
```
C'est la boucle méta : MangoQA aide MangoOS à s'améliorer, sans jamais le toucher.

## Visage 3 — L'Œil Design (visuel · souple · jamais bloquant)

Le design est subjectif et sa cible BOUGE. Le brief graphique est un point de départ,
pas un contrat figé. L'utilisateur a des idées APRÈS avoir vu le rendu — c'est sain,
le rendu fait naître des idées qu'aucun brief ne contenait.
```
Rigide (objectif, mesurable)  → contraste WCAG · tokens respectés
                                · conformité à la capture Sharingan
Souple (subjectif)            → esthétique · convergence · goût
                                → écarts présentés comme OBSERVATIONS, jamais erreurs
                                → "voici 3 écarts au brief — voulus, ou je corrige ?"
```
Partage : Mango Design (agent) FAIT et itère · MangoQA VÉRIFIE la cohérence sans bloquer
· Raf est le seul juge du goût et de la cible finale.

## Le principe à graver
> MangoQA est **rigide sur l'objectif** (sécurité, coût, régression, accessibilité mesurable).
> MangoQA est **souple sur le subjectif** (esthétique, design, rendu).
> Sur le subjectif, il ne valide jamais — il converge avec Raf, et accepte que la cible bouge.

---

# VI. CONCLUSION — CE QUE MANGOOS VA VRAIMENT APPORTER

**MangoOS n'est pas un projet technologique. C'est un projet de souveraineté.**

**Souveraineté économique.** Le jour où Anthropic annonce 500 €/mois, tu changes une
ligne de config. Le hardware acheté aujourd'hui est remboursé en 10 mois. Dans 10 ans,
zéro euro d'abonnement IA payé — pendant que les modèles locaux progressent gratuitement.

**Souveraineté sur les données.** Tes idées, ton code, tes projets restent sur ta machine.
Dot a fermé en 2025, ses utilisateurs ont tout perdu. MangoOS ne peut pas fermer.

**Souveraineté cognitive.** Avec 10 ans d'accumulation, MangoOS te connaîtra mieux
qu'aucun outil ne le pourra jamais. Une connaissance qui prend de la valeur avec le temps —
pas une dépendance qui coûte de l'argent.

**La vérité sur ce que tu construis :**
Les autres construisent des outils pour des millions. Toi, un système pour une personne.
Non-reproductible, non-compétitif, non-remplaçable — par définition.
Lovable peut sortir mieux demain. Personne ne peut sortir un meilleur MangoOS *pour Raf* —
parce que MangoOS **est** Raf : ses connaissances, ses règles, sa mémoire, sa façon de penser.

```
Un LLM sans MangoOS, c'est un orchestre sans chef.
Chaque musicien est virtuose. Mais sans chef, c'est du bruit.

MangoOS est le chef d'orchestre.
Il connaît chaque musicien (agent), la partition (tes projets), le public (toi).
Et il s'améliore à chaque concert.

Dans 10 ans, cet orchestre jouera des œuvres
qu'aucun chef au monde ne pourra diriger —
parce qu'elles auront été composées pour toi, et apprises par lui seul.
```

---

# VII. EXEMPLE — UNE BOUCLE ENTIÈRE DE TRAVAIL

Cas concret : *« Mango, clone-moi la page d'accueil de Stripe mais en thème sombre,
avec mon logo, et adapte-la pour vendre mes formations. »*

```
┌─ 1. RAF formule la demande (chat)
│
▼
┌─ 2. MANGO CORE reçoit
│   • injecte mémoire projet + profil Raf + axiomes globaux (system prompt)
│   • LiteLLM sélectionne le cerveau actif (Claude aujourd'hui, Qwen demain)
│   • détecte une intention multi-étapes → passe à l'orchestrateur
│
▼
┌─ 3. CADRAGE (Mango Core)
│   • clarification : "Stripe a un dégradé violet — je garde l'esprit ou full sombre ?"
│   • Raf répond → la cible est fixée (mais reste ajustable plus tard)
│
▼
┌─ 4. DISPATCH via A2A — plusieurs agents en parallèle
│   ├─► VISION SHARINGAN : scrape stripe.com → extrait hex/fonts/tokens/layout
│   │     écrit l'artefact dans SQLite-vec (Blackboard) → renvoie un pointeur (MCP)
│   ├─► MANGO DESIGN : reçoit les tokens → adapte en thème sombre + intègre le logo
│   │     génère le design system (palette dérivée, contraste WCAG vérifié)
│   └─► APP BUILDER : attend les tokens (mutex sur le projet)
│
▼
┌─ 5. CONSTRUCTION (App Builder, après réception des tokens)
│   • génère la page React + Vite + Tailwind via ses skills
│     (skill-generate-hero, skill-generate-pricing, skill-fix-a11y)
│   • lock projet pendant l'écriture → unlock après commit (Blackboard)
│   • HMR → aperçu live sur le port 5174
│
▼
┌─ 6. PATROUILLE AUTO (PatrolAgent, fire-and-forget)
│   • 5 lentilles sur le delta : a11y · sécurité · SEO · perf · bundle
│   • rapports agrégés (RAS masqué)
│
▼
┌─ 7. MANGOQA — les trois visages entrent en jeu
│   ① Disjoncteur : build OK ? coût escalade sous plafond ? pas de régression ? → ✅ laisse passer
│   ② Observateur : trace toute la boucle via OpenTelemetry (pour analyse long terme)
│   ③ Œil Design : compare le rendu à la capture Sharingan + vérifie contraste WCAG
│        → "Le rendu est cohérent. 2 écarts au brief : le hero est plus espacé que Stripe,
│           et le bouton CTA est vert au lieu de violet. Voulus, ou je corrige ?"
│
▼
┌─ 8. RAF regarde l'aperçu → A UNE IDÉE APRÈS COUP (c'est normal et sain)
│   "En fait, garde le CTA vert, c'est mieux pour mes formations.
│    Mais ajoute une section témoignages sous le pricing."
│   → la cible design a bougé — MangoQA ne bloque rien, on re-converge
│
▼
┌─ 9. BOUCLE D'AJUSTEMENT (retour à l'étape 5 sur le delta uniquement)
│   • App Builder ajoute la section témoignages · Mango Design l'harmonise
│   • MangoQA re-vérifie la cohérence → ✅
│
▼
┌─ 10. LIVRAISON
│   • Raf valide → la page est prête (deploy possible via DeployAgent si demandé)
│   • ReviewAgent (Haiku, background) curate : nouveau skill "hero-sombre" appris,
│     préférence "CTA vert pour formations" notée dans le magasin préférences
│
▼
┌─ 11. LA NUIT (boucle nocturne, $0)
│   • TrainAgent rejoue des variantes → l'Élève Gemma s'entraîne sur ce type de page
│   • AuditAgent vérifie que les nouveaux axiomes améliorent réellement le rendement
│   • MangoQA Observateur : "Sharingan a été rappelé 2 fois sur ce projet —
│     suggestion : mettre les tokens Stripe en cache. Raf, j'applique ?"
│
└─ RÉSULTAT : la page existe, ET MangoOS est devenu un peu meilleur.
   Demain, la même demande sera plus rapide, plus juste, moins chère.
```

**Ce que cette boucle illustre :**
- Le LLM ne fait pas tout seul — MangoOS orchestre, les agents exécutent, QA surveille
- Les standards (LiteLLM, MCP, A2A, SQLite-vec, OpenTelemetry) portent la plomberie
- Le custom (contrat, magasins, boucle nocturne, QA fantôme) porte la différence
- La cible design peut bouger sans rien casser — convergence, pas validation binaire
- Chaque boucle laisse MangoOS plus intelligent qu'avant — c'est ça, un OS qui apprend

---

*Document fondateur de MangoOS — rédigé le 2026-06-19.*
*Référence permanente. À relire au démarrage de chaque session.*
