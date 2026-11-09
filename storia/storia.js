// Modalità storia: livelli infiniti divisi in mondi da 10, con mini-giochi facili all'inizio
// e quesiti del test sempre più difficili; cuori, stelle, boss di fine mondo, progressi salvati nel browser
// (chiave testqi.storia, sincronizzata dall'account se presente).
(function(){
'use strict';
const $=(s)=>document.querySelector(s);
const esc=(s)=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const {oneItem,itemHtml,mulberry32}=window.Quesiti;
const {oneMini,miniHtml}=window.MiniGiochi;
const FX=window.Effetti;
const KEY='testqi.storia';
const PER_WORLD=10,N_ITEMS=5,N_BOSS=8,HEARTS=3;
const LETTERS='ABCDEFGH';

// ========================= mondi e storia =========================
const WORLDS=[
  {n:'Il Villaggio delle Forme',e:'🏡',mini:['odd','count'],hard:['mat'],intro:'Benvenuto! Nel villaggio ogni cosa ha la sua forma, ma qualcuno ha mescolato tutto. Rimetti ordine e guadagna le prime stelle.',boss:'Il Guardiano delle Forme ti sbarra la strada: otto prove di fila, senza perdere tutti i cuori!'},
  {n:'La Foresta dei Numeri',e:'🌲',mini:['sum','big'],hard:['num'],intro:'Tra gli alberi i numeri crescono come frutti. Chi sa contarli trova la strada, chi sbaglia gira in tondo.',boss:'La Volpe Contabile ti sfida: somme, serie e numeri giganti. Chi perde paga pegno.'},
  {n:'Il Lago degli Specchi',e:'🪞',mini:['odd','flash'],hard:['rot'],intro:'L\'acqua riflette ogni figura al contrario. Impara a distinguere una rotazione da un riflesso e il lago ti lascerà passare.',boss:'Lo Spirito del Lago si moltiplica in mille riflessi: trova sempre quello vero.'},
  {n:'La Biblioteca Parlante',e:'📚',mini:['stroop','flash'],hard:['verb'],intro:'I libri qui parlano, e a volte dicono il contrario di ciò che mostrano. Ascolta le parole, non lasciarti ingannare dai colori.',boss:'Il Bibliotecario chiude le porte: analogie e parole colorate fino all\'ultimo scaffale.'},
  {n:'La Torre della Memoria',e:'🗼',mini:['flash','count'],hard:['mem'],intro:'Ogni piano della torre fa dimenticare qualcosa. Tieni a mente i simboli e sali fino in cima.',boss:'La Custode della Torre mostra le sequenze una volta sola. Ricordale tutte.'},
  {n:'Il Mercato dei Mille Colori',e:'🎪',mini:['stroop','sum','big'],hard:['num','verb'],intro:'Bancarelle, grida, colori ovunque: al mercato vince chi resta lucido in mezzo al caos.',boss:'Il Mercante Furbo mescola prezzi e colori: non farti imbrogliare.'},
  {n:'Le Miniere di Cristallo',e:'💎',mini:['odd','count'],hard:['mat','rot'],intro:'Nelle miniere i cristalli seguono regole segrete. Chi scopre la regola trova la vena più ricca.',boss:'Il Golem di Cristallo cambia forma a ogni passo. Indovina la sua prossima mossa.'},
  {n:'L\'Osservatorio delle Stelle',e:'🔭',mini:['sum','flash'],hard:['num','mem'],intro:'Dall\'osservatorio si leggono le serie del cielo. Ogni stella segue la precedente secondo una legge.',boss:'L\'Astronomo Insonne ti interroga sulle costellazioni: serie, memoria e calcolo fino all\'alba.'},
  {n:'Il Palazzo dei Rompicapi',e:'🏰',mini:['stroop','big'],hard:['mat','verb','rot'],intro:'Nel palazzo ogni stanza è un enigma e ogni porta si apre con una risposta giusta.',boss:'Il Re degli Enigmi in persona. Nessuno lo ha ancora battuto.'},
  {n:'Il Vulcano della Logica',e:'🌋',mini:['sum','odd','flash'],hard:['mat','num','verb','mem','rot'],intro:'Il vulcano ribolle di quesiti di ogni tipo. Qui finisce la mappa conosciuta: da qui in poi la storia la scrivi tu.',boss:'Il Drago della Logica custodisce il cratere. Sconfiggilo e i mondi diventeranno infiniti.'},
];
const ADJ=['Perduto','Sospeso','Nascosto','Infinito','Dorato','Capovolto','Silenzioso','Lampeggiante','Misterioso','Fluttuante','Antico','Proibito'];
const NOUN=[['Il Deserto','🏜️'],['L\'Isola','🏝️'],['Il Ghiacciaio','🧊'],['La Giungla','🌴'],['Il Castello','🏯'],['La Nuvola','☁️'],['Il Pianeta','🪐'],['Il Labirinto','🌀'],['Il Faro','🗼'],['Il Canyon','🏔️'],['Il Tempio','⛩️'],['L\'Oceano','🌊']];
const MINI_ALL=['odd','count','flash','stroop','sum','big'],HARD_ALL=['mat','num','verb','mem','rot'];
function worldOf(w){ // w parte da 1
  if(w<=WORLDS.length)return Object.assign({id:w},WORLDS[w-1]);
  const rng=mulberry32(w*7919);const noun=NOUN[Math.floor(rng()*NOUN.length)],adj=ADJ[Math.floor(rng()*ADJ.length)];
  const fem=noun[0].startsWith('La ')||noun[0]==="L'Isola";
  const name=`${noun[0]} ${fem?adj.replace(/o$/,'a'):adj}`;
  const mini=[MINI_ALL[Math.floor(rng()*6)],MINI_ALL[Math.floor(rng()*6)]],hard=[HARD_ALL[Math.floor(rng()*5)],HARD_ALL[Math.floor(rng()*5)]];
  return{id:w,n:name,e:noun[1],mini,hard,intro:`Mondo ${w}: terre mai esplorate. I quesiti sono più duri, i tempi più stretti, le stelle più preziose.`,boss:`Il Signore del Mondo ${w} ti aspetta: ${N_BOSS} prove, tempo ridotto, nessuna pietà.`};
}
const KIND_ICON={odd:'🔍',count:'🔢',flash:'⚡',stroop:'🎨',sum:'➕',big:'📏',mat:'🧩',num:'🧮',verb:'💬',mem:'🧠',rot:'🔄'};
const KIND_NAME={odd:'Intruso',count:'Conta le forme',flash:'Memoria lampo',stroop:'Colore della parola',sum:'Calcolo lampo',big:'Il più grande',mat:'Matrice',num:'Serie numerica',verb:'Analogia',mem:'Memoria',rot:'Rotazione'};
const BASE_TIME={odd:15,count:20,flash:12,stroop:10,sum:15,big:20,mat:60,num:45,verb:30,mem:30,rot:45};
const RANKS=[[0,'Novizio','🌱'],[8,'Apprendista','🎒'],[20,'Esploratore','🧭'],[40,'Stratega','♟️'],[75,'Maestro','🎓'],[120,'Genio','💡'],[200,'Leggenda','👑'],[400,'Mito','🌟']];
const CHEERS=['Scaldiamo i neuroni!','Oggi si vola.','Un passo alla volta, ma veloce.','Le stelle non si prendono da sole.','Occhi aperti e mente sveglia.','Nessuna fretta: il tempo è solo un numero (che scende).','Chi sbaglia impara, chi riprova vince.','Il livello sembra facile. Sembra.'];

const diffOf=(L)=>1-Math.exp(-(L-1)/35);
const worldIdx=(L)=>Math.ceil(L/PER_WORLD);
const isBoss=(L)=>L%PER_WORLD===0;
function rankOf(stars){let r=RANKS[0];for(const x of RANKS)if(stars>=x[0])r=x;return r}
function nextRank(stars){return RANKS.find(x=>x[0]>stars)||null}

// ========================= progressi =========================
function loadP(){const p=FX.load(KEY,{});return Object.assign({stars:{},max:1,xp:0,best:0,boss:{},played:0,correct:0,seen:{}},p)}
let P=loadP();
const saveP=()=>FX.save(KEY,P);
window.addEventListener('testqi:account',()=>{P=loadP();if(!S)render()});
const totStars=()=>Object.values(P.stars).reduce((a,b)=>a+b,0);

// ========================= livello =========================
let S=null,tick=null,showT=null,autoT=null,view={world:null};
function buildLevel(L){
  const w=worldOf(worldIdx(L)),boss=isBoss(L),d=diffOf(L);
  const n=boss?N_BOSS:N_ITEMS;
  let easy=Math.max(0.2,0.85-d);if(boss)easy*=0.5;
  const items=[];const usedVerb=new Set();let lastKind='';
  for(let i=0;i<n;i++){
    let kind;
    for(let t=0;t<6;t++){
      const mini=Math.random()<easy;
      const pool=mini?(Math.random()<0.6?w.mini:MINI_ALL):(Math.random()<0.6?w.hard:HARD_ALL);
      kind=pool[Math.floor(Math.random()*pool.length)];if(kind!==lastKind)break;
    }
    lastKind=kind;
    const lv=Math.max(0,Math.min(1,d*0.92+Math.random()*0.15-0.03+(boss?0.06:0)));
    const seed=Math.floor(Math.random()*2147483647);
    const it=MINI_ALL.includes(kind)?oneMini(kind,seed,lv):oneItem(kind,seed,lv,usedVerb);
    it.time=Math.max(6,Math.round(BASE_TIME[kind]*(1-0.35*d)*(boss?0.85:1)));
    items.push(it);
  }
  return{L,w,boss,items};
}
function startLevel(L){
  const lvl=buildLevel(L);
  S=Object.assign(lvl,{screen:'brief',i:-1,hearts:HEARTS,pts:0,streak:0,maxStreak:0,log:[],fb:null,phase:null});
  render();
}
function go(){S.screen='q';FX.beep('start');next()}
function next(){
  stopTimer();clearTimeout(showT);clearTimeout(autoT);
  S.i++;S.fb=null;S.phase=null;
  if(S.i>=S.items.length){endLevel(true);return}
  const it=S.items[S.i];S.time=it.time;
  if(it.kind==='mem'){S.phase='show';render();runMemShow();return}
  if(it.kind==='flash'){S.phase='show';render();showT=setTimeout(()=>{S.phase='ask';startTimer();render()},it.revealMs);return}
  startTimer();render();
}
function startTimer(){S.at=Date.now();S.timeLeft=S.time;tick=setInterval(()=>{S.timeLeft=Math.max(0,S.time-Math.round((Date.now()-S.at)/1000));updateBar();if(S.timeLeft<=3&&S.timeLeft>0)FX.beep('tick');if(S.timeLeft<=0){stopTimer();answer(null)}},250)}
function stopTimer(){if(tick){clearInterval(tick);tick=null}}
function runMemShow(){
  const it=S.items[S.i];const box=$('#memShow');if(!box)return;let pos=-1;
  const step=()=>{pos++;if(pos>=it.seq.length){box.innerHTML='';S.phase='input';startTimer();render();setTimeout(()=>{const f=$('#memInput');if(f)f.focus()},0);return}
    box.textContent=it.seq[pos];box.classList.add('pop');showT=setTimeout(()=>{box.textContent='';box.classList.remove('pop');showT=setTimeout(step,250)},850)};
  showT=setTimeout(step,600);
}
function answer(choice,el){
  if(!S||S.screen!=='q'||S.fb||S.phase==='show')return;
  stopTimer();clearTimeout(showT);
  const it=S.items[S.i];const ms=Math.min(Date.now()-S.at,S.time*1000);
  const ok=it.kind==='mem'?(choice!==null&&String(choice).toUpperCase()===it.answer):choice===it.answer;
  let pts=0;
  if(ok){S.streak++;S.maxStreak=Math.max(S.maxStreak,S.streak);pts=(10+Math.round(10*Math.max(0,1-ms/(S.time*1000)))+Math.min(5,S.streak-1)*2)*(S.boss?2:1);
    P.correct++;FX.beep(S.streak>0&&S.streak%4===0?'streak':'ok');FX.floatText(el||$('#qbox'),'+'+pts,S.streak>=4?'gold':'');
  }else{S.streak=0;S.hearts--;FX.beep('bad');FX.shake($('#qbox'));FX.shake($('#hearts'));if(el)FX.floatText(el,'✗','bad')}
  P.played++;S.pts+=pts;P.best=Math.max(P.best,S.streak);
  S.log.push({ok,ms,pts,kind:it.kind,choice});S.fb={ok,pts,choice};
  saveP();
  if(S.hearts<=0){render();autoT=setTimeout(()=>endLevel(false),900);return}
  render();
  if(ok)autoT=setTimeout(next,750);else setTimeout(()=>{const b=$('#nextBtn');if(b)b.focus()},0);
}
function endLevel(won){
  stopTimer();clearTimeout(showT);clearTimeout(autoT);
  const L=S.L;const stars=won?S.hearts:0;const prev=P.stars[L]||0;
  S.result={won,stars,newStars:Math.max(0,stars-prev),unlocked:false,newRank:null,bossWon:false};
  if(won){
    const rBefore=rankOf(totStars());
    P.stars[L]=Math.max(prev,stars);P.xp+=S.pts;
    if(L>=P.max){P.max=L+1;S.result.unlocked=true}
    if(S.boss&&!P.boss[S.w.id]){P.boss[S.w.id]=Date.now();S.result.bossWon=true}
    const rAfter=rankOf(totStars());if(rAfter[0]>rBefore[0])S.result.newRank=rAfter;
    saveP();
    FX.beep(S.boss?'level':'win');FX.confetti(stars===3?160:80);
  }else{FX.beep('lose')}
  S.screen='end';render();
}
function quit(){stopTimer();clearTimeout(showT);clearTimeout(autoT);S=null;render()}

// ========================= interfaccia =========================
function render(){
  $('#app').innerHTML=!S?rMap():S.screen==='brief'?rBrief():S.screen==='end'?rEnd():rQ();
  updateBar();bind();
}
function heartsHtml(h){return Array.from({length:HEARTS},(_,i)=>`<span class="${i<h?'on':'off'}">${i<h?'❤️':'🤍'}</span>`).join('')}
function updateBar(){
  const sc=$('#barScores'),t=$('#barTimer'),title=$('#barTitle');
  document.querySelector('.bar').classList.toggle('ingame',!!S);
  if(S){title.innerHTML=`<a href="./" data-act="quit" style="color:inherit;text-decoration:none">Storia</a> · Livello ${S.L}${S.boss?' 👑':''}`;sc.innerHTML=`<span class="hearts" id="hearts">${heartsHtml(S.hearts)}</span><span class="sc me"><span class="v">${S.pts}</span></span>${S.streak>=2?`<span class="streak">🔥 ${S.streak}</span>`:''}`}
  else{title.innerHTML='<a href="../" style="color:inherit;text-decoration:none">Test del QI</a> · Storia';sc.innerHTML=''}
  if(S&&S.screen==='q'&&!S.fb&&S.phase!=='show'){t.classList.remove('hidden-timer');t.textContent=S.timeLeft+' s';t.classList.toggle('low',S.timeLeft<=5)}
  else t.classList.add('hidden-timer');
  $('#barProg').style.width=S&&S.screen!=='brief'?((S.screen==='end'?S.items.length:S.i+(S.fb?1:0))/S.items.length*100)+'%':'0';
  if(!$('#soundBtn')){$('#barSound').innerHTML=FX.soundButtonHtml();FX.bindSoundButton()}
}
function bind(){
  document.querySelectorAll('[data-act]').forEach(b=>b.addEventListener('click',(e)=>{e.preventDefault();act(b.dataset.act,b)}));
  document.querySelectorAll('.opt[data-i]').forEach(b=>b.addEventListener('click',()=>answer(+b.dataset.i,b)));
  const mi=$('#memInput');if(mi)mi.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();answer(mi.value.trim().toUpperCase()||null,mi)}});
  document.onkeydown=(e)=>{
    if(!S)return;
    if(S.screen==='brief'&&e.key==='Enter'){e.preventDefault();go();return}
    if(S.screen==='q'&&S.fb&&!S.fb.ok&&(e.key==='Enter'||e.key===' ')){e.preventDefault();next();return}
    if(S.screen==='q'&&!S.fb&&S.phase!=='show'&&!$('#memInput')){const k=/^[1-8]$/.test(e.key)?+e.key-1:/^[a-hA-H]$/.test(e.key)?e.key.toUpperCase().charCodeAt(0)-65:-1;const b=document.querySelector(`.opt[data-i="${k}"]`);if(b)b.click()}
  };
}
function act(a,btn){
  if(a==='play')startLevel(+btn.dataset.l);
  else if(a==='go')go();
  else if(a==='next')next();
  else if(a==='memOk'){const mi=$('#memInput');answer(mi&&mi.value.trim().toUpperCase()||null,mi)}
  else if(a==='quit')quit();
  else if(a==='retry')startLevel(S.L);
  else if(a==='forward')startLevel(S.L+1);
  else if(a==='world'){view.world=+btn.dataset.w;render()}
  else if(a==='share')share();
  else if(a==='reset'){if(confirm('Vuoi davvero azzerare tutti i progressi della storia?')){P=loadP.call(null,localStorage.removeItem(KEY));P=loadP();render()}}
}
function share(){
  const txt=`Modalità storia del Test del QI: sono al livello ${P.max} (${worldOf(worldIdx(Math.max(1,P.max-1))).n}) con ${totStars()} stelle, grado ${rankOf(totStars())[1]}. Provala anche tu: ${location.href.split('?')[0]}`;
  if(navigator.share){navigator.share({text:txt}).catch(()=>{})}
  else if(navigator.clipboard){navigator.clipboard.writeText(txt).then(()=>{const b=$('#shareBtn');if(b)b.textContent='Copiato! 📋'}).catch(()=>prompt('Copia il testo:',txt))}
  else prompt('Copia il testo:',txt);
}
const starsHtml=(n,big)=>`<span class="stars ${big?'big':''}" aria-label="${n} stelle su 3">${[1,2,3].map(i=>`<i class="${i<=n?'on':''}">★</i>`).join('')}</span>`;

function rMap(){
  const tot=totStars(),rank=rankOf(tot),nr=nextRank(tot);
  const curW=worldIdx(P.max);const w=view.world||curW;const W=worldOf(w);
  const first=(w-1)*PER_WORLD+1;
  const nodes=[];
  for(let L=first;L<first+PER_WORLD;L++){
    const st=P.stars[L]||0,boss=isBoss(L);
    const state=L<P.max?'done':L===P.max?'cur':'lock';
    nodes.push(`<div class="node ${state} ${boss?'boss':''}" style="--k:${(L-first)}">
      <button class="nb" ${state==='lock'?'disabled':''} data-act="play" data-l="${L}" aria-label="Livello ${L}${state==='lock'?', bloccato':''}">${state==='lock'?'🔒':boss?'👑':L}</button>
      ${state==='done'?starsHtml(st):state==='cur'?'<span class="tag">Gioca</span>':'<span class="tag">&nbsp;</span>'}
    </div>`);
  }
  const wonBoss=!!P.boss[w];
  const kinds=[...W.mini,...W.hard].filter((k,i,a)=>a.indexOf(k)===i);
  return`
  <section class="hero storyhero">
    <span class="eyebrow">Modalità storia · livelli infiniti</span>
    <h1>${P.max===1?'Inizia l\'avventura':`Livello ${P.max}`}</h1>
    <p>${P.max===1?'Mini-giochi facili all\'inizio, enigmi sempre più tosti dopo. Tre cuori, tre stelle, un boss ogni dieci livelli. La mappa non finisce mai.':`Grado <b>${rank[2]} ${rank[1]}</b> con ${tot} stelle${nr?` · ancora ${nr[0]-tot} stelle per diventare ${nr[1]}`:''}.`}</p>
    <div class="actions"><button class="btn light big" data-act="play" data-l="${P.max}">${P.max===1?'Comincia dal livello 1':`Gioca il livello ${P.max}`} →</button>${P.max>1?`<button class="btn ghost" id="shareBtn" data-act="share">Condividi</button>`:''}</div>
  </section>
  <section class="stats">
    <div class="stat"><div class="v">${tot}</div><div class="l">Stelle</div></div>
    <div class="stat"><div class="v">${P.max-1}</div><div class="l">Livelli superati</div></div>
    <div class="stat"><div class="v">${Object.keys(P.boss).length}</div><div class="l">Boss battuti</div></div>
    <div class="stat"><div class="v">${P.xp}</div><div class="l">Punti</div></div>
  </section>
  <section class="card world">
    <div class="wnav">
      <button class="btn icon" data-act="world" data-w="${w-1}" ${w<=1?'disabled':''} aria-label="Mondo precedente">‹</button>
      <div class="wtitle"><span class="eyebrow">Mondo ${w}${wonBoss?' · 👑 boss battuto':''}</span><h2><span class="we">${W.e}</span> ${esc(W.n)}</h2></div>
      <button class="btn icon" data-act="world" data-w="${w+1}" ${w>=curW?'disabled':''} aria-label="Mondo successivo">›</button>
    </div>
    <p class="lede">${esc(W.intro)}</p>
    <div class="kinds">${kinds.map(k=>`<span class="badge"><span class="e">${KIND_ICON[k]}</span>${KIND_NAME[k]}</span>`).join('')}</div>
    <div class="path">${nodes.join('')}</div>
  </section>
  <section class="card fold" data-fold="storia-regole">
    <h3>Come funziona</h3>
    <ul class="rules">
      <li>Ogni livello ha ${N_ITEMS} prove veloci (il boss ne ha ${N_BOSS}). Parti con tre cuori: ogni errore o tempo scaduto ne toglie uno.</li>
      <li>Finisci il livello con i cuori che ti restano: sono le tue stelle. Zero cuori, livello da rifare.</li>
      <li>I primi mondi sono giochi semplici e leggeri; più sali, più compaiono i quesiti del test vero (matrici, serie, analogie, memoria, rotazioni) e meno tempo hai.</li>
      <li>I livelli non finiscono mai: dopo i dieci mondi della mappa se ne generano altri, sempre più duri. I progressi restano salvati su questo dispositivo${window.Account?' (e nel tuo account, se hai fatto l\'accesso)':''}.</li>
    </ul>
    <p class="hint">La storia serve ad allenarsi e divertirsi: non misura il QI. Per quello c'è il <a href="../test.html">test</a>.</p>
    <details><summary>Altro</summary><div class="body"><p class="hint">Risposte giuste: ${P.correct} su ${P.played}. Serie migliore: ${P.best}.</p><div class="actions"><a class="btn" href="../sfide/allenamento.html">Allenamento per area</a><a class="btn" href="../sfide/">Sfida un amico</a><button class="btn" data-act="reset">Azzera i progressi</button></div></div></details>
  </section>
  <p class="foot">Pagina gratuita, senza pubblicità. Le prove sono generate al momento: nessun livello è uguale a un altro.</p>`;
}
function rBrief(){
  const k=((S.L-1)%PER_WORLD)+1;const d=diffOf(S.L);
  const story=k===1?S.w.intro:S.boss?S.w.boss:CHEERS[(S.L*31)%CHEERS.length];
  const kinds=S.items.map(i=>i.kind).filter((x,i,a)=>a.indexOf(x)===i);
  return`<section class="card brief ${S.boss?'bossb':''}">
    <span class="eyebrow">Mondo ${S.w.id} · ${esc(S.w.n)} ${S.w.e}</span>
    <h1>${S.boss?'👑 Boss: ':''}Livello ${S.L}</h1>
    <p class="lede">${esc(story)}</p>
    <div class="kinds">${kinds.map(x=>`<span class="badge"><span class="e">${KIND_ICON[x]}</span>${KIND_NAME[x]}</span>`).join('')}</div>
    <div class="meter"><span>Difficoltà</span><div class="track"><i style="width:${Math.round(8+d*92)}%"></i></div><span class="mono">${Math.round(d*100)}%</span></div>
    <p class="hint">${S.items.length} prove · tre cuori · ${S.boss?'punti doppi':'da 10 a 30 punti a risposta'}${P.stars[S.L]?` · tuo record: ${starsHtml(P.stars[S.L])}`:''}</p>
    <div class="actions"><button class="btn primary big" data-act="go" autofocus>Via! →</button><button class="btn" data-act="quit">Torna alla mappa</button></div>
  </section>`;
}
function rQ(){
  const it=S.items[S.i];const f=S.fb;
  const cls=(k)=>f?(k===it.answer?'right':k===f.choice?'wrong':''):'';
  let body='';
  if(it.kind==='mem'){
    const instr=it.type==='back'?'Memorizza le cifre e scrivile al contrario.':'Memorizza i simboli: scrivi prima le cifre in ordine crescente, poi le lettere in ordine alfabetico.';
    if(S.phase==='show')body=`<p class="q">${instr}<span class="small">${it.len} simboli</span></p><div class="memshow" id="memShow"><span class="small">Pronto…</span></div>`;
    else body=`<p class="q">${instr}</p>${f?`<div class="memshow small">Sequenza: ${it.seq.join(' – ')}</div>`:''}<div class="field"><label for="memInput">${it.type==='back'?'Cifre in ordine inverso':'Prima le cifre, poi le lettere'}</label><input id="memInput" class="mem" type="text" inputmode="${it.type==='back'?'numeric':'text'}" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="${it.len}" placeholder="${'·'.repeat(it.len)}" ${f?'disabled value="'+esc(f.choice||'')+'"':''}></div>${f?'':'<div class="actions"><button class="btn primary" data-act="memOk">Conferma</button></div>'}`;
  }else if(MINI_ALL.includes(it.kind))body=miniHtml(it,{cls,dis:!!f,phase:S.phase});
  else body=itemHtml(it,{cls,dis:!!f,showAnswer:!!f});
  let fb='';
  if(f){
    if(f.ok)fb=`<div class="fb ok"><b>Giusto! +${f.pts}${S.streak>=4?` · 🔥 ${S.streak} di fila`:''}</b></div>`;
    else fb=`<div class="fb bad"><b>${f.choice===null?'Tempo scaduto!':'Ahi, sbagliato.'} ${S.hearts>0?'Perdi un cuore.':'Cuori finiti…'}</b><span>Risposta giusta: <b>${it.kind==='mem'?it.answer:LETTERS[it.answer]}</b>${it.rule?' · '+esc(it.rule):''}</span>${S.hearts>0?'<div class="actions"><button class="btn primary" id="nextBtn" data-act="next">Avanti →</button></div>':''}</div>`;
  }
  return`<section class="card qcard ${S.boss?'bossb':''}" id="qbox"><div class="qhead"><span class="eyebrow">${S.boss?'👑 Boss · ':''}Prova ${S.i+1} di ${S.items.length}</span><span class="badge small"><span class="e">${KIND_ICON[it.kind]}</span>${KIND_NAME[it.kind]}</span></div>${body}</section>${fb}`;
}
function rEnd(){
  const r=S.result;const nOk=S.log.filter(l=>l.ok).length;
  if(!r.won)return`<section class="final lost">
    <div class="bigemo">💔</div><div class="big">Cuori finiti!</div>
    <p class="sub">Livello ${S.L}: ${nOk} ${nOk===1?'prova giusta':'prove giuste'} su ${S.log.length}, ${S.pts} punti. Niente stelle stavolta, ma ogni errore spiegato è un passo avanti.</p>
    <div class="actions center"><button class="btn primary big" data-act="retry" autofocus>Riprova il livello</button><button class="btn" data-act="quit">Mappa</button></div></section>`;
  return`<section class="final won">
    <div class="bigemo">${r.bossWon?'🏆':r.stars===3?'🌟':'🎉'}</div>
    ${starsHtml(r.stars,true)}
    <div class="big">${r.bossWon?`Boss battuto! ${S.w.e}`:r.stars===3?'Perfetto!':'Livello superato!'}</div>
    <p class="sub">${nOk} su ${S.log.length} giuste · ${S.pts} punti${S.maxStreak>=3?` · serie di ${S.maxStreak}`:''}${r.newStars?` · <b>+${r.newStars} ${r.newStars===1?'stella':'stelle'}</b>`:' · record invariato'}</p>
    ${r.newRank?`<div class="rankup">Nuovo grado: ${r.newRank[2]} <b>${r.newRank[1]}</b></div>`:''}
    ${r.bossWon&&S.w.id===WORLDS.length?`<div class="rankup">Hai completato la mappa: da ora i mondi sono infiniti. 🌍</div>`:''}
    <div class="actions center"><button class="btn primary big" data-act="forward" autofocus>Livello ${S.L+1} →</button>${r.stars<3?'<button class="btn" data-act="retry">Riprova per 3 stelle</button>':''}<button class="btn" data-act="quit">Mappa</button></div>
    ${P.max>3?'<div class="actions center"><button class="btn ghost" id="shareBtn" data-act="share">Condividi il risultato</button></div>':''}
  </section>`;
}
window.Storia={get S(){return S},get P(){return P},startLevel,worldOf,diffOf};
render();
})();
