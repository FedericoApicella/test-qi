/* Energia (vite) di Mente Allenata · SOLO nell'app del Play Store.
 * Sul sito web non succede nulla: Energia.attivo() è falso e ogni Energia.spendi() risponde "sì" senza togliere niente
 * (regola di Federico, 9 nov 2026: "mettiamole solo se si fa il playstore"). L'app apre il sito con ?da=play
 * e js/menu.js salva testqi.canale = 'play'; da lì in poi questo modulo si accende.
 *
 * Regole (dal documento "Guadagnare con l'app"):
 * - 5 punti di energia al giorno. Si ricaricano tutti a mezzanotte e 1 ogni 30 minuti.
 * - Un punto si spende per un aiuto (Sudoku, Mahjong, Regine, parole), per mescolare al Mahjong e quando si
 *   fallisce un livello della storia. Mai per iniziare un livello, mai nel test, in Misurati, in Allenati, nelle sfide a due.
 * - Senza energia: aspetta, guarda un video (massimo 5 al giorno, se la pubblicità è configurata) o compra un pacchetto
 *   (pagamento Google Play, solo nell'app). Energia infinita = Premium o pacchetto 24 ore.
 *
 * Uso: <script src="js/energia.js"> dopo menu.js. Nelle pagine di gioco: if (window.Energia && !Energia.spendi('aiuto')) return;
 * API: Energia.attivo() · Energia.n() · Energia.puoi() · Energia.spendi(motivo) · Energia.aggiungi(k) · Energia.mostra() · Energia.infiniti()
 * Stato in localStorage testqi.energia (sincronizzato dall'account come tutte le chiavi testqi.*).
 *
 * CONFIGURAZIONE (da riempire quando Federico ha gli account):
 * - adsenseClient: id AdSense (ca-pub-…) con "Annunci per giochi H5" attivi → compare "Guarda un video".
 * - sku: codici dei prodotti creati nella Play Console (Monetizza → Prodotti → Prodotti in-app).
 */
(function () {
  'use strict';
  var CONFIG = {
    adsenseClient: '',              // es. 'ca-pub-1234567890123456'
    sku: { c5: 'energia_5', c20: 'energia_20', inf24: 'energia_infinita_24h' },
    prezzi: { c5: '0,99 €', c20: '2,99 €', inf24: '1,99 €' }   // solo testo di riserva: il prezzo vero lo dà Google Play
  };
  var MAX = 5, RICARICA_MS = 30 * 60 * 1000, VIDEO_AL_GIORNO = 5, KEY = 'testqi.energia';
  var FX = window.Effetti || {};
  function load() { try { var v = localStorage.getItem(KEY); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
  function oggi() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function el(html) { var t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  var inSfida = /[?&]sfida=1/.test(location.search);
  function attivo() { return !inSfida && !!(window.Canale && window.Canale.play()); }

  // stato: {n, giorno, t (ms dell'ultima ricarica parziale), video:{giorno,n}, infFino (ms), premium}
  function stato() {
    var s = load() || { n: MAX, giorno: oggi(), t: Date.now(), video: { giorno: oggi(), n: 0 }, infFino: 0, premium: false };
    var now = Date.now(), cambiato = false;
    if (s.giorno !== oggi()) { s.giorno = oggi(); s.n = Math.max(s.n, MAX); s.t = now; cambiato = true; }
    if (s.n < MAX) {
      var k = Math.floor((now - s.t) / RICARICA_MS);
      if (k > 0) { s.n = Math.min(MAX, s.n + k); s.t = s.n >= MAX ? now : s.t + k * RICARICA_MS; cambiato = true; }
    } else if (s.t !== now && s.n >= MAX) { s.t = now; }
    if (!s.video || s.video.giorno !== oggi()) { s.video = { giorno: oggi(), n: 0 }; cambiato = true; }
    if (cambiato) save(s);
    return s;
  }
  function infiniti(s) { s = s || stato(); return !!s.premium || (s.infFino && s.infFino > Date.now()); }
  function n() { return stato().n; }
  function puoi() { if (!attivo()) return true; var s = stato(); return infiniti(s) || s.n > 0; }
  function spendi(motivo) {
    if (!attivo()) return true;
    var s = stato();
    if (infiniti(s)) return true;
    if (s.n <= 0) { mostra(motivo); return false; }
    if (s.n >= MAX) s.t = Date.now();
    s.n--; save(s); badge();
    var b = document.getElementById('energiaBtn'); if (FX.floatText) FX.floatText(b, '−1 ⚡', 'bad');
    return true;
  }
  function aggiungi(k) { if (!attivo()) return; var s = stato(); if (k < 0 && infiniti(s)) return; if (s.n >= MAX && k < 0) s.t = Date.now(); s.n = Math.max(0, s.n + k); if (s.n >= MAX) s.t = Date.now(); save(s); badge(); var b = document.getElementById('energiaBtn'); if (FX.floatText) FX.floatText(b, (k > 0 ? '+' : '') + k + ' ⚡', k > 0 ? 'good' : 'bad'); }
  function prossimo(s) { if (s.n >= MAX) return 0; return Math.max(0, s.t + RICARICA_MS - Date.now()); }
  function mmss(ms) { var t = Math.ceil(ms / 1000); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); }

  /* ---------- badge nella barra ---------- */
  function badge() {
    if (!attivo()) return;
    var s = stato(), b = document.getElementById('energiaBtn');
    if (!b) {
      var bar = document.querySelector('.bar .bar-in'); if (!bar) return;
      b = el('<button type="button" class="btn icon" id="energiaBtn" title="La tua energia" aria-label="La tua energia" style="width:auto;padding:0 10px;gap:4px;font-family:var(--font-mono);font-weight:700"></button>');
      var menu = document.getElementById('barMenu');
      if (menu) menu.insertBefore(b, menu.firstChild); else bar.appendChild(b);
      b.addEventListener('click', function () { mostra(); });
    }
    b.innerHTML = infiniti(s) ? '⚡ ∞' : '⚡ ' + s.n;
    b.classList.toggle('vuoto', !infiniti(s) && s.n === 0);
  }

  /* ---------- finestra: stato, attesa, video, pacchetti ---------- */
  var tick = null;
  function mostra(motivo) {
    if (!attivo()) return;
    var old = document.getElementById('energiaDlg'); if (old) { old.close(); old.remove(); }
    var s = stato();
    var perche = motivo === 'storia' ? 'Hai perso il livello.' : motivo === 'aiuto' ? 'Gli aiuti costano energia.' : motivo === 'mescola' ? 'Mescolare costa energia.' : '';
    var vid = videoDisponibile(s);
    var d = el('<dialog id="energiaDlg" style="border:1px solid var(--border);border-radius:18px;padding:0;max-width:380px;width:calc(100vw - 32px);font:inherit;color:var(--fg);background:var(--surface);box-shadow:var(--shadow)">'
      + '<div class="stack" style="padding:20px 20px 16px;gap:12px">'
      + '<div style="display:flex;justify-content:space-between;align-items:center"><h2 style="font-size:1.2rem;margin:0">La tua energia</h2><button type="button" class="btn icon" id="energiaChiudi" aria-label="Chiudi">✕</button></div>'
      + '<div id="energiaRiga" style="font-size:1.9rem;letter-spacing:2px;text-align:center"></div>'
      + '<p class="hint" id="energiaNota" style="text-align:center;margin:0"></p>'
      + (perche && s.n === 0 && !infiniti(s) ? '<p class="note small" style="margin:0">' + esc(perche) + ' Aspetta la ricarica oppure scegli qui sotto.</p>' : '')
      + '<div class="stack" style="gap:8px">'
      + (vid ? '<button type="button" class="btn primary" id="energiaVideo">🎬 Guarda un video · +1 energia <span class="hint" style="color:inherit;opacity:.8">(' + (VIDEO_AL_GIORNO - s.video.n) + ' oggi)</span></button>' : '')
      + '<button type="button" class="btn" data-sku="c5">⚡ 5 energia · <b id="pz-c5">' + CONFIG.prezzi.c5 + '</b></button>'
      + '<button type="button" class="btn" data-sku="c20">⚡ 20 energia · <b id="pz-c20">' + CONFIG.prezzi.c20 + '</b></button>'
      + '<button type="button" class="btn" data-sku="inf24">♾️ Infinita per 24 ore · <b id="pz-inf24">' + CONFIG.prezzi.inf24 + '</b></button>'
      + '</div>'
      + '<p class="hint" style="margin:0;font-size:.8rem">L\'energia serve per gli aiuti e per riprovare nella storia. Il test del QI, Misurati e Allenati non la usano mai. Si ricarica tutta a mezzanotte e di un punto ogni 30 minuti.</p>'
      + '</div></dialog>');
    document.body.appendChild(d);
    function agg() {
      var s = stato(); var r = d.querySelector('#energiaRiga'), nota = d.querySelector('#energiaNota');
      if (infiniti(s)) { r.textContent = '⚡ ∞'; nota.textContent = s.premium ? 'Premium: energia infinita.' : 'Energia infinita ancora per ' + Math.ceil((s.infFino - Date.now()) / 3600000) + ' ore.'; }
      else { r.textContent = '⚡'.repeat(s.n) + '▫️'.repeat(MAX - s.n); nota.textContent = s.n >= MAX ? 'Energia piena.' : 'Prossima ricarica tra ' + mmss(prossimo(s)) + ' · piena a mezzanotte'; }
      badge();
    }
    agg(); if (tick) clearInterval(tick); tick = setInterval(agg, 1000);
    function chiudi() { clearInterval(tick); tick = null; d.close(); d.remove(); }
    d.querySelector('#energiaChiudi').addEventListener('click', chiudi);
    d.addEventListener('click', function (e) { if (e.target === d) chiudi(); });
    d.addEventListener('close', function () { clearInterval(tick); tick = null; });
    var vb = d.querySelector('#energiaVideo'); if (vb) vb.addEventListener('click', function () { vb.disabled = true; video(function (ok) { vb.disabled = false; if (ok) agg(); else vb.textContent = 'Video non disponibile adesso, riprova tra poco'; }); });
    d.querySelectorAll('[data-sku]').forEach(function (b) { b.addEventListener('click', function () { compra(b.getAttribute('data-sku'), b); }); });
    prezziVeri(d);
    try { d.showModal(); } catch (e) { d.setAttribute('open', ''); }
  }

  /* ---------- video premiato (AdSense · Annunci per giochi H5) ---------- */
  function videoDisponibile(s) { return !!CONFIG.adsenseClient && s.video.n < VIDEO_AL_GIORNO; }
  var adsCaricato = false;
  function caricaAds() {
    if (adsCaricato || !CONFIG.adsenseClient) return; adsCaricato = true;
    var sc = document.createElement('script'); sc.async = true; sc.crossOrigin = 'anonymous';
    sc.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(CONFIG.adsenseClient);
    sc.setAttribute('data-ad-frequency-hint', '120s'); document.head.appendChild(sc);
    window.adsbygoogle = window.adsbygoogle || []; window.adConfig = window.adConfig || function (o) { window.adsbygoogle.push(o); };
    window.adBreak = window.adBreak || function (o) { window.adsbygoogle.push(o); };
    window.adConfig({ preloadAdBreaks: 'on', sound: 'on' });
  }
  function video(poi) {
    var s = stato(); if (!videoDisponibile(s)) { poi(false); return; }
    caricaAds();
    var visto = false;
    try {
      window.adBreak({
        type: 'reward', name: 'energia',
        beforeReward: function (showAdFn) { showAdFn(); },
        adViewed: function () { visto = true; var s = stato(); s.video.n++; save(s); aggiungi(1); },
        adDismissed: function () {},
        adBreakDone: function (info) { poi(visto); }
      });
    } catch (e) { poi(false); }
  }

  /* ---------- acquisti (pagamento Google Play tramite Digital Goods API) ---------- */
  var METODO = 'https://play.google.com/billing';
  function servizio() { if (!('getDigitalGoodsService' in window)) return Promise.reject(new Error('no-dg')); return window.getDigitalGoodsService(METODO); }
  function prezziVeri(d) {
    servizio().then(function (sv) { return sv.getDetails(Object.keys(CONFIG.sku).map(function (k) { return CONFIG.sku[k]; })); }).then(function (items) {
      items.forEach(function (it) { for (var k in CONFIG.sku) if (CONFIG.sku[k] === it.itemId) { var b = d.querySelector('#pz-' + k); if (b && it.price) b.textContent = new Intl.NumberFormat(navigator.language || 'it-IT', { style: 'currency', currency: it.price.currency }).format(+it.price.value); } });
    }).catch(function () {});
  }
  function applica(k) { var s = stato(); if (k === 'c5') { s.n += 5; } else if (k === 'c20') { s.n += 20; } else if (k === 'inf24') { s.infFino = Math.max(s.infFino || 0, Date.now()) + 24 * 3600000; } save(s); badge(); if (FX.confetti) FX.confetti(80); if (FX.beep) FX.beep('win'); }
  function compra(k, btn) {
    var sku = CONFIG.sku[k]; if (!sku) return;
    if (!('PaymentRequest' in window) || !('getDigitalGoodsService' in window)) { avviso(btn, 'Gli acquisti funzionano solo nell\'app del Play Store.'); return; }
    var dg;
    servizio().then(function (sv) { dg = sv; var req = new PaymentRequest([{ supportedMethods: METODO, data: { sku: sku } }], { total: { label: 'Totale', amount: { currency: 'EUR', value: '0' } } }); return req.show(); })
      .then(function (resp) { var token = resp.details && (resp.details.purchaseToken || resp.details.token); return dg.consume(token).catch(function () {}).then(function () { applica(k); return resp.complete('success'); }); })
      .catch(function (e) { if (e && e.name !== 'AbortError') avviso(btn, 'Acquisto non riuscito. Riprova tra poco.'); });
  }
  function avviso(btn, txt) { var p = btn && btn.parentNode && btn.parentNode.querySelector('.energia-avviso'); if (!p) { p = el('<p class="hint energia-avviso" style="margin:0;color:var(--bad,#c0392b)"></p>'); if (btn && btn.parentNode) btn.parentNode.appendChild(p); } if (p) p.textContent = txt; }

  window.Energia = { attivo: attivo, n: n, puoi: puoi, spendi: spendi, aggiungi: aggiungi, mostra: mostra, infiniti: function () { return infiniti(); }, MAX: MAX, _config: CONFIG };
  if (attivo()) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', badge); else badge(); setInterval(badge, 30000); }
  window.addEventListener('testqi:account', function (e) { if (e.detail && e.detail.chiavi && e.detail.chiavi.indexOf(KEY) >= 0) badge(); });
})();
