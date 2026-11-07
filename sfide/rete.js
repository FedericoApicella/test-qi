// Collegamento tra i due giocatori, con due strade:
//  1. "ponte" (predefinita): i messaggi passano da un servizio MQTT pubblico gratuito via WebSocket sicuro
//     (porta 443/8084, funziona da qualunque rete, anche due telefoni su reti mobili diverse).
//     Si provano più servizi insieme e si usa il primo che risponde. Client MQTT 3.1.1 minimo, scritto qui
//     (nessuna libreria): CONNECT, SUBSCRIBE, PUBLISH QoS 0 con messaggi "retained", PINGREQ, testamento (will).
//  2. "diretto": WebRTC via PeerJS (come prima). Usato solo se nessun ponte risponde.
// Nei messaggi passano solo nome, seme della partita, risposte e punteggi. Il codice stanza è casuale.
(function(){
'use strict';
const PONTI=window.SFIDE_RELAY||['wss://broker.emqx.io:8084/mqtt','wss://broker.hivemq.com:8884/mqtt','wss://test.mosquitto.org:8081/mqtt'];
const BASE='menteallenata/sfide/v1/';
const PREFIX='sfide-logica-v1-';
const PONTE_MS=9000;        // attesa massima per agganciare un ponte
const TROVA_MS=6000;        // attesa massima per trovare la stanza sul ponte
const OPEN_MS=12000,JOIN_MS=15000;
const STANZA_VECCHIA_MS=3*3600*1000;
const ICE={iceServers:[{urls:['stun:stun.l.google.com:19302','stun:stun1.l.google.com:19302']},
  {urls:'turn:openrelay.metered.ca:80',username:'openrelayproject',credential:'openrelayproject'},
  {urls:'turn:openrelay.metered.ca:443',username:'openrelayproject',credential:'openrelayproject'},
  {urls:'turn:openrelay.metered.ca:443?transport=tcp',username:'openrelayproject',credential:'openrelayproject'}]};
const PEER_OPTS=Object.assign({config:ICE,pingInterval:4000},window.SFIDE_PEER||{});
const rid=()=>Math.random().toString(36).slice(2,10);

// ---------------- client MQTT minimo ----------------
const enc=new TextEncoder(),dec=new TextDecoder();
function str(s){const b=enc.encode(s);const o=new Uint8Array(b.length+2);o[0]=b.length>>8;o[1]=b.length&255;o.set(b,2);return o}
function cat(parts){let n=0;parts.forEach(p=>n+=p.length);const o=new Uint8Array(n);let i=0;parts.forEach(p=>{o.set(p,i);i+=p.length});return o}
function packet(type,flags,body){const len=[];let n=body.length;do{let d=n%128;n=Math.floor(n/128);if(n>0)d|=128;len.push(d)}while(n>0);return cat([Uint8Array.of((type<<4)|flags),Uint8Array.from(len),body])}
function MiniMqtt(url,opts){
  const self={open:false,onMessage:null,onClose:null,onOpen:null};
  let ws,buf=new Uint8Array(0),pid=1,ping=null,closed=false;
  const keep=40;
  try{ws=new WebSocket(url,'mqtt')}catch(e){setTimeout(()=>self.onClose&&self.onClose('apertura fallita'),0);return self}
  ws.binaryType='arraybuffer';
  const send=(u8)=>{try{if(ws.readyState===1)ws.send(u8)}catch(e){}};
  ws.onopen=()=>{
    let flags=0x02;const parts=[str('MQTT'),Uint8Array.of(4),Uint8Array.of(0),Uint8Array.of(keep>>8,keep&255),str('ma-'+rid())];
    if(opts&&opts.will){flags|=0x04|0x20;parts.push(str(opts.will.topic),str(opts.will.payload||''))}
    parts[2]=Uint8Array.of(flags);
    send(packet(1,0,cat(parts)));
  };
  ws.onmessage=(ev)=>{
    buf=cat([buf,new Uint8Array(ev.data)]);
    for(;;){
      if(buf.length<2)return;
      let mult=1,len=0,i=1;
      for(;;){if(i>=buf.length)return;const d=buf[i++];len+=(d&127)*mult;mult*=128;if(!(d&128))break;if(i>5)break}
      if(buf.length<i+len)return;
      const type=buf[0]>>4,flags=buf[0]&15,body=buf.subarray(i,i+len);buf=buf.slice(i+len);
      if(type===2){if(body[1]===0){self.open=true;ping=setInterval(()=>send(Uint8Array.of(0xC0,0)),keep*1000*0.6);self.onOpen&&self.onOpen()}else{self.onClose&&self.onClose('rifiutato ('+body[1]+')');try{ws.close()}catch(e){}}}
      else if(type===3){const tl=(body[0]<<8)|body[1];const topic=dec.decode(body.subarray(2,2+tl));let p=2+tl;const qos=(flags>>1)&3;if(qos>0)p+=2;const payload=dec.decode(body.subarray(p));self.onMessage&&self.onMessage(topic,payload,!!(flags&1))}
    }
  };
  ws.onerror=()=>{};
  ws.onclose=()=>{clearInterval(ping);if(closed)return;closed=true;const was=self.open;self.open=false;self.onClose&&self.onClose(was?'collegamento interrotto':'non raggiungibile')};
  self.subscribe=(topic)=>{const id=pid++;send(packet(8,2,cat([Uint8Array.of(id>>8,id&255),str(topic),Uint8Array.of(0)])))};
  self.publish=(topic,payload,retain)=>{send(packet(3,retain?1:0,cat([str(topic),enc.encode(payload||'')])))};
  self.close=()=>{if(closed)return;closed=true;clearInterval(ping);try{send(Uint8Array.of(0xE0,0));ws.close()}catch(e){}};
  return self;
}
// prova tutti i ponti insieme, tiene il primo che risponde
function agganciaPonte(code,role,log){
  return new Promise((resolve,reject)=>{
    let done=false,left=PONTI.length;const all=[];
    const will=role==='host'?{topic:BASE+code+'/room',payload:''}:null;
    const t=setTimeout(()=>{if(done)return;done=true;all.forEach(c=>c.close());reject('nessun ponte risponde entro '+(PONTE_MS/1000)+' s')},PONTE_MS);
    PONTI.forEach(url=>{
      const host=url.replace(/^wss?:\/\//,'').split(/[\/:]/)[0];
      const c=MiniMqtt(url,{will});all.push(c);
      c.onOpen=()=>{if(done){c.close();return}done=true;clearTimeout(t);all.forEach(o=>{if(o!==c)o.close()});log('ponte agganciato: '+host);c.onClose=null;resolve({c,host})};
      c.onClose=(why)=>{if(done)return;log('ponte '+host+': '+why);if(--left===0){done=true;clearTimeout(t);reject('nessun ponte raggiungibile')}};
    });
  });
}

// ---------------- strada 1: ponte ----------------
// cb: {log, onReady, onPeer, onData, onLost, onError}
function viaPonte(role,code,cb){
  const me=rid();let c=null,peerId=null,helloT=null,findT=null,closed=false;
  const T=BASE+code;const mine=T+(role==='host'?'/h':'/g'),theirs=T+(role==='host'?'/g':'/h');
  const api={via:'ponte',send(m){if(!c||!c.open)return;m=Object.assign({},m,{from:me,to:peerId||undefined});c.publish(mine,JSON.stringify(m))},
    close(){if(closed)return;closed=true;clearInterval(helloT);clearTimeout(findT);if(c){if(role==='host')c.publish(T+'/room','',true);c.close()}}};
  agganciaPonte(code,role,cb.log).then(({c:cl})=>{
    if(closed){cl.close();return}
    c=cl;
    c.onClose=(why)=>{if(closed)return;cb.log('ponte perso: '+why);if(peerId)cb.onLost();else cb.onError('Il collegamento con il ponte si è interrotto ('+why+'). Riprova.')};
    c.onMessage=(topic,payload,retained)=>{
      let m=null;try{m=JSON.parse(payload)}catch(e){}
      if(topic===T+'/room'){
        if(role==='guest'&&!peerId){
          if(!m||!m.t||(Date.now()-(m.at||0))>STANZA_VECCHIA_MS){return}
          clearTimeout(findT);if(helloT)return;cb.log('stanza '+code+' trovata sul ponte, chiamo chi l\'ha creata…');
          const hi=()=>api.send({t:'knock'});hi();helloT=setInterval(hi,2000);
        }
        return;
      }
      if(topic!==theirs||!m)return;
      if(role==='host'){
        if(m.t==='knock'){
          if(peerId&&m.from!==peerId){c.publish(mine,JSON.stringify({t:'full',from:me,to:m.from}));return}
          const first=!peerId;peerId=m.from;api.send({t:'welcome'});if(first){cb.log('l\'altro giocatore è arrivato');cb.onPeer()}
          return;
        }
        if(m.from!==peerId)return;
      }else{
        if(m.to&&m.to!==me)return;
        if(m.t==='welcome'){if(!peerId){peerId=m.from;clearInterval(helloT);helloT=null;cb.log('chi ha creato la stanza ha risposto');cb.onPeer()}return}
        if(m.t==='full'){api.close();cb.onError('La stanza è già completa: ci sono già due giocatori.');return}
        if(!peerId)return;
      }
      cb.onData(m);
    };
    c.subscribe(theirs);
    if(role==='host'){c.publish(T+'/room',JSON.stringify({t:'open',at:Date.now(),host:me}),true);cb.log('stanza '+code+' aperta sul ponte');cb.onReady()}
    else{c.subscribe(T+'/room');cb.log('cerco la stanza '+code+' sul ponte…');findT=setTimeout(()=>{if(peerId||helloT)return;api.close();cb.onError('non trovata',{notFound:true})},TROVA_MS)}
  }).catch(why=>{if(closed)return;closed=true;cb.log(String(why));cb.onError(String(why),{noBridge:true})});
  return api;
}

// ---------------- strada 2: diretto (PeerJS) ----------------
function viaDiretto(role,code,cb){
  let peer=null,conn=null,openT=null,joinT=null,closed=false,gotPeer=false;
  const api={via:'diretto',send(m){if(conn&&conn.open){try{conn.send(m)}catch(e){}}},
    close(){if(closed)return;closed=true;clearTimeout(openT);clearTimeout(joinT);if(conn){try{conn.close()}catch(e){}}if(peer){try{peer.destroy()}catch(e){}}conn=null;peer=null}};
  if(typeof Peer!=='function'){setTimeout(()=>cb.onError('Il collegamento diretto non è disponibile in questo browser.'),0);return api}
  const bind=(c)=>{conn=c;
    c.on('open',()=>{clearTimeout(joinT);gotPeer=true;cb.log('canale diretto aperto');cb.onPeer()});
    c.on('data',m=>{if(m&&m.t==='full'){api.close();cb.onError('La stanza è già completa: ci sono già due giocatori.');return}cb.onData(m)});
    c.on('close',()=>{if(!closed&&gotPeer)cb.onLost()});c.on('error',()=>{})};
  const describe=(e)=>{const t=e&&e.type;
    if(t==='network'||t==='server-error'||t==='socket-error'||t==='socket-closed')return'Non riesco a raggiungere il servizio di collegamento diretto.';
    if(t==='browser-incompatible')return'Questo browser non supporta il collegamento diretto: prova con Chrome, Safari, Firefox o Edge aggiornati.';
    return'Errore di collegamento diretto ('+(t||'sconosciuto')+').'};
  cb.log('provo il collegamento diretto (PeerJS)…');
  if(role==='host'){
    peer=new Peer(PREFIX+code,PEER_OPTS);
    openT=setTimeout(()=>{if(closed)return;api.close();cb.onError('Il servizio di collegamento diretto non risponde.')},OPEN_MS);
    peer.on('open',()=>{clearTimeout(openT);cb.log('stanza '+code+' aperta sul servizio diretto');cb.onReady()});
    peer.on('connection',c=>{if(conn&&conn.open){c.on('open',()=>{c.send({t:'full'});setTimeout(()=>c.close(),500)});return}bind(c)});
    peer.on('error',e=>{if(closed)return;cb.log('diretto: errore '+(e&&e.type));api.close();cb.onError(describe(e),{unavailableId:e&&e.type==='unavailable-id'})});
  }else{
    peer=new Peer(PEER_OPTS);
    openT=setTimeout(()=>{if(closed||gotPeer)return;api.close();cb.onError('Il servizio di collegamento diretto non risponde.')},OPEN_MS);
    peer.on('open',()=>{clearTimeout(openT);cb.log('cerco la stanza '+code+' sul servizio diretto…');bind(peer.connect(PREFIX+code,{reliable:true}));
      joinT=setTimeout(()=>{if(closed||gotPeer)return;api.close();cb.onError('Ho trovato la stanza ma il canale diretto non si apre.')},JOIN_MS)});
    peer.on('error',e=>{if(closed)return;cb.log('diretto: errore '+(e&&e.type));api.close();if(e&&e.type==='peer-unavailable')cb.onError('non trovata',{notFound:true});else cb.onError(describe(e))});
  }
  [peer].forEach(p=>p.on('disconnected',()=>{if(p&&!p.destroyed&&!closed)p.reconnect()}));
  return api;
}

// ---------------- scelta della strada ----------------
// via: 'auto' (ponte, poi diretto), 'ponte', 'diretto'
function connetti(role,code,via,cb){
  via=via||'auto';
  let cur=null,closed=false,bridgeNotFound=false;
  const wrap={get via(){return cur?cur.via:''},send(m){cur&&cur.send(m)},close(){closed=true;cur&&cur.close()}};
  const NOT_FOUND='Stanza '+code+' non trovata: chi l\'ha creata deve avere la pagina aperta sulla schermata della stanza. Controlla il codice e riprova.';
  const tryDirect=()=>{cur=viaDiretto(role,code,Object.assign({},cb,{onError(msg,info){if(closed)return;
    if((info&&info.notFound)||bridgeNotFound)cb.onError(NOT_FOUND,{notFound:true});
    else cb.onError(msg,info)}}))};
  if(via==='diretto'){tryDirect();return wrap}
  cur=viaPonte(role,code,Object.assign({},cb,{onError(msg,info){if(closed)return;
    if(via==='auto'&&info&&(info.noBridge||info.notFound)){bridgeNotFound=!!info.notFound;cb.log(info.notFound?'stanza non trovata sul ponte, provo la strada diretta':'ponte non raggiungibile, provo la strada diretta');tryDirect();return}
    if(info&&info.notFound)cb.onError(NOT_FOUND,info);
    else cb.onError(msg,info)}}));
  return wrap;
}
window.Rete={connetti,PONTI};
})();
