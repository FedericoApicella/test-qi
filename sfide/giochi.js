// Giochi veloci e allenamenti seri per area. Ogni voce: {id, area, kind:'gioco'|'serio', name, ic, desc, start(root, ctx)}.
// ctx: {beep(name), floatText(el,txt,cls), shake(el), timer(sec|null), end(result), level(opzionale: livello salvato),
//       diff(opzionale: difficoltà fissa 1–10,99 scelta dal giocatore; assente = Auto, regole normali)}.
// result: {pts, nOk, n, metric, metricLabel, level}
(function(){
'use strict';
const Q=window.Quesiti;
const esc=(s)=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const rnd=(n)=>Math.floor(Math.random()*n);
const pick=(a)=>a[rnd(a.length)];
const shuffle=(a)=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=rnd(i+1);[a[i],a[j]]=[a[j],a[i]]}return a};
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
// con difficoltà fissa: valore in [lo,hi] proporzionale a diff 1–11; senza: def
const byDiff=(ctx,def,lo,hi)=>ctx.diff==null?def:lo+(hi-lo)*Math.min(1,Math.max(0,(ctx.diff-1)/10));
const d01=(ctx,def)=>ctx.diff==null?def:Math.min(1,Math.max(0,(ctx.diff-1)/10));
const SHAPES=Q.SHAPES,FILLS=Q.FILLS;
// cronometro a scadenza con aggiornamento della barra
function countdown(ctx,sec,onEnd){const end=Date.now()+sec*1000;let t=setInterval(()=>{const left=Math.max(0,Math.ceil((end-Date.now())/1000));ctx.timer(left);if(left<=5&&left>0)ctx.beep('tick');if(left<=0){clearInterval(t);onEnd()}},250);ctx.timer(sec);return()=>clearInterval(t)}
const head=(t,sub)=>`<div class="eyebrow">${t}</div>${sub?`<p class="q">${sub}</p>`:''}`;
const choiceBtns=(opts)=>`<div class="opts text">${opts.map((o,k)=>`<button class="opt" data-i="${k}"><span class="v">${o}</span></button>`).join('')}</div>`;

// ========================= 1. Sequenza luminosa (memoria, gioco) =========================
const simon={id:'simon',area:'mem',kind:'gioco',name:'Sequenza luminosa',ic:'💡',desc:'Guarda le caselle che si accendono e ripeti la sequenza. Ogni turno si allunga di una.',
  start(root,ctx){
    let seq=[],pos=0,busy=true,stopped=false,best=0;const startLen=Math.round(byDiff(ctx,1,1,5)),speed=byDiff(ctx,1,1,0.55);
    for(let k=1;k<startLen;k++)seq.push(rnd(9));
    const draw=(msg)=>{root.innerHTML=`${head('💡 Sequenza luminosa · lunghezza '+seq.length,msg)}<div class="simon">${[...Array(9)].map((_,i)=>`<button class="scell" data-c="${i}" aria-label="Casella ${i+1}"></button>`).join('')}</div>`;
      root.querySelectorAll('.scell').forEach(b=>b.addEventListener('click',()=>tap(+b.dataset.c,b)))};
    const light=async(c,ms)=>{const el=root.querySelector(`[data-c="${c}"]`);if(!el)return;el.classList.add('on');ctx.beep('tick');await sleep(ms);el.classList.remove('on');await sleep(120)};
    const play=async()=>{busy=true;seq.push(rnd(9));draw('Guarda…');await sleep(500);for(const c of seq){if(stopped)return;await light(c,Math.max(180,(600-seq.length*30)*speed))}pos=0;busy=false;draw('Tocca le caselle nello stesso ordine.')};
    const tap=async(c,el)=>{if(busy||stopped)return;el.classList.add('on');setTimeout(()=>el.classList.remove('on'),180);
      if(c!==seq[pos]){stopped=true;ctx.beep('bad');ctx.shake(root.querySelector('.simon'));await sleep(600);ctx.end({pts:best*10,nOk:best,n:seq.length,metric:best,metricLabel:'sequenza più lunga'});return}
      pos++;if(pos===seq.length){best=seq.length;ctx.beep('ok');ctx.floatText(el,'+'+seq.length*10);await sleep(500);play()}};
    play();
    return()=>{stopped=true};
  }};

// ========================= 2. Stessa o specchiata? (rotazioni, gioco) =========================
const stessa={id:'stessa',area:'rot',kind:'gioco',name:'Stessa o specchiata?',ic:'🪞',desc:'Due figure: la seconda è la prima ruotata, oppure la sua immagine allo specchio? Decidi in fretta, 45 secondi.',
  start(root,ctx){
    const shapes=Q.polyShapes();let pts=0,nOk=0,n=0,streak=0,cur=null;
    const stop=countdown(ctx,45,()=>finish());
    const finish=()=>{stop();ctx.end({pts,nOk,n,metric:nOk,metricLabel:'risposte giuste'})};
    const next=()=>{const base=pick(shapes);const same=Math.random()<0.5;let other=same?base:Q.tfCells(base,'m');const k=1+rnd(Math.round(byDiff(ctx,3,1,3)))+(ctx.diff!=null&&ctx.diff>=7?1:0);for(let i=0;i<k;i++)other=Q.tfCells(other,'r');cur={same};
      root.innerHTML=`${head('🪞 Stessa o specchiata? · '+nOk+' giuste','La seconda figura è la prima ruotata?')}<div class="pair"><div class="figbox">${Q.cellsSVG(base,null)}</div><div class="figbox">${Q.cellsSVG(other,null)}</div></div>${choiceBtns(['✅ Sì, è ruotata','🪞 No, è specchiata'])}`;
      root.querySelectorAll('.opt').forEach(b=>b.addEventListener('click',()=>answer(+b.dataset.i===0,b)))};
    const answer=(saidSame,el)=>{n++;if(saidSame===cur.same){nOk++;streak++;const p=5+Math.min(5,streak-1);pts+=p;ctx.beep('ok');ctx.floatText(el,'+'+p,streak>=5?'gold':'')}else{streak=0;ctx.beep('bad');ctx.shake(el)}next()};
    next();return stop;
  }};

// ========================= 3. Vero o falso (serie, gioco) =========================
const verofalso={id:'verofalso',area:'num',kind:'gioco',name:'Vero o falso',ic:'🎯',desc:'Una serie e un numero proposto: continua la serie oppure no? 45 secondi di fuoco.',
  start(root,ctx){
    let pts=0,nOk=0,n=0,streak=0,cur=null;
    const stop=countdown(ctx,45,()=>finish());
    const finish=()=>{stop();ctx.end({pts,nOk,n,metric:nOk,metricLabel:'risposte giuste'})};
    const next=()=>{const it=Q.oneItem('num',rnd(2147483647),d01(ctx,Math.random()*0.5));const right=it.options[it.answer];const truth=Math.random()<0.5;const shown=truth?right:pick(it.options.filter(o=>o!==right));cur={truth,right,rule:it.rule};
      root.innerHTML=`${head('🎯 Vero o falso · '+nOk+' giuste','Il numero proposto continua la serie?')}<div class="seq mono">${it.seq.map(x=>`<span>${x}</span>`).join('')}<span class="qm">${shown}</span></div>${choiceBtns(['✅ Vero','❌ Falso'])}`;
      root.querySelectorAll('.opt').forEach(b=>b.addEventListener('click',()=>answer(+b.dataset.i===0,b)))};
    const answer=(said,el)=>{n++;if(said===cur.truth){nOk++;streak++;const p=5+Math.min(5,streak-1);pts+=p;ctx.beep('ok');ctx.floatText(el,'+'+p,streak>=5?'gold':'')}else{streak=0;ctx.beep('bad');ctx.shake(el);ctx.floatText(el,'era '+cur.right,'bad')}next()};
    next();return stop;
  }};

// ========================= 4. Stessa relazione (analogie, gioco) =========================
const relazione={id:'relazione',area:'verb',kind:'gioco',name:'Stessa relazione',ic:'🔗',desc:'Una coppia di parole e due coppie candidate: quale ha la stessa relazione? 45 secondi.',
  start(root,ctx){
    const pairs=Q.verbPairs();let pts=0,nOk=0,n=0,streak=0,cur=null;
    const stop=countdown(ctx,Math.round(byDiff(ctx,45,60,25)),()=>finish());
    const finish=()=>{stop();ctx.end({pts,nOk,n,metric:nOk,metricLabel:'risposte giuste'})};
    const next=()=>{const p=pick(pairs);const good=`${p.c} : ${p.ok}`,bad=`${p.c} : ${pick(p.bad)}`;const okIdx=rnd(2);cur={okIdx};
      root.innerHTML=`${head('🔗 Stessa relazione · '+nOk+' giuste','Quale coppia ha la stessa relazione?')}<div class="analogy"><span>${esc(p.a)}</span><span class="op">:</span><span>${esc(p.b)}</span></div>${choiceBtns(okIdx===0?[esc(good),esc(bad)]:[esc(bad),esc(good)])}`;
      root.querySelectorAll('.opt').forEach(b=>b.addEventListener('click',()=>answer(+b.dataset.i,b)))};
    const answer=(k,el)=>{n++;if(k===cur.okIdx){nOk++;streak++;const p=5+Math.min(5,streak-1);pts+=p;ctx.beep('ok');ctx.floatText(el,'+'+p,streak>=5?'gold':'')}else{streak=0;ctx.beep('bad');ctx.shake(el)}next()};
    next();return stop;
  }};

// ========================= 5. Trova la coppia (matrici, gioco) =========================
const coppia={id:'coppia',area:'mat',kind:'gioco',name:'Trova la coppia',ic:'👀',desc:'Otto figure, due sono identiche: toccale entrambe. Occhio ai dettagli, 45 secondi.',
  start(root,ctx){
    let pts=0,nOk=0,n=0,streak=0,sel=null,cur=null;
    const stop=countdown(ctx,45,()=>finish());
    const finish=()=>{stop();ctx.end({pts,nOk,n,metric:nOk,metricLabel:'coppie trovate'})};
    const spec=(sh,fi,sz,rot)=>({els:[{shape:sh,fill:fi,size:sz,rot:rot}],count:1});
    const next=()=>{const cells=[];const used=new Set();
      const nFig=Math.round(byDiff(ctx,7,5,11));while(cells.length<nFig){const c=spec(pick(SHAPES),pick(FILLS),pick(['s','m','l']),0);const k=JSON.stringify(c);if(used.has(k))continue;used.add(k);cells.push(c)}
      const dup=cells[0];cells.push(dup);const order=shuffle(cells.map((c,i)=>i));cur={cells,order,dup:JSON.stringify(dup)};sel=null;
      root.innerHTML=`${head('👀 Trova la coppia · '+nOk+' trovate','Tocca le due figure identiche.')}<div class="opts fig">${order.map(i=>`<button class="opt fig" data-i="${i}">${Q.cellSVG(cells[i])}</button>`).join('')}</div>`;
      root.querySelectorAll('.opt').forEach(b=>b.addEventListener('click',()=>tap(+b.dataset.i,b)))};
    const tap=(i,el)=>{if(sel===null){sel=i;el.classList.add('sel');return}if(sel===i)return;n++;
      const a=JSON.stringify(cur.cells[sel]),b=JSON.stringify(cur.cells[i]);
      if(a===b){nOk++;streak++;const p=8+Math.min(5,streak-1);pts+=p;ctx.beep('ok');ctx.floatText(el,'+'+p,streak>=5?'gold':'');next()}
      else{streak=0;ctx.beep('bad');ctx.shake(el);root.querySelectorAll('.opt').forEach(x=>x.classList.remove('sel'));sel=null}};
    next();return stop;
  }};

// ========================= 6. N-back (memoria, serio) =========================
const nback={id:'nback',area:'mem',kind:'serio',name:'N-back di posizione',ic:'🧠',desc:'Allenamento classico della memoria di lavoro: un quadrato compare in una delle 9 caselle; premi "Uguale" se la posizione è la stessa di N turni fa. N sale quando vai bene.',
  start(root,ctx){
    const n=Math.max(1,Math.min(5,ctx.level||1));const trials=20+n;const seq=[];let i=-1,hits=0,miss=0,fa=0,targets=0,responded=false,stopped=false,timer=null;
    for(let k=0;k<trials;k++){let v;if(k>=n&&Math.random()<0.3){v=seq[k-n]}else{do{v=rnd(9)}while(k>=n&&v===seq[k-n])}seq.push(v)}
    targets=seq.filter((v,k)=>k>=n&&v===seq[k-n]).length;
    const draw=(active)=>{root.innerHTML=`${head(`🧠 N-back · N = ${n} · turno ${Math.max(0,i+1)} di ${trials}`,`Premi «Uguale» se la posizione è la stessa di ${n} turn${n>1?'i':'o'} fa.`)}<div class="simon nb">${[...Array(9)].map((_,c)=>`<div class="scell ${c===active?'on':''}"></div>`).join('')}</div><div class="actions"><button class="btn primary big" id="nbBtn" ${i<n?'disabled':''}>Uguale (spazio)</button><span class="hint">giuste ${hits} · perse ${miss} · false ${fa}</span></div>`;
      const b=root.querySelector('#nbBtn');if(b)b.addEventListener('click',respond)};
    const respond=()=>{if(responded||i<n||stopped)return;responded=true;const isT=seq[i]===seq[i-n];if(isT){hits++;ctx.beep('ok');ctx.floatText(root.querySelector('#nbBtn'),'+1')}else{fa++;ctx.beep('bad');ctx.shake(root.querySelector('#nbBtn'))}};
    const step=()=>{if(stopped)return;if(i>=n&&!responded&&seq[i]===seq[i-n]){miss++}
      i++;if(i>=trials){finish();return}responded=false;draw(seq[i]);timer=setTimeout(()=>{draw(null);timer=setTimeout(step,1000)},1500)};
    const onKey=(e)=>{if(e.key===' '){e.preventDefault();respond()}};document.addEventListener('keydown',onKey);
    const finish=()=>{stopped=true;document.removeEventListener('keydown',onKey);const acc=targets?Math.round(100*hits/targets):0;const prec=hits+fa?Math.round(100*hits/(hits+fa)):0;const score=Math.round((acc+prec)/2);
      let lv=n;if(acc>=80&&prec>=80)lv=n+1;else if(acc<50||prec<50)lv=Math.max(1,n-1);
      ctx.end({pts:hits*10-fa*3,nOk:hits,n:targets,metric:n,metricLabel:'N raggiunto',level:lv,detail:`bersagli colti ${hits}/${targets} (${acc}%), falsi allarmi ${fa}${lv>n?' · prossima volta N = '+lv:lv<n?' · prossima volta N = '+lv:''}`,score})};
    draw(null);timer=setTimeout(step,800);
    return()=>{stopped=true;clearTimeout(timer);document.removeEventListener('keydown',onKey)};
  }};

// ========================= 7. Rotazione mentale (rotazioni, serio) =========================
const rotm={id:'rotm',area:'rot',kind:'serio',name:'Rotazione mentale',ic:'🔄',desc:'Come nei test classici di Shepard: la figura a destra è la stessa ruotata di un certo angolo, o la sua immagine specchiata? L\'angolo cresce con il tuo livello.',
  start(root,ctx){
    const lv=Math.max(1,Math.min(6,ctx.level||1));const angles=[[45,90],[90,135],[135,180],[45,180],[60,180],[30,180]][lv-1];const trials=16;const shapes=Q.polyShapes();
    let i=0,nOk=0,rts=[],cur=null,at=0;
    const next=()=>{if(i>=trials){finish();return}const base=pick(shapes.slice(Math.min(lv*2,shapes.length-8)));const same=Math.random()<0.5;const ang=(Math.random()<0.5?1:-1)*(angles[0]+rnd(Math.round((angles[1]-angles[0])/15)+1)*15);const other=same?base:Q.tfCells(base,'m');cur={same,ang};at=Date.now();
      root.innerHTML=`${head(`🔄 Rotazione mentale · livello ${lv} · ${i+1} di ${trials}`,'La figura a destra è la stessa ruotata (non specchiata)?')}<div class="pair"><div class="figbox">${Q.cellsSVG(base,null)}</div><div class="figbox">${Q.cellsSVG(other,null,`style="transform:rotate(${ang}deg)"`)}</div></div>${choiceBtns(['✅ Stessa, ruotata','🪞 Specchiata'])}`;
      root.querySelectorAll('.opt').forEach(b=>b.addEventListener('click',()=>answer(+b.dataset.i===0,b)))};
    const answer=(said,el)=>{const rt=Date.now()-at;i++;if(said===cur.same){nOk++;rts.push(rt);ctx.beep('ok');ctx.floatText(el,'+10')}else{ctx.beep('bad');ctx.shake(el)}next()};
    const finish=()=>{const acc=Math.round(100*nOk/trials);const mrt=rts.length?Math.round(rts.reduce((a,b)=>a+b,0)/rts.length/100)/10:null;let nl=lv;if(acc>=85)nl=Math.min(6,lv+1);else if(acc<60)nl=Math.max(1,lv-1);
      ctx.end({pts:nOk*10,nOk,n:trials,metric:lv,metricLabel:'livello (angoli)',level:nl,detail:`${acc}% giuste${mrt?`, tempo medio ${String(mrt).replace('.',',')} s`:''}${nl!==lv?' · prossima volta livello '+nl:''}`,score:acc})};
    next();return()=>{};
  }};


// ========================= 8. Coppie di memoria (memoria, gioco) =========================
const memocards={id:'memocards',area:'mem',kind:'gioco',name:'Coppie nascoste',ic:'🃏',desc:'Dodici carte coperte, sei coppie di figure. Scoprile due alla volta e ricorda dove sono: meno mosse fai, più punti prendi.',
  start(root,ctx){
    const NP=Math.round(byDiff(ctx,6,4,10));const specs=[];const used=new Set();while(specs.length<NP){const c={els:[{shape:pick(SHAPES),fill:pick(FILLS),size:'m',rot:0}],count:1};const k=JSON.stringify(c);if(used.has(k))continue;used.add(k);specs.push(c)}
    const cards=shuffle(specs.concat(specs).map((c,i)=>({c,k:JSON.stringify(c),open:false,done:false})));let first=null,lock=false,moves=0,found=0;const t0=Date.now();
    const draw=()=>{root.innerHTML=`${head('🃏 Coppie nascoste · '+found+' di '+NP+' trovate · '+moves+' mosse','Scopri due carte alla volta e trova le coppie.')}<div class="memo">${cards.map((cd,i)=>`<button class="mcard ${cd.open||cd.done?'open':''} ${cd.done?'done':''}" data-i="${i}" aria-label="Carta ${i+1}">${cd.open||cd.done?Q.cellSVG(cd.c):'<span>?</span>'}</button>`).join('')}</div>`;
      root.querySelectorAll('.mcard').forEach(b=>b.addEventListener('click',()=>flip(+b.dataset.i,b)))};
    const flip=async(i,el)=>{const cd=cards[i];if(lock||cd.open||cd.done)return;cd.open=true;ctx.beep('tick');draw();
      if(first===null){first=i;return}moves++;lock=true;const a=cards[first];
      if(a.k===cd.k){a.done=cd.done=true;found++;ctx.beep('ok');ctx.floatText(root.querySelector(`[data-i="${i}"]`),'+10');first=null;lock=false;draw();if(found===NP){const sec=Math.round((Date.now()-t0)/1000);const pts=Math.max(10,20*NP-moves*4-Math.floor(sec/5));await sleep(400);ctx.end({pts,nOk:NP,n:moves,metric:pts,metricLabel:'punti',detail:`${moves} mosse in ${sec} s`})}}
      else{await sleep(700);a.open=cd.open=false;first=null;lock=false;ctx.beep('bad');draw()}};
    draw();return()=>{};
  }};

// ========================= 9. Ordina i numeri (serie, gioco) =========================
const ordina={id:'ordina',area:'num',kind:'gioco',name:'Ordina i numeri',ic:'🔢',desc:'Nove numeri sparsi: toccali dal più piccolo al più grande, più in fretta che puoi. Tre tabelle, poi il conto.',
  start(root,ctx){
    let round=0,pts=0,errors=0,t0=Date.now(),cur=null,next=0;const ROUNDS=3;
    const gen=()=>{let kind=round===0?'int':round===1?'big':'mix';if(ctx.diff!=null)kind=ctx.diff<4?'int':ctx.diff<7?(round===0?'int':'big'):(round===0?'big':'mix');const set=new Set();while(set.size<9){set.add(kind==='int'?rnd(50)+1:kind==='big'?rnd(900)+100:(rnd(2)?-(rnd(40)+1):rnd(40)+1))}const vals=shuffle([...set]);cur={vals,sorted:vals.slice().sort((a,b)=>a-b)};next=0;t0=Date.now()};
    const draw=()=>{root.innerHTML=`${head(`🔢 Ordina i numeri · tabella ${round+1} di ${ROUNDS}`,'Tocca i numeri dal più piccolo al più grande.')}<div class="numgrid">${cur.vals.map((v,i)=>`<button class="ncell ${i<0?'':''}" data-i="${i}" ${cur.sorted.indexOf(v)<next?'disabled':''}>${v}</button>`).join('')}</div>`;
      root.querySelectorAll('.ncell').forEach(b=>b.addEventListener('click',()=>tap(+b.dataset.i,b)))};
    const tap=(i,el)=>{const v=cur.vals[i];if(v===cur.sorted[next]){next++;ctx.beep('tick');el.disabled=true;el.classList.add('done');
        if(next===9){const sec=(Date.now()-t0)/1000;const p=Math.max(5,Math.round(60-sec*2));pts+=p;ctx.beep('ok');ctx.floatText(el,'+'+p);round++;if(round>=ROUNDS){ctx.end({pts,nOk:ROUNDS*9-errors,n:ROUNDS*9,metric:pts,metricLabel:'punti',detail:`${errors} errori`});return}gen();setTimeout(draw,400)}}
      else{errors++;pts=Math.max(0,pts-3);ctx.beep('bad');ctx.shake(el)}};
    gen();draw();return()=>{};
  }};

// ========================= 10. Anagramma (analogie, gioco) =========================
const anagramma={id:'anagramma',area:'verb',kind:'gioco',name:'Anagramma lampo',ic:'🔤',desc:'Lettere mescolate: quale delle tre parole è quella nascosta? 45 secondi.',
  start(root,ctx){
    const minL=Math.round(byDiff(ctx,5,4,7)),maxL=Math.round(byDiff(ctx,10,6,12));const words=[...new Set(Q.verbPairs().flatMap(p=>[p.a,p.b,p.c,p.ok].filter(w=>w.length>=minL&&w.length<=maxL&&!/\s/.test(w))))];
    let pts=0,nOk=0,n=0,streak=0,cur=null;
    const stop=countdown(ctx,45,()=>finish());const finish=()=>{stop();ctx.end({pts,nOk,n,metric:nOk,metricLabel:'parole trovate'})};
    const next=()=>{const w=pick(words);let scr;do{scr=shuffle(w.split('')).join('')}while(scr===w);const others=shuffle(words.filter(x=>x!==w&&Math.abs(x.length-w.length)<=1)).slice(0,2);const opts=shuffle([w,...others]);cur={w};
      root.innerHTML=`${head('🔤 Anagramma lampo · '+nOk+' trovate','Quale parola si nasconde qui?')}<div class="seq mono" style="letter-spacing:.2em">${esc(scr.toUpperCase())}</div>${choiceBtns(opts.map(esc))}`;
      root.querySelectorAll('.opt').forEach(b=>b.addEventListener('click',()=>answer(opts[+b.dataset.i],b)))};
    const answer=(w,el)=>{n++;if(w===cur.w){nOk++;streak++;const p=5+Math.min(5,streak-1);pts+=p;ctx.beep('ok');ctx.floatText(el,'+'+p,streak>=5?'gold':'')}else{streak=0;ctx.beep('bad');ctx.shake(el);ctx.floatText(el,'era '+cur.w,'bad')}next()};
    next();return stop;
  }};

const CSS=`
.simon{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;max-width:330px;width:100%}
.scell{aspect-ratio:1;border-radius:14px;border:2px solid var(--border);background:var(--surface);cursor:pointer;transition:background .12s,transform .12s;box-shadow:var(--shadow)}
.scell.on{background:var(--grad);border-color:var(--brand);transform:scale(1.05)}
.simon.nb .scell{cursor:default}
.pair{display:flex;gap:16px;flex-wrap:wrap;align-items:center}
.pair .figbox svg{width:130px;height:130px}
.memo{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;max-width:400px;width:100%}
.mcard{aspect-ratio:1;border-radius:12px;border:2px solid var(--border);background:var(--grad);cursor:pointer;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:1.4rem;padding:6px;box-shadow:var(--shadow)}
.mcard.open{background:var(--surface);color:var(--fg)}
.mcard.done{border-color:var(--ok);background:var(--ok-soft);opacity:.85}
.mcard svg{width:100%;height:100%}
.numgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;max-width:360px;width:100%}
.ncell{aspect-ratio:1.2;border-radius:14px;border:2px solid var(--border);background:var(--surface);font-family:var(--font-mono);font-size:1.5rem;font-weight:600;cursor:pointer;box-shadow:var(--shadow)}
.ncell:disabled,.ncell.done{opacity:.25;cursor:default}
`;
const st=document.createElement('style');st.textContent=CSS;document.head.appendChild(st);
window.Giochi=[simon,stessa,verofalso,relazione,coppia,memocards,ordina,anagramma,nback,rotm];
})();
