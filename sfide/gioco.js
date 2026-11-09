// Sfide di logica a due: stanza, collegamento tra i due browser (rete.js: ponte MQTT, oppure WebRTC via PeerJS),
// partita a turni con quesiti identici e punteggio in tempo reale.
// Chi crea la stanza ("host") decide quando inizia ogni turno e calcola l'esito; l'altro ("ospite") riceve e risponde.
(function(){
'use strict';
const $=(s)=>document.querySelector(s);
const esc=(s)=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const LETTERS='ABCDEF';
const CODE_CHARS='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const RESULT_MS=15000;                       // tempo massimo sull'esito del turno (si passa prima se entrambi premono «Avanti»)
const GRACE_MS=2500;                         // attesa della risposta dell'altro dopo lo scadere del tempo
const {buildGame,cellSVG,cellsSVG,KIND_NAME,itemHtml,spiegazione}=window.Quesiti;
const FX=window.Effetti;
const PRESETS=[['lampo','⚡ Lampo',6,20],['classica','🎯 Classica',10,45],['maratona','🏃 Maratona',16,60]];
const KEY_REC='testqi.sfide';
const KEY_AMICI='testqi.amici';      // [{nome, aggiunto}] sincronizzato dall'account se c'è
const accountName=()=>{try{const u=window.Account&&window.Account.utente();return u&&u.nome||''}catch(e){return''}};
const KINDS=[['mat','Matrici'],['num','Serie numeriche'],['verb','Analogie'],['rot','Rotazioni']];

// ========================= stato =========================
let S;
function fresh(){
  return{screen:'home',role:null,solo:false,code:'',name:localStorage.getItem('testqi.nome')||accountName()||'',oppName:'',connected:false,invito:null,invitato:'',
    cfg:{rounds:10,time:45,kinds:['mat','num','verb','rot'],mode:'quiz',gn:1,gd:4,gcresc:false,gpreset:'g1',mix:null},seed:0,items:[],i:-1,
    ans:[],         // per turno: [{choice,ms}|null per host, idem per ospite]
    results:[],     // per turno: {pts:[p0,p1]}
    score:[0,0],streak:[0,0],mine:null,theirs:null,roundAt:0,timeLeft:0,err:'',busy:'',joinCode:'',preset:'classica',log:[],via:''};
}
S=fresh();
let net=null,tick=null,graceT=null,nextT=null,joinT=null,openT=null,hbT=null,lastSeen=0;
const HB_MS=3000,LOST_MS=20000;            // battito di controllo del collegamento
const me=()=>S.role==='guest'?1:0;
const opp=()=>1-me();
const names=()=>{const n=[S.role==='guest'?S.oppName:S.name,S.role==='guest'?S.name:S.oppName];return n};

// ========================= rete =========================
// Il collegamento vero sta in rete.js (ponte MQTT, poi PeerJS). Qui: stanza, battito, messaggi di gioco, diagnostica.
const VIA=(new URLSearchParams(location.search).get('via')||'auto').toLowerCase();
function makeCode(){let c='';for(let i=0;i<4;i++)c+=CODE_CHARS[Math.floor(Math.random()*CODE_CHARS.length)];return c}
function log(msg){const t=new Date();S.log.push(t.toTimeString().slice(0,8)+' '+msg);if(S.log.length>60)S.log.shift();const d=document.getElementById('diagLog');if(d)d.textContent=S.log.join('\n')}
function send(msg){if(net)net.send(msg)}
function destroyNet(){clearInterval(hbT);hbT=null;if(net){net.close();net=null}}
function onLost(){
  clearInterval(hbT);hbT=null;if(!S.connected)return;
  log('collegamento con l\'altro giocatore perso');
  S.connected=false;
  if(S.ranked){if(!S.ranked.avviato){rankedRiprova();return}if(!S.ranked.det){S.ranked.abbandono=true;S.ranked.det=CL.chiudi('vinta')}}
  if(S.screen!=='home'){S.err=(S.oppName||'L\'altro giocatore')+' si è scollegato.';if(S.screen==='round'||S.screen==='countdown'||S.screen==='result'){stopTimer();clearTimeout(nextT);clearTimeout(graceT);S.screen='end'}else if(['gplay','gres'].includes(S.screen)){garaEnd();return}render()}
}
function netError(msg){log('errore: '+msg);S.err=msg;S.busy='';render()}
function callbacks(){
  return{log,
    onReady(){S.busy='';S.via=net?net.via:'';if(S.ranked){S.busy='Aspetto '+S.ranked.opp.nome+'…';render();return}if(S.role==='host'){S.screen='lobby';render();if(S.invitato)mandaInvito()}else{S.busy='Cerco la stanza '+S.code+'…';render()}},
    onPeer(){S.connected=true;S.busy='';S.via=net?net.via:'';lastSeen=Date.now();send({t:'hello',name:S.name||(S.role==='host'?'Giocatore 1':'Giocatore 2')});
      clearInterval(hbT);hbT=setInterval(()=>{send({t:'ping'});if(Date.now()-lastSeen>LOST_MS)onLost()},HB_MS);
      if(S.role==='guest'){S.busy='Collegamento riuscito, attendo…';render()}},
    onData(m){lastSeen=Date.now();onData(m)},
    onLost,
    onError(msg){destroyNet();if(S.ranked&&!S.ranked.avviato){rankedRiprova();return}netError(msg)}};
}
function createRoom(){
  destroyNet();S.role='host';S.solo=false;S.code=makeCode();S.busy='Creo la stanza…';S.err='';render();
  log('creo la stanza '+S.code+' (strada: '+VIA+')');
  net=window.Rete.connetti('host',S.code,VIA,callbacks());
}
function joinRoom(code){
  destroyNet();S.role='guest';S.solo=false;S.code=code;S.busy='Mi collego…';S.err='';S.joinCode=code;render();
  log('entro nella stanza '+code+' (strada: '+VIA+')');
  net=window.Rete.connetti('guest',code,VIA,callbacks());
}
function onData(m){
  if(!m||typeof m!=='object')return;
  if(onGaraData(m))return;
  switch(m.t){
    case'hello':S.oppName=String(m.name||'').slice(0,20)||(S.role==='host'?'Giocatore 2':'Giocatore 1');S.busy='';log('ciao da '+S.oppName);if(!['round','result','countdown','gplay','gres','gend'].includes(S.screen))S.screen='lobby';if(S.role==='host')send({t:'cfg',cfg:S.cfg});if(S.ranked&&S.screen==='lobby')S.screen='rsearch';if(S.screen==='gplay')render0();else render();if(S.ranked&&S.role==='host'&&S.screen==='rsearch'&&!S.ranked.avviato){S.busy='Si parte!';render();clearTimeout(autoT);autoT=setTimeout(()=>{if(!S.connected)return;if(isGara())hostGara();else hostStart()},1800)}break;
    case'start':if(S.role==='guest')startGame(m.seed,m.cfg);break;
    case'round':if(S.role==='guest')startRound(m.i);break;
    case'ans':if(S.i===m.i&&S.screen==='round'){S.theirs={choice:m.choice,ms:m.ms};if(S.role==='host')S.ans[S.i][1]=S.theirs;render();if(S.role==='host')checkRound()}break;
    case'result':if(S.role==='guest')showResult(m.i,m.a);break;
    case'end':if(S.role==='guest')endGame();break;
    case'ready':if(m.i===S.i&&S.screen==='result'){S.ready[opp()]=true;render();if(S.role==='host')checkReady()}break;
    case'bye':onLost();break;
  }
}
function diagHtml(){
  const via=S.via==='ponte'?'ponte (server di passaggio)':S.via==='diretto'?'diretto (WebRTC)':'—';
  return`<details class="diag"><summary>🔍 Diagnostica del collegamento</summary><div class="body"><p class="hint">Strada usata: <b>${via}</b> · stanza: <b class="mono">${esc(S.code||'—')}</b> · ruolo: ${S.role==='host'?'ha creato la stanza':S.role==='guest'?'ospite':'—'} · ${S.connected?'collegato all\'altro giocatore':'non ancora collegato'}</p>
    <pre id="diagLog" class="mono">${esc(S.log.join('\n')||'(ancora niente)')}</pre>
    <div class="actions"><button class="btn" data-act="copydiag" type="button">Copia la diagnostica</button></div>
    <p class="hint">Se qualcosa non va, fai uno screenshot di questo riquadro o premi «Copia» e incollalo nel messaggio.</p></div></details>`;
}
// ========================= partita =========================
function startGame(seed,cfg){
  stopTimer();clearTimeout(nextT);clearTimeout(graceT);
  S.seed=seed;S.cfg=cfg;S.items=buildGame(seed,cfg.rounds,cfg.kinds);rankedAvvia();
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
setInterval(()=>{if(S&&S.screen==='result'){const el=document.getElementById('resLeft');if(el)el.textContent=Math.max(0,Math.ceil(((S.resultEnd||0)-Date.now())/1000))}},500);
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
  nextT=setTimeout(hostNext,RESULT_MS);S.resultEnd=Date.now()+RESULT_MS;
}
function readyNow(){if(S.screen!=='result'||S.ready[me()])return;S.ready[me()]=true;send({t:'ready',i:S.i});render();if(S.role==='host')checkReady()}
function checkReady(){if(S.screen==='result'&&(S.solo||(S.ready[0]&&S.ready[1]))){clearTimeout(nextT);hostNext()}}
function points(it,a){
  if(!a||a.choice!==it.answer)return 0;
  const frac=Math.max(0,1-a.ms/(S.cfg.time*1000));
  return 10+Math.round(5*frac);
}
function showResult(i,a){
  stopTimer();
  const it=S.items[i];S.ans[i]=a;
  const pts=[points(it,a[0]),points(it,a[1])];
  // chi risponde giusto per primo prende sempre almeno un punto in più dell'altro
  if(!S.solo&&pts[0]>0&&pts[1]>0&&a[0].ms!==a[1].ms){const f=a[0].ms<a[1].ms?0:1;if(pts[f]<=pts[1-f])pts[f]=pts[1-f]+1}
  S.streak=S.streak.map((st,k)=>pts[k]>0?st+1:0);
  S.results[i]={pts,streak:S.streak.slice()};S.score=[S.score[0]+pts[0],S.score[1]+pts[1]];
  S.ready=[false,false];if(!S.resultEnd||S.role!=='host')S.resultEnd=Date.now()+RESULT_MS;
  S.screen='result';render();
  const m=me();FX.beep(pts[m]>0?(S.streak[m]>=3?'streak':'ok'):'bad');
  const mySc=document.querySelector('.bar .sc.me');if(pts[m]>0){FX.floatText(mySc,'+'+pts[m],S.streak[m]>=3?'gold':'');if(mySc){mySc.classList.remove('pop');void mySc.offsetWidth;mySc.classList.add('pop')}}else FX.shake(document.querySelector('.verdict'));
}
function endGame(){stopTimer();clearTimeout(nextT);clearTimeout(graceT);S.screen='end';rankedChiudi(S.score[me()],S.score[opp()]);
  if(!S.solo){const m=me(),o=opp();const key=(S.oppName||'?').trim().toLowerCase();const rec=FX.load(KEY_REC,{});const r=rec[key]||{nome:S.oppName,v:0,p:0,x:0};
    if(S.score[m]>S.score[o])r.v++;else if(S.score[m]<S.score[o])r.p++;else r.x++;r.nome=S.oppName;r.ultimo=Date.now();rec[key]=r;FX.save(KEY_REC,rec);S.rec=r;
    if(S.score[m]>S.score[o]){FX.beep('win');FX.confetti(120)}else if(S.score[m]<S.score[o])FX.beep('lose');else FX.beep('ok')}
  else{FX.beep('win');if(S.score[0]>=S.items.length*10)FX.confetti(80)}
  render()}
function recordHtml(){if(S.solo||!S.oppName)return'';const r=FX.load(KEY_REC,{})[(S.oppName||'').trim().toLowerCase()];if(!r)return'';return`<p class="vs-rec">Contro ${esc(r.nome)}: <b>${r.v}</b> vinte · <b>${r.p}</b> perse${r.x?` · ${r.x} pari`:''}</p>`}
function startSolo(){S.role='host';S.solo=true;S.oppName='';S.connected=false;if(isGara())hostGara();else hostStart()}
function goHome(){stopRicerca();if(S.connected)send({t:'bye'});destroyNet();stopTimer();clearInterval(G.poll);garaRipristina();document.body.classList.remove('gara-on');clearTimeout(nextT);clearTimeout(graceT);const name=S.name,lg=S.log;S=fresh();S.name=name;S.log=lg;history.replaceState(null,'',location.pathname);render()}

// ========================= amici e inviti =========================
const amici=()=>FX.load(KEY_AMICI,[]);
const amicoKey=(n)=>window.Rete.normNome(n);
function addAmico(nome){nome=String(nome||'').trim().slice(0,20);if(!nome)return false;const l=amici();if(l.some(a=>amicoKey(a.nome)===amicoKey(nome))||amicoKey(nome)===amicoKey(S.name))return false;l.push({nome,aggiunto:Date.now()});FX.save(KEY_AMICI,l);return true}
function delAmico(nome){FX.save(KEY_AMICI,amici().filter(a=>amicoKey(a.nome)!==amicoKey(nome)))}
// sfidare un amico: crea la stanza e, appena pronta, lascia l'invito nella sua cassetta sul ponte
function sfidaAmico(nome){S.invitato=nome;if(S.screen==='lobby'&&S.role==='host'){mandaInvito();return}if(!S.name.trim())S.name='Giocatore 1';createRoom()}
function mandaInvito(){const n=S.invitato;if(!n||!S.code)return;S.invitoStato='…';render();log('mando l\'invito a '+n);
  window.Rete.invita(n,S.name,S.code,log).then(ok=>{S.invitoStato=ok?'ok':'no';log(ok?'invito lasciato nella cassetta di '+n:'invito non consegnato');render()})}
let inbox=null,inboxName='';
function ascolta(){const nm=S.name.trim();if(!nm||S.screen!=='home'){if(inbox&&(S.screen!=='home'||!nm)){inbox.close();inbox=null;inboxName=''}return}
  if(inbox&&inboxName===amicoKey(nm))return;if(inbox)inbox.close();inboxName=amicoKey(nm);
  inbox=window.Rete.ascoltaInviti(nm,(m)=>{if(S.screen!=='home')return;if(S.invito&&S.invito.stanza===m.stanza)return;S.invito=m;log('invito da '+m.da+' per la stanza '+m.stanza);FX.beep('start');render()},log)}
function accettaInvito(){const m=S.invito;if(!m)return;if(inbox)inbox.pulisci();S.invito=null;if(!S.name.trim())S.name='Giocatore 2';localStorage.setItem('testqi.nome',S.name);joinRoom(m.stanza)}
function amiciHtml(inLobby){
  const l=amici();const rec=FX.load(KEY_REC,{});
  const recenti=Object.values(rec).filter(r=>r.nome&&!l.some(a=>amicoKey(a.nome)===amicoKey(r.nome))&&amicoKey(r.nome)!==amicoKey(S.name)).sort((a,b)=>(b.ultimo||0)-(a.ultimo||0)).slice(0,5);
  const row=(a)=>`<div class="pl"><span class="dot on"></span><span class="nm">${esc(a.nome)}</span><span class="st">${inLobby?`<button class="btn" data-act="invita" data-nome="${esc(a.nome)}">${S.invitato&&amicoKey(S.invitato)===amicoKey(a.nome)?(S.invitoStato==='ok'?'Invitato ✓':S.invitoStato==='…'?'Invio…':'Riprova'):'Invita'}</button>`:`<button class="btn primary" data-act="sfida" data-nome="${esc(a.nome)}">⚔️ Sfida</button><button class="btn icon" data-act="delAmico" data-nome="${esc(a.nome)}" aria-label="Rimuovi ${esc(a.nome)}" title="Rimuovi">✕</button>`}</span></div>`;
  return`<div class="card" id="amici"><h3>👥 Amici</h3>
    ${l.length?l.map(row).join(''):'<p class="hint">Aggiungi il nome che usa il tuo amico qui: lo sfidi con un tocco e gli arriva l\'invito.</p>'}
    ${recenti.length?`<p class="hint">Hai giocato di recente con: ${recenti.map(r=>`<button class="btn" style="padding:4px 10px;font-size:.85rem" data-act="addAmico" data-nome="${esc(r.nome)}">+ ${esc(r.nome)}</button>`).join(' ')}</p>`:''}
    <div class="actions"><input id="amicoInput" type="text" maxlength="20" placeholder="Nome dell'amico" autocomplete="off" style="flex:1;min-width:140px"><button class="btn" data-act="addAmico">Aggiungi</button></div>
    ${l.length?'<p class="hint">Se l\'amico ha aperta la pagina delle sfide, l\'invito gli compare subito.</p>':''}</div>`;
}
function invitoHtml(){if(!S.invito)return'';return`<div class="card invito"><h3>🎯 ${esc(S.invito.da)} ti sfida!</h3><p class="hint">Stanza <b class="mono">${esc(S.invito.stanza)}</b>. ${S.name.trim()?'':'Scrivi prima il tuo nome, poi entra.'}</p><div class="actions"><button class="btn primary big" data-act="accetta">Entra nella sfida</button><button class="btn" data-act="ignora">Ignora</button></div></div>`}

// dati del quesito da allegare a una segnalazione (testo leggibile, niente oggetti grafici)
function infoQuesito(it,extra){const L='ABCDEF';const o={tipo:it.kind,risposta:L[it.answer]||String(it.answer),regola:it.rule||''};
  if(it.kind==='num'){o.serie=it.seq.join(', ');o.opzioni=it.options.join(' | ')}
  else if(it.kind==='verb'){o.analogia=it.a+' : '+it.b+' = '+it.c+' : ?';o.opzioni=it.options.join(' | ')}
  else if(it.kind==='mem'){o.sequenza=(it.seq||[]).join(' ');o.risposta=it.answer}
  return Object.assign(o,extra||{})}
const segnalaBtn=(it,ctx,extra)=>window.Segnala?`<div class="actions" style="justify-content:center">${window.Segnala.bottoneHtml('Errore in questa domanda',ctx,infoQuesito(it,extra))}</div>`:'';
// ========================= interfaccia =========================
const fmtMs=(ms)=>(ms/1000).toFixed(1).replace('.',',')+' s';
function roomLink(){return location.origin+location.pathname+'?stanza='+S.code}
function render(){
  const app=$('#app');
  // durante una partita a un gioco l'iframe non va ridisegnato: si aggiorna solo la striscia
  if(S.screen==='gplay'&&$('#gframe')&&!G.nuovoFrame){render0();return}
  G.nuovoFrame=false;document.body.classList.toggle('gara-on',S.screen==='gplay');
  const r={home:rHome,lobby:rLobby,countdown:rCountdown,round:rRound,result:rResult,end:rEnd,gplay:rGPlay,gres:rGRes,gend:rGEnd,rsearch:rRSearch}[S.screen];
  app.innerHTML=r();
  updateBar();bind();ascolta();
}
function updateBar(){
  const inGame=['countdown','round','result','end','gplay','gres','gend'].includes(S.screen);
  const sc=$('#barScores');document.querySelector('.bar').classList.toggle('ingame',inGame);
  if(inGame){
    const n=names();const m=me(),o=opp();
    sc.innerHTML=`<span class="sc me"><span class="n">${esc(n[m]||'Tu')}</span><span class="v">${S.score[m]}</span></span>${S.streak[m]>=2?`<span class="streak">🔥${S.streak[m]}</span>`:''}`+(S.solo?'':`<span class="sc opp"><span class="n">${esc(n[o]||'Avversario')}</span><span class="v">${S.score[o]}</span></span>`);
  }else sc.innerHTML='';
  const t=$('#barTimer');
  if(S.screen==='gplay'){t.classList.remove('hidden-timer','low');t.textContent=fmtSec(Date.now()-G.startAt)}
  else if(S.screen==='round'){t.classList.remove('hidden-timer');t.textContent=S.timeLeft+' s';t.classList.toggle('low',S.timeLeft<=10)}
  else t.classList.add('hidden-timer');
  if(!$('#soundBtn')){const sb=$('#barSound');if(sb){sb.innerHTML=FX.soundButtonHtml();FX.bindSoundButton()}}
  const p=$('#barProg');
  if(isGara()&&G.plan.length&&['gplay','gres','gend'].includes(S.screen)){p.style.width=((S.screen==='gend'?G.plan.length:G.k+(S.screen==='gres'?1:0))/G.plan.length*100)+'%';return}
  p.style.width=inGame&&S.items.length?((S.screen==='end'?S.items.length:Math.max(0,S.i+(S.screen==='result'?1:0)))/S.items.length*100)+'%':'0';
}
function bind(){
  document.querySelectorAll('[data-act]').forEach(b=>b.addEventListener('click',()=>act(b.dataset.act,b)));
  document.querySelectorAll('.opt[data-i]').forEach(b=>b.addEventListener('click',()=>answer(+b.dataset.i)));
  const jc=$('#joinCode');if(jc){jc.addEventListener('keydown',e=>{if(e.key==='Enter')act('join')});jc.addEventListener('input',()=>{S.joinCode=jc.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,4)})}
  const nm=$('#nameInput');if(nm)nm.addEventListener('input',()=>{S.name=nm.value.slice(0,20);localStorage.setItem('testqi.nome',S.name);clearTimeout(nm._t);nm._t=setTimeout(ascolta,800)});
  const ai=$('#amicoInput');if(ai)ai.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();act('addAmico',ai)}});
  bindGara();
  document.querySelectorAll('[data-preset]').forEach(b=>b.addEventListener('click',()=>{const pr=PRESETS.find(x=>x[0]===b.dataset.preset);S.preset=pr[0];S.cfg.rounds=pr[2];S.cfg.time=pr[3];render()}));
  document.querySelectorAll('[data-cfg]').forEach(el=>el.addEventListener('change',()=>{
    if(el.dataset.cfg==='kinds'){const ks=[...document.querySelectorAll('[data-cfg="kinds"]:checked')].map(x=>x.value);if(ks.length)S.cfg.kinds=ks;else el.checked=true}
    else{S.cfg[el.dataset.cfg]=+el.value;S.preset=(PRESETS.find(x=>x[2]===S.cfg.rounds&&x[3]===S.cfg.time)||[''])[0]}
  }));
}
function act(a,btn){
  if(a==='create'){if(!S.name.trim())S.name='Giocatore 1';createRoom();return}
  if(a==='join'){const jc=$('#joinCode');if(jc)S.joinCode=jc.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,4);const code=(S.joinCode||'').trim();if(code.length!==4){S.err='Il codice ha 4 caratteri.';render();return}const nm=$('#nameInput');if(nm)S.name=nm.value.slice(0,20);if(!S.name.trim())S.name='Giocatore 2';localStorage.setItem('testqi.nome',S.name);joinRoom(code);return}
  if(a==='retry'){S.err='';if(S.role==='guest'&&S.joinCode)joinRoom(S.joinCode);else createRoom();return}
  if(a==='copydiag'){copyText('Diagnostica sfida '+(S.code||'')+' · strada '+(S.via||'-')+'\n'+S.log.join('\n'),btn);return}
  if(a==='solo'){if(!S.name.trim())S.name='Tu';startSolo();return}
  if(a==='start'){if(S.role==='host'&&(S.connected||S.solo)){if(isGara())hostGara();else hostStart()}return}
  if(a==='again'){if(S.role==='host')hostStart();return}
  if(a==='gagain'){if(S.role==='host'&&(S.connected||S.solo))hostGara();return}
  if(a==='gready'){garaReady();return}
  if(a==='rcerca'){const nm=$('#nameInput');if(nm)S.name=nm.value.slice(0,20);rankedCerca(btn.dataset.coda||(S.ranked&&S.ranked.coda)||'quiz');return}
  if(a==='home'){goHome();return}
  if(a==='copy'){copyText(roomLink(),btn);return}
  if(a==='ready'){readyNow();return}
  if(a==='sfida'){sfidaAmico(btn.dataset.nome);return}
  if(a==='invita'){S.invitato=btn.dataset.nome;mandaInvito();return}
  if(a==='addAmico'){const inp=$('#amicoInput');const nome=btn.dataset.nome||(inp&&inp.value);if(addAmico(nome))FX.beep('ok');else if(inp){FX.shake(inp)}render();if(!btn.dataset.nome){const i2=$('#amicoInput');if(i2)i2.focus()}return}
  if(a==='delAmico'){delAmico(btn.dataset.nome);render();return}
  if(a==='accetta'){accettaInvito();return}
  if(a==='ignora'){if(inbox)inbox.pulisci();S.invito=null;render();return}
  if(a==='share'){const txt='Ti sfido a quesiti di logica! Apri questo link ed entra nella mia stanza '+S.code+': '+roomLink();if(navigator.share){navigator.share({title:'Sfida di logica',text:txt}).catch(()=>{})}else copyText(txt,btn);return}
}
function copyText(txt,btn){
  const done=()=>{if(btn){const old=btn.textContent;btn.textContent='Copiato!';setTimeout(()=>{btn.textContent=old},1500)}};
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(txt).then(done,()=>prompt('Copia il link:',txt));
  else prompt('Copia il link:',txt);
}
function rJoin(){
  return`<div class="stack"><div class="eyebrow">Invito a una sfida</div><h1><span class="grad">Ti hanno invitato!</span></h1><p class="lede">Stanza <b class="mono">${esc(S.joinCode)}</b>. Scrivi il tuo nome e premi «Entra»: la partita parte quando l'amico la avvia.</p></div>
    ${S.err?`<div class="err">${esc(S.err)}<div class="actions" style="margin-top:8px"><button class="btn primary" data-act="retry">Riprova</button></div></div>`:''}
    <div class="card"><div class="field"><label for="nameInput">Il tuo nome</label><input id="nameInput" type="text" maxlength="20" value="${esc(S.name)}" placeholder="Come ti chiami?" autocomplete="nickname" style="max-width:300px"></div>
      <input id="joinCode" type="hidden" value="${esc(S.joinCode)}">
      <div class="actions"><button class="btn primary big wide" data-act="join" ${S.busy?'disabled':''}>${S.busy?`<span class="spin"></span> ${esc(S.busy)}`:'Entra nella stanza'}</button></div></div>
    <p class="hint">Codice sbagliato? <a href="./" style="color:var(--brand)">Vai alla pagina delle sfide</a> e inseriscilo a mano.</p>${diagHtml()}`;
}
function rHome(){
  if(S.invited&&S.joinCode.length===4)return rJoin();
  const kindsHtml=KINDS.map(([k,n])=>`<label><input type="checkbox" data-cfg="kinds" value="${k}" ${S.cfg.kinds.includes(k)?'checked':''}> ${n}</label>`).join('');
  const presets=`<div class="presets">${PRESETS.map(p=>`<button class="preset ${S.preset===p[0]?'on':''}" data-preset="${p[0]}" type="button">${p[1]} · ${p[2]} × ${p[3]} s</button>`).join('')}</div>`;
  return`<div class="stack"><div class="eyebrow">Due giocatori · stessi quesiti · stesso tempo</div><h1><span class="grad">Sfide di logica</span></h1>
    <p class="lede">Stesso quesito per entrambi: giusto vale 10 punti più un bonus velocità, e chi risponde giusto per primo prende sempre almeno un punto in più. Vince chi ha più punti. Oppure scegli un gioco (Sudoku, Mahjong, Regine, parole): stessa partita per entrambi, vince chi finisce prima.</p></div>
    ${invitoHtml()}
    ${rankedCard()}
    ${S.err?`<div class="err">${esc(S.err)}${S.role?'<div class="actions" style="margin-top:8px"><button class="btn primary" data-act="retry">Riprova</button></div>':''}</div>`:''}
    <div class="card"><div class="field"><label for="nameInput">Il tuo nome</label><input id="nameInput" type="text" maxlength="20" value="${esc(S.name)}" placeholder="Come ti chiami?" autocomplete="nickname" style="max-width:300px"></div>${accountName()?`<p class="hint">Hai fatto l'accesso come <b>${esc(accountName())}</b>: gli amici ti trovano con questo nome.</p>`:'<p class="hint">Con l\'accesso (in alto) il nome e la lista amici restano uguali su tutti i tuoi dispositivi.</p>'}</div>
    ${amiciHtml(false)}
    <div class="two">
      <div class="card"><h2>Crea una stanza</h2>${cfgGaraHtml(true)}${isGara()?'':presets+`
        <details class="mini"><summary>Regole personalizzate</summary><div class="body">
        <div class="two">
          <div class="field"><label for="cfgRounds">Quesiti</label><select id="cfgRounds" data-cfg="rounds">${[6,10,16].map(n=>`<option value="${n}" ${S.cfg.rounds===n?'selected':''}>${n} quesiti</option>`).join('')}</select></div>
          <div class="field"><label for="cfgTime">Tempo per quesito</label><select id="cfgTime" data-cfg="time">${[30,45,60,90].map(n=>`<option value="${n}" ${S.cfg.time===n?'selected':''}>${n} secondi</option>`).join('')}</select></div>
        </div>
        <div class="field"><label>Tipi di quesito</label><div class="checks">${kindsHtml}</div></div></div></details>`}
        <div class="actions"><button class="btn primary big" data-act="create" ${S.busy?'disabled':''}>${S.busy&&S.role==='host'?`<span class="spin"></span> ${esc(S.busy)}`:'Crea la stanza'}</button></div>
      </div>
      <div class="card"><h2>Entra con un codice</h2>
        <div class="field"><label for="joinCode">Codice stanza</label><input id="joinCode" class="code" type="text" maxlength="4" value="${esc(S.joinCode)}" placeholder="····" autocomplete="off" autocapitalize="characters" spellcheck="false"></div>
        <div class="actions"><button class="btn primary big" data-act="join" ${S.busy?'disabled':''}>${S.busy&&S.role==='guest'?`<span class="spin"></span> ${esc(S.busy)}`:'Entra'}</button></div>
      </div>
    </div>
    <div class="actions"><button class="btn" data-act="solo" ${S.busy?'disabled':''}>⏱️ Da solo contro il tempo</button><a class="btn" href="allenamento.html">🏋️ Allenati</a></div>
    ${diagHtml()}`;
}
function rLobby(){
  const host=S.role==='host';
  const kinds=S.cfg.kinds.map(k=>KINDS.find(x=>x[0]===k)[1]).join(', ');
  const rules=isGara()?`<div class="card"><h3>${host?'Scegli il gioco':'Gioco scelto'}</h3>${cfgGaraHtml(host)}${host?'':'<p class="hint">Sceglie chi ha creato la stanza: lo vedi cambiare qui in diretta.</p>'}</div>`+garaRules():host?`<div class="card"><h3>Gioco</h3>${cfgGaraHtml(true)}</div>`+`<div class="card"><h3>Regole della partita</h3><p>${S.cfg.rounds} quesiti, ${S.cfg.time} secondi ciascuno. Tipi: ${esc(kinds)}.</p><p class="hint">Risposta giusta: 10 punti più un bonus fino a 5 in base alla velocità. Risposta sbagliata o tempo scaduto: 0.</p></div>`:`<div class="card"><h3>Regole della partita</h3><p>${S.cfg.rounds} quesiti, ${S.cfg.time} secondi ciascuno. Tipi: ${esc(kinds)}.</p><p class="hint">Risposta giusta: 10 punti più un bonus fino a 5 in base alla velocità. Risposta sbagliata o tempo scaduto: 0.</p></div>`;
  const players=`<div class="card"><h3>Giocatori</h3>
      <div class="pl"><span class="dot on"></span><span class="nm">${esc(host?S.name:S.oppName)}</span><span class="st">${host?'tu · ha creato la stanza':'ha creato la stanza'}</span></div>
      <div class="pl"><span class="dot ${S.connected?'on':''}"></span><span class="nm">${esc(host?(S.connected?S.oppName:'In attesa…'):S.name)}</span><span class="st">${host?(S.connected?'collegato':'<span class="spin"></span> non ancora entrato'):'tu · collegato'}</span></div></div>`;
  if(host){
    return`<div class="stack"><div class="eyebrow">Stanza creata</div><h1>Invita un amico</h1><p class="lede">${S.connected?`${esc(S.oppName)} è dentro: premi «Inizia la sfida».`:'Mandagli il link (WhatsApp, Telegram, SMS…): aprendolo entra subito. Quando entra, premi «Inizia la sfida».'}</p></div>
      ${S.connected?'':`<div class="actions"><button class="btn primary big wide" data-act="share">📲 ${navigator.share?'Manda il link a un amico':'Copia il link da mandare'}</button></div>`}
      ${S.connected?'':(S.invitato&&S.invitoStato==='ok'?`<p class="hint">✅ Invito mandato a <b>${esc(S.invitato)}</b>: se ha la pagina delle sfide aperta, gli compare adesso. Se non entra, mandagli il link qui sopra.</p>`:S.invitato&&S.invitoStato==='no'?`<p class="hint">Non sono riuscito a lasciare l'invito a ${esc(S.invitato)}: mandagli il link.</p>`:'')}
      ${S.connected||!amici().length?'':amiciHtml(true)}
      <div class="codebox"><span class="hint">oppure digli il codice</span><span class="code">${esc(S.code)}</span><span class="lnk">${esc(roomLink())}</span><div class="actions"><button class="btn" data-act="copy">Copia il link</button></div></div>
      ${S.err?`<div class="err">${esc(S.err)}</div>`:''}${players}${recordHtml()}${rules}
      <div class="actions"><button class="btn primary big wide" data-act="start" ${S.connected?'':'disabled'}>${S.connected?'Inizia la sfida':'In attesa dell\'amico…'}</button><button class="btn" data-act="home">Annulla</button></div>${diagHtml()}`;
  }
  return`<div class="stack"><div class="eyebrow">Stanza ${esc(S.code)}</div><h1>Sei dentro</h1><p class="lede">La partita parte quando ${esc(S.oppName||'chi ha creato la stanza')} preme «Inizia la sfida». Tieni la pagina aperta.</p></div>
    ${S.err?`<div class="err">${esc(S.err)}</div>`:''}${players}${rules}
    <div class="wait"><span class="spin"></span> In attesa dell'avvio…</div>
    <div class="actions"><button class="btn" data-act="home">Esci dalla stanza</button></div>${diagHtml()}`;
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
  const sp=spiegazione?spiegazione(it):(it.rule?'Regola: '+it.rule+'.':'');
  const rule=sp?`<div class="card spiega"><b>💡 Spiegazione</b><p>${esc(sp)}</p></div>`:'';
  const left=Math.max(0,Math.ceil(((S.resultEnd||Date.now())-Date.now())/1000));
  const iReady=S.ready&&S.ready[m],oReady=S.ready&&S.ready[o];
  const nextTxt=S.i+1<S.items.length?'Prossimo quesito':'Risultato finale';
  const readyBox=`<div class="actions"><button class="btn primary big wide" data-act="ready" ${iReady?'disabled':''}>${iReady?(S.solo?'…':`<span class="spin"></span> Aspetto ${esc(n[o]||'l\'avversario')}…`):'Avanti ▶'}</button></div><p class="hint" style="text-align:center">${nextTxt} tra <span class="mono" id="resLeft">${left}</span> s${!S.solo&&oReady&&!iReady?` · ${esc(n[o]||'L\'avversario')} è pronto`:''}</p>`;
  return`<div class="eyebrow">${esc(KIND_NAME[it.kind])} · quesito ${S.i+1} di ${S.items.length} · esito</div>
    <div class="verdict">${row(m,'me')}${S.solo?'':row(o,'opp')}</div>
    <p class="q">La risposta giusta era ${LETTERS[it.answer]}.</p>${rule}${readyBox}${body}${segnalaBtn(it,'Sfide · '+KIND_NAME[it.kind]+' · quesito '+(S.i+1),{seme:S.seed,indice:S.i})}`;
}
function rEnd(){
  const n=names(),m=me(),o=opp();const sm=S.score[m],so=S.score[o];
  let title,sub;
  if(S.solo){title=`${sm} punti`;const nG=S.results.filter(r=>r&&r.pts[0]>0).length;sub=`${nG} ${nG===1?'risposta giusta':'risposte giuste'} su ${S.items.length}.`}
  else if(sm>so){title='Hai vinto!';sub=`${sm} a ${so} contro ${n[o]||'l\'avversario'}.`}
  else if(sm<so){title='Ha vinto '+(n[o]||'l\'avversario');sub=`${so} a ${sm}. Chiedi la rivincita!`}
  else{title='Pareggio!';sub=`${sm} punti a testa.`}
  const rows=S.items.map((it,i)=>{const r=S.results[i];const a=S.ans[i]||[];const cell=(who)=>{const x=a[who];const ok=x&&x.choice===it.answer;return`<td class="num ${ok?'ok':(x&&x.choice!==null?'bad':'')}">${r?(ok?'+'+r.pts[who]:'0'):'–'}</td>`};
    return`<tr><td class="num">${i+1}</td><td>${esc(KIND_NAME[it.kind])}</td>${cell(m)}${S.solo?'':cell(o)}</tr>`}).join('');
  const again=S.solo?`<button class="btn primary big" data-act="again">Ancora</button>`:S.role==='host'?`<button class="btn primary big" data-act="again" ${S.connected?'':'disabled'}>Rivincita</button>`:(S.connected?`<div class="wait"><span class="spin"></span> ${esc(n[o]||'L\'avversario')} può avviare la rivincita.</div>`:'');
  const again2=S.ranked?`<button class="btn primary big" data-act="rcerca">🏆 Un'altra classificata</button>`:again;
  return`<div class="final"><div class="eyebrow">${S.solo?'Allenamento finito':S.ranked?'Classificata finita':'Sfida finita'}</div><div class="big">${esc(title)}</div><div class="sub">${esc(sub)}</div>
      <div class="scoreline"><div class="p me"><span class="n">${esc(n[m]||'Tu')}</span><span class="v">${sm}</span></div>${S.solo?'':`<div class="vs">contro</div><div class="p opp"><span class="n">${esc(n[o]||'Avversario')}</span><span class="v">${so}</span></div>`}</div></div>
    ${rankedEsitoHtml()}${recordHtml()}${S.err?`<div class="err">${esc(S.err)}</div>`:''}
    ${!S.solo&&S.oppName&&!amici().some(a=>amicoKey(a.nome)===amicoKey(S.oppName))?`<div class="actions"><button class="btn" data-act="addAmico" data-nome="${esc(S.oppName)}">👥 Aggiungi ${esc(S.oppName)} agli amici</button></div>`:''}
    <div class="actions">${again2}<button class="btn" data-act="home">Torna all'inizio</button><a class="btn" href="allenamento.html">🏋️ Allenati</a></div>
    <details open><summary>Quesito per quesito</summary><div class="body"><table><thead><tr><th>#</th><th>Tipo</th><th style="text-align:right">${esc(n[m]||'Tu')}</th>${S.solo?'':`<th style="text-align:right">${esc(n[o]||'Avversario')}</th>`}</tr></thead><tbody>${rows}</tbody></table></div></details>`;
}

// ========================= partite classificate =========================
// Ricerca automatica di un avversario di livello simile (Rete.cerca), regole fisse, punti e lega (js/classificate.js).
const CL=window.Classificate;
const CODE_RANKED={quiz:{n:'Quiz',ic:'🧠'},giochi:{n:'Giochi',ic:'🎲'}};
let ricerca=null,autoT=null;
function rankedCfg(coda,puntiMedi){
  if(coda==='quiz')return{rounds:8,time:40,kinds:['mat','num','verb','rot'],mode:'quiz',gn:1,gd:4,gcresc:false,gpreset:'',mix:null};
  const i=CL.LEGHE.indexOf(CL.LEGHE.slice().reverse().find(l=>puntiMedi>=l.min));
  return{rounds:10,time:45,kinds:['mat','num','verb','rot'],mode:'mix',gn:3,gd:Math.min(9,3+i),gcresc:false,gpreset:'',mix:null};
}
function legaHtml(p,mini){const L=CL.lega(p);return`<span class="lega ${L.id}${mini?' mini':''}">${L.ic} ${esc(L.txt)}</span>`}
function rankedCard(){
  if(!CL)return'';const o=CL.leggi(),L=CL.lega(o.punti),st=CL.stagione();
  return`<div class="card ranked"><div class="rk-top"><h2>🏆 Classificate</h2>${legaHtml(o.punti)}</div>
    <div class="rk-bar"><i style="width:${L.pct}%"></i></div>
    <p class="hint">${Math.round(o.punti)} punti${L.prossima?` · ${L.mancano} per ${esc(L.prossima)}`:''} · ${o.vinte} vinte, ${o.perse} perse · stagione ${esc(st.nome)}, finisce tra ${st.giorniAllaFine} giorn${st.giorniAllaFine===1?'o':'i'}${o.storia&&o.storia.length?` · stagione scorsa: ${esc(o.storia[o.storia.length-1].lega)}`:''}</p>
    <div class="rk-btns"><button class="btn primary" data-act="rcerca" data-coda="quiz">🧠 Quiz</button><button class="btn primary" data-act="rcerca" data-coda="giochi">🎲 Giochi</button></div></div>`;
}
function rankedCerca(coda){
  if(!S.name.trim()){S.err='Scrivi il tuo nome prima di cercare una partita.';S.screen='home';render();const n=$('#nameInput');if(n)n.focus();return}
  stopRicerca();if(S.connected)send({t:'bye'});destroyNet();const name=S.name,lg=S.log;S=fresh();S.name=name;S.log=lg;
  const o=CL.leggi();S.ranked={coda,stato:'cerca',online:0,attesa:0,finestra:100,punti:o.punti};S.screen='rsearch';render();
  log('classificata '+coda+': cerco un avversario ('+Math.round(o.punti)+' punti)');
  ricerca=window.Rete.cerca(coda,{nome:S.name,punti:o.punti},{
    onInfo(i){if(!S.ranked||S.ranked.stato!=='cerca')return;Object.assign(S.ranked,i);const el=$('#rkInfo');if(el)el.innerHTML=rkInfoHtml()},
    onError(w){if(S.screen==='rsearch'){S.err='Non riesco a collegarmi: '+w;render()}},
    onMatch(m){ricerca=null;if(!S.ranked)return;S.ranked.stato='trovato';S.ranked.opp=m.opp;log('avversario trovato: '+m.opp.nome+' ('+m.opp.punti+'), stanza '+m.stanza);FX.beep('ok');
      if(m.ruolo==='host'){S.cfg=rankedCfg(coda,(o.punti+m.opp.punti)/2);S.role='host';S.code=m.stanza;S.busy='Preparo la partita…';render();net=window.Rete.connetti('host',S.code,VIA,callbacks())}
      else{S.role='guest';S.code=m.stanza;S.joinCode=m.stanza;S.busy='Mi collego…';render();net=window.Rete.connetti('guest',S.code,VIA,callbacks())}
      clearTimeout(autoT);autoT=setTimeout(()=>{if(S.ranked&&!S.ranked.avviato&&!S.connected){log('l\'avversario non si è collegato');rankedRiprova()}},25000)}
  },log);
}
function stopRicerca(){clearTimeout(autoT);if(ricerca){ricerca.close();ricerca=null}}
// l'avversario trovato non arriva o se ne va prima del via: si torna a cercare senza perdere punti
function rankedRiprova(){if(!S.ranked)return;const c=S.ranked.coda;if(S.ranked.avviato&&!S.ranked.det){S.ranked.det=CL.chiudi('vinta')}else if(!S.ranked.avviato){rankedCerca(c);S.err='L\'avversario non è arrivato: cerco qualcun altro.';render()}}
function rankedAvvia(){if(!S.ranked||S.ranked.avviato)return;S.ranked.avviato=true;clearTimeout(autoT);CL.avvia({nome:S.oppName||S.ranked.opp.nome,punti:S.ranked.opp.punti,coda:S.ranked.coda})}
function rankedChiudi(mio,suo){if(!S.ranked||!S.ranked.avviato||S.ranked.det)return;S.ranked.det=CL.chiudi(mio>suo?'vinta':mio<suo?'persa':'pari');const d=S.ranked.det;if(d&&d.promosso){FX.confetti(160);FX.beep('win')}}
function rkInfoHtml(){const r=S.ranked;const s=Math.floor((r.attesa||0)/1000);
  return`<span class="mono">${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}</span> · ${r.finestra>1e8?'qualsiasi livello':'livello simile (±'+r.finestra+' punti)'} · ${r.online?`${r.online} in coda adesso`:'nessun altro in coda per ora'}`}
function rRSearch(){
  const r=S.ranked;const cd=CODE_RANKED[r.coda];
  if(r.stato==='trovato')return`<div class="stack"><div class="eyebrow">Classificata · ${cd.ic} ${cd.n}</div><h1>Avversario trovato!</h1></div>
    <div class="card rk-vs"><div>${esc(S.name)}<br>${legaHtml(r.punti,1)}</div><b>contro</b><div>${esc(r.opp.nome)}<br>${legaHtml(r.opp.punti,1)}</div></div>
    <div class="wait"><span class="spin"></span> ${esc(S.busy||'Si parte tra un attimo…')}</div>${S.err?`<div class="err">${esc(S.err)}</div>`:''}
    <div class="actions"><button class="btn" data-act="home">Annulla</button></div>${diagHtml()}`;
  return`<div class="stack"><div class="eyebrow">Classificata · ${cd.ic} ${cd.n}</div><h1>Cerco un avversario…</h1>
    <p class="lede">${r.coda==='quiz'?'8 quesiti da 40 secondi, chi fa più punti vince.':'Al meglio di 3 partite a giochi misti, difficoltà in base alla vostra lega: vince chi finisce prima.'}</p></div>
    <div class="card rk-search"><div class="rk-radar"><span></span>${legaHtml(r.punti)}</div><p class="hint" id="rkInfo">${rkInfoHtml()}</p></div>
    ${S.err?`<div class="err">${esc(S.err)}</div>`:''}
    <p class="hint">Vinci contro uno più forte e prendi più punti; se perdi contro uno più debole ne perdi di più. Chiudere a metà conta come sconfitta.</p>
    <div class="actions"><button class="btn" data-act="home">Annulla</button></div>${diagHtml()}`;
}
function rankedEsitoHtml(){
  const d=S.ranked&&S.ranked.det;if(!d)return'';const L=d.lega;
  return`<div class="card rk-esito ${d.delta>=0?'su':'giu'}"><div class="rk-top"><b>${d.delta>=0?'+':''}${d.delta} punti</b>${legaHtml(d.punti)}</div>
    <div class="rk-bar"><i style="width:${L.pct}%"></i></div>
    <p class="hint">${d.promosso?`🎉 Sei salito in <b>${esc(L.txt)}</b>!`:d.retrocesso?`Sei sceso in ${esc(L.txt)}: rifatti subito.`:L.prossima?`Ti mancano ${L.mancano} punti per ${esc(L.prossima)}.`:'Sei nella lega più alta.'}${S.ranked.abbandono?' L\'avversario ha lasciato la partita.':''}</p></div>`;
}

// ========================= sfide sui giochi =========================
// Stessa partita per entrambi (gioco, difficoltà, livello decisi da chi crea la stanza), gioco caricato in un iframe
// della stessa origine in «modalità sfida» (?sfida=1&d=D&l=L). Vince il turno chi finisce per primo; vince la sfida chi
// vince più turni. Il gioco avvisa con postMessage {sfida:'pronto'|'progresso'|'fatto'|'resa'}; finché un gioco non
// ha la modalità sfida (window.SFIDA_OK), un ripiego avvia il livello dall'esterno e legge S.done.
const GIOCHI_SFIDA=[
  {id:'sudoku',n:'Sudoku',ic:'🔢',url:(d,l)=>`../giochi/sudoku.html?sfida=1&d=${d}&l=${l}#liv=${l}`,hook:'Sudoku',g:'sudoku'},
  {id:'mahjong',n:'Mahjong',ic:'🀄',url:(d,l)=>`../giochi/mahjong.html?sfida=1&d=${d}&l=${l}#liv=${l}`,hook:'Mahjong',g:'mahjong'},
  {id:'queens',n:'Regine',ic:'👑',url:(d,l)=>`../giochi/queens.html?sfida=1&d=${d}&l=${l}#liv=${l}`,hook:'Queens',g:'queens'},
  {id:'cody',n:'Parola nascosta',ic:'🔤',url:(d,l)=>`../parole/?gioco=cody&d=${d}&l=${l}&sfida=1`,hook:'Parole'},
  {id:'cruci',n:'Cruciverba',ic:'▦',url:(d,l)=>`../parole/?gioco=cruci&d=${d}&l=${l}&sfida=1`,hook:'Parole'},
  {id:'critto',n:'Crittografato',ic:'🔐',url:(d,l)=>`../parole/?gioco=critto&d=${d}&l=${l}&sfida=1`,hook:'Parole'},
];
const GPRESET=[['g1','⚡ 1 partita',1,false],['g3','🎯 Al meglio di 3',3,false],['g5','🏆 5 crescenti',5,true]];
const gInfo=(id)=>GIOCHI_SFIDA.find(g=>g.id===id);
const isGara=()=>S.cfg.mode&&S.cfg.mode!=='quiz';
function gPlan(seed,cfg){
  const r=window.Quesiti.mulberry32(seed);const list=cfg.mode==='mix'?(cfg.mix&&cfg.mix.length?cfg.mix:GIOCHI_SFIDA.map(g=>g.id)):[cfg.mode];
  const ord=list.slice();for(let i=ord.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[ord[i],ord[j]]=[ord[j],ord[i]]}
  const out=[];for(let k=0;k<cfg.gn;k++)out.push({g:ord[k%ord.length],d:Math.min(10,cfg.gd+(cfg.gcresc?k:0)),l:1+Math.floor(r()*400)});
  return out;
}
// scelta del gioco, rapida: una riga di chip + preset + difficoltà
function cfgGaraHtml(editable){
  const c=S.cfg;const dis=editable?'':'disabled';
  const chip=(id,ic,n)=>`<button type="button" class="gchip ${c.mode===id?'on':''}" data-gmode="${id}" ${dis}>${ic} ${n}</button>`;
  let h=`<div class="gchips">${chip('quiz','🧠','Quiz')}${GIOCHI_SFIDA.map(g=>chip(g.id,g.ic,g.n)).join('')}${chip('mix','🎲','Mix')}</div>`;
  if(isGara()){
    h+=`<div class="presets">${GPRESET.map(p=>`<button type="button" class="preset ${c.gpreset===p[0]?'on':''}" data-gpreset="${p[0]}" ${dis}>${p[1]}</button>`).join('')}</div>
    <div class="field"><label>Difficoltà${c.gcresc?' di partenza':''}: <b>${c.gd}</b>${c.gcresc?' → '+Math.min(10,c.gd+c.gn-1):''}</label><div class="gdiff">${[1,2,3,4,5,6,7,8,9,10].map(d=>`<button type="button" class="gd ${c.gd===d?'on':''}" data-gd="${d}" ${dis}>${d}</button>`).join('')}</div></div>
    <details class="mini gopz" ${G.opzAperte?'open':''}><summary>Altre opzioni</summary><div class="body">
      <div class="field"><label>Partite</label><div class="presets">${[1,2,3,5,7].map(n=>`<button type="button" class="preset ${c.gn===n?'on':''}" data-gn="${n}" ${dis}>${n}</button>`).join('')}</div></div>
      <div class="field"><label>Difficoltà</label><div class="presets"><button type="button" class="preset ${!c.gcresc?'on':''}" data-gcresc="0" ${dis}>Sempre uguale</button><button type="button" class="preset ${c.gcresc?'on':''}" data-gcresc="1" ${dis}>Crescente (+1 a partita)</button></div></div>
      ${c.mode==='mix'?`<div class="field"><label>Giochi nel mix</label><div class="checks">${GIOCHI_SFIDA.map(g=>`<label><input type="checkbox" data-gmix="${g.id}" ${(!c.mix||!c.mix.length||c.mix.includes(g.id))?'checked':''} ${dis}> ${g.ic} ${g.n}</label>`).join('')}</div></div>`:''}
    </div></details>`;
  }
  return h;
}
function garaRules(){const c=S.cfg;const g=c.mode==='mix'?'🎲 Mix di giochi':(gInfo(c.mode).ic+' '+gInfo(c.mode).n);
  return`<div class="card"><h3>Regole della sfida</h3><p>${g} · ${c.gn} partit${c.gn===1?'a':'e'} · difficoltà ${c.gd}${c.gcresc&&c.gn>1?' → '+Math.min(10,c.gd+c.gn-1):''}.</p><p class="hint">Stessa partita per entrambi: vince la partita chi la finisce per primo. Vince la sfida chi vince più partite.</p></div>`}
function bindGara(){
  document.querySelectorAll('details.gopz').forEach(d=>d.addEventListener('toggle',()=>{G.opzAperte=d.open}));
  const upd=()=>{if(S.role==='host'&&S.connected)send({t:'cfg',cfg:S.cfg});render()};
  document.querySelectorAll('[data-gmode]').forEach(b=>b.addEventListener('click',()=>{S.cfg.mode=b.dataset.gmode;if(S.cfg.mode!=='quiz'&&!S.cfg.gn){S.cfg.gn=1;S.cfg.gd=4;S.cfg.gpreset='g1'}upd()}));
  document.querySelectorAll('[data-gpreset]').forEach(b=>b.addEventListener('click',()=>{const p=GPRESET.find(x=>x[0]===b.dataset.gpreset);S.cfg.gpreset=p[0];S.cfg.gn=p[2];S.cfg.gcresc=p[3];upd()}));
  document.querySelectorAll('[data-gd]').forEach(b=>b.addEventListener('click',()=>{S.cfg.gd=+b.dataset.gd;upd()}));
  document.querySelectorAll('[data-gn]').forEach(b=>b.addEventListener('click',()=>{S.cfg.gn=+b.dataset.gn;S.cfg.gpreset=(GPRESET.find(p=>p[2]===S.cfg.gn&&p[3]===!!S.cfg.gcresc)||[''])[0];upd()}));
  document.querySelectorAll('[data-gcresc]').forEach(b=>b.addEventListener('click',()=>{S.cfg.gcresc=b.dataset.gcresc==='1';S.cfg.gpreset=(GPRESET.find(p=>p[2]===S.cfg.gn&&p[3]===S.cfg.gcresc)||[''])[0];upd()}));
  document.querySelectorAll('[data-gmix]').forEach(el=>el.addEventListener('change',()=>{const ks=[...document.querySelectorAll('[data-gmix]:checked')].map(x=>x.dataset.gmix);if(!ks.length){el.checked=true;return}S.cfg.mix=ks;upd()}));
}
// ---- svolgimento ----
let G={k:-1,plan:[],won:[0,0],ms:[[],[]],deciso:false,startAt:0,frame:null,poll:null,prog:[0,0],ready:[false,false],stato:''};
function hostGara(){const seed=Math.floor(Math.random()*2147483647);const plan=gPlan(seed,S.cfg);send({t:'gstart',plan,cfg:S.cfg});garaStart(plan)}
function garaStart(plan){
  stopTimer();clearTimeout(nextT);
  G={opzAperte:G.opzAperte,k:-1,plan,won:[0,0],ms:[[],[]],deciso:false,startAt:0,frame:null,poll:null,prog:[0,0],ready:[false,false],stato:''};
  S.score=[0,0];S.err='';FX.beep('start');rankedAvvia();
  if(S.role==='host'||S.solo)garaNext();
}
function garaNext(){const k=G.k+1;if(k>=G.plan.length){send({t:'gend'});garaEnd();return}send({t:'gturno',k});garaTurno(k)}
function garaTurno(k){
  clearInterval(G.poll);stopTimer();clearTimeout(nextT);G.k=k;G.deciso=false;G.prog=[0,0];G.ready=[false,false];G.res=null;G.stato='caricamento';
  S.screen='gplay';G.nuovoFrame=true;render();render0();
  const p=G.plan[k],gi=gInfo(p.g);const f=$('#gframe');G.frame=f;G.startAt=Date.now();
  f.addEventListener('load',()=>garaFrameLoad(p,gi));
  if(!G.snap)G.snap=SNAP_KEYS.map(k=>localStorage.getItem(k));
  f.src=gi.url(p.d,p.l);
  tick=setInterval(()=>{const t=$('#barTimer');if(t&&S.screen==='gplay'){t.classList.remove('hidden-timer');t.textContent=fmtSec(Date.now()-G.startAt)}},500);
}
const fmtSec=(ms)=>{const s=Math.floor(ms/1000);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')};
// i giochi senza modalità sfida potrebbero salvare livelli o difficoltà: a fine partita si rimette tutto com'era
const SNAP_KEYS=['testqi.giochi','testqi.parole'];
function garaRipristina(){if(!G.snap)return;SNAP_KEYS.forEach((k,i)=>{try{const v=G.snap[i];if(localStorage.getItem(k)!==v){if(v==null)localStorage.removeItem(k);else localStorage.setItem(k,v)}}catch(e){}});G.snap=null}
function garaFrameLoad(p,gi){
  const w=G.frame&&G.frame.contentWindow;if(!w)return;
  G.startAt=Date.now();G.stato='gioco';
  try{
    const doc=w.document;
    // nasconde barra e menu del gioco anche se la modalità sfida non c'è ancora
    const st=doc.createElement('style');st.textContent='.bar,.home-btn,#barMenu,.sg-fab,.pwa-banner,footer{display:none!important}body{padding-top:0!important}';doc.head.appendChild(st);
    if(!w.SFIDA_OK){
      // in sfida la partita non deve cambiare i livelli salvati del giocatore
      try{w.Storage.prototype.setItem=function(){}}catch(e){}
      // ripiego: avvia il livello giusto dall'esterno, senza toccare la difficoltà salvata
      const h=w[gi.hook];
      if(gi.g&&h&&h.P&&h.nuovo){const old=h.P[gi.g].diff;h.P[gi.g].diff=p.d;h.nuovo(p.l,false);h.P[gi.g].diff=old}
      G.poll=setInterval(()=>{try{const hh=w[gi.hook];if(hh&&hh.S&&hh.S.done&&!G.deciso&&S.screen==='gplay')garaFatto()}catch(e){}},400);
    }
  }catch(e){log('gioco: '+e.message)}
  render0();
}
// messaggi dal gioco nell'iframe
window.addEventListener('message',e=>{
  if(e.origin!==location.origin||!e.data||!e.data.sfida||S.screen!=='gplay')return;
  if(!G.frame||e.source!==G.frame.contentWindow)return;
  const m=e.data;
  if(m.sfida==='progresso'){G.prog[me()]=Math.max(0,Math.min(100,+m.pct||0));send({t:'gprog',k:G.k,pct:G.prog[me()]});render0()}
  else if(m.sfida==='fatto')garaFatto(m);
  else if(m.sfida==='resa')garaResa();
});
function garaFatto(m){if(G.deciso)return;const ms=(m&&m.ms)||Date.now()-G.startAt;G.mioMs=ms;log('partita finita in '+fmtSec(ms));
  if(S.role==='host'||S.solo)garaDecidi(me(),ms);else send({t:'gfatto',k:G.k,ms})}
function garaResa(){if(G.deciso)return;if(S.role==='host'||S.solo)garaDecidi(S.solo?-1:opp(),null,true);else send({t:'gresa',k:G.k})}
function garaDecidi(win,ms,resa){if(G.deciso)return;const r={k:G.k,win,ms,resa:!!resa};send({t:'gres',...r});garaRisultato(r)}
function garaRisultato(r){
  if(r.k!==G.k)return;G.deciso=true;clearInterval(G.poll);stopTimer();setTimeout(garaRipristina,300);
  try{G.frame&&G.frame.contentWindow.postMessage({sfida:'stop'},location.origin)}catch(e){}
  if(r.win>=0){G.won[r.win]++;G.ms[r.win].push(r.ms||0)}S.score=G.won.slice();G.res=r;G.ready=[false,false];
  const mine=r.win===me();FX.beep(mine?'win':(S.solo?'win':'lose'));if(mine&&!S.solo)FX.confetti(60);
  S.screen='gres';render();
  if(S.role==='host'||S.solo){clearTimeout(nextT);nextT=setTimeout(garaNext,15000)}
}
function garaReady(){if(S.screen!=='gres'||G.ready[me()])return;G.ready[me()]=true;send({t:'gready',k:G.k});render();garaCheckReady()}
function garaCheckReady(){if((S.role==='host'||S.solo)&&S.screen==='gres'&&(S.solo||(G.ready[0]&&G.ready[1]))){clearTimeout(nextT);garaNext()}}
function garaEnd(){garaRipristina();rankedChiudi(G.won[me()],G.won[opp()]);clearInterval(G.poll);stopTimer();clearTimeout(nextT);S.screen='gend';
  if(!S.solo){const m=me(),o=opp();const key=(S.oppName||'?').trim().toLowerCase();const rec=FX.load(KEY_REC,{});const r=rec[key]||{nome:S.oppName,v:0,p:0,x:0};
    if(G.won[m]>G.won[o])r.v++;else if(G.won[m]<G.won[o])r.p++;else r.x++;r.nome=S.oppName;r.ultimo=Date.now();rec[key]=r;FX.save(KEY_REC,rec);
    if(G.won[m]>G.won[o]){FX.beep('win');FX.confetti(120)}else if(G.won[m]<G.won[o])FX.beep('lose');else FX.beep('ok')}
  render()}
function onGaraData(m){
  switch(m.t){
    case'cfg':if(S.role==='guest'&&m.cfg){S.cfg=Object.assign(S.cfg,m.cfg);if(S.screen==='lobby')render()}return true;
    case'gstart':if(S.role==='guest'){S.cfg=Object.assign(S.cfg,m.cfg);garaStart(m.plan)}return true;
    case'gturno':if(S.role==='guest')garaTurno(m.k);return true;
    case'gprog':if(m.k===G.k){G.prog[opp()]=m.pct;render0()}return true;
    case'gfatto':if(S.role==='host'&&m.k===G.k&&!G.deciso)garaDecidi(opp(),m.ms);return true;
    case'gresa':if(S.role==='host'&&m.k===G.k&&!G.deciso)garaDecidi(me(),null,true);return true;
    case'gres':if(S.role==='guest')garaRisultato(m);return true;
    case'gready':if(m.k===G.k&&S.screen==='gres'){G.ready[opp()]=true;render();garaCheckReady()}return true;
    case'gend':if(S.role==='guest')garaEnd();return true;
  }
  return false;
}
// la schermata di gioco non si ridisegna (perderebbe l'iframe): si aggiorna solo la striscia in alto
function render0(){
  const el=$('#gstrip');if(!el){updateBar();return}
  const n=names(),m=me(),o=opp();const p=G.plan[G.k],gi=gInfo(p.g);
  el.innerHTML=`<span class="gs-t">${gi.ic} ${esc(gi.n)} · ${G.k+1}/${G.plan.length} · diff. ${p.d}</span>${S.solo?'':`<span class="gs-o">${esc(n[o]||'Avversario')}: ${G.prog[o]?G.prog[o]+'%':'gioca…'}<i style="width:${G.prog[o]||0}%"></i></span>`}${frameOk()?'':'<button class="btn" data-act="gresa" style="padding:4px 10px;font-size:.85rem">Mi arrendo</button>'}`;
  const rb=el.querySelector('[data-act=gresa]');if(rb)rb.addEventListener('click',()=>{if(confirm('Vuoi arrenderti in questa partita?'))garaResa()});
  updateBar();
}
function frameOk(){try{return!!(G.frame&&G.frame.contentWindow&&G.frame.contentWindow.SFIDA_OK)}catch(e){return false}}
function rGPlay(){return`<div class="gstrip" id="gstrip"></div><iframe id="gframe" class="gframe" title="Partita" allow="autoplay"></iframe>`}
function rGRes(){
  const n=names(),m=me(),o=opp();const r=G.res;const p=G.plan[G.k],gi=gInfo(p.g);
  const mine=r.win===m;const title=S.solo?`Finito in ${fmtSec(r.ms||0)}`:r.resa?(mine?`${esc(n[o]||'L\'avversario')} si è arreso`:'Ti sei arreso'):mine?'Hai finito per primo! 🏆':`${esc(n[o]||'L\'avversario')} ha finito per primo`;
  const iReady=G.ready[m];
  return`<div class="final"><div class="eyebrow">${gi.ic} ${esc(gi.n)} · partita ${G.k+1} di ${G.plan.length}</div><div class="big">${title}</div>${r.ms&&!S.solo?`<div class="sub">Tempo: ${fmtSec(r.ms)}</div>`:''}
    <div class="scoreline"><div class="p me"><span class="n">${esc(n[m]||'Tu')}</span><span class="v">${G.won[m]}</span></div>${S.solo?'':`<div class="vs">partite vinte</div><div class="p opp"><span class="n">${esc(n[o]||'Avversario')}</span><span class="v">${G.won[o]}</span></div>`}</div></div>
    <div class="actions"><button class="btn primary big wide" data-act="gready" ${iReady?'disabled':''}>${iReady?`<span class="spin"></span> Aspetto ${esc(n[o]||'l\'avversario')}…`:(G.k+1<G.plan.length?'Prossima partita ▶':'Risultato finale ▶')}</button></div>
    <p class="hint" style="text-align:center">Si parte da soli tra 15 secondi.${!S.solo&&G.ready[o]&&!iReady?' '+esc(n[o]||'L\'avversario')+' è pronto.':''}</p>`;
}
function rGEnd(){
  const n=names(),m=me(),o=opp();const a=G.won[m],b=G.won[o];
  const tm=(x)=>G.ms[x].reduce((s,v)=>s+v,0);
  let title=S.solo?`${a} partit${a===1?'a':'e'} finit${a===1?'a':'e'}`:a>b?'Hai vinto la sfida!':a<b?`Ha vinto ${esc(n[o]||'l\'avversario')}`:'Pareggio!';
  const again=S.solo?`<button class="btn primary big" data-act="gagain">Ancora</button>`:S.role==='host'?`<button class="btn primary big" data-act="gagain" ${S.connected?'':'disabled'}>Rivincita</button>`:(S.connected?`<div class="wait"><span class="spin"></span> ${esc(n[o]||'L\'avversario')} può avviare la rivincita.</div>`:'');
  return`<div class="final"><div class="eyebrow">${S.ranked?'Classificata finita':'Sfida finita'}</div><div class="big">${title}</div>${!S.solo&&a===b&&a>0?`<div class="sub">Tempo totale delle vittorie: tu ${fmtSec(tm(m))}, ${esc(n[o]||'avversario')} ${fmtSec(tm(o))}</div>`:''}
    <div class="scoreline"><div class="p me"><span class="n">${esc(n[m]||'Tu')}</span><span class="v">${a}</span></div>${S.solo?'':`<div class="vs">contro</div><div class="p opp"><span class="n">${esc(n[o]||'Avversario')}</span><span class="v">${b}</span></div>`}</div></div>
    ${rankedEsitoHtml()}${recordHtml()}${S.err?`<div class="err">${esc(S.err)}</div>`:''}
    <div class="actions">${S.ranked?`<button class="btn primary big" data-act="rcerca">🏆 Un'altra classificata</button>`:again}<button class="btn" data-act="home">Torna all'inizio</button></div>`;
}

// ========================= avvio =========================
window.addEventListener('beforeunload',e=>{if(S.connected&&['round','countdown','result','gplay','gres'].includes(S.screen)){e.preventDefault();e.returnValue=''}});
const q=new URLSearchParams(location.search).get('stanza');
if(q){S.joinCode=q.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,4);S.invited=S.joinCode.length===4}
render();
if(S.invited){if(S.name.trim())joinRoom(S.joinCode);else setTimeout(()=>$('#nameInput')&&$('#nameInput').focus(),0)}
window.addEventListener('testqi:account',()=>{if(S.screen==='home'){if(!S.name.trim())S.name=accountName()||'';render()}});
window.__sfide={get S(){return S},get G(){return G},answer,hostStart,showResult,garaFatto,gPlan};
})();
