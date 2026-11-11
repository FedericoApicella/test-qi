// Parti comuni ai tre giochi a livelli (Sudoku, Mahjong, Queens):
// generatore casuale con seme, progressi in localStorage (testqi.giochi, sincronizzati dall'account),
// curva di difficoltà con tetto e impostazioni min/max, grafiche (skin) che cambiano ogni 25 livelli,
// schermate di vittoria, di "upgrade" grafico, scelta livello e impostazioni.
window.Giochi=(function(){
'use strict';
const FX=window.Effetti;
const KEY='testqi.giochi';
const LIV_PER_SKIN=25;           // ogni 25 livelli completati (in tutto, nei tre giochi) cambia la grafica
const CURVA=217;                 // livello 1 = difficoltà scelta, livello 1000 ≈ scelta + 0,99
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
  {id:'galassia',nome:'Galassia',ic:'🌌',desc:'Viola cosmico e stelle lontane: l’ultima frontiera.'},
  {id:'tramonto',nome:'Tramonto',ic:'🌅',desc:'Dal viola della sera all’arancio del sole che cala.'},
  {id:'caramella',nome:'Caramella',ic:'🍬',desc:'Rosa zucchero, righe e azzurro menta.'},
  {id:'retro',nome:'Schermo retrò',ic:'🕹️',desc:'Verde fosforo su nero, come i computer di una volta.'},
  {id:'sakura',nome:'Sakura',ic:'🌸',desc:'Petali rosa che cadono piano.'},
  {id:'ghiaccio',nome:'Ghiaccio',ic:'🧊',desc:'Azzurro gelido e riflessi di cristallo.'},
  {id:'deserto',nome:'Deserto',ic:'🏜️',desc:'Sabbia calda, terracotta e un’oasi turchese.'},
  {id:'mezzanotte',nome:'Mezzanotte',ic:'🌃',desc:'Blu profondo e argento.'},
  {id:'prato',nome:'Prato',ic:'🌼',desc:'Verde fresco e fiorellini gialli.'},
  {id:'prugna',nome:'Prugna e oro rosa',ic:'🍇',desc:'Viola scuro, rosa cipria e oro.'},
  {id:'abisso',nome:'Abisso',ic:'🐙',desc:'Nero profondo e verde acqua che brilla.'}
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
function fresh(){return{sudoku:{next:1,stelle:{},tempi:{},diff:1},mahjong:{next:1,stelle:{},tempi:{},diff:1},queens:{next:1,stelle:{},tempi:{},diff:1},imp:{skin:null,errori:true},upgradeVisto:0}}
function load(){const p=FX.load(KEY,null)||{};const f=fresh();const vecchiaMin=p.imp&&p.imp.min>1?p.imp.min:null;for(const g of Object.keys(GIOCHI)){const senza=!p[g]||p[g].diff==null;p[g]=Object.assign(f[g],p[g]||{});if(senza)p[g].diff=vecchiaMin||1;p[g].diff=Math.min(10,Math.max(1,Math.round(p[g].diff)))}for(const g of Object.keys(GIOCHI)){if(!p[g].per)p[g].per={};delete p[g].per[p[g].diff]}p.imp=Object.assign(f.imp,p.imp||{});delete p.imp.min;delete p.imp.max;if(p.upgradeVisto==null)p.upgradeVisto=0;if(SFIDA){for(const g of Object.keys(GIOCHI)){p[g].diff=SFIDA.d;p[g].next=SFIDA.l;delete p[g].corso}}return p}
// ---- modalità sfida (pagina aperta in un iframe da sfide/: ?sfida=1&d=D&l=L) ----
// parte subito dal livello L alla difficoltà D, non salva nulla, mostra solo tavolo e timer e parla col genitore via postMessage
const SFIDA=(()=>{try{const q=new URLSearchParams(location.search);if(q.get('sfida')!=='1')return null;return{d:Math.min(10,Math.max(1,Math.round(+q.get('d')||1))),l:Math.max(1,Math.round(+q.get('l')||1)),pct:-1,pronto:false,stop:false}}catch(e){return null}})();
if(SFIDA){window.SFIDA_OK=true;document.documentElement.classList.add('in-sfida');document.addEventListener('DOMContentLoaded',()=>document.body.classList.add('in-sfida'))}
function sfidaPost(o){if(!SFIDA||window.parent===window)return;try{window.parent.postMessage(o,location.origin)}catch(e){}}
function sfidaPronto(){if(!SFIDA||SFIDA.pronto)return;SFIDA.pronto=true;sfidaPost({sfida:'pronto'})}
function sfidaProgresso(pct){if(!SFIDA)return;if(!SFIDA.pronto)sfidaPronto();pct=Math.max(0,Math.min(100,Math.round(pct)));if(pct===SFIDA.pct)return;SFIDA.pct=pct;sfidaPost({sfida:'progresso',pct})}
function sfidaFatto(ms,errori,aiuti){if(!SFIDA)return;SFIDA.stop=true;sfidaProgresso(100);sfidaPost({sfida:'fatto',ms:Math.round(ms),errori:errori||0,aiuti:aiuti||0});FX.beep('win');document.body.classList.add('sfida-stop')}
function sfidaResa(){if(!SFIDA)return;SFIDA.stop=true;timerStop();sfidaPost({sfida:'resa'});document.body.classList.add('sfida-stop')}
function sfidaBlocca(){if(!SFIDA)return;SFIDA.stop=true;timerStop();document.body.classList.add('sfida-stop');if(window.Giochi.onStop)window.Giochi.onStop()}
if(SFIDA)window.addEventListener('message',e=>{if(e.origin!==location.origin||!e.data||e.data.sfida!=='stop')return;sfidaBlocca()});
function save(p){if(SFIDA)return;FX.save(KEY,p)}
// ogni difficoltà ha i suoi livelli: i campi next/stelle/tempi/corso sono quelli della difficoltà attiva, gli altri stanno in per[diff]
const tutti=(p,g)=>[p[g]].concat(Object.values(p[g].per||{}));
function totale(p){return Object.keys(GIOCHI).reduce((n,g)=>n+tutti(p,g).reduce((m,r)=>m+Object.keys(r.stelle||{}).length,0),0)}
function stelleTot(p){return Object.keys(GIOCHI).reduce((n,g)=>n+tutti(p,g).reduce((m,r)=>m+Object.values(r.stelle||{}).reduce((a,b)=>a+b,0),0),0)}
function cambiaDiff(p,g,nuova){const q=p[g];if(q.diff===nuova)return;q.per=q.per||{};q.per[q.diff]={next:q.next,stelle:q.stelle,tempi:q.tempi,corso:q.corso};const r=q.per[nuova]||{next:1,stelle:{},tempi:{}};delete q.per[nuova];q.next=r.next||1;q.stelle=r.stelle||{};q.tempi=r.tempi||{};if(r.corso)q.corso=r.corso;else delete q.corso;q.diff=nuova}

// ---- difficoltà: si sceglie un numero da 1 a 10 per ogni gioco; i livelli salgono pianissimo
// dentro quella fascia (scelta 6: livello 1 = 6,00, livello 100 ≈ 6,37, livello 1000 ≈ 6,99) senza mai uscirne ----
function diffOf(level,base){const b=Math.min(10,Math.max(1,+base||1));return b+0.995*(1-Math.exp(-(level-1)/CURVA))}
const d01=(diff)=>Math.min(1,Math.max(0,(diff-1)/9.995));
const DIFF_NOMI=['Facilissimo','Facile','Tranquillo','Medio','Impegnativo','Difficile','Molto difficile','Durissimo','Estremo','Impossibile'];
const nomeBase=(b)=>DIFF_NOMI[Math.min(9,Math.max(0,Math.round(b)-1))];
// selettore 1..10 condiviso (stesso aspetto negli altri giochi del sito)
function diffPickerHtml(id,val,label){const cls=(n)=>n<=3?'d-easy':n<=6?'d-mid':n<=8?'d-hard':'d-max';return`<div class="g-diffpick">${label===false?'':`<span class="hint">Difficoltà <b class="g-diff-v">${val}</b> · <span class="g-diff-n">${esc(nomeBase(val))}</span></span>`}<div class="g-diff" id="${id}" role="radiogroup">${[1,2,3,4,5,6,7,8,9,10].map(n=>`<button type="button" class="g-diff-b ${cls(n)} ${n===val?'on':''}" data-v="${n}" aria-pressed="${n===val}" title="${esc(nomeBase(n))}">${n}</button>`).join('')}</div></div>`}
function stelleDiff(diff){const n=Math.round(diff/2);return'★'.repeat(Math.max(1,n))+'☆'.repeat(5-Math.max(1,n))}
const nomeDiff=(diff)=>nomeBase(Math.floor(diff));

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
  const diff=diffOf(level,p[game].diff);const best=p[game].tempi[level];
  const o=overlay(`<div class="g-win">
    <div class="eyebrow">${esc(GIOCHI[game].nome)} · livello ${level} · ${esc(nomeDiff(diff))}</div>
    <h2>${stelle>=3?'Perfetto!':stelle===2?'Ottimo!':'Completato!'}</h2>
    ${stelleHtml(stelle)}
    <div class="g-win-meta"><span>⏱️ ${fmt(ms)}</span>${best&&best<ms?`<span>🏆 record ${fmt(best)}</span>`:'<span>🏆 nuovo record</span>'}${opts&&opts.nota?`<span>${esc(opts.nota)}</span>`:''}</div>
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
    <p class="hint">${esc(s.desc)}<br>Da adesso Sudoku, Mahjong e Queens hanno questo aspetto. Nelle impostazioni puoi tornare a quelle precedenti quando vuoi.</p>
    <button class="btn primary big" id="gUpOk">Che bello! →</button>
  </div>`,'upgrade');
  o.dataset.lock='1';FX.beep('level');setTimeout(()=>FX.confetti(160),250);
  $('#gUpOk',o).addEventListener('click',()=>{document.body.classList.add('g-skin-anim');applySkin(p);setTimeout(()=>document.body.classList.remove('g-skin-anim'),1200);chiudi();if(poi)poi()});
}

// ---- scelta livello ----
function sceltaLivello(p,game,onPick){
  const g=p[game];const max=Math.max(g.next,1);const da=Math.max(1,Math.min(max-7,Math.floor((max-1)/10)*10+1));const fino=da+19;
  let html='';for(let L=da;L<=fino;L++){const s=g.stelle[L];const cur=L===g.next;const lock=L>g.next;const d=diffOf(L,p[game].diff);
    html+=`<button class="g-lv ${s?'done':''} ${cur?'cur':''} ${lock?'lock':''}" data-l="${L}" ${lock?'disabled':''} title="${esc(nomeDiff(d))}"><b>${lock?'🔒':L}</b><i>${s?'★'.repeat(s)+'☆'.repeat(3-s):cur?'gioca':''}</i></button>`}
  const o=overlay(`<div class="g-pick"><div class="sec-head"><h2>${GIOCHI[game].ic} Livelli</h2><span class="hint">${Object.keys(g.stelle).length} completati</span></div>
    <div class="g-lvs">${html}</div><div class="hint">I livelli sono infiniti: giochi alla difficoltà ${p[game].diff}/10 scelta nelle impostazioni e dentro quella fascia i livelli salgono pianissimo.</div>
    <div class="actions"><button class="btn" id="gPickClose">Chiudi</button></div></div>`);
  o.querySelectorAll('.g-lv:not(.lock)').forEach(b=>b.addEventListener('click',()=>{chiudi();onPick(+b.dataset.l)}));
  $('#gPickClose',o).addEventListener('click',chiudi);
}

// ---- impostazioni ----
function impostazioni(p,onChange,game,senzaDiff){
  const t=tierOf(p);
  const skins=[];for(let i=0;i<=t;i++){skins.push(skinInfo(i))}
  const giochi=senzaDiff?[]:game?[game]:Object.keys(GIOCHI);
  const diffHtml=giochi.map(g=>`<div class="field"><label>${game?'Difficoltà':GIOCHI[g].ic+' '+esc(GIOCHI[g].nome)}: <b class="mono" id="vD_${g}">${p[g].diff}</b>/10 · <span id="nD_${g}">${esc(nomeBase(p[g].diff))}</span></label>${diffPickerHtml('d_'+g,p[g].diff,false)}</div>`).join('');
  const o=overlay(`<div class="g-set"><h2>⚙️ Impostazioni</h2>
    ${diffHtml}
    ${giochi.length?`<div class="hint">Scegli un numero da 1 a 10 e giochi a quella difficoltà finché vuoi: il livello 1 parte esattamente lì e i livelli salgono pianissimo dentro la fascia (con 6, il livello 1000 è circa 6,99) senza mai passare al numero dopo. Ogni difficoltà tiene i suoi livelli: se alla 5 sei al 20 e passi alla 6 riparti dall’1, e tornando alla 5 ritrovi il 20.</div>`:''}
    <div class="field"><label class="checks"><label><input type="checkbox" id="cErr" ${p.imp.errori?'checked':''}> Segnala subito gli errori (nel Sudoku e in Queens)</label></label></div>
    <div class="field"><label>Grafica</label><div class="g-skins">${skins.map(s=>`<button class="g-skin ${(p.imp.skin==null?s.tier===t:p.imp.skin===s.tier)?'on':''}" data-t="${s.tier}"><span>${s.ic}</span>${esc(s.nome)}</button>`).join('')}</div>
    <div class="hint">${skins.length>1?'Scegli una delle grafiche che hai sbloccato giocando.':'Continua a giocare: prima o poi arriverà una sorpresa.'}</div></div>
    <div class="actions"><button class="btn primary" id="gSetOk">Salva</button><button class="btn" id="gSetNo">Annulla</button></div></div>`);
  const diffSel={};giochi.forEach(g=>{diffSel[g]=p[g].diff;const box=$('#d_'+g,o);box.addEventListener('click',e=>{const b=e.target.closest('.g-diff-b');if(!b)return;diffSel[g]=+b.dataset.v;box.querySelectorAll('.g-diff-b').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b)});$('#vD_'+g,o).textContent=diffSel[g];$('#nD_'+g,o).textContent=nomeBase(diffSel[g]);FX.beep('tick')})});
  let skinSel=p.imp.skin;
  o.querySelectorAll('.g-skin').forEach(b=>b.addEventListener('click',()=>{o.querySelectorAll('.g-skin').forEach(x=>x.classList.remove('on'));b.classList.add('on');skinSel=+b.dataset.t;if(skinSel===t)skinSel=null}));
  $('#gSetNo',o).addEventListener('click',chiudi);
  $('#gSetOk',o).addEventListener('click',()=>{giochi.forEach(g=>cambiaDiff(p,g,diffSel[g]));p.imp.errori=$('#cErr',o).checked;p.imp.skin=skinSel;save(p);applySkin(p);chiudi();FX.beep('ok');if(onChange)onChange()});
}

function aiuto(titolo,html){const o=overlay(`<div class="g-help"><h2>${esc(titolo)}</h2>${html}<div class="actions"><button class="btn primary" id="gHelpOk">Ho capito</button></div></div>`);$('#gHelpOk',o).addEventListener('click',chiudi)}

// ---- intestazione comune alla pagina di gioco ----
function intestazione(p,game,level,extra){
  const diff=diffOf(level,p[game].diff);
  $('#barScores').innerHTML=`<span class="sc me" style="white-space:nowrap"><span class="v">Liv. ${level}</span></span>`;
  $('#gMeta').innerHTML=`<span title="${esc(nomeDiff(diff))}">${stelleDiff(diff)} ${esc(nomeDiff(diff))} ${diff.toFixed(2)}/10</span>${extra?`<span>${extra}</span>`:''}`;
  document.title=`${GIOCHI[game].nome} · livello ${level} · Mente Allenata`;
}
function bottoniComuni(getP,game,opts){ // getP: funzione che restituisce i progressi attuali (l'oggetto può essere ricaricato)
  $('#gBtns').innerHTML=`<button class="btn icon" id="bLv" title="Livelli" aria-label="Livelli">🗺️</button><button class="btn icon" id="bSet" title="Impostazioni" aria-label="Impostazioni">⚙️</button><button class="btn icon" id="bHelp" title="Come si gioca" aria-label="Come si gioca">❓</button>`;
  if(SFIDA){$('#gBtns').innerHTML=`<button class="btn" id="bResa">🏳️ Mi arrendo</button>`;$('#bResa').addEventListener('click',()=>{if(SFIDA.stop)return;if(confirm('Vuoi arrenderti? La sfida finisce qui.')){sfidaResa();if(window.Giochi.onStop)window.Giochi.onStop()}});return}
  $('#bLv').addEventListener('click',()=>sceltaLivello(getP(),game,opts.vai));
  $('#bSet').addEventListener('click',()=>impostazioni(getP(),opts.ricarica,game));
  $('#bHelp').addEventListener('click',opts.aiuto);
}
function livelloDaUrl(p,game){if(SFIDA)return SFIDA.l;const m=location.hash.match(/liv(?:ello)?=(\d+)/);if(m){const L=+m[1];if(L>=1&&L<=p[game].next)return L}return p[game].next}

// risincronizzazione dall'account: le altre pagine rileggono i progressi
window.addEventListener('testqi:account',e=>{if(e.detail&&e.detail.chiavi&&e.detail.chiavi.indexOf(KEY)>=0&&window.Giochi.onSync)window.Giochi.onSync()});

return{SFIDA,sfidaPronto,sfidaProgresso,sfidaFatto,sfidaResa,SKINS,GIOCHI,LIV_PER_SKIN,rng,hash,load,save,totale,stelleTot,diffOf,d01,cambiaDiff,nomeDiff,nomeBase,stelleDiff,diffPickerHtml,tierOf,skinInfo,skinCorrente,applySkin,prossimoUpgrade,timerStart,timerStop,timerElapsed,fmt,completa,vittoria,mostraUpgrade,sceltaLivello,impostazioni,aiuto,overlay,chiudi,intestazione,bottoniComuni,livelloDaUrl,esc,stelleHtml};
})();
