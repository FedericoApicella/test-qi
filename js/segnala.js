/* Segnala un bug / un errore: riga «🐞 Segnala un errore» nel menu ⚙️ di ogni pagina e finestra con
 * un testo libero. Insieme al testo partono dati automatici: pagina, titolo, contesto (gioco/livello se la
 * pagina lo dichiara), utente se loggato, dispositivo, schermo, lingua, app installata o no, ultimi errori
 * JavaScript visti nella pagina e ora. Tutto finisce nella scheda «bug» del foglio Google (stesso endpoint
 * Apps Script della raccolta: analisi/endpoint-apps-script.gs). Se non c'è rete o il server non è ancora
 * aggiornato, la segnalazione resta sul dispositivo e viene rispedita alla prossima apertura.
 *
 * Da includere dopo js/menu.js. API per le pagine:
 *   Segnala.apri({ contesto: "Sudoku · livello 12 · Difficile", extra: {...} })  apre la finestra già compilata
 *   window.SEGNALA_CONTESTO = "testo" oppure function () { return "testo"; }   contesto automatico della pagina
 *   Segnala.bottoneHtml("Errore in questa domanda")  pulsante piccolo da mettere dove serve (chiama apri() con
 *   data-contesto / data-extra dell'elemento)
 */
(function (global) {
  'use strict';
  if (!global.document || global.Segnala) return;
  var CODA = 'ma.bug.coda';            // senza prefisso testqi. : non va sincronizzata con l'account
  var MAX_CODA = 10;
  var errori = [];                      // ultimi errori JS della pagina

  global.addEventListener('error', function (e) {
    nota((e.message || 'errore') + (e.filename ? ' @ ' + e.filename.replace(/^.*\//, '') + ':' + e.lineno : ''));
  });
  global.addEventListener('unhandledrejection', function (e) {
    var r = e.reason; nota('promise: ' + (r && (r.message || r.toString ? r.toString() : r)));
  });
  function nota(s) { errori.push(new Date().toISOString().slice(11, 19) + ' ' + String(s).slice(0, 200)); if (errori.length > 5) errori.shift(); }

  function endpoint() { return global.RACCOLTA_ENDPOINT || global.ACCOUNT_ENDPOINT || null; }
  function leggi(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function scrivi(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function utente() {
    var a = leggi('testqi.account');
    if (a && a.nome) return { nome: a.nome, token: a.token || '' };
    var n = null; try { n = localStorage.getItem('testqi.nome'); } catch (e) {}
    return { nome: n || '', token: '' };
  }
  function contestoPagina(op) {
    if (op && op.contesto) return String(op.contesto);
    var c = global.SEGNALA_CONTESTO;
    try { if (typeof c === 'function') c = c(); } catch (e) { c = ''; }
    if (c) return String(c);
    var el = document.querySelector('[data-segnala-contesto]') || document.querySelector('.eyebrow');
    return el ? (el.getAttribute('data-segnala-contesto') || el.textContent || '').trim().slice(0, 120) : '';
  }
  function dispositivo() {
    var ua = navigator.userAgent || '';
    var so = /iPhone|iPad|iPod/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : '?';
    var br = /Edg\//.test(ua) ? 'Edge' : /SamsungBrowser/.test(ua) ? 'Samsung' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : '?';
    var ver = (ua.match(/(?:Edg|Firefox|Chrome|Version)\/(\d+)/) || [])[1] || '';
    return so + ' · ' + br + (ver ? ' ' + ver : '');
  }
  function record(testo, op) {
    var u = utente();
    var standalone = !!(global.matchMedia && global.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
    return {
      azione: 'bug',
      id: 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      ora: new Date().toISOString(),
      messaggio: String(testo || '').slice(0, 2000),
      pagina: location.pathname + location.search + location.hash,
      titolo: (document.title || '').slice(0, 120),
      contesto: contestoPagina(op).slice(0, 300),
      utente: u.nome,
      token: u.token,
      dispositivo: dispositivo() + (standalone ? ' · app' : ' · browser'),
      schermo: global.innerWidth + '×' + global.innerHeight + ' @' + (global.devicePixelRatio || 1) + 'x',
      lingua: navigator.language || '',
      ua: (navigator.userAgent || '').slice(0, 300),
      errori_js: errori.slice(),
      extra: (op && op.extra) || null,
      ref: document.referrer ? document.referrer.replace(/^https?:\/\/[^/]+/, '') : ''
    };
  }

  function invia(rec) {
    var url = endpoint();
    if (!url || !global.fetch) return Promise.reject(new Error('nessun endpoint'));
    return global.fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(rec) })
      .then(function (r) { return r.text(); })
      .then(function (t) {
        var o = null; try { o = JSON.parse(t); } catch (e) {}
        if (o && o.ok) return o;
        // "Azione sconosciuta" = il server non è ancora aggiornato: teniamo la segnalazione in coda
        throw new Error(o && o.errore ? o.errore : 'risposta inattesa');
      });
  }
  function accoda(rec) {
    var q = leggi(CODA) || [];
    delete rec.token;
    q.push(rec); while (q.length > MAX_CODA) q.shift();
    scrivi(CODA, q);
  }
  function svuotaCoda() {
    var q = leggi(CODA) || [];
    if (!q.length || !navigator.onLine) return;
    var rec = q[0];
    invia(rec).then(function () { var q2 = leggi(CODA) || []; q2 = q2.filter(function (x) { return x.id !== rec.id; }); scrivi(CODA, q2.length ? q2 : null); if (q2.length) setTimeout(svuotaCoda, 1500); }, function () {});
  }

  /* ---------------- finestra ---------------- */
  var box = null, opCorrente = null;
  function css() {
    if (document.getElementById('segnalaCss')) return;
    var s = document.createElement('style'); s.id = 'segnalaCss';
    s.textContent =
      '.sg-over{position:fixed;inset:0;background:rgba(20,10,40,.55);z-index:60;display:flex;align-items:flex-end;justify-content:center;padding:12px}' +
      '@media(min-width:560px){.sg-over{align-items:center}}' +
      '.sg-box{background:var(--surface,#fff);color:inherit;border:1px solid var(--border,#ddd);border-radius:18px;box-shadow:var(--shadow,0 8px 30px rgba(0,0,0,.3));width:min(480px,100%);padding:16px;display:grid;gap:10px;max-height:92vh;overflow:auto}' +
      '.sg-box h3{margin:0;font-size:1.1rem}.sg-box textarea{width:100%;min-height:96px;box-sizing:border-box;font:inherit;padding:10px;border-radius:12px;border:1px solid var(--border,#ccc);background:var(--bg,#fff);color:inherit;resize:vertical}' +
      '.sg-box .sg-ctx{font-size:.85rem;color:var(--muted,#777);word-break:break-word}.sg-box .sg-row{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}' +
      '.sg-box .sg-ok{font-weight:700}.sg-mini{font:inherit;font-size:.85rem;padding:6px 10px;border-radius:999px;border:1px solid var(--border,#ccc);background:transparent;color:var(--muted,#777);cursor:pointer}';
    document.head.appendChild(s);
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function apri(op) {
    opCorrente = op || {};
    css(); chiudi();
    var rec = record('', opCorrente);
    box = document.createElement('div'); box.className = 'sg-over'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true');
    box.innerHTML =
      '<div class="sg-box">' +
        '<h3>🐞 Segnala un bug o un errore</h3>' +
        '<label for="sgTesto" class="hint">Cosa è successo? Cosa ti aspettavi? Più dettagli dai, prima lo sistemiamo.</label>' +
        '<textarea id="sgTesto" placeholder="Es. nel livello 12 il tasto Verifica non fa niente / la risposta giusta era segnata sbagliata…"></textarea>' +
        '<div class="sg-ctx">Allegati in automatico: pagina <b>' + esc(rec.pagina) + '</b>' + (rec.contesto ? ', <b>' + esc(rec.contesto) + '</b>' : '') +
          ', ' + esc(rec.dispositivo) + ', ' + esc(rec.schermo) + (rec.utente ? ', utente <b>' + esc(rec.utente) + '</b>' : ', nessun nome (puoi scriverlo nel testo)') +
          (rec.errori_js.length ? ', ' + rec.errori_js.length + ' errori tecnici della pagina' : '') + '.</div>' +
        '<div class="sg-row"><button type="button" class="btn" id="sgAnnulla">Annulla</button><button type="button" class="btn primary" id="sgInvia">Invia</button></div>' +
      '</div>';
    document.body.appendChild(box);
    box.addEventListener('click', function (e) { if (e.target === box) chiudi(); });
    document.getElementById('sgAnnulla').onclick = chiudi;
    document.getElementById('sgInvia').onclick = function () {
      var t = document.getElementById('sgTesto').value.trim();
      if (t.length < 3) { document.getElementById('sgTesto').focus(); return; }
      var r = record(t, opCorrente);
      var b = this; b.disabled = true; b.textContent = 'Invio…';
      invia(r).then(function () { fine('Grazie! Segnalazione inviata: la leggiamo e la sistemiamo.'); },
        function () { accoda(r); fine(navigator.onLine ? 'Grazie! Segnalazione salvata sul dispositivo: verrà inviata appena possibile.' : 'Sei offline: la segnalazione è salvata e partirà alla prossima connessione.'); });
    };
    setTimeout(function () { var t = document.getElementById('sgTesto'); if (t) t.focus(); }, 50);
  }
  function fine(msg) {
    if (!box) return;
    box.querySelector('.sg-box').innerHTML = '<h3>🐞 Segnalazione</h3><p class="sg-ok">' + esc(msg) + '</p><div class="sg-row"><button type="button" class="btn primary" id="sgChiudi">Chiudi</button></div>';
    document.getElementById('sgChiudi').onclick = chiudi;
    setTimeout(chiudi, 4000);
  }
  function chiudi() { if (box && box.parentNode) box.parentNode.removeChild(box); box = null; }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') chiudi(); });

  /* ---------------- riga nel menu ⚙️ ---------------- */
  var AMMINISTRATORI = { fede: 1 };
  function monta() {
    var pop = document.getElementById('menuPop');
    if (!pop || document.getElementById('menuBug')) return;
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'menu-row menu-act'; b.id = 'menuBug';
    b.innerHTML = '<span class="menu-lab">🐞 Segnala un errore</span><span class="hint">bug, risposta sbagliata…</span>';
    b.addEventListener('click', function () { var mb = document.getElementById('menuBtn'); if (mb) mb.click(); apri(); });
    pop.appendChild(b);
    var u = utente();
    if (u.nome && AMMINISTRATORI[String(u.nome).toLowerCase()]) {
      var home = location.pathname.split('/').length > 2 ? '../' : './';
      var a = document.createElement('a');
      a.className = 'menu-row menu-act'; a.id = 'menuBugLista'; a.href = home + 'bug/';
      a.innerHTML = '<span class="menu-lab">🛠 Segnalazioni ricevute</span><span class="hint">solo per te</span>';
      pop.appendChild(a);
    }
  }
  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('[data-segnala]');
    if (!el) return;
    var extra = null; try { extra = JSON.parse(el.getAttribute('data-extra') || 'null'); } catch (err) {}
    apri({ contesto: el.getAttribute('data-contesto') || el.getAttribute('data-segnala') || '', extra: extra });
  });

  global.Segnala = {
    apri: apri,
    bottoneHtml: function (testo, contesto, extra) {
      return '<button type="button" class="sg-mini" data-segnala="' + esc(contesto || '') + '"' + (extra ? ' data-extra="' + esc(JSON.stringify(extra)) + '"' : '') + '>🐞 ' + esc(testo || 'Segnala un errore') + '</button>';
    },
    errori: function () { return errori.slice(); }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', monta); else monta();
  setTimeout(svuotaCoda, 2500);
  global.addEventListener('online', svuotaCoda);
})(window);
