# Statut — Mini-Lovable

*Dernière mise à jour : 2026-06-11 (avant redémarrage PC)*

## ✅ Fait et fonctionnel
- MVP complet testé de bout en bout (génération pizzeria + itération avec contexte)
- Backend Express + Claude Agent SDK (port 3000) — auth via login Claude Code local, pas de clé API
- UI builder chat + aperçu live (port 5173), apps générées servies sur le port 5174
- Sessions persistées par projet (`server/sessions.json`) — reprise après redémarrage
- Sélecteur de projets existants (datalist dans le header)
- Bouton ■ Stop (interruption de l'agent en cours)
- Choix du modèle dans l'UI (⚡ Haiku / ⚖️ Sonnet / 🧠 Opus) — changeable en cours de session
- Export ⬇ Zip du projet généré (sources sans node_modules)
- Dépôt GitHub privé à jour : https://github.com/u2987920406-rgb/mini-lovable (dernier commit `d79a2ab`)

## 🔜 À faire à la prochaine session
1. **Ajouter l'historique de chat persisté** — aujourd'hui le panneau de chat repart vide quand on recharge la page ; il faut sauvegarder les messages par projet (côté serveur, ex. `workspace/<projet>/.chat-history.json`) et les recharger à l'ouverture
2. **Discussion viabilité de cette IA** — passer en **plan mode** ; l'utilisateur communiquera ses infos et les sujets à évoquer

## 🚀 Pour relancer après redémarrage
```
cd C:\Users\PC-DELL\mini-lovable\server
npm run start
```
```
cd C:\Users\PC-DELL\mini-lovable\ui
npm run dev
```
Puis ouvrir **http://localhost:5173** — les conversations des projets reprennent automatiquement (sessions persistées).
