/* Mente Allenata · app installabile (PWA)
 * - Registra il service worker (/sw.js) su ogni pagina.
 * - In home mostra il banner "Installa l'app": su Android/Chrome/Edge apre la finestra di
 *   installazione; su iPhone/iPad spiega Condividi → Aggiungi alla schermata Home.
 * - Quando esce una nuova versione del sito mostra un avviso "Aggiorna" (niente ricarica
 *   automatica: non interrompe mai un test o una sfida in corso).
 * Si attiva da solo: basta includere <script src="js/pwa.js"> (o ../js/pwa.js).
 */
(function () {
  'use strict';
  if (!('serviceWorker' in navigator) || location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') return;

  var KEY_BANNER = 'testqi.pwa.banner';   // data (ms) in cui l'utente ha chiuso il banner
  var ua = navigator.userAgent;
  var isIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  var standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  var promptEvt = null;

  function load(k, d) { try { var v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function el(html) { var t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; }

  /* ---------- service worker + avviso di aggiornamento ---------- */
  var reg = null;
  navigator.serviceWorker.register('/sw.js').then(function (r) {
    reg = r;
    if (r.waiting && navigator.serviceWorker.controller) mostraAggiorna(r.waiting);
    r.addEventListener('updatefound', function () {
      var nuovo = r.installing;
      if (!nuovo) return;
      nuovo.addEventListener('statechange', function () {
        if (nuovo.state === 'installed' && navigator.serviceWorker.controller) mostraAggiorna(nuovo);
      });
    });
  }).catch(function () {});
  var ricaricato = false;
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (ricaricato) return; ricaricato = true;
    if (window.__pwaAggiornaRichiesto) location.reload();
  });

  function mostraAggiorna(worker) {
    if (document.getElementById('pwaAggiorna')) return;
    var t = el('<div id="pwaAggiorna" role="status" style="position:fixed;left:50%;bottom:max(16px,env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:50;background:var(--fg,#1e1b3a);color:#fff;border-radius:999px;padding:10px 10px 10px 18px;display:flex;gap:10px;align-items:center;box-shadow:0 12px 30px -10px rgba(0,0,0,.5);font-size:.95rem;max-width:calc(100vw - 32px)">'
      + '<span>✨ C\'è una nuova versione</span><button class="btn primary" style="padding:7px 14px;font-size:.9rem">Aggiorna</button></div>');
    t.querySelector('button').addEventListener('click', function () {
      window.__pwaAggiornaRichiesto = true;
      worker.postMessage({ tipo: 'aggiorna' });
      t.querySelector('button').textContent = '…';
    });
    document.body.appendChild(t);
  }

  /* ---------- banner "Installa l'app" (solo in home) ---------- */
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    promptEvt = e;
    mostraBanner();
  });
  window.addEventListener('appinstalled', function () {
    var b = document.getElementById('pwaBanner'); if (b) b.remove();
    save(KEY_BANNER, Date.now());
  });

  function inHome() {
    var p = location.pathname;
    return p === '/' || p === '/index.html';
  }

  function mostraBanner() {
    if (standalone || !inHome() || document.getElementById('pwaBanner')) return;
    var chiuso = load(KEY_BANNER, 0);
    if (chiuso && Date.now() - chiuso < 14 * 86400000) return;   // chiuso da meno di 2 settimane
    var hero = document.querySelector('.hero');
    if (!hero) return;
    var ios = isIOS && !promptEvt;
    var banner = el('<section id="pwaBanner" class="card" style="display:grid;grid-template-columns:auto 1fr;gap:14px;align-items:start;background:linear-gradient(135deg,var(--brand-100,#ede9fe),#fff)">'
      + '<img src="/app/icona-192.png" alt="" width="64" height="64" style="border-radius:16px;box-shadow:var(--shadow)">'
      + '<div class="stack" style="gap:6px;min-width:0"><b style="font-size:1.1rem">📲 Scarica l\'app sul telefono</b>'
      + '<span class="hint">Si apre a tutto schermo come un\'app vera, funziona anche senza connessione e la trovi tra le icone del telefono. Gratis, nessun negozio.</span>'
      + '<div class="actions" style="margin-top:4px">'
      + (ios ? '<button class="btn primary" id="pwaComeIos">Come si installa su iPhone</button>' : '<button class="btn primary" id="pwaInstalla">Installa l\'app</button>')
      + '<button class="btn" id="pwaChiudi" style="border-color:transparent">Non ora</button></div>'
      + '<div id="pwaIosPassi" class="hint" hidden style="line-height:1.6">1. Tocca il pulsante <b>Condividi</b> in basso in Safari (il quadrato con la freccia in su).<br>2. Scorri e tocca <b>Aggiungi alla schermata Home</b>.<br>3. Tocca <b>Aggiungi</b> in alto a destra. Fatto: l\'icona è sul telefono.' + (isSafari ? '' : '<br><i>Su iPhone funziona solo da Safari: apri qi.stafftech.it lì.</i>') + '</div>'
      + '</div></section>');
    hero.insertAdjacentElement('afterend', banner);
    var bi = banner.querySelector('#pwaInstalla');
    if (bi) bi.addEventListener('click', function () {
      if (!promptEvt) return;
      promptEvt.prompt();
      promptEvt.userChoice.then(function (r) { if (r && r.outcome === 'accepted') banner.remove(); promptEvt = null; });
    });
    var bc = banner.querySelector('#pwaComeIos');
    if (bc) bc.addEventListener('click', function () { var p = banner.querySelector('#pwaIosPassi'); p.hidden = !p.hidden; });
    banner.querySelector('#pwaChiudi').addEventListener('click', function () { save(KEY_BANNER, Date.now()); banner.remove(); });
  }

  // Su iPhone l'evento beforeinstallprompt non esiste: mostriamo subito le istruzioni.
  if (isIOS) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mostraBanner); else mostraBanner();
  }
})();
