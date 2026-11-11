// Sudoku a livelli infiniti: griglie 4×4, 6×6 e 9×9 generate da un seme (stesso livello = stessa griglia),
// soluzione unica garantita, difficoltà che cresce con il livello (meno numeri dati), note a matita,
// suggerimenti, segnalazione errori (spegnibile), salvataggio della partita in corso.
(function(){
'use strict';
const G=window.Giochi,FX=window.Effetti,$=(s)=>document.querySelector(s),esc=G.esc;
const GAME='sudoku';
let P=G.load();
const TM=window.Temi; // ogni livello ha il suo aspetto: numeri classici, numeri colorati, caratteri diversi o figure (animali, frutta…)

// ---- generatore ----
function dims(n){return n===4?[2,2]:n===6?[2,3]:[3,3]} // [righe per box, colonne per box]
function peersFn(n){const [bh,bw]=dims(n);return(i)=>{const r=Math.floor(i/n),c=i%n,br=Math.floor(r/bh)*bh,bc=Math.floor(c/bw)*bw;const s=new Set();for(let k=0;k<n;k++){s.add(r*n+k);s.add(k*n+c)}for(let rr=br;rr<br+bh;rr++)for(let cc=bc;cc<bc+bw;cc++)s.add(rr*n+cc);s.delete(i);return[...s]}}
function makePeers(n){const f=peersFn(n);const out=[];for(let i=0;i<n*n;i++)out.push(f(i));return out}
function candidates(g,peers,i,n){const used=new Set();for(const p of peers[i])if(g[p])used.add(g[p]);const out=[];for(let v=1;v<=n;v++)if(!used.has(v))out.push(v);return out}
function fill(g,peers,n,r){ // riempie una griglia completa con backtracking e ordine casuale
  let best=-1,bestC=null;for(let i=0;i<n*n;i++){if(g[i])continue;const c=candidates(g,peers,i,n);if(!c.length)return false;if(!bestC||c.length<bestC.length){best=i;bestC=c;if(c.length===1)break}}
  if(best<0)return true;
  for(const v of r.shuffle(bestC)){g[best]=v;if(fill(g,peers,n,r))return true}g[best]=0;return false}
function countSol(g,peers,n,limit){ // conta le soluzioni fino a limit
  let best=-1,bestC=null;for(let i=0;i<n*n;i++){if(g[i])continue;const c=candidates(g,peers,i,n);if(!c.length)return 0;if(!bestC||c.length<bestC.length){best=i;bestC=c;if(c.length===1)break}}
  if(best<0)return 1;let tot=0;for(const v of bestC){g[best]=v;tot+=countSol(g,peers,n,limit-tot);if(tot>=limit)break}g[best]=0;return tot}
function genera(level){
  const d=G.d01(G.diffOf(level,P[GAME].diff));
  const n=d<0.08?4:d<0.18?6:9;
  let clues=n===4?(d<0.04?10:8):n===6?Math.round(22-(d-0.08)/0.10*7):Math.round(42-(d-0.18)/0.82*18);
  const r=G.rng('sudoku:'+level+':'+n);const peers=makePeers(n);
  const sol=new Array(n*n).fill(0);fill(sol,peers,n,r);
  const g=sol.slice();const order=r.shuffle([...Array(n*n).keys()]);
  let given=n*n;
  for(const i of order){if(given<=clues)break;const v=g[i];g[i]=0;if(countSol(g.slice(),peers,n,2)===1)given--;else g[i]=v}
  return{n,sol,given:g,peers,clues:given};
}

// ---- stato di gioco ----
let S=null; // {level,n,sol,given,grid,notes,sel,noteMode,hints,errors,start}
function nuovo(level,ripresa){
  const pz=genera(level);
  S={level,diffBase:P[GAME].diff,n:pz.n,sol:pz.sol,given:pz.given,peers:pz.peers,grid:pz.given.slice(),notes:pz.given.map(()=>[]),sel:-1,noteMode:false,hints:0,errors:0,done:false,elapsed:0,tema:TM.temaSudoku(level,pz.n)};
  const c=P[GAME].corso;
  if(ripresa&&c&&c.level===level&&c.n===pz.n&&c.grid&&c.grid.length===pz.n*pz.n){S.grid=c.grid;S.notes=c.notes||S.notes;S.hints=c.hints||0;S.errors=c.errors||0;S.elapsed=c.elapsed||0}
  location.hash='liv='+level;
  G.applySkin(P);G.intestazione(P,GAME,level,S.tema.modo==='figure'?`${pz.n}×${pz.n} · ${pz.clues} figure date`:`${pz.n}×${pz.n} · ${pz.clues} numeri dati`);
  G.timerStart($('#barTimer'),S.elapsed);
  render();FX.beep('start');G.sfidaPronto();
}
function salvaCorso(){if(!S||S.done)return;P=G.load();P[GAME].corso={level:S.level,n:S.n,grid:S.grid,notes:S.notes,hints:S.hints,errors:S.errors,elapsed:tempo()};G.save(P)}
const tempo=()=>G.timerElapsed();

function render(){
  const n=S.n,[bh,bw]=dims(n);const b=$('#board');
  let html='';
  const selV=S.sel>=0?S.grid[S.sel]:0;const peerSet=S.sel>=0?new Set(S.peers[S.sel]):null;
  for(let i=0;i<n*n;i++){const r=Math.floor(i/n),c=i%n;const v=S.grid[i];const given=!!S.given[i];
    const alt=((Math.floor(r/bh)+Math.floor(c/bw))%2)===1;
    const bad=P.imp.errori&&v&&v!==S.sol[i];
    const cls=['c',alt?'alt':'',given?'given':'',(c%bw===bw-1&&c<n-1)?'bR':'',(r%bh===bh-1&&r<n-1)?'bB':'',i===S.sel?'sel':'',(selV&&v===selV&&i!==S.sel)?'same':'',(peerSet&&peerSet.has(i)&&i!==S.sel)?'peer':'',bad?'bad':''].filter(Boolean).join(' ');
    let inner='';if(v)inner=TM.glifoSudoku(S.tema,v);else if(S.notes[i].length){inner='<span class="notes">';for(let k=1;k<=n;k++)inner+=`<i>${S.notes[i].includes(k)?TM.glifoSudoku(S.tema,k):''}</i>`;inner+='</span>'}
    html+=`<div class="${cls}" data-i="${i}" role="button" tabindex="-1" aria-label="riga ${r+1} colonna ${c+1}${v?' valore '+v:''}">${inner}</div>`}
  b.className='sd n'+n+' modo-'+S.tema.modo+(S.tema.font?' font-'+S.tema.font:'')+(TM.skinScura()?' scuro':'');b.style.gridTemplateColumns=`repeat(${n},1fr)`;b.innerHTML=html;
  // tastierino
  const counts=new Array(n+1).fill(0);for(const v of S.grid)if(v)counts[v]++;
  if(G.SFIDA){let tot=0,ok=0;for(let i=0;i<n*n;i++){if(S.given[i])continue;tot++;if(S.grid[i]===S.sol[i])ok++}G.sfidaProgresso(tot?ok/tot*100:100)}
  let pad='';for(let k=1;k<=n;k++)pad+=`<button data-v="${k}" class="${counts[k]>=n?'done':''}" aria-label="${k}">${TM.glifoSudoku(S.tema,k)}<span class="left">${Math.max(0,n-counts[k])}</span></button>`;
  const padEl=$('#pad');padEl.className='sd-pad n'+n+' modo-'+S.tema.modo+(S.tema.font?' font-'+S.tema.font:'');padEl.innerHTML=pad;
  $('#bNote').classList.toggle('on',S.noteMode);
  $('#hintN').textContent=S.hints;$('#errN').textContent=S.errors;$('#errBox').style.display=P.imp.errori?'':'none';
}
function seleziona(i){S.sel=i;render()}
function metti(v){
  if(S.sel<0||S.done){msg('Tocca prima una casella vuota.');return}
  const i=S.sel;if(S.given[i])return;
  if(S.noteMode&&v){if(S.grid[i])return;const k=S.notes[i].indexOf(v);if(k>=0)S.notes[i].splice(k,1);else S.notes[i].push(v);render();salvaCorso();return}
  if(!v){S.grid[i]=0;S.notes[i]=[];render();salvaCorso();return}
  if(S.grid[i]===v){S.grid[i]=0;render();salvaCorso();return}
  S.grid[i]=v;S.notes[i]=[];
  if(v!==S.sol[i]){S.errors++;if(P.imp.errori){FX.beep('bad');msg('Mmm, qui c’è qualcosa che non torna.','bad');FX.shake($('#board'))}else FX.beep('tick')}
  else{FX.beep('ok');msg('');for(const p of S.peers[i]){const k=S.notes[p].indexOf(v);if(k>=0)S.notes[p].splice(k,1)}}
  render();const el=$('#board .c[data-i="'+i+'"]');if(el)el.classList.add('pop');
  salvaCorso();controlla();
}
function suggerimento(){
  if(S.done)return;if(window.Energia&&!Energia.spendi('aiuto'))return;let i=S.sel;
  if(i<0||S.given[i]||S.grid[i]===S.sol[i]){const empties=[];for(let k=0;k<S.grid.length;k++)if(S.grid[k]!==S.sol[k])empties.push(k);if(!empties.length)return;i=(i>=0&&!S.given[i]&&S.grid[i]!==S.sol[i])?i:empties[Math.floor(Math.random()*empties.length)]}
  S.hints++;S.grid[i]=S.sol[i];S.notes[i]=[];for(const p of S.peers[i]){const k=S.notes[p].indexOf(S.sol[i]);if(k>=0)S.notes[p].splice(k,1)}S.sel=i;render();
  const el=$('#board .c[data-i="'+i+'"]');if(el)el.classList.add('hint');FX.beep('tick');msg('Ecco un numero in più. Ogni aiuto costa una stella.');salvaCorso();controlla();
}
function controlla(){
  for(let i=0;i<S.grid.length;i++)if(S.grid[i]!==S.sol[i])return;
  S.done=true;const ms=tempo();G.timerStop();delete P[GAME].corso;
  if(G.SFIDA){G.sfidaFatto(ms,S.errors,S.hints);return}
  const stelle=Math.max(1,3-(S.hints>0?1:0)-(S.errors>2?1:0));
  setTimeout(()=>G.vittoria(P,GAME,S.level,stelle,ms,{next:(L)=>nuovo(L),nota:S.hints?`${S.hints} aiuti`:S.errors?`${S.errors} errori`:'senza aiuti né errori'}),350);
}
function msg(t,cls){const m=$('#msg');m.textContent=t;m.className='g-msg '+(cls||'')}
function aiuto(){G.aiuto('Come si gioca a Sudoku',`<ul>
  <li>Riempi la griglia: ogni <b>riga</b>, ogni <b>colonna</b> e ogni <b>riquadro</b> devono contenere tutti i numeri una sola volta.</li>
  <li>Tocca una casella, poi un numero. Tocca lo stesso numero per cancellarlo.</li>
  <li><b>✏️ Note</b>: segna i numeri possibili in una casella (a matita). Si cancellano da sole quando piazzi il numero vicino.</li>
  <li><b>💡 Aiuto</b> rivela un numero (nella casella scelta o in una a caso). Ogni aiuto costa una stella.</li>
  <li>Le <b>tre stelle</b> si prendono senza aiuti e con al massimo due errori. I livelli sono infiniti: si parte da griglie 4×4, poi 6×6, poi 9×9 con sempre meno numeri dati.</li>
  <li>Ogni livello ha un aspetto diverso: numeri classici, numeri colorati o <b>figure</b> (animali, frutta, forme…). Con le figure la regola è la stessa: ogni figura una sola volta per riga, colonna e riquadro. Da tastiera i tasti 1-9 corrispondono alle figure nell’ordine della tastiera in basso.</li>
  <li>Da tastiera: frecce per muoverti, numeri per scrivere, Canc per cancellare, N per le note.</li></ul>`)}

// ---- eventi ----
$('#board').addEventListener('click',e=>{const c=e.target.closest('.c');if(c)seleziona(+c.dataset.i)});
$('#pad').addEventListener('click',e=>{const b=e.target.closest('button');if(b)metti(+b.dataset.v)});
$('#bNote').addEventListener('click',()=>{S.noteMode=!S.noteMode;render()});
$('#bDel').addEventListener('click',()=>metti(0));
$('#bHint').addEventListener('click',suggerimento);
document.addEventListener('keydown',e=>{if(!S||document.getElementById('gOv'))return;const n=S.n;
  if(/^[1-9]$/.test(e.key)&&+e.key<=n){metti(+e.key);e.preventDefault()}
  else if(e.key==='Backspace'||e.key==='Delete'||e.key==='0'){metti(0);e.preventDefault()}
  else if(e.key==='n'||e.key==='N'){S.noteMode=!S.noteMode;render()}
  else if(e.key.startsWith('Arrow')){let i=S.sel<0?0:S.sel;const r=Math.floor(i/n),c=i%n;
    if(e.key==='ArrowUp'&&r>0)i-=n;if(e.key==='ArrowDown'&&r<n-1)i+=n;if(e.key==='ArrowLeft'&&c>0)i--;if(e.key==='ArrowRight'&&c<n-1)i++;seleziona(i);e.preventDefault()}});
G.bottoniComuni(()=>P,GAME,{vai:(L)=>nuovo(L,true),ricarica:()=>{P=G.load();if(P[GAME].diff!==S.diffBase){nuovo(P[GAME].next,true);return}G.applySkin(P);G.intestazione(P,GAME,S.level,`${S.n}×${S.n}`);render()},aiuto});
G.onSync=()=>{P=G.load();G.applySkin(P)};G.onStop=()=>{if(S){S.done=true;render()}};
if($('#barSound')){$('#barSound').innerHTML=FX.soundButtonHtml();FX.bindSoundButton()}
window.addEventListener('beforeunload',salvaCorso);
nuovo(G.livelloDaUrl(P,GAME),true);
window.Sudoku={get S(){return S},get P(){return P},nuovo,metti,genera};
})();
