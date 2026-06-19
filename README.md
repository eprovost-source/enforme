# EnForme 🔥

Application web progressive (PWA) de remise en forme — programme d'entraînement maison, plan de diète, suivi du poids, liste d'épicerie batch et rappels. Conçue pour Éric (objectif 205 → 180 lbs).

## Fonctionnalités
- 📅 **Calendrier hebdo** — entraînements + repas combinés, jour par jour
- 🏋️ **Programme A/B/C/D** — circuits 30 min sans équipement, avec **photos animées** des exercices (+ démos vidéo)
- 🍽️ **Diète 7 jours** — repas et collations, shake quotidien, totaux kcal/protéines
- 🔀 **Shuffle des recettes** — remplace n'importe quel aliment par un équivalent du même groupe
- 🛒 **Liste d'épicerie** batch pour 6, cochable
- ⚖️ **Suivi du poids** avec graphique de progression vers l'objectif
- 🔔 **Rappels** repas / eau / séance / pesée / Ozempic
- 📴 **Hors-ligne** (service worker) + installable sur l'écran d'accueil Android

Les données sont stockées **localement** sur l'appareil (aucun compte, aucun serveur).

## Stack
HTML / CSS / JavaScript pur — aucune dépendance, aucun build. Site 100 % statique.

## Déploiement (Vercel)
Importer ce dépôt dans Vercel → aucun réglage de build nécessaire (Framework : **Other**, output = racine). Le fichier `vercel.json` configure les en-têtes du manifest et du service worker.

## Développement local
```bash
node server.js   # puis ouvrir http://localhost:4321
```

Photos d'exercices : [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (domaine public).
