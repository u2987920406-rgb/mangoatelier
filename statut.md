# Statut — MangoAI

*Dernière mise à jour : 2026-06-11 (session viabilité)*

## ✅ Fait et fonctionnel
- MVP complet testé de bout en bout (génération pizzeria + itération avec contexte)
- Backend Express + Claude Agent SDK (port 3000) — auth via login Claude Code local, pas de clé API
- UI builder chat + aperçu live (port 5173), apps générées servies sur le port 5174
- Sessions persistées par projet (`server/sessions.json`) — reprise après redémarrage
- Sélecteur de projets existants (datalist dans le header)
- Bouton ■ Stop (interruption de l'agent en cours)
- Choix du modèle dans l'UI (⚡ Haiku / ⚖️ Sonnet / 🧠 Opus) — changeable en cours de session
- Export ⬇ Zip du projet généré (sources sans node_modules)
- Dépôt GitHub privé à jour : https://github.com/u2987920406-rgb/mangoai
- **Business model & plan d'action livrés** : `business-model.pdf` (13 pages, source `business-model.html`) — comparaison des 3 pistes de monétisation, recommandation (piste A agence/freelance), plan 90 jours

## 🔜 À faire à la prochaine session
1. **Ajouter l'historique de chat persisté** — aujourd'hui le panneau de chat repart vide quand on recharge la page ; il faut sauvegarder les messages par projet (côté serveur, ex. `workspace/<projet>/.chat-history.json`) et les recharger à l'ouverture
2. **Démarrer le plan d'action 90 jours** (cf. `business-model.pdf`, section 8) — première étape : générer 2-3 sites démo avec MangoAI

## 🚀 Pour relancer après redémarrage
```
cd C:\Users\PC-DELL\mangoai\server
npm run start
```
```
cd C:\Users\PC-DELL\mangoai\ui
npm run dev
```
Puis ouvrir **http://localhost:5173** — les conversations des projets reprennent automatiquement (sessions persistées).
