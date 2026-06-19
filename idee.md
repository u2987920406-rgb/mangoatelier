# Idée — MangoOS

## Vision
Un agent personnel style **Lovable** (lovable.dev) qui tourne en local : on décrit une application web dans un chat, l'IA génère le code React+Vite, et on voit le résultat en direct dans un aperçu à côté.

## Problème résolu
- Comprendre **comment fonctionne un app builder IA sous le capot** (objectif d'apprentissage)
- Prototyper rapidement des apps web sans écrire le code soi-même
- Garder le contrôle total : tout est local, le code généré est sur le disque

## Concept
```
┌─────────────────────────────────────────────┐
│  MangoOS (navigateur, localhost:5173)  │
├──────────────────┬──────────────────────────┤
│   💬 Chat        │   🖥️ Aperçu live         │
│                  │                          │
│  « Crée une      │   [iframe de l'app       │
│   landing page   │    générée, mise à jour  │
│   pour une       │    en direct via HMR]    │
│   pizzeria »     │                          │
└──────────────────┴──────────────────────────┘
         │                      ▲
         ▼                      │
   Backend Express ──► Claude Agent SDK ──► écrit les fichiers
   (localhost:3000)        (query())        dans workspace/<projet>/
                                            servi par Vite (5174)
```

## Stack
- **Moteur IA** : Claude Agent SDK TypeScript (`@anthropic-ai/claude-agent-sdk`) — l'agent a les outils de Claude Code (Read, Write, Edit, Bash, Glob, Grep)
- **Backend** : Node + Express + SSE (streaming des messages de l'agent)
- **Frontend builder** : React + Vite
- **Apps générées** : React + Vite (HMR = aperçu instantané)
