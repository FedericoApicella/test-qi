// Mini-giochi semplici e veloci per la modalità storia: intruso, conta le forme, memoria lampo,
// colore della parola, calcolo lampo, il più grande. Tutti generati da un seme (stesso seme → stesso gioco).
// Ogni gioco restituisce {kind, prompt, options:[html], answer, rule, ...} e si disegna con miniHtml().
(function(){
'use strict';
const {cellSVG,mulberry32}=window.Quesiti;
function shuffled(arr,rng){const a=arr.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
const pick=(arr,rng)=>arr[Math.floor(rng()*arr.length)];
const rint=(rng,lo,hi)=>lo+Math.floor(rng()*(hi-lo+1));
const esc=(s)=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function withAnswer(options,rng){const perm=shuffled(options.map((_,i)=>i),rng);return{options:perm.map(i=>options[i]),answer:perm.indexOf(0)}}
const LETTERS='ABCDEFGH';

const SHAPES=['circle','square','triangle','diamond','pent','hex'];
const SHAPE_IT={circle:'cerchi',square:'quadrati',triangle:'triangoli',diamond:'rombi',pent:'pentagoni',hex:'esagoni'};
const SHAPE_IT1={circle:'un cerchio',square:'un quadrato',triangle:'un triangolo',diamond:'un rombo',pent:'un pentagono',hex:'un esagono'};
const FILL_IT={none:'vuoto',half:'a metà',full:'pieno'};
const SIZE_IT={s:'piccolo',m:'medio',l:'grande'};

// ---------- intruso: tutte le figure uguali tranne una ----------
function oddItem(rng,level){
  const n=level<0.25?4:level<0.6?6:8;
  const base={shape:pick(SHAPES,rng),fill:pick(['none','half','full'],rng),size:'m',rot:0};
  const attrs=level<0.3?['shape']:level<0.6?['shape','fill']:['shape','fill','size','rot'];
  const attr=pick(attrs,rng);
  const odd=Object.assign({},base);
  if(attr==='shape')odd.shape=pick(SHAPES.filter(s=>s!==base.shape),rng);
  else if(attr==='fill')odd.fill=pick(['none','half','full'].filter(f=>f!==base.fill),rng);
  else if(attr==='size'){base.size=pick(['s','l'],rng);odd.size=base.size==='s'?'l':'s'}
  else{if(base.shape==='circle')base.shape='triangle';odd.rot=base.shape==='square'||base.shape==='diamond'?45:pick([90,180],rng)}
  const cells=Array.from({length:n},()=>base);cells[0]=odd;
  const w=withAnswer(cells,rng);
  const desc=attr==='shape'?`tutte le figure erano ${SHAPE_IT[base.shape]}, tranne ${SHAPE_IT1[odd.shape]}`:attr==='fill'?`tutte erano ${FILL_IT[base.fill]}e, una era ${FILL_IT[odd.fill]}`:attr==='size'?`una era ${SIZE_IT[odd.size]}, le altre ${SIZE_IT[base.size]}`:'una figura era ruotata rispetto alle altre';
  return{kind:'odd',prompt:'Trova l\'intruso!',options:w.options.map(c=>cellSVG({els:[c]})),answer:w.answer,fig:true,cols:n>4?4:4,rule:`${LETTERS[w.answer]} era l'intruso: ${desc}`};
}

// ---------- conta le forme ----------
const DRAW={
  circle:(x,y,r)=>`<circle cx="${x}" cy="${y}" r="${r}"/>`,
  square:(x,y,r)=>`<rect x="${x-r}" y="${y-r}" width="${2*r}" height="${2*r}" rx="2"/>`,
  triangle:(x,y,r)=>`<polygon points="${x},${y-r} ${x+r*0.95},${y+r*0.72} ${x-r*0.95},${y+r*0.72}"/>`,
  diamond:(x,y,r)=>`<polygon points="${x},${y-r} ${x+r},${y} ${x},${y+r} ${x-r},${y}"/>`,
};
const COLS=['#7c3aed','#db2777','#0891b2','#ea580c'];
function countItem(rng,level){
  const kinds=shuffled(['circle','square','triangle','diamond'],rng).slice(0,level<0.3?2:3);
  const total=level<0.25?rint(rng,5,7):level<0.6?rint(rng,8,11):rint(rng,12,15);
  const target=kinds[0];
  const tn=Math.max(2,Math.min(total-2,rint(rng,2,Math.max(2,Math.floor(total*0.55)))));
  const list=[];for(let i=0;i<total;i++)list.push(i<tn?target:pick(kinds.slice(1),rng));
  const arr=shuffled(list,rng);
  // posizioni su una griglia 5×3 con piccolo scarto, così non si sovrappongono
  const slots=shuffled(Array.from({length:15},(_,i)=>i),rng).slice(0,total);
  const sameColor=level>0.5; // oltre un certo livello i colori non aiutano più
  const svg=`<svg viewBox="0 0 250 150" class="countsvg" aria-hidden="true">${arr.map((s,i)=>{const sl=slots[i];const x=25+(sl%5)*50+rint(rng,-8,8),y=25+Math.floor(sl/5)*50+rint(rng,-8,8);const col=sameColor?'currentColor':COLS[kinds.indexOf(s)];return`<g fill="${col}">${DRAW[s](x,y,level<0.6?15:12)}</g>`}).join('')}</svg>`;
  const opts=[tn];const cands=shuffled([tn-1,tn+1,tn-2,tn+2,tn+3],rng);for(const c of cands){if(c>0&&!opts.includes(c))opts.push(c);if(opts.length===4)break}
  const w=withAnswer(opts,rng);
  return{kind:'count',prompt:`Quanti ${SHAPE_IT[target]} vedi?`,figure:svg,options:w.options.map(String),answer:w.answer,rule:`i ${SHAPE_IT[target]} erano ${tn}`};
}

// ---------- memoria lampo: ricorda i simboli mostrati ----------
const EMO=['🍎','🐸','🚀','🎈','🐙','🌵','🎸','🧁','🦊','⚽','🍕','🐝','🌈','🎩','🐬','🍓','🧩','🦄','🍩','🐧','🎁','🌻','🦋','🍉'];
function flashItem(rng,level){
  const k=level<0.2?2:level<0.45?3:level<0.7?4:5;
  const pool=shuffled(EMO,rng);
  const shown=pool.slice(0,k),others=pool.slice(k,k+3);
  const not=level>=0.35&&rng()<0.5; // "quale NON c'era?"
  const opts=not?[others[0],...shown.slice(0,3)]:[pick(shown,rng),...others];
  const w=withAnswer(opts,rng);
  return{kind:'flash',prompt:not?'Quale NON c\'era?':'Quale c\'era?',reveal:shown,revealMs:900+450*k,options:w.options,answer:w.answer,big:true,rule:`i simboli erano ${shown.join(' ')}`};
}

// ---------- colore della parola (effetto Stroop) ----------
const COLORI=[['ROSSO','#e11d48'],['VERDE','#16a34a'],['BLU','#2563eb'],['GIALLO','#ca8a04'],['VIOLA','#7c3aed'],['ARANCIO','#ea580c']];
function stroopItem(rng,level){
  const n=level<0.4?4:6;const set=COLORI.slice(0,n);
  const word=pick(set,rng);let ink=pick(set.filter(c=>c!==word),rng);
  if(level<0.15&&rng()<0.5)ink=word; // all'inizio a volte parola e colore coincidono
  const askInk=level<0.3||rng()<0.6;
  const right=askInk?ink:word;
  const opts=[right,...shuffled(set.filter(c=>c!==right),rng).slice(0,3)];
  const w=withAnswer(opts,rng);
  return{kind:'stroop',prompt:askInk?'Di che <b>colore</b> è scritta la parola?':'Che cosa <b>dice</b> la parola?',figure:`<div class="stroop" style="color:${ink[1]}">${word[0]}</div>`,options:w.options.map(c=>c[0]),answer:w.answer,rule:askInk?`la parola era scritta in ${ink[0].toLowerCase()}`:`la parola diceva ${word[0]}`};
}

// ---------- calcolo lampo ----------
function sumItem(rng,level){
  let txt,val;
  if(level<0.2){const a=rint(rng,1,9),b=rint(rng,1,9);txt=`${a} + ${b}`;val=a+b}
  else if(level<0.4){const a=rint(rng,5,20),b=rint(rng,1,a);txt=rng()<0.5?`${a} − ${b}`:`${a} + ${b}`;val=txt.includes('−')?a-b:a+b}
  else if(level<0.65){const a=rint(rng,2,9),b=rint(rng,2,9);txt=`${a} × ${b}`;val=a*b}
  else if(level<0.85){const a=rint(rng,16,40),b=rint(rng,2,15),c=rint(rng,1,9);txt=`${a} − ${b} + ${c}`;val=a-b+c}
  else{const a=rint(rng,3,12),b=rint(rng,3,12);const c=rint(rng,1,Math.min(20,a*b-1));txt=`${a} × ${b} − ${c}`;val=a*b-c}
  const opts=[val];const cands=shuffled([val+1,val-1,val+2,val-2,val+10,val-10,val+3],rng);for(const c of cands){if(c>=0&&!opts.includes(c))opts.push(c);if(opts.length===4)break}
  for(let k=4;opts.length<4;k++){const c=val+k;if(!opts.includes(c))opts.push(c)}
  const w=withAnswer(opts,rng);
  return{kind:'sum',prompt:'Quanto fa?',figure:`<div class="bigexpr mono">${txt} = ?</div>`,options:w.options.map(String),answer:w.answer,rule:`${txt} = ${val}`};
}

// ---------- il più grande ----------
function bigItem(rng,level){
  const n=level<0.3?3:4;const vals=new Set();const items=[];
  while(items.length<n){
    let txt,v;
    if(level<0.3){v=rint(rng,1,50);txt=String(v)}
    else if(level<0.6){const a=rint(rng,2,9),b=rint(rng,2,9);const op=pick(['+','×','−'],rng);v=op==='+'?a+b:op==='×'?a*b:Math.abs(a-b);txt=`${Math.max(a,b)} ${op} ${Math.min(a,b)}`;if(op==='+')txt=`${a} + ${b}`;if(op==='×')txt=`${a} × ${b}`}
    else{const a=rint(rng,2,12),b=rint(rng,2,12),c=rint(rng,1,9);const f=pick([[`${a} × ${b} − ${c}`,a*b-c],[`${a} × ${b} + ${c}`,a*b+c],[`${a+b} × ${c}`,(a+b)*c],[`${a*c} + ${b}`,a*c+b]],rng);txt=f[0];v=f[1]}
    if(vals.has(v))continue;vals.add(v);items.push({txt,v});
  }
  const best=items.reduce((m,x)=>x.v>m.v?x:m,items[0]);
  const answer=items.indexOf(best);
  return{kind:'big',prompt:'Qual è il più grande?',options:items.map(x=>x.txt),answer,rule:`${best.txt} vale ${best.v}, più degli altri`};
}

const GENS={odd:oddItem,count:countItem,flash:flashItem,stroop:stroopItem,sum:sumItem,big:bigItem};
const NAMES={odd:'Intruso',count:'Conta le forme',flash:'Memoria lampo',stroop:'Colore della parola',sum:'Calcolo lampo',big:'Il più grande'};
const KINDS=Object.keys(GENS);
function oneMini(kind,seed,level){return GENS[kind](mulberry32(seed),Math.max(0,Math.min(1,level)))}

// o: {cls(k), dis, phase:'show'|'ask'}
function miniHtml(it,o){
  o=o||{};const cls=o.cls||(()=>''),dis=o.dis?'disabled':'';
  const opts=it.options.map((op,k)=>`<button class="opt ${it.fig?'fig':''} ${it.big?'bigopt':''} ${cls(k)}" data-i="${k}" ${dis} aria-label="Opzione ${LETTERS[k]}">${it.fig||it.kind==='stroop'||it.kind==='flash'?op:`<span class="k">${LETTERS[k]}</span><span class="v ${it.kind==='sum'||it.kind==='count'||it.kind==='big'?'mono':''}">${esc(op)}</span>`}${it.fig?`<span class="k">${LETTERS[k]}</span>`:''}</button>`).join('');
  if(it.kind==='flash'&&o.phase==='show')return`<p class="q">Guarda bene e ricorda!</p><div class="flashbox" id="flashBox">${it.reveal.map(e=>`<span>${e}</span>`).join('')}</div>`;
  return`<p class="q">${it.prompt}</p>${it.figure?`<div class="figwrap">${it.figure}</div>`:''}<div class="opts ${it.fig?'fig':it.big?'emoji':'text'}">${opts}</div>`;
}
window.MiniGiochi={oneMini,miniHtml,KINDS,NAMES};
})();
