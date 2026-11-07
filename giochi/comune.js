// Parti comuni ai tre giochi a livelli (Sudoku, Mahjong, Queens):
// generatore casuale con seme, progressi in localStorage (testqi.giochi, sincronizzati dall'account),
// curva di difficoltà con tetto e impostazioni min/max, grafiche (skin) che cambiano ogni 25 livelli,
// schermate di vittoria, di "upgrade" grafico, scelta livello e impostazioni.
window.Giochi=(function(){
'use strict';
const FX=window.Effetti;
const KEY='testqi.giochi';
const LIV_PER_SKIN=25;           // ogni 25 livelli completati (in tutto, nei tre giochi) cambia la grafica
const CURVA=40;                  // più è alto, più lentamente sale la difficoltà
const SKINS=[
  {id:'viola',nome:'Classico viola',ic:'💜',desc:'La grafica di partenza: pulita e luminosa.'},
  {id:'notte',nome:'Notte stellata',ic:'🌙',desc:'Blu profondo e luci calde: si gioca anche al buio.'},
  {id:'legno',nome:'Legno caldo',ic:'🌳',desc:'Tavole di legno e carta avorio, come un gioco da tavolo.'},
  {id:'oceano',nome:'Oceano',ic:'🌊',desc:'Azzurri e turchesi freschi come l’acqua.'},
  {id:'neon',nome:'Neon',ic:'⚡',desc:'Sfondo nero e colori fluo che brillano.'},
  {id:'oro',nome:'Oro reale',ic:'👑',desc:'Bordeaux e oro: degno di una regina.'},
  {id:'foresta',nome:'Foresta',ic:'🍃',desc:'Verdi profondi e muschio.'},
  {id:'cristallo',nome:'Cristallo',ic:'💎',desc:'Vetro, riflessi e rosa ghiaccio.'},
  {id:'lava',nome:'Lava',ic:'🌋',desc:'Roccia scura e magma incandescente.'},
  {id:'galassia',nome:'Galassia',ic:'🌌',desc:'Viola cosmico e stelle lontane: l’ultima frontiera.'}
];
const GIOCHI={sudoku:{nome:'Sudoku',ic:'🔢',file:'sudoku.html'},mahjong:{nome:'Mahjong',ic:'🀄',file:'mahjong.html'},queens:{nome:'Queens',ic:'👑',file:'queens.html'}};
const ROMANI=['','II','III','IV','V','VI','VII','VIII','IX','X'];
const esc=(s)=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const $=(s,r)=>(r||document).querySelector(s);

// ---- casuale con seme (mulberry32 su hash della stringa) ----
function hash(str){let h=1779033703^str.length;for(let i=0;i<str.length;i++){h=Math.imul(h^str.charCodeAt(i),3432918353);h=h<<13|h>>>19}h=Math.imul(h^(h>>>16),2246822507);h=Math.imul(h^(h>>>13),3266489909);return(h^(h>>>16))>>>0}
function rng(seed){let a=typeof seed==='number'?seed>>>0:hash(String(seed));const r=function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^(a>>>15),1|a);t=t+Math.imul(t^(t>>>7),61|t)^t;return((t^(t>>>14))>>>0)/4294967296};
  r.int=(n)=>Math.floor(r()*n);r.pick=(arr)=>arr[Math.floor(r()*arr.length)];r.shuffle=(arr)=>{for(let i=arr.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]]}return arr};return r}

// ---- progressi ----
function fresh(){return{sudoku:{next:1,stelle:{},tempi:{}},mahjong:{next:1,stelle:{},tempi:{}},queens:{next:1,stelle:{},tempi:{}},imp:{min:1,max:7,skin:null,errori:true},upgradeVisto:0}}
function load(){const p=FX.load(KEY,null)||{};const f=fresh();for(const g of Object.keys(GIOCHI)){p[g]=Object.assign(f[g],p[g]||{})}p.imp=Object.assign(f.imp,p.imp||{});if(p.upgradeVisto==null)p.upgradeVisto=0;return p}
function save(p){FX.save(KEY,p)}
function totale(p){return Object.keys(GIOCHI).reduce((n,g)=>n+Object.keys(p[g].stelle).length,0)}
function stelleTot(p){return Object.keys(GIOCHI).reduce((n,g)=>n+Object.values(p[g].stelle).reduce((a,b)=>a+b,0),0)}

// ---- difficoltà: 1..10, sale con il livello e si ferma al tetto scelto nelle impostazioni ----
function diffOf(level,imp){const raw=1+9*(1-Math.exp(-(level-1)/CURVA));const lo=Math.min(imp.min,imp.max),hi=Math.max(imp.min,imp.max);return Math.min(hi,Math.max(lo,raw))}
const d01=(diff)=>(diff-1)/9;
function stelleDiff(diff){const n=Math.round(diff/2);return'★'.repeat(Math.max(1,n))+'☆'.repeat(5-Math.max(1,n))}
const nomeDiff=(diff)=>diff<2.5?'Facile':diff<4.5?'Tranquillo':diff<6.5?'Medio':diff<8.5?'Difficile':'Estremo';

// ---- grafiche ----
function tierOf(p){return Math.floor(totale(p)/LIV_PER_SKIN)}
function skinInfo(tier){const i=tier%SKINS.length,era=Math.floor(tier/SKINS.length);const s=SKINS[i];return{tier,id:s.id,ic:s.ic,desc:s.desc,nome:s.nome+(era?' '+(ROMANI[era]||era+1):''),era}}
function skinCorrente(p){const t=tierOf(p);const scelta=p.imp.skin;const use=(scelta!=null&&scelta<=t)?scelta:t;return skinInfo(use)}
function applySkin(p){const s=skinCorrente(p);document.body.dataset.skin=s.id;document.body.dataset.era=s.era;return s}
function prossimoUpgrade(p){const t=totale(p);return LIV_PER_SKIN-(t%LIV_PER_SKIN)}

// ---- timer nella barra ----
let t0=0,tInt=null,tEl=null,tPausa=0;
const fmt=(ms)=>{const s=Math.max(0,Math.round(ms/1000));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')};
function timerStart(el,offset){tEl=el;t0=Date.now()-(offset||0);tPausa=0;if(tInt)clearInterval(tInt);el.classList.remove('hidden-timer');el.textContent=fmt(offset||0);tInt=setInterval(()=>{el.textContent=fmt(Date.now()-t0)},500)}
function timerElapsed(){return(tPausa?tPausa:Date.now())-t0}
function timerStop(){if(tInt)clearInterval(tInt);tInt=null;return timerElapsed()}
document.addEventListener('visibilitychange',()=>{if(!tInt&&!tEl)return;if(document.hidden){tPausa=Date.now()}else if(tPausa){t0+=Date.now()-tPausa;tPausa=0}});

// ---- completamento livello ----
function completa(p,game,level,stelle,ms){
  const g=p[game];const prima=tierOf(p);
  g.stelle[level]=Math.max(g.stelle[level]||0,stelle);
  if(!g.tempi[level]||ms<g.tempi[level])g.tempi[level]=ms;
  if(level>=g.next)g.next=level+1;
  save(p);const dopo=tierOf(p);
  return{upgrade:dopo>prima&&p.imp.skin==null,tier:dopo};
}

// ---- schermate (overlay) ----
function overlay(html,cls){chiudi();const o=document.createElement('div');o.className='g-ov '+(cls||'');o.id='gOv';o.innerHTML=`<div class="g-ov-in">${html}</div>`;document.body.appendChild(o);o.addEventListener('click',e=>{if(e.target===o&&o.dataset.lock!=='1')chiudi()});return o}
function chiudi(){const o=document.getElementById('gOv');if(o)o.remove()}
const stelleHtml=(n)=>`<div class="g-stars">${[1,2,3].map(i=>`<span class="${i<=n?'on':''}" style="animation-delay:${i*0.18}s">★</span>`).join('')}</div>`;

function vittoria(p,game,level,stelle,ms,opts){
  const res=completa(p,game,level,stelle,ms);
  FX.beep('win');FX.confetti(stelle>=3?140:70);
  const diff=diffOf(level,p.imp);const best=p[game].tempi[level];
  const nextUp=prossimoUpgrade(p);
  const o=overlay(`<div class="g-win">
    <div class="eyebrow">${esc(GIOCHI[game].nome)} · livello ${level} · ${esc(nomeDiff(diff))}</div>
    <h2>${stelle>=3?'Perfetto!':stelle===2?'Ottimo!':'Completato!'}</h2>
    ${stelleHtml(stelle)}
    <div class="g-win-meta"><span>⏱️ ${fmt(ms)}</span>${best&&best<ms?`<span>🏆 record ${fmt(best)}</span>`:'<span>🏆 nuovo record</span>'}${opts&&opts.nota?`<span>${esc(opts.nota)}</span>`:''}</div>
    ${res.upgrade?'':`<div class="hint">${nextUp===LIV_PER_SKIN?'':'Nuova grafica tra '+nextUp+' livell'+(nextUp===1?'o':'i')+' (in qualsiasi gioco).'}</div>`}
    <div class="actions"><button class="btn primary big" id="gNext">Livello ${level+1} →</button><button class="btn" id="gAgain">Rigioca</button><a class="btn" href="./">Altri giochi</a></div>
  </div>`,'win');
  o.dataset.lock='1';
  $('#gNext',o).addEventListener('click',()=>{chiudi();if(res.upgrade)mostraUpgrade(p,res.tier,()=>opts.next(level+1));else opts.next(level+1)});
  $('#gAgain',o).addEventListener('click',()=>{chiudi();opts.next(level)});
  return res;
}

function mostraUpgrade(p,tier,poi){
  const s=skinInfo(tier);p.upgradeVisto=tier;save(p);
  const o=overlay(`<div class="g-up">
    <div class="g-up-rays"></div>
    <div class="g-up-badge">UPGRADE</div>
    <div class="g-up-ic">${s.ic}</div>
    <h2>Nuova grafica sbloccata</h2>
    <div class="g-up-name">${esc(s.nome)}</div>
    <p class="hint">${esc(s.desc)}<br>Da adesso Sudoku, Mahjong e Queens hanno questo aspetto. Nelle impostazioni puoi tornare alle grafiche precedenti quando vuoi.</p>
    <button class="btn primary big" id="gUpOk">Che bello! →</button>
  </div>`,'upgrade');
  o.dataset.lock='1';FX.beep('level');setTimeout(()=>FX.confetti(160),250);
  $('#gUpOk',o).addEventListener('click',()=>{document.body.classList.add('g-skin-anim');applySkin(p);setTimeout(()=>document.body.classList.remove('g-skin-anim'),1200);chiudi();if(poi)poi()});
}

// ---- scelta livello ----
function sceltaLivello(p,game,onPick){
  const g=p[game];const max=Math.max(g.next,1);const da=Math.max(1,Math.min(max-7,Math.floor((max-1)/10)*10+1));const fino=da+19;
  let html='';for(let L=da;L<=fino;L++){const s=g.stelle[L];const cur=L===g.next;const lock=L>g.next;const d=diffOf(L,p.imp);
    html+=`<button class="g-lv ${s?'done':''} ${cur?'cur':''} ${lock?'lock':''}" data-l="${L}" ${lock?'disabled':''} title="${esc(nomeDiff(d))}"><b>${lock?'🔒':L}</b><i>${s?'★'.repeat(s)+'☆'.repeat(3-s):cur?'gioca':''}</i></button>`}
  const o=overlay(`<div class="g-pick"><div class="sec-head"><h2>${GIOCHI[game].ic} Livelli</h2><span class="hint">${Object.keys(g.stelle).length} completati</span></div>
    <div class="g-lvs">${html}</div><div class="hint">I livelli sono infiniti: la difficoltà sale piano e si ferma al tetto scelto nelle impostazioni (ora ${p.imp.max}/10).</div>
    <div class="actions"><button class="btn" id="gPickClose">Chiudi</button></div></div>`);
  o.querySelectorAll('.g-lv:not(.lock)').forEach(b=>b.addEventListener('click',()=>{chiudi();onPick(+b.dataset.l)}));
  $('#gPickClose',o).addEventListener('click',chiudi);
}

// ---- impostazioni ----
function impostazioni(p,onChange){
  const t=tierOf(p);
  const skins=[];for(let i=0;i<=t;i++){skins.push(skinInfo(i))}
  const o=overlay(`<div class="g-set"><h2>⚙️ Impostazioni</h2>
    <div class="field"><label>Difficoltà minima: <b id="vMin" class="mono">${p.imp.min}</b>/10</label><input type="range" id="rMin" min="1" max="10" value="${p.imp.min}"></div>
    <div class="field"><label>Difficoltà massima (tetto): <b id="vMax" class="mono">${p.imp.max}</b>/10</label><input type="range" id="rMax" min="1" max="10" value="${p.imp.max}"></div>
    <div class="hint">Di base i livelli partono facili e salgono fino a 7/10, poi restano lì. Alza il tetto a 10 se vuoi livelli super difficili, o alza la minima se vuoi saltare quelli facili. Vale per tutti e tre i giochi.</div>
    <div class="field"><label class="checks"><label><input type="checkbox" id="cErr" ${p.imp.errori?'checked':''}> Segnala subito gli errori (nel Sudoku e in Queens)</label></label></div>
    <div class="field"><label>Grafica</label><div class="g-skins">${skins.map(s=>`<button class="g-skin ${(p.imp.skin==null?s.tier===t:p.imp.skin===s.tier)?'on':''}" data-t="${s.tier}"><span>${s.ic}</span>${esc(s.nome)}</button>`).join('')}</div>
    <div class="hint">Sbloccate ${skins.length} su infinite: una nuova ogni ${LIV_PER_SKIN} livelli completati nei tre giochi (ne mancano ${prossimoUpgrade(p)}).</div></div>
    <div class="actions"><button class="btn primary" id="gSetOk">Salva</button><button class="btn" id="gSetNo">Annulla</button></div></div>`);
  const rMin=$('#rMin',o),rMax=$('#rMax',o);
  rMin.addEventListener('input',()=>{$('#vMin',o).textContent=rMin.value;if(+rMax.value<+rMin.value){rMax.value=rMin.value;$('#vMax',o).textContent=rMax.value}});
  rMax.addEventListener('input',()=>{$('#vMax',o).textContent=rMax.value;if(+rMin.value>+rMax.value){rMin.value=rMax.value;$('#vMin',o).textContent=rMin.value}});
  let skinSel=p.imp.skin;
  o.querySelectorAll('.g-skin').forEach(b=>b.addEventListener('click',()=>{o.querySelectorAll('.g-skin').forEach(x=>x.classList.remove('on'));b.classList.add('on');skinSel=+b.dataset.t;if(skinSel===t)skinSel=null}));
  $('#gSetNo',o).addEventListener('click',chiudi);
  $('#gSetOk',o).addEventListener('click',()=>{p.imp.min=+rMin.value;p.imp.max=+rMax.value;p.imp.errori=$('#cErr',o).checked;p.imp.skin=skinSel;save(p);applySkin(p);chiudi();FX.beep('ok');if(onChange)onChange()});
}

function aiuto(titolo,html){const o=overlay(`<div class="g-help"><h2>${esc(titolo)}</h2>${html}<div class="actions"><button class="btn primary" id="gHelpOk">Ho capito</button></div></div>`);$('#gHelpOk',o).addEventListener('click',chiudi)}

// ---- intestazione comune alla pagina di gioco ----
function intestazione(p,game,level,extra){
  const diff=diffOf(level,p.imp);const s=skinCorrente(p);
  $('#barScores').innerHTML=`<span class="sc me" style="white-space:nowrap"><span class="v">Liv. ${level}</span></span>`;
  $('#gMeta').innerHTML=`<span title="${esc(nomeDiff(diff))}">${stelleDiff(diff)} ${esc(nomeDiff(diff))}</span><span>${s.ic} ${esc(s.nome)}</span>${extra?`<span>${extra}</span>`:''}`;
  document.title=`${GIOCHI[game].nome} · livello ${level} · Mente Allenata`;
}
function bottoniComuni(getP,game,opts){ // getP: funzione che restituisce i progressi attuali (l'oggetto può essere ricaricato)
  $('#gBtns').innerHTML=`<button class="btn icon" id="bLv" title="Livelli" aria-label="Livelli">🗺️</button><button class="btn icon" id="bSet" title="Impostazioni" aria-label="Impostazioni">⚙️</button><button class="btn icon" id="bHelp" title="Come si gioca" aria-label="Come si gioca">❓</button>`;
  $('#bLv').addEventListener('click',()=>sceltaLivello(getP(),game,opts.vai));
  $('#bSet').addEventListener('click',()=>impostazioni(getP(),opts.ricarica));
  $('#bHelp').addEventListener('click',opts.aiuto);
}
function livelloDaUrl(p,game){const m=location.hash.match(/liv(?:ello)?=(\d+)/);if(m){const L=+m[1];if(L>=1&&L<=p[game].next)return L}return p[game].next}

// risincronizzazione dall'account: le altre pagine rileggono i progressi
window.addEventListener('testqi:account',e=>{if(e.detail&&e.detail.chiavi&&e.detail.chiavi.indexOf(KEY)>=0&&window.Giochi.onSync)window.Giochi.onSync()});

return{SKINS,GIOCHI,LIV_PER_SKIN,rng,hash,load,save,totale,stelleTot,diffOf,d01,nomeDiff,stelleDiff,tierOf,skinInfo,skinCorrente,applySkin,prossimoUpgrade,timerStart,timerStop,timerElapsed,fmt,completa,vittoria,mostraUpgrade,sceltaLivello,impostazioni,aiuto,overlay,chiudi,intestazione,bottoniComuni,livelloDaUrl,esc,stelleHtml};
})();
