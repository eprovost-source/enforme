# EnForme 🔥

Application web progressive (PWA) de remise en forme — programme d'entraînement maison, plan de diète, suivi du poids, liste d'épicerie batch et rappels. Conçue pour Éric (objectif 205 → 180 lbs).

## Fonctionnalités
- 📅 **Calendrier hebdo** — entraînements + repas combinés, jour par jour
- 🏋️ **Programme A/B/C/D** — circuits 30 min sans équipement, avec **photos animées** des exercices (+ démos vidéo)
- 🍽️ **Diète 7 jours** — repas et collations, shake quotidien, totaux kcal/protéines
- 🔀 **Shuffle des recettes** — remplace n'importe quel aliment par un équivalent du même groupe
- 🛒 **Liste d'épicerie** batch pour 6, cochable
- ⚖️ **Suivi du poids** avec graphique de progression vers l'objectif
- 📷 **Journal photo** — prends une photo d'un repas, l'IA (Claude vision) estime calories et protéines, tu ajustes, et l'app calcule ce qu'il te reste sur ta cible du jour
- 🔔 **Rappels** repas / eau / séance / pesée / Ozempic
- 📴 **Hors-ligne** (service worker) + installable sur l'écran d'accueil Android

Les données (poids, repas, journal) sont stockées **localement** sur l'appareil (aucun compte).

## Stack
HTML / CSS / JavaScript pur côté client. Une seule fonction serverless (`api/analyze.js`) pour l'analyse photo, qui appelle l'API Claude via le SDK `@anthropic-ai/sdk`.

## Déploiement (Vercel)
Importer ce dépôt dans Vercel → aucun réglage de build (Framework : **Other**). Vercel sert les fichiers statiques à la racine et déploie `api/analyze.js` comme fonction serverless. `vercel.json` configure les en-têtes du manifest/service worker et la durée max de la fonction.

### Variable d'environnement requise (pour le journal photo)
Dans Vercel → **Settings → Environment Variables**, ajouter :

| Nom | Valeur |
|-----|--------|
| `ANTHROPIC_API_KEY` | une clé API depuis [console.anthropic.com](https://console.anthropic.com) |

La clé reste côté serveur ; elle n'est jamais exposée dans l'app. Sans elle, tout le reste fonctionne — seul le journal photo est désactivé.

## Développement local
```bash
node server.js   # puis ouvrir http://localhost:4321
```

Photos d'exercices : [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (domaine public).
