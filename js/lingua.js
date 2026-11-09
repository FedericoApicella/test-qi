/* Lingue di Mente Allenata.
 * L'italiano è la lingua del codice e delle pagine. Le altre lingue sono dizionari in lang/<codice>.js
 * (window.LINGUE.en = { "testo italiano": "testo tradotto", … }) applicati a tutta la pagina a runtime:
 * ogni nodo di testo e gli attributi title/aria-label/placeholder/alt/value, il <title> e la meta description.
 * Un MutationObserver traduce anche quello che i giochi disegnano dopo. I numeri nelle chiavi sono {}, una parola variabile è {*}.
 *
 * Scelta della lingua: ?lang=en → salvata in testqi.lingua; altrimenti la lingua del browser
 * (it/en/es/fr/de/pt se disponibile, altrimenti en). Lingua.imposta('en') cambia e ricarica. Lingua.t('testo') traduce da JS.
 * Il contenuto delle parole crociate e i quesiti verbali del test restano in italiano: vanno rifatti per lingua.
 */
(function () {
  'use strict';
  var KEY = 'testqi.lingua', DISPONIBILI = ['it', 'en', 'es', 'fr', 'de', 'pt'];
  var NOMI = { it: 'Italiano', en: 'English', es: 'Español', fr: 'Français', de: 'Deutsch', pt: 'Português' };
  function salvata() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function scegli() {
    var q = null; try { q = new URLSearchParams(location.search).get('lang'); } catch (e) {}
    if (q && DISPONIBILI.indexOf(q) >= 0) { try { localStorage.setItem(KEY, q); } catch (e) {} return q; }
    var s = salvata(); if (s && DISPONIBILI.indexOf(s) >= 0) return s;
    var b = (navigator.language || 'it').slice(0, 2).toLowerCase();
    return DISPONIBILI.indexOf(b) >= 0 ? b : 'en';
  }
  var cur = scegli();
  var dict = null, esatte = {}, modelli = [];

  function compila(d) {
    esatte = {}; modelli = [];
    Object.keys(d).forEach(function (k) {
      if (k.indexOf('{}') < 0 && k.indexOf('{*}') < 0) { esatte[k] = d[k]; return; }
      // {} = un numero, {*} = qualsiasi testo (es. una parola che cambia)
      var re = new RegExp('^' + k.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\{\}/g, '(\\d+(?:[.,:]\\d+)*)').replace(/\{\\\*\}/g, '(.+?)') + '$');
      modelli.push({ re: re, out: d[k] });
    });
  }
  function traduci(testo) {
    if (!dict) return null;
    var t = testo.replace(/\s+/g, ' ').trim(); if (!t) return null;
    if (esatte.hasOwnProperty(t)) return esatte[t];
    for (var i = 0; i < modelli.length; i++) {
      var m = modelli[i].re.exec(t);
      if (m) {
        var k = 0;
        return modelli[i].out.replace(/\{(\d*|\*)\}/g, function (_, idx) {
          var v = (idx && idx !== '*') ? m[+idx] : m[++k];
          if (v === undefined) return '';
          // una parola variabile ({*}) può essere a sua volta nel dizionario (es. il nome di un'area)
          if (/[A-Za-zÀ-ÿ]/.test(v)) { var tv = traduci(v); if (tv !== null) return tv; }
          return v;
        });
      }
    }
    return null;
  }
  function conservaSpazi(orig, nuovo) {
    var a = orig.match(/^\s*/)[0], b = orig.match(/\s*$/)[0];
    return a + nuovo + b;
  }
  var ATTR = ['title', 'aria-label', 'placeholder', 'alt'];
  function nodoTesto(n) {
    var p = n.parentNode; if (!p) return;
    var tag = p.nodeName; if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEXTAREA' || tag === 'CODE' || tag === 'PRE') return;
    if (p.closest && p.closest('[data-no-lingua]')) return;
    var v = n.nodeValue; if (!v || !/[A-Za-zÀ-ÿ]/.test(v)) return;
    if (n.__lg === v) return;                         // già tradotto da noi
    var tr = traduci(v);
    if (tr !== null) { var nv = conservaSpazi(v, tr); n.nodeValue = nv; n.__lg = nv; }
  }
  function elemento(e) {
    if (e.nodeType !== 1) return;
    ATTR.forEach(function (a) { var v = e.getAttribute && e.getAttribute(a); if (v) { var tr = traduci(v); if (tr !== null && tr !== v) e.setAttribute(a, tr); } });
    if ((e.nodeName === 'INPUT') && /^(button|submit)$/.test(e.type) && e.value) { var t2 = traduci(e.value); if (t2 !== null) e.value = t2; }
  }
  function percorri(root) {
    if (!root) return;
    if (root.nodeType === 3) { nodoTesto(root); return; }
    if (root.nodeType !== 1 && root.nodeType !== 11) return;
    elemento(root);
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    var n; while ((n = w.nextNode())) { if (n.nodeType === 3) nodoTesto(n); else elemento(n); }
  }
  function titoloMeta() {
    var t = traduci(document.title); if (t !== null) document.title = t;
    var md = document.querySelector('meta[name="description"]'); if (md) { var d = traduci(md.content); if (d !== null) md.content = d; }
    document.documentElement.lang = cur;
  }
  var osservatore = null;
  function avvia() {
    percorri(document.body); titoloMeta();
    if (osservatore || !window.MutationObserver) return;
    osservatore = new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var m = muts[i];
        if (m.type === 'characterData') nodoTesto(m.target);
        else if (m.type === 'attributes') elemento(m.target);
        else for (var j = 0; j < m.addedNodes.length; j++) percorri(m.addedNodes[j]);
      }
    });
    osservatore.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTR });
    var tObs = new MutationObserver(function () { var t = traduci(document.title); if (t !== null && t !== document.title) document.title = t; });
    var te = document.querySelector('title'); if (te) tObs.observe(te, { childList: true, characterData: true, subtree: true });
  }
  function carica(codice, poi) {
    if (window.LINGUE && window.LINGUE[codice]) { poi(window.LINGUE[codice]); return; }
    var base = (document.currentScript && document.currentScript.src) ? document.currentScript.src.replace(/js\/lingua\.js.*$/, '') : '/';
    var s = document.createElement('script'); s.src = base + 'lang/' + codice + '.js';
    s.onload = function () { poi(window.LINGUE && window.LINGUE[codice]); }; s.onerror = function () { poi(null); };
    document.head.appendChild(s);
  }
  window.Lingua = {
    corrente: function () { return cur; },
    disponibili: DISPONIBILI, nomi: NOMI,
    t: function (s) { var r = traduci(String(s)); return r === null ? s : r; },
    imposta: function (codice) {
      if (DISPONIBILI.indexOf(codice) < 0) return;
      try { localStorage.setItem(KEY, codice); } catch (e) {}
      try { var u = new URL(location.href); u.searchParams.delete('lang'); location.replace(u.href); } catch (e) { location.reload(); }
    },
    aggiorna: function () { if (dict) percorri(document.body); }
  };
  document.documentElement.lang = cur;
  if (cur !== 'it') {
    document.documentElement.classList.add('lingua-' + cur);
    carica(cur, function (d) {
      if (!d) return; dict = d; compila(d);
      if (document.body) avvia(); else document.addEventListener('DOMContentLoaded', avvia);
    });
  }
})();
