# MangoAI — Instructions de session

## Démarrage automatique

**Au début de chaque session (après /clear ou reprise) :**
Lire `statut.md` et afficher immédiatement le **tableau consolidé** des idées et chantiers (la section "Tableau unique de toutes les idées et chantiers"), sans attendre que l'utilisateur le demande.

Lire aussi `memory.md` pour l'état courant du projet.

## Règles propres à MangoAI

- `tsc --noEmit` + `npm run build` (ui/) doivent rester verts après chaque modification
- Toute nouvelle fonctionnalité = entrée dans `statut.md` (idée + statut + modèle + effort)
- `save` = git add -A + commit + push (règle globale)
- Ports : backend Express 3000 · UI Vite 5173 · App générée 5174
