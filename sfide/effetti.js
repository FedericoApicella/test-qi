// Effetti condivisi: suoni (sintetizzati, spegnibili), coriandoli, numeri che volano, salvataggio locale.
(function(){
'use strict';
const KEY_SOUND='testqi.suoni';
let ctx=null;
const soundOn=()=>localStorage.getItem(KEY_SOUND)!=='off';
function setSound(on){localStorage.setItem(KEY_SOUND,on?'on':'off');if(on)beep('ok')}
function tone(f,t0,dur,type,vol){const o=ctx.createOscillator(),g=ctx.createGain();o.type=type||'sine';o.frequency.setValueAtTime(f,t0);g.gain.setValueAtTime(0.0001,t0);g.gain.exponentialRampToValueAtTime(vol||0.18,t0+0.01);g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);o.connect(g).connect(ctx.destination);o.start(t0);o.stop(t0+dur+0.02)}
// name: ok | bad | tick | win | lose | streak | start | level
function beep(name){
  if(!soundOn())return;
  try{ctx=ctx||new(window.AudioContext||window.webkitAudioContext)();if(ctx.state==='suspended')ctx.resume();const t=ctx.currentTime;
    if(name==='ok'){tone(660,t,0.09,'triangle');tone(880,t+0.09,0.14,'triangle')}
    else if(name==='bad'){tone(220,t,0.18,'sawtooth',0.08);tone(180,t+0.12,0.22,'sawtooth',0.08)}
    else if(name==='tick')tone(1200,t,0.04,'square',0.04);
    else if(name==='win'){[523,659,784,1047].forEach((f,i)=>tone(f,t+i*0.11,0.22,'triangle'))}
    else if(name==='lose'){[392,330,262].forEach((f,i)=>tone(f,t+i*0.16,0.25,'triangle',0.12))}
    else if(name==='streak'){[784,988,1175].forEach((f,i)=>tone(f,t+i*0.06,0.12,'triangle'))}
    else if(name==='start'){tone(440,t,0.1,'triangle');tone(880,t+0.1,0.2,'triangle')}
    else if(name==='level'){[659,784,988,1319].forEach((f,i)=>tone(f,t+i*0.08,0.18,'sine'))}
  }catch(e){}
}
// coriandoli leggeri (solo CSS+DOM, nessuna libreria)
function confetti(n){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const box=document.createElement('div');box.className='confetti';document.body.appendChild(box);
  const cols=['#0b6e66','#2563eb','#f2b45c','#b4531e','#63d184','#f28b82'];
  for(let i=0;i<(n||80);i++){const p=document.createElement('i');p.style.left=Math.random()*100+'vw';p.style.background=cols[i%cols.length];p.style.animationDelay=Math.random()*0.8+'s';p.style.animationDuration=(1.6+Math.random()*1.2)+'s';p.style.transform=`rotate(${Math.random()*360}deg)`;box.appendChild(p)}
  setTimeout(()=>box.remove(),3200);
}
// numero che vola via da un elemento (es. "+15")
function floatText(el,txt,cls){
  if(!el)return;const r=el.getBoundingClientRect();const f=document.createElement('div');f.className='floaty '+(cls||'');f.textContent=txt;
  f.style.left=(r.left+r.width/2)+'px';f.style.top=(r.top+window.scrollY)+'px';document.body.appendChild(f);setTimeout(()=>f.remove(),1300);
}
function shake(el){if(!el)return;el.classList.remove('shake');void el.offsetWidth;el.classList.add('shake')}
// archivio locale (JSON in localStorage), con fallback silenzioso
function load(key,def){try{const v=localStorage.getItem(key);return v?JSON.parse(v):def}catch(e){return def}}
function save(key,val){try{localStorage.setItem(key,JSON.stringify(val))}catch(e){}}
// pulsante suoni da inserire nella barra
function soundButtonHtml(){return`<button class="btn icon" id="soundBtn" type="button" aria-label="Suoni" title="Suoni">${soundOn()?'🔊':'🔇'}</button>`}
function bindSoundButton(){const b=document.getElementById('soundBtn');if(b)b.addEventListener('click',()=>{setSound(!soundOn());b.textContent=soundOn()?'🔊':'🔇'})}
const CSS=`
.confetti{position:fixed;inset:0;pointer-events:none;z-index:50;overflow:hidden}
.confetti i{position:absolute;top:-12px;width:9px;height:14px;border-radius:2px;opacity:.95;animation:cf-fall 2s ease-in forwards}
@keyframes cf-fall{0%{transform:translateY(0) rotate(0deg)}100%{transform:translateY(110vh) rotate(720deg);opacity:.7}}
.floaty{position:absolute;z-index:40;pointer-events:none;font-family:var(--font-mono);font-weight:700;font-size:1.6rem;color:var(--ok);transform:translate(-50%,0);animation:fl-up 1.2s ease-out forwards}
.floaty.bad{color:var(--bad)}
.floaty.gold{color:var(--warn);font-size:2rem}
@keyframes fl-up{0%{opacity:0;transform:translate(-50%,10px) scale(.6)}20%{opacity:1;transform:translate(-50%,-6px) scale(1.15)}100%{opacity:0;transform:translate(-50%,-70px) scale(1)}}
.shake{animation:shk .45s}
@keyframes shk{10%,90%{transform:translateX(-2px)}20%,80%{transform:translateX(4px)}30%,50%,70%{transform:translateX(-6px)}40%,60%{transform:translateX(6px)}}
.pop{animation:pop .4s}
@keyframes pop{0%{transform:scale(1)}40%{transform:scale(1.25)}100%{transform:scale(1)}}
.btn.icon{padding:6px 9px;font-size:1rem;line-height:1}
.streak{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:999px;background:var(--warn-soft);color:var(--warn);font-weight:700;font-family:var(--font-mono);font-size:.9rem}
@media (prefers-reduced-motion:reduce){.floaty,.shake,.pop,.confetti i{animation:none}}
`;
const st=document.createElement('style');st.textContent=CSS;document.head.appendChild(st);
window.Effetti={beep,confetti,floatText,shake,load,save,soundOn,setSound,soundButtonHtml,bindSoundButton};
})();
