# Design — MangoAI

## Stack UI
- **Tailwind CSS v4** (plugin `@tailwindcss/vite`, tokens dans `@theme` de `ui/src/index.css`)
- **lucide-react** pour les icônes (plus d'emojis dans l'UI, sauf le logo 🥭)
- **react-markdown** pour le rendu des réponses de l'agent

## Écrans
### Home (`ui/src/components/Home.jsx`)
Hero centré avec halo violet (`.hero-glow`) : logo, tagline « Décris ton idée, on la construit », grande carte prompt (textarea + nom de projet auto-slugifié + bouton ✦), cartes templates (Vierge/Vitrine/E-commerce/Dashboard/Blog), suggestions cliquables, grille « Projets récents ».

### Workspace
Header épuré + deux colonnes :
- **Gauche (40 %, min 360px)** : chat (`ui/src/Chat.jsx`)
- **Droite (60 %)** : aperçu live (`ui/src/Preview.jsx`)

## Palette (thème sombre premium violet)
Tokens Tailwind (`@theme` → classes `bg-*`, `text-*`, `border-*`) :
| Token | Couleur | Usage |
|---|---|---|
| `bg` | `#0b0d12` | Fond principal |
| `panel` | `#12141c` | Panneaux (chat, header) |
| `raised` | `#1a1d28` | Surfaces flottantes (menus, toasts, modal) |
| `edge` / `edge-soft` | `#232734` / `#1c202c` | Bordures |
| `ink` | `#e8eaf0` | Texte principal |
| `dim` / `faint` | `#8b91a3` / `#565c6e` | Texte secondaire / tertiaire |
| `accent` / `accent-soft` | `#7c5cff` / `#9678ff` | Accent violet |
| `bubble` | `#1f2330` | Bulle utilisateur |
| `ok` / `err` | `#3ecf8e` / `#ff5c5c` | Succès / erreur |

## Typographie
- UI : `Inter` (Google Fonts, chargée dans `ui/index.html`)
- Code / outils / URLs : `JetBrains Mono`

## Composants (`ui/src/components/`)
- **Header.jsx** : logo cliquable (retour Home), nom du projet, lien site publié, dropdown modèle (Zap/Gauge/Brain), dropdown versions (rollback), bouton zip, bouton Publier (violet, Rocket), coût session
- **Dropdown.jsx** : menu custom remplaçant les `<select>` natifs (fermeture au clic extérieur, `DropdownItem` avec icône/label/hint/actif)
- **ToolGroup.jsx** : actions de l'agent regroupées en bloc repliable « N actions » ; replié, il affiche la dernière action en cours ; sait parser les entrées d'historique (`"📄 Write src/App.tsx"`) comme les événements SSE live (`{name, detail}`)
- **Toast.jsx** : pile de toasts bas-droite (succès/erreur, lien optionnel, auto-dismiss 8 s) — remplace `alert()`
- **ConfirmModal.jsx** : modal de confirmation (rollback) — remplace `confirm()`
- **Home.jsx** : écran d'accueil (voir plus haut)

## Chat
- Bulles utilisateur à droite (fond `bubble`), réponses agent à gauche avec label « ✦ MangoAI » et rendu **markdown** (styles `.md` dans index.css)
- Lignes outils regroupées en `ToolGroup` repliable
- Pendant la génération : texte « MangoAI travaille… » avec shimmer violet (`.shimmer-text`)
- Input : carte arrondie, textarea auto-grow (max 160px), bouton envoyer ↑ / stop ■, Entrée pour envoyer
- État vide : icône Sparkles + invitation

## Preview
- Barre style navigateur : point d'état (vert lumineux = serveur OK), pilule URL mono, toggle desktop/mobile (mobile = iframe 390px centrée), bouton recharger, ouvrir ↗
- Iframe encadrée : coins arrondis, bordure, ombre portée
- Bandeau d'erreurs runtime (relay) + bouton « Corriger » conservés

## Animations (keyframes dans `@theme`)
- `fade-up` : apparition des messages et sections Home
- `pop` : menus, toasts, modal
- `shimmer` : indicateur de génération
- Scrollbars fines stylées (`.nice-scroll`)

## UX
- L'aperçu se met à jour seul via le HMR de Vite (pas de reload manuel nécessaire)
- Erreurs agent affichées en rouge dans le chat, jamais silencieuses
- Déploiement : toast de succès avec lien + pilule verte dans le header
