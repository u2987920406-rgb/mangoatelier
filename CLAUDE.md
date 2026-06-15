# MangoAI — Instructions de session

## Démarrage automatique

**Au début de chaque session (après /clear ou reprise) :**
Lire `statut.md` uniquement et afficher immédiatement le **tableau consolidé** des idées et chantiers, sans attendre que l'utilisateur le demande.

Lire aussi `memory.md` pour l'état courant du projet.

**Ne PAS lire `historique.md` au démarrage** — ce fichier est lourd (~80 ko). Le lire uniquement quand l'utilisateur demande explicitement le détail d'une idée ou d'une session passée.

## Comment accéder à l'historique

L'utilisateur peut demander :
- **"détail de l'idée #X"** → lire `historique.md`, section correspondante
- **"montre-moi la session du 2026-06-13"** → lire `historique.md`, section Journal
- **"lis l'historique"** → lire `historique.md` en entier
- **"vision fondatrice"** ou **"le robot"** → lire `historique.md`, section Vision

## Règles propres à MangoAI

- `tsc --noEmit` + `npm run build` (ui/) doivent rester verts après chaque modification
- Toute nouvelle fonctionnalité = entrée dans `statut.md` (tableau + ligne "Où on en est") ET dans `historique.md` (section détail de l'idée)
- `save` = git add -A + commit + push (règle globale)
- Ports : backend Express 3000 · UI Vite 5173 · App générée 5174

## Clôture automatique de chaque livraison

**À la fin de chaque module ou amélioration** (dès que `tsc` + build UI sont verts) :
1. Mettre à jour `statut.md` — passer l'idée en ✅ FAIT + mettre à jour le bloc "Où on en est"
2. Mettre à jour `historique.md` — ajouter le détail technique dans la section de l'idée + une entrée dans le Journal des sessions
3. `git add -A` + `git commit -m "..."` + `git push`

Sans attendre que l'utilisateur dise "save".
