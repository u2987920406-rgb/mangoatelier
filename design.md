# Design — Mini-Lovable

## Layout
Deux colonnes plein écran, style Lovable :
- **Gauche (40 %)** : panneau chat
- **Droite (60 %)** : aperçu live (iframe)

## Palette (thème sombre)
| Usage | Couleur |
|---|---|
| Fond principal | `#0d0f14` |
| Fond panneau chat | `#13161d` |
| Bordures / séparateurs | `#232734` |
| Texte principal | `#e8eaf0` |
| Texte secondaire | `#8b91a3` |
| Accent (boutons, liens) | `#7c5cff` (violet) |
| Accent hover | `#9678ff` |
| Bulle utilisateur | `#1f2330` |
| Bulle agent | transparent, bordure gauche accent |
| Succès | `#3ecf8e` |
| Erreur | `#ff5c5c` |

## Typographie
- UI : `Inter, system-ui, sans-serif`
- Code / indicateurs d'outils : `'JetBrains Mono', Consolas, monospace`

## Composants
- **Header** : nom du projet actif + coût cumulé de la session (`$0.0342`)
- **Chat** : bulles utilisateur (droite, fond `#1f2330`) / agent (gauche)
- **Indicateurs d'activité** : lignes monospace discrètes pendant le travail de l'agent
  - `✏️ Edit src/App.tsx`, `📄 Write src/Menu.tsx`, `💻 Bash npm install`
- **Input** : textarea auto-grow + bouton envoyer (désactivé pendant que l'agent travaille)
- **Preview** : iframe + barre avec URL + bouton ↻ recharger + badge d'état (● vert = serveur OK, ○ gris = démarrage)

## UX
- L'aperçu se met à jour seul via le HMR de Vite (pas de reload manuel nécessaire)
- Pendant la génération : spinner discret dans le chat, bouton envoyer désactivé
- Erreurs agent affichées en rouge dans le chat, jamais silencieuses
