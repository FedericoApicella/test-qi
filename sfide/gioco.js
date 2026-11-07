// Sfide di logica a due: stanza, collegamento diretto tra i due browser (WebRTC via PeerJS),
// partita a turni con quesiti identici e punteggio in tempo reale.
// Chi crea la stanza ("host") decide quando inizia ogni turno e calcola l'esito; l'altro ("ospite") riceve e risponde.
(function(){
'use strict';
const $=(s)=>document.querySelector(s);
const esc=(s)=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const LETTERS='ABCDEF';
const PREFIX='sfide-logica-v1-';
const CODE_CHARS='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const PEER_OPTS=window.SFIDE_PEER||{};      // per prove locali: {host:'localhost',port:9000,path:'/'}
const RESULT_MS=3200;                        // quanto resta visibile l'esito del turno
const GRACE_MS=2500;                         // attesa della risposta dell'altro dopo lo scadere del tempo
const {buildGame,cellSVG,cellsSVG,KIND_NAME,itemHtml}=window.Quesiti;
const FX=window.Effetti;
const PRESETS=[['lampo','⚡ Lampo',6,20],['classica','🎯 Classica',10,45],['maratona','🏃 Maratona',16,60]];
const KEY_REC='testqi.sfide';
const KINDS=[['mat','Matrici'],['num','Serie numeriche'],['verb','Analogie'],['rot','Rotazioni']];

// ========================= stato =========================
let S;
function fresh(){
  return{screen:'home',role:null,solo:false,code:'',name:localStorage.getItem('testqi.nome')||'',oppName:'',connected:false,
    cfg:{rounds:10,time:45,kinds:['mat','num','verb','rot']},seed:0,items:[],i:-1,
    ans:[],         // per turno: [{choice,ms}|null per host, idem per ospite]
    results:[],     // per turno: {pts:[p0,p1]}
    score:[0,0],streak:[0,0],mine:null,theirs:null,roundAt:0,timeLeft:0,err:'',busy:'',joinCode:'',preset:'classica'};
}
S=fresh();
let peer=null,conn=null,tick=null,graceT=null,nextT=null,joinT=null,hbT=null,lastSeen=0;
const HB_MS=3000,LOST_MS=12000;            // battito di controllo del collegamento
const me=()=>S.role==='guest'?1:0;
const opp=()=>1-me();
const names=()=>{const n=[S.role==='guest'?S.oppName:S.name,S.role==='guest'?S.name:S.oppName];return n};

// ========================= rete =========================
function makeCode(){let c='';for(let i=0;i<4;i++)c+=CODE_CHARS[Math.floor(Math.random()*CODE_CHARS.length)];return c}
function send(msg){if(conn&&conn.open){try{conn.send(msg)}catch(e){}}}
function destroyNet(){clearInterval(hbT);hbT=null;if(conn){try{conn.close()}catch(e){}}if(peer){try{peer.destroy()}catch(e){}}conn=null;peer=null;clearTimeout(joinT)}
function onLost(){
  clearInterval(hbT);hbT=null;if(!S.connected)return;
  S.connected=false;conn=null;
  if(S.screen!=='home'){S.err=(S.oppName||'L\'altro giocatore')+' si è scollegato.';if(S.screen==='round'||S.screen==='countdown'||S.screen==='result'){stopTimer();clearTimeout(nextT);clearTimeout(graceT);S.screen='end'}render()}
}
function netError(msg){S.err=msg;S.busy='';render()}

function createRoom(tries){
  tries=tries||0;S.role='host';S.solo=false;S.code=makeCode();S.busy='Creo la stanza…';S.err='';render();
  peer=new Peer(PREFIX+S.code,PEER_OPTS);
  peer.on('open',()=>{S.busy='';S.screen='lobby';render()});
  peer.on('connection',c=>{
    if(conn&&conn.open){c.on('open',()=>{c.send({t:'full'});setTimeout(()=>c.close(),500)});return}
    bindConn(c);
  });
  peer.on('error',e=>{
    if(e.type==='unavailable-id'&&tries<5){destroyNet();createRoom(tries+1);return}
    netError(describeErr(e));
  });
  peer.on('disconnected',()=>{if(peer&&!peer.destroyed)peer.reconnect()});
}
function joinRoom(code){
  S.role='guest';S.solo=false;S.code=code;S.busy='Entro nella stanza '+code+'…';S.err='';render();
  peer=new Peer(PEER_OPTS);
  peer.on('open',()=>{
    const c=peer.connect(PREFIX+code,{reliable:true});
    bindConn(c);
    joinT=setTimeout(()=>{if(!S.connected){destroyNet();netError('Non riesco a collegarmi alla stanza '+code+'. Controlla il codice e che l\'altra persona abbia la pagina aperta, poi riprova.')}},20000);
  });
  peer.on('error',e=>{if(e.type==='peer-unavailable'){destroyNet();netError('Stanza '+code+' non trovata. Controlla il codice: chi l\'ha creata deve tenere la pagina aperta.')}else netError(describeErr(e))});
  peer.on('disconnected',()=>{if(peer&&!peer.destroyed)peer.reconnect()});
}
function describeErr(e){
  const t=e&&e.type;
  if(t==='network'||t==='server-error'||t==='socket-error'||t==='socket-closed')return'Non riesco a raggiungere il servizio di collegamento. Controlla la connessione e riprova tra qualche secondo.';
  if(t==='browser-incompatible')return'Questo browser non supporta il collegamento diretto: prova con Chrome, Safari, Firefox o Edge aggiornati.';
  return'Errore di collegamento ('+(t||'sconosciuto')+'). Ricarica la pagina e riprova.';
}
function bindConn(c){
  conn=c;
  c.on('open',()=>{clearTimeout(joinT);S.connected=true;lastSeen=Date.now();send({t:'hello',name:S.name||(S.role==='host'?'Giocatore 1':'Giocatore 2')});
    clearInterval(hbT);hbT=setInterval(()=>{send({t:'ping'});if(Date.now()-lastSeen>LOST_MS)onLost()},HB_MS);
    if(S.role==='guest'){S.busy='Collegamento riuscito, attendo…';render()}});
  c.on('data',m=>{lastSeen=Date.now();onData(m)});
  c.on('close',onLost);
  c.on('error',()=>{});
}
function onData(m){
  if(!m||typeof m!=='object')return;
  switch(m.t){
    case'hello':S.oppName=String(m.name||'').slice(0,20)||(S.role==='host'?'Giocatore 2':'Giocatore 1');S.busy='';if(S.screen!=='round'&&S.screen!=='result'&&S.screen!=='countdown')S.screen='lobby';render();break;
    case'full':destroyNet();S.screen='home';netError('La stanza è già completa: ci sono già due giocatori.');break;
    case'start':if(S.role==='guest')startGame(m.seed,m.cfg);break;
    case'round':if(S.role==='guest')startRound(m.i);break;
    case'ans':if(S.i===m.i&&S.screen==='round'){S.theirs={choice:m.choice,ms:m.ms};if(S.role==='host')S.ans[S.i][1]=S.theirs;render();if(S.role==='host')checkRound()}break;
    case'result':if(S.role==='guest')showResult(m.i,m.a);break;
    case'end':if(S.role==='guest')endGame();break;
    case'bye':onLost();break;
  }
}

// ========================= partita =========================
function startGame(seed,cfg){
  stopTimer();clearTimeout(nextT);clearTimeout(graceT);
  S.seed=seed;S.cfg=cfg;S.items=buildGame(seed,cfg.rounds,cfg.kinds);
  S.i=-1;S.ans=S.items.map(()=>[null,null]);S.results=[];S.score=[0,0];S.streak=[0,0];S.err='';FX.beep('start');
  S.screen='countdown';S.timeLeft=3;render();
  let n=3;tick=setInterval(()=>{n--;S.timeLeft=n;if(n<=0){stopTimer();if(S.role==='host')hostNext();else render()}else render()},1000);
}
function hostStart(){
  const seed=Math.floor(Math.random()*2147483647);
  send({t:'start',seed,cfg:S.cfg});
  startGame(seed,S.cfg);
}
function hostNext(){
  const i=S.i+1;
  if(i>=S.items.length){send({t:'end'});endGame();return}
  send({t:'round',i});startRound(i);
}
function startRound(i){
  stopTimer();clearTimeout(nextT);clearTimeout(graceT);
  S.i=i;S.mine=null;S.theirs=null;S.roundAt=Date.now();S.timeLeft=S.cfg.time;S.screen='round';render();
  tick=setInterval(()=>{S.timeLeft=Math.max(0,S.cfg.time-Math.round((Date.now()-S.roundAt)/1000));updateBar();if(S.timeLeft<=0){stopTimer();onTimeout()}},250);
}
function stopTimer(){if(tick){clearInterval(tick);tick=null}}
function answer(choice){
  if(S.screen!=='round'||S.mine)return;
  const ms=Math.min(Date.now()-S.roundAt,S.cfg.time*1000);
  S.mine={choice,ms};S.ans[S.i][me()]=S.mine;send({t:'ans',i:S.i,choice,ms});render();
  if(S.role==='host')checkRound();
}
function onTimeout(){
  if(!S.mine)answer(null);
  if(S.role==='host'&&S.screen==='round'){clearTimeout(graceT);graceT=setTimeout(()=>{if(S.screen!=='round')return;if(!S.ans[S.i][1])S.ans[S.i][1]={choice:null,ms:S.cfg.time*1000};finalize()},S.solo?0:GRACE_MS)}
}
function checkRound(){
  const a=S.ans[S.i];
  if(a[0]&&(S.solo||a[1]))finalize();
}
function finalize(){
  clearTimeout(graceT);stopTimer();
  const a=S.ans[S.i].map(x=>x||{choice:null,ms:S.cfg.time*1000});
  send({t:'result',i:S.i,a});
  showResult(S.i,a);
  nextT=setTimeout(hostNext,RESULT_MS);
}
function points(it,a){
  if(!a||a.choice!==it.answer)return 0;
  const frac=Math.max(0,1-a.ms/(S.cfg.time*1000));
  return 10+Math.round(5*frac);
}
function showResult(i,a){
  stopTimer();
  const it=S.items[i];S.ans[i]=a;
  const pts=[points(it,a[0]),points(it,a[1])];
  S.streak=S.streak.map((st,k)=>pts[k]>0?st+1:0);
  S.results[i]={pts,streak:S.streak.slice()};S.score=[S.score[0]+pts[0],S.score[1]+pts[1]];
  S.screen='result';render();
  const m=me();FX.beep(pts[m]>0?(S.streak[m]>=3?'streak':'ok'):'bad');
  const mySc=document.querySelector('.bar .sc.me');if(pts[m]>0){FX.floatText(mySc,'+'+pts[m],S.streak[m]>=3?'gold':'');if(mySc){mySc.classList.remove('pop');void mySc.offsetWidth;mySc.classList.add('pop')}}else FX.shake(document.querySelector('.verdict'));
}
function endGame(){stopTimer();clearTimeout(nextT);clearTimeout(graceT);S.screen='end';
  if(!S.solo){const m=me(),o=opp();const key=(S.oppName||'?').trim().toLowerCase();const rec=FX.load(KEY_REC,{});const r=rec[key]||{nome:S.oppName,v:0,p:0,x:0};
    if(S.score[m]>S.score[o])r.v++;else if(S.score[m]<S.score[o])r.p++;else r.x++;r.nome=S.oppName;r.ultimo=Date.now();rec[key]=r;FX.save(KEY_REC,rec);S.rec=r;
    if(S.score[m]>S.score[o]){FX.beep('win');FX.confetti(120)}else if(S.score[m]<S.score[o])FX.beep('lose');else FX.beep('ok')}
  else{FX.beep('win');if(S.score[0]>=S.items.length*10)FX.confetti(80)}
  render()}
function recordHtml(){if(S.solo||!S.oppName)return'';const r=FX.load(KEY_REC,{})[(S.oppName||'').trim().toLowerCase()];if(!r)return'';return`<p class="vs-rec">Contro ${esc(r.nome)}: <b>${r.v}</b> vinte · <b>${r.p}</b> perse${r.x?` · ${r.x} pari`:''}</p>`}
function startSolo(){S.role='host';S.solo=true;S.oppName='';S.connected=false;hostStart()}
function goHome(){if(S.connected)send({t:'bye'});destroyNet();stopTimer();clearTimeout(nextT);clearTimeout(graceT);const name=S.name;S=fresh();S.name=name;history.replaceState(null,'',location.pathname);render()}

// ========================= interfaccia =========================
const fmtMs=(ms)=>(ms/1000).toFixed(1).replace('.',',')+' s';
function roomLink(){return location.origin+location.pathname+'?stanza='+S.code}
function render(){
  const app=$('#app');
  const r={home:rHome,lobby:rLobby,countdown:rCountdown,round:rRound,result:rResult,end:rEnd}[S.screen];
  app.innerHTML=r();
  updateBar();bind();
}
function updateBar(){
  const inGame=['countdown','round','result','end'].includes(S.screen);
  const sc=$('#barScores');document.querySelector('.bar').classList.toggle('ingame',inGame);
  if(inGame){
    const n=names();const m=me(),o=opp();
    sc.innerHTML=`<span class="sc me"><span class="n">${esc(n[m]||'Tu')}</span><span class="v">${S.score[m]}</span></span>${S.streak[m]>=2?`<span class="streak">🔥${S.streak[m]}</span>`:''}`+(S.solo?'':`<span class="sc opp"><span class="n">${esc(n[o]||'Avversario')}</span><span class="v">${S.score[o]}</span></span>`);
  }else sc.innerHTML='';
  const t=$('#barTimer');
  if(S.screen==='round'){t.classList.remove('hidden-timer');t.textContent=S.timeLeft+' s';t.classList.toggle('low',S.timeLeft<=10)}
  else t.classList.add('hidden-timer');
  if(!$('#soundBtn')){const sb=$('#barSound');if(sb){sb.innerHTML=FX.soundButtonHtml();FX.bindSoundButton()}}
  const p=$('#barProg');
  p.style.width=inGame&&S.items.length?((S.screen==='end'?S.items.length:Math.max(0,S.i+(S.screen==='result'?1:0)))/S.items.length*100)+'%':'0';
}
function bind(){
  document.querySelectorAll('[data-act]').forEach(b=>b.addEventListener('click',()=>act(b.dataset.act,b)));
  document.querySelectorAll('.opt[data-i]').forEach(b=>b.addEventListener('click',()=>answer(+b.dataset.i)));
  const jc=$('#joinCode');if(jc){jc.addEventListener('keydown',e=>{if(e.key==='Enter')act('join')});jc.addEventListener('input',()=>{S.joinCode=jc.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,4)})}
  const nm=$('#nameInput');if(nm)nm.addEventListener('input',()=>{S.name=nm.value.slice(0,20);localStorage.setItem('testqi.nome',S.name)});
  document.querySelectorAll('[data-preset]').forEach(b=>b.addEventListener('click',()=>{const pr=PRESETS.find(x=>x[0]===b.dataset.preset);S.preset=pr[0];S.cfg.rounds=pr[2];S.cfg.time=pr[3];render()}));
  document.querySelectorAll('[data-cfg]').forEach(el=>el.addEventListener('change',()=>{
    if(el.dataset.cfg==='kinds'){const ks=[...document.querySelectorAll('[data-cfg="kinds"]:checked')].map(x=>x.value);if(ks.length)S.cfg.kinds=ks;else el.checked=true}
    else{S.cfg[el.dataset.cfg]=+el.value;S.preset=(PRESETS.find(x=>x[2]===S.cfg.rounds&&x[3]===S.cfg.time)||[''])[0]}
  }));
}
function act(a,btn){
  if(a==='create'){if(!S.name.trim())S.name='Giocatore 1';createRoom();return}
  if(a==='join'){const code=(S.joinCode||'').trim();if(code.length!==4){S.err='Il codice ha 4 caratteri.';render();return}if(!S.name.trim())S.name='Giocatore 2';joinRoom(code);return}
  if(a==='solo'){if(!S.name.trim())S.name='Tu';startSolo();return}
  if(a==='start'){if(S.role==='host'&&(S.connected||S.solo))hostStart();return}
  if(a==='again'){if(S.role==='host')hostStart();return}
  if(a==='home'){goHome();return}
  if(a==='copy'){copyText(roomLink(),btn);return}
  if(a==='share'){if(navigator.share){navigator.share({title:'Sfida di logica',text:'Sfidami a quesiti di logica: entra con il codice '+S.code,url:roomLink()}).catch(()=>{})}else copyText(roomLink(),btn);return}
}
function copyText(txt,btn){
  const done=()=>{if(btn){const old=btn.textContent;btn.textContent='Copiato!';setTimeout(()=>{btn.textContent=old},1500)}};
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(txt).then(done,()=>prompt('Copia il link:',txt));
  else prompt('Copia il link:',txt);
}
function rHome(){
  const kindsHtml=KINDS.map(([k,n])=>`<label><input type="checkbox" data-cfg="kinds" value="${k}" ${S.cfg.kinds.includes(k)?'checked':''}> ${n}</label>`).join('');
  const presets=`<div class="presets">${PRESETS.map(p=>`<button class="preset ${S.preset===p[0]?'on':''}" data-preset="${p[0]}" type="button">${p[1]} · ${p[2]} × ${p[3]} s</button>`).join('')}</div>`;
  return`<div class="stack"><div class="eyebrow">Due giocatori · stessi quesiti · stesso tempo</div><h1><span class="grad">Sfide di logica</span></h1>
    <p class="lede">Matrici, serie numeriche, analogie e rotazioni. Ogni turno un quesito uguale per entrambi: chi risponde giusto fa 10 punti, più un bonus fino a 5 se è veloce. Le risposte giuste di fila accendono la serie 🔥. Alla fine vince chi ha più punti.</p></div>
    ${S.err?`<div class="err">${esc(S.err)}</div>`:''}
    <div class="card"><div class="field"><label for="nameInput">Il tuo nome</label><input id="nameInput" type="text" maxlength="20" value="${esc(S.name)}" placeholder="Come ti chiami?" autocomplete="nickname" style="max-width:300px"></div></div>
    <div class="two">
      <div class="card"><h2>Crea una stanza</h2><p class="hint">Scegli le regole, poi manda il codice o il link all'altra persona.</p>${presets}
        <div class="two">
          <div class="field"><label for="cfgRounds">Quesiti</label><select id="cfgRounds" data-cfg="rounds">${[6,10,16].map(n=>`<option value="${n}" ${S.cfg.rounds===n?'selected':''}>${n} quesiti</option>`).join('')}</select></div>
          <div class="field"><label for="cfgTime">Tempo per quesito</label><select id="cfgTime" data-cfg="time">${[30,45,60,90].map(n=>`<option value="${n}" ${S.cfg.time===n?'selected':''}>${n} secondi</option>`).join('')}</select></div>
        </div>
        <div class="field"><label>Tipi di quesito</label><div class="checks">${kindsHtml}</div></div>
        <div class="actions"><button class="btn primary big" data-act="create" ${S.busy?'disabled':''}>${S.busy&&S.role==='host'?`<span class="spin"></span> ${esc(S.busy)}`:'Crea la stanza'}</button></div>
      </div>
      <div class="card"><h2>Entra in una stanza</h2><p class="hint">Scrivi il codice di 4 caratteri che ti ha mandato l'altra persona.</p>
        <div class="field"><label for="joinCode">Codice stanza</label><input id="joinCode" class="code" type="text" maxlength="4" value="${esc(S.joinCode)}" placeholder="····" autocomplete="off" autocapitalize="characters" spellcheck="false"></div>
        <div class="actions"><button class="btn primary big" data-act="join" ${S.busy?'disabled':''}>${S.busy&&S.role==='guest'?`<span class="spin"></span> ${esc(S.busy)}`:'Entra'}</button></div>
      </div>
    </div>
    <div class="card"><h3>Nessuno con cui giocare adesso?</h3><p class="hint">Gioca da solo contro il tempo con le stesse regole, oppure allenati area per area con livelli e medaglie.</p><div class="actions"><button class="btn" data-act="solo" ${S.busy?'disabled':''}>Da solo contro il tempo</button><a class="btn" href="allenamento.html">🏋️ Allenamento per area</a><a class="btn" href="../">🏠 Home</a></div></div>
    <p class="hint">Per mettere in contatto i due browser si usa il servizio gratuito PeerJS; poi la partita viaggia direttamente tra i due browser e non viene salvato nulla. Entrambi devono tenere la pagina aperta per tutta la partita.</p>`;
}
function rLobby(){
  const host=S.role==='host';
  const kinds=S.cfg.kinds.map(k=>KINDS.find(x=>x[0]===k)[1]).join(', ');
  const rules=`<div class="card"><h3>Regole della partita</h3><p>${S.cfg.rounds} quesiti, ${S.cfg.time} secondi ciascuno. Tipi: ${esc(kinds)}.</p><p class="hint">Risposta giusta: 10 punti più un bonus fino a 5 in base alla velocità. Risposta sbagliata o tempo scaduto: 0.</p></div>`;
  const players=`<div class="card"><h3>Giocatori</h3>
      <div class="pl"><span class="dot on"></span><span class="nm">${esc(host?S.name:S.oppName)}</span><span class="st">${host?'tu · ha creato la stanza':'ha creato la stanza'}</span></div>
      <div class="pl"><span class="dot ${S.connected?'on':''}"></span><span class="nm">${esc(host?(S.connected?S.oppName:'In attesa…'):S.name)}</span><span class="st">${host?(S.connected?'collegato':'<span class="spin"></span> non ancora entrato'):'tu · collegato'}</span></div></div>`;
  if(host){
    return`<div class="stack"><div class="eyebrow">Stanza creata</div><h1>Invita l'altra persona</h1><p class="lede">Mandale il codice o il link. Quando entra, premi «Inizia la sfida».</p></div>
      <div class="codebox"><span class="hint">Codice stanza</span><span class="code">${esc(S.code)}</span><span class="lnk">${esc(roomLink())}</span></div>
      <div class="actions"><button class="btn" data-act="copy">Copia il link</button>${navigator.share?'<button class="btn" data-act="share">Condividi…</button>':''}</div>
      ${S.err?`<div class="err">${esc(S.err)}</div>`:''}${players}${recordHtml()}${rules}
      <div class="actions"><button class="btn primary big" data-act="start" ${S.connected?'':'disabled'}>Inizia la sfida</button><button class="btn" data-act="home">Annulla</button></div>`;
  }
  return`<div class="stack"><div class="eyebrow">Stanza ${esc(S.code)}</div><h1>Sei dentro</h1><p class="lede">La partita parte quando ${esc(S.oppName||'chi ha creato la stanza')} preme «Inizia la sfida». Tieni la pagina aperta.</p></div>
    ${S.err?`<div class="err">${esc(S.err)}</div>`:''}${players}${rules}
    <div class="wait"><span class="spin"></span> In attesa dell'avvio…</div>
    <div class="actions"><button class="btn" data-act="home">Esci dalla stanza</button></div>`;
}
function rCountdown(){return`<div class="stack"><div class="eyebrow">${S.solo?'Allenamento':'Sfida'} · ${S.items.length} quesiti</div><h1>Pronti?</h1></div><div class="countdown">${S.timeLeft>0?S.timeLeft:'Via!'}</div>`}
function rRound(){
  const it=S.items[S.i];
  const head=`<div class="eyebrow">${esc(KIND_NAME[it.kind])} · quesito ${S.i+1} di ${S.items.length}</div>`;
  const dis=S.mine?'disabled':'';
  const cls=(k)=>S.mine&&S.mine.choice===k?'sel':'';
  const status=S.mine?`<div class="wait">${S.solo?'':(S.theirs?`${esc(S.oppName||'L\'avversario')} ha risposto. `:`<span class="spin"></span> In attesa di ${esc(S.oppName||'avversario')}… `)}Hai scelto ${S.mine.choice===null?'niente (tempo scaduto)':LETTERS[S.mine.choice]} in ${fmtMs(S.mine.ms)}.</div>`
    :(S.theirs&&!S.solo?`<div class="wait">${esc(S.oppName||'L\'avversario')} ha già risposto!</div>`:'');
  const body=itemHtml(it,{cls,dis:!!S.mine});
  return head+body+status;
}
function optLabel(it,k){
  if(k===null||k===undefined)return'—';
  return LETTERS[k];
}
function rResult(){
  const it=S.items[S.i],a=S.ans[S.i],pts=S.results[S.i].pts,n=names(),m=me(),o=opp();
  const tag=(k)=>{const t=[];if(a[m]&&a[m].choice===k)t.push('<i class="me">tu</i>');if(!S.solo&&a[o]&&a[o].choice===k)t.push('<i class="opp">'+esc((n[o]||'avv.').slice(0,6))+'</i>');return t.length?`<span class="tag">${t.join('')}</span>`:''};
  const cls=(k)=>k===it.answer?'right':((a[m]&&a[m].choice===k)||(a[o]&&a[o].choice===k))?'wrong':'';
  const body=itemHtml(it,{cls,dis:true,tag,showAnswer:true});
  const st=S.results[S.i].streak||[0,0];
  const row=(who,cl)=>{const x=a[who];const ok=x&&x.choice===it.answer;return`<div class="vrow ${cl}"><span class="nm">${esc(n[who]||(cl==='me'?'Tu':'Avversario'))}${st[who]>=2?` <span class="streak">🔥${st[who]}</span>`:''}</span><span class="t">${x&&x.choice!==null?optLabel(it,x.choice)+' · '+fmtMs(x.ms):'nessuna risposta'}</span><span class="pt ${ok?'ok':'bad'}">${ok?'+'+pts[who]:'0'}</span></div>`};
  const rule=it.rule?`<p class="hint">Regola: ${esc(it.rule)}.</p>`:'';
  return`<div class="eyebrow">${esc(KIND_NAME[it.kind])} · quesito ${S.i+1} di ${S.items.length} · esito</div>
    <div class="verdict">${row(m,'me')}${S.solo?'':row(o,'opp')}</div>
    <p class="q">La risposta giusta era ${LETTERS[it.answer]}.</p>${body}${rule}
    <div class="wait"><span class="spin"></span> ${S.i+1<S.items.length?'Prossimo quesito tra pochi secondi…':'Calcolo del risultato finale…'}</div>`;
}
function rEnd(){
  const n=names(),m=me(),o=opp();const sm=S.score[m],so=S.score[o];
  let title,sub;
  if(S.solo){title=`${sm} punti`;sub=`${S.results.filter(r=>r&&r.pts[0]>0).length} risposte giuste su ${S.items.length}.`}
  else if(sm>so){title='Hai vinto!';sub=`${sm} a ${so} contro ${n[o]||'l\'avversario'}.`}
  else if(sm<so){title='Ha vinto '+(n[o]||'l\'avversario');sub=`${so} a ${sm}. Chiedi la rivincita!`}
  else{title='Pareggio!';sub=`${sm} punti a testa.`}
  const rows=S.items.map((it,i)=>{const r=S.results[i];const a=S.ans[i]||[];const cell=(who)=>{const x=a[who];const ok=x&&x.choice===it.answer;return`<td class="num ${ok?'ok':(x&&x.choice!==null?'bad':'')}">${r?(ok?'+'+r.pts[who]:'0'):'–'}</td>`};
    return`<tr><td class="num">${i+1}</td><td>${esc(KIND_NAME[it.kind])}</td>${cell(m)}${S.solo?'':cell(o)}</tr>`}).join('');
  const again=S.solo?`<button class="btn primary big" data-act="again">Ancora</button>`:S.role==='host'?`<button class="btn primary big" data-act="again" ${S.connected?'':'disabled'}>Rivincita</button>`:(S.connected?`<div class="wait"><span class="spin"></span> ${esc(n[o]||'L\'avversario')} può avviare la rivincita.</div>`:'');
  return`<div class="final"><div class="eyebrow">${S.solo?'Allenamento finito':'Sfida finita'}</div><div class="big">${esc(title)}</div><div class="sub">${esc(sub)}</div>
      <div class="scoreline"><div class="p me"><span class="n">${esc(n[m]||'Tu')}</span><span class="v">${sm}</span></div>${S.solo?'':`<div class="vs">contro</div><div class="p opp"><span class="n">${esc(n[o]||'Avversario')}</span><span class="v">${so}</span></div>`}</div></div>
    ${recordHtml()}${S.err?`<div class="err">${esc(S.err)}</div>`:''}
    <div class="actions">${again}<button class="btn" data-act="home">Torna all'inizio</button><a class="btn" href="allenamento.html">🏋️ Allenati</a></div>
    <details open><summary>Quesito per quesito</summary><div class="body"><table><thead><tr><th>#</th><th>Tipo</th><th style="text-align:right">${esc(n[m]||'Tu')}</th>${S.solo?'':`<th style="text-align:right">${esc(n[o]||'Avversario')}</th>`}</tr></thead><tbody>${rows}</tbody></table></div></details>`;
}

// ========================= avvio =========================
window.addEventListener('beforeunload',e=>{if(S.connected&&(S.screen==='round'||S.screen==='countdown'||S.screen==='result')){e.preventDefault();e.returnValue=''}});
const q=new URLSearchParams(location.search).get('stanza');
if(q)S.joinCode=q.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,4);
render();
if(S.joinCode.length===4)setTimeout(()=>$('#joinCode')&&$('#joinCode').focus(),0);
window.__sfide={get S(){return S},answer,hostStart};
})();
