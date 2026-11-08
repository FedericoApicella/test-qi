/* Service worker di Mente Allenata (qi.stafftech.it).
 * - Pre-carica le pagine e i file statici del sito, così l'app funziona anche offline.
 * - Pagine, css, js e manifest: prima la rete (per avere sempre l'ultima versione), poi la cache.
 * - Icone, immagini e font: prima la cache, poi la rete.
 * - Non tocca mai: le POST, Google Apps Script (raccolta dati e account), PeerJS (sfide).
 * Per pubblicare una nuova versione basta cambiare VERSIONE: il vecchio contenuto viene cancellato.
 */
const VERSIONE = 'ma-2026-11-08c';
const CACHE = 'mente-allenata-' + VERSIONE;
const FONT_CACHE = 'mente-allenata-font';
const PRECARICA = [
  '/', '/index.html', '/test.html', '/stile.css', '/manifest.webmanifest',
  '/js/account.js', '/js/difficolta.js', '/js/raccolta.js', '/js/pwa.js', '/js/menu.js',
  '/sfide/', '/sfide/index.html', '/sfide/allenamento.html', '/sfide/allenamento.js',
  '/sfide/effetti.js', '/sfide/gioco.js', '/sfide/giochi.js', '/sfide/quesiti.js', '/sfide/peerjs.min.js', '/sfide/rete.js',
  '/misura/', '/misura/index.html',
  '/storia/', '/storia/index.html', '/storia/storia.css', '/storia/storia.js', '/storia/minigiochi.js',
  '/js/abilita.js', '/abilita/', '/abilita/index.html',
  '/parole/', '/parole/index.html', '/parole/parole.css', '/parole/parole.js', '/parole/dizionario.js',
  '/app/icona.svg', '/app/icona-192.png', '/app/icona-512.png', '/app/maskable-192.png', '/app/maskable-512.png',
  '/app/apple-touch-icon.png', '/app/favicon.svg', '/app/favicon-32.png', '/app/offline.html'
];
const NON_TOCCARE = ['script.google.com', 'script.googleusercontent.com', 'peerjs.com', 'googleapis.com/'];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    // addAll fallisce tutto se un file manca: meglio uno alla volta, ignorando i singoli errori.
    await Promise.all(PRECARICA.map((u) => c.add(new Request(u, { cache: 'reload' })).catch(() => {})));
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const nomi = await caches.keys();
    await Promise.all(nomi.filter((n) => n.startsWith('mente-allenata-') && n !== CACHE && n !== FONT_CACHE).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (e) => {
  if (e.data && e.data.tipo === 'aggiorna') self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return;
  const stessaOrigine = url.origin === self.location.origin;
  const isFont = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!stessaOrigine && !isFont) return; // Apps Script, PeerJS e tutto il resto passano diretti.

  if (isFont) { e.respondWith(staleWhileRevalidate(req, FONT_CACHE)); return; }
  // Pagine, css e js: prima la rete (così ogni modifica arriva subito), la cache solo se manca la linea.
  // Icone e immagini: prima la cache.
  if (req.mode === 'navigate' || /\.(html|css|js|webmanifest)$/.test(url.pathname) || url.pathname.endsWith('/')) {
    e.respondWith(reteCache(req));
    return;
  }
  e.respondWith(cacheRete(req));
});

async function reteCache(req) {
  const c = await caches.open(CACHE);
  try {
    const r = await fetch(req);
    if (r && r.ok) c.put(req, r.clone());
    return r;
  } catch (err) {
    const url = new URL(req.url);
    return (await c.match(req, { ignoreSearch: true })) || (await c.match(url.pathname.replace(/index\.html$/, ''))) ||
      (await c.match('/app/offline.html')) || Response.error();
  }
}

async function cacheRete(req) {
  const c = await caches.open(CACHE);
  const hit = await c.match(req, { ignoreSearch: true });
  if (hit) return hit;
  try {
    const r = await fetch(req);
    if (r && r.ok) c.put(req, r.clone());
    return r;
  } catch (err) {
    return Response.error();
  }
}

async function staleWhileRevalidate(req, nome) {
  const c = await caches.open(nome);
  const hit = await c.match(req);
  const rete = fetch(req).then((r) => { if (r && r.ok) c.put(req, r.clone()); return r; }).catch(() => null);
  return hit || (await rete) || Response.error();
}
