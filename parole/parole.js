// Parole crociate infinite: "Parola nascosta" e cruciverba classici,
// generati in italiano dal dizionario del sito con un seme per livello (ogni livello è sempre uguale per tutti).
(function(){
'use strict';
const $=(s)=>document.querySelector(s);
const esc=(s)=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const FX=window.Effetti,AB=window.Abilita;
const KEY='testqi.parole';
const TEMI={animali:'Animali',cibo:'Cibo e cucina',geo:'Geografia',viaggio:'Viaggi',natura:'Natura e cielo',tempo:'Tempo e feste',corpo:'Corpo e salute',casa:'Casa',oggetti:'Oggetti',abiti:'Vestiti',lavoro:'Mestieri',scuola:'Scuola',arte:'Arte e fantasia',sport:'Sport',scienza:'Scienza',verbi:'Verbi',aggettivi:'Aggettivi',emozioni:'Emozioni e persone'};
const FREE_HINTS=3,HINT_COST=25;

// ---------- dizionario ----------
const WORDS={};const BY_LEN={};
(window.DIZIONARIO||[]).forEach(([w,d,t,df])=>{if(!/^[A-Z]{2,}$/.test(w))return;if(!WORDS[w])WORDS[w]={w,defs:[],temi:new Set(),diff:df||1};WORDS[w].defs.push(d);WORDS[w].temi.add(t);WORDS[w].diff=Math.min(WORDS[w].diff,df||1)});
Object.values(WORDS).forEach(x=>{x.temi=[...x.temi];(BY_LEN[x.w.length]=BY_LEN[x.w.length]||[]).push(x)});
const ALL=Object.values(WORDS);

// ---------- caso con seme ----------
function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function rng(seed){let a=seed>>>0;return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function shuffle(arr,r){const a=arr.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
const pick=(arr,r)=>arr[Math.floor(r()*arr.length)];
const DIFF_DEF=4;
// difficoltà fissa scelta dal giocatore (1-10): il livello 1 vale D, il livello 1000 circa D+0,99. d01 = 0..1 per i generatori.
const diffEff=(D,L)=>(D-1)+0.99*(1-Math.exp(-(L-1)/300));
const d01Of=(D,L)=>Math.min(1,diffEff(D,L)/10);
const NOMI_DIFF=['','Facilissimo','Facile','Tranquillo','Normale','Medio','Impegnativo','Difficile','Molto difficile','Esperto','Estremo'];

// ---------- progressi ----------
function loadP(){const p=Object.assign({cody:{},cruci:{},critto:{},giorno:{},punti:0,parole:0,best:0},FX.load(KEY,{}));
  for(const m of ['cody','cruci','critto']){const g=p[m];if(!g.liv){g.liv={};if(g.max){g.liv[DIFF_DEF]={max:g.max,done:g.done||{}}}delete g.max;delete g.done}if(!g.d)g.d=DIFF_DEF}
  return p}
const livDi=(mode,D)=>{const g=P[mode];if(!g.liv[D])g.liv[D]={max:1,done:{}};return g.liv[D]};
const SFIDA=new URLSearchParams(location.search).get('sfida')==='1'; // sfida a due dentro un iframe di sfide/: nessun salvataggio
let P=loadP();const saveP=()=>{if(!SFIDA)FX.save(KEY,P)};
window.addEventListener('testqi:account',()=>{P=loadP();if(!S)render()});

// ---------- generatore "parola nascosta" ----------
function buildCody(seed,d){
  const r=rng(seed);
  const hidLen=Math.min(9,4+Math.floor(d*6));
  const maxDiff=d<.3?1:d<.7?2:3;
  const okDiff=(x)=>x.diff<=maxDiff;
  let cands=(BY_LEN[hidLen]||[]).filter(okDiff);if(cands.length<10)cands=ALL.filter(x=>x.w.length>=4&&x.w.length<=hidLen&&okDiff(x));
  const hidden=pick(cands,r);
  // tema del livello: quello della parola nascosta, oppure un altro a caso
  const tema=r()<.6?pick(hidden.temi,r):pick(Object.keys(TEMI),r);
  const used=new Set([hidden.w]);const rows=[];
  const maxLen=Math.min(10,6+Math.floor(d*5));
  for(let i=0;i<hidden.w.length;i++){
    const ch=hidden.w[i];
    const pool=(strict)=>ALL.filter(x=>!used.has(x.w)&&x.w.includes(ch)&&x.w.length>=4&&x.w.length<=maxLen&&okDiff(x)&&(!strict||x.temi.includes(tema)));
    let c=pool(true);if(c.length<3)c=pool(false);if(!c.length)c=ALL.filter(x=>!used.has(x.w)&&x.w.includes(ch));
    const x=pick(c,r);used.add(x.w);
    const idxs=[];for(let k=0;k<x.w.length;k++)if(x.w[k]===ch)idxs.push(k);
    rows.push({w:x.w,def:pick(x.defs,r),idxs});
  }
  // scegli la posizione della lettera chiave in modo da tenere le righe compatte (poco scorrimento sul telefono)
  const target=Math.round(rows.reduce((a,x)=>a+x.w.length,0)/rows.length/2)-1;
  rows.forEach(x=>{x.k=x.idxs.reduce((b,k)=>Math.abs(k-target)<Math.abs(b-target)?k:b,x.idxs[0]);delete x.idxs});
  const maxK=Math.max(...rows.map(x=>x.k));
  rows.forEach(x=>{x.off=maxK-x.k});
  return{hidden:hidden.w,hiddenDef:pick(hidden.defs,r),tema,rows,maxK,width:Math.max(...rows.map(x=>x.off+x.w.length))};
}

// ---------- generatore cruciverba classico ----------
function buildCruci(seed,d){
  // più tentativi con semi diversi: si tiene la griglia con più parole
  const n=d<.4?6:d<.7?4:2;let best=null;for(let i=0;i<n;i++){const z=buildCruciOnce(seed+i*7919,d);if(!best||z.slots.length>best.slots.length)best=z}return best;
}
function buildCruciOnce(seed,d){
  const r=rng(seed);
  const N=7+Math.round(d*6);
  const maxDiff=d<.3?1:d<.7?2:3;
  const g=Array.from({length:N},()=>Array(N).fill(null));
  const placed=[];const usedW=new Set();
  const inb=(y,x)=>y>=0&&y<N&&x>=0&&x<N;
  const at=(y,x)=>inb(y,x)?g[y][x]:null;
  function canPlace(w,y,x,dir){ // dir 0 = orizzontale, 1 = verticale
    const dy=dir?1:0,dx=dir?0:1;const ey=y+dy*(w.length-1),ex=x+dx*(w.length-1);
    if(!inb(y,x)||!inb(ey,ex))return -1;
    if(at(y-dy,x-dx)||at(ey+dy,ex+dx))return -1;
    let cross=0;
    for(let i=0;i<w.length;i++){const cy=y+dy*i,cx=x+dx*i;const c=g[cy][cx];
      if(c){if(c!==w[i])return -1;cross++}
      else{ if(at(cy+dx,cx+dy)||at(cy-dx,cx-dy))return -1 }}
    return cross;
  }
  function place(w,y,x,dir){const dy=dir?1:0,dx=dir?0:1;for(let i=0;i<w.length;i++)g[y+dy*i][x+dx*i]=w[i];placed.push({w,y,x,dir});usedW.add(w)}
  const cands=shuffle(ALL.filter(x=>x.w.length>=3&&x.w.length<=N&&x.diff<=maxDiff),r);
  // prima parola: lunga, orizzontale, al centro
  const first=cands.find(x=>x.w.length>=Math.min(N-1,6))||cands[0];
  place(first.w,Math.floor(N/2),Math.floor((N-first.w.length)/2),0);
  const target=Math.round(N*1.6);
  let tries=0;
  while(placed.length<target&&tries<6){
    let best=null;
    const sample=cands.slice(0,placed.length<N?cands.length:700);
    for(const x of sample){if(usedW.has(x.w))continue;const w=x.w;
      for(const p of placed){const dir=1-p.dir;
        for(let i=0;i<p.w.length;i++){const ch=p.w[i];
          for(let j=0;j<w.length;j++){if(w[j]!==ch)continue;
            const py=p.y+(p.dir?i:0),px=p.x+(p.dir?0:i);
            const y=dir?py-j:py,x=dir?px:px-j;
            const c=canPlace(w,y,x,dir);if(c<1)continue;
            const score=c*10+w.length+r()*4;
            if(!best||score>best.score)best={w,y,x,dir,score};
          }}}
      if(best&&best.score>40&&placed.length>=N)break;
    }
    if(!best){tries++;continue}
    place(best.w,best.y,best.x,best.dir);
    // togli la parola usata dai candidati per velocizzare
    const idx=cands.findIndex(x=>x.w===best.w);if(idx>=0)cands.splice(idx,1);
  }
  // definizioni, numerazione standard
  const cells=g.map(row=>row.map(c=>c?{ch:c}:null));
  let n=0;const slots=[];
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){if(!cells[y][x])continue;
    const sa=!at(y,x-1)&&at(y,x+1),sd=!at(y-1,x)&&at(y+1,x);
    if(sa||sd){n++;cells[y][x].n=n;
      if(sa){let w='';for(let i=x;i<N&&g[y][i];i++)w+=g[y][i];slots.push({n,dir:0,y,x,w,def:pick(WORDS[w].defs,r)})}
      if(sd){let w='';for(let i=y;i<N&&g[i][x];i++)w+=g[i][x];slots.push({n,dir:1,y,x,w,def:pick(WORDS[w].defs,r)})}}}
  return{N,cells,slots};
}

// ---------- stato di gioco ----------
let S=null;
function startCody(L,daily,D){
  D=D||P.cody.d;const seed=daily?hash('giorno-'+daily):hash('cody-'+D+'-'+L);
  const z=buildCody(seed,daily?0.45:d01Of(D,L));
  S={mode:'cody',L,D,daily,z,rows:z.rows.map(x=>({letters:Array(x.w.length).fill(''),fixed:Array(x.w.length).fill(false),bad:Array(x.w.length).fill(false),ok:false,wrong:0})),cur:0,pos:0,hints:0,pts:0,wrong:0,start:Date.now(),solvedHidden:false,done:false,guessHidden:false};
  document.body.classList.add('playing');FX.beep('start');render();
}
function startCruci(L,D){
  D=D||P.cruci.d;const z=buildCruci(hash('cruci-'+D+'-'+L),d01Of(D,L));
  const N=z.N;const inp=Array.from({length:N},()=>Array(N).fill(''));const fixed=Array.from({length:N},()=>Array(N).fill(false));const bad=Array.from({length:N},()=>Array(N).fill(false));
  const first=z.slots[0];
  S={mode:'cruci',L,D,z,inp,fixed,bad,cy:first.y,cx:first.x,dir:first.dir,hints:0,pts:0,wrong:0,start:Date.now(),done:false,okSlots:{}};
  document.body.classList.add('playing');FX.beep('start');render();
}
function startCritto(L,D){
  D=D||P.critto.d;const d=d01Of(D,L);const z=buildCruci(hash('critto-'+D+'-'+L),d);const r=rng(hash('critto-num-'+D+'-'+L));
  const N=z.N;const letters=[...new Set(z.cells.flat().filter(Boolean).map(c=>c.ch))];
  const order=shuffle(letters,r);const num={};order.forEach((ch,i)=>num[ch]=i+1);
  // lettere date all'inizio: più ce ne sono, più è facile; si preferiscono le più frequenti
  const freq={};z.cells.flat().filter(Boolean).forEach(c=>freq[c.ch]=(freq[c.ch]||0)+1);
  const nGiven=d<.3?5:d<.65?4:3;const given=Object.keys(freq).sort((a,b)=>freq[b]-freq[a]).slice(0,nGiven);
  const map={};given.forEach(ch=>map[num[ch]]=ch);
  const first=z.slots[0];
  S={mode:'critto',L,D,z,num,letters:order,map,given:new Set(given.map(ch=>num[ch])),cy:first.y,cx:first.x,dir:first.dir,hints:0,pts:0,wrong:0,start:Date.now(),done:false,okSlots:{},okNums:new Set(given.map(ch=>num[ch])),solvedNums:new Set(),hyp:{},hypMode:false};
  document.body.classList.add('playing');FX.beep('start');render();
}
const crittoNumAt=(y,x)=>S.num[S.z.cells[y][x].ch];
function crittoAdvance(s,step){const dy=s.dir?1:0,dx=s.dir?0:1;let i=(s.dir?S.cy-s.y:S.cx-s.x)+step;while(i>=0&&i<s.w.length&&S.okNums.has(crittoNumAt(s.y+dy*i,s.x+dx*i)))i+=step;
  if(i>=0&&i<s.w.length){S.cy=s.y+dy*i;S.cx=s.x+dx*i;return}
  if(step<0)return;
  const k=S.z.slots.indexOf(s);for(let q=1;q<=S.z.slots.length;q++){const t=S.z.slots[(k+q)%S.z.slots.length];if(S.okSlots[slotKey(t)])continue;const ty=t.dir?1:0,tx=t.dir?0:1;for(let j=0;j<t.w.length;j++){const y=t.y+ty*j,x=t.x+tx*j;if(!S.okNums.has(crittoNumAt(y,x))){S.dir=t.dir;S.cy=y;S.cx=x;return}}}}
const crittoLetter=(y,x)=>S.map[crittoNumAt(y,x)]||'';
function crittoSlotWord(s){const dy=s.dir?1:0,dx=s.dir?0:1;let w='';for(let i=0;i<s.w.length;i++)w+=crittoLetter(s.y+dy*i,s.x+dx*i)||'.';return w}
function crittoCheckAll(){
  // parole complete e giuste → bloccate; i numeri che vi compaiono diventano certi
  let newOk=0;
  for(const s of S.z.slots){const k=slotKey(s);if(S.okSlots[k])continue;const w=crittoSlotWord(s);if(w.includes('.'))continue;
    if(w===s.w){S.okSlots[k]=true;newOk++;const dy=s.dir?1:0,dx=s.dir?0:1;for(let i=0;i<s.w.length;i++){const m=crittoNumAt(s.y+dy*i,s.x+dx*i);S.okNums.add(m);S.solvedNums.add(m)}const pts=5+s.w.length;S.pts+=pts;FX.floatText($('#clueNow'),'+'+pts)}
    else if(!S.badSlots)S.badSlots={}}
  if(newOk)FX.beep(newOk>1?'streak':'ok');
  if(Object.keys(S.okSlots).length===S.z.slots.length)finish();
}
function crittoAssign(n,ch){
  if(S.okNums.has(n))return;
  // una lettera sta su un numero solo: se era altrove, la togli da lì
  for(const k in S.map){if(S.map[k]===ch&&+k!==n&&!S.okNums.has(+k))delete S.map[k]}
  S.map[n]=ch;crittoCheckAll();
}
function crittoType(ch){
  if(S.done)return;const s=curSlot();if(!s)return;
  const n=crittoNumAt(S.cy,S.cx);
  if(S.okNums.has(n)){crittoAdvance(s,1);render();return}
  if(S.hypMode){let h=S.hyp[n]||'';if(h.includes(ch))h=h.replace(ch,'');else{h+=ch;if(h.length>3)h=h.slice(-3)}if(h)S.hyp[n]=h;else delete S.hyp[n];render();return}  // ipotesi: fino a 3 lettere a matita per numero, non valutate
  delete S.hyp[n];crittoAssign(n,ch);if(!S.done){crittoAdvance(s,1)}render();
}
function crittoBack(){if(S.done)return;const s=curSlot();if(!s)return;const n=crittoNumAt(S.cy,S.cx);
  if(S.hypMode){if(S.hyp[n]){const h=S.hyp[n].slice(0,-1);if(h)S.hyp[n]=h;else delete S.hyp[n]}else{crittoAdvance(s,-1);delete S.hyp[crittoNumAt(S.cy,S.cx)]}render();return}
  if(S.map[n]&&!S.okNums.has(n)){delete S.map[n]}else if(S.hyp[n]){delete S.hyp[n]}else{crittoAdvance(s,-1);const m=crittoNumAt(S.cy,S.cx);if(!S.okNums.has(m))delete S.map[m]}render()}
// ipotesi: conferma tutte (diventano lettere vere e vengono controllate) o cancella tutte
function crittoHypConfirm(){const ns=Object.keys(S.hyp).map(Number).filter(n=>S.hyp[n].length===1);if(!ns.length){FX.beep('bad');return}ns.forEach(n=>{const ch=S.hyp[n];delete S.hyp[n];if(!S.okNums.has(n)){for(const k in S.map){if(S.map[k]===ch&&+k!==n&&!S.okNums.has(+k))delete S.map[k]}S.map[n]=ch}});S.hypMode=false;crittoCheckAll();render()}
function crittoHypClear(){S.hyp={};render()}
function crittoHint(){
  if(S.done)return;let n=crittoNumAt(S.cy,S.cx);
  if(S.okNums.has(n)){const s=curSlot();const dy=s.dir?1:0,dx=s.dir?0:1;let f=null;for(let i=0;i<s.w.length;i++){const m=crittoNumAt(s.y+dy*i,s.x+dx*i);if(!S.okNums.has(m)){f=m;S.cy=s.y+dy*i;S.cx=s.x+dx*i;break}}if(f==null){const rest=S.letters.filter(ch=>!S.okNums.has(S.num[ch]));if(!rest.length)return;f=S.num[rest[0]]}n=f}
  if(S.hints>=FREE_HINTS){if(S.pts<HINT_COST&&P.punti<HINT_COST){FX.beep('bad');return}S.pts-=HINT_COST}
  S.hints++;const ch=S.letters[n-1];for(const k in S.map){if(S.map[k]===ch&&+k!==n)delete S.map[k]}S.map[n]=ch;S.okNums.add(n);S.given.add(n);FX.beep('tick');crittoCheckAll();render();
}
function crittoWrongCells(){
  // una lettera assegnata è "sbagliata" se una parola completa che la contiene non torna
  const bad={};for(const s of S.z.slots){if(S.okSlots[slotKey(s)])continue;const w=crittoSlotWord(s);if(w.includes('.'))continue;const dy=s.dir?1:0,dx=s.dir?0:1;for(let i=0;i<s.w.length;i++)if(w[i]!==s.w[i])bad[(s.y+dy*i)+','+(s.x+dx*i)]=true}
  return bad;
}
function renderCritto(){
  const z=S.z,N=z.N;const s=curSlot();const curN=crittoNumAt(S.cy,S.cx);const bad=crittoWrongCells();
  const inWord=(y,x)=>s&&(s.dir?(x===s.x&&y>=s.y&&y<s.y+s.w.length):(y===s.y&&x>=s.x&&x<s.x+s.w.length));
  let cells='';for(let y=0;y<N;y++)for(let x=0;x<N;x++){const c=z.cells[y][x];if(!c){cells+=`<div class="c b"></div>`;continue}
    const n=S.num[c.ch];const cls=['c','cr'];if(inWord(y,x))cls.push('word');if(n===curN)cls.push('same');if(S.cy===y&&S.cx===x)cls.push('cur');if(S.okNums.has(n))cls.push(S.given.has(n)&&!S.solvedNums.has(n)?'hint':'lock');if(bad[y+','+x])cls.push('bad');
    if(!S.map[n]&&S.hyp[n])cls.push('hyp');
    if(!S.map[n]&&S.hyp[n]&&S.hyp[n].length>1)cls.push('hyp2');
    cells+=`<div class="${cls.join(' ')}" data-y="${y}" data-x="${x}"><span class="n">${n}</span>${S.map[n]||S.hyp[n]||''}</div>`}
  const key=S.letters.map((ch,i)=>{const n=i+1;const cls=['kn'];if(S.okNums.has(n))cls.push(S.given.has(n)&&!S.solvedNums.has(n)?'given':'ok');if(n===curN)cls.push('on');if(!S.map[n]&&S.hyp[n])cls.push('hyp');return`<button class="${cls.join(' ')}" data-num="${n}"><span class="n">${n}</span><b>${S.map[n]||S.hyp[n]||'·'}</b></button>`}).join('');
  const nHyp=Object.keys(S.hyp).length,nHyp1=Object.values(S.hyp).filter(h=>h.length===1).length;
  const hypBar=`<div class="tools hypbar ${S.hypMode?'on':''}"><button class="btn ${S.hypMode?'primary':''}" data-act="hyp">✏️ Ipotesi ${S.hypMode?'attive':''}</button>${nHyp?`<button class="btn" data-act="hypConfirm" ${nHyp1?'':'disabled'}>✓ Conferma ${nHyp1}</button><button class="btn" data-act="hypClear">✕ Cancella</button>`:''}<span class="hint">${S.hypMode?'A matita: fino a 3 lettere per numero, non contano come errori. Ripeti una lettera per toglierla. Si confermano i numeri con una sola lettera.':'Come le note del Sudoku: prova fino a 3 lettere per numero senza rischiare.'}</span></div>`;
  const nOk=Object.keys(S.okSlots).length;
  return`${lvNavHtml('critto')}<div class="grid-wrap"><div class="clue-now" id="clueNow"><span class="dir">${curN}</span><span>${S.okNums.has(curN)?`= <b>${S.map[curN]}</b> (certa)`:S.map[curN]?`= <b>${S.map[curN]}</b> · scrivi un'altra lettera per cambiarla`:'scrivi la lettera che pensi corrisponda a questo numero'}</span><span class="arrows"><button class="btn icon" data-act="prevSlot" aria-label="precedente">‹</button><button class="btn icon" data-act="nextSlot" aria-label="successiva">›</button></span></div>
  <div class="cw cw-cr" style="grid-template-columns:repeat(${N},minmax(0,1fr))">${cells}</div>${hypBar}<p class="hint" style="text-align:center">${nOk}/${z.slots.length} parole · ${S.okNums.size}/${S.letters.length} lettere certe · ogni numero è sempre la stessa lettera</p><div class="keymap">${key}</div><p class="hint">Niente definizioni: parti dalle lettere date, prova le parole che riconosci e il resto si sblocca a catena. Una parola completa e giusta diventa verde e fissa le sue lettere.</p></div>${kbHtml()}`;
}
function quit(){if(SFIDA)return;S=null;document.body.classList.remove('playing');render()}
// ---------- modalità sfida a due ----------
window.SFIDA_OK=true;
let sfLastPct=-1;
function sfPost(m){try{if(window.parent&&window.parent!==window)window.parent.postMessage(m,location.origin)}catch(e){}}
function sfPct(){if(!S)return 0;if(S.done&&!S.stopped)return 100;const n=S.mode==='cody'?S.z.rows.length:S.z.slots.length;const k=S.mode==='cody'?S.rows.filter(r=>r.ok).length:Object.keys(S.okSlots).length;return Math.round(100*k/n)}
function sfTick(){const el=document.getElementById('sfTimer');if(!el||!S)return;const ms=(S.done?S.endAt:Date.now())-S.start;const t=Math.floor(ms/1000);el.textContent=`⏱ ${Math.floor(t/60)}:${String(t%60).padStart(2,'0')}`}
function sfStop(){if(!S||S.done)return;S.done=true;S.stopped=true;S.endAt=Date.now();document.body.classList.remove('playing');render()}
function sfResa(){if(!S||S.done)return;if(!confirm('Vuoi arrenderti? La sfida finisce qui.'))return;sfPost({sfida:'resa'});sfStop()}
if(SFIDA){document.body.classList.add('in-sfida');window.addEventListener('message',e=>{if(e.origin!==location.origin)return;const d=e.data;if(d&&d.sfida==='stop')sfStop()});setInterval(sfTick,500)}

// ---------- logica parola nascosta ----------
function codyRow(){return S.rows[S.cur]}
function codyFirstEmpty(row){for(let i=0;i<row.letters.length;i++)if(!row.letters[i])return i;return -1}
function codyType(ch){
  if(S.done)return;
  if(S.guessHidden){const g=S.hg;if(g.length<S.z.hidden.length){S.hg+=ch;if(S.hg.length===S.z.hidden.length)codyCheckHidden()}render();return}
  const row=codyRow();if(row.ok)return;
  let i=S.pos;if(i<0||i>=row.letters.length||row.fixed[i]){i=codyFirstEmpty(row);if(i<0)return}
  row.letters[i]=ch;row.bad[i]=false;
  let j=i+1;while(j<row.letters.length&&row.fixed[j])j++;const fe=codyFirstEmpty(row);S.pos=j<row.letters.length?j:(fe>=0?fe:i);
  if(row.letters.every(Boolean))codyCheck(S.cur);
  render();
}
function codyBack(){
  if(S.done)return;
  if(S.guessHidden){S.hg=S.hg.slice(0,-1);render();return}
  const row=codyRow();if(row.ok)return;
  let i=S.pos;if(i>=row.letters.length||!row.letters[i]||row.fixed[i]){i=S.pos-1;while(i>=0&&row.fixed[i])i--}
  if(i>=0){row.letters[i]='';row.bad[i]=false;S.pos=i}
  render();
}
function codyCheck(ri){
  const row=S.rows[ri],z=S.z.rows[ri];
  if(row.letters.join('')===z.w){row.ok=true;row.fixed.fill(true);const pts=Math.max(3,10+z.w.length-3*row.wrong);S.pts+=pts;FX.beep(row.wrong?'ok':'streak');FX.floatText($('#row'+ri),'+'+pts);
    codyGift(ri);codyAfterSolve();}
  else{row.wrong++;S.wrong++;for(let i=0;i<z.w.length;i++)row.bad[i]=row.letters[i]!==z.w[i];FX.beep('bad');FX.shake($('#row'+ri));
    // le lettere sbagliate si cancellano da sole dopo un attimo, così si riprova subito
    setTimeout(()=>{if(!S||S.mode!=='cody')return;const rw=S.rows[ri];if(rw.ok)return;for(let i=0;i<rw.letters.length;i++)if(rw.bad[i]&&!rw.fixed[i]){rw.letters[i]='';rw.bad[i]=false}S.pos=codyFirstEmpty(rw);render()},700);}
}
// premio: ogni parola indovinata regala qualche lettera nelle righe ancora aperte
function codyGift(from){
  const n=S.daily?2:(S.D<=5?2:1);
  const open=[];S.rows.forEach((r,i)=>{if(r.ok||i===from)return;r.letters.forEach((l,k)=>{if(!r.fixed[k]&&k!==S.z.rows[i].k)open.push([i,k])})});
  for(let g=0;g<n&&open.length;g++){
    const [i,k]=open.splice(Math.floor(Math.random()*open.length),1)[0];const r=S.rows[i],z=S.z.rows[i];
    r.letters[k]=z.w[k];r.fixed[k]=true;r.bad[k]=false;r.gift=r.gift||{};r.gift[k]=true;S.gifts=(S.gifts||0)+1;
    // togli dalla lista le altre caselle della stessa riga se ora è quasi piena
    if(r.letters.every(Boolean))codyCheck(i);
  }
  if(n&&open.length>=0)S.giftFlash=Date.now();
}
function codyAfterSolve(){
  const col=S.z.rows.map((z,i)=>S.rows[i].ok||S.rows[i].fixed[z.k]);
  if(col.every(Boolean)&&!S.solvedHidden){S.solvedHidden=true}
  if(S.rows.every(r=>r.ok)){finish();return}
  // passa alla prossima riga non risolta
  let n=S.cur;for(let k=1;k<=S.rows.length;k++){const j=(S.cur+k)%S.rows.length;if(!S.rows[j].ok){n=j;break}}
  S.cur=n;S.pos=codyFirstEmpty(S.rows[n]);
}
function codyCheckHidden(){
  if(S.hg===S.z.hidden){S.solvedHidden=true;S.guessHidden=false;const early=S.rows.filter(r=>!r.ok).length;const bonus=20+early*8;S.pts+=bonus;S.hiddenEarly=early;FX.beep('level');FX.confetti(60);
    // rivela la lettera chiave di ogni riga
    S.z.rows.forEach((z,i)=>{const r=S.rows[i];if(!r.ok){r.letters[z.k]=z.w[z.k];r.fixed[z.k]=true;if(r.letters.every(Boolean))codyCheck(i)}});
    if(S.rows.every(r=>r.ok))finish();}
  else{S.wrong++;FX.beep('bad');FX.shake($('#hidden'));S.hg='';}
}
function codyHint(){
  if(S.done)return;
  let ri=S.cur;if(S.rows[ri].ok){ri=S.rows.findIndex(r=>!r.ok);if(ri<0)return;S.cur=ri}
  const row=S.rows[ri],z=S.z.rows[ri];
  let i=S.pos;if(i<0||i>=row.letters.length||row.fixed[i])i=codyFirstEmpty(row);if(i<0){i=row.letters.findIndex((l,k)=>!row.fixed[k]&&l!==z.w[k])}
  if(i<0)return;
  if(S.hints>=FREE_HINTS){if(S.pts<HINT_COST&&P.punti<HINT_COST){FX.beep('bad');return}S.pts-=HINT_COST}
  S.hints++;row.letters[i]=z.w[i];row.fixed[i]=true;row.bad[i]=false;FX.beep('tick');
  if(row.letters.every(Boolean))codyCheck(ri);else{let j=i+1;while(j<row.letters.length&&row.fixed[j])j++;S.pos=j<row.letters.length?j:codyFirstEmpty(row)}
  render();
}

// ---------- logica cruciverba ----------
function slotAt(y,x,dir){return S.z.slots.find(s=>s.dir===dir&&(dir?(s.x===x&&y>=s.y&&y<s.y+s.w.length):(s.y===y&&x>=s.x&&x<s.x+s.w.length)))}
function curSlot(){let s=slotAt(S.cy,S.cx,S.dir);if(!s){S.dir=1-S.dir;s=slotAt(S.cy,S.cx,S.dir)}return s}
const slotKey=(s)=>s.n+(s.dir?'v':'o');
function cruciSelect(y,x){if(!S.z.cells[y][x])return;if(S.cy===y&&S.cx===x){if(slotAt(y,x,1-S.dir))S.dir=1-S.dir}else{S.cy=y;S.cx=x;if(!slotAt(y,x,S.dir))S.dir=1-S.dir}render()}
function cruciGoSlot(s){S.dir=s.dir;const dy=s.dir?1:0,dx=s.dir?0:1;let i=0;for(;i<s.w.length;i++){if(!S.inp[s.y+dy*i][s.x+dx*i])break}if(i>=s.w.length)i=0;S.cy=s.y+dy*i;S.cx=s.x+dx*i;render()}
function cruciType(ch){
  if(S.done)return;const s=curSlot();if(!s)return;
  if(S.fixed[S.cy][S.cx]){cruciAdvance(s,1);if(S.fixed[S.cy][S.cx]){render();return}}
  S.inp[S.cy][S.cx]=ch;S.bad[S.cy][S.cx]=false;
  cruciCheck(s);
  // controlla anche la parola perpendicolare
  const o=slotAt(S.cy,S.cx,1-S.dir);if(o)cruciCheck(o);
  if(!S.done)cruciAdvance(s,1);
  render();
}
function cruciAdvance(s,step){const dy=s.dir?1:0,dx=s.dir?0:1;let i=(s.dir?S.cy-s.y:S.cx-s.x)+step;while(i>=0&&i<s.w.length&&S.fixed[s.y+dy*i][s.x+dx*i])i+=step;if(i<0||i>=s.w.length){if(step>0){/* fine parola: vai alla prossima non completa */const k=S.z.slots.indexOf(s);for(let q=1;q<=S.z.slots.length;q++){const t=S.z.slots[(k+q)%S.z.slots.length];if(!S.okSlots[slotKey(t)]){S.dir=t.dir;const ty=t.dir?1:0,tx=t.dir?0:1;let j=0;for(;j<t.w.length;j++)if(!S.fixed[t.y+ty*j][t.x+tx*j]&&!S.inp[t.y+ty*j][t.x+tx*j])break;if(j>=t.w.length)j=0;S.cy=t.y+ty*j;S.cx=t.x+tx*j;return}}}return}S.cy=s.y+dy*i;S.cx=s.x+dx*i}
function cruciBack(){if(S.done)return;const s=curSlot();if(!s)return;if(S.inp[S.cy][S.cx]&&!S.fixed[S.cy][S.cx]){S.inp[S.cy][S.cx]='';S.bad[S.cy][S.cx]=false}else{cruciAdvance(s,-1);if(!S.fixed[S.cy][S.cx]){S.inp[S.cy][S.cx]='';S.bad[S.cy][S.cx]=false}}render()}
function cruciCheck(s){
  const dy=s.dir?1:0,dx=s.dir?0:1;let w='';for(let i=0;i<s.w.length;i++)w+=S.inp[s.y+dy*i][s.x+dx*i]||'.';
  if(w.includes('.'))return;
  const k=slotKey(s);if(S.okSlots[k])return;
  if(w===s.w){S.okSlots[k]=true;for(let i=0;i<s.w.length;i++){S.fixed[s.y+dy*i][s.x+dx*i]=true;S.bad[s.y+dy*i][s.x+dx*i]=false}const pts=5+s.w.length;S.pts+=pts;FX.beep('ok');FX.floatText($('#clueNow'),'+'+pts);
    if(Object.keys(S.okSlots).length===S.z.slots.length)finish();}
  else{S.wrong++;FX.beep('bad');for(let i=0;i<s.w.length;i++){const y=s.y+dy*i,x=s.x+dx*i;if(!S.fixed[y][x]&&S.inp[y][x]!==s.w[i])S.bad[y][x]=true}}
}
function cruciHint(){
  if(S.done)return;const s=curSlot();if(!s)return;
  const dy=s.dir?1:0,dx=s.dir?0:1;
  let y=S.cy,x=S.cx;if(S.fixed[y][x]||S.inp[y][x]===s.w[s.dir?y-s.y:x-s.x]){let found=false;for(let i=0;i<s.w.length;i++){const yy=s.y+dy*i,xx=s.x+dx*i;if(!S.fixed[yy][xx]&&S.inp[yy][xx]!==s.w[i]){y=yy;x=xx;found=true;break}}if(!found)return}
  if(S.hints>=FREE_HINTS){if(S.pts<HINT_COST&&P.punti<HINT_COST){FX.beep('bad');return}S.pts-=HINT_COST}
  S.hints++;const i=s.dir?y-s.y:x-s.x;S.inp[y][x]=s.w[i];S.fixed[y][x]=true;S.bad[y][x]=false;FX.beep('tick');S.cy=y;S.cx=x;
  cruciCheck(s);const o=slotAt(y,x,1-s.dir);if(o)cruciCheck(o);
  if(!S.done)cruciAdvance(s,1);render();
}

// ---------- fine livello ----------
function finish(){
  if(S.done)return;S.done=true;S.endAt=Date.now();document.body.classList.remove('playing');
  const secs=Math.round((S.endAt-S.start)/1000);
  if(SFIDA){S.secs=secs;S.stars=S.wrong===0&&S.hints<=1?3:(S.wrong<=2&&S.hints<=3?2:1);if(sfLastPct!==100){sfLastPct=100;sfPost({sfida:'progresso',pct:100})}sfPost({sfida:'fatto',ms:S.endAt-S.start,errori:S.wrong,aiuti:S.hints});FX.beep('win');FX.confetti(80);render();return}
  const D=S.D||DIFF_DEF;const bonus=(S.mode==='cody'?10:S.mode==='critto'?25:15)+D*(S.mode==='critto'?10:6)+Math.min(30,S.L);
  const perfect=S.wrong===0&&S.hints===0;const pb=perfect?25:0;
  const stars=S.wrong===0&&S.hints<=1?3:(S.wrong<=2&&S.hints<=3?2:1);
  let tot=Math.max(10,S.pts+bonus+pb);if(S.daily)tot*=2;
  S.total=tot;S.stars=stars;S.secs=secs;S.perfect=perfect;
  // progressi
  const m=livDi(S.mode,S.D||DIFF_DEF);
  if(S.daily){P.giorno[S.daily]={pts:tot,stars}}else{const prev=m.done[S.L]||0;m.done[S.L]=Math.max(prev,stars);if(S.L>=m.max)m.max=S.L+1}
  P.punti+=tot;P.parole+=(S.mode==='cody'?S.z.rows.length:S.z.slots.length);P.best=Math.max(P.best,tot);saveP();
  // abilità di gioco
  const nW=S.mode==='cody'?S.z.rows.length:S.z.slots.length;
  const u=Math.round(tot/4)+nW*2;
  if(S.mode==='cody')AB.registra('parole',{parole:Math.round(u*.55),creativita:Math.round(u*.3)+(S.hiddenEarly?S.hiddenEarly*4:0),logica:Math.round(u*.15)});
  else if(S.mode==='critto')AB.registra('parole',{logica:Math.round(u*.5),parole:Math.round(u*.3),creativita:Math.round(u*.2)});
  else AB.registra('parole',{parole:Math.round(u*.5),logica:Math.round(u*.35),memoria:Math.round(u*.15)});
  FX.beep('win');FX.confetti(stars===3?140:80);render();
}

// ---------- render ----------
const starsHtml=(n)=>'★'.repeat(n)+'☆'.repeat(3-n);
function kbHtml(){
  const hyp=S&&S.mode==='critto'?`<button class="w ${S.hypMode?'on':''}" data-act="hyp">✏️ ${S.hypMode?'Ipotesi ✓':'Ipotesi'}</button>`:'';
  const rows=['QWERTYUIOP','ASDFGHJKL','ZXCVBNM'];
  return`<div class="kb" id="kb"><div class="r">${rows[0].split('').map(k=>`<button data-k="${k}">${k}</button>`).join('')}</div><div class="r">${rows[1].split('').map(k=>`<button data-k="${k}">${k}</button>`).join('')}</div><div class="r">${hyp}<button class="w" data-act="hint">💡 Aiuto</button>${rows[2].split('').map(k=>`<button data-k="${k}">${k}</button>`).join('')}<button class="w" data-act="back">⌫</button></div></div>`;
}
function lvNavHtml(mode){
  const m=P[mode];const L=S.L;
  return`<div class="lvnav"><span class="lv">Livello ${L}</span>${S.daily?'':`<span class="theme" title="${NOMI_DIFF[S.D]}">⚙️ Difficoltà ${S.D}</span>`}${S.daily?'<span class="theme">📅 Sfida del giorno</span>':''}<span class="pts">${S.pts} pt</span><span class="hint">· aiuti ${Math.max(0,FREE_HINTS-S.hints)} gratis${S.hints>=FREE_HINTS?` (poi −${HINT_COST} pt)`:''}</span>${SFIDA?`<span class="theme" id="sfTimer">⏱ 0:00</span><button class="btn" style="margin-left:auto;padding:6px 12px;font-size:.85rem" data-act="resa">🏳️ Mi arrendo</button>`:`<button class="btn" style="margin-left:auto;padding:6px 12px;font-size:.85rem" data-act="quit">Esci</button>`}</div>`;
}
function renderCody(){
  const z=S.z;const avail=($('#app')?$('#app').clientWidth:window.innerWidth)-32-44-20-6;const cs=Math.max(20,Math.min(34,Math.floor((avail-3*(z.width-1))/z.width)));
  const col=z.rows.map((zr,i)=>{const r=S.rows[i];return(r.ok||r.fixed[zr.k])?zr.w[zr.k]:''});
  const hidden=`<div class="hidden-word ${S.guessHidden?'on':''}" id="hidden" data-act="guess"><small>${S.solvedHidden?'Parola nascosta trovata!':'Parola nascosta · tocca per provare a indovinarla subito (bonus)'}</small><div class="cells">${z.hidden.split('').map((ch,i)=>`<span class="cell ${S.guessHidden?(S.hg[i]?'on':''):(col[i]?'on':'')}" style="--cs:${cs}px">${S.guessHidden?(S.hg[i]||''):(col[i]||'')}</span>`).join('')}</div>${S.solvedHidden?`<small>${esc(z.hiddenDef)}</small>`:(S.guessHidden?'<small>Scrivi la parola con la tastiera · tocca di nuovo per annullare</small>':'')}</div>`;
  const rows=z.rows.map((zr,i)=>{const r=S.rows[i];const on=S.cur===i&&!S.guessHidden;
    const cells=[];for(let x=0;x<z.width;x++){const k=x-zr.off;if(k<0||k>=zr.w.length){cells.push(`<span class="cell gap"></span>`);continue}
      const cls=['cell'];if(k===zr.k)cls.push('key');if(on&&S.pos===k&&!r.ok)cls.push('cur');if(r.bad[k])cls.push('bad');if(r.fixed[k]&&!r.ok)cls.push(r.gift&&r.gift[k]?'gift':'hint');
      cells.push(`<span class="${cls.join(' ')}" data-row="${i}" data-k="${k}">${r.letters[k]||''}</span>`)}
    return`<div class="crow ${on?'on':''} ${r.ok?'ok':''}" id="row${i}" data-row="${i}"><div class="def"><span class="n">${i+1}.</span><span>${esc(zr.def)}</span><span class="hint" style="margin-left:auto;white-space:nowrap">${zr.w.length} lettere</span></div><div class="cells">${cells.join('')}</div></div>`}).join('');
  return`${lvNavHtml('cody')}<div class="card stack"><div class="sec-head"><span class="theme">🏷️ ${TEMI[z.tema]||z.tema}</span><span class="hint">${S.rows.filter(r=>r.ok).length}/${z.rows.length} parole${S.giftFlash&&Date.now()-S.giftFlash<2500?' · 🎁 lettere regalo!':''}</span></div>${hidden}<div class="cody" style="--cs:${cs}px" data-w="${z.width}">${rows}</div></div>${kbHtml()}`;
}
function renderCruci(){
  const z=S.z,N=z.N;const s=curSlot();const dy=s?(s.dir?1:0):0,dx=s?(s.dir?0:1):0;
  const inWord=(y,x)=>s&&(s.dir?(x===s.x&&y>=s.y&&y<s.y+s.w.length):(y===s.y&&x>=s.x&&x<s.x+s.w.length));
  let cells='';for(let y=0;y<N;y++)for(let x=0;x<N;x++){const c=z.cells[y][x];if(!c){cells+=`<div class="c b"></div>`;continue}
    const cls=['c'];if(inWord(y,x))cls.push('word');if(S.cy===y&&S.cx===x)cls.push('cur');if(S.fixed[y][x])cls.push(S.okSlots[slotKey(slotAt(y,x,0)||slotAt(y,x,1))]||(slotAt(y,x,0)&&S.okSlots[slotKey(slotAt(y,x,0))])||(slotAt(y,x,1)&&S.okSlots[slotKey(slotAt(y,x,1))])?'lock':'hint');if(S.bad[y][x])cls.push('bad');
    cells+=`<div class="${cls.join(' ')}" data-y="${y}" data-x="${x}">${c.n?`<span class="n">${c.n}</span>`:''}${S.inp[y][x]||''}</div>`}
  const list=(dir)=>`<div><h3>${dir?'Verticali ↓':'Orizzontali →'}</h3><ol>${z.slots.filter(t=>t.dir===dir).map(t=>`<li class="${s===t?'on':''} ${S.okSlots[slotKey(t)]?'ok':''}" data-slot="${t.n}${t.dir?'v':'o'}"><span class="n">${t.n}</span><span>${esc(t.def)} <span class="hint">(${t.w.length})</span></span></li>`).join('')}</ol></div>`;
  return`${lvNavHtml('cruci')}<div class="grid-wrap"><div class="clue-now" id="clueNow"><span class="dir">${s?s.n+(s.dir?' ↓':' →'):''}</span><span>${s?esc(s.def):''} ${s?`<span class="hint">(${s.w.length})</span>`:''}</span><span class="arrows"><button class="btn icon" data-act="prevSlot" aria-label="precedente">‹</button><button class="btn icon" data-act="nextSlot" aria-label="successiva">›</button></span></div>
  <div class="cw" style="grid-template-columns:repeat(${N},minmax(0,1fr))">${cells}</div><p class="hint" style="text-align:center">${Object.keys(S.okSlots).length}/${z.slots.length} parole · tocca due volte una casella per cambiare direzione</p><div class="clues">${list(0)}${list(1)}</div></div>${kbHtml()}`;
}
function renderWin(){
  if(SFIDA){const t=Math.round(((S.endAt||Date.now())-S.start)/1000);const tt=`${Math.floor(t/60)}:${String(t%60).padStart(2,'0')}`;return S.stopped?`<div class="win"><div class="big">🏁</div><h2>Sfida terminata</h2><p class="hint">Il risultato lo vedi nella stanza della sfida.</p></div>`:`<div class="win"><div class="big">🏁</div><h2>Finito in ${tt}!</h2><p class="hint">Errori ${S.wrong} · aiuti ${S.hints}</p><p class="hint">Aspetta l'avversario: il risultato lo vedi nella stanza della sfida.</p></div>`}
  const next=S.L+1;
  const abil=S.mode==='cody'?'Parole, Creatività e Logica':S.mode==='critto'?'Logica, Parole e Creatività':'Parole, Logica e Memoria';
  return`<div class="win"><div class="big">${S.stars===3?'🏆':S.stars===2?'🎉':'👏'}</div><h2>${S.daily?'Sfida del giorno completata!':`Livello ${S.L} completato!`}</h2><div style="font-size:1.8rem;color:var(--warn)">${starsHtml(S.stars)}</div><div class="statsrow"><div class="stat"><div class="v">+${S.total}</div><div class="l">punti</div></div><div class="stat"><div class="v">${Math.floor(S.secs/60)}:${String(S.secs%60).padStart(2,'0')}</div><div class="l">tempo</div></div><div class="stat"><div class="v">${S.wrong}</div><div class="l">errori</div></div><div class="stat"><div class="v">${S.hints}</div><div class="l">aiuti</div></div></div>${S.gifts?`<p class="hint">🎁 ${S.gifts} lettere regalo ricevute.</p>`:''}${S.perfect?'<p><b>Perfetto!</b> Nessun errore e nessun aiuto: +25 punti.</p>':''}${S.hiddenEarly?`<p>Hai indovinato la parola nascosta con ${S.hiddenEarly} righe ancora aperte: bonus creatività!</p>`:''}<p class="hint">Abilità di gioco aggiornate: ${abil}. <a href="../abilita/">Vedi il grafico</a></p><div class="actions">${S.daily?`<button class="btn primary" data-act="home">Torna alle parole</button>`:`<button class="btn primary" data-act="next">Livello ${next} →</button><button class="btn" data-act="home">Menu</button>`}</div></div>`;
}
function renderHome(){
  const today=AB.dayKey();const dailyDone=P.giorno[today];
  const nDone=(g)=>Object.values(g.liv).reduce((n,l)=>n+Object.keys(l.done).length,0);
  const stars=(g)=>Object.values(g.liv).reduce((n,l)=>n+Object.values(l.done).reduce((a,b)=>a+b,0),0);
  const diffPick=(mode)=>{const g=P[mode];return`<div class="diffpick"><span class="hint">Difficoltà <b>${g.d}</b> · ${NOMI_DIFF[g.d]}</span><div class="diffrow">${[1,2,3,4,5,6,7,8,9,10].map(D=>`<button class="${D===g.d?'on':''} ${D<=3?'d-easy':D<=6?'d-mid':D<=8?'d-hard':'d-max'}" data-diff="${mode}" data-d="${D}" title="${NOMI_DIFF[D]}">${D}</button>`).join('')}</div></div>`};
  const pickLv=(mode)=>{const m=livDi(mode,P[mode].d);const from=Math.max(1,m.max-11);const btns=[];for(let L=from;L<=m.max;L++)btns.push(`<button class="${m.done[L]?'done':(L===m.max?'next':'')}" data-play="${mode}" data-l="${L}" title="Livello ${L}">${L}</button>`);return`<div class="lvpick">${from>1?`<button data-play="${mode}" data-l="${from-1}">‹</button>`:''}${btns.join('')}</div>`};
  // card compatta: titolo, una riga, pulsante; difficoltà e livelli dentro un riquadro richiudibile (resta aperto quello scelto)
  const game=(mode,ic,nome,desc)=>{const g=P[mode];const m=livDi(mode,g.d);const open=P.apri===mode;return`<div class="gcard"><div class="gtop"><span class="ic">${ic}</span><div class="gtxt"><b>${nome}</b><span class="hint">${desc}</span></div><button class="btn primary" data-play="${mode}" data-l="${m.max}">Liv. ${m.max} →</button></div>
    <button class="gopt ${open?'on':''}" data-apri="${mode}">⚙️ Difficoltà ${g.d} · ${NOMI_DIFF[g.d]} <i>${open?'▴':'▾'}</i></button>${open?`<div class="gbody">${diffPick(mode)}${pickLv(mode)}</div>`:''}</div>`};
  return`<section class="hero compact"><div class="htop"><div><div class="eyebrow">Livelli infiniti · in italiano</div><h1>Parole crociate</h1></div><div class="kpis mini"><div class="kpi"><b>${P.punti}</b><span>punti</span></div><div class="kpi"><b>${P.parole}</b><span>parole</span></div><div class="kpi"><b>${stars(P.cody)+stars(P.cruci)+stars(P.critto)}</b><span>stelle</span></div></div></div></section>
  <a class="daily" href="#" data-play="daily"><b>📅 Sfida del giorno${dailyDone?' · fatta ✓ '+starsHtml(dailyDone.stars):' · punti doppi'}</b><span>${dailyDone?'Hai fatto '+dailyDone.pts+' punti, domani ce n\'è una nuova.':'Una parola nascosta uguale per tutti, nuova a mezzanotte.'}</span></a>
  <div class="stack" style="gap:10px">
    ${game('cody','🔤','Parola nascosta','Definizioni a tema, la colonna evidenziata nasconde una parola.')}
    ${game('cruci','▦','Cruciverba','Classico, orizzontali e verticali, griglia da 7×7 a 13×13.')}
    ${game('critto','🔢','Crittografato','Ogni lettera è un numero: parti da quelle date e decifra tutto.')}
  </div>
  <details class="card fold"><summary>Come funziona</summary><ul style="margin:8px 0 0;padding-left:18px;display:grid;gap:6px"><li>Tocca una riga o una casella e scrivi con la tastiera. Una parola completa viene controllata subito: verde se è giusta, lettere sbagliate in rosso.</li><li>Nella parola nascosta ogni parola indovinata ti <b>regala una o due lettere</b> 🎁 nelle righe ancora aperte.</li><li>Nel crittografato ogni numero è sempre la stessa lettera; con ✏️ Ipotesi provi fino a 3 lettere a matita per numero senza errori.</li><li><b>Difficoltà da 1 a 10</b> a tua scelta: il livello 1 vale la difficoltà scelta e i livelli salgono pianissimo. Ogni difficoltà ha i suoi livelli e le sue stelle.</li><li><b>${FREE_HINTS} aiuti gratis</b> per livello, poi costano ${HINT_COST} punti. Tre stelle senza errori e con al massimo un aiuto.</li><li>Ogni livello fa crescere le tue <a href="../abilita/">abilità di gioco</a>.</li></ul></details>
  <p class="foot"><a href="../" style="color:var(--muted)">← Home</a> · <a href="../abilita/" style="color:var(--muted)">📈 Le tue abilità</a> · dizionario di ${ALL.length} parole</p>`;
}
function fitCody(){const c=$('.cody');if(!c)return;const cells=c.querySelector('.crow .cells');if(!cells)return;const n=+c.dataset.w||1;const w=cells.clientWidth;if(!w)return;let g=3,cs=Math.floor((w-g*(n-1))/n);if(cs<16){g=2;cs=Math.floor((w-g*(n-1))/n)}cs=Math.max(10,Math.min(34,cs));c.style.setProperty('--cs',cs+'px');c.style.setProperty('--cg',g+'px');c.classList.toggle('tiny',cs<16)}
function render(){
  const app=$('#app');
  if(!S)app.innerHTML=renderHome();
  else if(S.done)app.innerHTML=renderWin();
  else app.innerHTML=S.mode==='cody'?renderCody():S.mode==='critto'?renderCritto():renderCruci();
  const title=$('#barTitle');if(title)title.innerHTML=S?`<a href="./" data-act="quit" style="color:inherit;text-decoration:none">Parole</a> · ${S.daily?'Sfida del giorno':(S.mode==='cody'?'Parola nascosta':S.mode==='critto'?'Crittografato':'Cruciverba')+' '+S.L}`:`<a href="../" style="color:inherit;text-decoration:none">🧠 Mente Allenata</a> · Parole`;
  fitCody();
  if(SFIDA&&S){const pct=sfPct();if(pct!==sfLastPct){sfLastPct=pct;sfPost({sfida:'progresso',pct})}sfTick()}
  if(S&&!S.done&&S.mode!=='cody'){const c=$('.cw .c.cur');if(c&&c.scrollIntoView&&window.innerWidth<=640){const r=c.getBoundingClientRect();if(r.bottom>window.innerHeight-200||r.top<100)c.scrollIntoView({block:'center',behavior:'smooth'})}}
}

// ---------- eventi ----------
document.addEventListener('click',e=>{
  const t=e.target.closest('[data-play],[data-act],[data-k],[data-row],[data-y],[data-slot],[data-num],[data-diff],[data-apri]');if(!t)return;
  if(t.dataset.apri){P.apri=P.apri===t.dataset.apri?null:t.dataset.apri;saveP();render();return}
  if(t.dataset.diff){P[t.dataset.diff].d=+t.dataset.d;saveP();FX.beep('tick');render();return}
  if(t.dataset.play){e.preventDefault();const m=t.dataset.play;if(m==='daily')startCody(1,AB.dayKey());else if(m==='cody')startCody(+t.dataset.l||1);else if(m==='critto')startCritto(+t.dataset.l||1);else startCruci(+t.dataset.l||1);return}
  const act=t.dataset.act;
  if(act==='resa'){sfResa();return}
  if(SFIDA&&(act==='quit'||act==='home'||act==='next'||t.dataset.play||t.dataset.diff||t.dataset.apri)){e.preventDefault();return}
  if(act==='quit'){e.preventDefault();quit();return}
  if(act==='home'){quit();return}
  if(act==='next'){const m=S.mode,L=S.L+1,D=S.D;if(m==='cody')startCody(L,null,D);else if(m==='critto')startCritto(L,D);else startCruci(L,D);return}
  if(!S||S.done)return;
  if(act==='hint'){S.mode==='cody'?codyHint():S.mode==='critto'?crittoHint():cruciHint();return}
  if(act==='back'){S.mode==='cody'?codyBack():S.mode==='critto'?crittoBack():cruciBack();return}
  if(act==='hyp'){S.hypMode=!S.hypMode;FX.beep('tick');render();return}
  if(act==='hypConfirm'){crittoHypConfirm();return}
  if(act==='hypClear'){crittoHypClear();return}
  if(act==='guess'){if(S.solvedHidden)return;S.guessHidden=!S.guessHidden;S.hg='';render();return}
  if(act==='prevSlot'||act==='nextSlot'){const s=curSlot();const k=S.z.slots.indexOf(s);const n=S.z.slots[(k+(act==='nextSlot'?1:S.z.slots.length-1))%S.z.slots.length];cruciGoSlot(n);return}
  if(t.dataset.k&&t.closest('.kb')){S.mode==='cody'?codyType(t.dataset.k):S.mode==='critto'?crittoType(t.dataset.k):cruciType(t.dataset.k);return}
  if(S.mode==='cody'&&t.dataset.row!==undefined){const ri=+t.dataset.row;if(S.rows[ri].ok)return;S.guessHidden=false;S.cur=ri;const k=t.dataset.k!==undefined?+t.dataset.k:-1;S.pos=(k>=0&&!S.rows[ri].fixed[k])?k:codyFirstEmpty(S.rows[ri]);render();return}
  if(S.mode!=='cody'&&t.dataset.y!==undefined){cruciSelect(+t.dataset.y,+t.dataset.x);return}
  if(S.mode==='critto'&&t.dataset.num){const n=+t.dataset.num;outer:for(let y=0;y<S.z.N;y++)for(let x=0;x<S.z.N;x++){if(S.z.cells[y][x]&&S.num[S.z.cells[y][x].ch]===n){S.cy=y;S.cx=x;if(!slotAt(y,x,S.dir))S.dir=1-S.dir;break outer}}render();return}
  if(S.mode==='cruci'&&t.dataset.slot){const s=S.z.slots.find(x=>slotKey(x)===t.dataset.slot);if(s)cruciGoSlot(s);return}
});
document.addEventListener('keydown',e=>{
  if(!S||S.done)return;if(e.ctrlKey||e.metaKey||e.altKey)return;
  const k=e.key;
  if(/^[a-zA-Z]$/.test(k)){e.preventDefault();S.mode==='cody'?codyType(k.toUpperCase()):S.mode==='critto'?crittoType(k.toUpperCase()):cruciType(k.toUpperCase())}
  else if(k==='Backspace'){e.preventDefault();S.mode==='cody'?codyBack():S.mode==='critto'?crittoBack():cruciBack()}
  else if(S.mode!=='cody'&&/^Arrow/.test(k)){e.preventDefault();const d={ArrowUp:[-1,0],ArrowDown:[1,0],ArrowLeft:[0,-1],ArrowRight:[0,1]}[k];let y=S.cy+d[0],x=S.cx+d[1];while(y>=0&&y<S.z.N&&x>=0&&x<S.z.N&&!S.z.cells[y][x]){y+=d[0];x+=d[1]}if(y>=0&&y<S.z.N&&x>=0&&x<S.z.N){S.cy=y;S.cx=x;S.dir=d[0]?1:0;if(!slotAt(y,x,S.dir))S.dir=1-S.dir;render()}}
  else if(k==='Tab'){e.preventDefault();if(S.mode==='cody'){let n=S.cur;for(let q=1;q<=S.rows.length;q++){const j=(S.cur+(e.shiftKey?-q+S.rows.length:q))%S.rows.length;if(!S.rows[j].ok){n=j;break}}S.cur=n;S.pos=codyFirstEmpty(S.rows[n]);render()}else{const s=curSlot();const kk=S.z.slots.indexOf(s);cruciGoSlot(S.z.slots[(kk+(e.shiftKey?S.z.slots.length-1:1))%S.z.slots.length])}}
  else if(k==='Enter'&&S.mode==='cody'&&S.guessHidden){if(S.hg.length===S.z.hidden.length)codyCheckHidden();render()}
});
window.addEventListener('resize',()=>{if(S&&!S.done&&S.mode==='cody')render()});
// link diretto: ?gioco=cody|cruci|giorno&l=N
const q=new URLSearchParams(location.search);
if(SFIDA){const g=q.get('gioco')||'cody';const D=Math.max(1,Math.min(10,+q.get('d')||DIFF_DEF)),L=Math.max(1,+q.get('l')||1);sfPost({sfida:'pronto',gioco:g,d:D,l:L});if(g==='critto')startCritto(L,D);else if(g==='cruci')startCruci(L,D);else startCody(L,null,D)}
else if(q.get('gioco')==='giorno')startCody(1,AB.dayKey());else{const g=q.get('gioco');if(g&&P[g]&&q.get('d'))P[g].d=Math.max(1,Math.min(10,+q.get('d')));if(g==='cody')startCody(+q.get('l')||livDi('cody',P.cody.d).max);else if(g==='critto')startCritto(+q.get('l')||livDi('critto',P.critto.d).max);else if(g==='cruci')startCruci(+q.get('l')||livDi('cruci',P.cruci.d).max);else render()}
window.Parole={get S(){return S},get P(){return P},buildCody,buildCruci,startCody,startCruci,startCritto,d01Of,WORDS};
})();
