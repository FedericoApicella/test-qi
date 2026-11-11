// Temi grafici dei giochi a livelli: tanti set di disegni originali in SVG (animali, frutta, spazio, mare,
// gemme, meteo, forme, dolci, musica, natura, mostri, bandiere, veicoli, sport) che cambiano di livello in
// livello, insieme a palette, stili delle tessere e dei tavoli. Tutto è deterministico dal numero del livello
// (stesso livello = stesso aspetto), così una partita ripresa ha la stessa grafica.
window.Temi=(function(){
'use strict';
const K='#1f2430',W='#ffffff';
// palette dei colori (a = colore pieno, b = ombra, c = chiaro)
const COLORI=[
  {id:'rosso',a:'#e63946',b:'#9d1b2a',c:'#ffb3b8'},
  {id:'arancio',a:'#f4871e',b:'#b85a0a',c:'#ffd3a6'},
  {id:'giallo',a:'#f5c518',b:'#b08a05',c:'#fff0a8'},
  {id:'verde',a:'#2fb15d',b:'#1a6e39',c:'#b5f0c6'},
  {id:'azzurro',a:'#29b6e8',b:'#1273a3',c:'#bfeafc'},
  {id:'blu',a:'#3d5af1',b:'#2234a8',c:'#c7cffc'},
  {id:'viola',a:'#8e4fe0',b:'#5a2aa0',c:'#dcc8fa'},
  {id:'rosa',a:'#f06aa8',b:'#b2366f',c:'#ffd0e6'},
  {id:'turchese',a:'#1fbfa6',b:'#107a6a',c:'#b5f3ea'},
  {id:'marrone',a:'#a9713a',b:'#6b4320',c:'#ead3b5'}
];
const sq=(inner)=>`<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${inner}</svg>`;
const eye=(x,y,r)=>`<circle cx="${x}" cy="${y}" r="${r||2.2}" fill="${K}"/><circle cx="${x+(r||2.2)*0.35}" cy="${y-(r||2.2)*0.35}" r="${(r||2.2)*0.35}" fill="${W}"/>`;
const st=(x,y,r,fill,n)=>{n=n||5;let d='';for(let i=0;i<n*2;i++){const a=-Math.PI/2+i*Math.PI/n;const rr=i%2?r*0.45:r;d+=(i?'L':'M')+(x+rr*Math.cos(a)).toFixed(1)+' '+(y+rr*Math.sin(a)).toFixed(1)}return`<path d="${d}Z" fill="${fill}"/>`};
const poly=(x,y,r,n,fill,rot)=>{let d='';for(let i=0;i<n;i++){const a=(rot||-Math.PI/2)+i*2*Math.PI/n;d+=(i?'L':'M')+(x+r*Math.cos(a)).toFixed(1)+' '+(y+r*Math.sin(a)).toFixed(1)}return`<path d="${d}Z" fill="${fill}"/>`};

// ---- i set: 12 disegni ciascuno, funzione (p) con p = {a,b,c} ----
const SET={};
SET.animali={nome:'Animali',ic:'🐾',d:[
  p=>`<path d="M9 14l3-8 6 6h4l6-6 3 8v12a11 11 0 0 1-22 0z" fill="${p.a}"/>${eye(15,19)}${eye(25,19)}<path d="M18 25h4l-2 2z" fill="${p.b}"/><path d="M12 27h5M23 27h5" stroke="${p.b}" stroke-width="1.4"/>`,
  p=>`<ellipse cx="20" cy="22" rx="11" ry="10" fill="${p.a}"/><path d="M8 16c-3 2-4 9-1 12 2 1 4-2 4-6zM32 16c3 2 4 9 1 12-2 1-4-2-4-6z" fill="${p.b}"/>${eye(16,20)}${eye(24,20)}<ellipse cx="20" cy="27" rx="4" ry="3" fill="${p.c}"/><circle cx="20" cy="26" r="1.6" fill="${K}"/>`,
  p=>`<path d="M6 12l7 5h14l7-5-3 14c-1 6-5 9-11 9s-10-3-11-9z" fill="${p.a}"/><path d="M14 24l6 8 6-8z" fill="${W}"/>${eye(15,21)}${eye(25,21)}<circle cx="20" cy="30" r="1.5" fill="${K}"/>`,
  p=>`<ellipse cx="20" cy="22" rx="12" ry="13" fill="${p.a}"/><path d="M8 12l5-5 3 6M32 12l-5-5-3 6" fill="${p.a}"/><circle cx="15" cy="19" r="5" fill="${W}"/><circle cx="25" cy="19" r="5" fill="${W}"/>${eye(15,19,2.6)}${eye(25,19,2.6)}<path d="M20 22l-2 4h4z" fill="${p.b}"/><path d="M12 29q8 4 16 0" stroke="${p.b}" stroke-width="1.5" fill="none"/>`,
  p=>`<ellipse cx="20" cy="24" rx="13" ry="10" fill="${p.a}"/><circle cx="13" cy="15" r="4.5" fill="${p.a}"/><circle cx="27" cy="15" r="4.5" fill="${p.a}"/>${eye(13,15,2.2)}${eye(27,15,2.2)}<path d="M12 26q8 6 16 0" stroke="${K}" stroke-width="1.6" fill="none"/><circle cx="12" cy="29" r="2" fill="${p.c}"/><circle cx="28" cy="29" r="2" fill="${p.c}"/>`,
  p=>`<ellipse cx="14" cy="10" rx="3.5" ry="8" fill="${p.a}"/><ellipse cx="26" cy="10" rx="3.5" ry="8" fill="${p.a}"/><ellipse cx="14" cy="10" rx="1.6" ry="5.5" fill="${p.c}"/><ellipse cx="26" cy="10" rx="1.6" ry="5.5" fill="${p.c}"/><circle cx="20" cy="24" r="11" fill="${p.a}"/>${eye(16,22)}${eye(24,22)}<ellipse cx="20" cy="27" rx="2" ry="1.4" fill="${p.b}"/><path d="M20 28v3M17 31h6" stroke="${K}" stroke-width="1.2" fill="none"/>`,
  p=>`<circle cx="11" cy="12" r="5" fill="${p.a}"/><circle cx="29" cy="12" r="5" fill="${p.a}"/><circle cx="20" cy="23" r="12" fill="${p.a}"/><ellipse cx="20" cy="27" rx="6" ry="4.5" fill="${p.c}"/>${eye(15,20)}${eye(25,20)}<ellipse cx="20" cy="26" rx="2.2" ry="1.6" fill="${K}"/>`,
  p=>`<circle cx="20" cy="22" r="12" fill="${p.a}"/><path d="M8 14l4-6 3 5M32 14l-4-6-3 5" fill="${p.a}"/><ellipse cx="20" cy="26" rx="6" ry="4.5" fill="${p.c}"/><circle cx="18" cy="26" r="1.3" fill="${p.b}"/><circle cx="22" cy="26" r="1.3" fill="${p.b}"/>${eye(15,19)}${eye(25,19)}`,
  p=>`<circle cx="20" cy="24" r="11" fill="${p.a}"/><circle cx="20" cy="13" r="7" fill="${p.a}"/><path d="M18 5l2-3 2 3z" fill="${p.b}"/>${eye(17,12,1.8)}${eye(23,12,1.8)}<path d="M20 14l-3 3h6z" fill="${p.b}"/><path d="M9 30l-4 4M31 30l4 4" stroke="${p.b}" stroke-width="1.6"/><path d="M15 36l3-5M25 36l-3-5" stroke="${p.b}" stroke-width="2"/>`,
  p=>`<path d="M5 20c6-9 17-10 24 0-7 10-18 9-24 0z" fill="${p.a}"/><path d="M28 20l9-7-2 7 2 7z" fill="${p.b}"/><path d="M14 12c3-3 7-3 9 0M14 28c3 3 7 3 9 0" stroke="${p.c}" stroke-width="2.5" fill="none" stroke-linecap="round"/><circle cx="11" cy="19" r="2.6" fill="${W}"/>${eye(11.5,19,1.6)}<path d="M17 15v10M22 14v12" stroke="${p.c}" stroke-width="1.5" opacity=".7"/><circle cx="4" cy="12" r="1.3" fill="${p.c}"/><circle cx="3" cy="7" r="1" fill="${p.c}"/>`,
  p=>`<path d="M6 30h22c3 0 5-1 5-3s-2-3-4-3H17c-1 0-2-1-2-2" stroke="${p.b}" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="25" cy="18" r="9" fill="${p.a}"/><circle cx="25" cy="18" r="5.5" fill="${p.c}"/><circle cx="25" cy="18" r="2.5" fill="${p.a}"/><path d="M9 25l-2-7M13 25l2-7" stroke="${p.b}" stroke-width="2" stroke-linecap="round"/><circle cx="7" cy="17" r="1.6" fill="${K}"/><circle cx="15" cy="17" r="1.6" fill="${K}"/>`,
  p=>`<path d="M20 20C14 8 4 8 6 16c1 6 8 7 14 4zM20 20c6-12 16-12 14-4-1 6-8 7-14 4zM20 20c-6 12-14 10-13 4 1-5 8-6 13-4zM20 20c6 12 14 10 13 4-1-5-8-6-13-4z" fill="${p.a}"/><circle cx="10" cy="15" r="2" fill="${p.c}"/><circle cx="30" cy="15" r="2" fill="${p.c}"/><rect x="19" y="12" width="2" height="16" rx="1" fill="${K}"/><path d="M19 12l-3-5M21 12l3-5" stroke="${K}" stroke-width="1.2"/>`
]};
SET.frutta={nome:'Frutta',ic:'🍎',d:[
  p=>`<path d="M20 12c-8-4-14 2-13 10s6 13 10 12c1 0 2-1 3-1s2 1 3 1c4 1 9-4 10-12s-5-14-13-10z" fill="${p.a}"/><path d="M20 12V6" stroke="${p.b}" stroke-width="2"/><path d="M20 8c3-4 7-3 8-1-3 2-6 2-8 1z" fill="#2fb15d"/><ellipse cx="14" cy="18" rx="2" ry="3.5" fill="${W}" opacity=".5"/>`,
  p=>`<path d="M20 10c-3 0-5 3-5 7-5 3-7 8-6 12 1 4 5 6 11 6s10-2 11-6c1-4-1-9-6-12 0-4-2-7-5-7z" fill="${p.a}"/><path d="M20 10V5" stroke="${p.b}" stroke-width="2"/><ellipse cx="14" cy="26" rx="2" ry="3.5" fill="${W}" opacity=".5"/>`,
  p=>`<path d="M14 24C12 14 18 8 26 6M26 24c0-8 2-14 0-18" stroke="#2fb15d" stroke-width="2" fill="none"/><circle cx="13" cy="27" r="6.5" fill="${p.a}"/><circle cx="26" cy="27" r="6.5" fill="${p.a}"/><circle cx="11" cy="25" r="1.8" fill="${W}" opacity=".6"/><circle cx="24" cy="25" r="1.8" fill="${W}" opacity=".6"/><path d="M21 8c4-3 8-1 10 2-4 1-8 1-10-2z" fill="#2fb15d"/>`,
  p=>`<path d="M20 12c-9 0-13 6-11 13 2 7 7 11 11 11s9-4 11-11c2-7-2-13-11-13z" fill="${p.a}"/><path d="M12 10l8 2 8-2-3 5h-10z" fill="#2fb15d"/><g fill="${p.c}"><circle cx="15" cy="20" r="1.2"/><circle cx="21" cy="18" r="1.2"/><circle cx="25" cy="23" r="1.2"/><circle cx="17" cy="27" r="1.2"/><circle cx="23" cy="30" r="1.2"/><circle cx="20" cy="24" r="1.2"/></g>`,
  p=>`<path d="M8 12c2 10 8 18 18 20 4 1 7 0 8-2-8-1-15-7-19-18-1-3-6-3-7 0z" fill="${p.a}"/><path d="M12 13c3 9 8 14 15 17" stroke="${p.c}" stroke-width="2" fill="none"/><path d="M7 11l3-4 2 3z" fill="${p.b}"/>`,
  p=>`<path d="M20 6l2 5" stroke="${p.b}" stroke-width="2"/><path d="M22 10c4-2 7 0 8 2-3 1-6 0-8-2z" fill="#2fb15d"/><g fill="${p.a}"><circle cx="14" cy="16" r="4"/><circle cx="22" cy="15" r="4"/><circle cx="10" cy="23" r="4"/><circle cx="18" cy="22" r="4"/><circle cx="26" cy="22" r="4"/><circle cx="14" cy="30" r="4"/><circle cx="22" cy="29" r="4"/><circle cx="18" cy="35" r="3.5"/></g><circle cx="13" cy="15" r="1.2" fill="${W}" opacity=".6"/><circle cx="17" cy="21" r="1.2" fill="${W}" opacity=".6"/>`,
  p=>`<ellipse cx="20" cy="21" rx="14" ry="10" transform="rotate(-25 20 21)" fill="${p.a}"/><ellipse cx="18" cy="19" rx="4" ry="2.5" transform="rotate(-25 18 19)" fill="${W}" opacity=".45"/><circle cx="33" cy="12" r="2" fill="${p.b}"/><path d="M8 29c-2 1-3 3-2 4" stroke="#2fb15d" stroke-width="2" fill="none"/>`,
  p=>`<path d="M5 14h30a15 15 0 0 1-30 0z" fill="#2fb15d"/><path d="M8 15h24a12 12 0 0 1-24 0z" fill="${p.c}"/><path d="M10 16h20a10 10 0 0 1-20 0z" fill="${p.a}"/><g fill="${K}"><ellipse cx="15" cy="19" rx="1" ry="1.6"/><ellipse cx="20" cy="21" rx="1" ry="1.6"/><ellipse cx="25" cy="19" rx="1" ry="1.6"/><ellipse cx="18" cy="25" rx="1" ry="1.6"/><ellipse cx="22" cy="25" rx="1" ry="1.6"/></g>`,
  p=>`<path d="M20 4l3 6 4-5 1 7 5-3-2 7 5 0-5 4z" fill="#2fb15d"/><ellipse cx="20" cy="26" rx="10" ry="12" fill="${p.a}"/><g stroke="${p.b}" stroke-width="1.2" fill="none"><path d="M12 20l16 12M12 26l14 10M14 16l14 12M12 32l8 6M20 15l9 7"/><path d="M28 20L12 32M28 26L14 36M26 16L12 28M28 32l-8 6M20 15l-9 7"/></g>`,
  p=>`<circle cx="20" cy="22" r="13" fill="${p.a}"/><circle cx="20" cy="22" r="9.5" fill="${p.c}"/><g fill="${p.a}"><path d="M20 22L20 13A9 9 0 0 1 27 17z"/><path d="M20 22L29 22A9 9 0 0 1 27 27z"/><path d="M20 22L20 31A9 9 0 0 1 13 27z"/><path d="M20 22L11 22A9 9 0 0 1 13 17z"/></g><path d="M19 9c1-3 4-4 7-3-1 3-4 4-7 3z" fill="#2fb15d"/>`,
  p=>`<ellipse cx="20" cy="21" rx="12" ry="14" fill="${p.b}"/><ellipse cx="20" cy="21" rx="9" ry="11" fill="${p.a}"/><ellipse cx="20" cy="21" rx="3" ry="4" fill="${p.c}"/><g fill="${K}"><circle cx="15" cy="15" r=".9"/><circle cx="25" cy="15" r=".9"/><circle cx="13" cy="22" r=".9"/><circle cx="27" cy="22" r=".9"/><circle cx="15" cy="29" r=".9"/><circle cx="25" cy="29" r=".9"/></g>`,
  p=>`<path d="M20 11c-9 0-14 7-12 14 1 6 6 10 12 10s11-4 12-10c2-7-3-14-12-14z" fill="${p.a}"/><path d="M20 11c-1 8-1 16 0 24" stroke="${p.b}" stroke-width="1.5" fill="none"/><path d="M20 11V6" stroke="${p.b}" stroke-width="2"/><path d="M20 9c-4-3-7-1-8 1 3 2 6 1 8-1z" fill="#2fb15d"/><ellipse cx="14" cy="19" rx="2" ry="3" fill="${W}" opacity=".45"/>`
]};
SET.spazio={nome:'Spazio',ic:'🪐',d:[
  p=>`<circle cx="20" cy="20" r="9" fill="${p.a}"/><ellipse cx="20" cy="20" rx="17" ry="5" fill="none" stroke="${p.c}" stroke-width="3" transform="rotate(-20 20 20)"/><path d="M11 20a9 9 0 0 0 18 0" fill="${p.a}"/><circle cx="16" cy="17" r="2" fill="${p.c}" opacity=".6"/>`,
  p=>`<path d="M20 4c6 5 8 14 6 24H14C12 18 14 9 20 4z" fill="${p.c}"/><path d="M20 4c6 5 8 14 6 24h-6z" fill="${p.a}"/><circle cx="20" cy="17" r="3.5" fill="${p.b}"/><circle cx="20" cy="17" r="2" fill="#bfeafc"/><path d="M14 22l-6 8h6zM26 22l6 8h-6z" fill="${p.b}"/><path d="M16 28h8l-4 9z" fill="#f4871e"/><path d="M18 28h4l-2 5z" fill="#f5c518"/>`,
  p=>st(20,20,16,p.a)+st(20,20,7,p.c),
  p=>`<path d="M28 12L4 22l22 4z" fill="${p.c}" opacity=".55"/><path d="M28 12L8 30l20-4z" fill="${p.c}" opacity=".7"/><circle cx="29" cy="11" r="7" fill="${p.a}"/><circle cx="27" cy="9" r="2.5" fill="${W}" opacity=".6"/>${st(10,8,2,p.c)}${st(33,30,1.6,p.c)}`,
  p=>`<path d="M24 5a15 15 0 1 0 11 24A12 12 0 0 1 24 5z" fill="${p.a}"/><circle cx="14" cy="14" r="2" fill="${p.b}"/><circle cx="12" cy="24" r="3" fill="${p.b}"/><circle cx="20" cy="30" r="1.8" fill="${p.b}"/>`,
  p=>`<circle cx="20" cy="20" r="9" fill="${p.a}"/>${[0,45,90,135,180,225,270,315].map(a=>`<path d="M20 4l2 4h-4z" fill="${p.b}" transform="rotate(${a} 20 20)"/>`).join('')}<circle cx="17" cy="18" r="1.6" fill="${K}"/><circle cx="23" cy="18" r="1.6" fill="${K}"/><path d="M16 23q4 3 8 0" stroke="${K}" stroke-width="1.4" fill="none"/>`,
  p=>`<rect x="15" y="15" width="10" height="10" rx="2" fill="${p.b}"/><path d="M4 12l10 6M36 12l-10 6M4 28l10-6M36 28l-10-6" stroke="${p.b}" stroke-width="2"/><rect x="2" y="9" width="10" height="7" rx="1" fill="${p.a}" transform="rotate(-30 7 12)"/><rect x="28" y="9" width="10" height="7" rx="1" fill="${p.a}" transform="rotate(30 33 12)"/><rect x="2" y="24" width="10" height="7" rx="1" fill="${p.a}" transform="rotate(30 7 27)"/><rect x="28" y="24" width="10" height="7" rx="1" fill="${p.a}" transform="rotate(-30 33 27)"/><circle cx="20" cy="20" r="2.5" fill="${p.c}"/>`,
  p=>`<ellipse cx="20" cy="20" rx="10" ry="12" fill="${p.a}"/><path d="M12 10l-2-6M28 10l2-6" stroke="${p.b}" stroke-width="2"/><circle cx="10" cy="4" r="2" fill="${p.c}"/><circle cx="30" cy="4" r="2" fill="${p.c}"/><ellipse cx="16" cy="19" rx="3" ry="4.5" fill="${K}"/><ellipse cx="24" cy="19" rx="3" ry="4.5" fill="${K}"/><circle cx="16.5" cy="17.5" r="1" fill="${W}"/><circle cx="24.5" cy="17.5" r="1" fill="${W}"/><path d="M15 27q5 3 10 0" stroke="${K}" stroke-width="1.4" fill="none"/>`,
  p=>`<ellipse cx="20" cy="22" rx="17" ry="6" fill="${p.a}"/><path d="M10 20c0-8 20-8 20 0" fill="${p.c}"/><circle cx="12" cy="24" r="1.6" fill="${p.c}"/><circle cx="20" cy="26" r="1.6" fill="${p.c}"/><circle cx="28" cy="24" r="1.6" fill="${p.c}"/><path d="M14 30l-3 6M26 30l3 6M20 29v7" stroke="${p.b}" stroke-width="1.6"/>`,
  p=>`<circle cx="20" cy="19" r="14" fill="${p.c}"/><circle cx="20" cy="19" r="10" fill="${p.a}"/><path d="M12 19a8 8 0 0 1 16 0" fill="${W}" opacity=".35"/><rect x="10" y="30" width="20" height="6" rx="3" fill="${p.b}"/>`,
  p=>`<path d="M20 20c0-10 10-12 14-6-6 2-8 6-8 12M20 20c0 10-10 12-14 6 6-2 8-6 8-12M20 20c10 0 12 10 6 14-2-6-6-8-12-8M20 20c-10 0-12-10-6-14 2 6 6 8 12 8" fill="${p.a}" opacity=".85"/><circle cx="20" cy="20" r="4" fill="${p.c}"/><circle cx="31" cy="30" r="1.2" fill="${p.c}"/><circle cx="8" cy="9" r="1.2" fill="${p.c}"/>`,
  p=>`<path d="M36 4L14 20l6 6z" fill="#f4871e" opacity=".8"/><path d="M36 4L18 16l4 4z" fill="#f5c518" opacity=".9"/><path d="M14 36c-6 0-9-5-7-10 2-4 7-6 11-4 4 2 5 7 3 10-2 3-4 4-7 4z" fill="${p.b}"/><circle cx="12" cy="26" r="2" fill="${p.a}"/><circle cx="17" cy="30" r="1.6" fill="${p.a}"/><circle cx="11" cy="32" r="1.2" fill="${p.a}"/>`
]};
SET.mare={nome:'Mare',ic:'🐠',d:[
  p=>`<path d="M6 20c6-9 16-9 22 0-6 9-16 9-22 0z" fill="${p.a}"/><path d="M28 20l8-7v14z" fill="${p.b}"/><path d="M12 12c2-3 6-3 8 0M12 28c2 3 6 3 8 0" stroke="${p.c}" stroke-width="2" fill="none"/>${eye(12,19,2)}<path d="M16 16v8M20 15v10" stroke="${p.c}" stroke-width="1.2" opacity=".6"/>`,
  p=>st(20,21,16,p.a)+`<circle cx="20" cy="21" r="2" fill="${p.c}"/><circle cx="20" cy="12" r="1.2" fill="${p.c}"/><circle cx="28" cy="18" r="1.2" fill="${p.c}"/><circle cx="25" cy="27" r="1.2" fill="${p.c}"/><circle cx="15" cy="27" r="1.2" fill="${p.c}"/><circle cx="12" cy="18" r="1.2" fill="${p.c}"/>`,
  p=>`<path d="M20 34L6 20a14 14 0 0 1 28 0z" fill="${p.a}"/><path d="M20 34L10 18M20 34l-3-22M20 34l3-22M20 34l10-16" stroke="${p.b}" stroke-width="1.5"/><path d="M6 20a14 14 0 0 1 28 0" stroke="${p.c}" stroke-width="2" fill="none"/>`,
  p=>`<circle cx="20" cy="16" r="11" fill="${p.a}"/><path d="M9 20c-2 8-4 12 0 15 2-3 2-7 3-11zM31 20c2 8 4 12 0 15-2-3-2-7-3-11zM15 25c-1 6-2 9 1 12 1-3 2-7 2-11zM25 25c1 6 2 9-1 12-1-3-2-7-2-11z" fill="${p.a}"/><circle cx="16" cy="15" r="3" fill="${W}"/><circle cx="24" cy="15" r="3" fill="${W}"/>${eye(16,15,1.6)}${eye(24,15,1.6)}<path d="M17 21q3 2 6 0" stroke="${K}" stroke-width="1.2" fill="none"/>`,
  p=>`<ellipse cx="20" cy="24" rx="12" ry="8" fill="${p.a}"/><path d="M10 20l-6-6M30 20l6-6" stroke="${p.b}" stroke-width="3" stroke-linecap="round"/><circle cx="4" cy="13" r="3.5" fill="${p.a}"/><circle cx="36" cy="13" r="3.5" fill="${p.a}"/><path d="M11 30l-4 5M16 32l-2 5M29 30l4 5M24 32l2 5" stroke="${p.b}" stroke-width="2"/><circle cx="15" cy="22" r="2.5" fill="${W}"/><circle cx="25" cy="22" r="2.5" fill="${W}"/>${eye(15,22,1.4)}${eye(25,22,1.4)}`,
  p=>`<path d="M7 20a13 11 0 0 1 26 0z" fill="${p.a}"/><path d="M9 20q2 3 4-1 2 4 4 0 2 4 4 0 2 4 4 0 2 4 4 0 2 4 4 1" fill="${p.a}"/><path d="M12 22c-1 6 1 10 0 14M18 22c1 6-1 10 0 14M24 22c-1 6 1 10 0 14M29 22c1 5-1 9 0 13" stroke="${p.c}" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M12 13c3-3 8-4 13-2" stroke="${W}" stroke-width="1.5" fill="none" opacity=".6"/>`,
  p=>`<path d="M4 22c4-10 14-14 26-10l6-6-2 9c2 5 0 10-4 12-8 5-20 3-26-5z" fill="${p.a}"/><path d="M4 22c6 2 12 2 18-1" stroke="${p.b}" stroke-width="1.5" fill="none"/><path d="M4 22c2 5 7 8 12 8" fill="${p.c}"/>${eye(26,18,2)}<path d="M20 9c0-3 2-5 4-5" stroke="${p.c}" stroke-width="1.6" fill="none"/>`,
  p=>`<circle cx="20" cy="8" r="3.5" fill="none" stroke="${p.a}" stroke-width="2.5"/><path d="M20 11v22" stroke="${p.a}" stroke-width="3"/><path d="M12 16h16" stroke="${p.a}" stroke-width="3"/><path d="M8 24c0 8 24 8 24 0l3 3c-1 10-29 10-30 0z" fill="${p.a}"/>`,
  p=>`<path d="M2 28c4-8 8-14 14-14 5 0 6 6 3 9-2 2-5 1-5-1 0-3 4-3 6-1M19 28c3-6 7-10 12-10 4 0 5 5 2 7-2 1-4 0-4-2 0-2 3-2 5 0" stroke="${p.a}" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M2 34q9-4 18 0 9-4 18 0" stroke="${p.c}" stroke-width="2.5" fill="none"/>`,
  p=>`<path d="M20 36c-4-1-6-4-4-7 2-2 6-1 6 2M22 30c5-2 7-8 5-13-1-4-4-6-8-6" stroke="${p.a}" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M22 30c5-2 7-8 5-13-1-4-4-6-8-6" stroke="${p.c}" stroke-width="1.6" fill="none" stroke-dasharray="2 3"/><ellipse cx="17" cy="10" rx="6" ry="4.5" fill="${p.a}"/><path d="M11 10l-5 0" stroke="${p.a}" stroke-width="3" stroke-linecap="round"/><path d="M19 5l2-4 2 4z" fill="${p.b}"/><path d="M28 14l5-3-2 6zM28 22l5 0-3 4z" fill="${p.b}"/>${eye(16,9.5,1.5)}`,
  p=>`<path d="M20 4v22" stroke="${p.b}" stroke-width="2"/><path d="M20 6l12 16H20z" fill="${p.a}"/><path d="M20 10L10 22h10z" fill="${p.c}"/><path d="M4 27h32l-5 7H9z" fill="${p.b}"/><path d="M2 36q9-3 18 0 9-3 18 0" stroke="${p.a}" stroke-width="2" fill="none"/>`,
  p=>`<path d="M14 36l2-26h8l2 26z" fill="${p.c}"/><path d="M15 22h10M14 29h12" stroke="${p.a}" stroke-width="4"/><rect x="15" y="5" width="10" height="6" rx="1" fill="${p.a}"/><path d="M14 11h12" stroke="${p.b}" stroke-width="2"/><path d="M15 8L3 4v8zM25 8l12-4v8z" fill="#f5c518" opacity=".6"/><path d="M8 36h24" stroke="${p.b}" stroke-width="2"/>`
]};
SET.gemme={nome:'Gemme',ic:'💎',d:[
  p=>`<circle cx="20" cy="20" r="14" fill="${p.a}"/>${poly(20,20,9,8,p.c)}${poly(20,20,4,8,p.a)}<path d="M20 6v8M20 26v8M6 20h8M26 20h8" stroke="${p.b}" stroke-width="1"/>`,
  p=>`<path d="M20 4l14 12-14 20L6 16z" fill="${p.a}"/><path d="M6 16h28L20 4z" fill="${p.c}"/><path d="M12 16l8-12 8 12-8 20z" fill="${W}" opacity=".25"/><path d="M12 16h16" stroke="${p.b}" stroke-width="1"/>`,
  p=>`<path d="M20 4L34 20 20 36 6 20z" fill="${p.a}"/><path d="M20 4L34 20H6z" fill="${p.c}"/><path d="M20 10l8 10-8 10-8-10z" fill="${W}" opacity=".25"/>`,
  p=>`<ellipse cx="20" cy="20" rx="10" ry="15" fill="${p.a}"/><ellipse cx="20" cy="20" rx="6" ry="10" fill="${p.c}"/><path d="M20 5v30M10 20h20" stroke="${p.b}" stroke-width="1"/>`,
  p=>`<path d="M20 4c8 8 10 14 10 20a10 10 0 0 1-20 0c0-6 2-12 10-20z" fill="${p.a}"/><path d="M20 12c4 5 5 9 5 12a5 5 0 0 1-10 0c0-3 1-7 5-12z" fill="${p.c}"/>`,
  p=>`<path d="M20 34C8 24 4 18 8 11c3-5 9-5 12 0 3-5 9-5 12 0 4 7 0 13-12 23z" fill="${p.a}"/><path d="M20 28C12 21 10 17 12 13c2-3 6-3 8 1 2-4 6-4 8-1 2 4 0 8-8 15z" fill="${p.c}"/>`,
  p=>`${poly(20,20,15,6,p.a)}${poly(20,20,9,6,p.c)}${poly(20,20,4,6,p.a)}${[0,60,120,180,240,300].map(a=>`<path d="M20 5v6" stroke="${p.b}" stroke-width="1" transform="rotate(${a} 20 20)"/>`).join('')}`,
  p=>`<path d="M20 5l15 26H5z" fill="${p.a}"/><path d="M20 14l8 14H12z" fill="${p.c}"/><path d="M20 5v9M5 31l7-3M35 31l-7-3" stroke="${p.b}" stroke-width="1"/>`,
  p=>`<rect x="6" y="6" width="28" height="28" rx="3" fill="${p.a}"/><rect x="12" y="12" width="16" height="16" rx="2" fill="${p.c}"/><path d="M6 6l6 6M34 6l-6 6M6 34l6-6M34 34l-6-6" stroke="${p.b}" stroke-width="1"/>`,
  p=>`<path d="M10 6h20l6 10-6 18H10L4 16z" fill="${p.a}"/><path d="M14 12h12l4 6-4 10H14l-4-6z" fill="${p.c}"/><path d="M10 6l4 6M30 6l-4 6M4 16h6M36 16h-6M10 34l4-6M30 34l-4-6" stroke="${p.b}" stroke-width="1"/>`,
  p=>`<path d="M20 5c10 3 16 9 16 15 0 7-7 14-16 15C11 34 4 27 4 20c0-6 6-12 16-15z" fill="${p.a}"/><path d="M20 12c6 2 10 5 10 8 0 4-4 8-10 9-6-1-10-5-10-9 0-3 4-6 10-8z" fill="${p.c}"/>`,
  p=>`<path d="M20 4l5 11 11 5-11 5-5 11-5-11-11-5 11-5z" fill="${p.a}"/><path d="M20 12l3 5 5 3-5 3-3 5-3-5-5-3 5-3z" fill="${p.c}"/>`
]};
SET.meteo={nome:'Meteo',ic:'⛅',d:[
  p=>`<circle cx="20" cy="20" r="9" fill="${p.a}"/>${[0,45,90,135,180,225,270,315].map(a=>`<path d="M20 3v6" stroke="${p.a}" stroke-width="3" stroke-linecap="round" transform="rotate(${a} 20 20)"/>`).join('')}<circle cx="17" cy="18" r="2.5" fill="${p.c}" opacity=".6"/>`,
  p=>`<path d="M12 30a7 7 0 0 1-1-14 9 9 0 0 1 17-2 7 7 0 0 1 2 16z" fill="${p.a}"/><path d="M12 24a3 3 0 0 1 0-6 5 5 0 0 1 9-1" stroke="${p.c}" stroke-width="2" fill="none" opacity=".7"/>`,
  p=>`<path d="M12 24a6 6 0 0 1-1-12 8 8 0 0 1 15-2 6 6 0 0 1 2 14z" fill="${p.c}"/><path d="M12 28l-2 6M19 28l-2 6M26 28l-2 6" stroke="${p.a}" stroke-width="2.5" stroke-linecap="round"/>`,
  p=>`${[0,60,120].map(a=>`<path d="M20 5v30M15 9l5 4 5-4M15 31l5-4 5 4" stroke="${p.a}" stroke-width="2.5" fill="none" stroke-linecap="round" transform="rotate(${a} 20 20)"/>`).join('')}<circle cx="20" cy="20" r="3" fill="${p.c}"/>`,
  p=>`<path d="M12 22a6 6 0 0 1-1-12 8 8 0 0 1 15-2 6 6 0 0 1 2 14z" fill="${p.b}"/><path d="M22 18l-6 10h5l-3 9 9-12h-5l4-7z" fill="#f5c518"/>`,
  p=>`<path d="M4 32a16 16 0 0 1 32 0h-4a12 12 0 0 0-24 0z" fill="#e63946"/><path d="M8 32a12 12 0 0 1 24 0h-4a8 8 0 0 0-16 0z" fill="#f5c518"/><path d="M12 32a8 8 0 0 1 16 0h-4a4 4 0 0 0-8 0z" fill="#2fb15d"/><path d="M16 32a4 4 0 0 1 8 0z" fill="${p.a}"/>`,
  p=>`<path d="M4 14h20a4 4 0 1 0-4-4M4 21h26a4 4 0 1 1-4 4M8 28h14a3 3 0 1 1-3 3" stroke="${p.a}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
  p=>`<path d="M24 5a15 15 0 1 0 11 24A12 12 0 0 1 24 5z" fill="${p.a}"/>${st(10,10,3,p.c)}${st(31,32,2.2,p.c)}`,
  p=>`<path d="M6 8h28M10 14h22M12 20h16M14 26h10M18 32h5" stroke="${p.a}" stroke-width="3.5" stroke-linecap="round"/><path d="M8 8c0 10 6 16 12 24" stroke="${p.c}" stroke-width="1.5" fill="none" opacity=".6"/>`,
  p=>`<path d="M4 20a16 16 0 0 1 32 0q-4-3-8 0-4-3-8 0-4-3-8 0-4-3-8 0z" fill="${p.a}"/><path d="M20 20v12a3 3 0 0 1-6 0" stroke="${p.b}" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M20 20V4" stroke="${p.b}" stroke-width="2"/><path d="M8 18a12 12 0 0 1 8-9" stroke="${W}" stroke-width="1.5" fill="none" opacity=".5"/>`,
  p=>`<rect x="16" y="4" width="8" height="24" rx="4" fill="${p.c}"/><circle cx="20" cy="30" r="6" fill="${p.a}"/><rect x="18.5" y="12" width="3" height="18" fill="${p.a}"/><path d="M26 10h4M26 15h3M26 20h4" stroke="${p.b}" stroke-width="1.5"/>`,
  p=>`<path d="M6 12h28M6 19h28M6 26h28M6 33h28" stroke="${p.a}" stroke-width="3" stroke-linecap="round" opacity=".55"/><path d="M12 12h16M10 26h20" stroke="${p.c}" stroke-width="3" stroke-linecap="round"/>`
]};
SET.forme={nome:'Forme',ic:'🔷',d:[
  p=>`<circle cx="20" cy="20" r="14" fill="${p.a}"/><circle cx="15" cy="15" r="4" fill="${p.c}" opacity=".7"/>`,
  p=>`<rect x="6" y="6" width="28" height="28" rx="4" fill="${p.a}"/><rect x="10" y="10" width="8" height="8" rx="2" fill="${p.c}" opacity=".7"/>`,
  p=>`<path d="M20 5l15 27H5z" fill="${p.a}"/><path d="M20 14l5 9H15z" fill="${p.c}" opacity=".7"/>`,
  p=>st(20,21,16,p.a)+st(20,21,6,p.c),
  p=>poly(20,20,15,6,p.a)+poly(20,20,6,6,p.c),
  p=>poly(20,21,15,5,p.a)+poly(20,21,6,5,p.c),
  p=>`<path d="M20 34C8 24 4 18 8 11c3-5 9-5 12 0 3-5 9-5 12 0 4 7 0 13-12 23z" fill="${p.a}"/><circle cx="14" cy="14" r="3" fill="${p.c}" opacity=".7"/>`,
  p=>`<path d="M20 4l14 16-14 16L6 20z" fill="${p.a}"/><path d="M20 12l6 8-6 8-6-8z" fill="${p.c}" opacity=".7"/>`,
  p=>`<path d="M14 5h12v9h9v12h-9v9H14v-9H5V14h9z" fill="${p.a}"/><rect x="16" y="16" width="8" height="8" fill="${p.c}" opacity=".7"/>`,
  p=>`<path d="M24 5a15 15 0 1 0 11 24A12 12 0 0 1 24 5z" fill="${p.a}"/>`,
  p=>`<circle cx="20" cy="20" r="14" fill="${p.a}"/><circle cx="20" cy="20" r="7" fill="${p.c}"/>`,
  p=>`<path d="M20 4c8 8 10 14 10 20a10 10 0 0 1-20 0c0-6 2-12 10-20z" fill="${p.a}"/><circle cx="16" cy="25" r="3" fill="${p.c}" opacity=".7"/>`
]};
SET.dolci={nome:'Dolci',ic:'🧁',d:[
  p=>`<path d="M9 20h22l-3 15H12z" fill="${p.c}"/><path d="M12 20h16l-2 15h-12z" fill="none" stroke="${p.b}" stroke-width="1" opacity=".4"/><path d="M8 18c-2-6 4-10 8-7 2-6 10-6 12 0 4-3 10 1 8 7 0 3-28 3-28 0z" fill="${p.a}"/><circle cx="20" cy="8" r="2.5" fill="#e63946"/>`,
  p=>`<circle cx="20" cy="20" r="14" fill="#ead3b5"/><circle cx="20" cy="20" r="13" fill="${p.a}"/><circle cx="20" cy="20" r="5" fill="${W}"/><g stroke-width="2" stroke-linecap="round"><path d="M12 14l2 2" stroke="${p.c}"/><path d="M26 12l-1 3" stroke="#f5c518"/><path d="M29 24l-3 1" stroke="${p.c}"/><path d="M14 28l2-2" stroke="#2fb15d"/><path d="M22 30l1-3" stroke="#f5c518"/><path d="M10 22l3 0" stroke="#e63946"/></g>`,
  p=>`<path d="M11 21h18l-9 17z" fill="#e8b878"/><path d="M13 22l7 14 7-14M15 26h10M17 30h6" stroke="#a9713a" stroke-width="1.2" fill="none"/><circle cx="20" cy="9" r="6.5" fill="${p.c}"/><circle cx="20" cy="16" r="8" fill="${p.a}"/><circle cx="17" cy="14" r="2" fill="${W}" opacity=".5"/><circle cx="18" cy="6" r="1.5" fill="${W}" opacity=".6"/>`,
  p=>`<path d="M20 22v14" stroke="#a9713a" stroke-width="2.5" stroke-linecap="round"/><circle cx="20" cy="14" r="10" fill="${p.a}"/><path d="M20 14c-4-6 4-10 4-4s-8 8-6 2 8-4 4 2" stroke="${p.c}" stroke-width="2" fill="none"/>`,
  p=>`<ellipse cx="20" cy="20" rx="9" ry="7" fill="${p.a}"/><path d="M11 20l-7-5v10zM29 20l7-5v10z" fill="${p.c}"/><path d="M15 16c3-1 7-1 10 0M15 24c3 1 7 1 10 0" stroke="${p.c}" stroke-width="1.5" fill="none"/>`,
  p=>`<circle cx="20" cy="20" r="14" fill="#c48a4a"/><circle cx="20" cy="20" r="12" fill="#dba86a"/><g fill="${p.b}"><circle cx="14" cy="15" r="2"/><circle cx="24" cy="13" r="2"/><circle cx="27" cy="22" r="2"/><circle cx="18" cy="24" r="2"/><circle cx="14" cy="27" r="1.6"/><circle cx="23" cy="29" r="1.6"/></g>`,
  p=>`<path d="M6 32L20 8l14 24z" fill="${p.c}"/><path d="M8 32L20 12l12 20z" fill="${p.a}"/><path d="M6 32h28v3H6z" fill="${p.b}"/><path d="M11 29L20 14l9 15" stroke="${p.c}" stroke-width="1.5" fill="none"/><circle cx="20" cy="7" r="3" fill="#e63946"/>`,
  p=>`<ellipse cx="20" cy="13" rx="13" ry="6" fill="${p.a}"/><ellipse cx="20" cy="19" rx="11" ry="4" fill="${p.c}"/><ellipse cx="20" cy="25" rx="13" ry="6" fill="${p.a}"/><path d="M7 13v12M33 13v12" stroke="${p.a}" stroke-width="1"/>`,
  p=>`<rect x="6" y="8" width="28" height="24" rx="3" fill="${p.b}"/><g fill="${p.a}"><rect x="8" y="10" width="7" height="6" rx="1"/><rect x="16.5" y="10" width="7" height="6" rx="1"/><rect x="25" y="10" width="7" height="6" rx="1"/><rect x="8" y="17" width="7" height="6" rx="1"/><rect x="16.5" y="17" width="7" height="6" rx="1"/><rect x="25" y="17" width="7" height="6" rx="1"/><rect x="8" y="24" width="7" height="6" rx="1"/><rect x="16.5" y="24" width="7" height="6" rx="1"/><rect x="25" y="24" width="7" height="6" rx="1"/></g>`,
  p=>`<path d="M20 4c8 0 12 4 12 12 0 4-2 7-4 9v6c0 2-2 4-4 4h-8c-2 0-4-2-4-4v-6c-2-2-4-5-4-9 0-8 4-12 12-12z" fill="${p.a}"/><circle cx="16" cy="15" r="2" fill="${K}"/><circle cx="24" cy="15" r="2" fill="${K}"/><ellipse cx="20" cy="19" rx="2" ry="1.4" fill="${p.b}"/><path d="M14 27h12" stroke="${p.b}" stroke-width="1.5" opacity=".5"/><circle cx="14" cy="10" r="2.5" fill="${p.c}" opacity=".6"/>`,
  p=>`<rect x="12" y="4" width="16" height="24" rx="8" fill="${p.a}"/><rect x="14" y="6" width="5" height="18" rx="2.5" fill="${p.c}" opacity=".5"/><rect x="18.5" y="28" width="3" height="9" rx="1.5" fill="#ead3b5"/><path d="M12 14h16" stroke="${p.b}" stroke-width="1" opacity=".4"/>`,
  p=>`<rect x="6" y="20" width="28" height="14" rx="3" fill="${p.a}"/><path d="M6 22q4 4 8 0t8 0 8 0 4 0" stroke="${p.c}" stroke-width="3" fill="none"/><ellipse cx="20" cy="20" rx="14" ry="4" fill="${p.c}"/><path d="M13 18v-6M20 17v-7M27 18v-6" stroke="${W}" stroke-width="2"/><ellipse cx="13" cy="10" rx="1.5" ry="2.5" fill="#f5c518"/><ellipse cx="20" cy="8" rx="1.5" ry="2.5" fill="#f5c518"/><ellipse cx="27" cy="10" rx="1.5" ry="2.5" fill="#f5c518"/>`
]};
SET.musica={nome:'Musica',ic:'🎵',d:[
  p=>`<ellipse cx="14" cy="30" rx="6" ry="4.5" fill="${p.a}"/><path d="M19 30V6l12 4v6l-9-3" stroke="${p.a}" stroke-width="3" fill="none" stroke-linejoin="round"/>`,
  p=>`<ellipse cx="10" cy="31" rx="5" ry="3.5" fill="${p.a}"/><ellipse cx="26" cy="28" rx="5" ry="3.5" fill="${p.a}"/><path d="M14 31V8l16-4v20M14 14l16-4" stroke="${p.a}" stroke-width="3" fill="none" stroke-linejoin="round"/>`,
  p=>`<path d="M20 36c-4-8-2-16 4-20 4-3 4-9 1-12-3 4-4 10-3 16 1 7 4 12 3 18M12 24a8 8 0 1 0 12 2c0-6-8-6-8 0" stroke="${p.a}" stroke-width="2.5" fill="none" stroke-linecap="round"/><circle cx="19" cy="33" r="2.5" fill="${p.a}"/>`,
  p=>`<path d="M18 22L33 7" stroke="#a9713a" stroke-width="4" stroke-linecap="round"/><path d="M31 5l5 5" stroke="${K}" stroke-width="4" stroke-linecap="round"/><circle cx="11" cy="29" r="8.5" fill="${p.a}"/><circle cx="17" cy="23" r="6" fill="${p.a}"/><circle cx="13" cy="27" r="3" fill="${K}"/><path d="M10 30L28 12" stroke="${p.c}" stroke-width="1" opacity=".8"/><path d="M11 32L29 14" stroke="${p.c}" stroke-width="1" opacity=".8"/>`,
  p=>`<ellipse cx="20" cy="30" rx="14" ry="5" fill="${p.b}"/><path d="M6 14v16h28V14z" fill="${p.a}"/><ellipse cx="20" cy="14" rx="14" ry="5" fill="${p.c}"/><path d="M6 14l28 16M34 14L6 30" stroke="${p.b}" stroke-width="1.5"/><path d="M8 6l10 7M32 6l-10 7" stroke="${K}" stroke-width="2" stroke-linecap="round"/>`,
  p=>`<path d="M6 18h16l10-8v20l-10-8H6z" fill="${p.a}"/><rect x="4" y="16" width="4" height="8" fill="${p.b}"/><path d="M14 16v-4M18 16v-4M22 16v-4" stroke="${p.b}" stroke-width="2"/><path d="M32 10c4 4 4 16 0 20" stroke="${p.c}" stroke-width="2" fill="none"/>`,
  p=>`<rect x="4" y="8" width="32" height="24" rx="2" fill="${W}" stroke="${p.b}" stroke-width="2"/><path d="M12 8v24M20 8v24M28 8v24" stroke="${p.b}" stroke-width="1.5"/><g fill="${p.a}"><rect x="9" y="8" width="5" height="14"/><rect x="17" y="8" width="5" height="14"/><rect x="25" y="8" width="5" height="14"/></g>`,
  p=>`<path d="M8 24v-4a12 12 0 0 1 24 0v4" stroke="${p.b}" stroke-width="3" fill="none"/><rect x="4" y="22" width="9" height="12" rx="3" fill="${p.a}"/><rect x="27" y="22" width="9" height="12" rx="3" fill="${p.a}"/><rect x="6" y="25" width="5" height="6" rx="1" fill="${p.c}" opacity=".6"/><rect x="29" y="25" width="5" height="6" rx="1" fill="${p.c}" opacity=".6"/>`,
  p=>`<rect x="14" y="4" width="12" height="18" rx="6" fill="${p.a}"/><path d="M11 16a9 9 0 0 0 18 0" stroke="${p.b}" stroke-width="2.5" fill="none"/><path d="M20 25v8M14 34h12" stroke="${p.b}" stroke-width="2.5" stroke-linecap="round"/><path d="M16 8h8M16 12h8M16 16h8" stroke="${p.c}" stroke-width="1.2" opacity=".6"/>`,
  p=>`<path d="M20 6a3 3 0 0 1 3 3v1c4 2 6 6 6 11l3 6H8l3-6c0-5 2-9 6-11V9a3 3 0 0 1 3-3z" fill="${p.a}"/><circle cx="20" cy="31" r="3" fill="${p.b}"/><path d="M14 20c0-3 2-6 4-7" stroke="${p.c}" stroke-width="1.5" fill="none"/>`,
  p=>`<path d="M13 22l-4 12M27 22l4 12" stroke="${p.b}" stroke-width="3" stroke-linecap="round"/><circle cx="13" cy="15" r="8" fill="${p.a}"/><circle cx="27" cy="15" r="8" fill="${p.c}"/><g fill="${W}" opacity=".7"><circle cx="10" cy="12" r="1.2"/><circle cx="15" cy="17" r="1.2"/><circle cx="24" cy="12" r="1.2"/><circle cx="29" cy="17" r="1.2"/></g>`,
  p=>`<circle cx="20" cy="20" r="15" fill="${K}"/><circle cx="20" cy="20" r="11" fill="none" stroke="#444" stroke-width="1"/><circle cx="20" cy="20" r="8" fill="none" stroke="#444" stroke-width="1"/><circle cx="20" cy="20" r="5" fill="${p.a}"/><circle cx="20" cy="20" r="1.2" fill="${W}"/><path d="M10 12a13 13 0 0 1 6-5" stroke="#666" stroke-width="1.2" fill="none"/>`
]};
SET.natura={nome:'Natura',ic:'🌷',d:[
  p=>`<path d="M20 22v14" stroke="#2fb15d" stroke-width="2.5"/><path d="M20 30c-4 0-7-2-8-5 4 0 7 2 8 5z" fill="#2fb15d"/><path d="M11 10c0 9 4 14 9 14s9-5 9-14c-3 0-5 2-6 4-1-3-2-6-3-8-1 2-2 5-3 8-1-2-3-4-6-4z" fill="${p.a}"/><path d="M14 12c1 6 3 9 6 11" stroke="${p.c}" stroke-width="1.2" fill="none" opacity=".6"/>`,
  p=>`<path d="M20 22v14" stroke="#2fb15d" stroke-width="2.5"/>${[0,45,90,135,180,225,270,315].map(a=>`<ellipse cx="20" cy="9" rx="3.5" ry="7" fill="${p.c}" transform="rotate(${a} 20 18)"/>`).join('')}<circle cx="20" cy="18" r="5" fill="${p.a}"/>`,
  p=>`<path d="M20 24v12" stroke="#2fb15d" stroke-width="2.5"/><path d="M20 30c-4 0-7-2-8-5 4 0 7 2 8 5zM20 33c4 0 7-2 8-5-4 0-7 2-8 5z" fill="#2fb15d"/><circle cx="20" cy="15" r="10" fill="${p.a}"/><path d="M20 15c-4-3-2-8 2-7-1 3 2 5 4 3 1 4-3 7-6 4-2 3-6 2-6-2 2-1 4 0 6 2z" fill="${p.c}" opacity=".8"/>`,
  p=>`<path d="M20 26v10" stroke="#2fb15d" stroke-width="2.5"/>${[0,30,60,90,120,150,180,210,240,270,300,330].map(a=>`<ellipse cx="20" cy="6" rx="3" ry="6" fill="${p.a}" transform="rotate(${a} 20 17)"/>`).join('')}<circle cx="20" cy="17" r="6" fill="${p.b}"/><circle cx="18" cy="15" r="1.5" fill="${p.c}" opacity=".5"/>`,
  p=>`<path d="M8 32C8 14 20 6 34 6c0 16-8 26-26 26z" fill="${p.a}"/><path d="M8 32C14 24 22 16 32 8" stroke="${p.c}" stroke-width="1.8" fill="none"/><path d="M13 27l5-1M18 22l6-1M23 17l5-1" stroke="${p.c}" stroke-width="1.2" opacity=".7"/>`,
  p=>`<path d="M20 24v12" stroke="#2fb15d" stroke-width="2.5"/>${[0,90,180,270].map(a=>`<path d="M20 20c-7-3-10-9-6-12 3-2 6 1 6 4 0-3 3-6 6-4 4 3 1 9-6 12z" fill="${p.a}" transform="rotate(${a} 20 20) translate(0,-4)"/>`).join('')}<circle cx="20" cy="20" r="2" fill="${p.c}"/>`,
  p=>`<path d="M14 20h12v12a6 6 0 0 1-12 0z" fill="#ead3b5"/><path d="M4 20c0-10 7-16 16-16s16 6 16 16z" fill="${p.a}"/><g fill="${p.c}"><circle cx="12" cy="14" r="2.5"/><circle cx="22" cy="9" r="2"/><circle cx="28" cy="15" r="2.5"/><circle cx="19" cy="16" r="1.5"/></g>`,
  p=>`<rect x="15" y="6" width="10" height="26" rx="5" fill="${p.a}"/><path d="M6 14a4 4 0 0 1 8 0v8h-8zM34 18a4 4 0 0 0-8 0v6h8z" fill="${p.a}"/><path d="M12 22h4M26 24h2" stroke="${p.a}" stroke-width="3"/><path d="M20 8v22M18 12l-2-2M22 16l2-2M18 22l-2-2" stroke="${p.c}" stroke-width="1.2" opacity=".7"/><rect x="10" y="32" width="20" height="4" rx="2" fill="${p.b}"/>`,
  p=>`<rect x="18" y="26" width="4" height="10" fill="#a9713a"/><path d="M20 4l10 12h-5l7 9h-6l6 8H8l6-8H8l7-9h-5z" fill="${p.a}"/><path d="M20 10l4 6M20 18l5 7" stroke="${p.c}" stroke-width="1.2" opacity=".6"/>`,
  p=>`<path d="M20 14c-7 0-10 5-9 11 1 7 5 11 9 11s8-4 9-11c1-6-2-11-9-11z" fill="#a9713a"/><path d="M8 14c0-5 5-8 12-8s12 3 12 8c0 2-24 2-24 0z" fill="${p.a}"/><path d="M20 6V2" stroke="${p.b}" stroke-width="2"/><path d="M10 13h20" stroke="${p.b}" stroke-width="1" opacity=".5"/><ellipse cx="16" cy="24" rx="2" ry="4" fill="${W}" opacity=".3"/>`,
  p=>`<path d="M20 4v4" stroke="${p.b}" stroke-width="2"/><path d="M20 8c-7 0-11 7-11 16 0 7 5 12 11 12s11-5 11-12c0-9-4-16-11-16z" fill="${p.b}"/><g fill="${p.a}"><ellipse cx="20" cy="12" rx="3" ry="2"/><ellipse cx="15" cy="16" rx="3" ry="2"/><ellipse cx="25" cy="16" rx="3" ry="2"/><ellipse cx="20" cy="20" rx="3" ry="2"/><ellipse cx="14" cy="24" rx="3" ry="2"/><ellipse cx="26" cy="24" rx="3" ry="2"/><ellipse cx="20" cy="28" rx="3" ry="2"/><ellipse cx="15" cy="31" rx="3" ry="2"/><ellipse cx="25" cy="31" rx="3" ry="2"/></g>`,
  p=>`<path d="M20 36C20 20 24 10 34 4" stroke="${p.b}" stroke-width="2.5" fill="none"/>${[0,1,2,3,4,5].map(i=>`<path d="M${20+i*1.6} ${32-i*4.5}c-8-1-10-4-12-8 6 0 10 3 12 8zM${21+i*1.6} ${30-i*4.5}c3-6 7-8 12-8-1 5-5 8-12 8z" fill="${p.a}" opacity="${0.95-i*0.08}"/>`).join('')}`
]};
SET.mostri={nome:'Mostri',ic:'👾',d:(()=>{
  const corpi=[
    (p)=>`<path d="M8 36V18a12 12 0 0 1 24 0v18l-4-3-4 3-4-3-4 3-4-3z" fill="${p.a}"/>`,
    (p)=>`<circle cx="20" cy="22" r="13" fill="${p.a}"/>`,
    (p)=>`<rect x="7" y="9" width="26" height="26" rx="6" fill="${p.a}"/>`,
    (p)=>`<path d="M20 6l14 10-4 18H10L6 16z" fill="${p.a}"/>`
  ];
  const occhi=[
    ()=>`<circle cx="20" cy="20" r="6" fill="${W}"/>${eye(20,20,3)}`,
    ()=>`<circle cx="14" cy="19" r="4" fill="${W}"/><circle cx="26" cy="19" r="4" fill="${W}"/>${eye(14,19,2)}${eye(26,19,2)}`,
    ()=>`<circle cx="13" cy="18" r="3" fill="${W}"/><circle cx="20" cy="15" r="3.5" fill="${W}"/><circle cx="27" cy="18" r="3" fill="${W}"/>${eye(13,18,1.5)}${eye(20,15,1.8)}${eye(27,18,1.5)}`
  ];
  const bocche=[
    (p)=>`<path d="M14 27q6 5 12 0" stroke="${K}" stroke-width="1.8" fill="none"/>`,
    (p)=>`<path d="M13 26h14l-2 5h-10z" fill="${K}"/><path d="M15 26l2 3 2-3 2 3 2-3 2 3 2-3" stroke="${W}" stroke-width="1.2" fill="none"/>`,
    (p)=>`<ellipse cx="20" cy="28" rx="3" ry="2.2" fill="${K}"/>`,
    (p)=>`<path d="M15 28q5-4 10 0" stroke="${K}" stroke-width="1.8" fill="none"/><path d="M17 27v3M23 27v3" stroke="${W}" stroke-width="1.5"/>`
  ];
  const extra=[
    (p)=>`<path d="M12 10l-3-7 6 4zM28 10l3-7-6 4z" fill="${p.b}"/>`,
    (p)=>`<path d="M20 8V3" stroke="${p.b}" stroke-width="2"/><circle cx="20" cy="2.5" r="2" fill="${p.c}"/>`,
    (p)=>`<path d="M8 14q-4 2-5 6M32 14q4 2 5 6" stroke="${p.b}" stroke-width="3" stroke-linecap="round" fill="none"/>`,
    (p)=>``
  ];
  const out=[];for(let i=0;i<12;i++){const c=corpi[i%4],o=occhi[i%3],b=bocche[(i*2)%4],e=extra[(i+1)%4];out.push(p=>c(p)+e(p)+o(p)+b(p))}return out})()};
SET.bandiere={nome:'Bandiere',ic:'🏁',d:[
  p=>`<rect x="5" y="8" width="30" height="24" rx="2" fill="${p.a}"/><rect x="5" y="16" width="30" height="8" fill="${W}"/>`,
  p=>`<rect x="5" y="8" width="30" height="24" rx="2" fill="${p.a}"/><rect x="16" y="8" width="8" height="24" fill="${W}"/>`,
  p=>`<rect x="5" y="8" width="30" height="24" rx="2" fill="${p.a}"/><path d="M5 8l30 24M35 8L5 32" stroke="${W}" stroke-width="4"/>`,
  p=>`<rect x="5" y="8" width="30" height="24" rx="2" fill="${p.a}"/><rect x="17" y="8" width="6" height="24" fill="${W}"/><rect x="5" y="17" width="30" height="6" fill="${W}"/>`,
  p=>`<rect x="5" y="8" width="30" height="24" rx="2" fill="${p.a}"/><circle cx="20" cy="20" r="7" fill="${W}"/>`,
  p=>`<rect x="5" y="8" width="30" height="24" rx="2" fill="${p.a}"/><path d="M5 8l15 12L5 32z" fill="${W}"/>`,
  p=>`<rect x="5" y="8" width="30" height="24" rx="2" fill="${W}"/>${[0,1,2].map(r=>[0,1,2].map(c=>((r+c)%2?`<rect x="${5+c*10}" y="${8+r*8}" width="10" height="8" fill="${p.a}"/>`:'')).join('')).join('')}`,
  p=>`<rect x="5" y="8" width="30" height="24" rx="2" fill="${p.a}"/><path d="M5 8h30L20 20z" fill="${W}"/>`,
  p=>`<rect x="5" y="8" width="30" height="24" rx="2" fill="${p.a}"/>${st(20,20,8,W)}`,
  p=>`<rect x="5" y="8" width="30" height="24" rx="2" fill="${p.a}"/><path d="M5 8l30 24V8z" fill="${W}"/>`,
  p=>`<rect x="5" y="8" width="30" height="24" rx="2" fill="${p.a}"/><rect x="5" y="12" width="30" height="4" fill="${W}"/><rect x="5" y="20" width="30" height="4" fill="${W}"/><rect x="5" y="28" width="30" height="4" fill="${W}"/>`,
  p=>`<rect x="5" y="8" width="30" height="24" rx="2" fill="${p.a}"/><path d="M20 10l10 10-10 10-10-10z" fill="${W}"/>`
]};
SET.veicoli={nome:'Veicoli',ic:'🚗',d:[
  p=>`<path d="M4 26v-6l5-8h20l6 8h2v6z" fill="${p.a}"/><path d="M11 14h7v6H7zM20 14h8l4 6H20z" fill="#bfeafc"/><circle cx="11" cy="27" r="4" fill="${K}"/><circle cx="29" cy="27" r="4" fill="${K}"/><circle cx="11" cy="27" r="1.6" fill="${p.c}"/><circle cx="29" cy="27" r="1.6" fill="${p.c}"/>`,
  p=>`<rect x="4" y="8" width="32" height="20" rx="3" fill="${p.a}"/><g fill="#bfeafc"><rect x="7" y="11" width="6" height="7" rx="1"/><rect x="15" y="11" width="6" height="7" rx="1"/><rect x="23" y="11" width="6" height="7" rx="1"/><rect x="31" y="11" width="3" height="7" rx="1"/></g><circle cx="11" cy="29" r="3.5" fill="${K}"/><circle cx="29" cy="29" r="3.5" fill="${K}"/><rect x="6" y="22" width="28" height="2" fill="${p.c}"/>`,
  p=>`<circle cx="10" cy="26" r="7" fill="none" stroke="${K}" stroke-width="2.5"/><circle cx="30" cy="26" r="7" fill="none" stroke="${K}" stroke-width="2.5"/><path d="M10 26l6-12h10l4 12M16 14l-3-3h6M20 26l-4-12" stroke="${p.a}" stroke-width="2.5" fill="none" stroke-linejoin="round"/><path d="M24 11h5" stroke="${p.a}" stroke-width="2.5"/>`,
  p=>`<path d="M6 30V12a6 6 0 0 1 6-6h16a6 6 0 0 1 6 6v18z" fill="${p.a}"/><rect x="10" y="10" width="20" height="8" rx="2" fill="#bfeafc"/><circle cx="20" cy="24" r="3" fill="#f5c518"/><path d="M4 32h32" stroke="${K}" stroke-width="3"/><circle cx="12" cy="32" r="2.5" fill="${K}"/><circle cx="28" cy="32" r="2.5" fill="${K}"/>`,
  p=>`<path d="M4 22l28-10c3-1 5 1 4 3l-4 3-14 6-6 8-4-1 3-6-7-1z" fill="${p.a}"/><path d="M14 18l6-10h4l-4 11" fill="${p.c}"/><path d="M30 14l4-2" stroke="${p.b}" stroke-width="1.5"/>`,
  p=>`<path d="M6 26h28l-4 7H10z" fill="${p.a}"/><rect x="12" y="18" width="14" height="8" rx="1" fill="${p.c}"/><path d="M18 6v12" stroke="${p.b}" stroke-width="2"/><path d="M20 20h-4M22 20h3" stroke="${p.b}" stroke-width="1.5"/><path d="M2 36q9-3 18 0 9-3 18 0" stroke="${p.b}" stroke-width="2" fill="none"/>`,
  p=>`<path d="M6 8h28" stroke="${p.b}" stroke-width="2.5"/><path d="M20 8v6" stroke="${p.b}" stroke-width="2.5"/><path d="M8 22c0-6 5-9 12-9s12 3 12 9v3H8z" fill="${p.a}"/><rect x="18" y="14" width="10" height="6" rx="2" fill="#bfeafc"/><path d="M8 24h-4v-5" stroke="${p.a}" stroke-width="2.5" fill="none"/><path d="M12 25l-2 6h20l-2-6M8 31h24" stroke="${p.b}" stroke-width="2"/>`,
  p=>`<rect x="4" y="10" width="20" height="16" rx="2" fill="${p.a}"/><rect x="24" y="16" width="12" height="10" rx="2" fill="${p.c}"/><rect x="26" y="18" width="6" height="5" rx="1" fill="#bfeafc"/><circle cx="10" cy="28" r="3.5" fill="${K}"/><circle cx="30" cy="28" r="3.5" fill="${K}"/>`,
  p=>`<path d="M8 32h8l10-20h8" stroke="${p.a}" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="9" cy="32" r="4" fill="${K}"/><circle cx="30" cy="32" r="4" fill="${K}"/><path d="M30 12h-4" stroke="${p.b}" stroke-width="3"/><path d="M14 32h8" stroke="${p.b}" stroke-width="3"/>`,
  p=>`<circle cx="10" cy="27" r="8" fill="${K}"/><circle cx="10" cy="27" r="4" fill="${p.c}"/><circle cx="30" cy="30" r="5" fill="${K}"/><circle cx="30" cy="30" r="2" fill="${p.c}"/><path d="M14 20h12l4 8h-8" fill="${p.a}"/><rect x="16" y="10" width="8" height="10" rx="1" fill="${p.a}"/><path d="M24 20h5l1 4h-4" fill="${p.b}"/><path d="M28 10v10" stroke="${p.b}" stroke-width="2"/>`,
  p=>`<path d="M20 4c-9 0-13 7-13 13 0 7 8 12 10 16h6c2-4 10-9 10-16 0-6-4-13-13-13z" fill="${p.a}"/><path d="M20 4c-3 0-5 7-5 13 0 7 3 12 4 16h2c1-4 4-9 4-16 0-6-2-13-5-13z" fill="${p.c}"/><rect x="16" y="33" width="8" height="4" rx="1" fill="#a9713a"/>`,
  p=>`<ellipse cx="18" cy="22" rx="14" ry="8" fill="${p.a}"/><rect x="14" y="10" width="8" height="6" rx="1" fill="${p.a}"/><rect x="17" y="6" width="2" height="4" fill="${p.b}"/><path d="M32 22l6-5v10z" fill="${p.b}"/><circle cx="10" cy="22" r="2" fill="#bfeafc"/><circle cx="17" cy="23" r="2" fill="#bfeafc"/><circle cx="24" cy="22" r="2" fill="#bfeafc"/>`
]};
SET.sport={nome:'Sport',ic:'⚽',d:[
  p=>`<circle cx="20" cy="20" r="14" fill="${W}" stroke="${K}" stroke-width="1.5"/>${poly(20,20,5,5,K)}<path d="M20 15V8M24.8 18.5l6.5-2.5M23 23.5l4.5 5.5M17 23.5l-4.5 5.5M15.2 18.5l-6.5-2.5" stroke="${K}" stroke-width="1.5"/>`,
  p=>`<circle cx="20" cy="20" r="14" fill="${p.a}"/><path d="M6 20h28M20 6v28M9 10c7 4 15 4 22 0M9 30c7-4 15-4 22 0" stroke="${K}" stroke-width="1.6" fill="none"/>`,
  p=>`<circle cx="20" cy="20" r="14" fill="${p.a}"/><path d="M9 10c8 3 8 17 0 20M31 10c-8 3-8 17 0 20" stroke="${W}" stroke-width="2" fill="none"/>`,
  p=>`<circle cx="20" cy="20" r="14" fill="${W}" stroke="#aaa" stroke-width="1"/><path d="M12 8c-4 7-4 17 0 24M28 8c4 7 4 17 0 24" stroke="#e63946" stroke-width="1.5" fill="none"/><path d="M12 12l3 1M12 16l3 1M12 20l3 1M12 24l3 1M12 28l3 1M28 12l-3 1M28 16l-3 1M28 20l-3 1M28 24l-3 1M28 28l-3 1" stroke="#e63946" stroke-width="1.2"/>`,
  p=>`<circle cx="20" cy="20" r="14" fill="${p.c}"/><path d="M6 20c6-4 10-12 10-14M20 34c0-6 6-12 14-14M12 31c6-2 14-8 14-16" stroke="${p.a}" stroke-width="2.5" fill="none"/>`,
  p=>`<ellipse cx="20" cy="20" rx="16" ry="10" transform="rotate(-30 20 20)" fill="${p.a}"/><path d="M14 24l12-8" stroke="${W}" stroke-width="2"/><path d="M16 21l1 2M18 20l1 2M20 19l1 2M22 17l1 2" stroke="${W}" stroke-width="1.5"/>`,
  p=>`<circle cx="20" cy="20" r="14" fill="${W}" stroke="#bbb" stroke-width="1.5"/><g fill="#ddd"><circle cx="14" cy="14" r="1.6"/><circle cx="20" cy="12" r="1.6"/><circle cx="26" cy="14" r="1.6"/><circle cx="12" cy="20" r="1.6"/><circle cx="20" cy="20" r="1.6"/><circle cx="28" cy="20" r="1.6"/><circle cx="14" cy="26" r="1.6"/><circle cx="20" cy="28" r="1.6"/><circle cx="26" cy="26" r="1.6"/></g>`,
  p=>`<circle cx="20" cy="20" r="14" fill="${p.a}"/><circle cx="16" cy="13" r="2" fill="${K}"/><circle cx="22" cy="11" r="2" fill="${K}"/><circle cx="23" cy="17" r="2" fill="${K}"/><circle cx="14" cy="19" r="3" fill="${W}" opacity=".3"/>`,
  p=>`<circle cx="20" cy="20" r="14" fill="${K}"/><circle cx="20" cy="20" r="7" fill="${W}"/><text x="20" y="24" font-size="10" font-weight="800" text-anchor="middle" fill="${K}" font-family="sans-serif">8</text>`,
  p=>`<circle cx="24" cy="12" r="7" fill="${W}" stroke="#bbb" stroke-width="1"/><ellipse cx="14" cy="26" rx="8" ry="9" transform="rotate(35 14 26)" fill="${p.a}"/><path d="M19 33l6 4" stroke="#a9713a" stroke-width="3" stroke-linecap="round"/><ellipse cx="14" cy="26" rx="5" ry="6" transform="rotate(35 14 26)" fill="none" stroke="${p.b}" stroke-width="1"/>`,
  p=>`<ellipse cx="20" cy="22" rx="14" ry="6" fill="${K}"/><path d="M6 22v-4c0-3 6-6 14-6s14 3 14 6v4" fill="${p.a}"/><ellipse cx="20" cy="18" rx="14" ry="6" fill="${p.c}"/>`,
  p=>`<circle cx="20" cy="30" r="5" fill="${W}" stroke="#bbb" stroke-width="1"/><path d="M14 26L10 8h4l4 16M26 26l4-18h-4l-4 16M20 26l-1-18h2l1 18" fill="${p.a}"/><path d="M10 8h20" stroke="${p.b}" stroke-width="2"/>`
]};
SET.insetti={nome:'Insetti',ic:'🐞',d:[
  p=>`<ellipse cx="20" cy="22" rx="9" ry="12" fill="${p.a}"/><circle cx="20" cy="9" r="5" fill="${K}"/><path d="M20 22V10" stroke="${K}" stroke-width="1.5"/><g fill="${K}"><circle cx="14" cy="18" r="2"/><circle cx="26" cy="18" r="2"/><circle cx="16" cy="26" r="2"/><circle cx="24" cy="26" r="2"/><circle cx="20" cy="31" r="1.5"/></g><path d="M16 5l-3-3M24 5l3-3" stroke="${K}" stroke-width="1.2"/>`,
  p=>`<ellipse cx="20" cy="20" rx="8" ry="12" fill="#f5c518"/><path d="M12 14h16M12 20h16M12 26h16" stroke="${K}" stroke-width="3"/><circle cx="20" cy="8" r="4.5" fill="${K}"/><ellipse cx="11" cy="16" rx="7" ry="3.5" transform="rotate(-20 11 16)" fill="${p.c}" opacity=".8"/><ellipse cx="29" cy="16" rx="7" ry="3.5" transform="rotate(20 29 16)" fill="${p.c}" opacity=".8"/><path d="M18 4l-2-3M22 4l2-3" stroke="${K}" stroke-width="1.2"/>`,
  p=>`<path d="M20 20C14 8 4 8 6 16c1 6 8 7 14 4zM20 20c6-12 16-12 14-4-1 6-8 7-14 4zM20 20c-6 12-14 10-13 4 1-5 8-6 13-4zM20 20c6 12 14 10 13 4-1-5-8-6-13-4z" fill="${p.a}"/><circle cx="10" cy="15" r="2.5" fill="${p.c}"/><circle cx="30" cy="15" r="2.5" fill="${p.c}"/><circle cx="10" cy="27" r="1.5" fill="${p.c}"/><circle cx="30" cy="27" r="1.5" fill="${p.c}"/><rect x="19" y="12" width="2" height="16" rx="1" fill="${K}"/><path d="M19 12l-3-5M21 12l3-5" stroke="${K}" stroke-width="1.2"/>`,
  p=>`<circle cx="20" cy="10" r="4" fill="${p.a}"/><circle cx="20" cy="19" r="4.5" fill="${p.a}"/><ellipse cx="20" cy="30" rx="5" ry="6" fill="${p.a}"/><path d="M16 17l-6-3M24 17l6-3M15 21l-7 2M25 21l7 2M16 30l-6 4M24 30l6 4" stroke="${K}" stroke-width="1.3"/><path d="M18 7l-2-4M22 7l2-4" stroke="${K}" stroke-width="1.2"/>`,
  p=>`<path d="M20 12v24" stroke="${p.b}" stroke-width="3" stroke-linecap="round"/><circle cx="20" cy="9" r="4" fill="${p.a}"/><ellipse cx="11" cy="16" rx="9" ry="3" fill="${p.c}" opacity=".85"/><ellipse cx="29" cy="16" rx="9" ry="3" fill="${p.c}" opacity=".85"/><ellipse cx="11" cy="22" rx="8" ry="2.6" fill="${p.c}" opacity=".7"/><ellipse cx="29" cy="22" rx="8" ry="2.6" fill="${p.c}" opacity=".7"/><circle cx="18" cy="8" r="1.2" fill="${K}"/><circle cx="22" cy="8" r="1.2" fill="${K}"/>`,
  p=>`<path d="M6 30h22c3 0 5-1 5-3s-2-3-4-3H17c-1 0-2-1-2-2" stroke="${p.b}" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="25" cy="18" r="9" fill="${p.a}"/><circle cx="25" cy="18" r="5.5" fill="${p.c}"/><circle cx="25" cy="18" r="2.5" fill="${p.a}"/><path d="M9 25l-2-7M13 25l2-7" stroke="${p.b}" stroke-width="2" stroke-linecap="round"/><circle cx="7" cy="17" r="1.6" fill="${K}"/><circle cx="15" cy="17" r="1.6" fill="${K}"/>`,
  p=>`<circle cx="20" cy="22" r="9" fill="${K}"/><path d="M11 22l-8-6M11 24l-8 3M29 22l8-6M29 24l8 3M14 29l-5 6M26 29l5 6M16 15l-4-8M24 15l4-8" stroke="${K}" stroke-width="2" stroke-linecap="round"/><circle cx="20" cy="22" r="5" fill="${p.a}"/><circle cx="17" cy="20" r="1.2" fill="${W}"/><circle cx="23" cy="20" r="1.2" fill="${W}"/>`,
  p=>`<path d="M8 28c0-8 6-14 14-14h8l4-4-2 8c0 6-6 12-12 12H8z" fill="${p.a}"/><path d="M10 28l-4 6M16 30l-2 6M26 28l6-10" stroke="${p.b}" stroke-width="2" stroke-linecap="round"/><circle cx="29" cy="15" r="1.4" fill="${K}"/><path d="M30 10l6-5" stroke="${p.b}" stroke-width="1.2"/>`,
  p=>`<g fill="${p.a}"><circle cx="8" cy="26" r="4"/><circle cx="14" cy="24" r="4.5"/><circle cx="20" cy="22" r="4.5"/><circle cx="26" cy="20" r="4.5"/><circle cx="32" cy="16" r="5"/></g><circle cx="30" cy="15" r="1.3" fill="${K}"/><circle cx="34" cy="14" r="1.3" fill="${K}"/><path d="M30 11l-2-4M34 10l2-4" stroke="${K}" stroke-width="1.2"/><path d="M8 30v3M14 29v4M20 27v4M26 25v4" stroke="${p.b}" stroke-width="1.5"/>`,
  p=>`<path d="M20 20c-8-10-16-8-14 0 1 4 8 6 14 2zM20 20c8-10 16-8 14 0-1 4-8 6-14 2zM20 20c-6 8-12 10-12 6s6-8 12-6zM20 20c6 8 12 10 12 6s-6-8-12-6z" fill="${p.a}" opacity=".85"/><ellipse cx="20" cy="22" rx="2" ry="8" fill="${K}"/><path d="M19 14l-3-5M21 14l3-5" stroke="${K}" stroke-width="1.2"/>`,
  p=>`<ellipse cx="20" cy="14" rx="5" ry="7" fill="${K}"/><ellipse cx="20" cy="26" rx="6" ry="8" fill="#f5c518"/><ellipse cx="20" cy="29" rx="4" ry="5" fill="${p.c}"/><path d="M15 12l-6-4M25 12l6-4M15 18l-7 1M25 18l7 1" stroke="${K}" stroke-width="1.3"/><circle cx="18" cy="12" r="1.2" fill="${W}"/><circle cx="22" cy="12" r="1.2" fill="${W}"/>${st(8,30,2.5,p.c)}${st(32,30,2.5,p.c)}`,
  p=>`<ellipse cx="20" cy="20" rx="4" ry="11" fill="${p.a}"/><circle cx="20" cy="8" r="3" fill="${p.a}"/><path d="M16 14l-10-6M24 14l10-6M16 20l-11 0M24 20l11 0M16 26l-9 6M24 26l9 6" stroke="${K}" stroke-width="1.2"/><ellipse cx="12" cy="18" rx="7" ry="2.5" transform="rotate(-25 12 18)" fill="${p.c}" opacity=".6"/><ellipse cx="28" cy="18" rx="7" ry="2.5" transform="rotate(25 28 18)" fill="${p.c}" opacity=".6"/>`
]};
const SET_IDS=Object.keys(SET);
const SKIN_SCURE={notte:1,neon:1,oro:1,lava:1,galassia:1,mezzanotte:1,tramonto:1,retro:1,prugna:1,abisso:1}; // grafiche con sfondo scuro
const skinScura=()=>!!SKIN_SCURE[document.body.dataset.skin];

// ---- disegno di un'icona (viewBox quadrato) ----
function icona(setId,idx,col){const s=SET[setId];if(!s)return sq('');const p=typeof col==='object'?col:COLORI[(col||0)%COLORI.length];return sq(s.d[idx%s.d.length](p))}

// ---- Mahjong: un set di facce per livello ----
// codice faccia: "setId:idx:colIdx" (3 varianti di colore per disegno → 36 facce), oppure quelle classiche di Tessere
const SFONDI_FACCIA=[ // stile delle tessere: faccia, lato, inchiostro bordo
  {id:'avorio',f1:'#fffdf6',f2:'#f6efd9',f3:'#ece1c4',s1:'#e2cfa8',s2:'#b89a68'},
  {id:'giada',f1:'#e9f7ee',f2:'#cfeedb',f3:'#b4dfc3',s1:'#8fc9a4',s2:'#4f8f66'},
  {id:'notte',f1:'#3a4160',f2:'#2b3150',f3:'#1f2440',s1:'#262b45',s2:'#12152a'},
  {id:'legno',f1:'#f1d9b5',f2:'#e2bf8f',f3:'#cfa36d',s1:'#b98656',s2:'#7a5230'},
  {id:'marmo',f1:'#ffffff',f2:'#eef0f5',f3:'#dde1ea',s1:'#c5cad6',s2:'#8e95a6'},
  {id:'rosa',f1:'#fff3f8',f2:'#fde0ee',f3:'#f9c9e0',s1:'#f0a9cd',s2:'#b96390'},
  {id:'cielo',f1:'#f2fbff',f2:'#dcf3fd',f3:'#bfe6f8',s1:'#9fd3ef',s2:'#4f93b6'},
  {id:'nero',f1:'#2a2a2e',f2:'#1d1d21',f3:'#121214',s1:'#3a3a40',s2:'#0a0a0c'},
  {id:'lavanda',f1:'#f7f3ff',f2:'#eadff8',f3:'#d9c9f0',s1:'#c3aee6',s2:'#8465b5'},
  {id:'sabbia',f1:'#fff7e6',f2:'#f6e6c4',f3:'#e9d3a3',s1:'#dcbf85',s2:'#a3843f'}
];
const TAVOLI=[ // panno del tavolo: tre colori + cornice
  {id:'feltro',c1:'#2f8f5b',c2:'#1f6e45',c3:'#174f33',b1:'#a97444',b2:'#5a351a',tx:'feltro'},
  {id:'blu',c1:'#2d5f9e',c2:'#1f4578',c3:'#142e52',b1:'#8a8f9c',b2:'#3c404a',tx:'feltro'},
  {id:'bordeaux',c1:'#8a2a3e',c2:'#661c2e',c3:'#3f0f1c',b1:'#c9a35a',b2:'#7a5a1a',tx:'velluto'},
  {id:'quercia',c1:'#9a6a3c',c2:'#7a4f28',c3:'#56351a',b1:'#3f2412',b2:'#1f1008',tx:'legno'},
  {id:'ardesia',c1:'#4b5563',c2:'#374151',c3:'#1f2937',b1:'#9ca3af',b2:'#4b5563',tx:'pietra'},
  {id:'acqua',c1:'#1aa9c9',c2:'#1282a0',c3:'#0b5a72',b1:'#e2cfa8',b2:'#a37b48',tx:'onde'},
  {id:'prugna',c1:'#6d3fa0',c2:'#532c7f',c3:'#361b55',b1:'#c9a35a',b2:'#7a5a1a',tx:'velluto'},
  {id:'carta',c1:'#efe6d4',c2:'#e3d6bd',c3:'#d2c1a1',b1:'#8a6a44',b2:'#4f3a22',tx:'carta'},
  {id:'notte',c1:'#1b2140',c2:'#141833',c3:'#0b0e22',b1:'#5c6a9a',b2:'#2a3157',tx:'stelle'},
  {id:'corallo',c1:'#e8735a',c2:'#c75540',c3:'#8f3626',b1:'#fff1e0',b2:'#c9a98a',tx:'feltro'},
  {id:'muschio',c1:'#5f7d3a',c2:'#48602b',c3:'#2f4019',b1:'#8a6a44',b2:'#4f3a22',tx:'legno'},
  {id:'ghiaccio',c1:'#cfe9f7',c2:'#b4d8ee',c3:'#86b7d6',b1:'#ffffff',b2:'#9fbfd4',tx:'pietra'}
];
// scelta del set per un livello, mai uguale a quella del livello prima (così due livelli di fila non si somigliano)
function sceltaSet(chiave,level){const r=window.Giochi.rng(chiave+':'+level);let i=Math.floor(r()*SET_IDS.length);if(level>1){const r0=window.Giochi.rng(chiave+':'+(level-1));const i0=Math.floor(r0()*SET_IDS.length);if(i===i0)i=(i+1+Math.floor(r()*(SET_IDS.length-1)))%SET_IDS.length}return SET_IDS[i]}
function pesca(r,arr,n){const idx=r.shuffle([...Array(arr.length).keys()]).slice(0,n);return idx.map(i=>arr[i])}
function setMahjong(level){
  const r=window.Giochi.rng('mahjong-tema:'+level);
  // i primi livelli con le facce classiche e poi un set diverso ogni livello; le classiche tornano ogni tanto
  const classico=level<=2||r()<0.14;
  let out;
  if(classico){const T=window.Tessere;out={id:'classico',nome:'Classico',codes:T.FACCE.slice(),svg:T.svg,titolo:T.nome}}
  else{
    const sid=sceltaSet('mahjong-set',level);const s=SET[sid];
    const cols=pesca(r,COLORI,3);const codes=[];
    for(let c=0;c<3;c++)for(let i=0;i<s.d.length;i++)codes.push(sid+':'+i+':'+COLORI.indexOf(cols[c]));
    out={id:sid,nome:s.nome,codes,svg:(code)=>{const [a,i,c]=code.split(':');const col=COLORI[+c]||COLORI[0];return`<svg viewBox="0 0 44 60" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="4" y="6" width="36" height="48" rx="8" fill="${col.a}" opacity=".16"/><rect x="4" y="46" width="36" height="8" rx="4" fill="${col.a}" opacity=".55"/><g transform="translate(2,8)">${SET[a].d[+i](col)}</g></svg>`},
      titolo:(code)=>{const [a,i,c]=code.split(':');return SET[a].nome.toLowerCase()+' '+(+i+1)+' '+(COLORI[+c]||COLORI[0]).id}}
  }
  // stile di tessere e tavolo: anch'essi cambiano di livello in livello
  const faccia=level<=1?SFONDI_FACCIA[0]:r.pick(SFONDI_FACCIA);
  const tavolo=level<=1?TAVOLI[0]:r.pick(TAVOLI);
  out.faccia=faccia;out.tavolo=tavolo;out.chiaro=(faccia.id==='notte'||faccia.id==='nero');
  return out;
}
function applicaMahjong(tema,wrap,board){
  const f=tema.faccia,t=tema.tavolo;const s=wrap.style;
  s.setProperty('--mjf1',f.f1);s.setProperty('--mjf2',f.f2);s.setProperty('--mjf3',f.f3);s.setProperty('--mjs1',f.s1);s.setProperty('--mjs2',f.s2);
  s.setProperty('--mjc1',t.c1);s.setProperty('--mjc2',t.c2);s.setProperty('--mjc3',t.c3);s.setProperty('--mjb1',t.b1);s.setProperty('--mjb2',t.b2);
  wrap.dataset.tx=t.tx;wrap.classList.toggle('mj-scuro',!!tema.chiaro);
}

// ---- Queens: palette di regioni + simbolo della "regina" per livello ----
const PALETTE_Q=[
  {id:'pastello',c:['#fecaca','#fed7aa','#fef08a','#bbf7d0','#a5f3fc','#c7d2fe','#f5d0fe','#fbcfe8','#d9f99d','#e7e5e4','#bae6fd'],s:['#7f1d1d','#7c2d12','#713f12','#14532d','#164e63','#312e81','#701a75','#831843','#365314','#44403c','#0c4a6e']},
  {id:'caramella',c:['#ff9eb5','#ffd166','#9ef0d0','#8ecbff','#c9a7ff','#ffb28a','#b5f58b','#ffe28a','#a7e9ff','#f9b8ff','#ffc9c9'],s:['#8f1d3d','#8a5a00','#0f6b4e','#124a80','#4a2a8f','#8a3a10','#3d6b10','#8a6a00','#0f5a75','#7a1a85','#8a2f2f']},
  {id:'terra',c:['#e9d8c4','#d9c3a5','#f1e3cf','#cbbfa0','#e3cdb3','#bfae8e','#f4e9d6','#d4b996','#e6d5b8','#c7b89c','#efdcc0'],s:['#5a3e2b','#4a3220','#6b4a30','#3f3a22','#5c4430','#3a3420','#6e5538','#4e3a24','#5a4a30','#3c3522','#634a2e']},
  {id:'tropicale',c:['#ffd166','#06d6a0','#ef476f','#118ab2','#ffa5ab','#8ac926','#ff9e00','#4cc9f0','#f72585','#b5e48c','#ffba08'],s:['#7a5a00','#005a40','#7a1030','#0a4a60','#7a3040','#3a6010','#7a4a00','#105a70','#7a0a40','#4a6a20','#7a5a00']},
  {id:'gelato',c:['#fde2e4','#fad2e1','#e2ece9','#bee1e6','#f0efeb','#dfe7fd','#cddafd','#fff1e6','#fae1dd','#e8e8e4','#d8e2dc'],s:['#8a4a50','#8a3a60','#3a6a60','#2a6a75','#6a6a5a','#3a4a8a','#2a3a8a','#8a5a30','#8a4a40','#5a5a4a','#3a5a4a']},
  {id:'vivace',c:['#ff595e','#ffca3a','#8ac926','#1982c4','#6a4c93','#ff924c','#52a675','#c5ca30','#4267ac','#b47ece','#ff7aa2'],s:['#8a1a1e','#8a6a00','#3a6a10','#0a4a7a','#3a2060','#8a4a10','#1a5a35','#5a5a10','#1a2a60','#5a2a7a','#8a2a4a']},
  {id:'acquerello',c:['#cfe8ff','#ffe4cf','#e2ffd9','#ffd9ec','#eadcff','#fff5c2','#d2f8f4','#ffd6d6','#e7e7ff','#f3ffd1','#ffe0f7'],s:['#2a5a8a','#8a4a1a','#2a6a2a','#8a2a5a','#4a2a8a','#7a6a10','#1a6a60','#8a3030','#3a3a8a','#4a6a10','#8a2a7a']},
  {id:'autunno',c:['#f8c471','#e59866','#f5b7b1','#d7bde2','#f9e79f','#d5dbdb','#edbb99','#abebc6','#f0b27a','#aed6f1','#fad7a0'],s:['#8a4a00','#7a3a10','#8a2a2a','#5a2a7a','#7a6a00','#3a4a4a','#7a4a20','#1a6a3a','#8a4a10','#1a4a7a','#8a5a10']},
  {id:'neon',c:['#ff2975','#f8ee00','#00f0ff','#39ff14','#ff6c11','#c04dff','#00ffa3','#ff4de8','#4dff88','#ffa64d','#4d9bff'],s:['#8a0a3a','#8a8a00','#007a85','#1a8a0a','#8a3a00','#5a0a8a','#008a50','#8a0a7a','#0a8a3a','#8a5a0a','#0a4a8a']},
  {id:'bosco',c:['#b7e4c7','#95d5b2','#d8f3dc','#74c69d','#cfe1b9','#e9f5db','#a3b18a','#dad7cd','#b5c99a','#c7f9cc','#97dfa6'],s:['#1b4332','#2d6a4f','#1b4332','#1a5a40','#3a5a2a','#4a6a30','#3a4a2a','#4a4a3a','#3a5a20','#1a5a30','#1a5a3a']}
];
const REGINE=[ // simboli al posto della corona: funzioni con colori fissi (devono spiccare su tutte le palette)
  ()=>`<path d="M6 30h28l2-16-8 6-8-12-8 12-8-6z" fill="#f5c518" stroke="#b08a05" stroke-width="1.5" stroke-linejoin="round"/><circle cx="20" cy="8" r="2.5" fill="#e63946"/><circle cx="4.5" cy="13" r="2" fill="#29b6e8"/><circle cx="35.5" cy="13" r="2" fill="#29b6e8"/><rect x="6" y="30" width="28" height="4" fill="#b08a05"/>`,
  ()=>st(20,21,16,'#f5c518')+st(20,21,7,'#fff0a8'),
  ()=>`<path d="M20 4l14 12-14 20L6 16z" fill="#29b6e8"/><path d="M6 16h28L20 4z" fill="#bfeafc"/><path d="M12 16l8-12 8 12-8 20z" fill="#fff" opacity=".3"/>`,
  ()=>`<path d="M20 34C8 24 4 18 8 11c3-5 9-5 12 0 3-5 9-5 12 0 4 7 0 13-12 23z" fill="#e63946"/><circle cx="14" cy="14" r="3" fill="#ffb3b8" opacity=".8"/>`,
  ()=>`${[0,45,90,135,180,225,270,315].map(a=>`<ellipse cx="20" cy="9" rx="3.5" ry="7" fill="#f06aa8" transform="rotate(${a} 20 18)"/>`).join('')}<circle cx="20" cy="18" r="5" fill="#f5c518"/>`,
  ()=>SET.animali.d[0]({a:'#f4871e',b:'#b85a0a',c:'#ffd3a6'}),
  ()=>SET.animali.d[3]({a:'#a9713a',b:'#6b4320',c:'#ead3b5'}),
  ()=>SET.insetti.d[0]({a:'#e63946',b:'#9d1b2a',c:'#ffb3b8'}),
  ()=>SET.insetti.d[1]({a:'#f5c518',b:'#b08a05',c:'#fff0a8'}),
  ()=>SET.spazio.d[1]({a:'#e63946',b:'#9d1b2a',c:'#ffffff'}),
  ()=>SET.natura.d[6]({a:'#e63946',b:'#9d1b2a',c:'#ffffff'}),
  ()=>SET.spazio.d[5]({a:'#f5c518',b:'#f4871e',c:'#fff0a8'}),
  ()=>SET.animali.d[2]({a:'#f4871e',b:'#b85a0a',c:'#ffd3a6'}),
  ()=>SET.animali.d[4]({a:'#8e4fe0',b:'#5a2aa0',c:'#dcc8fa'}),
  ()=>SET.frutta.d[3]({a:'#e63946',b:'#9d1b2a',c:'#fff0a8'}),
  ()=>SET.mare.d[1]({a:'#f4871e',b:'#b85a0a',c:'#ffd3a6'}),
  ()=>SET.dolci.d[0]({a:'#f06aa8',b:'#b2366f',c:'#ffe9c8'}),
  ()=>SET.gemme.d[6]({a:'#2fb15d',b:'#1a6e39',c:'#b5f0c6'}),
  ()=>SET.spazio.d[7]({a:'#2fb15d',b:'#1a6e39',c:'#b5f0c6'}),
  ()=>SET.mostri.d[1]({a:'#8e4fe0',b:'#5a2aa0',c:'#dcc8fa'})
];
const NOMI_REGINE=['corona','stella','gemma','cuore','fiore','gatto','gufo','coccinella','ape','razzo','fungo','sole','volpe','orsetto','fragola','stella marina','dolcetto','gemma verde','alieno','mostriciattolo'];
const TRAME_Q=['','punti','righe','griglia'];
function temaQueens(level){
  const r=window.Giochi.rng('queens-tema:'+level);
  const pal=level<=1?PALETTE_Q[0]:r.pick(PALETTE_Q);
  const qi=level<=1?0:Math.floor(r()*REGINE.length);
  const trama=level<=2?'':r.pick(TRAME_Q);
  return{pal,regina:sq(REGINE[qi]()),nomeRegina:NOMI_REGINE[qi],trama,offset:Math.floor(r()*11)};
}

// ---- Sudoku: numeri classici, numeri colorati, caratteri diversi o figure ----
const COLORI_CIFRE=['#e63946','#f4871e','#c9a800','#2fb15d','#1fbfa6','#29b6e8','#3d5af1','#8e4fe0','#f06aa8'];
const FONT_SD=['mono','tondo','serio','corsivo'];
function temaSudoku(level,n){
  const r=window.Giochi.rng('sudoku-tema:'+level);
  if(level<=1)return{modo:'numeri',font:'mono'};
  const x=r();
  const pFig=n<=6?0.5:0.3;
  if(x<pFig){const sid=sceltaSet('sudoku-set',level);const s=SET[sid];const idx=r.shuffle([...Array(s.d.length).keys()]).slice(0,n);const cols=pesca(r,COLORI,n);
    return{modo:'figure',set:sid,nome:s.nome,glifi:idx.map((i,k)=>icona(sid,i,cols[k]))}}
  if(x<pFig+0.25)return{modo:'colori',font:r.pick(FONT_SD),colori:r.shuffle(COLORI_CIFRE.slice())};
  return{modo:'numeri',font:r.pick(FONT_SD)};
}
function glifoSudoku(tema,v){if(!v)return'';if(tema.modo==='figure')return`<span class="fig">${tema.glifi[v-1]}</span>`;if(tema.modo==='colori')return`<span class="num" style="color:${tema.colori[v-1]}">${v}</span>`;return String(v)}

return{SET,SET_IDS,COLORI,SKIN_SCURE,skinScura,icona,setMahjong,applicaMahjong,SFONDI_FACCIA,TAVOLI,PALETTE_Q,REGINE,temaQueens,temaSudoku,glifoSudoku};
})();
