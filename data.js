/* ============================================================
   data.js — Toutes les données du programme d'Éric
   Programme : coach + nutritionniste. Objectif 205 → 180 lbs.
   ============================================================ */

// Base des images d'exercices (libre de droits — free-exercise-db, domaine public)
const IMG_BASE = "https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/";

// ---- Bibliothèque d'exercices -------------------------------------------
// frames: 2 images (début/fin) pour l'effet animé, ou null si pas de photo fiable.
// yt: terme de recherche pour la démo vidéo.
const EXERCISES = {
  jumping_jacks: {
    name: "Jumping jacks", target: "Cardio / corps entier",
    frames: ["Star_Jump/0.jpg", "Star_Jump/1.jpg"], yt: "jumping jacks tutoriel",
    tips: "Saute en écartant bras et jambes en même temps, puis reviens. Garde un rythme régulier."
  },
  arm_circles: {
    name: "Cercles de bras", target: "Échauffement épaules",
    frames: null, yt: "arm circles warm up",
    tips: "Bras tendus sur les côtés, fais de petits cercles vers l'avant puis vers l'arrière."
  },
  hip_rotations: {
    name: "Rotations de hanches", target: "Échauffement hanches",
    frames: null, yt: "hip circles warm up",
    tips: "Mains sur les hanches, dessine de grands cercles avec ton bassin, dans les deux sens."
  },
  squat: {
    name: "Squats au poids du corps", target: "Cuisses, fessiers",
    frames: ["Bodyweight_Squat/0.jpg", "Bodyweight_Squat/1.jpg"], yt: "squat poids du corps technique",
    tips: "Pieds largeur d'épaules, descends comme pour t'asseoir, dos droit, genoux dans l'axe des pieds. Pousse dans les talons pour remonter."
  },
  lunge: {
    name: "Fentes alternées", target: "Cuisses, fessiers",
    frames: ["Bodyweight_Walking_Lunge/0.jpg", "Bodyweight_Walking_Lunge/1.jpg"], yt: "fentes avant technique",
    tips: "Grand pas en avant, descends jusqu'à ~90° aux deux genoux, le genou arrière frôle le sol. Remonte et alterne."
  },
  glute_bridge: {
    name: "Pont fessier (glute bridge)", target: "Fessiers, bas du dos",
    frames: ["Butt_Lift_Bridge/0.jpg", "Butt_Lift_Bridge/1.jpg"], yt: "glute bridge technique",
    tips: "Sur le dos, genoux pliés, pieds au sol. Pousse dans les talons et lève les hanches, serre les fessiers en haut."
  },
  mountain_climbers: {
    name: "Mountain climbers", target: "Cardio, abdos",
    frames: ["Mountain_Climbers/0.jpg", "Mountain_Climbers/1.jpg"], yt: "mountain climbers technique",
    tips: "En position de planche, ramène les genoux vers la poitrine en alternance, rapidement. Garde le bassin bas."
  },
  wall_sit: {
    name: "Chaise au mur (wall sit)", target: "Cuisses (isométrie)",
    frames: null, yt: "wall sit chaise au mur",
    tips: "Dos contre le mur, glisse jusqu'à avoir les cuisses parallèles au sol (90°). Tiens la position sans bouger."
  },
  pushups: {
    name: "Push-ups (pompes)", target: "Pectoraux, triceps",
    frames: ["Pushups/0.jpg", "Pushups/1.jpg"], yt: "pompes technique débutant",
    tips: "Corps gainé en ligne droite, mains un peu plus larges que les épaules. Descends la poitrine près du sol, pousse. Sur les genoux au début si besoin."
  },
  pike_pushups: {
    name: "Pike push-ups (épaules)", target: "Épaules",
    frames: null, yt: "pike push up technique",
    tips: "En V inversé (fesses vers le haut), descends le sommet de la tête vers le sol en pliant les coudes, puis pousse. Cible les épaules."
  },
  chair_dips: {
    name: "Dips sur chaise", target: "Triceps",
    frames: ["Bench_Dips/0.jpg", "Bench_Dips/1.jpg"], yt: "dips sur chaise triceps",
    tips: "Mains sur le bord d'une chaise stable derrière toi, descends en pliant les coudes vers l'arrière, puis pousse pour remonter."
  },
  superman: {
    name: "Superman (bas du dos)", target: "Lombaires, dos",
    frames: ["Superman/0.jpg", "Superman/1.jpg"], yt: "superman exercice dos",
    tips: "À plat ventre, lève simultanément bras et jambes du sol, serre le bas du dos une seconde, puis redescends en contrôle."
  },
  plank: {
    name: "Planche", target: "Abdos, gainage",
    frames: ["Plank/0.jpg", "Plank/1.jpg"], yt: "planche gainage technique",
    tips: "Sur les avant-bras et les orteils, corps en ligne droite, abdos et fessiers serrés. Ne creuse pas le bas du dos."
  },
  burpees: {
    name: "Burpees", target: "Cardio, corps entier",
    frames: null, yt: "burpee sans saut débutant",
    tips: "Squat, mains au sol, ramène les pieds en planche, (pompe optionnelle), reviens en squat, lève-toi. Sans saut au début."
  },
  squat_jumps: {
    name: "Squat jumps", target: "Cuisses, cardio",
    frames: ["Freehand_Jump_Squat/0.jpg", "Freehand_Jump_Squat/1.jpg"], yt: "squat jump technique",
    tips: "Descends en squat puis explose vers le haut en sautant. Atterris en douceur, genoux fléchis, et enchaîne."
  },
  high_knees: {
    name: "High knees (genoux hauts)", target: "Cardio",
    frames: null, yt: "high knees course sur place",
    tips: "Course sur place en montant les genoux à hauteur des hanches, rapidement. Garde le tronc gainé."
  }
};

// ---- Séances d'entraînement (circuits 30 min) ---------------------------
const WARMUP = {
  title: "Échauffement", duration: "3 min",
  note: "À faire avant chaque séance.",
  exercises: [
    { key: "jumping_jacks", scheme: "30 sec" },
    { key: "arm_circles", scheme: "30 sec" },
    { key: "hip_rotations", scheme: "30 sec" },
    { key: "squat", scheme: "10 lents" }
  ]
};

const WORKOUTS = {
  A: {
    id: "A", title: "Jour A — Bas du corps + cardio", color: "#ff6b4a",
    rounds: 3, rest: "30 sec entre les exercices",
    exercises: [
      { key: "squat", scheme: "15 reps" },
      { key: "lunge", scheme: "10 / jambe" },
      { key: "glute_bridge", scheme: "20 reps" },
      { key: "mountain_climbers", scheme: "30 sec" },
      { key: "wall_sit", scheme: "30-45 sec" }
    ]
  },
  B: {
    id: "B", title: "Jour B — Haut du corps", color: "#3aa0ff",
    rounds: 3, rest: "30 sec entre les exercices",
    exercises: [
      { key: "pushups", scheme: "8-12 reps" },
      { key: "pike_pushups", scheme: "8 reps" },
      { key: "chair_dips", scheme: "12 reps" },
      { key: "superman", scheme: "15 reps" },
      { key: "plank", scheme: "20-40 sec" }
    ]
  },
  C: {
    id: "C", title: "Jour C — Full body / cardio", color: "#1bbf83",
    rounds: 4, rest: "rythmé, repos court",
    exercises: [
      { key: "burpees", scheme: "8 reps" },
      { key: "squat_jumps", scheme: "12 reps" },
      { key: "mountain_climbers", scheme: "30 sec" },
      { key: "high_knees", scheme: "30 sec" },
      { key: "plank", scheme: "30 sec" }
    ]
  }
};

// Jour D = alterne A / B selon la semaine (calculé dans app.js)

// ---- Groupes d'échange pour le "shuffle" des repas ----------------------
// Chaque ingrédient porte un "group"; le shuffle pige une autre option du
// même groupe (en respectant : pas de poisson/fruits de mer, pas de tomates).
const SWAP_GROUPS = {
  prot: [
    "poulet grillé (180 g)", "dinde hachée (150 g)", "bœuf haché maigre (180 g)",
    "porc maigre (180 g)", "dinde tranchée (150 g)", "3 œufs + 2 blancs",
    "yogourt grec (1 t)", "fromage cottage (1 t)", "shake protéiné"
  ],
  carb: [
    "riz ¾ t", "quinoa ¾ t", "patate douce moyenne", "flocons d'avoine ⅓ t",
    "tortilla blé entier", "rôtie blé entier"
  ],
  veg: [
    "brocoli", "poivrons", "courgette + oignon", "chou-fleur rôti",
    "haricots verts", "carottes", "épinards", "légumes mélangés", "concombre + laitue"
  ],
  fruit: ["fraises", "framboises", "pomme", "banane"],
  fat: ["amandes (poignée)", "huile d'olive (filet)", "beurre d'arachide (1 c. à s.)", "graines de chia", "hummus"]
};

// ---- Plan repas 7 jours -------------------------------------------------
// type: dej | collation | diner | souper.  i = ingrédients [{l: label, g: groupe ou null}]
// kcal / prot = approximations pour atteindre ~1950 kcal / ~170 g protéines.
function meal(title, kcal, prot, items, opts = {}) {
  return { title, kcal, prot, items, shake: !!opts.shake, note: opts.note || "" };
}
function ing(l, g = null) { return { l, g }; }

const DAYS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
const DAY_LABEL = {
  lundi: "Lundi", mardi: "Mardi", mercredi: "Mercredi", jeudi: "Jeudi",
  vendredi: "Vendredi", samedi: "Samedi", dimanche: "Dimanche"
};

const MEAL_PLAN = {
  lundi: {
    dej: meal("Déjeuner", 400, 25, [ing("3 œufs + 2 blancs brouillés", "prot"), ing("épinards", "veg"), ing("rôtie blé entier", "carb"), ing("café")]),
    collation: meal("Collation", 300, 25, [ing("yogourt grec (1 t)", "prot"), ing("fraises", "fruit"), ing("amandes (poignée)", "fat")], { shake: true, note: "Shake en après-midi si pressé" }),
    diner: meal("Dîner", 600, 50, [ing("poulet grillé (180 g)", "prot"), ing("riz ¾ t", "carb"), ing("brocoli", "veg"), ing("poivrons", "veg"), ing("huile d'olive (filet)", "fat")]),
    souper: meal("Souper", 650, 45, [ing("bœuf haché maigre (180 g)", "prot"), ing("courgette + oignon", "veg"), ing("patate douce moyenne", "carb")])
  },
  mardi: {
    dej: meal("Déjeuner", 420, 40, [ing("yogourt grec (1 t)", "prot"), ing("shake protéiné", "prot"), ing("fraises", "fruit"), ing("flocons d'avoine ⅓ t", "carb")]),
    collation: meal("Collation", 280, 27, [ing("shake protéiné (eau)", "prot"), ing("amandes (poignée)", "fat")], { shake: true }),
    diner: meal("Dîner", 550, 40, [ing("dinde tranchée (150 g)", "prot"), ing("concombre + laitue", "veg"), ing("hummus", "fat"), ing("tortilla blé entier", "carb")]),
    souper: meal("Souper", 600, 52, [ing("poulet grillé (180 g)", "prot"), ing("haricots verts", "veg"), ing("riz ¾ t", "carb")])
  },
  mercredi: {
    dej: meal("Déjeuner", 420, 30, [ing("shake protéiné (lait)", "prot"), ing("banane", "fruit"), ing("beurre d'arachide (1 c. à s.)", "fat")], { shake: true, note: "Jour Ozempic — plus léger" }),
    collation: meal("Collation", 250, 23, [ing("yogourt grec (1 t)", "prot"), ing("miel")]),
    diner: meal("Dîner", 450, 35, [ing("soupe poulet-légumes (bouillon clair)", "prot"), ing("2 œufs durs", "prot")]),
    souper: meal("Souper", 520, 40, [ing("dinde hachée (150 g)", "prot"), ing("purée de chou-fleur", "veg"), ing("carottes", "veg")])
  },
  jeudi: {
    dej: meal("Déjeuner", 400, 25, [ing("omelette 3 œufs", "prot"), ing("épinards", "veg"), ing("oignon"), ing("rôtie blé entier", "carb")]),
    collation: meal("Collation", 280, 27, [ing("shake protéiné (eau)", "prot"), ing("amandes (poignée)", "fat")], { shake: true }),
    diner: meal("Dîner", 580, 42, [ing("bœuf haché maigre (160 g)", "prot"), ing("quinoa ¾ t", "carb"), ing("légumes rôtis", "veg")]),
    souper: meal("Souper", 600, 52, [ing("poulet grillé (180 g)", "prot"), ing("brocoli", "veg"), ing("patate douce moyenne", "carb")])
  },
  vendredi: {
    dej: meal("Déjeuner", 380, 28, [ing("fromage cottage (1 t)", "prot"), ing("fraises", "fruit"), ing("graines de chia", "fat"), ing("½ rôtie blé entier", "carb")]),
    collation: meal("Collation", 300, 25, [ing("shake protéiné (lait)", "prot"), ing("pomme", "fruit")], { shake: true }),
    diner: meal("Dîner", 560, 42, [ing("poulet grillé (160 g)", "prot"), ing("poivrons", "veg"), ing("hummus", "fat"), ing("tortilla blé entier", "carb")]),
    souper: meal("Souper", 620, 48, [ing("porc maigre (180 g)", "prot"), ing("chou-fleur rôti", "veg"), ing("riz ¾ t", "carb")])
  },
  samedi: {
    dej: meal("Déjeuner", 450, 24, [ing("3 œufs brouillés", "prot"), ing("rôtie blé entier", "carb"), ing("banane", "fruit")], { note: "Jour hockey — un peu plus de glucides" }),
    collation: meal("Collation", 300, 28, [ing("shake protéiné", "prot"), ing("flocons d'avoine ⅓ t", "carb")], { shake: true }),
    diner: meal("Dîner", 620, 50, [ing("dinde hachée (180 g)", "prot"), ing("riz 1 t", "carb"), ing("légumes mélangés", "veg")]),
    souper: meal("Souper", 650, 45, [ing("bœuf haché maigre (180 g)", "prot"), ing("légumes mélangés", "veg"), ing("patate douce moyenne", "carb")])
  },
  dimanche: {
    dej: meal("Déjeuner", 430, 30, [ing("pancakes protéinés (banane + œufs + protéine + avoine)", "prot"), ing("fraises", "fruit")], { note: "Jour cuisine batch" }),
    collation: meal("Collation", 280, 27, [ing("shake protéiné (eau)", "prot"), ing("amandes (poignée)", "fat")], { shake: true }),
    diner: meal("Dîner", 520, 38, [ing("restes au choix de la semaine", "prot"), ing("grosse portion de légumes", "veg")]),
    souper: meal("Souper", 600, 50, [ing("poulet rôti (180 g)", "prot"), ing("haricots verts", "veg"), ing("quinoa ¾ t", "carb")])
  }
};

// ---- Calendrier hebdomadaire (modèle par défaut) ------------------------
// kind: workout (avec id A/B/C/D) | hockey | rest
const WEEK_TEMPLATE = {
  lundi:    { kind: "workout", id: "A" },
  mardi:    { kind: "workout", id: "B" },
  mercredi: { kind: "rest", label: "Marche + repos", note: "Jour d'injection Ozempic — vas-y doux. Vise 8 000-10 000 pas." },
  jeudi:    { kind: "workout", id: "C" },
  vendredi: { kind: "workout", id: "D" },
  samedi:   { kind: "hockey", label: "Hockey 🏒", note: "Ta journée la plus active. Tu peux ajouter une portion de glucides." },
  dimanche: { kind: "rest", label: "Repos actif + cuisine batch", note: "Session batch cooking (~1h30). Marche en famille." }
};

// ---- Liste d'épicerie (batch pour 6 personnes) --------------------------
const GROCERY = [
  { section: "Viandes et œufs", items: [
    "Poitrines de poulet — 10-12 (≈ 4-5 kg)", "Bœuf haché maigre — 4 lbs",
    "Dinde hachée — 2 lbs", "Filet de porc — 2 (≈ 1,5 kg)",
    "Dinde tranchée (charcuterie) — 1 paquet", "Œufs — 3 douzaines" ] },
  { section: "Produits laitiers / frigo", items: [
    "Yogourt grec nature — 1 gros format (750 g-1 kg)", "Fromage cottage — 1 gros contenant",
    "Lait — selon la maisonnée (shakes)", "Hummus — 1-2 contenants" ] },
  { section: "Protéine en poudre", items: [
    "1 pot whey ou végétale, ~25 g/portion, faible en sucre (≈ 1 mois)" ] },
  { section: "Fruits", items: [
    "Fraises — 2-3 casseaux", "Bananes — 1 régime", "Pommes — sac",
    "Framboises — 1 casseau (optionnel)" ] },
  { section: "Légumes", items: [
    "Brocoli — 3-4 têtes", "Poivrons — 6-8", "Courgettes — 4-5", "Chou-fleur — 2",
    "Carottes — 1 sac", "Haricots verts — 2 sacs", "Épinards — 1 gros sac",
    "Oignons — sac", "Concombres — 2-3", "Laitue — 1-2",
    "Légumes surgelés mélangés — 2-3 sacs" ] },
  { section: "Féculents / garde-manger", items: [
    "Riz — 1 gros sac", "Quinoa — 1 sac", "Patates douces — 6-8",
    "Flocons d'avoine — 1 contenant", "Pain blé entier — 1-2", "Tortillas blé entier — 1-2 paquets" ] },
  { section: "Gras / extras", items: [
    "Huile d'olive", "Amandes — 1 sac", "Beurre d'arachide naturel",
    "Graines de chia — petit sac", "Miel",
    "Assaisonnements : ail, paprika, cumin, sel, poivre, sauce soya légère" ] }
];

// ---- Guide batch cooking ------------------------------------------------
const BATCH_GUIDE = {
  dimanche: { title: "Dimanche — grosse session (~1h30)", steps: [
    "Plaque de poulet au four : 8-10 poitrines (base de plusieurs repas).",
    "Gros chaudron de bœuf haché maigre assaisonné (3-4 lbs) — bols, wraps, tacos.",
    "Un gros plat de riz + un de quinoa.",
    "Plaques de légumes rôtis (brocoli, poivrons, courgette, chou-fleur, carottes).",
    "Une douzaine d'œufs durs d'avance." ] },
  mercredi: { title: "Mercredi — petite session (~30 min)", steps: [
    "Refaire du riz / quinoa frais.",
    "Une 2e plaque de légumes rôtis.",
    "Cuire une protéine différente (dinde ou porc) pour casser la monotonie." ] }
};

// ---- Réglages par défaut ------------------------------------------------
const DEFAULTS = {
  startWeight: 205,
  goalWeight: 180,
  startDate: "2026-06-16",
  proteinTarget: 170,
  kcalTarget: 1950,
  waterTargetL: 2.75,
  reminders: {
    enabled: false,
    dej: "07:30", collation: "15:00", diner: "12:00", souper: "18:00",
    workout: "17:00", water: true, weighIn: "dimanche", ozempic: "mercredi"
  }
};

// Petites citations de motivation (rotation quotidienne)
const QUOTES = [
  "La perte de poids se joue à 80 % dans l'assiette. Tu gères ça un repas à la fois. 💪",
  "Juge la tendance du mois, pas la pesée du jour.",
  "Frappe tes protéines même les jours sans appétit — le shake est ton ami.",
  "La marche quotidienne brûle plus sur la semaine que la séance. Bouge.",
  "L'Ozempic gère l'appétit; toi tu bâtis les habitudes qui resteront après.",
  "Hydrate-toi : 2,5-3 L/jour. Ça aide tout — énergie, digestion, faim.",
  "Constance > intensité. Un petit effort tous les jours bat un gros effort de temps en temps.",
  "Tu n'es pas à un régime, tu bâtis une nouvelle normale."
];
