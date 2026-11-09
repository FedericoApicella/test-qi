// Famiglie aggiuntive di quesiti (si registrano in Quesiti e compaiono in allenamento, storia e sfide).
// Ogni generatore riceve (rng, level 0..1, used) e restituisce un quesito "generico":
//   {q, sub?, stim (html), options:[testo | svg], fig?, mono?, raw?, answer, rule, spiega?}
// Tutto è deterministico dal seme: con lo stesso seme i due sfidanti vedono lo stesso quesito.
// La difficoltà cresce con level: più elementi, più regole, distrattori più vicini.
(function(){
'use strict';
const Q=window.Quesiti;if(!Q)return;
const {shuffled,pick,rint,withAnswer,esc,cap,norm,tf,rotF,symsF,connected,randomPoly,differentShape,fkey,key}=Q.util;
const {cellSVG,cellsSVG,drawShape,registra}=Q;
const L='ABCDEF';
const clamp01=(x)=>Math.max(0,Math.min(1,x));
const lv=(level,lo,hi)=>lo+Math.round(clamp01(level)*(hi-lo)); // intero proporzionale al livello
const uniq=(arr)=>arr.filter((x,i)=>arr.indexOf(x)===i);
// opzioni testuali: risposta + distrattori unici, in ordine casuale; null se non bastano
function textOpts(ans,cands,n,rng){const opts=[ans];for(const c of cands){if(opts.length>=n)break;if(c!==null&&c!==undefined&&c!==ans&&!opts.includes(c))opts.push(c)}if(opts.length<n)return null;return withAnswer(opts,rng)}
// opzioni numeriche: completa con numeri vicini se i candidati non bastano
function numOpts(ans,cands,n,rng){const opts=[ans];for(const c of shuffled(cands,rng)){if(opts.length>=n)break;if(Number.isFinite(c)&&c!==ans&&!opts.includes(c)&&c>=0)opts.push(c)}for(let k=1;opts.length<n&&k<60;k++){const c=ans+(k%2?Math.ceil(k/2):-Math.ceil(k/2));if(c>=0&&!opts.includes(c))opts.push(c)}return withAnswer(opts,rng)}
const SHAPES=['circle','square','triangle','diamond','pent','hex'],FILLS=['none','half','full'],SIZES=['s','m','l'];
const SH_IT={circle:'cerchio',square:'quadrato',triangle:'triangolo',diamond:'rombo',pent:'pentagono',hex:'esagono',arrow:'freccia'};
const SH_PL={circle:'cerchi',square:'quadrati',triangle:'triangoli',diamond:'rombi',pent:'pentagoni',hex:'esagoni',arrow:'frecce'};
const FI_IT={none:'vuoto',half:'mezzo pieno',full:'pieno'};
const SZ_IT={s:'piccolo',m:'medio',l:'grande'};
const elKey=(e)=>[e.shape,e.fill,e.size||'m',e.rot||0,e.count||1].join('|');
const el=(o)=>Object.assign({shape:'circle',fill:'none',size:'m',rot:0,count:1},o);
const svgEl=(e)=>cellSVG({els:[e],count:e.count||1});
const figbox=(inner,cls)=>`<div class="figrow ${cls||''}">${inner}</div>`;
const cellBox=(e,cls)=>`<div class="cell ${cls||''}">${typeof e==='string'?e:svgEl(e)}</div>`;

// ======================================================================
// AREA FIGURE (mat)
// ======================================================================
// ---- serie di figure: quattro figure, la quinta segue le stesse regole ----
const CYC={shape:SHAPES,fill:FILLS,size:SIZES,rot:[0,45,90,135,180,225,270,315],count:[1,2,3,4]};
function figSerie(rng,level){
  const nRules=1+Math.floor(clamp01(level)*2.4); // 1..3 regole insieme
  const attrs=shuffled(['shape','fill','size','count','rot'],rng);
  const arrow=attrs.slice(0,nRules).includes('rot');
  const base=el({shape:arrow?'arrow':pick(SHAPES,rng),fill:pick(FILLS,rng),size:'m',rot:0,count:1});
  const rules=[];
  for(const a of attrs){if(rules.length>=nRules)break;if(a==='shape'&&arrow)continue;
    const cyc=CYC[a];let step=1;if(a==='rot')step=pick([1,2,3],rng)*(rng()<0.3?-1:1);else if(a==='count')step=rng()<0.5?1:-1;else step=rng()<0.75?1:-1;
    rules.push({a,step,start:a==='rot'?pick([0,1,2],rng):Math.floor(rng()*cyc.length)})}
  const at=(i)=>{const e=Object.assign({},base);rules.forEach(r=>{const cyc=CYC[r.a];let idx=((r.start+i*r.step)%cyc.length+cyc.length)%cyc.length;e[r.a]=cyc[idx]});return e};
  const seq=[0,1,2,3,4].map(at);const ans=seq[4];
  const used=new Set([elKey(ans)]);const cands=[];
  for(const a of ['shape','fill','size','count','rot']){if(a==='rot'&&!arrow)continue;if(a==='shape'&&arrow)continue;for(const v of CYC[a]){if(ans[a]===v)continue;const d=Object.assign({},ans);d[a]=v;cands.push({d,w:rules.some(r=>r.a===a)?1.2:0.5})}}
  cands.push({d:seq[3],w:1.3},{d:at(5),w:1.4},{d:at(6),w:0.6});
  const opts=[ans];for(const c of shuffled(cands,rng).sort((x,y)=>y.w-x.w)){const k=elKey(c.d);if(used.has(k))continue;used.add(k);opts.push(c.d);if(opts.length===5)break}
  if(opts.length<4)return null;
  const w=withAnswer(opts.map(svgEl),rng);
  const txt=rules.map(r=>{if(r.a==='shape')return`la forma segue l'ordine ${SH_IT[seq[0].shape]} → ${SH_IT[seq[1].shape]} → ${SH_IT[seq[2].shape]}…`;if(r.a==='fill')return`il riempimento cambia a ogni passo (${FI_IT[seq[0].fill]}, ${FI_IT[seq[1].fill]}, ${FI_IT[seq[2].fill]}…)`;if(r.a==='size')return`la dimensione cambia a ogni passo (${SZ_IT[seq[0].size]}, ${SZ_IT[seq[1].size]}, ${SZ_IT[seq[2].size]}…)`;if(r.a==='count')return`il numero di figure ${r.step>0?'aumenta':'diminuisce'} di 1 a ogni passo`;return`la freccia ruota di ${Math.abs(r.step)*45}° ${r.step>0?'in senso orario':'in senso antiorario'} a ogni passo`}).join('; ');
  const stim=figbox(seq.slice(0,4).map(e=>cellBox(e)).join('')+`<div class="cell ask">?</div>`);
  return{q:'Quale figura continua la serie?',stim,options:w.options,fig:true,answer:w.answer,rule:txt};
}
registra('mat',{id:'figserie',nome:'Serie di figure',d:[0.08,1],w:1,gen:figSerie});

// ---- analogia di figure: A sta a B come C sta a ? ----
const TRANS=[
  {id:'fill',d:0,ok:(e)=>true,f:(e)=>Object.assign({},e,{fill:FILLS[(FILLS.indexOf(e.fill)+1)%3]}),t:'il riempimento passa al grado successivo (vuoto → mezzo → pieno → vuoto)'},
  {id:'size',d:0,ok:(e)=>e.size!=='l'&&(e.count||1)===1,f:(e)=>Object.assign({},e,{size:e.size==='s'?'m':'l'}),t:'la figura diventa più grande'},
  {id:'count+',d:0.1,ok:(e)=>(e.count||1)<4&&e.size!=='l',f:(e)=>Object.assign({},e,{count:(e.count||1)+1}),t:'si aggiunge una figura'},
  {id:'count-',d:0.2,ok:(e)=>(e.count||1)>1,f:(e)=>Object.assign({},e,{count:(e.count||1)-1}),t:'si toglie una figura'},
  {id:'rot',d:0.25,ok:(e)=>e.shape==='arrow'||e.shape==='triangle',f:(e)=>Object.assign({},e,{rot:((e.rot||0)+90)%360}),t:'la figura ruota di 90° in senso orario'},
  {id:'rot45',d:0.45,ok:(e)=>e.shape==='arrow',f:(e)=>Object.assign({},e,{rot:((e.rot||0)+45)%360}),t:'la figura ruota di 45° in senso orario'},
  {id:'shape',d:0.35,ok:(e)=>e.shape!=='arrow',f:(e)=>Object.assign({},e,{shape:SHAPES[(SHAPES.indexOf(e.shape)+1)%SHAPES.length]}),t:'la forma passa alla successiva della serie cerchio → quadrato → triangolo → rombo → pentagono → esagono'},
];
function figAnalogia(rng,level){
  const n=level<0.45?1:2;
  for(let t=0;t<40;t++){
    const pool=TRANS.filter(x=>x.d<=level+0.15);
    const trs=shuffled(pool,rng).slice(0,n);if(uniq(trs.map(x=>x.id.replace(/[+-]/,''))).length<n)continue;
    const needArrow=trs.some(x=>x.id.startsWith('rot'));
    const mk=()=>el({shape:needArrow?(rng()<0.7?'arrow':'triangle'):pick(SHAPES,rng),fill:pick(FILLS,rng),size:pick(['s','m'],rng),rot:needArrow?pick([0,90,180,270],rng):0,count:rint(rng,1,2)});
    const A=mk();let C=mk();if(elKey(C)===elKey(A))continue;
    if(!trs.every(x=>x.ok(A)))continue;
    const apply=(e)=>{let r=e;for(const x of trs){if(!x.ok(r))return null;r=x.f(r)}return r};
    const B=apply(A);if(!B)continue;const D=apply(C);if(!D)continue;
    if(elKey(B)===elKey(A)||elKey(D)===elKey(C)||elKey(D)===elKey(B))continue;
    const used=new Set([elKey(D)]);const cands=[];
    if(n===2){trs.forEach(x=>{if(x.ok(C))cands.push({d:x.f(C),w:1.5})})}
    cands.push({d:C,w:1},{d:B,w:1.1});
    TRANS.forEach(x=>{if(x.ok(C))cands.push({d:x.f(C),w:0.9});if(x.ok(D))cands.push({d:x.f(D),w:0.8})});
    const opts=[D];for(const c of shuffled(cands,rng).sort((x,y)=>y.w-x.w)){if(!c.d)continue;const k=elKey(c.d);if(used.has(k))continue;used.add(k);opts.push(c.d);if(opts.length===5)break}
    if(opts.length<4)continue;
    const w=withAnswer(opts.map(svgEl),rng);
    const stim=figbox(cellBox(A)+`<span class="op">:</span>`+cellBox(B)+`<span class="op">=</span>`+cellBox(C)+`<span class="op">:</span>`+`<div class="cell ask">?</div>`,'analog');
    return{q:'La prima figura sta alla seconda come la terza sta a…?',stim,options:w.options,fig:true,answer:w.answer,rule:`da sinistra a destra ${trs.map(x=>x.t).join(' e ')}: la stessa trasformazione va applicata alla terza figura`};
  }
  return null;
}
registra('mat',{id:'figanalogia',nome:'Analogia di figure',d:[0,1],w:1,gen:figAnalogia});

// ---- intruso tra figure: una sola rompe la regola comune ----
function figIntruso(rng,level){
  const n=level<0.3?5:6;
  const attrs=['shape','fill','size','count'];
  const target=pick(attrs,rng);
  const nFree=level<0.25?0:level<0.6?1:2; // attributi che cambiano liberamente (rumore)
  const free=shuffled(attrs.filter(a=>a!==target),rng).slice(0,nFree);
  const common=el({shape:pick(SHAPES,rng),fill:pick(FILLS,rng),size:pick(SIZES,rng),count:rint(rng,1,3)});
  if(common.size==='l')common.count=1;
  const cells=[];const seen=new Set();
  for(let i=0;i<n;i++){let e;for(let t=0;t<30;t++){e=Object.assign({},common);free.forEach(a=>{e[a]=pick(CYC[a].slice(0,a==='count'?3:undefined),rng)});if(e.size==='l'&&e.count>1)e.count=1;if(!seen.has(elKey(e))||t>20)break}seen.add(elKey(e));cells.push(e)}
  const odd=Object.assign({},cells[0]);const vals=CYC[target].slice(0,target==='count'?4:undefined).filter(v=>v!==common[target]);odd[target]=pick(vals,rng);if(odd.size==='l'&&odd.count>1)odd.count=1;
  if(odd.size==='l'&&target==='count')return null;
  cells[0]=odd;if(cells.slice(1).some(c=>elKey(c)===elKey(odd)))return null;
  const w=withAnswer(cells.map(svgEl),rng);
  const what=target==='shape'?`tutte le figure sono ${SH_PL[common.shape]}, tranne una (${SH_IT[odd.shape]})`:target==='fill'?`tutte le figure hanno riempimento ${FI_IT[common.fill]}, tranne una (${FI_IT[odd.fill]})`:target==='size'?`tutte le figure sono di dimensione ${SZ_IT[common.size]}, tranne una (${SZ_IT[odd.size]})`:`in ogni casella ci sono ${common.count} ${common.count===1?'figura':'figure'}, tranne in una (${odd.count})`;
  const noise=free.length?` ${free.map(a=>({shape:'la forma',fill:'il riempimento',size:'la dimensione',count:'il numero'}[a])).join(' e ')} ${free.length>1?'cambiano':'cambia'} a caso e non ${free.length>1?'contano':'conta'}.`:'';
  return{q:'Quale figura è l\'intrusa?',sub:'Una sola non rispetta la regola che accomuna tutte le altre.',stim:'',options:w.options,fig:true,answer:w.answer,rule:`${what};${noise}`.replace(/;$/,'')};
}
registra('mat',{id:'figintruso',nome:'Intruso tra figure',d:[0,0.85],w:0.9,gen:figIntruso});

// ======================================================================
// AREA NUMERI (num)
// ======================================================================
const ALFA='ABCDEFGHILMNOPQRSTUVZ'; // alfabeto italiano, 21 lettere
const letterAt=(i)=>ALFA[((i%21)+21)%21];
// ---- serie di lettere ----
function serieLettere(rng,level){
  const gens=[
    [0,()=>{const k=rint(rng,1,3),s=rint(rng,0,20-5*k>0?20-5*k:0);const idx=[0,1,2,3,4].map(i=>s+i*k);return{idx,next:s+5*k,rule:`si salta di ${k} ${k===1?'lettera':'lettere'} ogni volta (${letterAt(s)} → ${letterAt(s+k)} → ${letterAt(s+2*k)}…)`}}],
    [0.15,()=>{const k=rint(rng,1,3),s=rint(rng,4*k+2,20);const idx=[0,1,2,3,4].map(i=>s-i*k);return{idx,next:s-5*k,rule:`si torna indietro di ${k} ${k===1?'lettera':'lettere'} ogni volta`}}],
    [0.3,()=>{const s=rint(rng,0,4),d0=rint(rng,1,2);const idx=[s];let v=s;for(let i=0;i<4;i++){v+=d0+i;idx.push(v)}return{idx,next:v+d0+4,rule:`i salti crescono: +${d0}, +${d0+1}, +${d0+2}, +${d0+3}…`}}],
    [0.45,()=>{const a=rint(rng,0,8),b=rint(rng,0,8),ka=rint(rng,1,2),kb=rint(rng,1,3);const idx=[];for(let i=0;i<3;i++){idx.push(a+i*ka,b+i*kb)}return{idx:idx.slice(0,5),next:idx[5],rule:`due serie alternate: una avanza di ${ka} (${letterAt(a)}, ${letterAt(a+ka)}, ${letterAt(a+2*ka)}…), l'altra di ${kb} (${letterAt(b)}, ${letterAt(b+kb)}…)`}}],
    [0.6,()=>{const s=rint(rng,0,20),k=rint(rng,4,9);const idx=[0,1,2,3,4].map(i=>s+i*k);return{idx,next:s+5*k,wrap:true,rule:`si avanza di ${k} lettere ogni volta, ricominciando dall'inizio dell'alfabeto dopo la Z`}}],
    [0.7,()=>{const c=rint(rng,4,16);const idx=[c,c-1,c+1,c-2,c+2];return{idx,next:c-3,rule:`le lettere si allontanano alternativamente a sinistra e a destra della lettera centrale ${letterAt(c)}: −1, +1, −2, +2, −3…`}}],
    [0.8,()=>{const s=rint(rng,0,6);const idx=[s,s+1,s+3,s+6,s+10];return{idx,next:s+15,rule:'i salti crescono di uno alla volta: +1, +2, +3, +4, +5 (numeri triangolari)'}}],
  ];
  const eff=clamp01(level);let pool=gens.filter(g=>Math.abs(g[0]-eff)<=0.2);if(pool.length<2)pool=gens.filter(g=>Math.abs(g[0]-eff)<=0.35);if(!pool.length)pool=gens;
  const g=pick(pool,rng)[1]();if(!g)return null;
  if(!g.wrap&&(g.idx.some(i=>i<0||i>20)||g.next<0||g.next>20))return serieLettere(rng,Math.max(0,level-0.1));
  const seq=g.idx.map(letterAt),ans=letterAt(g.next);
  if(seq.includes(ans)&&!g.wrap)return null;
  const cands=[g.next+1,g.next-1,g.next+2,g.next-2,g.next+3,g.next-3,g.next+4,g.next-4].map(letterAt).filter(c=>c!==ans&&!seq.includes(c));
  const w=textOpts(ans,shuffled(uniq(cands),rng),5,rng);if(!w)return null;
  const stim=`<div class="seq mono">${seq.map(c=>`<span>${c}</span>`).join('')}<span class="qm">?</span></div>`;
  return{q:'Quale lettera continua la serie?',sub:'Alfabeto italiano di 21 lettere: A B C D E F G H I L M N O P Q R S T U V Z.',stim,options:w.options,mono:true,answer:w.answer,rule:g.rule};
}
registra('num',{id:'lettere',nome:'Serie di lettere',d:[0,0.9],w:0.9,gen:serieLettere});

// ---- matrice di numeri 3×3 ----
function matNum(rng,level){
  const rules=[
    [0,'somma',(a,b)=>a+b,'in ogni riga il terzo numero è la somma dei primi due',()=>[rint(rng,1,20),rint(rng,1,20)]],
    [0.1,'diff',(a,b)=>a-b,'in ogni riga il terzo numero è il primo meno il secondo',()=>{const b=rint(rng,1,15);return[b+rint(rng,1,20),b]}],
    [0.3,'prod',(a,b)=>a*b,'in ogni riga il terzo numero è il prodotto dei primi due',()=>[rint(rng,2,9),rint(rng,2,9)]],
    [0.4,'somma1',(a,b)=>a+b+1,'in ogni riga il terzo numero è la somma dei primi due più 1',()=>[rint(rng,1,20),rint(rng,1,20)]],
    [0.5,'doppio',(a,b)=>2*(a+b),'in ogni riga il terzo numero è il doppio della somma dei primi due',()=>[rint(rng,1,12),rint(rng,1,12)]],
    [0.6,'prodmeno',(a,b)=>a*b-a,'in ogni riga il terzo numero è il prodotto dei primi due meno il primo',()=>[rint(rng,2,9),rint(rng,2,9)]],
    [0.75,'quad',(a,b)=>a*a-b,'in ogni riga il terzo numero è il quadrato del primo meno il secondo',()=>{const a=rint(rng,3,9);return[a,rint(rng,1,a*a-1)]}],
    [0.85,'prodsomma',(a,b)=>a*b+a+b,'in ogni riga il terzo numero è prodotto più somma dei primi due',()=>[rint(rng,2,8),rint(rng,2,8)]],
  ];
  const eff=clamp01(level);let pool=rules.filter(r=>Math.abs(r[0]-eff)<=0.2);if(pool.length<2)pool=rules.filter(r=>Math.abs(r[0]-eff)<=0.35);
  const R=pick(pool,rng);
  const grid=[];for(let r=0;r<3;r++){const [a,b]=R[4]();grid.push(a,b,R[2](a,b))}
  if(grid.some(x=>x<0||x>400))return null;
  // la casella mancante: in basso a destra ai livelli bassi, ovunque ai livelli alti (allora va invertita la regola)
  const miss=level<0.35?8:level<0.6?pick([2,5,8],rng):rint(rng,0,8);
  const ans=grid[miss];
  const perCol=level>=0.5&&rng()<0.35; // variante per colonna
  let shown=grid.slice();
  if(perCol){const t=[];for(let c=0;c<3;c++)for(let r=0;r<3;r++)t.push(grid[r*3+c]);shown=t}
  const missIdx=perCol?(miss%3)*3+Math.floor(miss/3):miss;
  const others=shown.filter((x,i)=>i!==missIdx);
  const cands=[ans+1,ans-1,ans+2,ans-2,ans+3,ans-3,ans+5,ans-5,ans+10,ans-10,Math.round(ans*1.5),...others];
  const w=numOpts(ans,cands,5,rng);
  const stim=`<div class="grid3 nums">${shown.map((x,i)=>i===missIdx?`<div class="cell ask">?</div>`:`<div class="cell num mono">${x}</div>`).join('')}</div>`;
  const rule=perCol?R[3].replace('riga','colonna'):R[3];
  return{q:'Quale numero manca nella griglia?',sub:'La stessa regola vale per ogni '+(perCol?'colonna':'riga')+'.',stim,options:w.options,mono:true,answer:w.answer,rule:`${rule}: manca ${ans}`};
}
registra('num',{id:'matnum',nome:'Matrice di numeri',d:[0.15,1],w:1,gen:matNum});

// ---- equazioni con simboli ----
const SYM=['●','▲','■','◆','★'];
function simboli(rng,level){
  const nU=level<0.3?2:level<0.7?3:3; // incognite
  const syms=shuffled(SYM,rng).slice(0,nU);
  const vals=shuffled([1,2,3,4,5,6,7,8,9].concat(level>0.5?[10,11,12]:[]),rng).slice(0,nU);
  const V=Object.fromEntries(syms.map((s,i)=>[s,vals[i]]));
  const eqs=[];
  const lines=[];
  if(nU===2){
    eqs.push(`${syms[0]} + ${syms[0]} = ${2*V[syms[0]]}`);
    eqs.push(rng()<0.5?`${syms[0]} + ${syms[1]} = ${V[syms[0]]+V[syms[1]]}`:`${syms[0]} × ${syms[1]} = ${V[syms[0]]*V[syms[1]]}`);
  }else{
    eqs.push(`${syms[0]} + ${syms[0]} + ${syms[0]} = ${3*V[syms[0]]}`);
    eqs.push(rng()<0.5?`${syms[0]} + ${syms[1]} = ${V[syms[0]]+V[syms[1]]}`:`${syms[0]} × ${syms[1]} = ${V[syms[0]]*V[syms[1]]}`);
    eqs.push(rng()<0.5?`${syms[1]} + ${syms[2]} = ${V[syms[1]]+V[syms[2]]}`:`${syms[1]} × ${syms[2]} − ${syms[0]} = ${V[syms[1]]*V[syms[2]]-V[syms[0]]}`);
  }
  // domanda: un simbolo (facile) o un'espressione (difficile)
  let qExpr,ans;
  if(level<0.4){const s=syms[nU-1];qExpr=`${s} = ?`;ans=V[s]}
  else if(level<0.7){qExpr=`${syms[nU-1]} + ${syms[0]} = ?`;ans=V[syms[nU-1]]+V[syms[0]]}
  else{qExpr=`${syms[nU-1]} × ${syms[nU-2]} + ${syms[0]} = ?`;ans=V[syms[nU-1]]*V[syms[nU-2]]+V[syms[0]]}
  const cands=[ans+1,ans-1,ans+2,ans-2,ans+3,ans-3,...vals,ans+5,ans*2];
  const w=numOpts(ans,cands,5,rng);
  const stim=`<div class="eqs mono">${eqs.map(e=>`<div>${e}</div>`).join('')}<div class="ask">${qExpr}</div></div>`;
  return{q:'Ogni simbolo vale sempre lo stesso numero. Quanto vale il risultato?',stim,options:w.options,mono:true,answer:w.answer,rule:`${syms.map(s=>`${s} = ${V[s]}`).join(', ')}; quindi ${qExpr.replace(' = ?','')} = ${ans}`};
}
registra('num',{id:'simboli',nome:'Equazioni con simboli',d:[0.1,1],w:1,gen:simboli});

// ---- operazione nascosta: a ⊕ b = ? ----
const OPS=[
  [0,(a,b)=>a+b+1,'a + b + 1'],[0.1,(a,b)=>a+b-1,'a + b − 1'],[0.15,(a,b)=>2*a+b,'il doppio del primo più il secondo'],[0.2,(a,b)=>a+2*b,'il primo più il doppio del secondo'],
  [0.3,(a,b)=>a*b+1,'il prodotto più 1'],[0.35,(a,b)=>2*(a+b),'il doppio della somma'],[0.4,(a,b)=>a*b-1,'il prodotto meno 1'],[0.45,(a,b)=>a*b+a,'il prodotto più il primo'],
  [0.5,(a,b)=>a*a+b,'il quadrato del primo più il secondo'],[0.55,(a,b)=>a*b-a-b,'il prodotto meno la somma'],[0.6,(a,b)=>a*b+a+b,'il prodotto più la somma'],[0.7,(a,b)=>a*a-b,'il quadrato del primo meno il secondo'],
  [0.75,(a,b)=>(a+b)*(a-b),'la somma per la differenza (cioè a² − b²)'],[0.85,(a,b)=>a*a+b*b,'la somma dei quadrati'],[0.9,(a,b)=>a*(b+1)+b,'il primo per (il secondo più 1), più il secondo'],[0.95,(a,b)=>(a+b)*(a+b)-a*b,'il quadrato della somma meno il prodotto'],
];
function operatore(rng,level){
  const eff=clamp01(level);let pool=OPS.filter(o=>Math.abs(o[0]-eff)<=0.15);if(pool.length<2)pool=OPS.filter(o=>Math.abs(o[0]-eff)<=0.3);
  const op=pick(pool,rng);const sym=pick(['⊕','⊗','◇','⋆','♢'],rng);
  const nEx=level<0.5?3:3;const ex=[];const seen=new Set();
  for(let t=0;t<60&&ex.length<nEx+1;t++){const a=rint(rng,2,9),b=rint(rng,1,9);if(a===b&&op[0]>=0.7)continue;const k=a+','+b;if(seen.has(k))continue;const r=op[1](a,b);if(r<0||r>200)continue;seen.add(k);ex.push([a,b,r])}
  if(ex.length<nEx+1)return null;
  const last=ex[nEx];const ans=last[2];
  // distrattori: altre operazioni applicate agli stessi numeri
  const cands=OPS.filter(o=>o!==op).map(o=>o[1](last[0],last[1])).concat([ans+1,ans-1,ans+2,ans-2]);
  const w=numOpts(ans,cands,5,rng);
  const stim=`<div class="eqs mono">${ex.slice(0,nEx).map(e=>`<div>${e[0]} ${sym} ${e[1]} = ${e[2]}</div>`).join('')}<div class="ask">${last[0]} ${sym} ${last[1]} = ?</div></div>`;
  return{q:`Il simbolo ${sym} nasconde sempre la stessa operazione. Qual è il risultato?`,stim,options:w.options,mono:true,answer:w.answer,rule:`a ${sym} b vale ${op[2]}: ${last[0]} ${sym} ${last[1]} = ${ans}`};
}
registra('num',{id:'operatore',nome:'Operazione nascosta',d:[0.25,1],w:1,gen:operatore});

// ---- piramide di numeri: ogni mattone è la somma dei due sotto ----
function piramide(rng,level){
  const rows=level<0.35?3:level<0.75?4:5;
  const base=[];for(let i=0;i<rows;i++)base.push(rint(rng,1,level<0.5?9:15));
  const pyr=[base];for(let r=1;r<rows;r++){const prev=pyr[r-1];const row=[];for(let i=0;i<prev.length-1;i++)row.push(prev[i]+prev[i+1]);pyr.push(row)}
  // mattoni nascosti: quello cercato più, ai livelli alti, altri dedotti a catena
  const hidden=new Set();const cell=(r,i)=>r+':'+i;
  let target;
  if(level<0.35){target=[1,rint(rng,0,rows-2)]} // un mattone della seconda fila: somma diretta
  else if(level<0.6){target=[0,rint(rng,0,rows-1)];} // in base: differenza tra il mattone sopra e il vicino
  else{target=[0,rint(rng,1,rows-2)];hidden.add(cell(1,target[1]-1))} // in base, con un mattone sopra nascosto: serve la riga ancora sopra
  hidden.add(cell(target[0],target[1]));
  if(level>=0.6&&rows>=4){hidden.add(cell(rows-1,0));hidden.add(cell(1,target[1]))} // cima e un altro: resta risolvibile dalla riga 2
  // verifica risolvibilità: propagazione semplice (somma dai due sotto, o differenza da sopra e vicino)
  const known=new Map();pyr.forEach((row,r)=>row.forEach((v,i)=>{if(!hidden.has(cell(r,i)))known.set(cell(r,i),v)}));
  for(let pass=0;pass<12;pass++){pyr.forEach((row,r)=>row.forEach((v,i)=>{if(known.has(cell(r,i)))return;
    if(r>0&&known.has(cell(r-1,i))&&known.has(cell(r-1,i+1)))known.set(cell(r,i),v);
    if(r<rows-1){if(known.has(cell(r+1,i))&&i+1<row.length&&known.has(cell(r,i+1)))known.set(cell(r,i),v);if(i>0&&known.has(cell(r+1,i-1))&&known.has(cell(r,i-1)))known.set(cell(r,i),v)}}))}
  if(!known.has(cell(target[0],target[1])))return null;
  const ans=pyr[target[0]][target[1]];
  const cands=[ans+1,ans-1,ans+2,ans-2,ans+3,ans-3,...base,...pyr[1]];
  const w=numOpts(ans,cands,5,rng);
  const stim=`<div class="pyr mono">${pyr.slice().reverse().map((row,ri)=>{const r=rows-1-ri;return`<div class="prow">${row.map((v,i)=>{const h=hidden.has(cell(r,i));const isT=r===target[0]&&i===target[1];return`<span class="brick ${isT?'ask':h?'hid':''}">${isT?'?':h?'·':v}</span>`}).join('')}</div>`}).join('')}</div>`;
  return{q:'Ogni mattone è la somma dei due mattoni sotto di lui. Quanto vale il mattone con il punto interrogativo?',sub:hidden.size>1?'I mattoni con il puntino sono nascosti ma si possono ricavare.':'',stim,options:w.options,mono:true,answer:w.answer,rule:`${target[0]===0?'il mattone sopra meno il vicino':'la somma dei due mattoni sotto'} dà ${ans}`};
}
registra('num',{id:'piramide',nome:'Piramide di numeri',d:[0.1,1],w:1,gen:piramide});

// ======================================================================
// AREA PAROLE E LOGICA (verb)
// ======================================================================
// ---- parola intrusa: categorie [difficoltà, nome categoria, parole...] ----
const CAT=[
  [0,'frutti','mela|pera|banana|arancia|ciliegia|pesca|fragola|kiwi|ananas|prugna|albicocca|limone'],
  [0,'ortaggi','carota|zucchina|cipolla|patata|melanzana|peperone|sedano|cavolo|spinacio|finocchio|porro|rapa'],
  [0,'colori','rosso|blu|verde|giallo|viola|arancione|rosa|marrone|grigio|azzurro|beige|turchese'],
  [0.05,'mezzi di trasporto','treno|autobus|bicicletta|automobile|nave|aereo|motocicletta|tram|camion|traghetto|metropolitana|monopattino'],
  [0.05,'capi di abbigliamento','camicia|pantaloni|gonna|giacca|maglione|cappotto|calzini|sciarpa|guanti|cappello|cintura|felpa'],
  [0.1,'mobili','tavolo|sedia|armadio|divano|letto|scaffale|comodino|poltrona|scrivania|cassettiera|panca|credenza'],
  [0.1,'strumenti musicali','chitarra|pianoforte|violino|flauto|tromba|batteria|arpa|clarinetto|sassofono|violoncello|oboe|fisarmonica'],
  [0.1,'sport','calcio|tennis|nuoto|pallavolo|ciclismo|sci|atletica|rugby|scherma|canottaggio|judo|golf'],
  [0.15,'mestieri','medico|avvocato|fornaio|muratore|insegnante|idraulico|falegname|cuoco|giardiniere|farmacista|elettricista|pilota'],
  [0.15,'parti del corpo','braccio|gamba|testa|mano|piede|ginocchio|gomito|spalla|collo|caviglia|polso|schiena'],
  [0.15,'utensili da cucina','pentola|padella|mestolo|colino|grattugia|frusta|coltello|tagliere|scolapasta|tegame|schiumarola|mattarello'],
  [0.2,'emozioni','gioia|paura|rabbia|tristezza|sorpresa|disgusto|invidia|vergogna|orgoglio|noia|ansia|tenerezza'],
  [0.2,'fiori','rosa|tulipano|margherita|girasole|giglio|orchidea|viola|papavero|garofano|geranio|dalia|mimosa'],
  [0.2,'alberi','quercia|pino|abete|betulla|faggio|castagno|olmo|cipresso|salice|platano|acero|larice'],
  [0.25,'pianeti','Mercurio|Venere|Terra|Marte|Giove|Saturno|Urano|Nettuno'],
  [0.25,'metalli','ferro|rame|oro|argento|alluminio|zinco|piombo|stagno|nichel|platino|titanio|cromo'],
  [0.25,'materie scolastiche','matematica|storia|geografia|italiano|inglese|scienze|musica|fisica|chimica|filosofia|latino|arte'],
  [0.3,'mammiferi','cane|gatto|cavallo|mucca|leone|elefante|delfino|balena|pipistrello|volpe|lupo|orso'],
  [0.3,'uccelli','passero|aquila|gabbiano|pinguino|struzzo|colomba|corvo|gufo|falco|cicogna|rondine|pappagallo'],
  [0.3,'pesci','trota|salmone|tonno|sardina|squalo|carpa|merluzzo|orata|spigola|sgombro|pesce spada|anguilla'],
  [0.35,'insetti','ape|formica|zanzara|farfalla|mosca|grillo|coccinella|libellula|cavalletta|vespa|scarabeo|falena'],
  [0.35,'rettili','serpente|lucertola|coccodrillo|tartaruga|iguana|camaleonte|geco|alligatore|vipera|varano'],
  [0.4,'figure geometriche','quadrato|triangolo|cerchio|rettangolo|rombo|trapezio|pentagono|esagono|ellisse|ottagono'],
  [0.4,'unità di lunghezza','metro|chilometro|centimetro|millimetro|miglio|pollice|piede|iarda|decimetro|ettometro'],
  [0.4,'unità di tempo','secondo|minuto|ora|giorno|settimana|mese|anno|secolo|decennio|millennio'],
  [0.45,'unità di peso','grammo|chilogrammo|tonnellata|quintale|milligrammo|oncia|libbra|ettogrammo|carato'],
  [0.45,'strumenti a corda','chitarra|violino|arpa|violoncello|contrabbasso|mandolino|banjo|ukulele|viola|liuto'],
  [0.45,'strumenti a fiato','flauto|tromba|clarinetto|sassofono|oboe|trombone|fagotto|corno|ottavino|cornamusa'],
  [0.5,'fenomeni atmosferici','pioggia|neve|grandine|nebbia|vento|tuono|lampo|brina|rugiada|tempesta|uragano|arcobaleno'],
  [0.5,'verbi','correre|mangiare|dormire|leggere|scrivere|saltare|cantare|nuotare|pensare|volare|ridere|camminare'],
  [0.5,'aggettivi','veloce|rosso|grande|felice|dolce|freddo|alto|leggero|gentile|antico|nuovo|forte'],
  [0.55,'sinonimi di felice','contento|allegro|lieto|gioioso|raggiante|sereno|soddisfatto|beato|euforico|festoso'],
  [0.55,'sinonimi di triste','malinconico|afflitto|cupo|mesto|abbattuto|sconsolato|depresso|addolorato|desolato|tetro'],
  [0.6,'sinonimi di veloce','rapido|celere|svelto|lesto|fulmineo|spedito|scattante|repentino|immediato|pronto'],
  [0.6,'sinonimi di grande','enorme|immenso|vasto|gigantesco|colossale|ampio|esteso|smisurato|imponente|maestoso'],
  [0.65,'parole con significato di paura','timore|terrore|spavento|panico|ansia|fobia|sgomento|apprensione|inquietudine|angoscia'],
  [0.65,'stati della materia e passaggi','solido|liquido|gassoso|fusione|evaporazione|condensazione|solidificazione|sublimazione|ebollizione'],
  [0.7,'numeri primi (in lettere)','due|tre|cinque|sette|undici|tredici|diciassette|diciannove|ventitré|ventinove'],
  [0.7,'numeri pari (in lettere)','due|quattro|sei|otto|dieci|dodici|quattordici|sedici|diciotto|venti'],
  [0.7,'quadrati perfetti (in lettere)','uno|quattro|nove|sedici|venticinque|trentasei|quarantanove|sessantaquattro|ottantuno|cento'],
  [0.75,'parole che indicano una parte di un tutto','fetta|spicchio|frammento|porzione|segmento|brano|scheggia|pezzo|quota|sezione'],
  [0.8,'parole che indicano un insieme','gregge|branco|stormo|sciame|flotta|mandria|folla|squadra|orchestra|arcipelago|costellazione|mazzo'],
  [0.8,'strumenti di misura','termometro|bilancia|metro|barometro|orologio|bussola|tachimetro|igrometro|goniometro|clessidra'],
  [0.85,'parole con prefisso negativo','inutile|disonesto|illegale|impossibile|irreale|scontento|antipatico|asimmetrico|incerto|sleale'],
  [0.9,'palindromi','anna|otto|osso|radar|ingegni|aia|ala|ossesso|enne|iri'],
];
const CATS=CAT.map(c=>({d:c[0],n:c[1],w:c[2].split('|')}));
// categorie "vicine" per intrusi difficili
const VICINE={mammiferi:['uccelli','pesci','rettili','insetti'],uccelli:['mammiferi','insetti','rettili'],pesci:['mammiferi','rettili'],insetti:['uccelli','rettili'],rettili:['insetti','pesci'],frutti:['ortaggi'],ortaggi:['frutti'],'strumenti a corda':['strumenti a fiato'],'strumenti a fiato':['strumenti a corda'],'unità di lunghezza':['unità di peso','unità di tempo'],'unità di tempo':['unità di lunghezza'],'unità di peso':['unità di lunghezza'],fiori:['alberi'],alberi:['fiori'],'sinonimi di felice':['sinonimi di triste'],'sinonimi di triste':['sinonimi di felice'],'numeri primi (in lettere)':['numeri pari (in lettere)','quadrati perfetti (in lettere)'],'numeri pari (in lettere)':['numeri primi (in lettere)','quadrati perfetti (in lettere)'],'quadrati perfetti (in lettere)':['numeri primi (in lettere)','numeri pari (in lettere)'],verbi:['aggettivi'],aggettivi:['verbi'],'parole che indicano una parte di un tutto':['parole che indicano un insieme']};
function parolaIntrusa(rng,level,used){
  const eff=clamp01(level);let pool=CATS.filter(c=>Math.abs(c.d-eff)<=0.15);if(pool.length<3)pool=CATS.filter(c=>Math.abs(c.d-eff)<=0.3);if(!pool.length)pool=CATS;
  for(let t=0;t<30;t++){
    const cat=pick(pool,rng);const k='intr:'+cat.n;if(used&&used.has(k)&&t<20)continue;
    const nIn=level<0.5?4:5;
    const ins=shuffled(cat.w,rng).slice(0,nIn);
    let other;const vic=(VICINE[cat.n]||[]).map(n=>CATS.find(c=>c.n===n)).filter(Boolean);
    if(vic.length&&level>=0.3&&rng()<0.8)other=pick(vic,rng);else other=pick(CATS.filter(c=>c!==cat&&!(VICINE[cat.n]||[]).includes(c.n)&&!cat.w.some(w=>c.w.includes(w))),rng);
    const odd=pick(other.w.filter(w=>!cat.w.includes(w)),rng);if(!odd)continue;
    // nessuna parola intrusa deve appartenere anche alla categoria (es. "viola" colore e fiore)
    if(CATS.some(c=>c!==cat&&c!==other&&c.w.includes(odd)&&ins.some(w=>c.w.includes(w))))continue;
    if(used)used.add(k);
    const w=withAnswer([odd,...ins].map(cap),rng);
    const art=(n)=>n;
    return{q:'Quale parola non va con le altre?',stim:'',options:w.options,answer:w.answer,rule:`${ins.map(cap).join(', ')} appartengono tutti alla categoria «${cat.n}»; ${cap(odd)} invece è di un'altra categoria («${other.n}»)`};
  }
  return null;
}
registra('verb',{id:'intrusa',nome:'Parola intrusa',d:[0,0.95],w:1,gen:parolaIntrusa});

// ---- sillogismi: quale conclusione è certa ----
// [plurale con articolo, femminile?]
const NOMI_PL=[['i gatti',0],['i musicisti',0],['gli abitanti di Rovigo',0],['i fiori gialli',0],['i pesci rossi',0],['gli alberi del parco',0],['i treni del mattino',0],['i libri rossi',0],['gli studenti di chimica',0],['i nuotatori',0],['i robot',0],['i cuochi',0],['gli orologi antichi',0],['i draghi',0],['i cavalieri',0],['i giocatori di scacchi',0],['i panettieri',0],['le farfalle blu',1],['le isole del nord',1],['le navi bianche',1],['le pianiste',1],['le volpi',1]];
// [plurale, singolare]
const PRED=[['sono veloci','è veloce'],['amano la musica','ama la musica'],['dormono di giorno','dorme di giorno'],['hanno gli occhi verdi','ha gli occhi verdi'],['sanno nuotare','sa nuotare'],['portano un cappello','porta un cappello'],['vivono vicino al mare','vive vicino al mare'],['parlano due lingue','parla due lingue'],['mangiano solo frutta','mangia solo frutta'],['hanno paura del buio','ha paura del buio'],['collezionano francobolli','colleziona francobolli'],['suonano il violino','suona il violino'],['sono puntuali','è puntuale'],['leggono molto','legge molto'],['corrono ogni mattina','corre ogni mattina']];
function sillogismo(rng,level){
  const [NA,NC]=shuffled(NOMI_PL,rng);const [PB,PX]=shuffled(PRED,rng);
  const A=NA[0],C=NC[0],B=PB[0],Bs=PB[1],Bx=PX[0];
  const tutti=(N,P)=>`${N[1]?'Tutte':'Tutti'} ${N[0]} ${P}`;
  const nessuno=(N,P)=>`${N[1]?'Nessuna':'Nessuno'} tra ${N[0]} ${P}`; // P al singolare
  const alcuni=(N,P)=>`${N[1]?'Alcune':'Alcuni'} tra ${N[0]} ${P}`;
  const alcuniNon=(N,P)=>`${N[1]?'Alcune':'Alcuni'} tra ${N[0]} non ${P}`;
  const inA=`sono tra ${A}`,inAs=`è tra ${A}`,inC=`sono tra ${C}`;
  const chi=`quelli che ${B}`;
  const T=[
    {d:0.05,p:[tutti(NA,B),`Tutti ${chi} ${Bx}`],ok:tutti(NA,Bx),bad:[`Tutti quelli che ${Bx} ${B}`,nessuno(NA,PX[1]),alcuniNon(NA,Bx)],why:`se tutti ${A} ${B}, e tutti quelli che ${B} ${Bx}, allora per forza tutti ${A} ${Bx}`},
    {d:0.2,p:[nessuno(NA,Bs),tutti(NC,B)],ok:nessuno(NC,inAs),bad:[alcuni(NC,inA),tutti(NA,Bx),alcuni(NA,B)],why:`tutti ${C} ${B}, mentre nessuno tra ${A} lo fa: quindi nessuno tra ${C} può essere tra ${A}`},
    {d:0.35,p:[alcuni(NA,B),`Tutti ${chi} ${Bx}`],ok:alcuni(NA,Bx),bad:[tutti(NA,Bx),nessuno(NA,PX[1]),`Tutti quelli che ${Bx} ${inA}`],why:`quelli tra ${A} che ${B} per forza ${Bx}; degli altri non sappiamo nulla, quindi è certo solo che alcuni ${Bx}`},
    {d:0.5,p:[tutti(NA,B),alcuni(NC,inA)],ok:alcuni(NC,B),bad:[tutti(NC,B),nessuno(NC,Bs),tutti(NA,inC)],why:`alcuni tra ${C} sono tra ${A}, e tutti ${A} ${B}: quindi almeno quelli ${B}`},
    {d:0.65,p:[tutti(NA,B),alcuniNon(NC,B)],ok:alcuniNon(NC,inA),bad:[alcuni(NC,inA),nessuno(NC,inAs),alcuniNon(NA,B)],why:`chi non ${B} non può essere tra ${A}, perché tutti ${A} ${B}: quelli tra ${C} che non ${B} non sono tra ${A}`},
    {d:0.8,p:[nessuno(NA,Bs),alcuni(NC,B)],ok:alcuniNon(NC,inA),bad:[nessuno(NC,inAs),alcuni(NA,inC),tutti(NC,B)],why:`quelli tra ${C} che ${B} non possono essere tra ${A}, perché nessuno tra ${A} lo fa; degli altri non si sa`},
    {d:0.9,p:[`Tutti ${chi} ${inA}`,alcuniNon(NC,B)],ok:`Non si può concludere nulla di certo`,bad:[alcuniNon(NC,inA),nessuno(NC,inAs),alcuni(NC,inA)],why:`sapere che chi ${B} è tra ${A} non dice nulla di chi non ${B}: potrebbe essere tra ${A} oppure no`},
  ];
  const eff=clamp01(level);let pool=T.filter(t=>Math.abs(t.d-eff)<=0.2);if(pool.length<2)pool=T.filter(t=>Math.abs(t.d-eff)<=0.35);
  const t=pick(pool,rng);
  const w=textOpts(t.ok,shuffled(t.bad,rng),4,rng);if(!w)return null;
  const stim=`<div class="premesse">${t.p.map(p=>`<p>${esc(p)}.</p>`).join('')}</div>`;
  return{q:'Date queste premesse, quale conclusione è sicuramente vera?',stim,options:w.options.map(o=>o+'.'),answer:w.answer,rule:t.why};
}
registra('verb',{id:'sillogismo',nome:'Sillogismo',d:[0.1,1],w:1,gen:sillogismo});

// ---- ordinamento: chi è il più…? ----
const NOMI=['Anna','Bruno','Carla','Dario','Elena','Fabio','Giulia','Hamid','Irene','Luca','Marta','Nadia','Omar','Paola','Rita','Sara','Teo','Vera'];
const ATTR=[['alto','alta','basso','bassa','il più alto','il più basso'],['veloce','veloce','lento','lenta','il più veloce','il più lento'],['vecchio','vecchia','giovane','giovane','il più vecchio','il più giovane'],['ricco','ricca','povero','povera','il più ricco','il più povero'],['pesante','pesante','leggero','leggera','il più pesante','il più leggero'],['forte','forte','debole','debole','il più forte','il più debole']];
const FEM=['Anna','Carla','Elena','Giulia','Irene','Marta','Nadia','Paola','Rita','Sara','Vera'];
function ordinamento(rng,level){
  const n=level<0.3?3:level<0.65?4:5;
  const names=shuffled(NOMI,rng).slice(0,n); // names[0] è il "più"
  const at=pick(ATTR,rng);
  const isF=(nm)=>FEM.includes(nm);
  const piu=(x,y)=>`${x} è più ${isF(x)?at[1]:at[0]} di ${y}`,meno=(x,y)=>`${x} è più ${isF(x)?at[3]:at[2]} di ${y}`;
  const st=[];
  for(let i=0;i<n-1;i++){const a=names[i],b=names[i+1];st.push(rng()<0.5?piu(a,b):meno(b,a))}
  if(level>=0.5){ // una frase in più, non adiacente: ridondante ma dà un'altra strada
    const i=rint(rng,0,n-3);const a=names[i],b=names[i+2];st.push(rng()<0.5?piu(a,b):meno(b,a))}
  const stShuffled=shuffled(st,rng);
  // domanda
  const qs=[[`Chi è ${at[4]}?`,names[0]],[`Chi è ${at[5]}?`,names[n-1]]];
  if(level>=0.4)qs.push([`Chi è il secondo più ${at[0]}?`,names[1]]);
  if(level>=0.6&&n%2===1)qs.push([`Chi sta esattamente a metà?`,names[(n-1)/2]]);
  if(level>=0.7)qs.push([`Chi è il secondo più ${at[2]}?`,names[n-2]]);
  const [q,ans]=pick(qs,rng);
  const w=withAnswer([ans,...names.filter(x=>x!==ans)].slice(0,Math.min(5,n)),rng);
  const stim=`<div class="premesse">${stShuffled.map(s=>`<p>${esc(s)}.</p>`).join('')}</div>`;
  const ordine=names.join(' > ');
  return{q,stim,options:w.options,answer:w.answer,rule:`mettendo in fila dal più ${at[0]} al più ${at[2]}: ${ordine}`};
}
registra('verb',{id:'ordinamento',nome:'Chi è il più…?',d:[0.05,1],w:1,gen:ordinamento});

// ---- parole in codice ----
const PAROLE=['CASA','MELA','PANE','LUNA','SOLE','MARE','GATTO','CANE','FIORE','PORTA','LIBRO','TRENO','NAVE','VENTO','NEVE','ROSA','PESCE','MONTE','FIUME','PIEDE','MANO','TESTA','NOTTE','GIORNO','VERDE','ROSSO','NERO','PIANO','SEDIA','TAVOLO','SCUOLA','AMICO','PONTE','STRADA','CARTA','PENNA','VETRO','LEGNO','FERRO','SALE','RISO','LATTE','UOVO','TORTA','ORSO','LUPO','VOLPE','RANA','TIGRE','ZEBRA','CIELO','STELLA','NUVOLA','PIOGGIA','FUOCO','TERRA','ACQUA','ARIA','LAMPO','TUONO'];
const AZ='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const shiftW=(w,k)=>w.split('').map(c=>AZ[(AZ.indexOf(c)+k+26)%26]).join('');
const CODICI=[
  [0,'shift1',(w)=>shiftW(w,1),'ogni lettera è sostituita da quella che la segue nell\'alfabeto'],
  [0.1,'shift-1',(w)=>shiftW(w,-1),'ogni lettera è sostituita da quella che la precede nell\'alfabeto'],
  [0.2,'rev',(w)=>w.split('').reverse().join(''),'la parola è scritta al contrario'],
  [0.3,'shift2',(w)=>shiftW(w,2),'ogni lettera avanza di due posti nell\'alfabeto'],
  [0.45,'shift3',(w)=>shiftW(w,3),'ogni lettera avanza di tre posti nell\'alfabeto'],
  [0.5,'num',(w)=>w.split('').map(c=>AZ.indexOf(c)+1).join('-'),'ogni lettera è sostituita dal suo numero d\'ordine nell\'alfabeto (A=1, B=2…)'],
  [0.6,'revshift1',(w)=>shiftW(w.split('').reverse().join(''),1),'la parola è scritta al contrario e poi ogni lettera avanza di un posto'],
  [0.7,'alt',(w)=>w.split('').map((c,i)=>AZ[(AZ.indexOf(c)+(i%2?-1:1)+26)%26]).join(''),'le lettere in posizione dispari avanzano di uno, quelle in posizione pari arretrano di uno'],
  [0.8,'shift5',(w)=>shiftW(w,5),'ogni lettera avanza di cinque posti nell\'alfabeto'],
  [0.85,'grow',(w)=>w.split('').map((c,i)=>AZ[(AZ.indexOf(c)+i+1)%26]).join(''),'la prima lettera avanza di 1, la seconda di 2, la terza di 3, e così via'],
  [0.95,'numrev',(w)=>w.split('').reverse().map(c=>AZ.indexOf(c)+1).join('-'),'la parola è scritta al contrario e ogni lettera diventa il suo numero d\'ordine (A=1, B=2…)'],
];
function codice(rng,level){
  const eff=clamp01(level);let pool=CODICI.filter(c=>Math.abs(c[0]-eff)<=0.15);if(pool.length<2)pool=CODICI.filter(c=>Math.abs(c[0]-eff)<=0.3);
  const cod=pick(pool,rng);
  const nEx=level<0.5?2:1;const ws=shuffled(PAROLE.filter(w=>w.length>=4&&w.length<=(level<0.5?5:7)),rng);
  const ex=ws.slice(0,nEx),target=ws[nEx];
  const ans=cod[2](target);
  const cands=CODICI.filter(c=>c!==cod).map(c=>c[2](target)).filter(c=>c!==target);
  const w=textOpts(ans,shuffled(cands,rng),4,rng);if(!w)return null;
  const stim=`<div class="premesse mono">${ex.map(e=>`<p>${e} → ${cod[2](e)}</p>`).join('')}<p class="ask">${target} → ?</p></div>`;
  return{q:'Con lo stesso codice, come si scrive l\'ultima parola?',stim,options:w.options,mono:true,answer:w.answer,rule:`${cod[3]}: ${target} diventa ${ans}`,sub:cod[1].startsWith('num')?'':'Alfabeto internazionale di 26 lettere (con J, K, W, X, Y).'};
}
registra('verb',{id:'codice',nome:'Parole in codice',d:[0.2,1],w:1,gen:codice});

// ---- deduzione "se… allora" ----
const COND=[
  {p:['piove','non piove'],q:['Marco prende l\'ombrello','Marco non prende l\'ombrello']},
  {p:['il negozio è aperto','il negozio è chiuso'],q:['Lia compra il pane','Lia non compra il pane']},
  {p:['il treno è in ritardo','il treno è in orario'],q:['Sara arriva tardi al lavoro','Sara arriva puntuale al lavoro']},
  {p:['c\'è il sole','non c\'è il sole'],q:['i bambini giocano in giardino','i bambini non giocano in giardino']},
  {p:['la sveglia suona','la sveglia non suona'],q:['Paolo si alza presto','Paolo non si alza presto']},
  {p:['il forno è acceso','il forno è spento'],q:['la cucina è calda','la cucina non è calda']},
  {p:['Giulia studia','Giulia non studia'],q:['Giulia passa l\'esame','Giulia non passa l\'esame']},
  {p:['il semaforo è rosso','il semaforo non è rosso'],q:['le auto si fermano','le auto non si fermano']},
  {p:['la porta è chiusa a chiave','la porta non è chiusa a chiave'],q:['il gatto resta in casa','il gatto non resta in casa']},
  {p:['nevica','non nevica'],q:['la scuola resta chiusa','la scuola resta aperta']},
  {p:['il telefono è carico','il telefono è scarico'],q:['Omar risponde alle chiamate','Omar non risponde alle chiamate']},
  {p:['la squadra vince','la squadra non vince'],q:['i tifosi festeggiano','i tifosi non festeggiano']},
  {p:['il frigo è vuoto','il frigo non è vuoto'],q:['Rita va al supermercato','Rita non va al supermercato']},
  {p:['il cane abbaia','il cane non abbaia'],q:['c\'è qualcuno alla porta','non c\'è nessuno alla porta']},
];
const NIENTE='Non si può concludere nulla di certo';
function deduzione(rng,level){
  const c=pick(COND,rng);const P=c.p,Qq=c.q;
  const premessa=`Se ${P[0]}, allora ${Qq[0]}`;
  const forme=[
    {d:0.05,fatto:cap(P[0]),ok:cap(Qq[0]),why:`la regola dice che quando ${P[0]} succede che ${Qq[0]}: il fatto è proprio quello`},
    {d:0.35,fatto:cap(Qq[1]),ok:cap(P[1]),why:`se ${P[0]} avremmo per forza che ${Qq[0]}; ma ${Qq[1]}, quindi ${P[1]}`},
    {d:0.6,fatto:cap(Qq[0]),ok:NIENTE,why:`la regola dice cosa succede se ${P[0]}, non che sia l'unica causa: ${Qq[0]} potrebbe accadere anche per altri motivi`},
    {d:0.75,fatto:cap(P[1]),ok:NIENTE,why:`la regola parla solo del caso in cui ${P[0]}; se ${P[1]} può succedere di tutto`},
  ];
  if(level>=0.3){ // disgiunzione: "O A o B. Non A. Quindi B."
    const c2=pick(COND.filter(x=>x!==c),rng);
    const premO=`O ${P[0]} o ${c2.p[0]}`;
    forme.push({d:0.3,prem:premO,fatto:cap(P[1]),ok:cap(c2.p[0]),extra:[cap(c2.p[1]),cap(Qq[0]),NIENTE],why:`almeno una delle due cose è vera; visto che ${P[1]}, deve essere vero che ${c2.p[0]}`});
  }
  const eff=clamp01(level);let pool=forme.filter(f=>Math.abs(f.d-eff)<=0.2);if(pool.length<2)pool=forme.filter(f=>Math.abs(f.d-eff)<=0.35);
  const f=pick(pool,rng);
  const bad=f.extra||[cap(Qq[0]),cap(Qq[1]),cap(P[0]),cap(P[1]),NIENTE].filter(x=>x!==f.ok&&x!==f.fatto);
  const w=textOpts(f.ok,shuffled(bad,rng),4,rng);if(!w)return null;
  const stim=`<div class="premesse"><p>${esc(f.prem||premessa)}.</p><p><b>Fatto:</b> ${esc(f.fatto)}.</p></div>`;
  return{q:'Cosa si può concludere con certezza?',stim,options:w.options.map(o=>o+'.'),answer:w.answer,rule:f.why};
}
registra('verb',{id:'deduzione',nome:'Se… allora',d:[0,1],w:1,gen:deduzione});

// ---- contrario o sinonimo ----
function contrario(rng,level){
  const rels=Q.VREL.filter(r=>r.sym&&(r.id.indexOf('contr')===0||r.id==='sinonimi'));
  const eff=clamp01(level);let pool=rels.filter(r=>Math.abs(r.d-eff)<=0.25);if(!pool.length)pool=rels;
  for(let t=0;t<30;t++){
    const rel=pick(pool,rng);const [a,b]=pick(rel.pairs,rng);const word=rng()<0.5?a:b,ans=word===a?b:a;
    const isSin=rel.id==='sinonimi';
    // distrattori: altre parole della stessa relazione, non collegate alla parola
    const partnersOf=new Set();rels.forEach(r=>r.pairs.forEach(([x,y])=>{if(x===word)partnersOf.add(y);if(y===word)partnersOf.add(x)}));
    const others=shuffled(rel.pairs.flat().filter(x=>x!==word&&x!==ans&&!partnersOf.has(x)),rng);
    const w=textOpts(cap(ans),uniq(others).map(cap),5,rng);if(!w)continue;
    return{q:`Qual è ${isSin?'un sinonimo':'il contrario'} di «${cap(word)}»?`,stim:'',options:w.options,answer:w.answer,rule:`${cap(word)} e ${cap(ans)} ${isSin?'hanno lo stesso significato':'sono contrari'}`};
  }
  return null;
}
registra('verb',{id:'contrario',nome:'Contrari e sinonimi',d:[0,1],w:0.8,gen:contrario});

// ======================================================================
// AREA SPAZIO (rot)
// ======================================================================
// ---- immagine allo specchio ----
function specchio(rng,level){
  for(let t=0;t<8;t++){
    const cells=randomPoly(rng,4+Math.min(4,Math.floor(level*5+rng()*1.5)));
    const f={cells:norm(cells),mark:null};
    const mir=tf(f,'m'); // riflesso rispetto a un asse verticale
    const rots=[1,2,3].map(k=>rotF(f,k));
    const diff=differentShape(mir,rng);
    const opts=[{f:mir,kind:'mir'},{f:rots[0],kind:'rot'},{f:rots[1],kind:'rot'},{f:diff||rots[2],kind:diff?'diff':'rot'}];
    if(new Set(opts.map(o=>fkey(o.f))).size<4)continue;
    const w=withAnswer(opts,rng);
    const Lx='ABCD';const rotL=w.options.map((o,k)=>o.kind==='rot'?Lx[k]:null).filter(Boolean).join(' e '),difL=w.options.map((o,k)=>o.kind==='diff'?Lx[k]:null).filter(Boolean).join('');
    return{q:'Quale figura è l\'immagine allo specchio della figura data?',sub:'Lo specchio è verticale, accanto alla figura: destra e sinistra si scambiano.',stim:`<div class="figbox mirror">${cellsSVG(f.cells,null)}<span class="mir-line"></span></div>`,options:w.options.map(o=>cellsSVG(o.f.cells,null)),fig:true,answer:w.answer,rule:`${Lx[w.answer]} è la figura riflessa; ${rotL} sono solo ruotate (non riflesse)${difL?`; ${difL} ha una cella spostata`:''}`};
  }
  return null;
}
registra('rot',{id:'specchio',nome:'Allo specchio',d:[0,0.9],w:1,gen:specchio});

// ---- conta i cubi (vista isometrica) ----
function isoSVG(h,W,D){
  // h[x][y] altezze; vista da davanti-destra-alto
  const s=14;const cx=100-(W+D)*s*0.0+0; // dimensioni base
  const px=(x,y,z)=>{const X=(x-y)*s*0.866,Y=(x+y)*s*0.5-z*s;return[X,Y]};
  let minX=1e9,maxX=-1e9,minY=1e9,maxY=-1e9;const polys=[];
  const order=[];for(let x=0;x<W;x++)for(let y=0;y<D;y++)for(let z=0;z<h[x][y];z++)order.push([x,y,z]);
  order.sort((a,b)=>(a[0]+a[1])-(b[0]+b[1])||a[2]-b[2]);
  for(const [x,y,z] of order){
    const P=[[0,0,1],[1,0,1],[1,1,1],[0,1,1],[1,0,0],[1,1,0],[0,1,0]].map(([dx,dy,dz])=>px(x+dx,y+dy,z+dz));
    const top=[P[0],P[1],P[2],P[3]],right=[P[1],P[4],P[5],P[2]],left=[P[3],P[2],P[5],P[6]];
    [[top,0.15],[left,0.55],[right,0.35]].forEach(([poly,op])=>{polys.push(`<polygon points="${poly.map(p=>p.map(v=>v.toFixed(1)).join(',')).join(' ')}" fill="currentColor" fill-opacity="${op}" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>`);poly.forEach(([X,Y])=>{minX=Math.min(minX,X);maxX=Math.max(maxX,X);minY=Math.min(minY,Y);maxY=Math.max(maxY,Y)})});
  }
  const pad=6;return`<svg viewBox="${(minX-pad).toFixed(1)} ${(minY-pad).toFixed(1)} ${(maxX-minX+2*pad).toFixed(1)} ${(maxY-minY+2*pad).toFixed(1)}" aria-hidden="true">${polys.join('')}</svg>`;
}
function cubi(rng,level){
  const W=level<0.3?2:3,D=level<0.3?2:level<0.7?2:3,maxH=level<0.2?2:level<0.6?3:4;
  const h=[];let tot=0;
  for(let x=0;x<W;x++){h.push([]);for(let y=0;y<D;y++){let v=rint(rng,level<0.5?1:0,maxH);if(x===W-1&&y===D-1&&level>=0.5&&rng()<0.5)v=0;h[x].push(v);tot+=v}}
  if(tot<3)return null;
  // nel disegno la colonna (0,0) è dietro: potrebbe essere parzialmente nascosta → più difficile
  const vis=new Set();for(let x=0;x<W;x++)for(let y=0;y<D;y++)for(let z=0;z<h[x][y];z++){const nascosto=h[x][y]>z+1&&x+1<W&&h[x+1][y]>z&&y+1<D&&h[x][y+1]>z;if(!nascosto)vis.add(x+','+y+','+z)}
  const cands=[tot+1,tot-1,tot+2,tot-2,vis.size,tot+3,tot-3];
  const w=numOpts(tot,cands,5,rng);
  return{q:'Quanti cubi ci sono in tutto?',sub:'Nessun cubo è sospeso: ogni cubo poggia sul tavolo o su un altro cubo. Conta anche quelli nascosti.',stim:`<div class="figbox iso">${isoSVG(h,W,D)}</div>`,options:w.options,mono:true,answer:w.answer,rule:`colonna per colonna le altezze sono ${h.map(r=>r.join(' ')).join(' | ')}: in tutto ${tot} cubi${vis.size<tot?` (${tot-vis.size} non si ${tot-vis.size===1?'vede':'vedono'})`:''}`};
}
registra('rot',{id:'cubi',nome:'Conta i cubi',d:[0.1,1],w:1,gen:cubi});

// ---- il pezzo mancante: quale pezzo completa il quadrato ----
function incastro(rng,level){
  const n=level<0.4?4:5;const k=3+Math.min(3,Math.floor(level*4)); // celle del buco
  for(let t=0;t<30;t++){
    // buco: poliomino connesso casuale dentro la griglia
    const cells=[[rint(rng,0,n-1),rint(rng,0,n-1)]];const has=(x,y)=>cells.some(c=>c[0]===x&&c[1]===y);
    let guard=0;while(cells.length<k&&guard++<200){const b=pick(cells,rng);const d=pick([[1,0],[-1,0],[0,1],[0,-1]],rng);const x=b[0]+d[0],y=b[1]+d[1];if(x<0||y<0||x>=n||y>=n||has(x,y))continue;cells.push([x,y])}
    if(cells.length<k)continue;
    const hole={cells:norm(cells),mark:null};
    const rotK=level<0.35?0:rint(rng,1,3);
    const piece=rotF(hole,rotK);
    const mir=tf(hole,'m');const syms=symsF(hole).map(g=>key(g.cells));
    const isChiral=!symsF(hole).slice(0,4).map(g=>key(g.cells)).includes(key(mir.cells));
    const d1=differentShape(hole,rng),d2=differentShape(piece,rng);
    const opts=[{f:piece,kind:'ok'}];
    if(isChiral)opts.push({f:rotF(mir,rint(rng,0,3)),kind:'mir'});
    if(d1)opts.push({f:rotF(d1,rint(rng,0,3)),kind:'diff'});
    if(d2)opts.push({f:d2,kind:'diff'});
    while(opts.length<4){const r=randomPoly(rng,k);if(syms.includes(key(norm(r))))continue;opts.push({f:{cells:norm(r),mark:null},kind:'diff'})}
    const o4=opts.slice(0,4);
    if(new Set(o4.map(o=>key(o.f.cells))).size<4)continue;
    // nessun distrattore deve combaciare col buco in nessuna rotazione (lo specchio solo se la figura è chirale)
    if(o4.slice(1).some(o=>syms.slice(0,4).includes(key(o.f.cells))))continue;
    const w=withAnswer(o4,rng);
    const u=100/n;const sq=[];for(let x=0;x<n;x++)for(let y=0;y<n;y++){const isH=cells.some(c=>c[0]===x&&c[1]===y);sq.push(`<rect x="${(x*u+1).toFixed(1)}" y="${(y*u+1).toFixed(1)}" width="${(u-2).toFixed(1)}" height="${(u-2).toFixed(1)}" rx="2" ${isH?'fill="none" stroke="currentColor" stroke-dasharray="3 3" stroke-width="1.2" opacity=".6"':'fill="currentColor"'}/>`)}
    const stim=`<div class="figbox">
      <svg viewBox="0 0 100 100" aria-hidden="true">${sq.join('')}</svg></div>`;
    const Lx='ABCD';const mirL=w.options.map((o,kk)=>o.kind==='mir'?Lx[kk]:null).filter(Boolean).join('');
    return{q:'Quale pezzo riempie esattamente il buco tratteggiato?',sub:rotK?'Il pezzo può essere ruotato, ma non capovolto.':'',stim,options:w.options.map(o=>cellsSVG(o.f.cells,null)),fig:true,answer:w.answer,rule:`${Lx[w.answer]} ha la stessa forma del buco${rotK?` ruotata di ${rotK*90}°`:''}${mirL?`; ${mirL} è la forma capovolta (allo specchio) e non entra`:''}; gli altri pezzi hanno una cella in un posto diverso`};
  }
  return null;
}
registra('rot',{id:'incastro',nome:'Il pezzo mancante',d:[0.05,1],w:1,gen:incastro});

// ---- foglio piegato e forato ----
function piegatura(rng,level){
  const N=4;const nFold=level<0.35?1:level<0.7?2:3;
  // pieghe: 'R' destra su sinistra, 'L' sinistra su destra, 'U' alto su basso, 'D' basso su alto
  // dopo le pieghe la parte visibile è un rettangolo [x0,x1)×[y0,y1) nelle coordinate del foglio aperto
  const seqAll=[];let x0=0,x1=N,y0=0,y1=N;const folds=[];
  for(let i=0;i<nFold;i++){const cand=[];if(x1-x0>1)cand.push('R','L');if(y1-y0>1)cand.push('U','D');const f=pick(cand,rng);folds.push({f,x0,x1,y0,y1});
    if(f==='R')x1=(x0+x1)/2;else if(f==='L')x0=(x0+x1)/2;else if(f==='U')y1=(y0+y1)/2;else y0=(y0+y1)/2}
  const nHoles=level<0.5?1:2;const holes=[];while(holes.length<nHoles){const hx=rint(rng,x0,x1-1),hy=rint(rng,y0,y1-1);if(!holes.some(h=>h[0]===hx&&h[1]===hy))holes.push([hx,hy])}
  // riapertura: si ripercorrono le pieghe al contrario riflettendo i fori
  const unfold=(hs,fl)=>{let cur=hs.slice();for(let i=fl.length-1;i>=0;i--){const {f,x0,x1,y0,y1}=fl[i];const add=[];cur.forEach(([x,y])=>{if(f==='R'||f==='L')add.push([x0+x1-1-x,y]);else add.push([x,y0+y1-1-y])});cur=cur.concat(add)}return uniq(cur.map(c=>c.join(','))).map(s=>s.split(',').map(Number))};
  const ans=unfold(holes,folds);
  const pat=(hs)=>{const set=new Set(hs.map(h=>h.join(',')));const u=100/N;let s='';for(let x=0;x<N;x++)for(let y=0;y<N;y++){s+=`<rect x="${x*u+0.5}" y="${y*u+0.5}" width="${u-1}" height="${u-1}" fill="currentColor" fill-opacity=".12" stroke="currentColor" stroke-width=".6"/>`;if(set.has(x+','+y))s+=`<circle cx="${x*u+u/2}" cy="${y*u+u/2}" r="${u*0.26}" fill="currentColor"/>`}return`<svg viewBox="0 0 100 100" aria-hidden="true">${s}</svg>`};
  const pkey=(hs)=>hs.map(h=>h.join(',')).sort().join(';');
  // distrattori: pieghe sbagliate, riflessione mancante, fori in meno
  const cands=[];
  cands.push(unfold(holes,folds.slice(0,-1)));
  cands.push(unfold(holes,folds.map(f=>Object.assign({},f,{f:{R:'U',L:'D',U:'R',D:'L'}[f.f]}))));
  cands.push(unfold(holes,folds.map(f=>Object.assign({},f,{f:{R:'L',L:'R',U:'D',D:'U'}[f.f]}))));
  cands.push(unfold(holes,[folds[folds.length-1]]));
  if(folds.length>1)cands.push(unfold(holes,folds.slice(1)));
  cands.push(unfold(holes,folds).filter((h,i)=>i%2===0));
  cands.push(unfold(holes.map(([x,y])=>[y,x]),folds));
  const seen=new Set([pkey(ans)]);const opts=[ans];
  for(const c of shuffled(cands,rng)){if(!c.length||c.some(([x,y])=>x<0||y<0||x>=N||y>=N||!Number.isInteger(x)||!Number.isInteger(y)))continue;const k=pkey(c);if(seen.has(k))continue;seen.add(k);opts.push(c);if(opts.length===4)break}
  if(opts.length<4)return null;
  const w=withAnswer(opts.map(pat),rng);
  const FOLD_IT={R:'la metà destra sopra quella sinistra',L:'la metà sinistra sopra quella destra',U:'la metà superiore sopra quella inferiore',D:'la metà inferiore sopra quella superiore'};
  // foglio piegato: rettangolo visibile con i fori, dentro il contorno tratteggiato del foglio intero
  const u=100/N;let fs=`<rect x="0.5" y="0.5" width="99" height="99" fill="none" stroke="currentColor" stroke-dasharray="3 3" stroke-width=".8" opacity=".5"/><rect x="${x0*u+1}" y="${y0*u+1}" width="${(x1-x0)*u-2}" height="${(y1-y0)*u-2}" fill="currentColor" fill-opacity=".18" stroke="currentColor" stroke-width="1.2"/>`;
  holes.forEach(([x,y])=>{fs+=`<circle cx="${x*u+u/2}" cy="${y*u+u/2}" r="${u*0.26}" fill="currentColor"/>`});
  const stim=`<div class="premesse"><p>Un foglio quadrato viene piegato ${folds.map((f,i)=>(i?(i===folds.length-1?' e poi ':', poi '):'')+FOLD_IT[f.f]).join('')}. Nel foglio piegato ${nHoles===1?'si fa un foro':'si fanno due fori'} come mostrato.</p></div><div class="figbox"><svg viewBox="0 0 100 100" aria-hidden="true">${fs}</svg></div>`;
  return{q:'Riaprendo completamente il foglio, come appaiono i fori?',stim,options:w.options,fig:true,answer:w.answer,rule:`ogni piega raddoppia i fori riflettendoli rispetto alla linea di piegatura: riaprendo ${folds.length} ${folds.length===1?'piega':'pieghe'} si ottengono ${ans.length} fori, disposti in modo simmetrico`};
}
registra('rot',{id:'piegatura',nome:'Foglio piegato',d:[0.25,1],w:1,gen:piegatura});

// ---- orientamento: percorso con giri e passi ----
const DIRS=['nord','est','sud','ovest'];
function percorso(rng,level){
  const nMoves=level<0.3?2:level<0.6?3:level<0.8?4:5;
  let dir=rint(rng,0,3);const start=dir;let x=0,y=0;const st=[];const dirSeq=[DIRS[dir]];
  for(let i=0;i<nMoves;i++){
    const turn=pick(level>=0.6?['destra','sinistra','dietrofront']:['destra','sinistra'],rng);
    dir=(dir+(turn==='destra'?1:turn==='sinistra'?3:2))%4;
    dirSeq.push(DIRS[dir]);const n=rint(rng,1,level<0.5?3:5);
    if(dir===0)y+=n;else if(dir===1)x+=n;else if(dir===2)y-=n;else x-=n;
    st.push(`${turn==='dietrofront'?'fai dietrofront':`giri a ${turn}`} e fai ${n} ${n===1?'passo':'passi'}`);
  }
  const pos=()=>{const p=[];if(x)p.push(`${Math.abs(x)} ${Math.abs(x)===1?'passo':'passi'} a ${x>0?'est':'ovest'}`);if(y)p.push(`${Math.abs(y)} ${Math.abs(y)===1?'passo':'passi'} a ${y>0?'nord':'sud'}`);return p.length?p.join(' e '):'nel punto di partenza'};
  let q,ans,cands;
  const mode=level<0.35?'dir':rng()<0.5?'dir':'pos';
  if(mode==='dir'){q='Verso quale punto cardinale stai guardando alla fine?';ans=DIRS[dir];cands=DIRS.filter(d=>d!==ans)}
  else{q='Dove ti trovi rispetto al punto di partenza?';ans=pos();const alt=[];const mk=(ax,ay)=>{const sx=x,sy=y;x=ax;y=ay;const s=pos();x=sx;y=sy;return s};alt.push(mk(-x,y),mk(x,-y),mk(y,x),mk(-x,-y),mk(x+1,y),mk(x,y-1),mk(x-1,y));cands=uniq(alt).filter(a=>a!==ans)}
  const w=textOpts(ans,shuffled(cands,rng),4,rng);if(!w)return null;
  const stim=`<div class="premesse"><p>Parti guardando verso <b>${DIRS[start]}</b>. Poi ${st.join(', ')}.</p></div>`;
  return{q,stim,options:w.options.map(cap),answer:w.answer,rule:mode==='dir'?`a ogni giro la direzione cambia: ${dirSeq.join(' → ')}; alla fine guardi verso ${ans}`:`la direzione passa per ${dirSeq.join(' → ')}; sommando i passi in ogni direzione ti trovi ${ans}`};
}
registra('rot',{id:'percorso',nome:'Orientamento',d:[0.05,1],w:0.9,gen:percorso});

})();
