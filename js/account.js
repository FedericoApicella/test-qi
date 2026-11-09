/*
 * account.js: mini accesso con nome utente e password per il sito Test QI.
 *
 * Cosa fa:
 *  - aggiunge da solo un pulsante "Accedi" (in alto a destra, oppure dentro l'elemento
 *    con id="cardAccedi" se la pagina ce l'ha) con un pannello per accedere, creare
 *    un account, cambiare o recuperare la password, uscire;
 *  - per chi ha fatto l'accesso, sincronizza tra dispositivi tutte le chiavi di
 *    localStorage che iniziano con "testqi." (progressi, badge, storico dei risultati...),
 *    tranne quelle anonime della raccolta dati (pid, consenso, sessioni, ultima).
 *    Le altre pagine non devono chiamare nulla: basta scrivere in localStorage.
 *  - il sito funziona uguale senza account: tutto resta nel browser.
 *
 * Backend: lo stesso Apps Script della raccolta (analisi/endpoint-apps-script.gs),
 * URL in window.ACCOUNT_ENDPOINT o window.RACCOLTA_ENDPOINT. Email facoltativa,
 * usata solo per recuperare la password; non finisce mai nei dati della raccolta.
 *
 * API facoltativa per le pagine:
 *   Account.utente()        -> {nome} oppure null
 *   Account.apri()          -> apre il pannello
 *   Account.sincronizza()   -> forza un salvataggio/aggiornamento (Promise)
 *   evento "testqi:account" su window dopo login, logout o sincronizzazione
 *   (detail: {tipo:"login"|"logout"|"sync", chiavi:[...]}): rileggere localStorage.
 */
(function (global) {
  "use strict";
  if (!global.document || global.Account) return;

  var ENDPOINT = global.ACCOUNT_ENDPOINT || global.RACCOLTA_ENDPOINT || null;
  var PREFISSO = "testqi.";
  var CHIAVE_SESSIONE = "testqi.account";        // {token, nome, email}
  var CHIAVE_MOD = "testqi.account.mod";          // {chiave: ms ultima modifica}
  var CHIAVE_SYNC = "testqi.account.sync";        // ultimo invio riuscito (ISO)
  var ESCLUSE = { "testqi.pid": 1, "testqi.consenso": 1, "testqi.sessioni": 1, "testqi.ultima": 1 };
  var EXTRA = { "sfide-nome": 1 };
  var MAX_RISULTATI = 60;

  var ls = global.localStorage;
  var setOrig = Storage.prototype.setItem;
  var removeOrig = Storage.prototype.removeItem;
  var interno = false;          // true mentre scriviamo noi stessi (niente notifiche)
  var timerPush = null;
  var inCorso = null;
  var ui = {};

  function leggi(k) { try { return ls.getItem(k); } catch (e) { return null; } }
  function scriviInterno(k, v) { interno = true; try { if (v == null) removeOrig.call(ls, k); else setOrig.call(ls, k, v); } catch (e) { } interno = false; }
  function leggiJson(k, dflt) { try { return JSON.parse(leggi(k)) || dflt; } catch (e) { return dflt; } }

  function sessione() { return leggiJson(CHIAVE_SESSIONE, null); }
  function sincronizzabile(k) {
    k = String(k);
    if (EXTRA[k]) return true;
    if (k.indexOf(PREFISSO) !== 0) return false;
    if (ESCLUSE[k] || k.indexOf(CHIAVE_SESSIONE) === 0) return false;
    return true;
  }

  // Intercetta le scritture della pagina per sapere cosa è cambiato e quando.
  function segnaModifica(k) {
    var mod = leggiJson(CHIAVE_MOD, {});
    mod[k] = Date.now();
    scriviInterno(CHIAVE_MOD, JSON.stringify(mod));
    if (sessione()) programmaPush();
  }
  Storage.prototype.setItem = function (k, v) {
    setOrig.apply(this, arguments);
    if (!interno && this === ls && sincronizzabile(k)) segnaModifica(String(k));
  };
  Storage.prototype.removeItem = function (k) {
    removeOrig.apply(this, arguments);
    if (!interno && this === ls && sincronizzabile(k)) segnaModifica(String(k));
  };

  function chiaviLocali() {
    var out = [];
    try { for (var i = 0; i < ls.length; i++) { var k = ls.key(i); if (sincronizzabile(k)) out.push(k); } } catch (e) { }
    var mod = leggiJson(CHIAVE_MOD, {});
    for (var k2 in mod) if (sincronizzabile(k2) && out.indexOf(k2) < 0) out.push(k2); // chiavi cancellate
    return out;
  }

  // Pacchetto locale: {chiave: {v, t}}; senza data di modifica t = 0 (vince il cloud).
  function pacchettoLocale() {
    var mod = leggiJson(CHIAVE_MOD, {});
    var p = {};
    chiaviLocali().forEach(function (k) {
      var v = leggi(k);
      if (k === "testqi.risultati") v = limitaRisultati(v);
      p[k] = { v: v, t: typeof mod[k] === "number" ? mod[k] : 0 };
    });
    return p;
  }

  function limitaRisultati(v) {
    try { var a = JSON.parse(v); if (Array.isArray(a) && a.length > MAX_RISULTATI) return JSON.stringify(a.slice(a.length - MAX_RISULTATI)); } catch (e) { }
    return v;
  }

  // Applica il pacchetto del cloud: per ogni chiave vince la data più recente.
  function applica(cloud) {
    var mod = leggiJson(CHIAVE_MOD, {});
    var cambiate = [];
    for (var k in cloud) {
      if (!Object.prototype.hasOwnProperty.call(cloud, k) || !sincronizzabile(k)) continue;
      var c = cloud[k]; if (!c || typeof c.t !== "number") continue;
      var tl = typeof mod[k] === "number" ? mod[k] : 0;
      var vl = leggi(k);
      if (c.t > tl || (c.t === tl && vl !== c.v) || (tl === 0 && vl == null)) {
        if (vl !== c.v) { scriviInterno(k, c.v); cambiate.push(k); }
        mod[k] = c.t;
      }
    }
    scriviInterno(CHIAVE_MOD, JSON.stringify(mod));
    return cambiate;
  }

  function evento(tipo, chiavi) {
    try { global.dispatchEvent(new CustomEvent("testqi:account", { detail: { tipo: tipo, chiavi: chiavi || [] } })); } catch (e) { }
  }

  // ---------------------------------------------------------------- rete
  function chiama(dati) {
    if (!ENDPOINT || !global.fetch) return Promise.reject(new Error("Accesso non configurato su questo sito."));
    return global.fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(dati) })
      .then(function (r) { return r.text(); })
      .then(function (t) {
        var o; try { o = JSON.parse(t); } catch (e) { throw new Error("Risposta non valida dal server. Il foglio ha la versione nuova dello script?"); }
        if (!o.ok) { var e2 = new Error(o.errore || "Errore"); e2.codice = o.codice; throw e2; }
        return o;
      });
  }

  function dopoAccesso(o) {
    scriviInterno(CHIAVE_SESSIONE, JSON.stringify({ token: o.token, nome: o.nome, email: !!o.email }));
    // Primo accesso da questo dispositivo: ciò che c'è in locale e manca nel cloud sale con data di adesso.
    var mod = leggiJson(CHIAVE_MOD, {});
    chiaviLocali().forEach(function (k) { if (!(o.dati || {})[k] && typeof mod[k] !== "number") mod[k] = Date.now(); });
    scriviInterno(CHIAVE_MOD, JSON.stringify(mod));
    var cambiate = applica(o.dati || {});
    evento("login", cambiate);
    return push();
  }

  function push() {
    var s = sessione();
    if (!s) return Promise.resolve(false);
    if (inCorso) return inCorso;
    inCorso = chiama({ azione: "salva", token: s.token, dati: pacchettoLocale() })
      .then(function (o) {
        var cambiate = applica(o.dati || {});
        scriviInterno(CHIAVE_SYNC, new Date().toISOString());
        if (cambiate.length) evento("sync", cambiate);
        aggiornaUi();
        return true;
      })
      .catch(function (e) {
        if (e.codice === "token") { scriviInterno(CHIAVE_SESSIONE, null); evento("logout"); aggiornaUi(); }
        return false;
      })
      .then(function (r) { inCorso = null; return r; });
    return inCorso;
  }

  function programmaPush() { clearTimeout(timerPush); timerPush = setTimeout(push, 1500); }

  function esci() {
    var s = sessione();
    scriviInterno(CHIAVE_SESSIONE, null);
    scriviInterno(CHIAVE_SYNC, null);
    if (s) chiama({ azione: "esci", token: s.token }).catch(function () { });
    evento("logout");
    aggiornaUi();
  }

  // ---------------------------------------------------------------- interfaccia
  var CSS = "" +
    ".acc-btn{position:fixed;top:10px;right:10px;z-index:9000;display:inline-flex;align-items:center;gap:6px;padding:7px 12px;border-radius:999px;border:1px solid var(--border,#d3dbe0);background:var(--surface,#fff);color:var(--fg,#141c23);font:inherit;font-size:14px;font-weight:600;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.08)}" +
    ".acc-btn.in-card{position:static;box-shadow:none}" +
    ".acc-btn .acc-dot{width:9px;height:9px;border-radius:50%;background:var(--muted,#5b6974)}.acc-btn.on .acc-dot{background:var(--ok,#1d7a3b)}" +
    ".acc-dlg{border:1px solid var(--border,#d3dbe0);border-radius:14px;padding:0;max-width:360px;width:calc(100vw - 32px);background:var(--surface,#fff);color:var(--fg,#141c23);font:inherit;box-shadow:0 12px 40px rgba(0,0,0,.2)}" +
    ".acc-dlg::backdrop{background:rgba(0,0,0,.35)}" +
    ".acc-dlg .acc-in{padding:18px 20px 20px}" +
    ".acc-dlg h2{margin:0 0 4px;font-size:19px}.acc-dlg p{margin:6px 0;font-size:14px;color:var(--muted,#5b6974);line-height:1.4}" +
    ".acc-dlg label{display:block;font-size:13px;font-weight:600;margin:12px 0 4px}" +
    ".acc-dlg input{width:100%;box-sizing:border-box;padding:9px 10px;border:1px solid var(--border-strong,#aeb9c1);border-radius:8px;background:var(--bg,#f2f5f6);color:inherit;font:inherit;font-size:15px}" +
    ".acc-dlg .acc-row{display:flex;gap:8px;margin-top:16px;flex-wrap:wrap}" +
    ".acc-dlg button{font:inherit;font-size:14px;font-weight:600;padding:9px 14px;border-radius:8px;border:1px solid var(--border-strong,#aeb9c1);background:var(--surface,#fff);color:inherit;cursor:pointer}" +
    ".acc-dlg button.acc-p{background:var(--accent,#0b6e66);color:var(--accent-fg,#fff);border-color:transparent}" +
    ".acc-dlg button.acc-l{border:0;background:none;padding:6px 0;font-weight:500;text-decoration:underline;color:var(--muted,#5b6974)}" +
    ".acc-dlg .acc-err{color:var(--bad,#b4261e);font-size:13px;margin-top:10px;min-height:1em}" +
    ".acc-dlg .acc-okmsg{color:var(--ok,#1d7a3b);font-size:13px;margin-top:10px}" +
    ".acc-dlg .acc-tabs{display:flex;gap:6px;margin-bottom:8px}.acc-dlg .acc-tabs button{flex:1;padding:7px}.acc-dlg .acc-tabs button.sel{background:var(--accent-soft,#d8eeea);border-color:var(--accent,#0b6e66)}" +
    ".acc-dlg .acc-x{position:absolute;top:8px;right:8px;border:0;background:none;font-size:20px;padding:4px 8px;line-height:1}";

  function el(tag, attrs, html) { var e = document.createElement(tag); for (var a in attrs || {}) e.setAttribute(a, attrs[a]); if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  function montaUi() {
    if (ui.btn) return;
    document.head.appendChild(el("style", {}, CSS));
    ui.btn = el("button", { type: "button", "class": "acc-btn", "aria-label": "Account" });
    var card = document.getElementById("cardAccedi");
    if (card) { ui.btn.className += " in-card"; card.appendChild(ui.btn); } else document.body.appendChild(ui.btn);
    ui.btn.addEventListener("click", apri);
    ui.dlg = el("dialog", { "class": "acc-dlg" });
    ui.dlg.style.position = "fixed";
    document.body.appendChild(ui.dlg);
    ui.dlg.addEventListener("click", function (e) { if (e.target === ui.dlg) ui.dlg.close(); });
    aggiornaUi();
  }

  function aggiornaUi() {
    if (!ui.btn) return;
    var s = sessione();
    ui.btn.className = ui.btn.className.replace(" on", "") + (s ? " on" : "");
    ui.btn.innerHTML = '<span class="acc-dot"></span>' + (s ? esc(s.nome) : "Accedi");
    ui.btn.title = s ? "Account: " + s.nome : "Accedi per salvare risultati e progressi su tutti i dispositivi";
  }

  var vista = "accedi";
  function apri(v) {
    montaUi();
    vista = typeof v === "string" ? v : (sessione() ? "profilo" : vista);
    disegna();
    if (!ui.dlg.open) { try { ui.dlg.showModal(); } catch (e) { ui.dlg.setAttribute("open", ""); } }
  }

  function campo(id, label, type, extra) {
    return '<label for="acc_' + id + '">' + label + '</label><input id="acc_' + id + '" type="' + type + '" ' + (extra || "") + '>';
  }

  function disegna() {
    var s = sessione();
    var h = '<button type="button" class="acc-x" aria-label="Chiudi">&times;</button><div class="acc-in">';
    if (!ENDPOINT) {
      h += "<h2>Accesso non disponibile</h2><p>Questa copia del sito non ha un servizio di salvataggio configurato. I progressi restano comunque salvati in questo browser.</p>";
    } else if (s && vista === "profilo") {
      var sync = leggi(CHIAVE_SYNC);
      h += "<h2>Ciao, " + esc(s.nome) + "</h2><p>Risultati, progressi e badge si salvano da soli e li ritrovi su ogni dispositivo dove fai l'accesso.</p>" +
        "<p>" + (sync ? "Ultimo salvataggio: " + new Date(sync).toLocaleString("it-IT") : "Nessun salvataggio ancora riuscito.") + "</p>" +
        '<div class="acc-row"><button type="button" class="acc-p" data-a="sync">Salva adesso</button><button type="button" data-a="vai:password">Cambia password</button><button type="button" data-a="vai:email">' + (s.email ? "Cambia email" : "Aggiungi email") + '</button></div>' +
        '<div class="acc-row"><button type="button" data-a="esci">Esci</button><button type="button" class="acc-l" data-a="vai:elimina">Elimina account</button></div>';
    } else if (s && vista === "password") {
      h += "<h2>Cambia password</h2>" + campo("vecchia", "Password attuale", "password", 'autocomplete="current-password"') + campo("nuova", "Nuova password (almeno 4 caratteri)", "password", 'autocomplete="new-password"') +
        '<div class="acc-row"><button type="button" class="acc-p" data-a="cambia">Cambia</button><button type="button" data-a="vai:profilo">Indietro</button></div>';
    } else if (s && vista === "email") {
      h += "<h2>Email di recupero</h2><p>Serve solo se dimentichi la password: ti mandiamo un codice. Puoi lasciarla vuota per toglierla.</p>" + campo("email", "Email", "email", 'autocomplete="email"') +
        '<div class="acc-row"><button type="button" class="acc-p" data-a="email">Salva</button><button type="button" data-a="vai:profilo">Indietro</button></div>';
    } else if (s && vista === "elimina") {
      h += "<h2>Elimina account</h2><p>Cancella l'account e i dati salvati nel cloud. Quelli in questo browser restano.</p>" + campo("pwdel", "Password", "password", 'autocomplete="current-password"') +
        '<div class="acc-row"><button type="button" class="acc-p" data-a="elimina">Elimina davvero</button><button type="button" data-a="vai:profilo">Indietro</button></div>';
    } else if (vista === "recupera") {
      h += "<h2>Password dimenticata</h2><p>Funziona solo se avevi messo un'email: ti arriva un codice di 6 cifre.</p>" + campo("rnome", "Nome utente", "text", 'autocomplete="username"') +
        '<div class="acc-row"><button type="button" class="acc-p" data-a="recupera">Mandami il codice</button><button type="button" data-a="vai:accedi">Indietro</button></div>' +
        '<div id="acc_reimposta" style="display:none">' + campo("codice", "Codice ricevuto", "text", 'inputmode="numeric"') + campo("rnuova", "Nuova password", "password", 'autocomplete="new-password"') +
        '<div class="acc-row"><button type="button" class="acc-p" data-a="reimposta">Imposta la nuova password</button></div></div>';
    } else {
      var reg = vista === "registra";
      h += '<div class="acc-tabs"><button type="button" class="' + (reg ? "" : "sel") + '" data-a="vai:accedi">Accedi</button><button type="button" class="' + (reg ? "sel" : "") + '" data-a="vai:registra">Crea account</button></div>' +
        "<p>" + (reg ? "Scegli un nome utente e una password, anche semplici. L'email è facoltativa: serve solo per recuperare la password." : "Con l'account ritrovi risultati, progressi e badge su tutti i tuoi dispositivi.") + "</p>" +
        campo("nome", "Nome utente", "text", 'autocomplete="username" autocapitalize="off" maxlength="20"') +
        campo("password", "Password", "password", 'autocomplete="' + (reg ? "new" : "current") + '-password"') +
        (reg ? campo("email", "Email (facoltativa)", "email", 'autocomplete="email"') : "") +
        '<div class="acc-row"><button type="button" class="acc-p" data-a="' + (reg ? "registra" : "accedi") + '">' + (reg ? "Crea l'account" : "Entra") + '</button>' +
        (reg ? "" : '<button type="button" class="acc-l" data-a="vai:recupera">Password dimenticata?</button>') + "</div>";
    }
    h += '<div class="acc-err" id="acc_err"></div></div>';
    ui.dlg.innerHTML = h;
    ui.dlg.querySelector(".acc-x").addEventListener("click", function () { ui.dlg.close(); });
    ui.dlg.querySelectorAll("[data-a]").forEach(function (b) { b.addEventListener("click", function () { azione(b.getAttribute("data-a"), b); }); });
    ui.dlg.querySelectorAll("input").forEach(function (i) { i.addEventListener("keydown", function (e) { if (e.key === "Enter") { var p = ui.dlg.querySelector(".acc-row .acc-p:not([disabled])"); if (p) p.click(); } }); });
    var primo = ui.dlg.querySelector("input"); if (primo) setTimeout(function () { primo.focus(); }, 50);
  }

  function val(id) { var e = document.getElementById("acc_" + id); return e ? e.value : ""; }
  function errore(msg, ok) { var e = document.getElementById("acc_err"); if (e) { e.textContent = msg || ""; e.className = ok ? "acc-okmsg" : "acc-err"; } }
  function attesa(b, on) { ui.dlg.querySelectorAll("button").forEach(function (x) { x.disabled = on; }); if (b) b.textContent = on ? "Un momento…" : b.getAttribute("data-t") || b.textContent; }

  function azione(a, b) {
    if (a.indexOf("vai:") === 0) { vista = a.slice(4); disegna(); return; }
    var s = sessione();
    errore("");
    if (b) b.setAttribute("data-t", b.textContent);
    var p;
    if ((a === "accedi" || a === "registra") && (!val("nome").trim() || !val("password"))) { errore("Scrivi nome utente e password."); return; }
    if (a === "registra" && val("password").length < 4) { errore("La password deve avere almeno 4 caratteri."); return; }
    if (a === "accedi") p = chiama({ azione: "accedi", nome: val("nome").trim(), password: val("password") }).then(dopoAccesso).then(function () { vista = "profilo"; disegna(); });
    else if (a === "registra") p = chiama({ azione: "registra", nome: val("nome").trim(), password: val("password"), email: val("email").trim() }).then(dopoAccesso).then(function () { vista = "profilo"; disegna(); });
    else if (a === "sync") p = push().then(function (ok) { disegna(); errore(ok ? "Salvato." : "Non sono riuscito a salvare: controlla la connessione.", ok); });
    else if (a === "esci") { esci(); vista = "accedi"; disegna(); return; }
    else if (a === "cambia") p = chiama({ azione: "cambia_password", token: s.token, vecchia: val("vecchia"), nuova: val("nuova") }).then(function () { vista = "profilo"; disegna(); errore("Password cambiata.", true); });
    else if (a === "email") p = chiama({ azione: "salva", token: s.token, dati: {}, email: val("email").trim() }).then(function (o) { s.email = !!o.email; scriviInterno(CHIAVE_SESSIONE, JSON.stringify(s)); vista = "profilo"; disegna(); errore("Email salvata.", true); });
    else if (a === "elimina") p = chiama({ azione: "elimina", token: s.token, password: val("pwdel") }).then(function () { scriviInterno(CHIAVE_SESSIONE, null); scriviInterno(CHIAVE_SYNC, null); evento("logout"); aggiornaUi(); vista = "accedi"; disegna(); errore("Account eliminato.", true); });
    else if (a === "recupera") p = chiama({ azione: "recupera", nome: val("rnome").trim() }).then(function (o) { var d = document.getElementById("acc_reimposta"); if (d) d.style.display = ""; errore(o.messaggio, true); });
    else if (a === "reimposta") p = chiama({ azione: "reimposta", nome: val("rnome").trim(), codice: val("codice"), nuova: val("rnuova") }).then(dopoAccesso).then(function () { vista = "profilo"; disegna(); errore("Password cambiata, sei dentro.", true); });
    else return;
    attesa(b, true);
    p.catch(function (e) { var m = e && e.message || String(e); if (/fetch|network|load failed|connessione/i.test(m)) m = "Non riesco a raggiungere il server: controlla la connessione e riprova."; errore(m); }).then(function () { if (ui.dlg.open) attesa(b, false); aggiornaUi(); });
  }

  // ---------------------------------------------------------------- avvio
  function avvio() {
    montaUi();
    if (sessione()) push();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", avvio); else avvio();
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "hidden" && sessione() && timerPush) { clearTimeout(timerPush); timerPush = null; push(); } });

  global.Account = {
    utente: function () { var s = sessione(); return s ? { nome: s.nome } : null; },
    apri: apri,
    sincronizza: push,
    esci: esci
  };
})(typeof window !== "undefined" ? window : this);
