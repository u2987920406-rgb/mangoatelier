# Changelog — Mini-Lovable

## 2026-06-11 — Session 1 : initialisation
- Plan validé : agent style Lovable local (chat + aperçu live), Claude Agent SDK TS, apps React+Vite
- Structure du projet créée : `server/`, `ui/`, `workspace/`, docs (`idee.md`, `plan.md`, `memory.md`, `design.md`)
- Backend complet : Express + SSE (`index.ts`), wrapper Agent SDK (`agent.ts`), gestion preview Vite (`preview.ts`), projets/template (`projects.ts`)
- Template React+Vite dans `server/template/` (copié à la création de chaque projet)
- Frontend builder complet : layout 2 colonnes sombre, chat SSE avec indicateurs d'outils, aperçu iframe
- Smoke test OK : backend (3000) et UI (5173) démarrent et répondent ; `tsc --noEmit` propre
- Découverte : le SDK réutilise le login Claude Code local — aucune clé API requise
- **Test de bout en bout réussi** : landing page pizzeria « Bella Napoli » générée (6 tours, $0.19), aperçu live OK
- **Test d'itération réussi** : modification du slogan sur la même session — l'agent garde le contexte (il a détecté qu'une pizza demandée existait déjà)
- 🎉 MVP terminé
