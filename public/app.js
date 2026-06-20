/* ============================================================
   app.js — Logique de l'app EnForme
   ============================================================ */
"use strict";

/* ---------- Stockage local ---------- */
const KEY = "enforme.v1";
function loadState(){
  let s;
  try { s = JSON.parse(localStorage.getItem(KEY)) || {}; } catch(e){ s = {}; }
  s.settings = Object.assign({}, DEFAULTS, s.settings || {});
  s.settings.reminders = Object.assign({}, DEFAULTS.reminders, (s.settings && s.settings.reminders) || {});
  s.weights = s.weights || [];
  s.checks = s.checks || {};          // { 'YYYY-MM-DD': { id:true, water:n } }
  s.grocery = s.grocery || {};        // { 'item': true }
  s.mealOverrides = s.mealOverrides || {}; // { 'jour-type': { idx: 'label' } }
  s.journal = s.journal || {};        // { 'YYYY-MM-DD': [{id,name,quantity,kcal,protein}] }
  s.ozempic = s.ozempic || [];        // [{date,dose,note}]
  return s;
}
let S = loadState();
const TOKEN_KEY = "enforme.token";
let authToken = null, syncTimer = null;
function save(){ localStorage.setItem(KEY, JSON.stringify(S)); scheduleSync(); }

/* ---------- Helpers dates ---------- */
function pad(n){ return String(n).padStart(2,"0"); }
function dateKey(d){ return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate()); }
function todayKey(){ return dateKey(new Date()); }
const JS_DAY_TO_NAME = ["dimanche","lundi","mardi","mercredi","jeudi","vendredi","samedi"];
function dayNameOf(d){ return JS_DAY_TO_NAME[d.getDay()]; }
function todayName(){ return dayNameOf(new Date()); }
function isoWeek(d){
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = (t.getUTCDay()+6)%7; t.setUTCDate(t.getUTCDate()-day+3);
  const first = new Date(Date.UTC(t.getUTCFullYear(),0,4));
  return 1 + Math.round(((t-first)/86400000 - 3 + ((first.getUTCDay()+6)%7))/7);
}
// Jour D = alterne A/B selon la parité de la semaine
function jourDTarget(d){ return isoWeek(d||new Date())%2===0 ? "A" : "B"; }
function workoutForDay(dayName, dateObj){
  const t = WEEK_TEMPLATE[dayName];
  if(!t || t.kind!=="workout") return null;
  let id = t.id;
  if(id==="D") id = jourDTarget(dateObj);
  return { id, def: WORKOUTS[id], isD: t.id==="D" };
}

/* ---------- Helpers DOM ---------- */
function el(html){ const t=document.createElement("template"); t.innerHTML=html.trim(); return t.content.firstChild; }
function $(s,r){ return (r||document).querySelector(s); }
function $all(s,r){ return Array.prototype.slice.call((r||document).querySelectorAll(s)); }
function esc(s){ return String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])); }
function toast(msg){
  const t=$("#toast"); t.textContent=msg; t.classList.add("show");
  clearTimeout(t._t); t._t=setTimeout(()=>t.classList.remove("show"),1900);
}
function ytLink(q){ return "https://www.youtube.com/results?search_query="+encodeURIComponent(q); }

/* ---------- Modal ---------- */
function openModal(html){ $("#modal").innerHTML=html; $("#modalBack").classList.add("show"); }
function closeModal(){ $("#modalBack").classList.remove("show"); }
$("#modalBack").addEventListener("click",e=>{ if(e.target.id==="modalBack") closeModal(); });

/* ---------- Navigation ---------- */
let currentView="today";
function switchView(v){
  currentView=v;
  $all(".view").forEach(x=>x.classList.remove("active"));
  $("#view-"+v).classList.add("active");
  $all(".tab").forEach(t=>t.classList.toggle("active", t.dataset.view===v));
  render();
  window.scrollTo(0,0);
}
$all(".tab").forEach(t=>t.addEventListener("click",()=>switchView(t.dataset.view)));

/* ---------- Exercice : carte ---------- */
function exoCard(key, scheme){
  const ex = EXERCISES[key];
  let frameHtml;
  if(ex.frames){
    frameHtml = `<div class="frame" data-anim>
      <img src="${IMG_BASE+ex.frames[0]}" alt="${esc(ex.name)}" loading="lazy" style="transition:opacity .3s">
      <img src="${IMG_BASE+ex.frames[1]}" alt="" loading="lazy" style="opacity:0;transition:opacity .3s">
    </div>`;
  } else {
    frameHtml = `<div class="frame"><div class="ph">
      <div class="em">🎬</div>
      <a class="pill blue" href="${ytLink(ex.yt)}" target="_blank" rel="noopener">▶ Voir la démo vidéo</a>
    </div></div>`;
  }
  return `<div class="exo">
    ${frameHtml}
    <div class="meta">
      <div class="schemeRow">
        ${scheme?`<span class="badge-num">${esc(scheme)}</span>`:""}
        <span class="pill">${esc(ex.target)}</span>
        ${ex.frames?`<a class="pill blue" href="${ytLink(ex.yt)}" target="_blank" rel="noopener">▶ vidéo</a>`:""}
      </div>
      <h4>${esc(ex.name)}</h4>
      <div class="tip">${esc(ex.tips)}</div>
    </div>
  </div>`;
}

/* ====================================================================
   VUE — AUJOURD'HUI
   ==================================================================== */
function renderToday(){
  const d=new Date(), dn=todayName(), tk=todayKey();
  const checks = S.checks[tk] = S.checks[tk] || {};
  const w = currentWeight();
  const lost = (S.settings.startWeight - w);
  const remain = Math.max(0, w - S.settings.goalWeight);
  const quote = QUOTES[d.getDate() % QUOTES.length];
  const wk = workoutForDay(dn, d);
  const tpl = WEEK_TEMPLATE[dn];
  const plan = MEAL_PLAN[dn];
  const water = checks.water || 0;
  const waterGlasses = Math.round(S.settings.waterTargetL*1000/250);

  let html = `
  <div class="hero">
    <div class="date">${capitalize(dn)} ${d.getDate()} ${moisFr(d.getMonth())}</div>
    <div class="quote">“${esc(quote)}”</div>
    <div class="streak">🔥 Série : ${streak()} jour(s) actif(s)</div>
  </div>

  <div class="kpi-grid">
    <div class="kpi"><div class="num">${w}<span style="font-size:12px"> lb</span></div><div class="lab">Poids actuel</div></div>
    <div class="kpi"><div class="num" style="color:var(--green)">${lost>=0?"−":"+"}${Math.abs(lost).toFixed(1)}</div><div class="lab">Perdu</div></div>
    <div class="kpi"><div class="num" style="color:var(--accent2)">${remain.toFixed(1)}</div><div class="lab">À perdre</div></div>
  </div>
  <div class="card">
    <div class="row between"><strong>Vers l'objectif (${S.settings.goalWeight} lb)</strong><span class="muted small">${pctToGoal()}%</span></div>
    <div class="bar"><span style="width:${pctToGoal()}%"></span></div>
  </div>`;

  // Plan d'entraînement du jour
  html += `<h2 class="section-title">🏋️ Entraînement du jour</h2>`;
  if(wk){
    const done = checks["workout"];
    html += `<div class="card">
      <div class="row between">
        <div><h3>${esc(wk.def.title)}</h3>
        <div class="muted small">${wk.def.rounds} tours · repos ${esc(wk.def.rest)}${wk.isD?` · (Jour D → ${wk.id})`:""}</div></div>
        <div class="dot" style="width:42px;height:42px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:${wk.def.color}22;color:${wk.def.color};font-weight:800">${wk.id}</div>
      </div>
      <div class="row mt" style="gap:8px">
        <button class="btn-accent" style="flex:1" onclick="gotoWorkout('${wk.id}')">▶ Démarrer la séance</button>
        <button class="${done?'btn-ghost':'btn-accent'} btn-sm" onclick="toggleCheck('workout')">${done?"✓ Faite":"Marquer faite"}</button>
      </div>
    </div>`;
  } else {
    html += `<div class="card"><div class="row between">
      <div><h3>${esc(tpl.label||"Repos")}</h3><div class="muted small">${esc(tpl.note||"")}</div></div>
      <div style="font-size:28px">${tpl.kind==="hockey"?"🏒":"🧘"}</div>
    </div></div>`;
  }

  // Repas du jour
  html += `<h2 class="section-title">🍽️ Repas du jour</h2><div class="card">`;
  ["dej","collation","diner","souper"].forEach(type=>{
    const m=activeMeal(dn,type); const id="meal-"+type; const done=checks[id];
    html += `<div class="check ${done?'done':''}">
      <input type="checkbox" ${done?"checked":""} onchange="toggleCheck('${id}')">
      <div class="body">
        <div class="t">${esc(m.label)} <span class="muted small">· ${m.kcal} kcal · ${m.prot} g</span>${m.shake?' <span class="pill accent">+ shake</span>':""}</div>
        <div class="d">${esc(m.title)}</div>
      </div>
      <button class="icon-btn" onclick="switchView('diet');setDietDay('${dn}')">›</button>
    </div>`;
  });
  html += `<div class="macro mt">🎯 Cible du jour : ~${S.settings.kcalTarget} kcal · ${S.settings.proteinTarget} g protéines · ${dayKcal(dn)} kcal planifiés</div></div>`;

  // Bilan du jour : repas cochés (planifiés) + photos
  const j = S.journal[tk] || [];
  const photoK = j.reduce((s,e)=>s+(e.kcal||0),0);
  const photoP = j.reduce((s,e)=>s+(e.protein||0),0);
  let mealsK = 0, mealsP = 0;
  ["dej","collation","diner","souper"].forEach(type=>{
    if(checks["meal-"+type]){ const am=activeMeal(dn,type); mealsK += am.kcal; mealsP += am.prot; }
  });
  const eatenK = mealsK + photoK, eatenP = mealsP + photoP;
  const remK = S.settings.kcalTarget - eatenK;
  const remP = S.settings.proteinTarget - eatenP;
  html += `<h2 class="section-title">📊 Bilan du jour</h2><div class="card">
    <div class="kpi-grid">
      <div class="kpi"><div class="num">${eatenK}</div><div class="lab">kcal mangées</div></div>
      <div class="kpi"><div class="num" style="color:${remK<0?'var(--red)':'var(--green)'}">${remK}</div><div class="lab">kcal restantes</div></div>
      <div class="kpi"><div class="num" style="color:${remP<0?'var(--green)':'var(--accent2)'}">${eatenP}/${S.settings.proteinTarget}</div><div class="lab">g protéines</div></div>
    </div>
    <div class="muted small mt center">Repas cochés : ${mealsK} kcal · Photos : ${photoK} kcal</div>`;
  if(j.length){
    html += `<div class="ings mt"><div class="muted small">📷 Repas photographiés :</div>`;
    j.forEach(e=>{
      html += `<div class="ing"><span>${esc(e.name)} <span class="muted small">(${esc(e.quantity||'')})</span><br><span class="muted small">${e.kcal} kcal · ${e.protein} g prot.</span></span>
        <button class="swp" onclick="delJournal('${e.id}')">🗑️</button></div>`;
    });
    html += `</div>`;
  }
  html += `<div class="row mt" style="gap:8px">
      <button class="btn-accent" style="flex:1" onclick="capturePhoto()">📸 Photo</button>
      <button class="btn-accent" style="flex:1" onclick="describeMeal()">✍️ Décrire</button>
    </div>
    <div class="muted small mt center">Coche tes repas du plan, ou ajoute un repas hors plan par photo ou en texte (estimation IA ±15-20 %).</div>
  </div>`;

  // Eau
  html += `<h2 class="section-title">💧 Hydratation</h2><div class="card">
    <div class="row between"><strong>${(water*0.25).toFixed(2)} L / ${S.settings.waterTargetL} L</strong>
      <div class="row" style="gap:6px">
        <button class="btn-ghost btn-sm" onclick="addWater(-1)">−</button>
        <button class="btn-accent btn-sm" onclick="addWater(1)">+ verre</button>
      </div></div>
    <div class="bar mt"><span style="width:${Math.min(100, water/waterGlasses*100)}%;background:linear-gradient(90deg,var(--blue),#7cc6ff)"></span></div>
    <div class="muted small mt">${water} verre(s) de 250 ml · important sous Ozempic</div>
  </div>`;

  // Pesée + rappels
  html += `<div class="card row between">
    <div><strong>⚖️ Pesée</strong><div class="muted small">1×/sem, à jeun, même jour</div></div>
    <button class="btn-accent btn-sm" onclick="quickWeigh()">Entrer mon poids</button>
  </div>`;
  if(!S.settings.reminders.enabled){
    html += `<div class="card row between">
      <div><strong>🔔 Rappels</strong><div class="muted small">Repas, eau, séance, Ozempic…</div></div>
      <button class="btn-accent btn-sm" onclick="switchView('track')">Activer</button>
    </div>`;
  }

  $("#view-today").innerHTML = html;
}

/* ====================================================================
   VUE — CALENDRIER
   ==================================================================== */
function renderCal(){
  const tn=todayName();
  let html = `<h2 class="section-title">📅 Ta semaine</h2>`;
  DAYS.forEach(dn=>{
    const t=WEEK_TEMPLATE[dn];
    let emoji="🧘", label=t.label||"Repos", color="var(--muted)";
    if(t.kind==="workout"){
      let id=t.id; const def= id==="D"? WORKOUTS[jourDTarget(new Date())] : WORKOUTS[id];
      emoji=id; label=def.title.replace(/^Jour [A-D] — /,""); color=def.color;
    } else if(t.kind==="hockey"){ emoji="🏒"; }
    html += `<div class="cal-day ${dn===tn?'today':''}">
      <div class="dot" style="background:${color}22;color:${color};font-weight:800">${emoji}</div>
      <div class="info">
        <div class="day">${DAY_LABEL[dn]}${dn===tn?' · aujourd’hui':''}</div>
        <div class="what">${t.kind==="workout"?"🏋️ ":""}${esc(label)}</div>
        <div class="what">🍽️ ${esc(activeMeal(dn,'diner').title)} · ${esc(activeMeal(dn,'souper').title)}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px">
        ${t.kind==="workout"?`<button class="btn-ghost btn-sm" onclick="gotoWorkout('${t.id==='D'?jourDTarget(new Date()):t.id}')">Séance</button>`:""}
        <button class="btn-ghost btn-sm" onclick="switchView('diet');setDietDay('${dn}')">Repas</button>
      </div>
    </div>`;
  });
  html += `<div class="card mt"><div class="muted small">Modèle : 4 séances/sem (lun, mar, jeu, ven), hockey samedi, repos+batch dimanche. Le Jour D alterne A/B chaque semaine (cette semaine : ${jourDTarget(new Date())}).</div></div>`;
  $("#view-cal").innerHTML = html;
}

/* ====================================================================
   VUE — ENTRAÎNEMENT
   ==================================================================== */
let trainSel = null;
function renderTrain(){
  if(!trainSel){ const wk=workoutForDay(todayName(),new Date()); trainSel = wk?wk.id:"A"; }
  const def = WORKOUTS[trainSel];
  const tk=todayKey(); const checks=S.checks[tk]=S.checks[tk]||{};
  const isToday = workoutForDay(todayName(),new Date());
  const doneToday = isToday && isToday.id===trainSel && checks["workout"];

  let html = `<h2 class="section-title">🏋️ Choisis ta séance</h2>
    <div class="row wrap" style="gap:8px">`;
  ["A","B","C"].forEach(id=>{
    html += `<button class="${trainSel===id?'btn-accent':'btn-ghost'} btn-sm" onclick="selectTrain('${id}')">Jour ${id}</button>`;
  });
  html += `<button class="${trainSel===jourDTarget(new Date())&&false?'btn-accent':'btn-ghost'} btn-sm" onclick="selectTrain('${jourDTarget(new Date())}')">Jour D → ${jourDTarget(new Date())}</button>`;
  html += `</div>`;

  // Échauffement
  html += `<h2 class="section-title">${WARMUP.title} · ${WARMUP.duration}</h2>
    <div class="muted small" style="margin:0 4px 6px">${esc(WARMUP.note)}</div>`;
  WARMUP.exercises.forEach(e=> html += exoCard(e.key, e.scheme));

  // Séance
  html += `<h2 class="section-title">${esc(def.title)}</h2>
    <div class="card"><div class="row between">
      <div><strong style="color:${def.color}">${def.rounds} tours</strong></div>
      <div class="muted small">Repos : ${esc(def.rest)}</div>
    </div></div>`;
  def.exercises.forEach(e=> html += exoCard(e.key, e.scheme));

  html += `<div class="card center">
    <div class="muted small mb">Conseil : chaque semaine, ajoute 1-2 reps, réduis le repos de 5 sec, OU ajoute un tour.</div>
    <button class="${doneToday?'btn-ghost':'btn-accent'} btn-block" onclick="finishWorkout('${trainSel}')">${doneToday?"✓ Séance d'aujourd'hui terminée":"Marquer la séance comme faite"}</button>
  </div>`;
  $("#view-train").innerHTML = html;
  startAnim();
}
function selectTrain(id){ trainSel=id; renderTrain(); window.scrollTo(0,0); }
function gotoWorkout(id){ trainSel=id; switchView("train"); }
function finishWorkout(id){
  const isToday = workoutForDay(todayName(),new Date());
  if(isToday && isToday.id===id){ toggleCheck("workout"); }
  else { toast("Séance notée 💪 (pas la séance prévue aujourd'hui)"); }
  renderTrain();
}

/* ====================================================================
   VUE — DIÈTE
   ==================================================================== */
let dietDay = null;
let dietTab = "repas"; // repas | epicerie | batch
function setDietDay(dn){ dietDay=dn; dietTab="repas"; renderDiet(); window.scrollTo(0,0); }
function renderDiet(){
  if(!dietDay) dietDay = todayName();
  let html = `<div class="row wrap" style="gap:8px;margin:6px 0">
    <button class="${dietTab==='repas'?'btn-accent':'btn-ghost'} btn-sm" onclick="setDietTab('repas')">🍽️ Repas</button>
    <button class="${dietTab==='epicerie'?'btn-accent':'btn-ghost'} btn-sm" onclick="setDietTab('epicerie')">🛒 Épicerie</button>
    <button class="${dietTab==='batch'?'btn-accent':'btn-ghost'} btn-sm" onclick="setDietTab('batch')">🍳 Batch</button>
    <button class="${dietTab==='recettes'?'btn-accent':'btn-ghost'} btn-sm" onclick="setDietTab('recettes')">📖 Recettes</button>
  </div>`;

  if(dietTab==="repas") html += dietRepas();
  else if(dietTab==="epicerie") html += dietEpicerie();
  else if(dietTab==="recettes") html += dietRecettes();
  else html += dietBatch();

  $("#view-diet").innerHTML = html;
}
function setDietTab(t){ dietTab=t; renderDiet(); window.scrollTo(0,0); }

function dietRepas(){
  let html = `<div class="row wrap" style="gap:6px;margin-bottom:8px">`;
  DAYS.forEach(dn=> html += `<button class="${dietDay===dn?'btn-accent':'btn-ghost'} btn-sm" onclick="setDietDay('${dn}')">${DAY_LABEL[dn].slice(0,3)}</button>`);
  html += `</div><h2 class="section-title">${DAY_LABEL[dietDay]} · ${dayKcal(dietDay)} kcal · ~${dayProt(dietDay)} g prot.</h2>`;
  ["dej","collation","diner","souper"].forEach(type=>{
    const m = activeMeal(dietDay,type);
    const swapped = typeof S.mealOverrides[dietDay+"-"+type] === "number";
    html += `<div class="card meal">
      <div class="head"><h3>${esc(m.label)}</h3>
        <button class="btn-ghost btn-sm" onclick="cycleMeal('${dietDay}','${type}')">🔀 Autre option</button></div>
      <div class="row between" style="align-items:flex-start">
        <strong>${esc(m.title)}${m.shake?' <span class="pill accent">shake</span>':""}</strong>
      </div>
      <div class="ings mt">${m.items.map(i=>`<div class="ing"><span>${esc(i)}</span></div>`).join("")}</div>
      ${m.reheat?`<div class="muted small mt">🔥 <strong>Réchauffer :</strong> ${esc(m.reheat)}</div>`:""}
      <div class="macro mt">≈ ${m.kcal} kcal · ${m.prot} g protéines${swapped?` · <a onclick="resetMeal('${dietDay}','${type}')" style="color:var(--accent);cursor:pointer">repas du plan</a>`:""}</div>
    </div>`;
  });
  html += `<div class="muted small center mt">🔀 « Autre option » bascule vers un autre repas complet (calories à jour). Dîner + souper = bols batch, juste à réchauffer.</div>`;
  return html;
}
function dietEpicerie(){
  let html = `<h2 class="section-title">🛒 Épicerie — batch pour 6</h2>
    <div class="card row between"><div class="muted small">Coche au fur et à mesure (sauvegardé).</div>
    <button class="btn-ghost btn-sm" onclick="resetGrocery()">Tout décocher</button></div>`;
  GROCERY.forEach(sec=>{
    html += `<div class="card gro-sec"><h4>${esc(sec.section)}</h4>`;
    sec.items.forEach(it=>{
      const done = S.grocery[it];
      html += `<label class="gro-item ${done?'done':''}">
        <input type="checkbox" ${done?"checked":""} onchange="toggleGrocery(this,'${esc(it).replace(/'/g,"\\'")}')">
        <span>${esc(it)}</span></label>`;
    });
    html += `</div>`;
  });
  html += `<div class="card"><div class="muted small">À limiter : jus, boissons sucrées, alcool, chips, friture. Garde-les hors de vue. 💪</div></div>`;
  return html;
}
function dietBatch(){
  let html = `<h2 class="section-title">🍳 ${esc(BATCH_PREP.title)}</h2>
    <div class="muted small" style="margin:0 4px 8px">${esc(BATCH_PREP.intro)}</div>
    <div class="card"><div class="ings">`;
  BATCH_PREP.steps.forEach((s,i)=> html += `<div class="ing"><span><strong style="color:var(--accent2)">${i+1}.</strong> ${esc(s)}</span></div>`);
  html += `</div></div>`;
  const rf = BATCH_PREP.refresh;
  html += `<div class="card"><h3>${esc(rf.title)}</h3><div class="ings">`;
  rf.steps.forEach((s,i)=> html += `<div class="ing"><span><strong>${i+1}.</strong> ${esc(s)}</span></div>`);
  html += `</div></div>`;
  html += `<div class="card"><h3>🔥 Chaque jour : réchauffer</h3><div class="muted small mb">Tes bols dîner/souper sont prêts — voici comment les réchauffer cette semaine :</div><div class="ings">`;
  DAYS.forEach(dn=>{
    const di = activeMeal(dn,"diner"), so = activeMeal(dn,"souper");
    html += `<div class="ing" style="flex-direction:column;align-items:stretch;gap:2px">
      <span><strong>${DAY_LABEL[dn]}</strong></span>
      <span class="muted small">🍽️ ${esc(di.title)} — ${esc(di.reheat||"réchauffer 2-3 min")}</span>
      <span class="muted small">🌙 ${esc(so.title)} — ${esc(so.reheat||"réchauffer 2-3 min")}</span>
    </div>`;
  });
  html += `</div></div>`;
  return html;
}
function dietRecettes(){
  let html = `<h2 class="section-title">📖 Recettes détaillées</h2>`;
  RECIPES.forEach(r=>{
    html += `<div class="card" onclick="openRecipe('${r.id}')" style="cursor:pointer">
      <div class="row between"><h3>${r.emoji} ${esc(r.title)}</h3><span class="muted small">${esc(r.time)} ›</span></div>
      <div class="muted small">${esc(r.yield)} · ${r.steps.length} étapes</div>
    </div>`;
  });
  return html;
}
function openRecipe(id){
  const r = RECIPES.find(x=>x.id===id); if(!r) return;
  let html = `<h3>${r.emoji} ${esc(r.title)}</h3>
    <div class="muted small mb">${esc(r.time)} · ${esc(r.yield)}</div>
    <div class="card2" style="background:var(--card2);border-radius:12px;padding:12px;margin-bottom:10px">
      <strong>Ingrédients</strong>
      <div class="ings mt">${r.ingredients.map(i=>`<div class="ing"><span>${esc(i)}</span></div>`).join("")}</div>
    </div>
    <strong>Étapes</strong><div class="ings mt">`;
  r.steps.forEach((s,i)=> html += `<div class="ing"><span><strong style="color:var(--accent2)">${i+1}.</strong> ${esc(s)}</span></div>`);
  html += `</div><button class="btn-ghost btn-block mt" onclick="closeModal()">Fermer</button>`;
  openModal(html);
}

/* ---- Repas : option active + bascule cohérente ---- */
function mealPool(type){ return type==="dej" ? BREAKFASTS : type==="collation" ? SNACKS : BOWLS; }
function mealLabel(type){ return type==="dej" ? "Déjeuner" : type==="collation" ? "Collation" : type==="diner" ? "Dîner" : "Souper"; }
function activeIndex(day,type){
  const ov = S.mealOverrides[day+"-"+type];
  const pool = mealPool(type);
  if(typeof ov === "number" && ov >= 0 && ov < pool.length) return ov;
  return MEAL_PLAN[day][type];   // défaut du plan
}
function activeMeal(day,type){
  const pool = mealPool(type);
  const m = pool[activeIndex(day,type)] || pool[0];
  return Object.assign({ label: mealLabel(type) }, m);
}
function cycleMeal(day,type){
  const pool = mealPool(type);
  const next = (activeIndex(day,type) + 1) % pool.length;
  S.mealOverrides[day+"-"+type] = next;
  save();
  toast("Autre option 🔀");
  renderDiet();
}
function resetMeal(day,type){ delete S.mealOverrides[day+"-"+type]; save(); renderDiet(); toast("Repas du plan rétabli"); }

/* ====================================================================
   VUE — SUIVI (poids + réglages + rappels)
   ==================================================================== */
function renderTrack(){
  const w=currentWeight();
  const lost=(S.settings.startWeight-w);
  const sd = new Date(S.settings.startDate);
  const days = Math.max(1, Math.round((Date.now()-sd.getTime())/86400000));
  const perWeek = (lost/days*7);

  let html = weeklyReview();
  html += `<h2 class="section-title">📊 Suivi du poids</h2>
  <div class="kpi-grid">
    <div class="kpi"><div class="num">${w}</div><div class="lab">Actuel (lb)</div></div>
    <div class="kpi"><div class="num" style="color:var(--green)">${lost>=0?"−":"+"}${Math.abs(lost).toFixed(1)}</div><div class="lab">Perdu depuis ${S.settings.startWeight}</div></div>
    <div class="kpi"><div class="num" style="color:var(--accent2)">${Math.max(0,w-S.settings.goalWeight).toFixed(1)}</div><div class="lab">Reste (cible ${S.settings.goalWeight})</div></div>
  </div>
  <div class="card">
    <div class="row between"><strong>Progression</strong><span class="muted small">${pctToGoal()}% · ~${perWeek>0?perWeek.toFixed(1):"0"} lb/sem</span></div>
    <div class="bar"><span style="width:${pctToGoal()}%"></span></div>
    <div class="chart-wrap mt">${weightChart()}</div>
  </div>

  <div class="card">
    <strong>Ajouter une pesée (aujourd'hui)</strong>
    <div class="weight-input mt">
      <input type="number" id="wInput" inputmode="decimal" step="0.1" placeholder="ex. 203.5" value="">
      <button class="btn-accent" onclick="addWeightFromInput()">Enregistrer</button>
    </div>
  </div>`;

  if(S.weights.length){
    html += `<div class="card"><strong>Historique</strong>`;
    S.weights.slice().reverse().forEach(e=>{
      html += `<div class="wlog"><span>${esc(frFullDate(e.date))}</span>
        <span>${e.lbs} lb <button class="icon-btn" onclick="delWeight('${e.date}')">🗑️</button></span></div>`;
    });
    html += `</div>`;
  }

  // Suivi Ozempic
  html += ozempicSection();

  // Réglages objectifs
  html += `<h2 class="section-title">🎯 Objectifs</h2>
  <div class="card">
    <label class="set-row">Poids de départ (lb)<input type="number" step="0.1" value="${S.settings.startWeight}" onchange="setSetting('startWeight',this.value)"></label>
    <label class="set-row">Objectif (lb)<input type="number" step="0.1" value="${S.settings.goalWeight}" onchange="setSetting('goalWeight',this.value)"></label>
    <label class="set-row">Cible protéines (g)<input type="number" value="${S.settings.proteinTarget}" onchange="setSetting('proteinTarget',this.value)"></label>
    <label class="set-row">Cible eau (L)<input type="number" step="0.25" value="${S.settings.waterTargetL}" onchange="setSetting('waterTargetL',this.value)"></label>
  </div>`;

  // Rappels
  const r=S.settings.reminders;
  html += `<h2 class="section-title">🔔 Rappels</h2>
  <div class="card">
    <label class="set-row">Activer les rappels
      <span class="switch"><input type="checkbox" ${r.enabled?"checked":""} onchange="toggleReminders(this.checked)"><span class="sl"></span></span></label>
    <label class="set-row">Déjeuner<input type="time" value="${r.dej}" onchange="setReminder('dej',this.value)"></label>
    <label class="set-row">Dîner<input type="time" value="${r.diner}" onchange="setReminder('diner',this.value)"></label>
    <label class="set-row">Collation<input type="time" value="${r.collation}" onchange="setReminder('collation',this.value)"></label>
    <label class="set-row">Souper<input type="time" value="${r.souper}" onchange="setReminder('souper',this.value)"></label>
    <label class="set-row">Séance<input type="time" value="${r.workout}" onchange="setReminder('workout',this.value)"></label>
    <label class="set-row">Rappels d'eau (aux 2 h)
      <span class="switch"><input type="checkbox" ${r.water?"checked":""} onchange="setReminder('water',this.checked)"><span class="sl"></span></span></label>
    <label class="set-row">💉 Ozempic — jour
      <select onchange="setReminder('ozempic',this.value)">
        <option value="" ${!r.ozempic?"selected":""}>Désactivé</option>
        ${DAYS.map(d=>`<option value="${d}" ${r.ozempic===d?"selected":""}>${DAY_LABEL[d]}</option>`).join("")}
      </select></label>
    <label class="set-row">💉 Ozempic — heure<input type="time" value="${r.ozempicTime||'09:00'}" onchange="setReminder('ozempicTime',this.value)"></label>
    <label class="set-row">🔔 Notif. garantie Ozempic<br><span class="muted small">sonne même app fermée</span>
      <span class="switch"><input type="checkbox" ${S.settings.pushEnabled?"checked":""} onchange="togglePush(this.checked)"><span class="sl"></span></span></label>
    <button class="btn-ghost btn-block mt" onclick="testNotif()">Tester une notification</button>
    <div class="muted small mt">Les rappels se déclenchent quand l'app a été ouverte dans la journée (Android). Garde l'icône sur ton écran d'accueil.${r.ozempic?` 💉 Ozempic : ${DAY_LABEL[r.ozempic]} à ${r.ozempicTime||'09:00'}.`:""}</div>
  </div>
  <h2 class="section-title">👤 Compte</h2>
  <div class="card">
    <div class="muted small mb">Connecté${authEmail()?` : <strong>${esc(authEmail())}</strong>`:""} · données synchronisées dans le cloud.</div>
    <button class="btn-ghost btn-block" onclick="exportData()">Exporter mes données</button>
    <button class="btn-ghost btn-block mt" onclick="logout()">Se déconnecter</button>
  </div>`;
  $("#view-track").innerHTML = html;
}

/* ---- Bilan hebdomadaire ---- */
function lastNDates(n){ const arr=[]; const d=new Date(); for(let i=n-1;i>=0;i--){ const x=new Date(d); x.setDate(d.getDate()-i); arr.push(dateKey(x)); } return arr; }
function dayEaten(dk){
  const p=dk.split("-").map(Number); const d=new Date(p[0],p[1]-1,p[2]); const dn=dayNameOf(d);
  const checks=S.checks[dk]||{}; const j=S.journal[dk]||[];
  let k=0,pr=0,logged=false;
  ["dej","collation","diner","souper"].forEach(t=>{ if(checks["meal-"+t]){ const am=activeMeal(dn,t); k+=am.kcal; pr+=am.prot; logged=true; } });
  j.forEach(e=>{ k+=e.kcal||0; pr+=e.protein||0; logged=true; });
  return { kcal:k, protein:pr, logged, workout: !!checks.workout };
}
function weeklyReview(){
  const dates=lastNDates(7);
  const data=dates.map(dayEaten);
  const loggedDays=data.filter(x=>x.logged);
  const avgK=loggedDays.length?Math.round(loggedDays.reduce((s,x)=>s+x.kcal,0)/loggedDays.length):0;
  const avgP=loggedDays.length?Math.round(loggedDays.reduce((s,x)=>s+x.protein,0)/loggedDays.length):0;
  const workouts=data.filter(x=>x.workout).length;
  // variation de poids sur ~7 jours
  let wDelta=null;
  if(S.weights.length>=1){
    const cutoff=dates[0]; const recent=currentWeight();
    const old=S.weights.filter(e=>e.date<cutoff).slice(-1)[0] || S.weights[0];
    if(old) wDelta=recent-old.lbs;
  }
  const kColor=avgK<=S.settings.kcalTarget?"var(--green)":"var(--accent2)";
  const pColor=avgP>=S.settings.proteinTarget?"var(--green)":"var(--accent2)";
  return `<h2 class="section-title">📈 Bilan de la semaine</h2>
  <div class="kpi-grid">
    <div class="kpi"><div class="num" style="color:${kColor}">${avgK}</div><div class="lab">kcal/jour (cible ${S.settings.kcalTarget})</div></div>
    <div class="kpi"><div class="num" style="color:${pColor}">${avgP}</div><div class="lab">g prot./jour (cible ${S.settings.proteinTarget})</div></div>
    <div class="kpi"><div class="num">${workouts}</div><div class="lab">séances (7 j)</div></div>
  </div>
  <div class="card">
    <div class="row between"><strong>Calories — 7 derniers jours</strong>
      ${wDelta!==null?`<span class="pill ${wDelta<=0?'green':'accent'}">${wDelta<=0?"−":"+"}${Math.abs(wDelta).toFixed(1)} lb</span>`:""}</div>
    <div class="chart-wrap mt">${weeklyKcalChart(dates,data)}</div>
    <div class="muted small mt center">${loggedDays.length}/7 jours suivis · ligne = ta cible (${S.settings.kcalTarget})</div>
  </div>`;
}
function weeklyKcalChart(dates,data){
  const W=600,H=150,P=22,bw=(W-2*P)/7*0.62;
  const target=S.settings.kcalTarget;
  const mx=Math.max(target*1.2, Math.max.apply(null,data.map(d=>d.kcal).concat([1])))*1.05;
  const y=v=>P+(1-v/mx)*(H-2*P);
  const x=i=>P+(i+0.5)*((W-2*P)/7);
  let bars="";
  data.forEach((d,i)=>{
    const h=Math.max(0,(H-2*P)-(y(d.kcal)-P));
    const col=d.kcal===0?"var(--line)":(d.kcal<=target?"var(--green)":"var(--accent2)");
    bars+=`<rect x="${(x(i)-bw/2).toFixed(1)}" y="${y(d.kcal).toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="3" fill="${col}"/>`;
    const lbl=["D","L","M","M","J","V","S"][new Date(dates[i].split("-").map(Number)[0],dates[i].split("-").map(Number)[1]-1,dates[i].split("-").map(Number)[2]).getDay()];
    bars+=`<text x="${x(i).toFixed(1)}" y="${H-6}" fill="var(--muted)" font-size="11" text-anchor="middle">${lbl}</text>`;
  });
  const ty=y(target).toFixed(1);
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
    <line x1="${P}" y1="${ty}" x2="${W-P}" y2="${ty}" stroke="var(--accent)" stroke-dasharray="5 5" stroke-width="1.5"/>
    ${bars}</svg>`;
}

/* ---- Suivi Ozempic ---- */
function ozempicSection(){
  const log=S.ozempic.slice().sort((a,b)=>a.date<b.date?1:-1);
  const last=log[0];
  let next="";
  if(last){ const p=last.date.split("-").map(Number); const d=new Date(p[0],p[1]-1,p[2]); d.setDate(d.getDate()+7); next=frFullDate(dateKey(d)); }
  let html=`<h2 class="section-title">💉 Suivi Ozempic</h2><div class="card">
    <div class="row between">
      <div>${last?`<strong>Dose actuelle : ${esc(last.dose)}</strong><div class="muted small">Dernière : ${esc(frFullDate(last.date))}${next?` · prochaine ≈ ${esc(next)}`:""}</div>`:`<strong>Aucune injection enregistrée</strong>`}</div>
      <button class="btn-accent btn-sm" onclick="logOzempic()">+ Injection</button>
    </div>`;
  if(log.length){
    html+=`<div class="ings mt">`;
    log.slice(0,8).forEach(e=>{
      html+=`<div class="ing"><span>${esc(frFullDate(e.date))} · <strong>${esc(e.dose)}</strong>${e.note?`<br><span class="muted small">${esc(e.note)}</span>`:""}</span>
        <button class="swp" onclick="delOzempic('${e.id}')">🗑️</button></div>`;
    });
    html+=`</div>`;
  }
  html+=`</div>`;
  return html;
}
function logOzempic(){
  const opts=OZEMPIC_DOSES.map(d=>`<option value="${d}">${d}</option>`).join("");
  openModal(`<h3>💉 Enregistrer une injection</h3>
    <label class="set-row">Date<input type="date" id="ozDate" value="${todayKey()}"></label>
    <label class="set-row">Dose<select id="ozDose">${opts}</select></label>
    <div class="mt"><div class="muted small mb">Comment tu te sens (optionnel)</div>
      <textarea id="ozNote" rows="2" style="width:100%;font-size:16px;padding:10px;border-radius:12px;border:1px solid var(--line);background:var(--bg2);color:var(--txt)" placeholder="ex. nausée légère, appétit coupé…"></textarea></div>
    <button class="btn-accent btn-block mt" onclick="saveOzempic()">Enregistrer</button>
    <button class="btn-ghost btn-block mt" onclick="closeModal()">Annuler</button>`);
}
function saveOzempic(){
  const date=$("#ozDate").value||todayKey();
  const dose=$("#ozDose").value;
  const note=($("#ozNote").value||"").trim();
  S.ozempic.push({ id:"oz"+Date.now(), date, dose, note });
  save(); closeModal(); toast("Injection enregistrée 💉"); renderTrack();
}
function delOzempic(id){ S.ozempic=S.ozempic.filter(e=>e.id!==id); save(); renderTrack(); }

/* ---- Graphique poids (SVG) ---- */
function weightChart(){
  const pts = [{date:S.settings.startDate, lbs:S.settings.startWeight}]
    .concat(S.weights.filter(e=>e.date!==S.settings.startDate));
  const uniq={}; pts.forEach(p=>uniq[p.date]=p.lbs);
  const arr=Object.keys(uniq).sort().map(d=>({date:d,lbs:uniq[d]}));
  if(arr.length<1) return `<div class="muted small center">Ajoute des pesées pour voir la courbe.</div>`;
  const W=600,H=170,P=24;
  const goal=S.settings.goalWeight;
  const vals=arr.map(a=>a.lbs).concat([goal]);
  let mn=Math.min.apply(null,vals)-1, mx=Math.max.apply(null,vals)+1;
  if(mx-mn<2){mx+=1;mn-=1;}
  const x=i=> P + (arr.length===1?0:i/(arr.length-1))*(W-2*P);
  const y=v=> P + (1-(v-mn)/(mx-mn))*(H-2*P);
  let line=""; arr.forEach((a,i)=> line += (i?"L":"M")+x(i).toFixed(1)+" "+y(a.lbs).toFixed(1)+" ");
  let dots=arr.map((a,i)=>`<circle cx="${x(i).toFixed(1)}" cy="${y(a.lbs).toFixed(1)}" r="3.2" fill="var(--accent)"/>`).join("");
  const gy=y(goal).toFixed(1);
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
    <line x1="${P}" y1="${gy}" x2="${W-P}" y2="${gy}" stroke="var(--green)" stroke-dasharray="5 5" stroke-width="1.5"/>
    <text x="${W-P}" y="${(+gy-5)}" fill="var(--green)" font-size="11" text-anchor="end">objectif ${goal}</text>
    <path d="${line}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    ${dots}
  </svg>`;
}

/* ====================================================================
   ACTIONS
   ==================================================================== */
function currentWeight(){ return S.weights.length ? S.weights[S.weights.length-1].lbs : S.settings.startWeight; }
function pctToGoal(){
  const tot=S.settings.startWeight-S.settings.goalWeight;
  if(tot<=0) return 100;
  const done=S.settings.startWeight-currentWeight();
  return Math.max(0,Math.min(100,Math.round(done/tot*100)));
}
function toggleCheck(id){
  const tk=todayKey(); const c=S.checks[tk]=S.checks[tk]||{};
  c[id]=!c[id]; save();
  if(currentView==="today") renderToday();
  if(id==="workout" && c[id]) toast("Séance validée 💪");
}
function addWater(n){
  const tk=todayKey(); const c=S.checks[tk]=S.checks[tk]||{};
  c.water=Math.max(0,(c.water||0)+n); save(); renderToday();
}
function quickWeigh(){
  openModal(`<h3>⚖️ Ton poids aujourd'hui</h3>
    <div class="weight-input mt"><input type="number" id="qw" inputmode="decimal" step="0.1" placeholder="lb" autofocus>
    <button class="btn-accent" onclick="(function(){var v=parseFloat(document.getElementById('qw').value);if(v){logWeight(v);closeModal();}})()">OK</button></div>
    <button class="btn-ghost btn-block mt" onclick="closeModal()">Annuler</button>`);
  setTimeout(()=>{ const i=$("#qw"); if(i) i.focus(); },100);
}
function addWeightFromInput(){
  const v=parseFloat($("#wInput").value); if(!v){ toast("Entre un poids valide"); return; }
  logWeight(v);
}
function logWeight(lbs){
  const tk=todayKey();
  S.weights=S.weights.filter(e=>e.date!==tk);
  S.weights.push({date:tk,lbs:Math.round(lbs*10)/10});
  S.weights.sort((a,b)=>a.date<b.date?-1:1);
  save(); toast("Poids enregistré ✓"); render();
}
function delWeight(date){ S.weights=S.weights.filter(e=>e.date!==date); save(); renderTrack(); }
function setSetting(k,v){ S.settings[k]=parseFloat(v)||v; save(); render(); }
function toggleGrocery(elm,item){ if(elm.checked) S.grocery[item]=true; else delete S.grocery[item]; save();
  elm.closest(".gro-item").classList.toggle("done",elm.checked); }
function resetGrocery(){ S.grocery={}; save(); renderDiet(); toast("Liste réinitialisée"); }
function exportData(){
  const blob=new Blob([JSON.stringify(S,null,2)],{type:"application/json"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob);
  a.download="enforme-donnees.json"; a.click(); toast("Données exportées");
}

/* ---- Journal photo (analyse IA) ---- */
let _journalSeq = 0;
function capturePhoto(){
  const inp = document.createElement("input");
  inp.type = "file"; inp.accept = "image/*"; inp.capture = "environment";
  inp.onchange = () => { if(inp.files && inp.files[0]) handlePhoto(inp.files[0]); };
  inp.click();
}
function handlePhoto(file){
  const reader = new FileReader();
  reader.onload = () => downscale(reader.result, 1024, (dataUrl)=>{
    const m = /^data:(image\/[a-z]+);base64,(.*)$/.exec(dataUrl);
    if(!m){ toast("Image illisible"); return; }
    analyzeMeal(m[2], m[1]);
  });
  reader.readAsDataURL(file);
}
function downscale(dataUrl, maxEdge, cb){
  const img = new Image();
  img.onload = () => {
    let { width:w, height:h } = img;
    const scale = Math.min(1, maxEdge/Math.max(w,h));
    w = Math.round(w*scale); h = Math.round(h*scale);
    const cv = document.createElement("canvas"); cv.width=w; cv.height=h;
    cv.getContext("2d").drawImage(img,0,0,w,h);
    cb(cv.toDataURL("image/jpeg", 0.82));
  };
  img.onerror = () => toast("Impossible de lire l'image");
  img.src = dataUrl;
}
function sendAnalyze(payload){
  openModal(`<h3>🤖 Analyse en cours…</h3>
    <div class="center mt mb"><div class="muted">L'IA estime les calories et protéines…</div></div>
    <div class="bar"><span style="width:100%;animation:fade 1s infinite alternate"></span></div>`);
  fetch("/api/analyze", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify(payload)
  }).then(r => r.json().then(d => ({ok:r.ok, d})))
    .then(({ok,d}) => {
      if(!ok || d.error){ showAnalyzeError(d.error || "Erreur inconnue"); return; }
      showEstimate(d);
    })
    .catch(() => showAnalyzeError("Pas de connexion au serveur d'analyse. (Disponible une fois l'app déployée avec la clé API.)"));
}
function analyzeMeal(base64, mediaType){ sendAnalyze({ image: base64, mediaType }); }
function describeMeal(){
  openModal(`<h3>✍️ Décris ton repas</h3>
    <div class="muted small mb">Ex. « 2 rôties avec beurre d'arachide et une banane », ou « bol de poulet, riz, brocoli ».</div>
    <textarea id="mealDesc" rows="3" style="width:100%;font-size:16px;padding:11px;border-radius:12px;border:1px solid var(--line);background:var(--bg2);color:var(--txt)" placeholder="Ce que tu viens de manger…"></textarea>
    <button class="btn-accent btn-block mt" onclick="submitDescription()">Estimer</button>
    <button class="btn-ghost btn-block mt" onclick="closeModal()">Annuler</button>`);
  setTimeout(()=>{ const t=$("#mealDesc"); if(t) t.focus(); }, 100);
}
function submitDescription(){
  const t = $("#mealDesc"); const v = t ? t.value.trim() : "";
  if(!v){ toast("Écris ce que tu as mangé"); return; }
  sendAnalyze({ text: v });
}
function showAnalyzeError(msg){
  openModal(`<h3>😕 Analyse impossible</h3><div class="muted mt mb">${esc(msg)}</div>
    <button class="btn-ghost btn-block" onclick="closeModal()">Fermer</button>`);
}
let _estimate = [];
function showEstimate(data){
  _estimate = (data.items||[]).map((it,i)=>({ id:"e"+(i), name:it.name, quantity:it.quantity||"", kcal:+it.kcal||0, protein:+it.protein||0 }));
  if(!_estimate.length){
    openModal(`<h3>🍽️ Rien à enregistrer</h3><div class="muted mt mb">${esc(data.note||"Aucun aliment identifié sur la photo.")}</div>
      <button class="btn-ghost btn-block" onclick="closeModal()">Fermer</button>`);
    return;
  }
  renderEstimate(data);
}
function renderEstimate(data){
  let rows = _estimate.map(e=>`
    <div class="ing" style="flex-direction:column;align-items:stretch;gap:6px">
      <div class="row between"><strong>${esc(e.name)}</strong>
        <button class="swp" onclick="rmEstimate('${e.id}')">✕</button></div>
      <div class="muted small">${esc(e.quantity)}</div>
      <div class="row" style="gap:8px">
        <label class="small" style="flex:1">kcal<input type="number" value="${e.kcal}" oninput="editEstimate('${e.id}','kcal',this.value)" style="width:100%"></label>
        <label class="small" style="flex:1">protéines (g)<input type="number" value="${e.protein}" oninput="editEstimate('${e.id}','protein',this.value)" style="width:100%"></label>
      </div>
    </div>`).join("");
  const tot = estTotals();
  openModal(`<h3>✏️ Vérifie et ajuste</h3>
    ${data && data.confidence?`<div class="muted small mb">Confiance IA : ${esc(data.confidence)}${data.note?` · ${esc(data.note)}`:""}</div>`:""}
    <div class="ings">${rows}</div>
    <div class="card mt center"><strong id="estTot">${tot.kcal} kcal · ${tot.protein} g protéines</strong></div>
    <button class="btn-accent btn-block mt" onclick="saveJournal()">Enregistrer dans le journal</button>
    <button class="btn-ghost btn-block mt" onclick="closeModal()">Annuler</button>`);
}
function estTotals(){ return { kcal:_estimate.reduce((s,e)=>s+(+e.kcal||0),0), protein:_estimate.reduce((s,e)=>s+(+e.protein||0),0) }; }
function editEstimate(id,field,val){ const e=_estimate.find(x=>x.id===id); if(e){ e[field]=parseInt(val||0,10)||0; const t=estTotals(); const el2=$("#estTot"); if(el2) el2.textContent=`${t.kcal} kcal · ${t.protein} g protéines`; } }
function rmEstimate(id){ _estimate=_estimate.filter(x=>x.id!==id); if(!_estimate.length){ closeModal(); return; } renderEstimate(null); }
function saveJournal(){
  const tk=todayKey(); const arr=S.journal[tk]=S.journal[tk]||[];
  _estimate.forEach(e=> arr.push({ id:"j"+Date.now()+"_"+(_journalSeq++), name:e.name, quantity:e.quantity, kcal:+e.kcal||0, protein:+e.protein||0 }));
  save(); closeModal(); toast("Ajouté au journal ✓"); if(currentView==="today") renderToday();
}
function delJournal(id){ const tk=todayKey(); S.journal[tk]=(S.journal[tk]||[]).filter(e=>e.id!==id); save(); renderToday(); }

/* ---- Rappels / notifications ---- */
let reminderTimers=[];
function toggleReminders(on){
  if(on){
    if(!("Notification" in window)){ toast("Notifications non supportées ici"); render(); return; }
    Notification.requestPermission().then(p=>{
      S.settings.reminders.enabled = (p==="granted");
      save();
      if(p!=="granted") toast("Permission refusée");
      else { toast("Rappels activés 🔔"); scheduleReminders(); }
      renderTrack();
    });
  } else { S.settings.reminders.enabled=false; save(); clearReminders(); renderTrack(); }
}
function setReminder(k,v){ S.settings.reminders[k]=v; save(); if(S.settings.reminders.enabled) scheduleReminders(); syncPush(); }
function clearReminders(){ reminderTimers.forEach(t=>clearTimeout(t)); reminderTimers=[]; }
function showNotif(title,body){
  const opts={ body, icon:"icon.svg", badge:"icon.svg", tag:"enforme", renotify:true };
  if(navigator.serviceWorker && navigator.serviceWorker.ready){
    navigator.serviceWorker.ready.then(reg=>reg.showNotification(title,opts)).catch(()=>{ try{new Notification(title,opts);}catch(e){} });
  } else { try{ new Notification(title,opts); }catch(e){} }
}
function testNotif(){
  if(!("Notification" in window)){ toast("Non supporté"); return; }
  if(Notification.permission!=="granted"){ Notification.requestPermission().then(()=>showNotif("EnForme 🔥","Test de notification — ça marche !")); }
  else showNotif("EnForme 🔥","Test de notification — ça marche !");
}
function scheduleReminders(){
  clearReminders();
  const r=S.settings.reminders; if(!r.enabled) return;
  const now=new Date();
  const at=(hhmm,title,body)=>{
    if(!hhmm) return;
    const [h,m]=hhmm.split(":").map(Number);
    const t=new Date(); t.setHours(h,m,0,0);
    const ms=t.getTime()-now.getTime();
    if(ms>0 && ms<24*3600*1000) reminderTimers.push(setTimeout(()=>showNotif(title,body), ms));
  };
  at(r.dej,"🍽️ Déjeuner","Protéine + ton shake si l'appétit manque.");
  at(r.collation,"🥤 Collation","Pense à ta collation protéinée.");
  at(r.diner,"🍽️ Dîner","Bol protéine + légumes. Garde tes protéines hautes.");
  at(r.souper,"🍽️ Souper","Dernier repas — protéine + légumes.");
  const wk=workoutForDay(todayName(),new Date());
  if(wk) at(r.workout,"🏋️ Séance "+wk.id,"30 min, on bouge ! "+WORKOUTS[wk.id].title);
  if(r.water){
    for(let h=9; h<=21; h+=2) at(pad(h)+":00","💧 Hydratation","Bois un verre d'eau (objectif "+S.settings.waterTargetL+" L).");
  }
  if(todayName()===r.weighIn) at("08:00","⚖️ Pesée","Pèse-toi à jeun et note-le dans l'app.");
  if(r.ozempic && todayName()===r.ozempic) at(r.ozempicTime||"09:00","💉 Ozempic","C'est le jour de ton injection 💉");
}

/* ---- Divers ---- */
function streak(){
  let n=0; const d=new Date();
  for(let i=0;i<400;i++){
    const k=dateKey(d); const c=S.checks[k];
    const active = c && (c.water>0 || Object.keys(c).some(x=>x!=="water" && c[x]));
    if(active) n++; else if(i>0) break; // aujourd'hui peut être vide sans casser
    d.setDate(d.getDate()-1);
  }
  return n;
}
let _seed=1;
function seededRand(){ _seed=(_seed*9301+49297)%233280; return _seed/233280; }
function capitalize(s){ return s.charAt(0).toUpperCase()+s.slice(1); }
const MOIS=["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
function moisFr(m){ return MOIS[m]; }
function frFullDate(k){ const [y,m,d]=k.split("-").map(Number); return d+" "+MOIS[m-1]; }
function dayKcal(dn){ return ["dej","collation","diner","souper"].reduce((s,t)=>s+activeMeal(dn,t).kcal,0); }
function dayProt(dn){ return ["dej","collation","diner","souper"].reduce((s,t)=>s+activeMeal(dn,t).prot,0); }

/* ---- Animation des photos d'exercices ---- */
let animOn=false;
function startAnim(){
  if(animOn) return; animOn=true;
  let flip=false;
  setInterval(()=>{
    flip=!flip;
    $all(".frame[data-anim]").forEach(f=>{
      const imgs=f.querySelectorAll("img");
      if(imgs.length<2) return;
      imgs[1].style.opacity = flip ? "1" : "0";
    });
  }, 850);
}

/* ---- Render dispatcher ---- */
function render(){
  $("#headerSub").textContent = `${currentWeight()} → ${S.settings.goalWeight} lb`;
  if(currentView==="today") renderToday();
  else if(currentView==="cal") renderCal();
  else if(currentView==="train") renderTrain();
  else if(currentView==="diet") renderDiet();
  else if(currentView==="track") renderTrack();
}

/* ---- Notifications push (sonnent même app fermée) ---- */
const VAPID_PUBLIC = "BKINw1ltiFH2akUeaneCzPzMGrMJXUPkGp9hFvqO7xsts3AYhj4ixra-hSGhmBMhzGdVnWTiRG0KAcDdHckMRMA";
function urlB64ToUint8(b64){
  const pad = "=".repeat((4 - b64.length % 4) % 4);
  const base = (b64 + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base); const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}
function pushEvents(){
  const r = S.settings.reminders;
  const all = DAYS.slice();
  const workoutDays = DAYS.filter(d => WEEK_TEMPLATE[d] && WEEK_TEMPLATE[d].kind === "workout");
  const ev = [];
  const add = (id, time, days, title, body) => { if (time && days && days.length) ev.push({ id, time, days, title, body }); };
  add("dej", r.dej, all, "🍽️ Déjeuner", "Protéine + ton shake si l'appétit manque.");
  add("collation", r.collation, all, "🥤 Collation", "Pense à ta collation protéinée.");
  add("diner", r.diner, all, "🍽️ Dîner", "Bol protéine + légumes — garde tes protéines hautes.");
  add("souper", r.souper, all, "🍽️ Souper", "Dernier repas — protéine + légumes.");
  add("workout", r.workout, workoutDays, "🏋️ Séance", "30 min, on bouge ! 💪");
  if (r.water) ["09:00","11:00","13:00","15:00","17:00","19:00","21:00"].forEach((t,i)=> add("water"+i, t, all, "💧 Hydratation", "Bois un verre d'eau."));
  if (r.weighIn) add("pesee", "08:00", [r.weighIn], "⚖️ Pesée", "Pèse-toi à jeun et note-le dans l'app.");
  if (r.ozempic) add("ozempic", r.ozempicTime || "09:00", [r.ozempic], "💉 Ozempic", "C'est le jour de ton injection.");
  return ev;
}
function pushPayload(){
  let tz = "America/Toronto";
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || tz; } catch(e){}
  return { tz, events: pushEvents() };
}
async function postSub(body){
  try {
    const res = await fetch("/api/save-sub", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(body) });
    const j = await res.json().catch(()=>({}));
    if(!res.ok || j.error){ toast(j.error || "Serveur push indisponible"); return false; }
    return true;
  } catch(e){ toast("Pas de connexion au serveur push (déployé ?)"); return false; }
}
async function enablePush(){
  if(!("serviceWorker" in navigator) || !("PushManager" in window)){ toast("Push non supporté sur cet appareil"); return false; }
  const perm = await Notification.requestPermission();
  if(perm !== "granted"){ toast("Permission de notification refusée"); return false; }
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if(!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly:true, applicationServerKey: urlB64ToUint8(VAPID_PUBLIC) });
  const ok = await postSub(Object.assign({ subscription: sub }, pushPayload()));
  if(ok){ S.settings.pushEnabled = true; save(); toast("Notifications garanties activées 🔔"); }
  return ok;
}
async function disablePush(){
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if(sub){ await postSub({ action:"remove", endpoint: sub.endpoint }); await sub.unsubscribe(); }
  } catch(e){}
  S.settings.pushEnabled = false; save(); toast("Notifications garanties désactivées");
}
function togglePush(on){ (on ? enablePush() : disablePush()).then(()=>{ if(currentView==="track") renderTrack(); }); }
async function syncPush(){
  if(!S.settings.pushEnabled) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if(sub) await postSub(Object.assign({ subscription: sub }, pushPayload()));
  } catch(e){}
}

/* ---- Authentification + synchro cloud ---- */
function authHeaders(){ return authToken ? { "Authorization": "Bearer " + authToken } : {}; }
function authEmail(){
  try {
    let b = (authToken||"").split(".")[0]; if(!b) return "";
    b = b.replace(/-/g,"+").replace(/_/g,"/"); b += "=".repeat((4 - b.length % 4) % 4);
    return (JSON.parse(decodeURIComponent(escape(atob(b)))).email) || "";
  } catch(e){ return ""; }
}
async function apiAuth(action, email, password){
  const r = await fetch("/api/auth", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ action, email, password }) });
  const j = await r.json().catch(()=>({ error:"Réponse invalide du serveur" }));
  if(!r.ok || j.error) throw new Error(j.error || "Erreur de connexion");
  return j;
}
function pushRemoteState(){
  if(!authToken) return Promise.resolve();
  return fetch("/api/state", { method:"POST", headers: Object.assign({"Content-Type":"application/json"}, authHeaders()), body: JSON.stringify({ data: S }) }).catch(()=>{});
}
function scheduleSync(){
  if(!authToken) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(pushRemoteState, 1500);
}
function hasRealData(d){
  return !!(d && ((d.weights && d.weights.length) || (d.journal && Object.keys(d.journal).length)
    || (d.ozempic && d.ozempic.length) || (d.checks && Object.keys(d.checks).length)));
}
async function loadRemoteState(){
  const r = await fetch("/api/state", { headers: authHeaders() });
  if(r.status === 401){ const e = new Error("unauth"); e.unauth = true; throw e; }
  const j = await r.json().catch(()=>({}));
  if(j && hasRealData(j.data)){
    localStorage.setItem(KEY, JSON.stringify(j.data));   // le cloud a de vraies données → il fait foi
    S = loadState();
  } else {
    await pushRemoteState();                             // cloud vide → on téléverse les données de cet appareil
  }
}
let booted = false;
function bootApp(){
  if(booted) return; booted = true;
  hideLogin();
  render(); startAnim();
  if(S.settings.reminders.enabled) scheduleReminders();
  document.addEventListener("visibilitychange",()=>{ if(!document.hidden && S.settings.reminders.enabled) scheduleReminders(); });
  if(S.settings.pushEnabled) syncPush();
}
function logout(){ localStorage.removeItem(TOKEN_KEY); authToken = null; location.reload(); }

let authMode = "login";
function showLogin(){
  document.body.classList.add("logged-out");
  let el = document.getElementById("auth-screen");
  if(!el){ el = document.createElement("div"); el.id = "auth-screen"; document.body.appendChild(el); }
  const signup = authMode === "signup";
  el.innerHTML = `<div class="auth-card">
    <div class="auth-logo">🔥 EnForme</div>
    <h2>${signup ? "Créer mon compte" : "Connexion"}</h2>
    <input id="authEmail" type="email" inputmode="email" autocomplete="email" placeholder="Courriel">
    <input id="authPw" type="password" autocomplete="${signup?'new-password':'current-password'}" placeholder="Mot de passe">
    <div id="authErr" class="auth-err"></div>
    <button id="authBtn" class="btn-accent btn-block" onclick="doAuth()">${signup ? "Créer mon compte" : "Se connecter"}</button>
    <div class="auth-toggle muted small mt">${signup ? "Déjà un compte ?" : "Pas encore de compte ?"}
      <a onclick="toggleAuthMode()">${signup ? "Se connecter" : "Créer un compte"}</a></div>
  </div>`;
  el.style.display = "flex";
  setTimeout(()=>{ const i = document.getElementById("authEmail"); if(i) i.focus(); }, 80);
}
function hideLogin(){ const el = document.getElementById("auth-screen"); if(el) el.style.display = "none"; document.body.classList.remove("logged-out"); }
function toggleAuthMode(){ authMode = authMode === "signup" ? "login" : "signup"; showLogin(); }
async function doAuth(){
  const email = (document.getElementById("authEmail").value||"").trim();
  const pw = document.getElementById("authPw").value||"";
  const errEl = document.getElementById("authErr");
  const btn = document.getElementById("authBtn");
  if(!email || !pw){ errEl.textContent = "Remplis les deux champs."; return; }
  btn.disabled = true; errEl.textContent = "";
  try {
    const res = await apiAuth(authMode, email, pw);
    authToken = res.token; localStorage.setItem(TOKEN_KEY, res.token);
    await loadRemoteState();
    bootApp();
  } catch(e){ errEl.textContent = e.message || "Erreur"; btn.disabled = false; }
}
function initAuth(){
  authToken = localStorage.getItem(TOKEN_KEY);
  if(!authToken){ showLogin(); return; }
  loadRemoteState().then(bootApp).catch(err=>{
    if(err && err.unauth){ localStorage.removeItem(TOKEN_KEY); authToken = null; showLogin(); }
    else { bootApp(); } // hors-ligne : on démarre avec le cache local
  });
}

/* ---- Init ---- */
initAuth();
if("serviceWorker" in navigator){
  window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
}
