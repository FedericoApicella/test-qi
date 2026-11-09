// Partite classificate: punteggio (stile Elo), leghe con divisioni, stagioni mensili.
// Solo logica e salvataggio, nessuna grafica: la usano sfide/ (ricerca avversario, esito) e chi vuole mostrare la lega
// (es. il season pass). Salvataggio in localStorage "testqi.ranked" (sincronizzato dall'account come gli altri testqi.*).
// API: Classificate.leggi() → stato della stagione in corso · lega(punti) → {id,nome,ic,div,txt,min,max,pct}
//      stagione() → {id:'2026-11',nome:'Novembre 2026',giorniAllaFine} · avvia(opp) · chiudi(esito) · annulla()
// A ogni partita chiusa parte l'evento window 'testqi:classificata' con {stagione,esito,delta,punti,lega,promosso,retrocesso}.
(function(){
'use strict';
const KEY='testqi.ranked';
const INIZIO=1000,MIN=600,K_NUOVO=40,K=28,NUOVE=10;
const LEGHE=[
  {id:'bronzo',nome:'Bronzo',ic:'🥉',min:0},
  {id:'argento',nome:'Argento',ic:'🥈',min:1100},
  {id:'oro',nome:'Oro',ic:'🥇',min:1250},
  {id:'platino',nome:'Platino',ic:'💠',min:1400},
  {id:'diamante',nome:'Diamante',ic:'💎',min:1550},
  {id:'maestro',nome:'Maestro',ic:'👑',min:1700},
];
const MESI=['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
function stagione(now){const d=now?new Date(now):new Date();const id=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
  const fine=new Date(d.getFullYear(),d.getMonth()+1,1);return{id,nome:MESI[d.getMonth()]+' '+d.getFullYear(),fine:+fine,giorniAllaFine:Math.max(0,Math.ceil((fine-d)/86400000))}}
function lega(p){
  p=Math.round(p);let i=LEGHE.length-1;while(i>0&&p<LEGHE[i].min)i--;const L=LEGHE[i];
  if(L.id==='maestro')return{...L,div:'',txt:L.nome,pct:100,prossima:null};
  // Bronzo parte da 950 per le divisioni (sotto resta Bronzo III)
  const lo=i===0?950:L.min,hi=LEGHE[i+1].min,passo=(hi-lo)/3;const k=Math.max(0,Math.min(2,Math.floor((p-lo)/passo)));
  const div=['III','II','I'][k];const a=lo+passo*k,b=a+passo;
  return{...L,div,txt:L.nome+' '+div,pct:Math.max(0,Math.min(100,Math.round((p-a)/(b-a)*100))),prossima:k<2?L.nome+' '+['II','I'][k]:LEGHE[i+1].nome,mancano:Math.max(1,Math.ceil(b-p))};
}
const ordine=(p)=>{let i=LEGHE.length-1;while(i>0&&p<LEGHE[i].min)i--;return i*3+(LEGHE[i].id==='maestro'?0:['III','II','I'].indexOf(lega(p).div))};
function load(){try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch(e){return null}}
function save(o){try{localStorage.setItem(KEY,JSON.stringify(o))}catch(e){}}
// stato della stagione corrente; al cambio di mese archivia la vecchia e riparte a metà strada verso 1000
function leggi(){
  const s=stagione();let o=load();
  if(!o||typeof o!=='object')o={stagione:s.id,punti:INIZIO,partite:0,vinte:0,perse:0,pari:0,serie:0,max:INIZIO,storia:[],inCorso:null};
  if(o.stagione!==s.id){
    // partita rimasta a metà nella stagione vecchia: conta come persa (già applicata)
    o.storia=(o.storia||[]).concat([{stagione:o.stagione,punti:Math.round(o.punti),max:Math.round(o.max||o.punti),lega:lega(o.max||o.punti).txt,partite:o.partite,vinte:o.vinte}]).slice(-24);
    const p=Math.round(INIZIO+(o.punti-INIZIO)*0.5);
    o={stagione:s.id,punti:p,partite:0,vinte:0,perse:0,pari:0,serie:0,max:p,storia:o.storia,inCorso:null};save(o);
  }
  return o;
}
function atteso(a,b){return 1/(1+Math.pow(10,(b-a)/400))}
function delta(o,oppPunti,esito){const k=o.partite<NUOVE?K_NUOVO:K;const v=esito==='vinta'?1:esito==='pari'?0.5:0;let d=Math.round(k*(v-atteso(o.punti,oppPunti)));
  if(esito==='vinta')d=Math.max(5,d);if(esito==='persa')d=Math.min(-3,d);return d}
// all'inizio della partita si mette già la sconfitta: chi chiude a metà la perde, a fine partita si corregge
function avvia(opp){const o=leggi();if(o.inCorso)return o;const d=delta(o,opp.punti,'persa');
  const np=Math.max(MIN,o.punti+d);o.inCorso={nome:String(opp.nome||'').slice(0,20),punti:Math.round(opp.punti),d:np-o.punti,at:Date.now(),coda:opp.coda||''};o.punti=np;o.partite++;o.perse++;o.serie=0;save(o);return o}
function chiudi(esito){
  const o=leggi();const c=o.inCorso;if(!c)return null;
  const prima=o.punti-c.d;const legaPrima=lega(prima);
  o.punti=prima;o.perse--;o.inCorso=null;
  const d=delta(Object.assign({},o,{partite:o.partite-1}),c.punti,esito);
  o.punti=Math.max(MIN,o.punti+d);o.max=Math.max(o.max||0,o.punti);
  if(esito==='vinta'){o.vinte++;o.serie=(o.serie>0?o.serie:0)+1}else if(esito==='persa'){o.perse++;o.serie=0}else{o.pari=(o.pari||0)+1}
  o.ultime=[{esito,d,contro:c.nome,at:Date.now(),coda:c.coda}].concat(o.ultime||[]).slice(0,10);
  save(o);
  const L=lega(o.punti);const det={stagione:o.stagione,esito,delta:d,punti:o.punti,lega:L,promosso:ordine(o.punti)>ordine(prima),retrocesso:ordine(o.punti)<ordine(prima),legaPrima};
  try{window.dispatchEvent(new CustomEvent('testqi:classificata',{detail:det}))}catch(e){}
  return det;
}
// partita mai iniziata davvero (avversario sparito prima del via): si toglie tutto
function annulla(){const o=leggi();const c=o.inCorso;if(!c)return;o.punti-=c.d;o.partite--;o.perse--;o.inCorso=null;save(o)}
window.Classificate={KEY,LEGHE,INIZIO,leggi,lega,stagione,avvia,chiudi,annulla,atteso};
})();
