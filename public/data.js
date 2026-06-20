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

const DAYS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
const DAY_LABEL = {
  lundi: "Lundi", mardi: "Mardi", mercredi: "Mercredi", jeudi: "Jeudi",
  vendredi: "Vendredi", samedi: "Samedi", dimanche: "Dimanche"
};

// ---- Pools de repas (chaque option a ses VRAIES macros) -----------------
// « Mélanger » bascule vers une autre option du même pool → calories à jour.
const BREAKFASTS = [
  { title: "Œufs brouillés + épinards + rôtie", items: ["3 œufs + 2 blancs brouillés", "épinards", "1 rôtie blé entier", "café"], kcal: 400, prot: 32 },
  { title: "Omelette 3 œufs, épinards, oignon, rôtie", items: ["omelette 3 œufs", "épinards", "oignon", "1 rôtie blé entier"], kcal: 400, prot: 28 },
  { title: "Yogourt grec + protéine + fraises + avoine", items: ["yogourt grec (1 t)", "1 dose de protéine", "fraises", "flocons d'avoine ⅓ t"], kcal: 420, prot: 45 },
  { title: "Cottage + fraises + chia + ½ rôtie", items: ["fromage cottage (1 t)", "fraises", "graines de chia", "½ rôtie blé entier"], kcal: 380, prot: 30 },
  { title: "Pancakes protéinés + fraises", items: ["pancakes protéinés (banane + œufs + protéine + avoine)", "fraises"], kcal: 430, prot: 32 },
  { title: "Shake protéiné + banane + beurre d'arachide", items: ["shake protéiné (lait)", "banane", "beurre d'arachide (1 c. à s.)"], kcal: 420, prot: 35, shake: true },
  { title: "Œufs brouillés + rôtie + banane", items: ["3 œufs brouillés", "1 rôtie blé entier", "banane"], kcal: 450, prot: 24 }
];
const SNACKS = [
  { title: "Yogourt grec + fraises + amandes", items: ["yogourt grec (1 t)", "fraises", "amandes (poignée)"], kcal: 300, prot: 27 },
  { title: "Shake protéiné + amandes", items: ["shake protéiné (eau)", "amandes (poignée)"], kcal: 280, prot: 28, shake: true },
  { title: "Cottage + pomme", items: ["fromage cottage (1 t)", "pomme"], kcal: 260, prot: 26 },
  { title: "Shake protéiné + flocons d'avoine", items: ["shake protéiné", "flocons d'avoine ⅓ t"], kcal: 300, prot: 30, shake: true },
  { title: "Shake protéiné + pomme", items: ["shake protéiné (lait)", "pomme"], kcal: 280, prot: 26, shake: true },
  { title: "Yogourt grec + miel", items: ["yogourt grec (1 t)", "filet de miel"], kcal: 250, prot: 23 }
];
// Bols batch (dîner / souper) — tout vient du batch du dimanche, juste à réchauffer.
const BOWLS = [
  { title: "🍗 Bol poulet BBQ", items: ["Poulet BBQ — 180 g", "Riz cuit — ¾ tasse", "Brocoli + chou-fleur rôtis — 1 ½ tasse", "Huile d'olive — 1 c. à thé"], kcal: 520, prot: 52, reheat: "Micro-ondes : poulet + légumes 2-3 min, riz 1 min (ou poêle 4 min)." },
  { title: "🥩 Bol bœuf tex-mex", items: ["Bœuf haché tex-mex — 180 g", "Quinoa cuit — ¾ tasse", "Courgette + poivrons sautés — 1 ½ tasse"], kcal: 540, prot: 46, reheat: "Poêle 4-5 min (bœuf + légumes); quinoa au micro-ondes 1 min." },
  { title: "🐷 Assiette porc + patate douce", items: ["Porc rôti tranché — 180 g", "Patate douce rôtie — 1 moyenne (~150 g)", "Carottes rôties — 1 tasse"], kcal: 540, prot: 48, reheat: "Micro-ondes 2-3 min, couvert (garde le porc juteux)." },
  { title: "🍗 Sauté poulet asiatique", items: ["Poulet — 180 g", "Courgette + poivrons — 1 ½ tasse", "Sauce soya-gingembre — 1 c. à s.", "Riz cuit — ¾ tasse"], kcal: 510, prot: 52, reheat: "Poêle 4 min avec un filet de sauce soya; riz 1 min." },
  { title: "🥩 Bol bœuf + patate douce", items: ["Bœuf haché — 180 g", "Patate douce rôtie — 1 moyenne (~150 g)", "Brocoli rôti — 1 ½ tasse"], kcal: 530, prot: 46, reheat: "Micro-ondes 2-3 min, ou poêle 4 min." },
  { title: "🐷 Porc BBQ + légumes", items: ["Porc rôti tranché — 180 g", "Brocoli + chou-fleur rôtis — 1 ½ tasse", "Riz cuit — ¾ tasse"], kcal: 540, prot: 48, reheat: "Micro-ondes 2-3 min, couvert." },
  { title: "🍗 Poulet + carottes + quinoa", items: ["Poulet BBQ — 180 g", "Carottes rôties — 1 tasse", "Quinoa cuit — ¾ tasse"], kcal: 500, prot: 52, reheat: "Micro-ondes 2 min; quinoa 1 min." },
  { title: "🥩 Bol bœuf asiatique", items: ["Bœuf haché — 160 g", "Courgette + poivrons — 1 ½ tasse", "Sauce soya-gingembre — 1 c. à s.", "Riz cuit — ¾ tasse"], kcal: 520, prot: 44, reheat: "Poêle 4 min avec sauce soya; riz 1 min." }
];

// Plan 7 jours : index dans BREAKFASTS / SNACKS / BOWLS (dîner+souper = bols batch)
const MEAL_PLAN = {
  lundi:    { dej: 0, collation: 0, diner: 0, souper: 4 },
  mardi:    { dej: 2, collation: 1, diner: 1, souper: 6 },
  mercredi: { dej: 5, collation: 5, diner: 6, souper: 2 },
  jeudi:    { dej: 1, collation: 1, diner: 3, souper: 4 },
  vendredi: { dej: 3, collation: 4, diner: 2, souper: 0 },
  samedi:   { dej: 6, collation: 3, diner: 1, souper: 5 },
  dimanche: { dej: 4, collation: 0, diner: 7, souper: 3 }
};

// ---- Calendrier hebdomadaire (modèle par défaut) ------------------------
const WEEK_TEMPLATE = {
  lundi:    { kind: "workout", id: "A" },
  mardi:    { kind: "workout", id: "B" },
  mercredi: { kind: "rest", label: "Marche + repos", note: "Jour d'injection Ozempic — vas-y doux. Vise 8 000-10 000 pas." },
  jeudi:    { kind: "workout", id: "C" },
  vendredi: { kind: "workout", id: "D" },
  samedi:   { kind: "hockey", label: "Hockey 🏒", note: "Ta journée la plus active. Tu peux ajouter une portion de glucides." },
  dimanche: { kind: "rest", label: "Repos actif + cuisine batch", note: "Session batch cooking (~1h30). Marche en famille." }
};

// ---- Liste d'épicerie (cohérente avec le plan, batch pour 6) ------------
const GROCERY = [
  { section: "Viandes et œufs", items: [
    "Poitrines de poulet — 10-12 (≈ 4-5 kg)", "Bœuf haché maigre — 4 lbs",
    "Porc (filet ou longe) — 2-3 (≈ 2 kg)", "Œufs — 3 douzaines" ] },
  { section: "Produits laitiers / frigo", items: [
    "Yogourt grec nature — 1 gros format (750 g-1 kg)", "Fromage cottage — 1 gros contenant",
    "Lait — selon la maisonnée (shakes)" ] },
  { section: "Protéine en poudre", items: [
    "1 pot whey ou végétale, ~25 g/portion, faible en sucre (≈ 1 mois)" ] },
  { section: "Fruits", items: [
    "Fraises — 2-3 casseaux", "Bananes — 1 régime", "Pommes — sac" ] },
  { section: "Légumes", items: [
    "Brocoli — 3-4 têtes", "Chou-fleur — 2", "Courgettes — 4-5", "Poivrons — 6-8",
    "Oignons — sac", "Carottes — 1 sac", "Patates douces — 6-8", "Épinards — 1 gros sac" ] },
  { section: "Féculents / garde-manger", items: [
    "Riz — 1 gros sac", "Quinoa — 1 sac", "Flocons d'avoine — 1 contenant", "Pain blé entier — 1-2" ] },
  { section: "Gras / sauces / épices", items: [
    "Huile d'olive", "Amandes — 1 sac", "Beurre d'arachide naturel", "Graines de chia — petit sac", "Miel",
    "Sauce soya légère", "Gingembre frais (ou en poudre)",
    "Épices : ail, paprika fumé, cumin, poudre de chili, sel, poivre",
    "Mélange d'épices BBQ (sans sucre)" ] }
];

// ---- Batch cooking : préparation (dimanche) -----------------------------
const BATCH_PREP = {
  title: "Dimanche — prépare tout (~1h30)",
  intro: "Quantités pour la maisonnée (6) : tu cuis les bases une fois, ça nourrit la famille. Ton assiette à toi reste une portion individuelle (~180 g de protéine).",
  steps: [
    "Préchauffe le four à 200 °C (400 °F). Sors 3-4 plaques.",
    "POULET BBQ — 10-12 poitrines : enrobe de 3 c. à s. d'huile + 3 c. à s. d'épices BBQ + 1 c. à s. paprika fumé + ail. Étale sur 2 plaques.",
    "PORC — 2 longes (~2 kg) : frotte de 2 c. à s. d'huile + 4 gousses d'ail + herbes + sel/poivre. 1 plaque.",
    "Enfourne poulet + porc 22-28 min (poulet 74 °C, porc 63-65 °C). Repos 5 min, tranche, range.",
    "LÉGUMES RÔTIS : 2 brocolis + 1 chou-fleur sur 1 plaque, 1 sac de carottes sur 1 autre. 3 c. à s. d'huile + sel. Rôtis 20-25 min à 220 °C.",
    "BŒUF TEX-MEX — 4 lbs : fais revenir 1 gros oignon, ajoute le bœuf, cuis, égoutte. Ajoute 2 c. à s. cumin + 1 c. à s. paprika + 1-2 c. à thé chili (sans tomate).",
    "SAUTÉ ASIATIQUE : 4-5 courgettes + 6 poivrons + 2 oignons à la poêle 6-8 min, puis 3 c. à s. soya + 2 c. à s. gingembre + ail.",
    "FÉCULENTS : 3 tasses de riz cru + 2 tasses de quinoa cru (cuits). 6-8 patates douces en cubes au four 20-25 min.",
    "Refroidis et range par composante. 4 jours au frigo (congèle le surplus)."
  ],
  refresh: { title: "Mercredi — petit rafraîchissement (~20 min)", steps: [
    "Refais 2 tasses de riz cru OU 1 tasse de quinoa cru, frais.",
    "Rôtis 1 nouvelle plaque de légumes (1 brocoli + 1 chou-fleur, ou 1 sac de carottes).",
    "Au besoin, cuis 4-5 poitrines de poulet de plus pour finir la semaine." ] }
};

// ---- Réglages par défaut ------------------------------------------------
const DEFAULTS = {
  startWeight: 205,
  goalWeight: 180,
  startDate: "2026-06-16",
  proteinTarget: 170,
  kcalTarget: 1950,
  waterTargetL: 2.75,
  pushEnabled: false,
  reminders: {
    enabled: false,
    dej: "07:30", collation: "15:00", diner: "12:00", souper: "18:00",
    workout: "17:00", water: true, weighIn: "dimanche",
    ozempic: "mercredi", ozempicTime: "09:00"
  }
};

// Doses Ozempic (titration habituelle — suivi par le médecin)
const OZEMPIC_DOSES = ["0,25 mg", "0,5 mg", "1,0 mg", "1,7 mg", "2,0 mg"];

// Recettes détaillées des composantes batch — QUANTITÉS POUR LA MAISONNÉE (6)
const RECIPES = [
  { id: "poulet_bbq", emoji: "🍗", title: "Poulet BBQ au four (batch)", time: "~30 min", yield: "Pour 6 · ~10-12 poitrines",
    ingredients: ["10-12 poitrines de poulet (≈ 4-5 kg)", "3 c. à s. d'huile d'olive", "3 c. à s. de mélange BBQ sans sucre", "1 c. à s. de paprika fumé", "4 gousses d'ail (ou 1 c. à thé d'ail en poudre)", "1 c. à thé de sel, ½ c. à thé de poivre"],
    steps: [
      "Préchauffe le four à 200 °C (400 °F).",
      "Dans un grand bol, mélange l'huile + toutes les épices.",
      "Enrobe les poitrines, étale sur 2 plaques (une seule couche).",
      "Cuis 22-28 min (74 °C à cœur).",
      "Repos 5 min, tranche. Range en contenants — 4 jours au frigo (congèle le surplus)." ] },
  { id: "porc", emoji: "🐷", title: "Porc rôti (batch)", time: "~30 min", yield: "Pour 6 · 2 longes (~2 kg)",
    ingredients: ["2 longes ou filets de porc (~2 kg)", "2 c. à s. d'huile d'olive", "4 gousses d'ail émincées", "1 c. à s. d'herbes (thym/romarin)", "1 c. à thé de sel, ½ c. à thé de poivre"],
    steps: [
      "Four à 200 °C (400 °F). Mélange huile + ail + herbes + sel + poivre.",
      "Frotte les longes partout, dépose sur une plaque.",
      "Rôtis 22-28 min (63-65 °C à cœur pour le filet — juteux).",
      "Repos 5 min IMPORTANT, puis tranche fin.",
      "Réchauffe toujours couvert pour garder moelleux." ] },
  { id: "boeuf_texmex", emoji: "🥩", title: "Bœuf haché tex-mex (batch, sans tomate)", time: "~20 min", yield: "Pour 6 · 4 lbs",
    ingredients: ["4 lbs (1,8 kg) de bœuf haché maigre", "1 gros oignon haché", "4 gousses d'ail", "2 c. à s. de cumin", "1 c. à s. de paprika", "1-2 c. à thé de poudre de chili", "1 c. à thé de sel"],
    steps: [
      "Fais revenir l'oignon 3 min dans un grand chaudron.",
      "Ajoute le bœuf, défais-le à la cuillère, cuis jusqu'à plus rosé.",
      "Égoutte le gras. Ajoute ail + cumin + paprika + chili + sel (pas de tomate).",
      "Mijote 3-4 min. Pour bols et wraps. 4 jours au frigo." ] },
  { id: "legumes", emoji: "🥦", title: "Légumes rôtis (batch)", time: "~25 min", yield: "Pour 6 · 2 plaques",
    ingredients: ["2 têtes de brocoli + 1 chou-fleur (en bouquets)", "1 sac de carottes (~1 kg, en bâtonnets)", "3 c. à s. d'huile d'olive", "1 c. à thé de sel, ail, poivre"],
    steps: [
      "Four à 220 °C (425 °F). Coupe en morceaux réguliers.",
      "Brocoli + chou-fleur sur une plaque; carottes sur l'autre.",
      "Mélange chaque plaque avec ~1,5 c. à s. d'huile + assaisonnements, une seule couche.",
      "Rôtis 20-25 min en remuant à mi-cuisson. 4-5 jours au frigo." ] },
  { id: "saute_asia", emoji: "🥢", title: "Sauté de légumes asiatique (batch)", time: "~10 min", yield: "Pour 6 · grande poêlée",
    ingredients: ["4-5 courgettes en demi-lunes", "6 poivrons en lanières", "2 oignons", "3 c. à s. de sauce soya légère", "2 c. à s. de gingembre râpé", "3 gousses d'ail", "1 c. à s. d'huile"],
    steps: [
      "Chauffe une grande poêle à feu vif avec l'huile.",
      "Ajoute oignons, poivrons, courgettes; saute 6-8 min (garde croquant).",
      "Ajoute ail + gingembre + sauce soya, 1 min de plus.",
      "Parfait avec poulet ou bœuf + riz." ] },
  { id: "feculents", emoji: "🍚", title: "Riz, quinoa & patates douces (batch)", time: "~30 min", yield: "Pour 6 · la semaine",
    ingredients: ["3 tasses de riz cru", "2 tasses de quinoa cru", "6-8 patates douces en cubes", "Huile, sel"],
    steps: [
      "Riz : cuis 3 tasses crues selon le paquet (≈ 9 tasses cuites).",
      "Quinoa : rince, cuis 2 tasses crues (≈ 6 tasses cuites).",
      "Patates douces : cubes + filet d'huile + sel, au four 220 °C 20-25 min.",
      "Refroidis et range séparément. Riz/quinoa 4-5 jours." ] },
  { id: "pancakes", emoji: "🥞", title: "Pancakes protéinés", time: "~10 min", yield: "1 portion",
    ingredients: ["1 banane", "2 œufs", "1 dose de protéine en poudre", "⅓ tasse de flocons d'avoine", "Fraises"],
    steps: [
      "Écrase la banane, mélange avec œufs, protéine et avoine.",
      "Laisse reposer 2 min (l'avoine épaissit).",
      "Cuis à feu moyen, petites louches, ~2 min par côté.",
      "Garnis de fraises. ~30 g de protéines." ] }
];

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
