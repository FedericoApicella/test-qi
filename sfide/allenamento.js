// Allenamento per area: difficoltà adattiva, spiegazione della risposta, progressi salvati nel browser.
(function(){
'use strict';
const $=(s)=>document.querySelector(s);
const esc=(s)=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const {oneItem,itemHtml,KIND_NAME,cellSVG,cellsSVG}=window.Quesiti;
const FX=window.Effetti;
const GAMES=window.Giochi||[];
let gameStop=null;
const LETTERS='ABCDEF';
const KEY='testqi.allenamento';
const AREAS=[
  {id:'mat',name:'Matrici',ic:'🧩',desc:'Trova la regola della griglia 3×3',time:60},
  {id:'num',name:'Serie numeriche',ic:'🔢',desc:'Scopri cosa lega i numeri',time:45},
  {id:'verb',name:'Analogie',ic:'💬',desc:'Parole e relazioni',time:30},
  {id:'mem',name:'Memoria',ic:'🧠',desc:'Tieni a mente e riordina',time:30},
  {id:'rot',name:'Rotazioni',ic:'🔄',desc:'Ruota le figure nella testa',time:45},
  {id:'mix',name:'Mix',ic:'🎲',desc:'Un po\' di tutto, a sorpresa',time:45},
];
const SESSION_N=10;
const BADGES=[
  {id:'primo',e:'🌱',n:'Primo passo',d:'Hai completato il primo allenamento'},
  {id:'fila5',e:'🔥',n:'5 di fila',d:'Cinque risposte giuste di seguito'},
  {id:'fila10',e:'⚡',n:'10 di fila',d:'Dieci risposte giuste di seguito'},
  {id:'perfetto',e:'💯',n:'Perfetto',d:'Un allenamento senza errori'},
  {id:'lv5',e:'🥈',n:'Livello 5',d:'Livello 5 in un\'area'},
  {id:'lv10',e:'🥇',n:'Livello 10',d:'Livello massimo in un\'area'},
  {id:'q50',e:'🎯',n:'50 quesiti',d:'Cinquanta quesiti affrontati'},
  {id:'q200',e:'🏆',n:'200 quesiti',d:'Duecento quesiti affrontati'},
  {id:'tutte',e:'🌍',n:'Tuttologo',d:'Un allenamento in ogni area'},
  {id:'veloce',e:'🚀',n:'Fulmine',d:'Risposta giusta in meno di 3 secondi'},
  {id:'serio',e:'🎓',n:'Sul serio',d:'Un allenamento serio completato'},
  {id:'giocherellone',e:'🎮',n:'Giocherellone',d:'Cinque giochi diversi provati'},
];

// ========================= progressi =========================
function freshArea(){return{level:0.1,done:0,correct:0,best:0,sessions:[]}}
const SPRINT_MS=60000;
function loadP(){const p=FX.load(KEY,{aree:{},badges:{},bestStreak:0,totalDone:0,totalPts:0,sprintBest:0,sprintN:0,giochi:{}});if(!p.giochi)p.giochi={};AREAS.forEach(a=>{if(!p.aree[a.id])p.aree[a.id]=freshArea()});return p}
let P=loadP();
const saveP=()=>FX.save(KEY,P);
const lvNum=(level)=>1+Math.min(9,Math.floor(level*10));
function award(id){if(P.badges[id])return false;P.badges[id]=new Date().toISOString();S.newBadges.push(id);FX.beep('level');return true}

// ========================= stato della sessione =========================
let S=null,tick=null,memT=null;
function startSession(areaId){
  const area=AREAS.find(a=>a.id===areaId);
  S={screen:'q',area,i:-1,items:[],log:[],pts:0,streak:0,maxStreak:0,newBadges:[],lvStart:lvNum(P.aree[area.id].level),mem:null,fb:null};
  FX.beep('start');next();
}
function startSprint(){
  S={screen:'q',area:{id:'sprint',name:'Sprint 60 secondi',ic:'⚡',time:60},sprint:true,endAt:Date.now()+SPRINT_MS,i:-1,items:[],log:[],pts:0,streak:0,maxStreak:0,newBadges:[],lvStart:0,mem:null,fb:null};
  FX.beep('start');next();
  tick=setInterval(()=>{S.timeLeft=Math.max(0,Math.ceil((S.endAt-Date.now())/1000));updateBar();if(S.timeLeft<=5&&S.timeLeft>0)FX.beep('tick');if(Date.now()>=S.endAt){clearInterval(tick);tick=null;clearTimeout(memT);endSession()}},250);
}
function startGame(id){
  const g=GAMES.find(x=>x.id===id);if(!g)return;
  const rec=P.giochi[id]||(P.giochi[id]={best:0,n:0,level:1,hist:[]});
  S={screen:'game',game:g,area:AREAS.find(a=>a.id===g.area),pts:0,newBadges:[],timeLeft:null};
  FX.beep('start');render();
  const root=$('#gameRoot');
  const ctx={beep:FX.beep,floatText:FX.floatText,shake:FX.shake,level:rec.level,timer:(sec)=>{S.timeLeft=sec;updateBar()},
    end:(res)=>{gameStop=null;S.res=res;S.pts=res.pts;const isBest=res.metric>rec.best;if(isBest)rec.best=res.metric;rec.n++;if(res.level)rec.level=res.level;
      rec.hist.push({d:Date.now(),metric:res.metric,score:res.score!==undefined?res.score:res.nOk,pts:res.pts});if(rec.hist.length>60)rec.hist.shift();
      P.totalDone+=res.n||0;P.totalPts+=Math.max(0,res.pts);award('primo');if(g.kind==='serio')award('serio');if(Object.keys(P.giochi).length>=5)award('giocherellone');
      S.isBest=isBest;S.screen='gameEnd';saveP();render();if(isBest&&res.metric>0){FX.beep('win');FX.confetti(90)}else FX.beep('ok')}};
  gameStop=g.start(root,ctx)||null;
}
function curLevel(){return S.sprint?0.12+Math.random()*0.25:P.aree[S.area.id].level}
function next(){
  stopTimer();clearTimeout(memT);
  if(S.sprint){S.i++;const kind=['num','verb','rot','mat'][Math.floor(Math.random()*4)];const it=oneItem(kind,Math.floor(Math.random()*2147483647),curLevel());S.items.push(it);S.fb=null;S.mine=null;S.mem=null;S.screen='q';S.at=Date.now();S.time=60;render();return}
  S.i++;if(S.i>=SESSION_N){endSession();return}
  const kind=S.area.id==='mix'?['mat','num','verb','mem','rot'][Math.floor(Math.random()*5)]:S.area.id;
  const seed=Math.floor(Math.random()*2147483647);
  const it=oneItem(kind,seed,curLevel());
  S.items.push(it);S.fb=null;S.mine=null;S.mem=null;S.screen='q';
  S.time=AREAS.find(a=>a.id===kind).time;
  if(kind==='mem'){S.mem={phase:'show'};render();runMemShow();return}
  startTimer();render();
}
function startTimer(){S.at=Date.now();S.timeLeft=S.time;tick=setInterval(()=>{S.timeLeft=Math.max(0,S.time-Math.round((Date.now()-S.at)/1000));updateBar();if(S.timeLeft<=5&&S.timeLeft>0)FX.beep('tick');if(S.timeLeft<=0){stopTimer();answer(null)}},250)}
function stopTimer(){if(S&&S.sprint)return;if(tick){clearInterval(tick);tick=null}}
function runMemShow(){
  const it=S.items[S.i];const box=$('#memShow');if(!box)return;let pos=-1;
  const step=()=>{pos++;if(pos>=it.seq.length){box.innerHTML='';S.mem.phase='input';startTimer();render();setTimeout(()=>{const f=$('#memInput');if(f)f.focus()},0);return}
    box.textContent=it.seq[pos];box.classList.add('pop');memT=setTimeout(()=>{box.textContent='';box.classList.remove('pop');memT=setTimeout(step,250)},850)};
  memT=setTimeout(step,700);
}
function answer(choice,el){
  if(!S||S.screen!=='q'||S.fb)return;
  if(S.sprint){const it=S.items[S.i];const ok=choice===it.answer;const ms=Date.now()-S.at;let pts=0;
    if(ok){S.streak++;S.maxStreak=Math.max(S.maxStreak,S.streak);pts=5+Math.min(5,S.streak-1);FX.beep(S.streak%5===0?'streak':'ok');FX.floatText(el,'+'+pts,S.streak>=5?'gold':'')}
    else{S.streak=0;FX.beep('bad');FX.shake($('#qbox'));if(el)FX.floatText(el,'✗','bad')}
    S.pts+=pts;P.totalDone++;P.totalPts+=pts;P.bestStreak=Math.max(P.bestStreak,S.streak);S.log.push({ok,ms,pts,kind:it.kind,choice});
    if(S.streak>=5)award('fila5');if(S.streak>=10)award('fila10');if(P.totalDone>=50)award('q50');if(P.totalDone>=200)award('q200');
    S.fb={ok,pts,choice};render();memT=setTimeout(next,ok?450:900);return}
  stopTimer();clearTimeout(memT);
  const it=S.items[S.i];const ms=Math.min(Date.now()-S.at,S.time*1000);
  const ok=it.kind==='mem'?(choice!==null&&String(choice).toUpperCase()===it.answer):choice===it.answer;
  const area=P.aree[S.area.id];const lvBefore=lvNum(area.level);
  let pts=0;
  if(ok){S.streak++;S.maxStreak=Math.max(S.maxStreak,S.streak);pts=10+Math.round(5*Math.max(0,1-ms/(S.time*1000)))+Math.min(5,S.streak-1)*2;
    area.level=Math.min(1,area.level+(S.streak>=3?0.05:0.035));area.correct++;
    FX.beep(S.streak>0&&S.streak%5===0?'streak':'ok');FX.floatText(el||$('#qbox'),'+'+pts,S.streak>=5?'gold':'');
    if(ms<3000)award('veloce');
  }else{S.streak=0;area.level=Math.max(0,area.level-0.06);FX.beep('bad');FX.shake($('#qbox'));if(el)FX.floatText(el,'✗','bad')}
  area.done++;area.best=Math.max(area.best,S.streak);P.totalDone++;P.totalPts+=pts;P.bestStreak=Math.max(P.bestStreak,S.streak);S.pts+=pts;
  if(S.streak>=5)award('fila5');if(S.streak>=10)award('fila10');if(P.totalDone>=50)award('q50');if(P.totalDone>=200)award('q200');
  const lvAfter=lvNum(area.level);const levelUp=lvAfter>lvBefore;
  if(levelUp){FX.beep('level');FX.confetti(40);if(lvAfter>=5)award('lv5');if(lvAfter>=10)award('lv10')}
  S.log.push({ok,ms,pts,kind:it.kind,choice});S.fb={ok,pts,choice,levelUp,lvAfter};
  saveP();render();
  setTimeout(()=>{const b=$('#nextBtn');if(b)b.focus()},0);
}
function endSession(){
  if(S.sprint){const nOk=S.log.filter(l=>l.ok).length;S.record=S.pts>P.sprintBest;if(S.record)P.sprintBest=S.pts;P.sprintN++;award('primo');saveP();S.screen='end';render();if(S.record&&S.pts>0){FX.beep('win');FX.confetti(100)}else FX.beep('ok');return}
  const area=P.aree[S.area.id];const nOk=S.log.filter(l=>l.ok).length;
  area.sessions.push({d:Date.now(),acc:nOk/SESSION_N,lvl:lvNum(area.level),pts:S.pts});if(area.sessions.length>60)area.sessions.shift();
  award('primo');if(nOk===SESSION_N)award('perfetto');
  if(['mat','num','verb','mem','rot'].every(k=>P.aree[k].sessions.length>0))award('tutte');
  saveP();S.screen='end';render();
  if(nOk>=7){FX.beep('win');FX.confetti(nOk===SESSION_N?140:70)}
}
function quit(){if(tick){clearInterval(tick);tick=null}clearTimeout(memT);if(gameStop){try{gameStop()}catch(e){}gameStop=null}S=null;render()}

// ========================= interfaccia =========================
const fmtMs=(ms)=>(ms/1000).toFixed(1).replace('.',',')+' s';
function render(){
  $('#app').innerHTML=S?(S.screen==='end'?rEnd():S.screen==='game'?rGame():S.screen==='gameEnd'?rGameEnd():rQ()):rHome();
  updateBar();bind();
}
function updateBar(){
  const sc=$('#barScores'),t=$('#barTimer');
  document.querySelector('.bar').classList.toggle('ingame',!!S);
  if(S&&(S.screen==='game')){sc.innerHTML=`<span class="sc me"><span class="n">${esc(S.game.name)}</span></span>`}
  else if(S&&S.screen==='q'){sc.innerHTML=`<span class="sc me"><span class="n">Punti</span><span class="v">${S.pts}</span></span>${S.streak>=2?`<span class="streak">🔥 ${S.streak}</span>`:''}`}
  else sc.innerHTML='';
  if(S&&S.screen==='game'&&S.timeLeft!==null){t.classList.remove('hidden-timer');t.textContent=S.timeLeft+' s';t.classList.toggle('low',S.timeLeft<=10)}
  else if(S&&S.screen==='q'&&(S.sprint||(!S.fb&&!(S.mem&&S.mem.phase==='show')))){t.classList.remove('hidden-timer');t.textContent=(S.timeLeft||0)+' s';t.classList.toggle('low',S.timeLeft<=10)}
  else t.classList.add('hidden-timer');
  $('#barProg').style.width=(!S||S.screen==='game'||S.screen==='gameEnd')?'0':((S.sprint?(S.screen==='end'?100:100-(S.timeLeft||0)/60*100):((S.screen==='end'?SESSION_N:S.i+(S.fb?1:0))/SESSION_N*100))+'%');
  if(!$('#soundBtn')){$('#barSound').innerHTML=FX.soundButtonHtml();FX.bindSoundButton()}
}
function bind(){
  document.querySelectorAll('[data-act]').forEach(b=>b.addEventListener('click',()=>act(b.dataset.act,b)));
  document.querySelectorAll('.opt[data-i]').forEach(b=>b.addEventListener('click',()=>answer(+b.dataset.i,b)));
  const mi=$('#memInput');if(mi)mi.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();e.stopPropagation();answer(mi.value.trim().toUpperCase()||null,mi)}});
  document.onkeydown=(e)=>{if(e.target&&e.target.tagName==='INPUT')return;if(S&&!S.sprint&&S.fb&&(e.key==='Enter'||e.key===' ')){e.preventDefault();next()}};
}
function act(a,btn){
  if(a==='area')startSession(btn.dataset.area);
  else if(a==='sprint')startSprint();
  else if(a==='game')startGame(btn.dataset.game);
  else if(a==='gameAgain')startGame(S.game.id);
  else if(a==='next')next();
  else if(a==='memOk'){const mi=$('#memInput');answer(mi&&mi.value.trim().toUpperCase()||null,mi)}
  else if(a==='quit')quit();
  else if(a==='again'){if(S.sprint)startSprint();else startSession(S.area.id)}
  else if(a==='reset'){if(confirm('Vuoi davvero azzerare tutti i progressi salvati su questo dispositivo?')){localStorage.removeItem(KEY);P=loadP();render()}}
}
function spark(sessions){
  const v=sessions.slice(-20).map(s=>s.lvl);if(v.length<2)return'';
  const w=200,h=36,pts=v.map((y,i)=>`${(i/(v.length-1)*(w-4)+2).toFixed(1)},${(h-2-(y-1)/9*(h-6)).toFixed(1)}`).join(' ');
  return`<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
}
function chart(area){
  const ss=P.aree[area].sessions.slice(-30);if(ss.length<2)return'<p class="hint">Il grafico compare dal secondo allenamento in quest\'area.</p>';
  const w=600,h=160,l=28,b=22;const x=(i)=>l+i/(ss.length-1)*(w-l-8);
  const yL=(lv)=>8+(1-(lv-1)/9)*(h-b-8),yA=(a)=>8+(1-a)*(h-b-8);
  const lv=ss.map((s,i)=>`${x(i).toFixed(1)},${yL(s.lvl).toFixed(1)}`).join(' ');
  const ac=ss.map((s,i)=>`${x(i).toFixed(1)},${yA(s.acc).toFixed(1)}`).join(' ');
  return`<svg class="chart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="Livello e percentuale di risposte giuste negli ultimi allenamenti">
    ${[1,5,10].map(v=>`<line x1="${l}" x2="${w-8}" y1="${yL(v)}" y2="${yL(v)}" stroke="var(--border)" stroke-dasharray="3 4"/><text x="2" y="${yL(v)+4}">L${v}</text>`).join('')}
    <polyline points="${ac}" fill="none" stroke="var(--warn)" stroke-width="2" opacity=".8"/>
    <polyline points="${lv}" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>
    ${ss.map((s,i)=>`<circle cx="${x(i)}" cy="${yL(s.lvl)}" r="3.5" fill="currentColor"/>`).join('')}
    <text x="${l}" y="${h-4}">primo</text><text x="${w-8}" y="${h-4}" text-anchor="end">ultimo allenamento</text>
  </svg><p class="hint"><span style="color:var(--accent);font-weight:600">—</span> livello (1–10) · <span style="color:var(--warn);font-weight:600">—</span> risposte giuste (0–100%)</p>`;
}
function gameCard(g){const r=P.giochi[g.id];const a=AREAS.find(x=>x.id===g.area);
  return`<button class="area ${g.kind}" data-act="game" data-game="${g.id}"><span class="ic">${g.ic}</span><b>${esc(g.name)}</b><span class="hint">${esc(g.desc)}</span>
    <span class="lv"><span>${a?a.ic+' '+a.name:''}</span><span style="text-align:right">${r&&r.n?(g.kind==='serio'?`livello ${r.level} · record ${r.best}`:`record ${r.best}`)+' · '+r.n+(r.n===1?' partita':' partite'):'mai provato'}</span></span>${r&&r.hist?spark(r.hist.map(h=>({lvl:1+9*Math.min(1,(h.score||0)/100)}))):''}</button>`}
function rHome(){
  const cards=AREAS.map(a=>{const p=P.aree[a.id];const lv=lvNum(p.level);const acc=p.done?Math.round(p.correct/p.done*100):null;
    return`<button class="area" data-act="area" data-area="${a.id}"><span class="ic">${a.ic}</span><b>${a.name}</b><span class="hint">${esc(a.desc)}</span>
      <span class="lv"><span>Livello <span class="mono">${lv}</span>/10</span><span>${p.done?`${acc}% giuste · ${p.done} quesiti`:'mai provata'}</span></span>
      <span class="track"><i style="width:${Math.round(p.level*100)}%"></i></span>${spark(p.sessions)}</button>`}).join('');
  const sprint=`<button class="area" data-act="sprint" style="border-color:var(--brand-300);background:linear-gradient(135deg,#fff 0%,var(--brand-50) 100%)"><span class="ic">⚡</span><b>Sprint 60 secondi</b><span class="hint">Quesiti facili a raffica: quanti ne fai in un minuto? Ogni risposta giusta di fila vale di più.</span><span class="lv"><span>Record <span class="mono">${P.sprintBest}</span> punti</span><span>${P.sprintN?P.sprintN+' sprint':'mai provato'}</span></span></button>`;
  const giochi=GAMES.filter(g=>g.kind==='gioco').map(gameCard).join('');
  const seri=GAMES.filter(g=>g.kind==='serio').map(gameCard).join('');
  const badges=BADGES.map(b=>`<span class="badge ${P.badges[b.id]?'':'off'}" title="${esc(b.d)}"><span class="e">${b.e}</span>${b.n}</span>`).join('');
  const nB=Object.keys(P.badges).length;
  return`<div class="stack"><div class="eyebrow">Gioca · Allenati · Misurati</div><h1>Divertiti e <span class="grad">migliora davvero</span></h1>
    <p class="lede">Giochi veloci per scaldarti, allenamenti seri con progressione misurabile, e il test per sapere a che punto sei. Tutto salvato su questo dispositivo.</p></div>
    <div class="stats card" style="grid-template-columns:repeat(auto-fit,minmax(110px,1fr))">
      <div class="stat"><span class="v">${P.totalDone}</span><span class="l">quesiti</span></div>
      <div class="stat"><span class="v">${P.totalPts}</span><span class="l">punti</span></div>
      <div class="stat"><span class="v">🔥 ${P.bestStreak}</span><span class="l">serie record</span></div>
      <div class="stat"><span class="v">${nB}/${BADGES.length}</span><span class="l">medaglie</span></div>
    </div>
    <div class="stack" id="gioca"><h2>🎮 Gioca</h2><p class="hint">Partite da un minuto, una per area. Per divertirsi e scaldare la mente.</p><div class="areas">${sprint}${giochi}</div></div>
    <div class="stack" id="allenati"><h2>🏋️ Allenati</h2><p class="hint">Allenamenti veri: la difficoltà si adatta a te e i progressi vengono registrati nel tempo. Dieci quesiti per sessione, ogni risposta spiegata.</p><div class="areas">${cards}${seri}</div></div>
    <div class="stack" id="misurati"><h2>📏 Misurati</h2><p class="hint">Quando vuoi un numero attendibile, non un gioco: il test con scala QI, intervallo di confidenza e profilo per area.</p>
      <div class="tiles"><a class="tile" href="../test.html#breve"><span class="pill">≈ 20 min</span><span class="ic">⚡</span><b>Stima rapida</b><span>40 quesiti, una prima idea del punteggio.</span><span class="cta">Inizia →</span></a><a class="tile" href="../test.html"><span class="pill">≈ 50 min</span><span class="ic">🧪</span><b>Test completo</b><span>100 quesiti, la misura più precisa disponibile qui.</span><span class="cta">Inizia →</span></a></div></div>
    <div class="card"><h3>Medaglie</h3><div class="badges">${badges}</div></div>
    <div class="actions"><a class="btn" href="./">⚔️ Sfida un amico</a><a class="btn" href="../">🏠 Home</a><button class="btn" data-act="reset" style="margin-left:auto">Azzera i progressi</button></div>`;
}
function rGame(){return`<div id="gameRoot" class="stack"></div><div class="actions"><button class="btn" data-act="quit">Interrompi</button></div>`}
function metricChart(hist,label){
  const h=hist.slice(-30);if(h.length<2)return'<p class="hint">Il grafico compare dalla seconda partita.</p>';
  const w=600,ht=150,l=30,b=22;const mx=Math.max(...h.map(x=>x.metric),1);const x=(i)=>l+i/(h.length-1)*(w-l-8);const y=(v)=>8+(1-v/mx)*(ht-b-8);
  const pts=h.map((s,i)=>`${x(i).toFixed(1)},${y(s.metric).toFixed(1)}`).join(' ');
  return`<svg class="chart" viewBox="0 0 ${w} ${ht}" preserveAspectRatio="none" role="img" aria-label="${esc(label)} nel tempo"><line x1="${l}" x2="${w-8}" y1="${y(mx)}" y2="${y(mx)}" stroke="var(--border)" stroke-dasharray="3 4"/><text x="2" y="${y(mx)+4}">${mx}</text><line x1="${l}" x2="${w-8}" y1="${y(0)}" y2="${y(0)}" stroke="var(--border)"/><text x="2" y="${y(0)+4}">0</text>
    <polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>${h.map((s,i)=>`<circle cx="${x(i)}" cy="${y(s.metric)}" r="3.5" fill="currentColor"/>`).join('')}<text x="${l}" y="${ht-4}">prima</text><text x="${w-8}" y="${ht-4}" text-anchor="end">ultima partita</text></svg><p class="hint">${esc(label)} partita per partita.</p>`;
}
function rGameEnd(){
  const g=S.game,r=S.res,rec=P.giochi[g.id];
  const title=S.isBest&&r.metric>0?'Nuovo record! 🏆':r.n&&r.nOk/r.n>=0.8?'Ottimo!':'Fatto';
  const nb=S.newBadges.map(id=>BADGES.find(b=>b.id===id)).map(b=>`<span class="badge"><span class="e">${b.e}</span>${b.n}</span>`).join('');
  return`<div class="final"><div class="eyebrow">${g.ic} ${esc(g.name)} · ${g.kind==='serio'?'allenamento':'partita'} finita</div><div class="big">${title}</div><div class="sub">${r.metricLabel}: <b>${r.metric}</b> · record ${rec.best}${r.detail?' · '+esc(r.detail):''}</div>
      <div class="stats" style="padding-top:12px"><div class="stat"><span class="v">${r.pts}</span><span class="l">punti</span></div><div class="stat"><span class="v">${r.nOk}${r.n?'/'+r.n:''}</span><span class="l">giuste</span></div><div class="stat"><span class="v">${rec.n}</span><span class="l">partite</span></div></div></div>
    ${nb?`<div class="card"><h3>Nuove medaglie</h3><div class="badges">${nb}</div></div>`:''}
    ${g.kind==='serio'?`<div class="card"><h3>I tuoi progressi</h3>${metricChart(rec.hist,r.metricLabel)}</div>`:''}
    <div class="actions"><button class="btn primary big" data-act="gameAgain">Ancora</button><button class="btn" data-act="quit">Torna ai giochi</button></div>`;
}
function rQ(){
  const it=S.items[S.i];const area=P.aree[S.area.id]||{level:0};
  const head=S.sprint?`<div class="eyebrow">⚡ Sprint · ${esc(KIND_NAME[it.kind])} · ${S.log.filter(l=>l.ok).length} giuste</div>`:`<div class="eyebrow">${esc(KIND_NAME[it.kind])} · quesito ${S.i+1} di ${SESSION_N} · livello ${lvNum(area.level)}</div>`;
  let body;
  if(it.kind==='mem'){
    const instr=it.type==='back'?'Memorizza le cifre: dovrai riscriverle in ordine inverso.':'Memorizza i simboli: dovrai scrivere prima le cifre in ordine crescente, poi le lettere in ordine alfabetico.';
    if(S.mem.phase==='show')body=`<p class="q">${instr}<span class="small">${it.len} simboli</span></p><div class="memshow" id="memShow"><span class="small">Pronto…</span></div>`;
    else body=`<p class="q">${instr}</p>${S.fb?`<div class="memshow small">Sequenza: ${it.seq.join(' – ')}</div>`:''}<div class="field"><label for="memInput">${it.type==='back'?'Scrivi le cifre in ordine inverso':'Prima le cifre in ordine crescente, poi le lettere in ordine alfabetico'}</label><input id="memInput" class="mem" type="text" inputmode="${it.type==='back'?'numeric':'text'}" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="${it.len}" placeholder="${'·'.repeat(it.len)}" ${S.fb?'disabled value="'+esc(S.fb.choice||'')+'"':''}></div>${S.fb?'':'<div class="actions"><button class="btn primary" data-act="memOk">Conferma</button></div>'}`;
  }else{
    const cls=(k)=>!S.fb?'':k===it.answer?'right':S.fb.choice===k?'wrong':'';
    body=itemHtml(it,{cls,dis:!!S.fb,showAnswer:!!S.fb});
  }
  let fb='';
  if(S.fb&&S.sprint)fb=`<div class="fb ${S.fb.ok?'ok':'bad'}"><b>${S.fb.ok?'Giusto! +'+S.fb.pts:'No, era '+LETTERS[it.answer]}</b></div>`;
  else if(S.fb){
    const f=S.fb;
    fb=`<div class="fb ${f.ok?'ok':'bad'}"><b>${f.ok?(S.streak>=5?`Giusto! 🔥 ${S.streak} di fila, +${f.pts} punti`:`Giusto! +${f.pts} punti`):(f.choice===null?'Tempo scaduto.':'Sbagliato.')+' La risposta giusta era '+(it.kind==='mem'?it.answer:LETTERS[it.answer])+'.'}</b>
      ${it.rule?`<span>Spiegazione: ${esc(it.rule)}.</span>`:''}${f.levelUp?`<span>🎉 Sei salito al livello ${f.lvAfter}!</span>`:''}
      <div class="actions"><button class="btn primary" id="nextBtn" data-act="next">${S.i+1<SESSION_N?'Avanti':'Vedi il risultato'}</button><span class="hint">Invio per continuare</span></div></div>`;
  }
  return`${head}<div id="qbox" class="stack">${body}</div>${fb}${S.fb?'':'<div class="actions"><button class="btn" data-act="quit">Interrompi</button></div>'}`;
}
function rEnd(){
  if(S.sprint){const nOk=S.log.filter(l=>l.ok).length;
    return`<div class="final"><div class="eyebrow">⚡ Sprint finito</div><div class="big">${S.record&&S.pts>0?'Nuovo record! 🏆':S.pts>=40?'Che velocità!':'Tempo scaduto'}</div><div class="sub">${S.pts} punti · ${nOk} giuste su ${S.log.length} · serie migliore ${S.maxStreak}</div>
      <div class="stats" style="padding-top:12px"><div class="stat"><span class="v">${S.pts}</span><span class="l">punti</span></div><div class="stat"><span class="v">${P.sprintBest}</span><span class="l">record</span></div><div class="stat"><span class="v">${S.log.length?Math.round(nOk/S.log.length*100):0}%</span><span class="l">giuste</span></div></div></div>
      <div class="actions"><button class="btn primary big" data-act="again">Ancora uno sprint</button><button class="btn" data-act="quit">Torna alle aree</button></div>`}
  const nOk=S.log.filter(l=>l.ok).length;const area=P.aree[S.area.id];const lvEnd=lvNum(area.level);
  const title=nOk===SESSION_N?'Perfetto! 💯':nOk>=7?'Ottimo allenamento!':nOk>=4?'Buon lavoro':'Si impara sbagliando';
  const dl=lvEnd-S.lvStart;
  const nb=S.newBadges.map(id=>BADGES.find(b=>b.id===id)).map(b=>`<span class="badge"><span class="e">${b.e}</span>${b.n}</span>`).join('');
  const rows=S.log.map((l,i)=>`<tr><td class="num">${i+1}</td><td>${esc(KIND_NAME[l.kind])}</td><td class="num">${fmtMs(l.ms)}</td><td class="num ${l.ok?'ok':'bad'}">${l.ok?'+'+l.pts:(l.choice===null?'tempo':'0')}</td></tr>`).join('');
  return`<div class="final"><div class="eyebrow">${esc(S.area.name)} · allenamento finito</div><div class="big">${title}</div><div class="sub">${nOk} giuste su ${SESSION_N} · ${S.pts} punti · serie migliore ${S.maxStreak}</div>
      <div class="stats" style="padding-top:12px"><div class="stat"><span class="v">${lvEnd}</span><span class="l">livello ${dl>0?'(+'+dl+')':dl<0?'('+dl+')':''}</span></div><div class="stat"><span class="v">${Math.round(nOk/SESSION_N*100)}%</span><span class="l">giuste</span></div><div class="stat"><span class="v">${S.pts}</span><span class="l">punti</span></div></div></div>
    ${nb?`<div class="card"><h3>Nuove medaglie</h3><div class="badges">${nb}</div></div>`:''}
    <div class="card"><h3>I tuoi progressi in ${esc(S.area.name)}</h3>${chart(S.area.id)}</div>
    <div class="actions"><button class="btn primary big" data-act="again">Ancora ${esc(S.area.name)}</button><button class="btn" data-act="quit">Cambia area</button></div>
    <details><summary>Quesito per quesito</summary><div class="body"><table><thead><tr><th>#</th><th>Tipo</th><th style="text-align:right">Tempo</th><th style="text-align:right">Punti</th></tr></thead><tbody>${rows}</tbody></table></div></details>`;
}
render();
window.__all={get S(){return S},get P(){return P},answer,next};
})();
