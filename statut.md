# Statut — MangoAI

*Dernière mise à jour : 2026-06-12 (session roadmap concurrence)*

## ✅ Fait et fonctionnel
- MVP complet testé de bout en bout (génération pizzeria + itération avec contexte)
- Backend Express + Claude Agent SDK (port 3000) — auth via login Claude Code local, pas de clé API
- UI builder chat + aperçu live (port 5173), apps générées servies sur le port 5174
- Sessions persistées par projet (`server/sessions.json`) — reprise après redémarrage
- Sélecteur de projets existants (datalist dans le header)
- Bouton ■ Stop (interruption de l'agent en cours)
- Choix du modèle dans l'UI (⚡ Haiku / ⚖️ Sonnet / 🧠 Opus) — changeable en cours de session
- Export ⬇ Zip du projet généré (sources sans node_modules)
- Versions & rollback git — commit auto après chaque itération de l'agent, menu « ↩ Versions » pour revenir en arrière
- Dépôt GitHub privé à jour : https://github.com/u2987920406-rgb/mangoai
- **Business model & plan d'action livrés** : `business-model.pdf` (13 pages, source `business-model.html`) — comparaison des 3 pistes de monétisation, recommandation (piste A agence/freelance), plan 90 jours

## 🗺️ Roadmap — surpasser Lovable/Emergent (analyse 2026-06-12)

**Avantages structurels déjà acquis** (aucun concurrent ne peut copier) :
- Coût marginal zéro + itérations illimitées (abonnement Claude vs crédits payants)
- Moteur = preset `claude_code` (le même agent que les pros, pas un agent propriétaire bridé)
- Code 100 % local, propriété totale, confidentialité — argument de vente piste A

**Améliorations par priorité (effort/impact)** :
1. ✅ **Rollback par git auto-commit** — FAIT (2026-06-12) : commit auto après chaque itération (`server/src/versions.ts`), menu « ↩ Versions » dans le header, endpoints `/api/versions/:name` + `/api/rollback`
2. **Historique de chat persisté** ← PROCHAINE ÉTAPE — sauvegarder les messages par projet (`workspace/<projet>/.chat-history.json`), recharger à l'ouverture
3. **Auto-réparation des erreurs** — capter les erreurs console de l'iframe d'aperçu, bouton « 🔧 Corriger » qui les renvoie à l'agent (réplique le différenciateur d'Emergent)
4. **Templates de démarrage** — vitrine, e-commerce, dashboard, blog (dossiers dans `server/template/`)
5. **Déploiement 1-clic** — bouton push Netlify/Cloudflare Pages via CLI
6. *(Plus tard)* **Supabase** pour apps avec données/auth — autoriser dans le system prompt

❌ Écarté : édition visuelle WYSIWYG (énorme effort, pas là que se joue la valeur)

## 🔜 Aussi à faire
- **Démarrer le plan d'action 90 jours** (cf. `business-model.pdf`, section 8) — première étape : générer 2-3 sites démo avec MangoAI

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
