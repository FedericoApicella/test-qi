// Queens a livelli infiniti: una regina per riga, per colonna e per regione colorata, e due regine
// non possono toccarsi (nemmeno in diagonale). Griglie da 5×5 a 11×11 generate da un seme con
// soluzione unica. Tocca una casella: ✕ (esclusa) → 👑 → vuota.
(function(){
'use strict';
const G=window.Giochi,FX=window.Effetti,$=(s)=>document.querySelector(s);
const GAME='queens';
let P=G.load();
const CHIARI=['#fecaca','#fed7aa','#fef08a','#bbf7d0','#a5f3fc','#c7d2fe','#f5d0fe','#fbcfe8','#d9f99d','#e7e5e4','#bae6fd'];
const SCURI=['#7f1d1d','#7c2d12','#713f12','#14532d','#164e63','#312e81','#701a75','#831843','#365314','#44403c','#0c4a6e'];
const SKIN_SCURE={notte:1,neon:1,oro:1,lava:1,galassia:1};
const NOMI=['rossa','arancio','gialla','verde','azzurra','indaco','viola','rosa','lime','grigia','blu'];

// ---- generatore ----
function soluzione(n,r){ // permutazione senza regine adiacenti
  const cols=[];const used=new Array(n).fill(false);
  function go(row){if(row===n)return true;const ord=r.shuffle([...Array(n).keys()]);for(const c of ord){if(used[c])continue;if(row>0&&Math.abs(cols[row-1]-c)<=1)continue;cols[row]=c;used[c]=true;if(go(row+1))return true;used[c]=false}return false}
  return go(0)?cols:null}
function regioni(n,cols,r,compatto){
  const reg=new Array(n*n).fill(-1);
  for(let row=0;row<n;row++)reg[row*n+cols[row]]=row;
  const size=new Array(n).fill(1);
  const vic=(i)=>{const row=Math.floor(i/n),c=i%n;const o=[];if(row>0)o.push(i-n);if(row<n-1)o.push(i+n);if(c>0)o.push(i-1);if(c<n-1)o.push(i+1);return o};
  let left=n*n-n;
  while(left>0){
    const front=[];for(let i=0;i<n*n;i++){if(reg[i]>=0)continue;const nb=vic(i).filter(j=>reg[j]>=0);if(nb.length)front.push([i,nb])}
    let pick;
    if(compatto&&r()<0.7){ // fa crescere la regione più piccola, per forme più regolari
      front.sort((a,b)=>Math.min(...a[1].map(j=>size[reg[j]]))-Math.min(...b[1].map(j=>size[reg[j]])));pick=front[Math.floor(r()*Math.min(3,front.length))]}
    else pick=r.pick(front);
    const [i,nb]=pick;const j=r.pick(nb);reg[i]=reg[j];size[reg[j]]++;left--;
  }
  return reg}
function conta(n,reg,limit){ // numero di soluzioni (fino a limit)
  let tot=0;const usedC=new Array(n).fill(false),usedR=new Array(n).fill(false);const cols=[];
  function go(row){if(tot>=limit)return;if(row===n){tot++;return}
    for(let c=0;c<n;c++){if(usedC[c])continue;const g=reg[row*n+c];if(usedR[g])continue;if(row>0&&Math.abs(cols[row-1]-c)<=1)continue;usedC[c]=true;usedR[g]=true;cols[row]=c;go(row+1);usedC[c]=false;usedR[g]=false}}
  go(0);return tot}
function connessa(n,reg,g,start){ // la regione g resta tutta collegata partendo da start?
  const tot=reg.filter(x=>x===g).length;const seen=new Set([start]);const st=[start];
  while(st.length){const i=st.pop();const row=Math.floor(i/n),c=i%n;for(const j of [row>0?i-n:-1,row<n-1?i+n:-1,c>0?i-1:-1,c<n-1?i+1:-1])if(j>=0&&!seen.has(j)&&reg[j]===g){seen.add(j);st.push(j)}}
  return seen.size===tot}
function seconda(n,reg,cols){ // una soluzione diversa da cols, se esiste
  let found=null;const usedC=new Array(n).fill(false),usedR=new Array(n).fill(false);const cur=[];
  function go(row){if(found)return;if(row===n){if(cur.some((c,r)=>c!==cols[r]))found=cur.slice();return}
    for(let c=0;c<n;c++){if(usedC[c])continue;const g=reg[row*n+c];if(usedR[g])continue;if(row>0&&Math.abs(cur[row-1]-c)<=1)continue;usedC[c]=true;usedR[g]=true;cur[row]=c;go(row+1);usedC[c]=false;usedR[g]=false}}
  go(0);return found}
function genera(level){
  const d=G.d01(G.diffOf(level,P[GAME].diff));const n=5+Math.round(6*d);
  const r=G.rng('queens:'+level+':'+n);
  for(let tent=0;tent<30;tent++){
    const cols=soluzione(n,r);if(!cols)continue;
    const reg=regioni(n,cols,r,d<0.5);
    // "ripara" le regioni finché la soluzione non è unica: sposta la casella di una regina
    // alternativa in una regione vicina (che l'alternativa usa già altrove), tenendo le regioni collegate
    let ok=false;
    for(let k=0;k<300;k++){
      const alt=seconda(n,reg,cols);if(!alt){ok=true;break}
      const rows=r.shuffle([...Array(n).keys()].filter(row=>alt[row]!==cols[row]));let mosso=false;
      for(const row of rows){const i=row*n+alt[row];const g=reg[i];const c=i%n;
        const vic=r.shuffle([row>0?i-n:-1,row<n-1?i+n:-1,c>0?i-1:-1,c<n-1?i+1:-1].filter(j=>j>=0&&reg[j]!==g));
        for(const j of vic){reg[i]=reg[j];if(connessa(n,reg,g,g*n+cols[g])){mosso=true;break}reg[i]=g}
        if(mosso)break}
      if(!mosso)break;
    }
    if(ok&&conta(n,reg,2)===1)return{n,cols,reg};
  }
  const cols=soluzione(n,r);return{n,cols,reg:regioni(n,cols,r,true)};
}

// ---- stato ----
let S=null;
function nuovo(level,ripresa){
  const pz=genera(level);
  S={level,diffBase:P[GAME].diff,n:pz.n,cols:pz.cols,reg:pz.reg,cell:new Array(pz.n*pz.n).fill(0),hints:0,done:false,elapsed:0};
  const c=P[GAME].corso;
  if(ripresa&&c&&c.level===level&&c.n===pz.n&&c.cell&&c.cell.length===pz.n*pz.n){S.cell=c.cell;S.hints=c.hints||0;S.elapsed=c.elapsed||0}
  location.hash='liv='+level;
  G.applySkin(P);G.intestazione(P,GAME,level,`${pz.n}×${pz.n} · ${pz.n} regine`);
  G.timerStart($('#barTimer'),S.elapsed);
  render();FX.beep('start');msg('');
}
function salvaCorso(){if(!S||S.done)return;P=G.load();P[GAME].corso={level:S.level,n:S.n,cell:S.cell,hints:S.hints,elapsed:G.timerElapsed()};G.save(P)}
function conflitti(){ // indici delle regine in conflitto
  const n=S.n;const qs=[];for(let i=0;i<n*n;i++)if(S.cell[i]===2)qs.push(i);const bad=new Set();
  for(let a=0;a<qs.length;a++)for(let b=a+1;b<qs.length;b++){const i=qs[a],j=qs[b];const ri=Math.floor(i/n),ci=i%n,rj=Math.floor(j/n),cj=j%n;
    if(ri===rj||ci===cj||S.reg[i]===S.reg[j]||(Math.abs(ri-rj)<=1&&Math.abs(ci-cj)<=1)){bad.add(i);bad.add(j)}}
  return{qs,bad}}
function render(){
  const n=S.n;const scuro=SKIN_SCURE[document.body.dataset.skin];const pal=scuro?SCURI:CHIARI;
  const {qs,bad}=conflitti();const mostra=P.imp.errori;
  const regOk=new Set();if(qs.length===n&&!bad.size)qs.forEach(i=>regOk.add(S.reg[i]));
  let html='';
  for(let i=0;i<n*n;i++){const row=Math.floor(i/n),c=i%n;const g=S.reg[i];
    const bT=row>0&&S.reg[i-n]!==g,bL=c>0&&S.reg[i-1]!==g;
    const v=S.cell[i];
    html+=`<div class="c ${bT?'bT':''} ${bL?'bL':''} ${mostra&&bad.has(i)?'bad':''} ${regOk.has(g)?'done':''}" data-i="${i}" style="background:${pal[g%pal.length]}" role="button" aria-label="riga ${row+1} colonna ${c+1} regione ${NOMI[g%NOMI.length]}${v===2?' regina':v===1?' esclusa':''}">${v===2?'<span class="q">👑</span>':v===1?'<span class="x">✕</span>':''}</div>`}
  const b=$('#board');b.style.gridTemplateColumns=`repeat(${n},1fr)`;b.innerHTML=html;
  $('#qN').textContent=`${qs.length}/${n}`;$('#hintN').textContent=S.hints;
}
function tocca(i){if(S.done)return;S.cell[i]=(S.cell[i]+1)%3;FX.beep(S.cell[i]===2?'ok':'tick');render();salvaCorso();controlla()}
function controlla(){const {qs,bad}=conflitti();if(qs.length!==S.n)return;
  if(bad.size){if(P.imp.errori){msg('Ci sono regine che si disturbano: guarda quelle segnate in rosso.','bad')}else msg('Tutte le regine sono piazzate, ma qualcosa non va: controlla righe, colonne, colori e vicinanze.','bad');return}
  S.done=true;const ms=G.timerStop();delete P[GAME].corso;const par=(20+S.n*S.n*2)*1000;
  const stelle=Math.max(1,3-(S.hints>0?1:0)-(ms>par?1:0));
  setTimeout(()=>G.vittoria(P,GAME,S.level,stelle,ms,{next:(L)=>nuovo(L),nota:S.hints?`${S.hints} aiuti`:ms<=par?'veloce e senza aiuti':'senza aiuti'}),350)}
function suggerimento(){if(S.done)return;const n=S.n;const rows=[];for(let r=0;r<n;r++){const i=r*n+S.cols[r];if(S.cell[i]!==2)rows.push(r)}if(!rows.length)return;
  const r=rows[Math.floor(Math.random()*rows.length)];for(let c=0;c<n;c++)if(S.cell[r*n+c]===2)S.cell[r*n+c]=0;const i=r*n+S.cols[r];S.cell[i]=2;S.hints++;render();
  const el=$('#board .c[data-i="'+i+'"]');if(el)el.classList.add('hint');FX.beep('tick');msg(`La regina della riga ${r+1} va qui. Ogni aiuto costa una stella.`);salvaCorso();controlla()}
function pulisci(){if(S.done)return;S.cell.fill(0);render();salvaCorso();msg('')}
function msg(t,cls){const m=$('#msg');m.textContent=t;m.className='g-msg '+(cls||'')}
function aiuto(){G.aiuto('Come si gioca a Queens',`<ul>
  <li>Metti una <b>regina 👑 in ogni riga, in ogni colonna e in ogni regione colorata</b>.</li>
  <li>Due regine <b>non possono toccarsi</b>, nemmeno in diagonale.</li>
  <li>Tocca una casella una volta per segnarla con ✕ (lì non ci va), due volte per mettere la regina, tre per svuotarla.</li>
  <li>Trucco: una regione di una sola casella contiene per forza la regina; se una regione sta tutta in una riga, le altre caselle della riga si possono escludere.</li>
  <li><b>💡 Aiuto</b> piazza la regina giusta in una riga. Tre stelle: senza aiuti e in tempo (il tempo di riferimento cresce con la griglia).</li>
  <li>Ogni livello ha una sola soluzione. Salendo si passa da 5×5 a 11×11 con regioni sempre più strane.</li></ul>`)}

$('#board').addEventListener('click',e=>{const c=e.target.closest('.c');if(c)tocca(+c.dataset.i)});
$('#bHint').addEventListener('click',suggerimento);$('#bClear').addEventListener('click',pulisci);
G.bottoniComuni(()=>P,GAME,{vai:(L)=>nuovo(L,true),ricarica:()=>{P=G.load();if(P[GAME].diff!==S.diffBase){nuovo(P[GAME].next,true);return}G.applySkin(P);G.intestazione(P,GAME,S.level,`${S.n}×${S.n} · ${S.n} regine`);render()},aiuto});
G.onSync=()=>{P=G.load();G.applySkin(P);render()};
if($('#barSound')){$('#barSound').innerHTML=FX.soundButtonHtml();FX.bindSoundButton()}
window.addEventListener('beforeunload',salvaCorso);
nuovo(G.livelloDaUrl(P,GAME),true);
window.Queens={get S(){return S},get P(){return P},nuovo,tocca,genera,conta};
})();
