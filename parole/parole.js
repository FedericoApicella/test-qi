// Parole crociate infinite: "Parola nascosta" (stile CodyCross) e cruciverba classici,
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
const diffOf=(L)=>1-Math.exp(-(L-1)/40);

// ---------- progressi ----------
function loadP(){return Object.assign({cody:{max:1,done:{}},cruci:{max:1,done:{}},giorno:{},punti:0,parole:0,best:0},FX.load(KEY,{}))}
let P=loadP();const saveP=()=>FX.save(KEY,P);
window.addEventListener('testqi:account',()=>{P=loadP();if(!S)render()});

// ---------- generatore "parola nascosta" (CodyCross) ----------
function buildCody(seed,L){
  const r=rng(seed),d=diffOf(L);
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
function buildCruci(seed,L){
  // più tentativi con semi diversi: si tiene la griglia con più parole
  const n=L<13?6:L<30?4:2;let best=null;for(let i=0;i<n;i++){const z=buildCruciOnce(seed+i*7919,L);if(!best||z.slots.length>best.slots.length)best=z}return best;
}
function buildCruciOnce(seed,L){
  const r=rng(seed),d=diffOf(L);
  const N=L<4?7:L<8?8:L<13?9:L<20?10:L<30?11:L<45?12:13;
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
function startCody(L,daily){
  const seed=daily?hash('giorno-'+daily):hash('cody-'+L);
  const z=buildCody(seed,daily?8:L);
  S={mode:'cody',L,daily,z,rows:z.rows.map(x=>({letters:Array(x.w.length).fill(''),fixed:Array(x.w.length).fill(false),bad:Array(x.w.length).fill(false),ok:false,wrong:0})),cur:0,pos:0,hints:0,pts:0,wrong:0,start:Date.now(),solvedHidden:false,done:false,guessHidden:false};
  document.body.classList.add('playing');FX.beep('start');render();
}
function startCruci(L){
  const z=buildCruci(hash('cruci-'+L),L);
  const N=z.N;const inp=Array.from({length:N},()=>Array(N).fill(''));const fixed=Array.from({length:N},()=>Array(N).fill(false));const bad=Array.from({length:N},()=>Array(N).fill(false));
  const first=z.slots[0];
  S={mode:'cruci',L,z,inp,fixed,bad,cy:first.y,cx:first.x,dir:first.dir,hints:0,pts:0,wrong:0,start:Date.now(),done:false,okSlots:{}};
  document.body.classList.add('playing');FX.beep('start');render();
}
function quit(){S=null;document.body.classList.remove('playing');render()}

// ---------- logica Cody ----------
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
    codyAfterSolve();}
  else{row.wrong++;S.wrong++;for(let i=0;i<z.w.length;i++)row.bad[i]=row.letters[i]!==z.w[i];FX.beep('bad');FX.shake($('#row'+ri));
    // le lettere sbagliate si cancellano da sole dopo un attimo, così si riprova subito
    setTimeout(()=>{if(!S||S.mode!=='cody')return;const rw=S.rows[ri];if(rw.ok)return;for(let i=0;i<rw.letters.length;i++)if(rw.bad[i]&&!rw.fixed[i]){rw.letters[i]='';rw.bad[i]=false}S.pos=codyFirstEmpty(rw);render()},700);}
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
  if(S.done)return;S.done=true;document.body.classList.remove('playing');
  const secs=Math.round((Date.now()-S.start)/1000);
  const bonus=S.mode==='cody'?20+Math.min(60,S.L*2):30+Math.min(80,S.L*3);
  const perfect=S.wrong===0&&S.hints===0;const pb=perfect?25:0;
  const stars=S.wrong===0&&S.hints<=1?3:(S.wrong<=2&&S.hints<=3?2:1);
  let tot=Math.max(10,S.pts+bonus+pb);if(S.daily)tot*=2;
  S.total=tot;S.stars=stars;S.secs=secs;S.perfect=perfect;
  // progressi
  const m=S.mode==='cody'?P.cody:P.cruci;
  if(S.daily){P.giorno[S.daily]={pts:tot,stars}}else{const prev=m.done[S.L]||0;m.done[S.L]=Math.max(prev,stars);if(S.L>=m.max)m.max=S.L+1}
  P.punti+=tot;P.parole+=(S.mode==='cody'?S.z.rows.length:S.z.slots.length);P.best=Math.max(P.best,tot);saveP();
  // abilità di gioco
  const nW=S.mode==='cody'?S.z.rows.length:S.z.slots.length;
  const u=Math.round(tot/4)+nW*2;
  if(S.mode==='cody')AB.registra('parole',{parole:Math.round(u*.55),creativita:Math.round(u*.3)+(S.hiddenEarly?S.hiddenEarly*4:0),logica:Math.round(u*.15)});
  else AB.registra('parole',{parole:Math.round(u*.5),logica:Math.round(u*.35),memoria:Math.round(u*.15)});
  FX.beep('win');FX.confetti(stars===3?140:80);render();
}

// ---------- render ----------
const starsHtml=(n)=>'★'.repeat(n)+'☆'.repeat(3-n);
function kbHtml(){
  const rows=['QWERTYUIOP','ASDFGHJKL','ZXCVBNM'];
  return`<div class="kb" id="kb"><div class="r">${rows[0].split('').map(k=>`<button data-k="${k}">${k}</button>`).join('')}</div><div class="r">${rows[1].split('').map(k=>`<button data-k="${k}">${k}</button>`).join('')}</div><div class="r"><button class="w" data-act="hint">💡 Aiuto</button>${rows[2].split('').map(k=>`<button data-k="${k}">${k}</button>`).join('')}<button class="w" data-act="back">⌫</button></div></div>`;
}
function lvNavHtml(mode){
  const m=P[mode];const L=S.L;
  return`<div class="lvnav"><span class="lv">Livello ${L}</span>${S.daily?'<span class="theme">📅 Sfida del giorno</span>':''}<span class="pts">${S.pts} pt</span><span class="hint">· aiuti ${Math.max(0,FREE_HINTS-S.hints)} gratis${S.hints>=FREE_HINTS?` (poi −${HINT_COST} pt)`:''}</span><button class="btn" style="margin-left:auto;padding:6px 12px;font-size:.85rem" data-act="quit">Esci</button></div>`;
}
function renderCody(){
  const z=S.z;const avail=($('#app')?$('#app').clientWidth:window.innerWidth)-32-44-20-6;const cs=Math.max(20,Math.min(34,Math.floor((avail-3*(z.width-1))/z.width)));
  const col=z.rows.map((zr,i)=>{const r=S.rows[i];return(r.ok||r.fixed[zr.k])?zr.w[zr.k]:''});
  const hidden=`<div class="hidden-word ${S.guessHidden?'on':''}" id="hidden" data-act="guess"><small>${S.solvedHidden?'Parola nascosta trovata!':'Parola nascosta · tocca per provare a indovinarla subito (bonus)'}</small><div class="cells">${z.hidden.split('').map((ch,i)=>`<span class="cell ${S.guessHidden?(S.hg[i]?'on':''):(col[i]?'on':'')}" style="--cs:${cs}px">${S.guessHidden?(S.hg[i]||''):(col[i]||'')}</span>`).join('')}</div>${S.solvedHidden?`<small>${esc(z.hiddenDef)}</small>`:(S.guessHidden?'<small>Scrivi la parola con la tastiera · tocca di nuovo per annullare</small>':'')}</div>`;
  const rows=z.rows.map((zr,i)=>{const r=S.rows[i];const on=S.cur===i&&!S.guessHidden;
    const cells=[];for(let x=0;x<z.width;x++){const k=x-zr.off;if(k<0||k>=zr.w.length){cells.push(`<span class="cell gap" style="--cs:${cs}px"></span>`);continue}
      const cls=['cell'];if(k===zr.k)cls.push('key');if(on&&S.pos===k&&!r.ok)cls.push('cur');if(r.bad[k])cls.push('bad');if(r.fixed[k]&&!r.ok)cls.push('hint');
      cells.push(`<span class="${cls.join(' ')}" style="--cs:${cs}px" data-row="${i}" data-k="${k}">${r.letters[k]||''}</span>`)}
    return`<div class="crow ${on?'on':''} ${r.ok?'ok':''}" id="row${i}" data-row="${i}"><div class="def"><span class="n">${i+1}.</span><span>${esc(zr.def)}</span><span class="hint" style="margin-left:auto;white-space:nowrap">${zr.w.length} lettere</span></div><div class="cells">${cells.join('')}</div></div>`}).join('');
  return`${lvNavHtml('cody')}<div class="card stack"><div class="sec-head"><span class="theme">🏷️ ${TEMI[z.tema]||z.tema}</span><span class="hint">${S.rows.filter(r=>r.ok).length}/${z.rows.length} parole</span></div>${hidden}<div class="cody">${rows}</div></div>${kbHtml()}`;
}
function renderCruci(){
  const z=S.z,N=z.N;const s=curSlot();const dy=s?(s.dir?1:0):0,dx=s?(s.dir?0:1):0;
  const inWord=(y,x)=>s&&(s.dir?(x===s.x&&y>=s.y&&y<s.y+s.w.length):(y===s.y&&x>=s.x&&x<s.x+s.w.length));
  let cells='';for(let y=0;y<N;y++)for(let x=0;x<N;x++){const c=z.cells[y][x];if(!c){cells+=`<div class="c b"></div>`;continue}
    const cls=['c'];if(inWord(y,x))cls.push('word');if(S.cy===y&&S.cx===x)cls.push('cur');if(S.fixed[y][x])cls.push(S.okSlots[slotKey(slotAt(y,x,0)||slotAt(y,x,1))]||(slotAt(y,x,0)&&S.okSlots[slotKey(slotAt(y,x,0))])||(slotAt(y,x,1)&&S.okSlots[slotKey(slotAt(y,x,1))])?'lock':'hint');if(S.bad[y][x])cls.push('bad');
    cells+=`<div class="${cls.join(' ')}" data-y="${y}" data-x="${x}">${c.n?`<span class="n">${c.n}</span>`:''}${S.inp[y][x]||''}</div>`}
  const list=(dir)=>`<div><h3>${dir?'Verticali ↓':'Orizzontali →'}</h3><ol>${z.slots.filter(t=>t.dir===dir).map(t=>`<li class="${s===t?'on':''} ${S.okSlots[slotKey(t)]?'ok':''}" data-slot="${t.n}${t.dir?'v':'o'}"><span class="n">${t.n}</span><span>${esc(t.def)} <span class="hint">(${t.w.length})</span></span></li>`).join('')}</ol></div>`;
  return`${lvNavHtml('cruci')}<div class="grid-wrap"><div class="clue-now" id="clueNow"><span class="dir">${s?s.n+(s.dir?' ↓':' →'):''}</span><span>${s?esc(s.def):''} ${s?`<span class="hint">(${s.w.length})</span>`:''}</span><span class="arrows"><button class="btn icon" data-act="prevSlot" aria-label="precedente">‹</button><button class="btn icon" data-act="nextSlot" aria-label="successiva">›</button></span></div>
  <div class="cw" style="grid-template-columns:repeat(${N},1fr)">${cells}</div><p class="hint" style="text-align:center">${Object.keys(S.okSlots).length}/${z.slots.length} parole · tocca due volte una casella per cambiare direzione</p><div class="clues">${list(0)}${list(1)}</div></div>${kbHtml()}`;
}
function renderWin(){
  const m=S.mode==='cody'?'cody':'cruci';const next=S.L+1;
  const abil=S.mode==='cody'?'Parole, Creatività e Logica':'Parole, Logica e Memoria';
  return`<div class="win"><div class="big">${S.stars===3?'🏆':S.stars===2?'🎉':'👏'}</div><h2>${S.daily?'Sfida del giorno completata!':`Livello ${S.L} completato!`}</h2><div style="font-size:1.8rem;color:var(--warn)">${starsHtml(S.stars)}</div><div class="statsrow"><div class="stat"><div class="v">+${S.total}</div><div class="l">punti</div></div><div class="stat"><div class="v">${Math.floor(S.secs/60)}:${String(S.secs%60).padStart(2,'0')}</div><div class="l">tempo</div></div><div class="stat"><div class="v">${S.wrong}</div><div class="l">errori</div></div><div class="stat"><div class="v">${S.hints}</div><div class="l">aiuti</div></div></div>${S.perfect?'<p><b>Perfetto!</b> Nessun errore e nessun aiuto: +25 punti.</p>':''}${S.hiddenEarly?`<p>Hai indovinato la parola nascosta con ${S.hiddenEarly} righe ancora aperte: bonus creatività!</p>`:''}<p class="hint">Abilità di gioco aggiornate: ${abil}. <a href="../abilita/">Vedi il grafico</a></p><div class="actions">${S.daily?`<button class="btn primary" data-act="home">Torna alle parole</button>`:`<button class="btn primary" data-act="next">Livello ${next} →</button><button class="btn" data-act="home">Menu</button>`}</div></div>`;
}
function renderHome(){
  const today=AB.dayKey();const dailyDone=P.giorno[today];
  const nDone=(m)=>Object.keys(m.done).length;
  const stars=(m)=>Object.values(m.done).reduce((a,b)=>a+b,0);
  const pickLv=(mode)=>{const m=P[mode];const from=Math.max(1,m.max-11);const btns=[];for(let L=from;L<=m.max;L++)btns.push(`<button class="${m.done[L]?'done':(L===m.max?'next':'')}" data-play="${mode}" data-l="${L}" title="Livello ${L}">${L}</button>`);return`<div class="lvpick">${from>1?`<button data-play="${mode}" data-l="${from-1}">‹</button>`:''}${btns.join('')}</div>`};
  return`<section class="hero"><div class="eyebrow">Livelli infiniti · in italiano · senza registrazione</div><h1>Parole crociate</h1><p>Due giochi: la <b>parola nascosta</b> (risolvi le definizioni a tema, le lettere evidenziate formano la parola verticale) e il <b>cruciverba classico</b>. Ogni livello è generato dal nostro dizionario e sale di difficoltà: non finiscono mai.</p><div class="kpis"><div class="kpi"><b>${P.punti}</b><span>punti totali</span></div><div class="kpi"><b>${P.parole}</b><span>parole risolte</span></div><div class="kpi"><b>${stars(P.cody)+stars(P.cruci)}</b><span>stelle</span></div><div class="kpi"><b>${P.best}</b><span>record livello</span></div></div></section>
  <a class="daily" href="#" data-play="daily"><b>📅 Sfida del giorno${dailyDone?' · fatta ✓ '+starsHtml(dailyDone.stars):''}</b><span>Una parola nascosta uguale per tutti, punti doppi. ${dailyDone?'Hai fatto '+dailyDone.pts+' punti: domani ce n\'è una nuova.':'Nuova ogni giorno a mezzanotte.'}</span></a>
  <div class="modes">
    <div class="tile"><span class="pill">${nDone(P.cody)} livelli</span><span class="ic">🔤</span><b>Parola nascosta</b><span>Stile CodyCross: ogni riga una definizione, la colonna evidenziata nasconde una parola. Indovinala in anticipo per il bonus.</span>${pickLv('cody')}<span class="cta"><button class="btn primary" data-play="cody" data-l="${P.cody.max}">Livello ${P.cody.max} →</button></span></div>
    <div class="tile"><span class="pill">${nDone(P.cruci)} livelli</span><span class="ic">▦</span><b>Cruciverba</b><span>Classico, con orizzontali e verticali. La griglia cresce con i livelli: da 7×7 a 13×13.</span>${pickLv('cruci')}<span class="cta"><button class="btn primary" data-play="cruci" data-l="${P.cruci.max}">Livello ${P.cruci.max} →</button></span></div>
  </div>
  <section class="card stack"><h2>Come funziona</h2><ul style="margin:0;padding-left:18px;display:grid;gap:6px"><li>Tocca una riga o una casella e scrivi con la tastiera. Quando una parola è completa viene controllata subito: verde se è giusta, le lettere sbagliate si colorano di rosso.</li><li>Hai <b>${FREE_HINTS} aiuti gratis</b> per livello (rivelano una lettera); poi costano ${HINT_COST} punti. Nessuno resta mai bloccato.</li><li>Tre stelle se finisci senza errori e con al massimo un aiuto. I livelli già fatti si possono rigiocare.</li><li>Ogni livello fa crescere le tue <a href="../abilita/">abilità di gioco</a>: Parole, Creatività, Logica e Memoria.</li></ul></section>
  <section class="card">${AB.widgetHtml('../')}</section>
  <p class="foot"><a href="../" style="color:var(--muted)">← Torna alla home</a> · dizionario di ${ALL.length} parole scritto per questo sito</p>`;
}
function render(){
  const app=$('#app');
  if(!S)app.innerHTML=renderHome();
  else if(S.done)app.innerHTML=renderWin();
  else app.innerHTML=S.mode==='cody'?renderCody():renderCruci();
  const title=$('#barTitle');if(title)title.innerHTML=S?`<a href="./" data-act="quit" style="color:inherit;text-decoration:none">Parole</a> · ${S.daily?'Sfida del giorno':(S.mode==='cody'?'Parola nascosta':'Cruciverba')+' '+S.L}`:`<a href="../" style="color:inherit;text-decoration:none">🧠 Mente Allenata</a> · Parole`;
  if(S&&!S.done&&S.mode==='cruci'){const c=$('.cw .c.cur');if(c&&c.scrollIntoView&&window.innerWidth<=640){const r=c.getBoundingClientRect();if(r.bottom>window.innerHeight-200||r.top<100)c.scrollIntoView({block:'center',behavior:'smooth'})}}
}

// ---------- eventi ----------
document.addEventListener('click',e=>{
  const t=e.target.closest('[data-play],[data-act],[data-k],[data-row],[data-y],[data-slot]');if(!t)return;
  if(t.dataset.play){e.preventDefault();const m=t.dataset.play;if(m==='daily')startCody(1,AB.dayKey());else if(m==='cody')startCody(+t.dataset.l||1);else startCruci(+t.dataset.l||1);return}
  const act=t.dataset.act;
  if(act==='quit'){e.preventDefault();quit();return}
  if(act==='home'){quit();return}
  if(act==='next'){const m=S.mode,L=S.L+1;if(m==='cody')startCody(L);else startCruci(L);return}
  if(!S||S.done)return;
  if(act==='hint'){S.mode==='cody'?codyHint():cruciHint();return}
  if(act==='back'){S.mode==='cody'?codyBack():cruciBack();return}
  if(act==='guess'){if(S.solvedHidden)return;S.guessHidden=!S.guessHidden;S.hg='';render();return}
  if(act==='prevSlot'||act==='nextSlot'){const s=curSlot();const k=S.z.slots.indexOf(s);const n=S.z.slots[(k+(act==='nextSlot'?1:S.z.slots.length-1))%S.z.slots.length];cruciGoSlot(n);return}
  if(t.dataset.k&&t.closest('.kb')){S.mode==='cody'?codyType(t.dataset.k):cruciType(t.dataset.k);return}
  if(S.mode==='cody'&&t.dataset.row!==undefined){const ri=+t.dataset.row;if(S.rows[ri].ok)return;S.guessHidden=false;S.cur=ri;const k=t.dataset.k!==undefined?+t.dataset.k:-1;S.pos=(k>=0&&!S.rows[ri].fixed[k])?k:codyFirstEmpty(S.rows[ri]);render();return}
  if(S.mode==='cruci'&&t.dataset.y!==undefined){cruciSelect(+t.dataset.y,+t.dataset.x);return}
  if(S.mode==='cruci'&&t.dataset.slot){const s=S.z.slots.find(x=>slotKey(x)===t.dataset.slot);if(s)cruciGoSlot(s);return}
});
document.addEventListener('keydown',e=>{
  if(!S||S.done)return;if(e.ctrlKey||e.metaKey||e.altKey)return;
  const k=e.key;
  if(/^[a-zA-Z]$/.test(k)){e.preventDefault();S.mode==='cody'?codyType(k.toUpperCase()):cruciType(k.toUpperCase())}
  else if(k==='Backspace'){e.preventDefault();S.mode==='cody'?codyBack():cruciBack()}
  else if(S.mode==='cruci'&&/^Arrow/.test(k)){e.preventDefault();const d={ArrowUp:[-1,0],ArrowDown:[1,0],ArrowLeft:[0,-1],ArrowRight:[0,1]}[k];let y=S.cy+d[0],x=S.cx+d[1];while(y>=0&&y<S.z.N&&x>=0&&x<S.z.N&&!S.z.cells[y][x]){y+=d[0];x+=d[1]}if(y>=0&&y<S.z.N&&x>=0&&x<S.z.N){S.cy=y;S.cx=x;S.dir=d[0]?1:0;if(!slotAt(y,x,S.dir))S.dir=1-S.dir;render()}}
  else if(k==='Tab'){e.preventDefault();if(S.mode==='cody'){let n=S.cur;for(let q=1;q<=S.rows.length;q++){const j=(S.cur+(e.shiftKey?-q+S.rows.length:q))%S.rows.length;if(!S.rows[j].ok){n=j;break}}S.cur=n;S.pos=codyFirstEmpty(S.rows[n]);render()}else{const s=curSlot();const kk=S.z.slots.indexOf(s);cruciGoSlot(S.z.slots[(kk+(e.shiftKey?S.z.slots.length-1:1))%S.z.slots.length])}}
  else if(k==='Enter'&&S.mode==='cody'&&S.guessHidden){if(S.hg.length===S.z.hidden.length)codyCheckHidden();render()}
});
window.addEventListener('resize',()=>{if(S&&!S.done&&S.mode==='cody')render()});
$('#barSound').innerHTML=FX.soundButtonHtml();FX.bindSoundButton();
// link diretto: ?gioco=cody|cruci|giorno&l=N
const q=new URLSearchParams(location.search);
if(q.get('gioco')==='giorno')startCody(1,AB.dayKey());else if(q.get('gioco')==='cody')startCody(+q.get('l')||P.cody.max);else if(q.get('gioco')==='cruci')startCruci(+q.get('l')||P.cruci.max);else render();
window.Parole={get S(){return S},get P(){return P},buildCody,buildCruci,startCody,startCruci,WORDS};
})();
