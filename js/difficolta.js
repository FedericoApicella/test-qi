// Difficoltà scelta dal giocatore, uguale per tutti i giochi del sito (allenamento, sudoku, parole…).
// Scala 1–10. Se scegli 6, il livello 1 vale 6 e i livelli salgono pianissimo dentro la fascia:
// livello 10 ≈ 6,04 · livello 100 ≈ 6,37 · livello 500 ≈ 6,90 · livello 1000 ≈ 6,99 (mai 7). "Auto" = difficoltà adattiva del gioco.
// Salvataggio in localStorage "testqi.difficolta": {scelte:{gioco:d|null}, livelli:{gioco:{d:partite}}}.
// Uso: Difficolta.selettoreHtml('nback') nel menù del gioco, Difficolta.bind(root,'nback',cb) dopo il render,
//      Difficolta.valore(d,L) per avere il numero 1–10,99, Difficolta.norm(d,L) per avere 0–1,
//      Difficolta.livello('nback',d) e Difficolta.incrementa('nback',d) a fine partita.
(function(){
'use strict';
const KEY='testqi.difficolta';
function load(){try{const v=JSON.parse(localStorage.getItem(KEY)||'{}');return{scelte:v.scelte||{},livelli:v.livelli||{}}}catch(e){return{scelte:{},livelli:{}}}}
function save(o){try{localStorage.setItem(KEY,JSON.stringify(o))}catch(e){}}
const clampD=(d)=>Math.max(1,Math.min(10,Math.round(d)));
// stessa curva dei giochi (giochi/comune.js): livello 1 = d, livello 1000 ≈ d+0,99
function valore(d,L){d=clampD(d);L=Math.max(1,Math.floor(L||1));return d+0.995*(1-Math.exp(-(L-1)/217))}
function norm(d,L){return Math.min(1,Math.max(0,(valore(d,L)-1)/10))}
function leggi(id){const v=load().scelte[id];return v==null?null:clampD(v)}
function scrivi(id,d){const o=load();if(d==null)delete o.scelte[id];else o.scelte[id]=clampD(d);save(o)}
function livello(id,d){const o=load();return ((o.livelli[id]||{})[clampD(d)]||0)+1}
function incrementa(id,d){const o=load();d=clampD(d);o.livelli[id]=o.livelli[id]||{};o.livelli[id][d]=(o.livelli[id][d]||0)+1;save(o);return o.livelli[id][d]+1}
const esc=(x)=>String(x).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=(x)=>x.toFixed(2).replace('.',',').replace(/,?0+$/,'');
function descrizione(id,d){if(d==null)return'Auto: la difficoltà si adatta a come vai.';const L=livello(id,d);return`${nome(d)} · livello ${L} a difficoltà ${d} (vale ${fmt(valore(d,L))}): sale piano dentro la fascia ${d}–${d},99 e non la supera mai. Ogni difficoltà tiene i suoi livelli.`}
// opts: {auto:true} aggiunge la scelta "Auto"; {valore:d} forza il valore mostrato
const NOMI=['Facilissimo','Facile','Tranquillo','Medio','Impegnativo','Difficile','Molto difficile','Durissimo','Estremo','Impossibile'];
const nome=(d)=>NOMI[clampD(d)-1];
// opts: {auto:true} aggiunge la scelta "Auto"; {valore:d} forza il valore mostrato. Stesso aspetto dei giochi (griglia 1–10, scelta col gradiente).
function selettoreHtml(id,opts){
  opts=opts||{};const cur=opts.valore!==undefined?opts.valore:leggi(id);const auto=opts.auto!==false;
  return`<div class="diff-sel" data-diff-for="${id}" role="radiogroup" aria-label="Difficoltà"><div class="diff-head"><span class="diff-lbl">Difficoltà</span>${auto?`<button type="button" class="dchip auto ${cur==null?'on':''}" data-d="auto" aria-pressed="${cur==null}">Auto</button>`:''}<span class="diff-nome">${cur==null?'':esc(nome(cur))}</span></div>
    <div class="diff-row">${[1,2,3,4,5,6,7,8,9,10].map(v=>`<button type="button" class="dchip ${cur===v?'on':''}" data-d="${v}" aria-pressed="${cur===v}" title="${esc(nome(v))}">${v}</button>`).join('')}</div><p class="hint diff-desc">${esc(descrizione(id,cur))}</p></div>`;
}
function bind(root,id,cb){
  const box=(root||document).querySelector(`.diff-sel[data-diff-for="${id}"]`);if(!box)return;
  box.querySelectorAll('.dchip').forEach(b=>b.addEventListener('click',()=>{const d=b.dataset.d==='auto'?null:+b.dataset.d;scrivi(id,d);
    box.querySelectorAll('.dchip').forEach(x=>{const on=x===b;x.classList.toggle('on',on);x.setAttribute('aria-pressed',on)});
    const p=box.querySelector('.diff-desc');if(p)p.textContent=descrizione(id,d);const nm=box.querySelector('.diff-nome');if(nm)nm.textContent=d==null?'':nome(d);if(cb)cb(d)}));
}
const CSS=`
.diff-sel{display:grid;gap:8px}
.diff-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.diff-lbl{font-weight:800}
.diff-nome{color:var(--muted);font-size:.9rem}
.diff-row{display:grid;grid-template-columns:repeat(10,1fr);gap:5px}
.dchip{appearance:none;border:2px solid var(--border);background:var(--surface);color:var(--fg);border-radius:10px;padding:9px 0;font:inherit;font-weight:800;font-family:var(--font-mono);cursor:pointer;min-width:0}
.dchip.auto{padding:6px 14px;border-radius:999px;font-family:inherit}
.dchip:hover{border-color:var(--accent)}
.dchip.on{background:var(--grad);color:#fff;border-color:transparent;box-shadow:0 6px 14px -6px rgba(0,0,0,.4)}
.diff-desc{margin:0}
`;
const st=document.createElement('style');st.textContent=CSS;document.head.appendChild(st);
window.Difficolta={KEY,valore,norm,leggi,scrivi,livello,incrementa,descrizione,selettoreHtml,bind,fmt,nome,NOMI};
})();
