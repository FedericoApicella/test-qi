// Giochi veloci e allenamenti seri per area. Ogni voce: {id, area, kind:'gioco'|'serio', name, ic, desc, start(root, ctx)}.
// ctx: {beep(name), floatText(el,txt,cls), shake(el), timer(sec|null), end(result), level(opzionale: livello salvato)}.
// result: {pts, nOk, n, metric, metricLabel, level}
(function(){
'use strict';
const Q=window.Quesiti;
const esc=(s)=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const rnd=(n)=>Math.floor(Math.random()*n);
const pick=(a)=>a[rnd(a.length)];
const shuffle=(a)=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=rnd(i+1);[a[i],a[j]]=[a[j],a[i]]}return a};
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const SHAPES=Q.SHAPES,FILLS=Q.FILLS;
// cronometro a scadenza con aggiornamento della barra
function countdown(ctx,sec,onEnd){const end=Date.now()+sec*1000;let t=setInterval(()=>{const left=Math.max(0,Math.ceil((end-Date.now())/1000));ctx.timer(left);if(left<=5&&left>0)ctx.beep('tick');if(left<=0){clearInterval(t);onEnd()}},250);ctx.timer(sec);return()=>clearInterval(t)}
const head=(t,sub)=>`<div class="eyebrow">${t}</div>${sub?`<p class="q">${sub}</p>`:''}`;
const choiceBtns=(opts)=>`<div class="opts text">${opts.map((o,k)=>`<button class="opt" data-i="${k}"><span class="v">${o}</span></button>`).join('')}</div>`;

// ========================= 1. Sequenza luminosa (memoria, gioco) =========================
const simon={id:'simon',area:'mem',kind:'gioco',name:'Sequenza luminosa',ic:'💡',desc:'Guarda le caselle che si accendono e ripeti la sequenza. Ogni turno si allunga di una.',
  start(root,ctx){
    let seq=[],pos=0,busy=true,stopped=false,best=0;
    const draw=(msg)=>{root.innerHTML=`${head('💡 Sequenza luminosa · lunghezza '+seq.length,msg)}<div class="simon">${[...Array(9)].map((_,i)=>`<button class="scell" data-c="${i}" aria-label="Casella ${i+1}"></button>`).join('')}</div>`;
      root.querySelectorAll('.scell').forEach(b=>b.addEventListener('click',()=>tap(+b.dataset.c,b)))};
    const light=async(c,ms)=>{const el=root.querySelector(`[data-c="${c}"]`);if(!el)return;el.classList.add('on');ctx.beep('tick');await sleep(ms);el.classList.remove('on');await sleep(120)};
    const play=async()=>{busy=true;seq.push(rnd(9));draw('Guarda…');await sleep(500);for(const c of seq){if(stopped)return;await light(c,Math.max(250,600-seq.length*30))}pos=0;busy=false;draw('Tocca le caselle nello stesso ordine.')};
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
    const next=()=>{const base=pick(shapes);const same=Math.random()<0.5;let other=same?base:Q.tfCells(base,'m');const k=1+rnd(3);for(let i=0;i<k;i++)other=Q.tfCells(other,'r');cur={same};
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
    const next=()=>{const it=Q.oneItem('num',rnd(2147483647),Math.random()*0.5);const right=it.options[it.answer];const truth=Math.random()<0.5;const shown=truth?right:pick(it.options.filter(o=>o!==right));cur={truth,right,rule:it.rule};
      root.innerHTML=`${head('🎯 Vero o falso · '+nOk+' giuste','Il numero proposto continua la serie?')}<div class="seq mono">${it.seq.map(x=>`<span>${x}</span>`).join('')}<span class="qm">${shown}</span></div>${choiceBtns(['✅ Vero','❌ Falso'])}`;
      root.querySelectorAll('.opt').forEach(b=>b.addEventListener('click',()=>answer(+b.dataset.i===0,b)))};
    const answer=(said,el)=>{n++;if(said===cur.truth){nOk++;streak++;const p=5+Math.min(5,streak-1);pts+=p;ctx.beep('ok');ctx.floatText(el,'+'+p,streak>=5?'gold':'')}else{streak=0;ctx.beep('bad');ctx.shake(el);ctx.floatText(el,'era '+cur.right,'bad')}next()};
    next();return stop;
  }};

// ========================= 4. Stessa relazione (analogie, gioco) =========================
const relazione={id:'relazione',area:'verb',kind:'gioco',name:'Stessa relazione',ic:'🔗',desc:'Una coppia di parole e due coppie candidate: quale ha la stessa relazione? 45 secondi.',
  start(root,ctx){
    const pairs=Q.verbPairs();let pts=0,nOk=0,n=0,streak=0,cur=null;
    const stop=countdown(ctx,45,()=>finish());
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
      while(cells.length<7){const c=spec(pick(SHAPES),pick(FILLS),pick(['s','m','l']),0);const k=JSON.stringify(c);if(used.has(k))continue;used.add(k);cells.push(c)}
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

const CSS=`
.simon{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;max-width:330px;width:100%}
.scell{aspect-ratio:1;border-radius:14px;border:2px solid var(--border);background:var(--surface);cursor:pointer;transition:background .12s,transform .12s;box-shadow:var(--shadow)}
.scell.on{background:var(--grad);border-color:var(--brand);transform:scale(1.05)}
.simon.nb .scell{cursor:default}
.pair{display:flex;gap:16px;flex-wrap:wrap;align-items:center}
.pair .figbox svg{width:130px;height:130px}
`;
const st=document.createElement('style');st.textContent=CSS;document.head.appendChild(st);
window.Giochi=[simon,stessa,verofalso,relazione,coppia,nback,rotm];
})();
