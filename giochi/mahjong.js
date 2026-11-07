// Mahjong solitario a livelli infiniti: disposizioni a più piani generate da un seme, sempre risolvibili
// (le coppie vengono assegnate "a ritroso" simulando una partita vinta), più tessere e più facce
// man mano che si sale di livello. Aiuto, mescola, annulla.
(function(){
'use strict';
const G=window.Giochi,FX=window.Effetti,$=(s)=>document.querySelector(s);
const GAME='mahjong';
let P=G.load();
const T3=window.Tessere;const FACCE=T3.FACCE;
const UX=23,UY=30,TD=12; // mezza tessera in px (una tessera occupa 2×2 unità), spessore di una tessera (altezza di un piano)

// ---- disposizione (posizioni x,y in mezze tessere, z piano) ----
function maschera(tipo,w,h){ // insiemi di tessere al piano 0, in coordinate tessera (intere)
  const out=[];const cx=(w-1)/2,cy=(h-1)/2;
  for(let i=0;i<w;i++)for(let j=0;j<h;j++){
    let ok=true;
    if(tipo==='croce')ok=Math.abs(i-cx)<=Math.max(1,w/4.5)||Math.abs(j-cy)<=Math.max(1,h/3.2);
    else if(tipo==='rombo')ok=Math.abs(i-cx)/(w/2+.5)+Math.abs(j-cy)/(h/2+.5)<=1;
    else if(tipo==='farfalla')ok=!(Math.abs(i-cx)<=w*0.12&&Math.abs(j-cy)>h*0.2)&&!(Math.abs(i-cx)>w*0.3&&Math.abs(j-cy)<=h*0.12&&w>5);
    else if(tipo==='anello')ok=!(Math.abs(i-cx)<=Math.max(0.6,w/5)&&Math.abs(j-cy)<=Math.max(0.6,h/5)&&w>=5&&h>=4);
    if(ok)out.push([i*2,j*2]);
  }
  return out;
}
function layout(level){
  const d=G.d01(G.diffOf(level,P.imp));
  const target=Math.round((24+120*d)/2)*2;
  const r=G.rng('mahjong:'+level);
  const tipi=['rett','piramide','croce','rombo','farfalla','anello'];
  const tipo=level<=2?'rett':r.pick(tipi);
  const maxZ=target<40?2:target<70?3:target<110?4:5;
  let base=Math.max(8,Math.round(target*(target<=30?1:tipo==='anello'?0.7:target<48?0.72:0.55)));
  let h=Math.max(2,Math.round(Math.sqrt(base/1.5)));let w=Math.max(3,Math.round(base/h));
  if(tipo==='croce'||tipo==='anello'){w+=1;h+=1}
  let tiles=[];const m=(tipo==='rett'||tipo==='piramide')?maschera('rett',w,h):maschera(tipo,w,h);
  for(const [x,y] of m)tiles.push({x,y,z:0});
  if(tiles.length>target)tiles=centro(tiles,target);
  // piani superiori: tessere a cavallo di quattro tessere del piano sotto (o allineate), dal centro
  let z=0;
  while(tiles.length<target&&z<maxZ-1){
    const sotto=tiles.filter(t=>t.z===z);const set=new Set(sotto.map(t=>t.x+','+t.y));
    const offset=(z%2===0)?1:0; // alterna piani sfalsati e allineati
    const cand=[];
    for(const t of sotto){const x=t.x+offset,y=t.y+offset;if(cand.some(c=>c.x===x&&c.y===y))continue;
      if(offset){if(set.has((t.x+2)+','+t.y)&&set.has(t.x+','+(t.y+2))&&set.has((t.x+2)+','+(t.y+2)))cand.push({x,y,z:z+1})}else cand.push({x,y,z:z+1})}
    if(!cand.length)break;
    const need=target-tiles.length;let agg=cand.length<=need?cand:centro(cand,need);
    if(agg.length===cand.length&&cand.length>need-0)agg=centro(cand,Math.min(cand.length,need));
    // un piano che copre tutto il piano sotto sarebbe noioso: lascia almeno un bordo
    if(agg.length===sotto.length&&agg.length>4)agg=centro(agg,Math.max(2,Math.round(agg.length*0.6)/2*2));
    tiles=tiles.concat(agg);z++;
  }
  // ali laterali al piano 0 finché manca qualcosa
  if(tiles.length<target){const ys=tiles.filter(t=>t.z===0).map(t=>t.y);const my=Math.round((Math.min(...ys)+Math.max(...ys))/2);const yy=my%2?my-1:my;
    let left=Math.min(...tiles.map(t=>t.x)),right=Math.max(...tiles.map(t=>t.x));
    while(tiles.length<target){left-=2;right+=2;tiles.push({x:left,y:yy+1,z:0},{x:right,y:yy+1,z:0})}}
  if(tiles.length%2)tiles.pop();
  // normalizza coordinate
  const minX=Math.min(...tiles.map(t=>t.x)),minY=Math.min(...tiles.map(t=>t.y));
  tiles.forEach(t=>{t.x-=minX;t.y-=minY});
  tiles.sort((a,b)=>a.z-b.z||a.y-b.y||a.x-b.x);
  return{tiles,r,tipo};
}
function centro(arr,n){ // toglie le tessere più lontane dal centro (a coppie simmetriche) finché ne restano n
  let s=arr.slice();const cx=s.reduce((a,t)=>a+t.x,0)/s.length,cy=s.reduce((a,t)=>a+t.y,0)/s.length;
  const dist=(t)=>Math.hypot(t.x-cx,(t.y-cy)*1.3);
  while(s.length>n){s.sort((a,b)=>dist(a)-dist(b));const far=s[s.length-1];const mir=s.find(t=>t!==far&&Math.abs(t.x-(2*cx-far.x))<0.5&&Math.abs(t.y-(2*cy-far.y))<0.5);s=s.filter(t=>t!==far&&t!==mir)}
  if(s.length%2)s.pop();return s}

// relazioni fra tessere
const sovrapposte=(a,b)=>Math.abs(a.x-b.x)<2&&Math.abs(a.y-b.y)<2;
function relazioni(tiles){
  tiles.forEach((t,i)=>{t.i=i;t.sopra=[];t.sotto=[];t.sx=[];t.dx=[]});
  for(const a of tiles)for(const b of tiles){if(a===b)continue;
    if(b.z===a.z+1&&sovrapposte(a,b))a.sopra.push(b.i);
    if(b.z===a.z-1&&sovrapposte(a,b))a.sotto.push(b.i);
    if(b.z===a.z&&b.x===a.x-2&&Math.abs(b.y-a.y)<2)a.sx.push(b.i);
    if(b.z===a.z&&b.x===a.x+2&&Math.abs(b.y-a.y)<2)a.dx.push(b.i)}
}
const libera=(t,vivo)=>!t.sopra.some(i=>vivo[i])&&(!t.sx.some(i=>vivo[i])||!t.dx.some(i=>vivo[i]));

// assegna le facce simulando una partita vinta: dalla disposizione piena si tolgono a caso
// due tessere libere alla volta e si dà loro la stessa faccia, finché il tavolo è vuoto.
// Così la sequenza di mosse appena simulata è una soluzione garantita.
function assegna(tiles,quali,r,nFacce){
  const facce=r.shuffle(FACCE.slice()).slice(0,nFacce);
  const nPairs=quali.length/2;const seq=[];for(let k=0;k<nPairs;k++)seq.push(facce[k%facce.length]);r.shuffle(seq);
  for(let tent=0;tent<50;tent++){
    const vivo=tiles.map(()=>false);quali.forEach(i=>vivo[i]=true);let k=0,ok=true;
    while(k<nPairs){
      const free=quali.filter(i=>vivo[i]&&libera(tiles[i],vivo));
      if(free.length<2){ok=false;break}
      const a=r.pick(free),b=r.pick(free.filter(i=>i!==a));
      tiles[a].f=seq[k];tiles[b].f=seq[k];vivo[a]=false;vivo[b]=false;k++;
    }
    if(ok)return true;
  }
  quali.forEach((i,k)=>{tiles[i].f=seq[k>>1]});return false;
}

// ---- stato ----
let S=null;
function nuovo(level,ripresa){
  const {tiles,r,tipo}=layout(level);relazioni(tiles);
  const d=G.d01(G.diffOf(level,P.imp));
  const nFacce=Math.max(4,Math.min(FACCE.length,Math.round(tiles.length/4*(0.6+0.5*d))));
  const costruito=assegna(tiles,tiles.map(t=>t.i),G.rng("mahjong-facce:"+level),nFacce);
  S={level,tiles,vivo:tiles.map(()=>true),slots:[null,null,null],sel:-1,selSlot:-1,hints:0,shuffles:0,storia:[],done:false,elapsed:0,r,costruito};
  const c=P[GAME].corso;
  if(ripresa&&c&&c.level===level&&c.vivo&&c.vivo.length===tiles.length&&c.facce&&c.facce.length===tiles.length&&c.facce.every(f=>FACCE.includes(f))){S.vivo=c.vivo;c.facce.forEach((f,i)=>tiles[i].f=f);if(c.slots&&c.slots.length===3)S.slots=c.slots.map(v=>v==null?null:v);S.hints=c.hints||0;S.shuffles=c.shuffles||0;S.elapsed=c.elapsed||0}
  location.hash='liv='+level;
  G.applySkin(P);G.intestazione(P,GAME,level,`${tiles.length} tessere · ${nFacce} simboli`);
  G.timerStart($('#barTimer'),S.elapsed);
  render(true);FX.beep('start');msg('');
}
function salvaCorso(){if(!S||S.done)return;P=G.load();P[GAME].corso={level:S.level,vivo:S.vivo,slots:S.slots,facce:S.tiles.map(t=>t.f),hints:S.hints,shuffles:S.shuffles,elapsed:G.timerElapsed()};G.save(P)}

function render(full){
  const box=$('#board');const W=Math.max(...S.tiles.map(t=>t.x))+2,H=Math.max(...S.tiles.map(t=>t.y))+2;
  const lw=W*UX,lh=H*UY;
  if(full){
    box.innerHTML=S.tiles.map(t=>`<div class="t" data-i="${t.i}" style="transform:translate3d(${t.x*UX}px,${t.y*UY}px,${t.z*TD}px)"><div class="t3"><div class="side sb"></div><div class="side sr"></div><div class="side sl"></div><div class="face"><span class="f" title="${T3.nome(t.f)}">${T3.svg(t.f)}</span></div></div></div>`).join('');
    box.style.width=lw+'px';box.style.height=lh+'px';
  }
  const wrap=$('#boardWrap');
  if(full){box.style.setProperty('--scale',Math.min(1.5,((wrap.clientWidth||320)-16)/(lw+TD*2)));box.style.setProperty('--dx','0px');box.style.setProperty('--dy','0px')}
  S.tiles.forEach(t=>{const el=box.children[t.i];if(!el)return;const v=S.vivo[t.i];el.classList.toggle('gone',!v);el.classList.toggle('blocked',v&&!libera(t,S.vivo));el.classList.toggle('sel',t.i===S.sel);if(full)el.querySelector('.f').innerHTML=T3.svg(t.f)});
  // tavolo inclinato in 3D: si misura il rettangolo proiettato delle tessere e si adattano scala e posizione (due passate)
  if(full){const fit=(pass)=>{const r0=wrap.getBoundingClientRect();const availW=r0.width-12;const anchor=$('#slots').getBoundingClientRect().bottom+8;let top=1e9,bot=-1e9,left=1e9,right=-1e9;
      for(const el of box.children){const r=el.getBoundingClientRect();top=Math.min(top,r.top);bot=Math.max(bot,r.bottom);left=Math.min(left,r.left);right=Math.max(right,r.right)}
      if(bot<=top)return;const pw=right-left;let sc=parseFloat(box.style.getPropertyValue('--scale'))||1;
      if(pw>availW){sc=sc*availW/pw*0.985;box.style.setProperty('--scale',sc);if(pass<3)return requestAnimationFrame(()=>fit(pass+1))}
      const dx=(r0.left+r0.width/2)-(left+right)/2,dy=anchor-top;
      box.style.setProperty('--dx',(parseFloat(box.style.getPropertyValue('--dx'))||0)+dx+'px');box.style.setProperty('--dy',(parseFloat(box.style.getPropertyValue('--dy'))||0)+dy+'px');
      wrap.style.height=Math.ceil(bot+dy-r0.top+18)+'px';if(pass<3)requestAnimationFrame(()=>fit(pass+1))};
    requestAnimationFrame(()=>fit(0))}
  renderSlots();
  const rest=S.vivo.filter(Boolean).length+S.slots.filter(v=>v!=null).length;$('#restN').textContent=rest;$('#hintN').textContent=S.hints;$('#shufN').textContent=S.shuffles;$('#bUndo').disabled=!S.storia.length;
}
function renderSlots(){
  const box=$('#slots');box.innerHTML=S.slots.map((v,k)=>`<button class="mj-slot ${v==null?'empty':''} ${S.selSlot===k?'sel':''}" data-k="${k}" aria-label="${v==null?'posto libero':T3.nome(S.tiles[v].f)}">${v==null?'<span class="plus">+</span>':`<span class="f">${T3.svg(S.tiles[v].f)}</span>`}</button>`).join('');
}
function mosse(){const out=[];const free=S.tiles.filter(t=>S.vivo[t.i]&&libera(t,S.vivo));for(let i=0;i<free.length;i++)for(let j=i+1;j<free.length;j++)if(free[i].f===free[j].f)out.push([free[i].i,free[j].i]);return out}
function mosseSlot(){const out=[];const free=S.tiles.filter(t=>S.vivo[t.i]&&libera(t,S.vivo));S.slots.forEach((v,k)=>{if(v==null)return;for(const t of free)if(t.f===S.tiles[v].f)out.push([t.i,k])});return out}
const bloccato=()=>!mosse().length&&!mosseSlot().length&&!S.slots.some(v=>v==null);
function snap(){S.storia.push({vivo:S.vivo.slice(),slots:S.slots.slice()})}
function dopoMossa(el){
  S.sel=-1;S.selSlot=-1;FX.beep('ok');msg('');render();salvaCorso();if(el)FX.floatText(el,'+1','good');
  if(!S.vivo.some(Boolean)&&!S.slots.some(v=>v!=null)){fine();return}
  if(bloccato()){msg('Nessuna mossa possibile: puoi mescolare le tessere (🔀) o annullare (↩️).','bad');FX.beep('lose')}
}
function tocca(i){
  if(S.done||!S.vivo[i])return;const t=S.tiles[i];
  if(!libera(t,S.vivo)){const el=$('#board').children[i];el.classList.remove('nope');void el.offsetWidth;el.classList.add('nope');FX.beep('tick');msg('Questa tessera è bloccata: deve avere un lato libero e niente sopra.');return}
  if(S.sel===i){S.sel=-1;render();return}
  if(S.selSlot>=0&&S.tiles[S.slots[S.selSlot]].f===t.f){ // abbinamento con una tessera parcheggiata
    snap();S.vivo[i]=false;S.slots[S.selSlot]=null;dopoMossa($('#board').children[i]);return}
  if(S.sel>=0&&S.tiles[S.sel].f===t.f){
    snap();const a=S.sel;S.vivo[a]=false;S.vivo[i]=false;dopoMossa($('#board').children[i]);return}
  if(S.sel>=0||S.selSlot>=0)FX.beep('tick');
  S.sel=i;S.selSlot=-1;render();
}
function toccaSlot(k){
  if(S.done)return;const v=S.slots[k];
  if(v==null){
    if(S.sel<0){msg('Scegli prima una tessera libera sul tavolo, poi toccala qui per parcheggiarla.');FX.beep('tick');return}
    snap();const i=S.sel;S.vivo[i]=false;S.slots[k]=i;
    const gem=S.slots.findIndex((w,j)=>j!==k&&w!=null&&S.tiles[w].f===S.tiles[i].f);
    if(gem>=0){S.slots[k]=null;S.slots[gem]=null;dopoMossa($('#slots').children[k]);msg('Coppia fatta dal parcheggio!','ok');return}
    S.sel=-1;S.selSlot=-1;FX.beep('tick');msg('Tessera parcheggiata: si abbina da sola quando ne arriva una uguale.');render();salvaCorso();
    if(bloccato()){msg('Nessuna mossa possibile: puoi mescolare le tessere (🔀) o annullare (↩️).','bad');FX.beep('lose')}
    return}
  if(S.sel>=0&&S.tiles[S.sel].f===S.tiles[v].f){snap();S.vivo[S.sel]=false;S.slots[k]=null;dopoMossa($('#slots').children[k]);return}
  if(S.selSlot===k){ // secondo tocco: torna sul tavolo
    snap();S.vivo[v]=true;S.slots[k]=null;S.selSlot=-1;FX.beep('tick');msg('Tessera rimessa sul tavolo.');render();salvaCorso();return}
  S.selSlot=k;S.sel=-1;FX.beep('tick');msg('Tocca la sua gemella libera sul tavolo, oppure toccala di nuovo per rimetterla a posto.');render();
}
function annulla(){if(!S.storia.length||S.done)return;const s=S.storia.pop();S.vivo=s.vivo;S.slots=s.slots;S.sel=-1;S.selSlot=-1;msg('');render();salvaCorso()}
function suggerimento(){if(S.done)return;const m=mosse();const ms=mosseSlot();if(!m.length&&!ms.length){msg(S.slots.some(v=>v==null)?'Nessuna coppia libera: parcheggia una tessera in alto per liberarne altre.':'Non ci sono mosse: mescola le tessere.','bad');return}
  S.hints++;S.sel=-1;S.selSlot=-1;render();
  if(m.length){const [a,b]=m[Math.floor(Math.random()*m.length)];[a,b].forEach(i=>{const el=$('#board').children[i];el.classList.remove('hint');void el.offsetWidth;el.classList.add('hint')})}
  else{const [i,k]=ms[0];const el=$('#board').children[i];el.classList.add('hint');$('#slots').children[k].classList.add('hint')}
  FX.beep('tick');msg('Ecco una coppia. Ogni aiuto costa una stella.')}
function mescola(){if(S.done)return;S.slots.forEach((v,k)=>{if(v!=null){S.vivo[v]=true;S.slots[k]=null}});const quali=S.tiles.filter(t=>S.vivo[t.i]).map(t=>t.i);if(quali.length<4){msg('Troppo poche tessere per mescolare.');return}
  const facce=new Set(quali.map(i=>S.tiles[i].f));
  // riassegna le facce alle tessere rimaste, di nuovo in modo risolvibile
  const r=G.rng('mescola:'+S.level+':'+S.shuffles+':'+Date.now());const ok=assegna(S.tiles,quali,r,facce.size);
  if(ok){ // assegna() pesca facce dall'elenco intero: rimappa sulle facce che c'erano
    const nuove=[...new Set(quali.map(i=>S.tiles[i].f))];const vecchie=[...facce];const mappa={};nuove.forEach((f,k)=>mappa[f]=vecchie[k%vecchie.length]);quali.forEach(i=>S.tiles[i].f=mappa[S.tiles[i].f])}
  S.shuffles++;S.sel=-1;S.selSlot=-1;S.storia=[];render(true);FX.beep('level');msg('Tessere mescolate: adesso una soluzione c’è di sicuro.');salvaCorso()}
function fine(){S.done=true;const ms=G.timerStop();delete P[GAME].corso;const stelle=Math.max(1,3-(S.hints>0?1:0)-(S.shuffles>0?1:0));
  setTimeout(()=>G.vittoria(P,GAME,S.level,stelle,ms,{next:(L)=>nuovo(L),nota:S.hints||S.shuffles?`${S.hints} aiuti · ${S.shuffles} mescolate`:'senza aiuti'}),400)}
function msg(t,cls){const m=$('#msg');m.textContent=t;m.className='g-msg '+(cls||'')}
function aiuto(){G.aiuto('Come si gioca a Mahjong',`<ul>
  <li>Togli tutte le tessere a <b>coppie uguali</b>.</li>
  <li>Si può prendere solo una tessera <b>libera</b>: senza niente sopra e con almeno un lato (destro o sinistro) scoperto. Le tessere bloccate sono più scure.</li>
  <li>Tocca una tessera, poi la sua gemella. Tocca di nuovo la stessa per deselezionarla.</li>
  <li><b>I tre posti in alto</b> sono un parcheggio: scegli una tessera libera e toccane uno per metterla lì, così liberi quelle sotto. Quando una tessera uguale arriva nel parcheggio (o la tocchi sul tavolo dopo aver scelto quella parcheggiata) la coppia sparisce. Tocca due volte una tessera parcheggiata per rimetterla sul tavolo.</li>
  <li><b>💡 Aiuto</b> mostra una coppia possibile, <b>🔀 Mescola</b> rimescola le tessere rimaste (sempre in modo risolvibile), <b>↩️ Annulla</b> rimette l’ultima coppia.</li>
  <li>Tre stelle: senza aiuti e senza mescolare. Ogni disposizione è costruita in modo che una soluzione esista.</li>
  <li>Salendo di livello le disposizioni crescono: più tessere, più piani e più simboli diversi.</li></ul>`)}

$('#board').addEventListener('click',e=>{const t=e.target.closest('.t');if(t)tocca(+t.dataset.i)});
$('#slots').addEventListener('click',e=>{const s=e.target.closest('.mj-slot');if(s)toccaSlot(+s.dataset.k)});
$('#bHint').addEventListener('click',suggerimento);$('#bShuf').addEventListener('click',mescola);$('#bUndo').addEventListener('click',annulla);
let rz=null;window.addEventListener('resize',()=>{clearTimeout(rz);rz=setTimeout(()=>{if(S)render(true)},150)});
G.bottoniComuni(()=>P,GAME,{vai:(L)=>nuovo(L,true),ricarica:()=>{const d=G.diffOf(S.level,P.imp);P=G.load();if(G.diffOf(S.level,P.imp)!==d){delete P[GAME].corso;G.save(P);nuovo(S.level);return}G.applySkin(P);G.intestazione(P,GAME,S.level,`${S.tiles.length} tessere`)},aiuto});
G.onSync=()=>{P=G.load();G.applySkin(P)};
$('#barSound').innerHTML=FX.soundButtonHtml();FX.bindSoundButton();
window.addEventListener('beforeunload',salvaCorso);
nuovo(G.livelloDaUrl(P,GAME),true);
window.Mahjong={get S(){return S},get P(){return P},nuovo,tocca,toccaSlot,mosse,layout,libera};
})();
