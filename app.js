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
  return s;
}
let S = loadState();
function save(){ localStorage.setItem(KEY, JSON.stringify(S)); }

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
    const m=plan[type]; const id="meal-"+type; const done=checks[id];
    html += `<div class="check ${done?'done':''}">
      <input type="checkbox" ${done?"checked":""} onchange="toggleCheck('${id}')">
      <div class="body">
        <div class="t">${esc(m.title)}${m.shake?' <span class="pill accent">+ shake</span>':""}</div>
        <div class="d">${m.items.map(i=>esc(effLabel(dn,type,i,m.items.indexOf(i)))).join(" · ")}</div>
      </div>
      <button class="icon-btn" onclick="switchView('diet');setDietDay('${dn}')">›</button>
    </div>`;
  });
  html += `<div class="macro mt">🎯 Cible du jour : ~${S.settings.kcalTarget} kcal · ${S.settings.proteinTarget} g protéines · ${dayKcal(dn)} kcal planifiés</div></div>`;

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
    const plan=MEAL_PLAN[dn];
    html += `<div class="cal-day ${dn===tn?'today':''}">
      <div class="dot" style="background:${color}22;color:${color};font-weight:800">${emoji}</div>
      <div class="info">
        <div class="day">${DAY_LABEL[dn]}${dn===tn?' · aujourd’hui':''}</div>
        <div class="what">${t.kind==="workout"?"🏋️ ":""}${esc(label)}</div>
        <div class="what">🍽️ ${esc(plan.dej.items[0].l)} · ${esc(effLabel(dn,'souper',plan.souper.items[0],0))}…</div>
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
  </div>`;

  if(dietTab==="repas") html += dietRepas();
  else if(dietTab==="epicerie") html += dietEpicerie();
  else html += dietBatch();

  $("#view-diet").innerHTML = html;
}
function setDietTab(t){ dietTab=t; renderDiet(); window.scrollTo(0,0); }

function dietRepas(){
  let html = `<div class="row wrap" style="gap:6px;margin-bottom:8px">`;
  DAYS.forEach(dn=> html += `<button class="${dietDay===dn?'btn-accent':'btn-ghost'} btn-sm" onclick="setDietDay('${dn}')">${DAY_LABEL[dn].slice(0,3)}</button>`);
  html += `</div><h2 class="section-title">${DAY_LABEL[dietDay]} · ${dayKcal(dietDay)} kcal · ~${dayProt(dietDay)} g prot.</h2>`;
  const plan = MEAL_PLAN[dietDay];
  ["dej","collation","diner","souper"].forEach(type=>{
    const m=plan[type];
    html += `<div class="card meal">
      <div class="head"><h3>${esc(m.title)}${m.shake?' <span class="pill accent">shake</span>':""}</h3>
        <button class="btn-ghost btn-sm" onclick="shuffleMeal('${dietDay}','${type}')">🔀 Mélanger</button></div>
      ${m.note?`<div class="muted small">${esc(m.note)}</div>`:""}
      <div class="ings">`;
    m.items.forEach((it,idx)=>{
      const label = effLabel(dietDay,type,it,idx);
      html += `<div class="ing">
        <span>${esc(label)}</span>
        ${it.g?`<button class="swp" title="Remplacer / enlever" onclick="openSwap('${dietDay}','${type}',${idx},'${it.g}')">🔀</button>`:""}
      </div>`;
    });
    html += `</div><div class="macro">≈ ${m.kcal} kcal · ${m.prot} g protéines</div></div>`;
  });
  html += `<div class="muted small center mt">🔀 = remplacer un aliment que tu ne veux pas (même groupe nutritionnel).</div>`;
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
  let html = `<h2 class="section-title">🍳 Plan batch cooking</h2>`;
  ["dimanche","mercredi"].forEach(k=>{
    const b=BATCH_GUIDE[k];
    html += `<div class="card"><h3>${esc(b.title)}</h3><div class="ings">`;
    b.steps.forEach((s,i)=> html += `<div class="ing"><span><strong>${i+1}.</strong> ${esc(s)}</span></div>`);
    html += `</div></div>`;
  });
  html += `<div class="card"><h3>Repas express (&lt; 10 min)</h3><div class="muted small">
    <p><strong>Bols</strong> : protéine batch + riz/quinoa + légumes + sauce. Chacun monte le sien.</p>
    <p><strong>Tacos/wraps</strong> : bœuf batch réchauffé, tortillas, garnitures sur la table.</p>
    <p><strong>Sautés</strong> : protéine batch + sac de légumes surgelés, 8 min à la poêle.</p>
  </div></div>`;
  return html;
}

/* ---- Repas : labels effectifs + shuffle ---- */
function effLabel(day,type,item,idx){
  const ov = S.mealOverrides[day+"-"+type];
  if(ov && ov[idx]!=null) return ov[idx];
  return item.l;
}
function setOverride(day,type,idx,label){
  const k=day+"-"+type; S.mealOverrides[k]=S.mealOverrides[k]||{};
  if(label==null) delete S.mealOverrides[k][idx]; else S.mealOverrides[k][idx]=label;
  save();
}
function shuffleMeal(day,type){
  const m=MEAL_PLAN[day][type];
  m.items.forEach((it,idx)=>{
    if(!it.g) return;
    const opts=SWAP_GROUPS[it.g].filter(o=>o!==effLabel(day,type,it,idx));
    const pick=opts[Math.floor(Math.random()*opts.length)];
    setOverride(day,type,idx,pick);
  });
  toast("Repas mélangé 🔀");
  renderDiet();
}
function openSwap(day,type,idx,group){
  const cur=effLabel(day,type,MEAL_PLAN[day][type].items[idx],idx);
  const orig=MEAL_PLAN[day][type].items[idx].l;
  let html=`<h3>Remplacer l'aliment</h3><div class="muted small mb">Actuel : <strong>${esc(cur)}</strong></div>`;
  SWAP_GROUPS[group].forEach(o=>{
    if(o===cur) return;
    html+=`<div class="swap-opt" onclick="applySwap('${day}','${type}',${idx},'${esc(o).replace(/'/g,"\\'")}')">${esc(o)}</div>`;
  });
  html+=`<div class="swap-opt" style="border-color:var(--accent)" onclick="applySwap('${day}','${type}',${idx},'${esc(orig).replace(/'/g,"\\'")}',true)">↩︎ Remettre l'original (${esc(orig)})</div>
    <button class="btn-ghost btn-block mt" onclick="closeModal()">Annuler</button>`;
  openModal(html);
}
function applySwap(day,type,idx,label,isOrig){
  setOverride(day,type,idx, isOrig?null:label);
  closeModal(); renderDiet(); toast("Remplacé ✓");
}

/* ====================================================================
   VUE — SUIVI (poids + réglages + rappels)
   ==================================================================== */
function renderTrack(){
  const w=currentWeight();
  const lost=(S.settings.startWeight-w);
  const sd = new Date(S.settings.startDate);
  const days = Math.max(1, Math.round((Date.now()-sd.getTime())/86400000));
  const perWeek = (lost/days*7);

  let html=`<h2 class="section-title">📊 Suivi du poids</h2>
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
    <button class="btn-ghost btn-block mt" onclick="testNotif()">Tester une notification</button>
    <div class="muted small mt">Les rappels se déclenchent quand l'app a été ouverte dans la journée (Android). Garde l'icône sur ton écran d'accueil. 💉 Pense aussi à ton Ozempic le mercredi.</div>
  </div>
  <div class="card center muted small">EnForme · données stockées sur ton appareil uniquement.
    <button class="btn-ghost btn-block mt" onclick="exportData()">Exporter mes données</button></div>`;
  $("#view-track").innerHTML = html;
}

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
function setReminder(k,v){ S.settings.reminders[k]=v; save(); if(S.settings.reminders.enabled) scheduleReminders(); }
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
  if(todayName()===r.ozempic) at("09:00","💉 Ozempic","C'est le jour de ton injection.");
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
function dayKcal(dn){ const p=MEAL_PLAN[dn]; return ["dej","collation","diner","souper"].reduce((s,t)=>s+p[t].kcal,0); }
function dayProt(dn){ const p=MEAL_PLAN[dn]; return ["dej","collation","diner","souper"].reduce((s,t)=>s+p[t].prot,0); }

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

/* ---- Init ---- */
render();
startAnim();
if(S.settings.reminders.enabled) scheduleReminders();
document.addEventListener("visibilitychange",()=>{ if(!document.hidden && S.settings.reminders.enabled) scheduleReminders(); });

if("serviceWorker" in navigator){
  window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
}
