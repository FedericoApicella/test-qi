/*
 * raccolta.js: raccolta anonima dei risultati del test QI.
 *
 * Serve a misurare nel tempo l'affidabilità del test (alfa, test-retest,
 * difficoltà degli item). Non raccoglie nome, email o altri dati identificativi.
 *
 * Uso dalla pagina del test:
 *   Raccolta.init({ endpoint: window.RACCOLTA_ENDPOINT || null, testVersion: "1.0" });
 *   Raccolta.registra({ id: "mat_07", dominio: "matrici", corretto: 1, risposta: "C", rt_ms: 12345 });
 *   ... un registra() per ogni item ...
 *   Raccolta.chiudi({ punteggio_grezzo: 71, qi_stimato: 108, consenso: true,
 *                     demo: { eta_fascia: "25-34", studio: "laurea", lingua: "it" } });
 *   (consenso: true/false se la pagina lo ha già chiesto; se manca, lo chiede il modulo)
 *
 * Cosa fa da solo:
 *  - genera un id anonimo casuale e lo tiene in localStorage, così una seconda
 *    sessione della stessa persona si riconosce (serve per il test-retest);
 *  - conta le sessioni e i giorni passati dall'ultima;
 *  - chiede il consenso una volta (salvato in localStorage);
 *  - se c'è un endpoint, invia il record con una POST JSON (fetch, keepalive);
 *  - in ogni caso espone Raccolta.scarica() per salvare il record come file JSON.
 *
 * Formato del record (schema 1): vedi docs/calibrazione.md.
 */
(function (global) {
  "use strict";

  var CHIAVE_PID = "testqi.pid";
  var CHIAVE_SESSIONI = "testqi.sessioni";
  var CHIAVE_ULTIMA = "testqi.ultima";
  var CHIAVE_CONSENSO = "testqi.consenso";

  var stato = {
    endpoint: null,
    testVersion: "0",
    record: null,
    inviato: false
  };

  function leggi(chiave) {
    try { return global.localStorage.getItem(chiave); } catch (e) { return null; }
  }
  function scrivi(chiave, valore) {
    try { global.localStorage.setItem(chiave, String(valore)); } catch (e) { /* storage non disponibile */ }
  }

  function uuid() {
    if (global.crypto && global.crypto.randomUUID) return global.crypto.randomUUID();
    var b = new Uint8Array(16);
    if (global.crypto && global.crypto.getRandomValues) global.crypto.getRandomValues(b);
    else for (var i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
    b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
    var h = Array.prototype.map.call(b, function (x) { return ("0" + x.toString(16)).slice(-2); }).join("");
    return h.slice(0, 8) + "-" + h.slice(8, 12) + "-" + h.slice(12, 16) + "-" + h.slice(16, 20) + "-" + h.slice(20);
  }

  function pid() {
    var p = leggi(CHIAVE_PID);
    if (!p) { p = uuid(); scrivi(CHIAVE_PID, p); }
    return p;
  }

  /** Chiede il consenso una sola volta. Restituisce true/false. */
  function consenso(testo) {
    var c = leggi(CHIAVE_CONSENSO);
    if (c === "si") return true;
    if (c === "no") return false;
    var ok = global.confirm(testo || (
      "Vuoi contribuire a migliorare il test?\n\n" +
      "Verranno salvate in forma anonima le tue risposte, i tempi e, se le indichi, fascia d'età e titolo di studio. " +
      "Nessun nome, email o indirizzo. I dati servono solo a misurare l'affidabilità del test.\n\n" +
      "Puoi rifiutare: il test funziona lo stesso."));
    scrivi(CHIAVE_CONSENSO, ok ? "si" : "no");
    return ok;
  }

  function init(opzioni) {
    opzioni = opzioni || {};
    stato.endpoint = opzioni.endpoint || null;
    stato.testVersion = String(opzioni.testVersion || "0");
    stato.inviato = false;

    var sessioni = parseInt(leggi(CHIAVE_SESSIONI) || "0", 10) + 1;
    var ultima = leggi(CHIAVE_ULTIMA);
    var giorni = null;
    if (ultima) {
      var ms = Date.now() - new Date(ultima).getTime();
      if (isFinite(ms) && ms >= 0) giorni = Math.round(ms / 86400000 * 10) / 10;
    }

    stato.record = {
      schema: 1,
      test_version: stato.testVersion,
      pid: pid(),
      sessione: sessioni,
      giorni_dalla_precedente: giorni,
      iniziato: new Date().toISOString(),
      concluso: null,
      agente: (global.navigator && global.navigator.userAgent) || null,
      schermo: global.screen ? global.screen.width + "x" + global.screen.height : null,
      lingua_browser: (global.navigator && global.navigator.language) || null,
      consenso: null,
      item: [],
      punteggio_grezzo: null,
      qi_stimato: null,
      demo: {}
    };
    return stato.record;
  }

  /** Registra la risposta a un item. Campi: id, dominio, corretto (0/1), risposta, rt_ms. */
  function registra(r) {
    if (!stato.record) init({});
    stato.record.item.push({
      id: String(r.id),
      dominio: r.dominio || String(r.id).split("_")[0],
      corretto: r.corretto ? 1 : 0,
      risposta: r.risposta == null ? null : String(r.risposta),
      rt_ms: typeof r.rt_ms === "number" ? Math.round(r.rt_ms) : null,
      scaduto: r.scaduto ? 1 : 0
    });
  }

  function invia(record) {
    if (!stato.endpoint || !global.fetch) return Promise.resolve(false);
    var corpo = JSON.stringify(record);
    // Content-Type text/plain e mode no-cors: richiesta "semplice", senza preflight,
    // che Google Apps Script accetta (il JSON arriva lo stesso in e.postData.contents).
    // La risposta è opaca: se la fetch non fallisce, il record è stato consegnato.
    return global.fetch(stato.endpoint, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: corpo,
      keepalive: true,
      mode: "no-cors"
    }).then(function () { stato.inviato = true; return true; })
      .catch(function () { return false; });
  }

  /** Chiude la sessione: salva punteggi e demografia, chiede il consenso, invia. */
  function chiudi(esito) {
    if (!stato.record) return Promise.resolve(false);
    esito = esito || {};
    stato.record.concluso = new Date().toISOString();
    stato.record.punteggio_grezzo = esito.punteggio_grezzo == null ? null : esito.punteggio_grezzo;
    stato.record.qi_stimato = esito.qi_stimato == null ? null : esito.qi_stimato;
    stato.record.demo = esito.demo || {};

    scrivi(CHIAVE_SESSIONI, stato.record.sessione);
    scrivi(CHIAVE_ULTIMA, stato.record.concluso);

    // Se la pagina ha già chiesto il consenso, lo passa in esito.consenso (true/false)
    // e il modulo non lo chiede di nuovo.
    var ok = typeof esito.consenso === "boolean" ? esito.consenso : consenso(esito.testoConsenso);
    if (typeof esito.consenso === "boolean") scrivi(CHIAVE_CONSENSO, ok ? "si" : "no");
    stato.record.consenso = ok;
    if (!ok) return Promise.resolve(false);
    return invia(stato.record);
  }

  /** Fa scaricare il record corrente come file JSON (funziona anche senza endpoint). */
  function scarica() {
    if (!stato.record) return;
    var blob = new Blob([JSON.stringify(stato.record, null, 2)], { type: "application/json" });
    var url = global.URL.createObjectURL(blob);
    var a = global.document.createElement("a");
    a.href = url;
    a.download = "testqi_" + stato.record.pid.slice(0, 8) + "_s" + stato.record.sessione + ".json";
    global.document.body.appendChild(a);
    a.click();
    global.document.body.removeChild(a);
    setTimeout(function () { global.URL.revokeObjectURL(url); }, 1000);
  }

  function record() { return stato.record; }

  global.Raccolta = { init: init, registra: registra, chiudi: chiudi, scarica: scarica, record: record };
})(typeof window !== "undefined" ? window : this);
