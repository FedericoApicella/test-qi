// Generatori di quesiti per le sfide a due: matrici, serie numeriche, analogie verbali, rotazioni.
// Derivati dai generatori di index.html (test del QI), resi parametrici: con lo stesso seme
// i due giocatori generano quesiti identici senza doverli trasmettere.
(function(){
'use strict';
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function shuffled(arr,rng){const a=arr.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
const pick=(arr,rng)=>arr[Math.floor(rng()*arr.length)];
const rint=(rng,lo,hi)=>lo+Math.floor(rng()*(hi-lo+1));
function withAnswer(options,rng){const perm=shuffled(options.map((_,i)=>i),rng);return{options:perm.map(i=>options[i]),answer:perm.indexOf(0)}}

// ========================= disegno figure =========================
let uid=0;
const SHAPE={
  circle:(x,y,r)=>`<circle cx="${x}" cy="${y}" r="${r}"/>`,
  square:(x,y,r)=>`<rect x="${x-r}" y="${y-r}" width="${2*r}" height="${2*r}"/>`,
  triangle:(x,y,r)=>`<polygon points="${x},${y-r} ${x+r*0.95},${y+r*0.72} ${x-r*0.95},${y+r*0.72}"/>`,
  diamond:(x,y,r)=>`<polygon points="${x},${y-r} ${x+r},${y} ${x},${y+r} ${x-r},${y}"/>`,
  pent:(x,y,r)=>{const p=[];for(let k=0;k<5;k++){const a=-Math.PI/2+k*2*Math.PI/5;p.push(`${(x+r*Math.cos(a)).toFixed(1)},${(y+r*Math.sin(a)).toFixed(1)}`)}return`<polygon points="${p.join(' ')}"/>`},
  hex:(x,y,r)=>{const p=[];for(let k=0;k<6;k++){const a=k*Math.PI/3;p.push(`${(x+r*Math.cos(a)).toFixed(1)},${(y+r*Math.sin(a)).toFixed(1)}`)}return`<polygon points="${p.join(' ')}"/>`},
  arrow:(x,y,r)=>`<polygon points="${x},${y-r} ${x+r*0.85},${y+r*0.7} ${x},${y+r*0.25} ${x-r*0.85},${y+r*0.7}"/>`,
};
function drawShape(sh,x,y,r,fill,rot){
  const p=SHAPE[sh](x,y,r), tr=rot?` transform="rotate(${rot} ${x} ${y})"`:'';
  const line=`stroke="currentColor" stroke-width="3.5" stroke-linejoin="round"`;
  if(fill==='full')return`<g${tr} fill="currentColor" ${line}>${p}</g>`;
  if(fill==='none')return`<g${tr} fill="none" ${line}>${p}</g>`;
  const id='cl'+(++uid);
  return`<g${tr}><clipPath id="${id}"><rect x="${x-r-3}" y="${y-r-3}" width="${r+3}" height="${2*r+6}"/></clipPath><g fill="currentColor" clip-path="url(#${id})">${p}</g><g fill="none" ${line}>${p}</g></g>`;
}
const SEG={h0:[20,20,80,20],h1:[20,50,80,50],h2:[20,80,80,80],v0:[20,20,20,80],v1:[50,20,50,80],v2:[80,20,80,80],d1:[20,20,80,80],d2:[80,20,20,80]};
const SEG_KEYS=Object.keys(SEG);
const POS={1:[[50,50,26]],2:[[30,50,17],[70,50,17]],3:[[50,27,14],[28,71,14],[72,71,14]],4:[[30,30,15],[70,30,15],[30,70,15],[70,70,15]]};
const SIZE_MULT={s:0.6,m:1,l:1.3};
function cellSVG(spec,attrs){
  let inner='';
  if(spec.segs){inner=spec.segs.map(k=>{const s=SEG[k];return`<line x1="${s[0]}" y1="${s[1]}" x2="${s[2]}" y2="${s[3]}" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>`}).join('')}
  else{
    let els=spec.els;
    if(els.length===1&&spec.count>1)els=Array.from({length:spec.count},()=>els[0]);
    const pos=POS[els.length];
    inner=els.map((e,k)=>{const p=pos[k];const r=p[2]*(SIZE_MULT[e.size||'m']);return drawShape(e.shape,p[0],p[1],r,e.fill,e.rot||0)}).join('');
  }
  return`<svg viewBox="0 0 100 100" ${attrs||''} aria-hidden="true">${inner}</svg>`;
}
function cellsSVG(cells,mark,attrs){
  const xs=cells.map(c=>c[0]),ys=cells.map(c=>c[1]);
  const w=Math.max(...xs)+1,h=Math.max(...ys)+1,n=Math.max(w,h,4);
  const u=100/n,ox=(n-w)/2*u,oy=(n-h)/2*u;
  const rects=cells.map(c=>`<rect x="${(ox+c[0]*u+1.5).toFixed(1)}" y="${(oy+c[1]*u+1.5).toFixed(1)}" width="${(u-3).toFixed(1)}" height="${(u-3).toFixed(1)}" rx="2"/>`).join('');
  let dot='';
  if(mark){dot=`<circle cx="${(ox+mark[0]*u+u/2).toFixed(1)}" cy="${(oy+mark[1]*u+u/2).toFixed(1)}" r="${(u*0.22).toFixed(1)}" fill="var(--surface)"/>`}
  return`<svg viewBox="0 0 100 100" ${attrs||''} aria-hidden="true"><g fill="currentColor" stroke="currentColor" stroke-width="1">${rects}</g>${dot}</svg>`;
}

// ========================= matrici =========================
const SHAPES5=['circle','square','triangle','diamond','pent','hex'],FL=['none','half','full'],SZ=['s','m','l'],ROT=[0,45,90],CNT=[1,2,3];
const POOL={shape:SHAPES5,fill:FL,size:SZ,rot:ROT,count:CNT};
// in ordine di difficoltà crescente
const MAT_SPECS=[
  {slots:1,rules:[['shape','row']]},
  {slots:1,rules:[['fill','col']]},
  {slots:1,rules:[['count','row']]},
  {slots:1,rules:[['shape','latin']]},
  {slots:1,rules:[['shape','row'],['fill','col']]},
  {slots:1,rules:[['rot','col'],['fill','row']],arrow:true},
  {slots:1,rules:[['shape','latin'],['fill','latin2']]},
  {overlay:'add',k:2},
  {slots:1,rules:[['shape','latin'],['fill','latin2'],['count','row']]},
  {slots:2,rules:[['shape','row',0],['fill','col',1]]},
  {slots:2,rules:[['shape','latin',0],['size','col',1]]},
  {overlay:'xor',k:2},
  {slots:1,rules:[['shape','latin'],['fill','latin2'],['size','latin']]},
  {slots:2,rules:[['shape','latin',0],['fill','latin2',0],['shape','col',1]]},
  {slots:3,rules:[['shape','row',0],['fill','col',1],['size','row',2]]},
  {overlay:'add',k:3},
  {slots:2,rules:[['shape','latin',0],['fill','latin2',0],['shape','latin2',1],['fill','col',1]]},
  {slots:3,rules:[['shape','latin',0],['fill','latin2',1],['size','latin',2],['fill','row',0]]},
  {overlay:'xor',k:3},
  {slots:3,rules:[['shape','latin',0],['fill','latin2',0],['size','latin',1],['shape','col',1],['fill','row',2]]},
];
const RULE_TEXT={row:'cambia per riga',col:'cambia per colonna',latin:'quadrato latino (ogni valore una volta per riga e colonna)',latin2:'quadrato latino inverso'};
const ATTR_TEXT={shape:'forma',fill:'riempimento',size:'dimensione',rot:'rotazione',count:'numero'};
function ruleIndex(type,r,c){return type==='row'?r:type==='col'?c:type==='latin'?(r+c)%3:(r+2*c)%3}
function cellKey(spec){return JSON.stringify(spec.segs?{segs:spec.segs.slice().sort()}:{els:spec.els.map(e=>[e.shape,e.fill,e.size||'m',e.rot||0]),count:spec.count||1})}
function buildSlotItem(spec,rng){
  const n=spec.slots;
  const base=[];const shapeSet=shuffled(SHAPES5,rng);
  for(let k=0;k<n;k++)base.push({shape:spec.arrow?'arrow':shapeSet[k],fill:pick(FL,rng),size:'m',rot:0});
  const rules=spec.rules.map(([attr,type,slot])=>{
    let vals;
    if(attr==='shape')vals=shuffled(shapeSet,rng).slice(0,3);
    else vals=shuffled(POOL[attr],rng);
    return{attr,type,slot:slot||0,vals};
  });
  const cellAt=(r,c)=>{
    const els=base.map(b=>Object.assign({},b));let cnt=1;
    rules.forEach(ru=>{const v=ru.vals[ruleIndex(ru.type,r,c)];if(ru.attr==='count')cnt=v;else els[ru.slot][ru.attr]=v});
    return{els,count:cnt};
  };
  const grid=[];for(let r=0;r<3;r++)for(let c=0;c<3;c++)grid.push(cellAt(r,c));
  const ans=grid[8];const used=new Set([cellKey(ans)]);const cands=[];
  for(let k=0;k<n;k++)for(const attr of ['shape','fill','size','rot']){
    if(attr==='rot'&&!spec.arrow)continue;
    for(const v of POOL[attr]){if(ans.els[k][attr]===v)continue;
      const d={els:ans.els.map(e=>Object.assign({},e)),count:ans.count};d.els[k][attr]=v;cands.push({d,w:attr==='size'?0.6:1})}
  }
  for(const v of CNT){if(n===1&&v!==ans.count){cands.push({d:{els:ans.els.map(e=>Object.assign({},e)),count:v},w:spec.rules.some(r=>r[0]==='count')?1:0.3})}}
  [5,7,2,6].forEach(i=>cands.push({d:grid[i],w:1.2}));
  const opts=[ans];
  for(const cnd of shuffled(cands,rng).sort((a,b)=>b.w-a.w)){const k=cellKey(cnd.d);if(used.has(k))continue;used.add(k);opts.push(cnd.d);if(opts.length===6)break}
  const rule=rules.map(ru=>`${ATTR_TEXT[ru.attr]}${n>1?` (elemento ${ru.slot+1})`:''}: ${RULE_TEXT[ru.type]}`).join('; ');
  return{grid,opts,rule};
}
function buildOverlayItem(spec,rng){
  const grid=[];
  for(let r=0;r<3;r++){
    let A,B;
    for(let t=0;t<50;t++){
      A=shuffled(SEG_KEYS,rng).slice(0,spec.k);B=shuffled(SEG_KEYS,rng).slice(0,spec.k);
      const inter=A.filter(s=>B.includes(s)).length;
      if(spec.overlay==='add'&&inter===0)break;
      if(spec.overlay==='xor'&&inter>=1&&inter<spec.k)break;
    }
    const C=spec.overlay==='add'?[...A,...B]:[...A.filter(s=>!B.includes(s)),...B.filter(s=>!A.includes(s))];
    grid.push({segs:A},{segs:B},{segs:C});
  }
  const ans=grid[8];const A=grid[6].segs,B=grid[7].segs;
  const used=new Set([cellKey(ans)]);const opts=[ans];
  const cands=[[...new Set([...A,...B])],A.filter(s=>B.includes(s)),A,B,ans.segs.slice(1),[...ans.segs,pick(SEG_KEYS.filter(s=>!ans.segs.includes(s)),rng)],ans.segs.slice(0,-1).concat(pick(SEG_KEYS.filter(s=>!ans.segs.includes(s)),rng))];
  for(let t=0;t<30&&cands.length<14;t++){cands.push(shuffled(SEG_KEYS,rng).slice(0,ans.segs.length))}
  for(const c of cands){if(!c.length)continue;const d={segs:c};const k=cellKey(d);if(used.has(k))continue;used.add(k);opts.push(d);if(opts.length===6)break}
  return{grid,opts,rule:spec.overlay==='add'?'la terza figura è la somma delle prime due':'la terza figura contiene i segmenti presenti in una sola delle prime due'};
}
// level in [0,1] → spec di difficoltà proporzionale
function matrixItem(rng,level){
  const idx=Math.min(MAT_SPECS.length-1,Math.floor(level*MAT_SPECS.length));
  const spec=MAT_SPECS[idx];
  const b=spec.overlay?buildOverlayItem(spec,rng):buildSlotItem(spec,rng);
  const w=withAnswer(b.opts,rng);
  return{kind:'mat',grid:b.grid,options:w.options,answer:w.answer,rule:b.rule};
}

// ========================= serie numeriche =========================
// Ogni generatore restituisce {seq,next,rule}; sono ordinati per difficoltà crescente.
const NUM_GENS=[
  rng=>{const a=rint(rng,1,25),d=rint(rng,2,9);const s=[];for(let i=0;i<5;i++)s.push(a+i*d);return{seq:s,next:a+5*d,rule:`+${d}`}},
  rng=>{const d=rint(rng,2,9),a=rint(rng,40,99);const s=[];for(let i=0;i<4;i++)s.push(a-i*d);return{seq:s,next:a-4*d,rule:`−${d}`}},
  rng=>{const a=rint(rng,1,9),m=pick([2,3],rng);const s=[];for(let i=0;i<5;i++)s.push(a*Math.pow(m,i));return{seq:s,next:a*Math.pow(m,5),rule:`×${m}`}},
  rng=>{const c=rint(rng,0,9),k0=rint(rng,1,6);const s=[];for(let i=0;i<5;i++)s.push((k0+i)*(k0+i)+c);return{seq:s,next:(k0+5)*(k0+5)+c,rule:c?`quadrati +${c}`:'quadrati'}},
  rng=>{const a=rint(rng,1,30),d0=rint(rng,1,6);const s=[a];let v=a;for(let i=0;i<4;i++){v+=d0+i;s.push(v)}return{seq:s,next:v+d0+4,rule:`differenze crescenti: +${d0}, +${d0+1}, +${d0+2}…`}},
  rng=>{const a=rint(rng,1,9),b=rint(rng,a+1,a+9);const s=[a,b];for(let i=0;i<4;i++)s.push(s[s.length-1]+s[s.length-2]);const next=s[5]+s[4];return{seq:s,next,rule:'somma dei due precedenti'}},
  rng=>{const a=rint(rng,5,40),p=rint(rng,2,7),m=rint(rng,1,5);const s=[a];let v=a;for(let i=0;i<5;i++){v+=(i%2===0?p:-m);s.push(v)}return{seq:s,next:v+(5%2===0?p:-m),rule:`alternanza +${p} e −${m}`}},
  rng=>{const a=rint(rng,2,12),k=rint(rng,1,5);const s=[a];let v=a;for(let i=0;i<4;i++){v=2*v+k;s.push(v)}return{seq:s,next:2*v+k,rule:`×2 +${k}`}},
  rng=>{const a=rint(rng,3,12),k=rint(rng,1,2);const s=[a];let v=a;for(let i=0;i<4;i++){v=2*v-k;s.push(v)}return{seq:s,next:2*v-k,rule:`×2 −${k}`}},
  rng=>{const a=rint(rng,0,9);const s=[];for(let i=1;i<=5;i++)s.push((a+i)*(a+i+1));return{seq:s,next:(a+6)*(a+7),rule:'n × (n+1)'}},
  rng=>{const a=rint(rng,1,5),b=rint(rng,10,40),d=rint(rng,2,7);const s=[];for(let i=0;i<3;i++){s.push(a*Math.pow(2,i),b+i*d)}s.push(a*8);return{seq:s,next:b+3*d,rule:`due serie alternate: una ×2, l'altra +${d}`}},
  rng=>{const a=rint(rng,3,7),m=rint(rng,2,3),k=rint(rng,1,a-1);const s=[a];let v=a;for(let i=0;i<4;i++){v=i%2===0?v*m:v-k;s.push(v)}return{seq:s,next:4%2===0?v*m:v-k,rule:`alternanza ×${m} e −${k}`}},
  rng=>{const k0=rint(rng,1,2);const s=[];for(let i=0;i<4;i++)s.push(Math.pow(k0+i,3));return{seq:s,next:Math.pow(k0+4,3),rule:'cubi: n³'}},
  rng=>{const P=[2,3,5,7,11,13,17,19,23,29,31];const st=rint(rng,0,3);const s=P.slice(st,st+5);return{seq:s,next:P[st+5],rule:'numeri primi'}},
  rng=>{const a=rint(rng,1,3);const s=[];let v=a;for(let i=2;i<=6;i++){s.push(v);v*=i}return{seq:s,next:v,rule:'fattoriali: ×2, ×3, ×4…'}},
  rng=>{const c=rint(rng,1,3);const s=[];for(let i=1;i<=5;i++)s.push(i*i+c*i);return{seq:s,next:36+6*c,rule:`n² + ${c}n`}},
  rng=>{const s=[];for(let i=1;i<=5;i++)s.push(i*i*(i+1));return{seq:s,next:36*7,rule:'n² × (n+1)'}},
  rng=>{const a=rint(rng,1,3),d=rint(rng,1,2);const s=[a];let v=a,st=d;for(let i=0;i<4;i++){v+=st;st*=2;s.push(v)}return{seq:s,next:v+st,rule:`differenze che raddoppiano: +${d}, +${2*d}, +${4*d}…`}},
];
// altri generatori con la loro difficoltà (0..1): si mescolano ai precedenti, che valgono i/N
const NUM_MORE=[
  [0.05,rng=>{const a=rint(rng,2,30),d=rint(rng,3,15);const s=[];for(let i=0;i<5;i++)s.push(a+i*d);return{seq:s,next:a+5*d,rule:`+${d} ogni volta`}}],
  [0.1,rng=>{const d=rint(rng,3,12),a=rint(rng,6*d+2,6*d+60);const s=[];for(let i=0;i<5;i++)s.push(a-i*d);return{seq:s,next:a-5*d,rule:`−${d} ogni volta`}}],
  [0.15,rng=>{const a=rint(rng,1,6),b=rint(rng,20,40),d=rint(rng,2,5),e=rint(rng,1,4);const s=[];for(let i=0;i<3;i++){s.push(a+i*d,b-i*e)}return{seq:s,next:a+3*d,rule:`due serie alternate: +${d} nei posti dispari, −${e} nei pari`}}],
  [0.2,rng=>{const k=rint(rng,2,5),a=k*rint(rng,8,20);const s=[a];let v=a;for(let i=0;i<3;i++){v=v/k*k-k;s.push(v)}return{seq:s,next:v-k,rule:`−${k}`}}],
  [0.25,rng=>{const e=rint(rng,1,4);const p=Math.pow(2,e+4)*rint(rng,1,3);const s=[];let v=p;for(let i=0;i<5;i++){s.push(v);v/=2}return{seq:s,next:v,rule:'÷2 ogni volta'}}],
  [0.5,rng=>{const c=rint(rng,0,5),k0=rint(rng,1,4);const s=[];for(let i=0;i<5;i++)s.push((k0+i)*(k0+i+1)/2+c);return{seq:s,next:(k0+5)*(k0+6)/2+c,rule:`differenze +${k0+1}, +${k0+2}, +${k0+3}… (numeri triangolari${c?` +${c}`:''})`}}],
  [0.3,rng=>{const a=rint(rng,1,4),m=rint(rng,2,4),k=rint(rng,1,3);const s=[a];let v=a;for(let i=0;i<4;i++){v=v*m+k;s.push(v)}return{seq:s,next:v*m+k,rule:`×${m} +${k}`}}],
  [0.35,rng=>{const a=rint(rng,70,120),d0=rint(rng,8,12);const s=[a];let v=a,d=d0;for(let i=0;i<4;i++){v-=d;s.push(v);d--}return{seq:s,next:v-d,rule:`differenze che calano di 1: −${d0}, −${d0-1}, −${d0-2}…`}}],
  [0.35,rng=>{const p=[rint(rng,2,4),rint(rng,5,8)];const a=rint(rng,1,10);const s=[a];let v=a;for(let i=0;i<5;i++){v+=p[i%2];s.push(v)}return{seq:s,next:v+p[1],rule:`si alternano +${p[0]} e +${p[1]}`}}],
  [0.72,rng=>{const k=rint(rng,1,4),c=rint(rng,0,6);const s=[];for(let i=k;i<k+5;i++)s.push(i*i*2+c);return{seq:s,next:(k+5)*(k+5)*2+c,rule:`2 × n²${c?` + ${c}`:''}`}}],
  [0.65,rng=>{const a=rint(rng,1,5);const sq=[1,4,9,16,25,36];const s=[a];let v=a;for(let i=0;i<4;i++){v+=sq[i];s.push(v)}return{seq:s,next:v+sq[4],rule:'si aggiungono i quadrati: +1, +4, +9, +16…'}}],
  [0.6,rng=>{const a=rint(rng,1,9);const P=[2,3,5,7,11,13];const s=[a];let v=a;for(let i=0;i<4;i++){v+=P[i];s.push(v)}return{seq:s,next:v+P[4],rule:'si aggiungono i numeri primi: +2, +3, +5, +7…'}}],
  [0.72,rng=>{const o=rint(rng,0,2)*2+1;const s=[];for(let i=0;i<4;i++)s.push((o+2*i)*(o+2*i));return{seq:s,next:(o+8)*(o+8),rule:'quadrati dei numeri dispari'}}],
  [0.55,rng=>{const a=rint(rng,1,3),b=rint(rng,1,3),c=rint(rng,2,4);const s=[a,b,c];for(let i=0;i<3;i++)s.push(s[s.length-1]+s[s.length-2]+s[s.length-3]);return{seq:s,next:s[5]+s[4]+s[3],rule:'ogni numero è la somma dei tre precedenti'}}],
  [0.62,rng=>{const m=rint(rng,2,3);const s=[];for(let i=1;i<=5;i++)s.push(Math.pow(m,i)-1);return{seq:s,next:Math.pow(m,6)-1,rule:`potenze di ${m} meno 1`}}],
  [0.55,rng=>{const a=rint(rng,1,4),b=rint(rng,2,5);const s=[a,b];for(let i=0;i<4;i++)s.push(2*s[s.length-1]+s[s.length-2]);return{seq:s,next:2*s[5]+s[4],rule:'il doppio del precedente più quello prima ancora'}}],
  [0.93,rng=>{const k=rint(rng,1,3);const s=[];for(let i=k+1;i<=k+5;i++)s.push(i*i*i-i);return{seq:s,next:(k+6)*(k+6)*(k+6)-(k+6),rule:'n³ − n'}}],
  [0.6,rng=>{const a=rint(rng,2,5);const s=[a];let v=a;for(let i=1;i<=4;i++){v=v*2+(i%2?1:-1);s.push(v)}return{seq:s,next:v*2+1,rule:'×2 +1, poi ×2 −1, alternati'}}],
  [0.6,rng=>{const a=rint(rng,2,6),b=rint(rng,2,6);const s=[a,b];for(let i=0;i<3;i++)s.push(s[s.length-1]*s[s.length-2]>2000?s[s.length-1]+s[s.length-2]:s[s.length-1]+s[s.length-2]);return{seq:s,next:s[4]+s[3],rule:'ogni numero è la somma dei due precedenti'}}],
  [0.65,rng=>{const a=rint(rng,1,4);const s=[a];let v=a;for(let i=1;i<=4;i++){v=v*i+i;s.push(v)}return{seq:s,next:v*5+5,rule:'×1 +1, ×2 +2, ×3 +3, ×4 +4…'}}],
  [0.93,rng=>{const k=rint(rng,1,4);const s=[];for(let i=k;i<k+5;i++)s.push(i*i+(i+1)*(i+1));return{seq:s,next:(k+5)*(k+5)+(k+6)*(k+6),rule:'somma di due quadrati consecutivi: n² + (n+1)²'}}],
  [0.7,rng=>{const a=rint(rng,1,3),d=rint(rng,2,3);const s=[a];let v=a,st=d;for(let i=0;i<4;i++){v+=st;st*=3;s.push(v)}return{seq:s,next:v+st,rule:`differenze che triplicano: +${d}, +${3*d}, +${9*d}…`}}],
  [0.95,rng=>{const a=rint(rng,2,4);const s=[a];let v=a;for(let i=0;i<4;i++){v=v*v-v;if(v>5000)break;s.push(v)}if(s.length<4)return{seq:[2,2,2,2],next:2,rule:'costante'};const nx=s[s.length-1]*s[s.length-1]-s[s.length-1];return nx>99999?{seq:s.slice(0,-1),next:s[s.length-1],rule:'n² − n applicato al precedente'}:{seq:s,next:nx,rule:'n² − n applicato al precedente'}}],
  [0.96,rng=>{const P=[2,3,5,7,11,13,17,19,23,29,31,37];const st=rint(rng,0,4);const s=P.slice(st,st+5).map(p=>p*p);return{seq:s,next:P[st+5]*P[st+5],rule:'quadrati dei numeri primi'}}],
  [0.85,rng=>{const a=rint(rng,1,3);const s=[];let v=a;for(let i=1;i<=5;i++){s.push(v);v=v*i+1}return{seq:s,next:v,rule:'×1 +1, ×2 +1, ×3 +1, ×4 +1…'}}],
  [0.97,rng=>{const k=rint(rng,2,4);const s=[];for(let i=1;i<=5;i++)s.push(Math.pow(i,k)+i);return{seq:s,next:Math.pow(6,k)+6,rule:`n${k===2?'²':k===3?'³':'⁴'} + n`}}],
];
// difficoltà percepita dei generatori storici (stesso ordine di NUM_GENS): quadrati, cubi, n(n+1) e fattoriali
// sono molto più duri di quanto dica la loro posizione (Federico, 8 nov 2026)
const NUM_GENS_D=[0,0.03,0.15,0.62,0.3,0.4,0.25,0.35,0.4,0.78,0.5,0.45,0.88,0.6,0.85,0.82,0.92,0.5];
const NUM_ALL=NUM_GENS.map((g,i)=>[NUM_GENS_D[i]!=null?NUM_GENS_D[i]:i/NUM_GENS.length,g]).concat(NUM_MORE);
function numItem(rng,level){
  // le serie sono più impegnative degli altri quesiti a parità di livello: la curva sale più piano
  const eff=Math.pow(Math.max(0,Math.min(1,level)),1.7);
  let pool=[];for(let win=0.08;pool.length<4;win+=0.06)pool=NUM_ALL.filter(x=>Math.abs(x[0]-eff)<=win);
  let g=pick(pool,rng)[1](rng);if(!g||g.next<2||!Number.isInteger(g.next)||g.seq.some(x=>!Number.isInteger(x)||x<0)||new Set(g.seq).size<2)g=NUM_GENS[0](rng);
  const {seq,next,rule}=g;
  const last=seq[seq.length-1],d=last-seq[seq.length-2];
  const cands=[next+1,next-1,next+2,next-2,last+d,next+d,2*last,next+3,next-3,last+2*d,Math.round(next*1.1)+1,next+5,next-4];
  const opts=[next];for(const c of shuffled(cands,rng)){if(c!==next&&c>0&&!opts.includes(c))opts.push(c);if(opts.length===5)break}
  for(let k=4;opts.length<5&&k<40;k++){const c=next+(k%2?k:-k);if(c>0&&!opts.includes(c))opts.push(c)}
  const w=withAnswer(opts,rng);
  return{kind:'num',seq,options:w.options,answer:w.answer,rule};
}

// ========================= analogie verbali =========================
// [A, B, C, [risposta, distrattori...], relazione]; ordinate per difficoltà crescente a blocchi.
const VERB_RAW=[
  ['Caldo','Freddo','Alto',['Basso','Largo','Lungo','Grande','Stretto'],'contrari'],
  ['Gatto','Miagolare','Cane',['Abbaiare','Correre','Mordere','Nitrire','Scodinzolare'],'animale e suo verso'],
  ['Ruota','Bicicletta','Ala',['Aereo','Cielo','Volo','Piuma','Pilota'],'parte e intero'],
  ['Giorno','Notte','Estate',['Inverno','Caldo','Mare','Sole','Autunno'],'contrari'],
  ['Occhio','Vedere','Orecchio',['Sentire','Toccare','Parlare','Annusare','Gustare'],'organo e sua funzione'],
  ['Pane','Fornaio','Scarpe',['Calzolaio','Negozio','Piedi','Cuoio','Sarto'],'prodotto e artigiano'],
  ['Mucca','Latte','Ape',['Miele','Fiore','Alveare','Pungiglione','Cera'],'animale e prodotto'],
  ['Pioggia','Ombrello','Sole',['Cappello','Spiaggia','Caldo','Estate','Luce'],'condizione e protezione'],
  ['Scala','Gradino','Collana',['Perla','Oro','Collo','Gioiello','Fermaglio'],'intero e sua unità ripetuta'],
  ['Medico','Ospedale','Giudice',['Tribunale','Legge','Avvocato','Sentenza','Prigione'],'professionista e suo luogo di lavoro'],
  ['Uva','Vino','Olive',['Olio','Albero','Raccolta','Frantoio','Salamoia'],'materia prima e prodotto derivato'],
  ['Libro','Capitolo','Film',['Scena','Attore','Cinema','Regista','Biglietto'],'intero e sua parte'],
  ['Pittore','Quadro','Architetto',['Edificio','Matita','Cantiere','Mattone','Progetto'],'creatore e opera'],
  ['Secondo','Minuto','Giorno',['Settimana','Ora','Orologio','Anno','Calendario'],'unità e unità maggiore'],
  ['Fame','Mangiare','Sete',['Bere','Acqua','Bicchiere','Sudare','Correre'],'bisogno e azione che lo soddisfa'],
  ['Entomologo','Insetti','Ornitologo',['Uccelli','Pesci','Piante','Rocce','Stelle'],'studioso e oggetto di studio'],
  ['Sete','Bere','Stanchezza',['Riposare','Correre','Sbadigliare','Lavorare','Sognare'],'bisogno e azione che lo soddisfa'],
  ['Termometro','Temperatura','Barometro',['Pressione','Umidità','Vento','Altitudine','Tempo'],'strumento e grandezza misurata'],
  ['Pecora','Gregge','Pesce',['Banco','Mare','Rete','Pescatore','Acquario'],'individuo e gruppo'],
  ['Scultore','Scalpello','Chirurgo',['Bisturi','Ospedale','Guanti','Paziente','Siringa'],'professionista e strumento'],
  ['Autore','Romanzo','Compositore',['Sinfonia','Orchestra','Pianoforte','Concerto','Direttore'],'creatore e opera'],
  ['Lupo','Branco','Uccello',['Stormo','Nido','Cielo','Ala','Gabbia'],'individuo e gruppo'],
  ['Vela','Barca','Motore',['Automobile','Benzina','Strada','Rumore','Meccanico'],'ciò che muove e mezzo'],
  ['Ghiaccio','Acqua','Vapore',['Gas','Nuvola','Caldo','Pentola','Fumo'],'stato e sostanza'],
  ['Pagina','Libro','Mattone',['Muro','Argilla','Muratore','Cemento','Casa'],'unità e intero'],
  ['Avaro','Generosità','Codardo',['Coraggio','Paura','Forza','Viltà','Onore'],'persona e qualità che le manca'],
  ['Scarso','Abbondante','Effimero',['Duraturo','Fragile','Breve','Leggero','Rapido'],'contrari'],
  ['Chilometro','Distanza','Litro',['Volume','Acqua','Peso','Bottiglia','Lunghezza'],'unità e grandezza'],
  ['Sintomo','Malattia','Fumo',['Fuoco','Cenere','Camino','Calore','Legna'],'segno e causa'],
  ['Arcipelago','Isola','Costellazione',['Stella','Cielo','Pianeta','Galassia','Telescopio'],'insieme e suo elemento'],
  ['Sordo','Udito','Cieco',['Vista','Occhiali','Buio','Bastone','Luce'],'condizione e senso mancante'],
  ['Vulcano','Lava','Nuvola',['Pioggia','Cielo','Vento','Nebbia','Tuono'],'fonte e ciò che emette'],
  ['Spartito','Musicista','Ricetta',['Cuoco','Cucina','Ingrediente','Piatto','Forno'],'istruzioni e chi le esegue'],
  ['Timido','Audace','Modesto',['Vanitoso','Gentile','Semplice','Umile','Povero'],'contrari'],
  ['Mitigare','Attenuare','Esacerbare',['Aggravare','Alleviare','Ignorare','Risolvere','Moderare'],'sinonimi'],
  ['Introduzione','Saggio','Ouverture',['Opera','Concerto','Coro','Teatro','Orchestra'],'parte iniziale e intero'],
  ['Lapidario','Prolisso','Ermetico',['Esplicito','Oscuro','Chiuso','Breve','Poetico'],'contrari (lessico ricercato)'],
  ['Effimero','Durata','Fragile',['Resistenza','Vetro','Peso','Cura','Rottura'],'qualità e ciò che manca'],
  ['Erudito','Ignorante','Loquace',['Taciturno','Chiacchierone','Eloquente','Sincero','Timido'],'contrari'],
  ['Apice','Vertice','Nadir',['Fondo','Cima','Centro','Orizzonte','Margine'],'sinonimi'],
];
// Relazioni per generare analogie A : B = C : ? (migliaia di combinazioni, tutte di ragionamento, niente nozionismo).
// d = difficoltà 0..1; sym = relazione simmetrica (contrari, sinonimi); coppie "a>b" separate da "|".
const VERB_REL=[
 {id:'verso',label:'animale e suo verso',d:0.05,p:'gatto>miagolare|cane>abbaiare|cavallo>nitrire|mucca>muggire|pecora>belare|asino>ragliare|leone>ruggire|lupo>ululare|maiale>grugnire|serpente>sibilare|ape>ronzare|rana>gracidare|corvo>gracchiare|colomba>tubare|elefante>barrire|cicala>frinire|gufo>bubolare|passero>cinguettare|oca>starnazzare|tacchino>gloglottare|cervo>bramire|gallina>chiocciare'},
 {id:'organo',label:'organo e sua funzione',d:0.12,p:'occhio>vedere|orecchio>sentire|naso>annusare|lingua>gustare|polmoni>respirare|denti>masticare|gambe>camminare|stomaco>digerire|cervello>pensare|mani>afferrare|branchie>filtrare|ali>volare|pinne>nuotare|cuore>pompare|palpebre>proteggere'},
 {id:'contr_agg',label:'contrari',d:0.1,sym:1,p:'caldo>freddo|alto>basso|pieno>vuoto|veloce>lento|aperto>chiuso|dolce>amaro|ricco>povero|felice>triste|forte>debole|vicino>lontano|leggero>pesante|nuovo>vecchio|largo>stretto|lungo>corto|duro>morbido|bagnato>asciutto|pulito>sporco|primo>ultimo|vero>falso|chiaro>scuro|giovane>anziano|facile>difficile|grasso>magro|rumoroso>silenzioso|liscio>ruvido|attivo>passivo|ordinato>disordinato|generoso>avaro|coraggioso>vigliacco|onesto>disonesto'},
 {id:'contr_verbi',label:'azioni contrarie',d:0.15,sym:1,p:'entrare>uscire|salire>scendere|comprare>vendere|vincere>perdere|accendere>spegnere|ricordare>dimenticare|nascere>morire|aprire>chiudere|partire>arrivare|ridere>piangere|dare>ricevere|aumentare>diminuire|riempire>svuotare|accelerare>frenare|includere>escludere|importare>esportare|attrarre>respingere|costruire>demolire|lodare>criticare|unire>separare|nascondere>mostrare|iniziare>terminare|avvicinare>allontanare|accettare>rifiutare'},
 {id:'contr_nomi',label:'contrari',d:0.2,sym:1,p:'giorno>notte|inizio>fine|luce>buio|pace>guerra|coraggio>paura|amico>nemico|ordine>caos|alba>tramonto|vittoria>sconfitta|domanda>risposta|entrata>uscita|gioia>tristezza|ricchezza>povertà|verità>menzogna|salita>discesa|premio>punizione|difesa>attacco|nord>sud|est>ovest|vantaggio>svantaggio|causa>effetto|teoria>pratica'},
 {id:'parte',label:'parte e intero',d:0.2,p:'ruota>bicicletta|pagina>libro|petalo>fiore|foglia>albero|dito>mano|tasto>tastiera|mattone>muro|capitolo>romanzo|verso>poesia|vagone>treno|lettera>parola|parola>frase|spicchio>arancia|gradino>scala|remo>barca|lama>coltello|setola>spazzola|maglia>catena|acino>grappolo|scena>film|nota>accordo|piastrella>pavimento|chiodo>zoccolo|ala>uccello|corda>chitarra|lente>occhiali|pixel>immagine|fotogramma>pellicola|tessera>mosaico'},
 {id:'strumento',label:'oggetto e sua funzione',d:0.2,p:'forbici>tagliare|penna>scrivere|chiave>aprire|scopa>spazzare|ago>cucire|pennello>dipingere|forno>cuocere|lavatrice>lavare|bilancia>pesare|sega>segare|colla>incollare|gomma>cancellare|lampada>illuminare|sveglia>svegliare|freno>rallentare|frigorifero>conservare|ombrello>riparare|telescopio>osservare|martello>battere|trapano>forare|spugna>assorbire|microfono>amplificare|filtro>depurare|bussola>orientare|timbro>imprimere'},
 {id:'piccolo',label:'animale e suo piccolo',d:0.25,p:'cavallo>puledro|mucca>vitello|pecora>agnello|gallina>pulcino|rana>girino|capra>capretto|leone>leoncino|cervo>cerbiatto|anatra>anatroccolo|lepre>leprotto|aquila>aquilotto|volpe>volpacchiotto|farfalla>bruco|orso>orsacchiotto|cane>cucciolo|zanzara>larva|gatto>gattino|oca>papero'},
 {id:'mestiere',label:'professionista e suo strumento',d:0.3,p:'chirurgo>bisturi|pittore>pennello|parrucchiere>forbici|muratore>cazzuola|medico>stetoscopio|sarto>ago|scultore>scalpello|cuoco>mestolo|arbitro>fischietto|direttore>bacchetta|pescatore>rete|contadino>aratro|biologo>microscopio|astronomo>telescopio|giardiniere>cesoie|idraulico>chiave|fotografo>obiettivo|scrittore>penna|falegname>pialla|chimico>provetta|geometra>livella|boscaiolo>ascia|minatore>piccone|pilota>cloche|cartografo>mappa'},
 {id:'luogo',label:'professionista e suo luogo di lavoro',d:0.3,p:'medico>ospedale|insegnante>scuola|giudice>tribunale|cuoco>cucina|meccanico>officina|farmacista>farmacia|bibliotecario>biblioteca|fornaio>panetteria|muratore>cantiere|scienziato>laboratorio|attore>palcoscenico|contadino>campo|minatore>miniera|astronomo>osservatorio|giornalista>redazione|soldato>caserma|monaco>convento|marinaio>nave|pilota>cabina|pittore>atelier|chirurgo>sala operatoria|vigile del fuoco>caserma|bagnino>spiaggia|cameriere>ristorante'},
 {id:'contenitore',label:'contenitore e contenuto',d:0.3,p:'portafoglio>soldi|vaso>fiori|acquario>pesci|libreria>libri|fodero>spada|faretra>frecce|astuccio>matite|armadio>vestiti|serbatoio>carburante|garage>automobile|scrigno>gioielli|cartella>fogli|nido>uova|granaio>grano|cantina>vino|busta>lettera|alveare>api|stalla>mucche|hangar>aerei|voliera>uccelli|archivio>documenti|cassaforte>valori|ovile>pecore|pollaio>galline'},
 {id:'gruppo',label:'individuo e gruppo',d:0.35,p:'pecora>gregge|ape>sciame|lupo>branco|pesce>banco|uccello>stormo|mucca>mandria|nave>flotta|albero>bosco|soldato>esercito|musicista>orchestra|giocatore>squadra|isola>arcipelago|montagna>catena|chiave>mazzo|persona>folla|cantante>coro|studente>classe|stella>costellazione|vocabolo>dizionario|ministro>governo|giurato>giuria|attore>compagnia|canzone>album|carta>mazzo|abete>pineta'},
 {id:'materia',label:'materia prima e prodotto',d:0.35,p:'uva>vino|latte>formaggio|grano>farina|farina>pane|olive>olio|lana>maglione|sabbia>vetro|argilla>mattone|legno>carta|cacao>cioccolato|ferro>acciaio|petrolio>plastica|luppolo>birra|cotone>tessuto|cuoio>scarpe|bozzolo>seta|mele>sidro|barbabietola>zucchero|panna>burro|pomodoro>passata|caffè>espresso|carbone>diamante|minerale>metallo'},
 {id:'sequenza',label:'stadio e stadio successivo',d:0.4,p:'lunedì>martedì|gennaio>febbraio|primavera>estate|estate>autunno|autunno>inverno|inverno>primavera|infanzia>adolescenza|bruco>crisalide|crisalide>farfalla|seme>germoglio|girino>rana|mattina>pomeriggio|pomeriggio>sera|sera>notte|decina>centinaio|centinaio>migliaio|bozza>stesura|fiore>frutto|uovo>larva|semina>raccolto|alba>mattino|prologo>capitolo|ottobre>novembre|venerdì>sabato'},
 {id:'misura',label:'strumento e ciò che misura',d:0.45,p:'termometro>temperatura|bilancia>peso|orologio>tempo|metro>lunghezza|barometro>pressione|tachimetro>velocità|igrometro>umidità|sismografo>scosse|anemometro>vento|goniometro>angoli|bussola>direzione|altimetro>quota|pluviometro>pioggia|contagiri>giri|fonometro>rumore|clessidra>tempo|cardiofrequenzimetro>battito'},
 {id:'causa',label:'causa ed effetto',d:0.45,p:'pioggia>allagamento|fuoco>cenere|fatica>stanchezza|freddo>brivido|virus>malattia|studio>conoscenza|allenamento>forza|sole>abbronzatura|terremoto>crollo|siccità>carestia|scintilla>incendio|vento>onde|ferita>cicatrice|sforzo>sudore|battuta>risata|miccia>esplosione|bugia>sfiducia|seme>pianta|attrito>calore|inquinamento>smog|vaccino>immunità|lampo>tuono|pratica>abilità|gelo>ghiaccio'},
 {id:'intensita',label:'grado minore e grado maggiore',d:0.5,p:'tiepido>bollente|brezza>uragano|collina>montagna|ruscello>fiume|pioggerella>diluvio|sorriso>risata|simpatia>amore|fastidio>dolore|mormorare>urlare|camminare>correre|sassolino>masso|stanco>esausto|contento>euforico|fresco>gelido|paura>terrore|rabbia>furia|bello>stupendo|brutto>orribile|grande>enorme|sorseggiare>tracannare|piccolo>minuscolo|antipatia>odio|scossa>terremoto|lago>mare|sobborgo>metropoli|interessato>appassionato|sbocconcellare>divorare'},
 {id:'creatore',label:'autore e opera',d:0.5,p:'pittore>quadro|scrittore>romanzo|compositore>sinfonia|architetto>progetto|poeta>poesia|scultore>statua|regista>film|ragno>ragnatela|ape>favo|castoro>diga|uccello>nido|coreografo>balletto|drammaturgo>commedia|stilista>abito|sarto>vestito|cuoco>piatto|vasaio>vaso|orafo>gioiello|programmatore>software|fotografo>fotografia'},
 {id:'unita',label:'unità e grandezza',d:0.55,p:'metro>lunghezza|chilogrammo>massa|secondo>tempo|litro>volume|watt>potenza|volt>tensione|ampere>corrente|joule>energia|newton>forza|ettaro>superficie|byte>memoria|hertz>frequenza|pascal>pressione|grado>angolo|caloria>energia|nodo>velocità|carato>purezza|lumen>luminosità'},
 {id:'sinonimi',label:'sinonimi',d:0.65,sym:1,p:'arduo>difficile|esiguo>scarso|ingente>enorme|alacre>operoso|effimero>passeggero|loquace>chiacchierone|parsimonioso>risparmiatore|perspicace>acuto|sagace>astuto|solerte>diligente|tenace>perseverante|veemente>impetuoso|mite>docile|fausto>propizio|nefasto>funesto|proficuo>vantaggioso|palese>evidente|recondito>nascosto|insigne>illustre|inerme>indifeso|indolente>pigro|bizzarro>stravagante|cupo>tetro|celere>rapido|celebre>famoso|ilare>allegro|mesto>triste|ostinato>testardo|irato>arrabbiato|eloquente>espressivo|fortuito>casuale|lampante>chiaro|esausto>sfinito|arcano>misterioso|sobrio>moderato|tangibile>concreto|vano>inutile|lieto>felice'},
 {id:'contr_ricerc',label:'contrari (lessico ricercato)',d:0.75,sym:1,p:'effimero>duraturo|prodigo>avaro|loquace>taciturno|palese>occulto|ottimista>pessimista|concavo>convesso|centripeto>centrifugo|astratto>concreto|oggettivo>soggettivo|induttivo>deduttivo|acerbo>maturo|esordio>epilogo|zenit>nadir|prologo>epilogo|convergere>divergere|altruista>egoista|sinonimo>contrario|ascesa>declino|lecito>illecito|esplicito>implicito|preciso>approssimativo|ortodosso>eterodosso|apatico>appassionato|frugale>sontuoso|benevolo>malevolo|transitorio>permanente|prolisso>conciso|loquacità>mutismo|euforia>sconforto|zelo>negligenza'},
 {id:'mancanza',label:'condizione e ciò che manca',d:0.8,p:'sordo>udito|cieco>vista|muto>parola|orfano>genitori|anonimo>nome|apolide>cittadinanza|analfabeta>istruzione|insonne>sonno|sterile>fertilità|inodore>odore|incolore>colore|insipido>sapore|immobile>movimento|ateo>fede|disoccupato>lavoro|smemorato>memoria|squattrinato>denaro|inerme>difesa|amorfo>forma|anemico>sangue|sobrio>alcol|vegano>carne|astemio>vino|imberbe>barba|calvo>capelli'},
];
// costruzione dell'indice: relazioni con le coppie divise e la mappa parola → partner per relazione
const VREL=VERB_REL.map(r=>{const pairs=r.p.split('|').map(x=>x.split('>').map(w=>w.trim())).filter(x=>x.length===2&&x[0]&&x[1]);return Object.assign({},r,{pairs})});
const cap=(w)=>w.charAt(0).toUpperCase()+w.slice(1);
// parole collegate a w in una relazione (per escludere risposte ambigue)
const famiglia=(r)=>r.id.indexOf('contr')===0?'contr':r.id;
function partners(rel,w){const out=new Set();rel.pairs.forEach(([a,b])=>{if(a===w)out.add(b);if(rel.sym&&b===w)out.add(a)});return out}
function genAnalogy(rng,level,used){
  // relazione con difficoltà vicina al livello (finestra che si allarga se serve)
  let pool=[];for(let win=0.12;pool.length<3&&win<1.2;win+=0.1)pool=VREL.filter(r=>Math.abs(r.d-level)<=win);
  for(let t=0;t<60;t++){
    const rel=pick(pool,rng);const n=rel.pairs.length;if(n<4)continue;
    const i=Math.floor(rng()*n);let j=Math.floor(rng()*(n-1));if(j>=i)j++;
    let [a,b]=rel.pairs[i],[c,d]=rel.pairs[j];
    if(rel.sym&&rng()<0.5){[a,b]=[b,a];[c,d]=[d,c]}
    const words=[a,b,c,d];if(new Set(words).size<4)continue;
    const k=rel.id+':'+a+':'+c;if(used&&used.has(k))continue;
    const bad=new Set([d,c,a,b]);VREL.forEach(r=>{if(famiglia(r)===famiglia(rel))partners(r,c).forEach(x=>bad.add(x))});
    // trappole: i partner di C in altre relazioni (es. Cane → cucciolo, branco) e risposte dello stesso tipo
    const trap=[];VREL.forEach(r=>{if(famiglia(r)===famiglia(rel))return;partners(r,c).forEach(x=>{if(!bad.has(x))trap.push(x)});r.pairs.forEach(([x,y])=>{if(r.sym&&y===c&&!bad.has(x))trap.push(x)})});
    const same=rel.pairs.map(p=>p[1]).concat(rel.sym?rel.pairs.map(p=>p[0]):[]).filter(x=>!bad.has(x)&&!partners(rel,x).has(c));
    const opts=[d];const add=(x)=>{if(x&&!bad.has(x)&&!opts.includes(x))opts.push(x)};
    shuffled(trap,rng).slice(0,2).forEach(add);
    for(const x of shuffled(same,rng)){if(opts.length>=5)break;add(x)}
    if(opts.length<5)continue;
    if(used)used.add(k);
    const w=withAnswer(opts.slice(0,5).map(cap),rng);
    return{kind:'verb',a:cap(a),b:cap(b),c:cap(c),options:w.options,answer:w.answer,rule:rel.label};
  }
  return null;
}

function verbItem(rng,level,used){
  // tre volte su quattro un'analogia generata dalle relazioni (migliaia di combinazioni), altrimenti una della lista scritta a mano
  if(rng()<0.75){const g=genAnalogy(rng,level,used);if(g)return g}
  // scegli, tra quelli non ancora usati nella partita, uno vicino al livello richiesto
  const n=VERB_RAW.length;const target=Math.min(n-1,Math.floor(level*n));
  let best=-1,bd=1e9;
  const order=shuffled(VERB_RAW.map((_,i)=>i),rng);
  for(const i of order){if(used.has(i))continue;const d=Math.abs(i-target);if(d<bd){bd=d;best=i}}
  if(best<0)best=order[0];
  used.add(best);
  const [a,b,c,opts,rule]=VERB_RAW[best];
  const w=withAnswer(opts,rng);
  return{kind:'verb',a,b,c,options:w.options,answer:w.answer,rule};
}

// ========================= rotazione spaziale =========================
const rotC=(cells)=>norm(cells.map(([x,y])=>[-y,x]));
function norm(cells){const mx=Math.min(...cells.map(c=>c[0])),my=Math.min(...cells.map(c=>c[1]));return cells.map(([x,y])=>[x-mx,y-my]).sort((a,b)=>a[0]-b[0]||a[1]-b[1])}
const key=(cells)=>JSON.stringify(norm(cells));
function tf(f,kind){
  const cells=f.cells;const mark=f.mark;
  const map=kind==='r'?([x,y])=>[-y,x]:([x,y])=>[-x,y];
  const moved=cells.map(map);const mm=mark?map(mark):null;
  const mx=Math.min(...moved.map(c=>c[0])),my=Math.min(...moved.map(c=>c[1]));
  return{cells:moved.map(([x,y])=>[x-mx,y-my]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]),mark:mm?[mm[0]-mx,mm[1]-my]:null};
}
function rotF(f,k){let g=f;for(let i=0;i<k;i++)g=tf(g,'r');return g}
const fkey=(f)=>JSON.stringify([f.cells,f.mark]);
function symsF(f){const out=[];let g=f;for(let i=0;i<4;i++){out.push(g);g=tf(g,'r')}g=tf(f,'m');for(let i=0;i<4;i++){out.push(g);g=tf(g,'r')}return out}
function connected(cells){const s=new Set(cells.map(c=>c.join(',')));const seen=new Set();const st=[cells[0]];while(st.length){const [x,y]=st.pop();const k=x+','+y;if(seen.has(k))continue;seen.add(k);[[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx,dy])=>{if(s.has((x+dx)+','+(y+dy)))st.push([x+dx,y+dy])})}return seen.size===cells.length}
function differentShape(f,rng){
  const syms=symsF(f).map(g=>key(g.cells));
  for(let t=0;t<200;t++){
    const cells=f.cells.map(c=>c.slice());const i=Math.floor(rng()*cells.length);const removed=cells.splice(i,1)[0];
    if(f.mark&&removed[0]===f.mark[0]&&removed[1]===f.mark[1])continue;
    if(!connected(cells))continue;
    const base=pick(cells,rng);const d=pick([[1,0],[-1,0],[0,1],[0,-1]],rng);const nc=[base[0]+d[0],base[1]+d[1]];
    if(cells.some(c=>c[0]===nc[0]&&c[1]===nc[1]))continue;
    cells.push(nc);
    if(syms.includes(key(cells)))continue;
    const mx=Math.min(...cells.map(c=>c[0])),my=Math.min(...cells.map(c=>c[1]));
    return{cells:norm(cells),mark:f.mark?[f.mark[0]-mx,f.mark[1]-my]:null};
  }
  return null;
}
const ROT_RAW=[
  {t:[[0,0],[0,1],[0,2],[1,2]]},
  {t:[[0,0],[0,1],[0,2],[0,3],[1,3]]},
  {t:[[0,0],[1,0],[0,1],[1,1],[0,2]]},
  {t:[[1,0],[1,1],[1,2],[0,2],[0,3]]},
  {t:[[1,0],[2,0],[0,1],[1,1],[1,2]]},
  {t:[[1,0],[0,1],[1,1],[1,2],[1,3]]},
  {t:[[0,0],[1,0],[1,1],[1,2],[2,2],[2,3]]},
  {t:[[0,0],[1,0],[2,0],[2,1],[2,2],[3,2]]},
  {t:[[0,1],[1,1],[1,0],[2,0],[2,1],[2,2],[3,2]]},
  {t:[[0,0],[1,0],[1,1],[1,2],[2,2],[3,2],[3,1],[3,3]]},
  {t:[[0,0],[0,1],[0,2],[1,2]],m:[0,0]},
  {t:[[1,0],[2,0],[0,1],[1,1]],m:[2,0]},
  {t:[[0,0],[1,0],[0,1],[1,1],[0,2]],m:[1,1]},
  {t:[[1,0],[2,0],[0,1],[1,1],[1,2]],m:[2,0]},
  {t:[[1,0],[0,1],[1,1],[1,2],[1,3]],m:[1,3]},
  {t:[[0,0],[1,0],[1,1],[1,2],[2,2],[2,3]],m:[1,1]},
  {t:[[0,0],[1,0],[2,0],[2,1],[2,2],[3,2]],m:[0,0]},
  {t:[[0,1],[1,1],[1,0],[2,0],[2,1],[2,2],[3,2]],m:[2,1]},
  {t:[[0,0],[1,0],[1,1],[1,2],[2,2],[3,2],[3,1],[3,3]],m:[3,1]},
  {t:[[0,0],[0,1],[1,1],[2,1],[2,2],[3,2],[3,3],[4,3],[4,2]],m:[2,1]},
];
// figura casuale connessa di n celle, non simmetrica allo specchio (così la versione riflessa è davvero diversa)
function randomPoly(rng,n){
  for(let t=0;t<200;t++){
    const cells=[[0,0]];const has=(x,y)=>cells.some(c=>c[0]===x&&c[1]===y);
    while(cells.length<n){const b=pick(cells,rng);const d=pick([[1,0],[-1,0],[0,1],[0,-1]],rng);const x=b[0]+d[0],y=b[1]+d[1];if(!has(x,y))cells.push([x,y])}
    const f={cells:norm(cells),mark:null};const w=Math.max(...f.cells.map(c=>c[0]))+1,h=Math.max(...f.cells.map(c=>c[1]))+1;if(w>5||h>5)continue;
    const rots=symsF(f).slice(0,4).map(g=>key(g.cells));if(rots.includes(key(tf(f,'m').cells)))continue;
    return f.cells;
  }
  return ROT_RAW[0].t;
}
function rotItem(rng,level,tries){
  const idx=Math.min(ROT_RAW.length-1,Math.floor(level*ROT_RAW.length));
  // due volte su tre una figura nuova generata a caso (da 4 a 8 celle secondo il livello)
  const it=rng()<0.67?{t:randomPoly(rng,4+Math.min(4,Math.floor(level*5+rng()*1.5)))}:ROT_RAW[idx];
  const mx=Math.min(...it.t.map(c=>c[0])),my=Math.min(...it.t.map(c=>c[1]));
  let f={cells:norm(it.t),mark:it.m?[it.m[0]-mx,it.m[1]-my]:null};
  if(rng()<0.5)f=tf(f,'m'); // la figura di partenza può essere specchiata: più varietà
  const ks=[1+Math.floor(rng()*3),Math.floor(rng()*4),Math.floor(rng()*4),Math.floor(rng()*4)];
  const mir=tf(f,'m');let m2=rotF(mir,ks[2]);if(fkey(m2)===fkey(rotF(mir,ks[1])))m2=rotF(mir,(ks[2]+1)%4);
  const diff=differentShape(f,rng)||mir;
  const opts=[{f:rotF(f,ks[0]),kind:'rot'},{f:rotF(mir,ks[1]),kind:'mirror'},{f:m2,kind:'mirror'},{f:rotF(diff,ks[3]),kind:'diff'}];
  const w=withAnswer(opts,rng);
  const L='ABCD';const mirL=w.options.map((o,k)=>o.kind==='mirror'?L[k]:null).filter(Boolean).join(' e '),dif=w.options.map((o,k)=>o.kind==='diff'?L[k]:null).filter(Boolean).join('');
  const rule=`${L[w.answer]} è la figura ruotata di ${ks[0]*90}°; ${mirL} sono riflesse allo specchio; ${dif} ha una cella spostata`;
  if(new Set(opts.map(o=>fkey(o.f))).size<4&&(tries||0)<6)return rotItem(rng,level,(tries||0)+1);
  return{kind:'rot',target:f,options:w.options,answer:w.answer,marked:!!it.m,rule};
}

// ========================= memoria di lavoro =========================
const MEM_LETTERS='BCDFGHKLMNPRSTVZ';
function memAnswer(type,seq){
  if(type==='back')return seq.slice().reverse().join('');
  if(type==='asc')return seq.slice().sort().join('');
  if(type==='somma')return String(seq.reduce((a,b)=>a+Number(b),0));
  const ds=seq.filter(s=>/\d/.test(s)).sort(),ls=seq.filter(s=>/[A-Z]/.test(s)).sort();return[...ds,...ls].join('');
}
// tipi di prova di memoria con la fascia di difficoltà in cui compaiono (0..1)
const MEM_TYPES=[['back',0,0.55],['asc',0.12,0.7],['manca',0.22,0.85],['pos',0.3,0.9],['somma',0.4,1],['ln',0.5,1]];
const ORD=['','1º','2º','3º','4º','5º','6º','7º','8º','9º'];
// level in [0,1] → tipo scelto tra quelli della fascia e lunghezza crescente (3..9 simboli)
function memItem(rng,level){
  level=Math.max(0,Math.min(1,level));
  let pool=MEM_TYPES.filter(t=>level>=t[1]&&level<=t[2]);if(!pool.length)pool=[MEM_TYPES[0]];
  const type=pick(pool,rng)[0];
  const frac=(t)=>Math.max(0,Math.min(1,(level-t[1])/Math.max(0.01,t[2]-t[1])));
  const T=MEM_TYPES.find(t=>t[0]===type),fr=frac(T);
  const seq=[];let answer,rule,istr,label,inputmode='numeric',maxlen,extra={};
  const digits=(len)=>{let prev=-1;while(seq.length<len){const d=rint(rng,1,9);if(d===prev)continue;seq.push(String(d));prev=d}};
  if(type==='back'){const len=3+Math.min(6,Math.floor(fr*6.5));digits(len);answer=memAnswer(type,seq);maxlen=len;
    istr='Memorizza le cifre: dovrai riscriverle in ordine inverso.';label='Scrivi le cifre in ordine inverso';rule=`i simboli erano ${seq.join(' ')}: al contrario fanno ${answer}`}
  else if(type==='asc'){const len=4+Math.min(5,Math.floor(fr*5.5));const ds=shuffled('123456789'.split(''),rng).slice(0,len);let ok=false;for(let t=0;t<9&&!ok;t++){const m=shuffled(ds,rng);if(m.join('')!==ds.slice().sort().join('')){seq.push(...m);ok=true}}if(!ok)seq.push(...ds.slice().reverse());
    answer=memAnswer(type,seq);maxlen=len;istr='Memorizza le cifre: dovrai riscriverle dalla più piccola alla più grande.';label='Cifre in ordine crescente';rule=`le cifre erano ${seq.join(' ')}: in ordine crescente fanno ${answer}`}
  else if(type==='manca'){const n=5+Math.min(4,Math.floor(fr*4.5));const all=[];for(let i=1;i<=n;i++)all.push(String(i));const miss=pick(all,rng);seq.push(...shuffled(all.filter(x=>x!==miss),rng));
    answer=miss;maxlen=1;extra.n=n;istr=`Vedrai le cifre da 1 a ${n} in ordine sparso, tranne una: dovrai dire quale manca.`;label='Quale cifra mancava?';rule=`sono passate ${seq.join(' ')}: tra 1 e ${n} mancava il ${miss}`}
  else if(type==='pos'){const len=4+Math.min(4,Math.floor(fr*4.5));const nL=Math.floor(len/2);const ls=shuffled(MEM_LETTERS.split(''),rng).slice(0,nL),ds=shuffled('123456789'.split(''),rng).slice(0,len-nL);seq.push(...shuffled([...ls,...ds],rng));
    const k=rint(rng,2,len-1);answer=seq[k-1];maxlen=1;inputmode='text';extra.k=k;istr=`Memorizza i simboli nell'ordine: dovrai dire quale era al ${ORD[k]} posto.`;label=`Il simbolo al ${ORD[k]} posto`;rule=`i simboli erano ${seq.join(' ')}: al ${ORD[k]} posto c'era ${answer}`}
  else if(type==='somma'){const len=3+Math.min(4,Math.floor(fr*4.5));digits(len);answer=memAnswer(type,seq);maxlen=2;
    istr='Memorizza le cifre: dovrai scrivere la loro somma.';label='Somma delle cifre';rule=`le cifre erano ${seq.join(' ')}: ${seq.join(' + ')} = ${answer}`}
  else{const len=4+Math.min(5,Math.floor(fr*5.5));const nL=Math.floor(len/2),nD=len-nL;const ls=shuffled(MEM_LETTERS.split(''),rng).slice(0,nL);const ds=shuffled('123456789'.split(''),rng).slice(0,nD);
    let mix;do{mix=shuffled([...ls,...ds],rng)}while(mix.join('')===memAnswer(type,mix));seq.push(...mix);answer=memAnswer(type,seq);maxlen=len;inputmode='text';
    istr='Memorizza i simboli: dovrai scrivere prima le cifre in ordine crescente, poi le lettere in ordine alfabetico.';label='Prima le cifre in ordine crescente, poi le lettere in ordine alfabetico';rule=`i simboli erano ${seq.join(' ')}: prima le cifre in ordine, poi le lettere in ordine alfabetico: ${answer}`}
  return Object.assign({kind:'mem',type,len:seq.length,seq,answer,rule,istr,label,inputmode,maxlen},extra);
}

// ========================= HTML di un quesito =========================
const LETTERS='ABCDEF';
const esc=(s)=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
// o: {cls(k)→classe extra, dis→bool, tag(k)→html, showAnswer→bool}
function itemHtml(it,o){
  o=o||{};const cls=o.cls||(()=>''),dis=o.dis?'disabled':'',tag=o.tag||(()=>'');
  const opt=(k,inner,fig)=>`<button class="opt ${fig?'fig':''} ${cls(k)}" data-i="${k}" ${dis} aria-label="Opzione ${LETTERS[k]}">${inner}<span class="k">${LETTERS[k]}</span>${tag(k)}</button>`;
  if(it.stim!==undefined){
    const opts=it.options.map((op,k)=>it.fig?opt(k,op,true):`<button class="opt ${cls(k)}" data-i="${k}" ${dis}><span class="k">${LETTERS[k]}</span><span class="v ${it.mono?'mono':''}">${it.raw?op:esc(op)}</span>${tag(k)}</button>`).join('');
    return`<p class="q">${esc(it.q||'')}${it.sub?`<span class="small">${esc(it.sub)}</span>`:''}</p>${it.stim}<div class="opts ${it.fig?'fig':'text'}">${opts}</div>`;
  }
  if(it.kind==='mat'){
    const grid=it.grid.map((c,k)=>k===8?(o.showAnswer?`<div class="cell ans">${cellSVG(it.options[it.answer])}</div>`:`<div class="cell ask">?</div>`):`<div class="cell">${cellSVG(c)}</div>`).join('');
    return`<p class="q">Quale figura completa la griglia?</p><div class="grid3">${grid}</div><div class="opts fig">${it.options.map((op,k)=>opt(k,cellSVG(op),true)).join('')}</div>`;
  }
  if(it.kind==='num'){
    return`<p class="q">Quale numero continua la serie?</p><div class="seq mono">${it.seq.map(n=>`<span>${n}</span>`).join('')}<span class="qm">${o.showAnswer?it.options[it.answer]:'?'}</span></div>
      <div class="opts text">${it.options.map((op,k)=>`<button class="opt ${cls(k)}" data-i="${k}" ${dis}><span class="k">${LETTERS[k]}</span><span class="v mono">${op}</span>${tag(k)}</button>`).join('')}</div>`;
  }
  if(it.kind==='verb'){
    return`<p class="q">Quale parola completa l'analogia?</p><div class="analogy"><span>${esc(it.a)}</span><span class="op">:</span><span>${esc(it.b)}</span><span class="op">=</span><span>${esc(it.c)}</span><span class="op">:</span><span class="qm">${o.showAnswer?esc(it.options[it.answer]):'?'}</span></div>
      <div class="opts text">${it.options.map((op,k)=>`<button class="opt ${cls(k)}" data-i="${k}" ${dis}><span class="k">${LETTERS[k]}</span><span class="v">${esc(op)}</span>${tag(k)}</button>`).join('')}</div>`;
  }
  if(it.kind==='rot'){
    return`<p class="q">Quale alternativa è la stessa figura ruotata (non riflessa)?${it.marked?'<span class="small">Anche il punto bianco deve trovarsi nella cella corrispondente.</span>':''}</p>
      <div class="figbox">${cellsSVG(it.target.cells,it.target.mark)}</div><div class="opts fig">${it.options.map((op,k)=>opt(k,cellsSVG(op.f.cells,op.f.mark),true)).join('')}</div>`;
  }
  return'';
}

// ========================= partita =========================
const KIND_NAME={mat:'Matrice',num:'Serie numerica',verb:'Analogia',rot:'Rotazione'};
// Famiglie di quesiti per area. Ognuna: {id, nome, d:[min,max] fascia di livello in cui compare, w: peso, gen(rng,level,used)}.
// Le famiglie base stanno qui; le altre (famiglie.js) si aggiungono con Quesiti.registra(area, famiglia).
const FAM={mat:[],num:[],verb:[],rot:[],mem:[]};
function registra(area,f){(FAM[area]||(FAM[area]=[])).push(f)}
registra('mat',{id:'matrice',nome:'Matrice',d:[0,1],w:2.2,gen:matrixItem});
registra('num',{id:'serie',nome:'Serie numerica',d:[0,1],w:2.2,gen:numItem});
registra('verb',{id:'analogia',nome:'Analogia',d:[0,1],w:2.2,gen:(rng,l,used)=>verbItem(rng,l,used||new Set())});
registra('rot',{id:'rotazione',nome:'Rotazione',d:[0,1],w:2.2,gen:rotItem});
registra('mem',{id:'memoria',nome:'Memoria',d:[0,1],w:1,gen:memItem});
// sceglie una famiglia adatta al livello (pesata) e genera il quesito; famId forza una famiglia
function genItem(kind,rng,level,used,famId){
  const list=FAM[kind]||FAM.mat;level=Math.max(0,Math.min(1,level||0));
  let pool=list.filter(f=>level>=f.d[0]&&level<=f.d[1]);if(!pool.length)pool=list;
  let f=famId?list.find(x=>x.id===famId):null;
  if(!f){const tot=pool.reduce((s,x)=>s+(x.w||1),0);let r=rng()*tot;f=pool[pool.length-1];for(const x of pool){r-=(x.w||1);if(r<=0){f=x;break}}}
  let it=null;for(let t=0;t<3&&!it;t++){try{it=f.gen(rng,level,used)}catch(e){it=null}}
  if(!it){f=list[0];it=f.gen(rng,level,used)}
  it.kind=kind;it.fam=f.id;it.nome=f.nome;return it;
}
const famiglie=(kind)=>(FAM[kind]||[]).map(f=>({id:f.id,nome:f.nome,d:f.d}));
// Genera n quesiti con il seme dato, alternando i tipi e alzando la difficoltà.
function buildGame(seed,n,kinds){
  const rng=mulberry32(seed);
  const ks=(kinds&&kinds.length?kinds:['mat','num','verb','rot']);
  const order=[];let pool=[];
  for(let i=0;i<n;i++){if(!pool.length)pool=shuffled(ks,rng);order.push(pool.pop())}
  const used=new Set();
  return order.map((k,i)=>{
    const level=n>1?(0.15+0.75*i/(n-1)):0.5;
    return genItem(k,rng,level,used);
  });
}
const KIND_NAME_ALL=Object.assign({mem:'Memoria'},KIND_NAME);
function oneItem(kind,seed,level,used,famId){
  const rng=mulberry32(seed);
  return genItem(kind,rng,level,used||new Set(),famId);
}
// forme per i giochi (poliomini) e coppie di parole per le analogie
const polyShapes=()=>ROT_RAW.map(it=>norm(it.t));
const verbPairs=()=>VERB_RAW.map(([a,b,c,opts])=>({a,b,c,ok:opts[0],bad:opts.slice(1)}));
const tfCells=(cells,kind)=>tf({cells,mark:null},kind).cells;
// spiegazione in frase intera, per tutte le pagine (allenamento, sfide)
function spiegazione(it){
  if(!it)return'';const L='ABCDEF';const ans=it.options?it.options[it.answer]:it.answer;
  if(it.spiega)return it.spiega;
  if(it.stim!==undefined&&it.rule)return`${it.rule.charAt(0).toUpperCase()+it.rule.slice(1)}. La risposta giusta è la ${L[it.answer]}${it.fig?'':` (${ans})`}.`;
  if(it.kind==='num')return`Regola: ${it.rule}. Dopo ${it.seq[it.seq.length-1]} viene quindi ${ans} (risposta ${L[it.answer]}).`;
  if(it.kind==='verb')return`${it.a} e ${it.b}: ${it.rule}. Allo stesso modo ${it.c} va con ${ans} (risposta ${L[it.answer]}).`;
  if(it.kind==='mat')return`Regola della matrice: ${it.rule}. La casella mancante è la ${L[it.answer]}.`;
  if(it.kind==='rot')return`${it.rule.charAt(0).toUpperCase()+it.rule.slice(1)}.`;
  if(it.kind==='mem')return`${it.rule.charAt(0).toUpperCase()+it.rule.slice(1)}: la risposta era ${it.answer}.`;
  return it.rule?`Regola: ${it.rule}.`:'';
}
window.Quesiti={buildGame,oneItem,genItem,registra,famiglie,spiegazione,itemHtml,cellSVG,cellsSVG,drawShape,KIND_NAME:KIND_NAME_ALL,mulberry32,memAnswer,polyShapes,verbPairs,tfCells,SHAPES:SHAPES5,FILLS:FL,
  util:{shuffled,pick,rint,withAnswer,esc,cap,norm,tf,rotF,symsF,connected,randomPoly,differentShape,fkey,key},VREL,SEG,POS,SIZE_MULT};
})();
