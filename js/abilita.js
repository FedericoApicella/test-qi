// Abilità di gioco: il "grafico mutevole" del sito (NON è il QI).
// Sei abilità alimentate da giochi, allenamenti, storia, sfide e parole crociate.
// Punteggio = forza (cresce per sempre con i punti totali) + forma (gli ultimi 7 giorni: sale se giochi, scende se ti fermi).
// Dati in localStorage, chiave testqi.abilita (sincronizzata dall'account se presente).
(function(){
'use strict';
const KEY='testqi.abilita';
const SKILLS=[
  {id:'logica',nome:'Logica',ic:'🧩',desc:'Matrici, serie, deduzioni e cruciverba classici.'},
  {id:'creativita',nome:'Creatività',ic:'💡',desc:'Pensiero divergente: trovare la parola nascosta, collegare indizi lontani.'},
  {id:'memoria',nome:'Memoria',ic:'🧠',desc:'Sequenze da ricordare, memoria lampo, n-back.'},
  {id:'velocita',nome:'Velocità',ic:'⚡',desc:'Sprint, calcolo lampo, risposte sotto pressione.'},
  {id:'attenzione',nome:'Attenzione',ic:'🎯',desc:'Intrusi, Stroop, conta le forme, boss della storia.'},
  {id:'parole',nome:'Parole',ic:'📚',desc:'Vocabolario, definizioni, analogie verbali.'}
];
const FONTI={parole:{nome:'Parole crociate',url:'parole/',ic:'🔤'},allenamento:{nome:'Allenamento',url:'sfide/allenamento.html',ic:'🏋️'},storia:{nome:'Modalità storia',url:'storia/',ic:'🗺️'},sfide:{nome:'Sfide',url:'sfide/',ic:'⚔️'},test:{nome:'Test del QI',url:'test.html',ic:'🧪'},missioni:{nome:'Missioni',url:'abilita/',ic:'🎁'}};
const load=(k,d)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}};
const save=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
const pad=(n)=>String(n).padStart(2,'0');
const dayKey=(d)=>{d=d||new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())};
const addDays=(key,n)=>{const [y,m,d]=key.split('-').map(Number);const t=new Date(y,m-1,d+n);return dayKey(t)};
function fresh(){return{xp:{},tot:0,giorni:{},serie:{n:0,best:0,ultimo:null},visti:null,bonus:{}}}
let P=null;
function loadP(){P=Object.assign(fresh(),load(KEY,{}));SKILLS.forEach(s=>{if(!P.xp[s.id])P.xp[s.id]=0});return P}
const saveP=()=>save(KEY,P);
// ---------- formule ----------
const forza=(xp)=>60*Math.sqrt(Math.max(0,xp)/100);
function formaAl(skill,key){let f=0;for(let i=0;i<7;i++){const g=P.giorni[addDays(key,-i)];if(g&&g.per&&g.per[skill])f+=g.per[skill]*(1-i/8)}return Math.min(100,f/4)}
function xpFinoA(skill,key){let x=0;for(const k in P.giorni){if(k<=key){const g=P.giorni[k];x+=(g.per&&g.per[skill])||0}}return x}
function punteggio(skill,key){key=key||dayKey();return Math.round(forza(xpFinoA(skill,key))+formaAl(skill,key))}
const livelloAbilita=(p)=>Math.floor(p/50)+1;
const livello=(tot)=>Math.floor(Math.sqrt(Math.max(0,tot)/50))+1;
const xpPerLivello=(l)=>50*(l-1)*(l-1);
const obiettivo=()=>{const l=livello(P.tot);return 50+5*Math.min(30,l-1)};
// ---------- registrazione ----------
function registra(fonte,punti,opts){
  if(!P)loadP();
  const key=dayKey();const g=P.giorni[key]||(P.giorni[key]={xp:0,per:{},fonti:{}});
  let tot=0;for(const s in punti){const v=Math.max(0,Math.round(punti[s]||0));if(!v||!SKILLS.some(x=>x.id===s))continue;P.xp[s]=(P.xp[s]||0)+v;g.per[s]=(g.per[s]||0)+v;tot+=v}
  P.tot+=tot;g.xp+=tot;g.fonti[fonte]=(g.fonti[fonte]||0)+tot;
  // serie di giorni con obiettivo raggiunto
  const ob=obiettivo();
  if(g.xp>=ob&&P.serie.ultimo!==key){const ieri=addDays(key,-1);P.serie.n=(P.serie.ultimo===ieri)?P.serie.n+1:1;P.serie.ultimo=key;P.serie.best=Math.max(P.serie.best,P.serie.n)}
  // ripulisci giorni vecchissimi (teniamo 400 giorni: la forza usa il totale, la forma solo 7 giorni)
  const keys=Object.keys(P.giorni).sort();if(keys.length>400){keys.slice(0,keys.length-400).forEach(k=>{P.giorni[k].per={};delete P.giorni[k]})}
  // missione del giorno: tre fonti diverse → bonus
  const nf=Object.keys(g.fonti).filter(f=>f!=='missioni'&&g.fonti[f]>0).length;
  if(nf>=3&&!P.bonus[key]){P.bonus[key]=1;const b=g.fonti.missioni=(g.fonti.missioni||0)+40;P.xp.creativita+=40;g.per.creativita=(g.per.creativita||0)+40;P.tot+=40;g.xp+=40;if(window.Effetti)window.Effetti.beep('level')}
  saveP();
  try{window.dispatchEvent(new CustomEvent('testqi:abilita',{detail:{fonte,punti:tot}}))}catch(e){}
  return tot;
}
// ---------- importazione dagli altri giochi (contatori già salvati dalle altre pagine) ----------
const AREA_MAP={mat:{logica:3,attenzione:1},num:{logica:2,velocita:2},verb:{parole:3,creativita:1},mem:{memoria:4},rot:{logica:2,attenzione:2}};
function contatori(){
  const all=load('testqi.allenamento',null),st=load('testqi.storia',null),sf=load('testqi.sfide',{}),ris=load('testqi.risultati',[]);
  const c={allen:{},sprint:all?(all.sprintN||0):0,storiaXp:st?(st.xp||0):0,storiaStelle:st?Object.values(st.stars||{}).reduce((a,b)=>a+b,0):0,sfide:Object.values(sf).reduce((n,r)=>n+(r.v||0)+(r.p||0)+(r.x||0),0),test:ris.length};
  if(all&&all.aree)for(const a in all.aree)c.allen[a]=all.aree[a].done||0;
  return c;
}
function importa(){
  if(!P)loadP();
  const c=contatori();
  if(!P.visti){P.visti=c;saveP();return 0}  // primo avvio: si parte da qui, niente punti retroattivi
  const v=P.visti;let tot=0;
  const p={};const add=(s,n)=>{p[s]=(p[s]||0)+n};
  for(const a in c.allen){const d=c.allen[a]-(v.allen&&v.allen[a]||0);if(d>0){const m=AREA_MAP[a]||{logica:4};for(const s in m)add(s,d*m[s])}}
  if(Object.keys(p).length)tot+=registra('allenamento',p);
  const ds=c.sprint-(v.sprint||0);if(ds>0)tot+=registra('allenamento',{velocita:15*ds,attenzione:5*ds});
  const dx=c.storiaXp-(v.storiaXp||0),dst=c.storiaStelle-(v.storiaStelle||0);
  if(dx>0||dst>0){const u=Math.round(dx/6)+dst*8;tot+=registra('storia',{logica:Math.round(u*.4),attenzione:Math.round(u*.3),velocita:Math.round(u*.2),memoria:Math.round(u*.1)})}
  const df=c.sfide-(v.sfide||0);if(df>0)tot+=registra('sfide',{velocita:12*df,logica:10*df,attenzione:4*df});
  const dt=c.test-(v.test||0);if(dt>0)tot+=registra('test',{logica:60*dt,memoria:20*dt,parole:20*dt,attenzione:20*dt});
  P.visti=c;saveP();return tot;
}
// ---------- stato per le pagine ----------
function stato(){
  if(!P)loadP();
  const key=dayKey();const g=P.giorni[key]||{xp:0,per:{},fonti:{}};
  const punteggi={};SKILLS.forEach(s=>punteggi[s.id]=punteggio(s.id,key));
  const totale=Math.round(Object.values(punteggi).reduce((a,b)=>a+b,0)/SKILLS.length);
  const l=livello(P.tot);
  // serie: se ieri non è stato raggiunto l'obiettivo e oggi nemmeno, la serie mostrata è 0 (ma best resta)
  let serie=P.serie.n;if(P.serie.ultimo&&P.serie.ultimo!==key&&P.serie.ultimo!==addDays(key,-1))serie=0;
  return{punteggi,totale,livello:l,xp:P.tot,xpLivello:P.tot-xpPerLivello(l),xpProssimo:xpPerLivello(l+1)-xpPerLivello(l),oggi:g.xp,obiettivo:obiettivo(),fontiOggi:g.fonti||{},serie,serieBest:P.serie.best,bonusOggi:!!P.bonus[key],giorni:P.giorni,oggiKey:key};
}
// serie storica: punteggio medio e per abilità negli ultimi n giorni
function storico(n){if(!P)loadP();const out=[];const k0=dayKey();for(let i=n-1;i>=0;i--){const k=addDays(k0,-i);const p={};SKILLS.forEach(s=>p[s.id]=punteggio(s.id,k));out.push({g:k,p,tot:Math.round(Object.values(p).reduce((a,b)=>a+b,0)/SKILLS.length),xp:(P.giorni[k]||{}).xp||0})}return out}
// ---------- grafici (SVG, nessuna libreria) ----------
function radarHtml(punteggi,maxV){
  const n=SKILLS.length,cx=200,cy=190,R=130;const ang=(i)=>-Math.PI/2+i*2*Math.PI/n;
  const mx=Math.max(maxV||0,100,...SKILLS.map(s=>punteggi[s.id]||0));const scale=(v)=>Math.max(.05,v/mx);
  const pt=(i,r)=>`${(cx+R*r*Math.cos(ang(i))).toFixed(1)},${(cy+R*r*Math.sin(ang(i))).toFixed(1)}`;
  const rings=[.25,.5,.75,1].map(r=>`<polygon class="grid" points="${SKILLS.map((_,i)=>pt(i,r)).join(' ')}"/>`).join('');
  const axes=SKILLS.map((_,i)=>{const [x,y]=pt(i,1).split(',');return`<line class="axis" x1="${cx}" y1="${cy}" x2="${x}" y2="${y}"/>`}).join('');
  const labs=SKILLS.map((s,i)=>{const [x,y]=pt(i,1.24).split(',');return`<text class="lab" x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle">${s.ic} ${s.nome}</text>`}).join('');
  const poly=`<polygon class="area1" points="${SKILLS.map((s,i)=>pt(i,scale(punteggi[s.id]||0))).join(' ')}"/>`;
  const dots=SKILLS.map((s,i)=>{const [x,y]=pt(i,scale(punteggi[s.id]||0)).split(',');return`<circle cx="${x}" cy="${y}" r="4" fill="var(--brand)"/>`}).join('');
  return`<svg class="radar" viewBox="0 0 400 380" role="img" aria-label="Abilità di gioco">${rings}${axes}${poly}${dots}${labs}</svg>`;
}
function lineaHtml(serie,campo){
  const W=600,H=160,pl=34,pr=10,pt=12,pb=24;const vals=serie.map(x=>x[campo]);const mx=Math.max(10,...vals),mn=0;
  const X=(i)=>pl+(W-pl-pr)*i/Math.max(1,serie.length-1),Y=(v)=>pt+(H-pt-pb)*(1-(v-mn)/(mx-mn));
  const path=serie.map((x,i)=>(i?'L':'M')+X(i).toFixed(1)+' '+Y(x[campo]).toFixed(1)).join(' ');
  const area=path+` L${X(serie.length-1).toFixed(1)} ${Y(0)} L${X(0).toFixed(1)} ${Y(0)} Z`;
  const ticks=[0,.5,1].map(f=>{const v=Math.round(mn+(mx-mn)*f);return`<text x="${pl-6}" y="${Y(v)+4}" text-anchor="end">${v}</text><line x1="${pl}" x2="${W-pr}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--border)"/>`}).join('');
  const labs=serie.map((x,i)=>(i%Math.ceil(serie.length/6)===0||i===serie.length-1)?`<text x="${X(i)}" y="${H-6}" text-anchor="middle">${x.g.slice(8)}/${x.g.slice(5,7)}</text>`:'').join('');
  const last=serie[serie.length-1];
  return`<svg class="chart linea" viewBox="0 0 ${W} ${H}" role="img" aria-label="Andamento">${ticks}<path d="${area}" fill="rgba(124,58,237,.12)"/><path d="${path}" fill="none" stroke="var(--brand)" stroke-width="2.5" stroke-linejoin="round"/><circle cx="${X(serie.length-1)}" cy="${Y(last[campo])}" r="4" fill="var(--brand)"/>${labs}</svg>`;
}
// ---------- widget compatto (per la home e le altre pagine) ----------
function widgetHtml(base){
  const s=stato();base=base||'';
  const bars=SKILLS.map(k=>`<div class="ab-row"><span>${k.ic} ${k.nome}</span><span class="ab-track"><i style="width:${Math.min(100,s.punteggi[k.id]/6)}%"></i></span><b class="mono">${s.punteggi[k.id]}</b></div>`).join('');
  const pct=Math.min(100,Math.round(100*s.oggi/s.obiettivo));
  return`<div class="ab-widget"><div class="ab-top"><div><div class="eyebrow">Abilità di gioco · livello ${s.livello}</div><div class="ab-big">${s.totale} <small>punti</small></div></div><div class="ab-day"><div class="ab-ring" style="--p:${pct}"><span>${pct}%</span></div><small>obiettivo di oggi<br>${s.oggi}/${s.obiettivo}${s.serie?` · 🔥 ${s.serie} g.`:''}</small></div></div>${bars}<a class="btn" href="${base}abilita/">Vedi il grafico completo →</a></div>`;
}
const CSS=`
.ab-widget{display:grid;gap:8px}
.ab-top{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
.ab-big{font-size:2rem;font-weight:800;line-height:1.1}.ab-big small{font-size:.9rem;color:var(--muted);font-weight:600}
.ab-day{display:flex;align-items:center;gap:10px;color:var(--muted);font-size:.8rem;text-align:left}
.ab-ring{--p:0;width:56px;height:56px;border-radius:50%;background:conic-gradient(var(--brand) calc(var(--p)*1%),var(--border) 0);display:grid;place-items:center;flex:none}
.ab-ring span{width:42px;height:42px;border-radius:50%;background:var(--surface);display:grid;place-items:center;font-family:var(--font-mono);font-size:.8rem;font-weight:600;color:var(--brand)}
.ab-row{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;font-size:.95rem}
.ab-track{height:10px;background:var(--border);border-radius:5px;overflow:hidden}
.ab-track>i{display:block;height:100%;border-radius:5px;background:var(--grad);transition:width .6s}
`;
const st=document.createElement('style');st.textContent=CSS;document.head.appendChild(st);
loadP();
window.addEventListener('testqi:account',()=>{loadP();importa()});
window.Abilita={SKILLS,FONTI,registra,importa,stato,storico,punteggio,livello,livelloAbilita,radarHtml,lineaHtml,widgetHtml,dayKey,reload:loadP};
// importa subito i progressi fatti negli altri giochi
try{importa()}catch(e){}
})();
