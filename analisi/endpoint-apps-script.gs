/*
 * Endpoint gratuito del sito Test QI: un foglio Google + Apps Script.
 * Fa due cose, sullo stesso URL /exec:
 *   1. raccolta anonima dei risultati (js/raccolta.js): ogni sessione una riga nella PRIMA scheda;
 *   2. mini accesso con nome utente e password (js/account.js): scheda "utenti", creata da sola;
 *   3. segnalazioni di bug ed errori (js/segnala.js): scheda "bug", creata da sola. Si leggono dal foglio
 *      oppure dalla pagina /bug/ del sito (solo gli amministratori, vedi AMMINISTRATORI_BUG).
 *
 * Come si installa (5 minuti):
 *  1. Crea un foglio Google vuoto, chiamalo "testqi-dati".
 *  2. Estensioni → Apps Script, incolla questo file, salva.
 *  3. Distribuisci → Nuova distribuzione → tipo "App web":
 *       Esegui come: me;  Chi può accedere: Chiunque.
 *  4. Copia l'URL della web app e mettilo in index.html:
 *       <script>window.RACCOLTA_ENDPOINT = "https://script.google.com/macros/s/.../exec";</script>
 *     prima di <script src="js/raccolta.js"></script>.
 *
 * Come si aggiorna (dopo aver incollato una versione nuova di questo file):
 *  Distribuisci → Gestisci distribuzioni → matita → Versione: "Nuova versione" → Distribuisci.
 *  L'URL resta lo stesso. Alla prima esecuzione Google chiede di autorizzare di nuovo
 *  (serve il permesso di inviare email per il recupero della password).
 *
 * Privacy: nella scheda dei risultati non entra mai nome, email o altro dato identificativo.
 * La scheda "utenti" contiene nome utente, password cifrata (hash con sale), email facoltativa
 * e i dati del profilo (progressi, badge, storico) in JSON. Le due schede non sono collegate.
 *
 * Per l'analisi: File → Scarica → CSV della prima scheda, poi
 *   python3 analisi/affidabilita.py dati.jsonl
 * dopo aver estratto la colonna A in un file con un record per riga.
 */

var NOME_SCHEDA_UTENTI = "utenti";
var NOME_SCHEDA_BUG = "bug";
var AMMINISTRATORI_BUG = ["fede"];   // nomi utente (minuscoli) che possono leggere e chiudere le segnalazioni dal sito
var MAX_BUG_LISTA = 200;
var MAX_DATI = 45000;        // caratteri di JSON per utente (limite di una cella: 50.000)
var MAX_TOKEN = 8;           // dispositivi collegati contemporaneamente
var ITERAZIONI_HASH = 1000;
var MAX_TENTATIVI = 8;       // poi 15 minuti di pausa
var INTESTAZIONE = ["nome_min", "nome", "hash", "sale", "email", "creato", "ultimo_accesso",
  "token_json", "dati_json", "tentativi", "blocco_fino", "codice_recupero", "codice_scade"];
var C = {}; INTESTAZIONE.forEach(function (n, i) { C[n] = i; });

function doPost(e) {
  var testo = e.postData && e.postData.contents;
  var r;
  try { r = JSON.parse(testo); } catch (err) { return txt("json non valido"); }
  if (r && /^bug/.test(String(r.azione))) return json(bug(r));
  if (r && r.azione) return json(account(r));
  return txt(raccolta(r, testo));
}

function doGet() { return txt("testqi endpoint attivo"); }

function txt(s) { return ContentService.createTextOutput(s).setMimeType(ContentService.MimeType.TEXT); }
function json(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

// ============================ 1. raccolta anonima ============================
function raccolta(r, testo) {
  var foglio = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  if (!r || r.schema !== 1 || !r.consenso || !r.item || !r.item.length) return "scartato";
  if (testo.length > 200000) return "troppo grande";
  if (foglio.getLastRow() === 0) {
    foglio.appendRow(["record_json", "ricevuto", "test_version", "pid", "sessione", "giorni_dalla_precedente",
      "n_item", "punteggio_grezzo", "qi_stimato", "eta_fascia", "studio", "lingua"]);
  }
  var corretti = 0;
  for (var i = 0; i < r.item.length; i++) corretti += r.item[i].corretto ? 1 : 0;
  var demo = r.demo || {};
  foglio.appendRow([testo, new Date().toISOString(), r.test_version, r.pid, r.sessione,
    r.giorni_dalla_precedente, r.item.length,
    r.punteggio_grezzo == null ? corretti : r.punteggio_grezzo, r.qi_stimato,
    demo.eta_fascia || "", demo.studio || "", demo.lingua || ""]);
  return "ok";
}

// ============================ 2. mini accesso ============================
// Richiesta: {azione, ...}. Risposta: {ok:true, ...} oppure {ok:false, errore:"testo per l'utente"}.
// Azioni: registra, accedi, carica, salva, esci, cambia_password, recupera, reimposta, elimina.
function account(r) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(15000); } catch (e) { return err("Server occupato, riprova tra un attimo."); }
  try {
    var az = String(r.azione);
    if (az === "registra") return registra(r);
    if (az === "accedi") return accedi(r);
    if (az === "recupera") return recupera(r);
    if (az === "reimposta") return reimposta(r);
    var u = perToken(r.token);
    if (!u) return err("Sessione scaduta: accedi di nuovo.", "token");
    if (az === "carica") return ok({ nome: u.riga[C.nome], email: !!u.riga[C.email], dati: leggiDati(u.riga) });
    if (az === "salva") return salva(u, r);
    if (az === "esci") return esci(u, r);
    if (az === "cambia_password") return cambiaPassword(u, r);
    if (az === "elimina") return elimina(u, r);
    return err("Azione sconosciuta.");
  } catch (e) {
    return err("Errore del server: " + e);
  } finally {
    lock.releaseLock();
  }
}

function ok(o) { o = o || {}; o.ok = true; return o; }
function err(msg, codice) { return { ok: false, errore: msg, codice: codice || null }; }

function schedaUtenti() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var s = ss.getSheetByName(NOME_SCHEDA_UTENTI);
  if (!s) {
    s = ss.insertSheet(NOME_SCHEDA_UTENTI);
    s.appendRow(INTESTAZIONE);
    s.hideColumns(C.hash + 1, 2);
  }
  return s;
}

function tutti() {
  var s = schedaUtenti();
  var n = s.getLastRow();
  if (n < 2) return { scheda: s, righe: [] };
  return { scheda: s, righe: s.getRange(2, 1, n - 1, INTESTAZIONE.length).getValues() };
}

function perNome(nome) {
  var nm = normalizzaNome(nome);
  if (!nm) return null;
  var t = tutti();
  for (var i = 0; i < t.righe.length; i++) {
    if (String(t.righe[i][C.nome_min]) === nm) return { scheda: t.scheda, riga: t.righe[i], n: i + 2 };
  }
  return null;
}

function perToken(token) {
  token = String(token || "");
  if (token.length < 20) return null;
  var t = tutti();
  for (var i = 0; i < t.righe.length; i++) {
    var lista = leggiToken(t.righe[i]);
    for (var j = 0; j < lista.length; j++) {
      if (lista[j].t === token) return { scheda: t.scheda, riga: t.righe[i], n: i + 2 };
    }
  }
  return null;
}

function scriviCella(u, campo, valore) { u.riga[C[campo]] = valore; u.scheda.getRange(u.n, C[campo] + 1).setValue(valore); }

function normalizzaNome(nome) {
  nome = String(nome || "").trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{2,19}$/.test(nome)) return null;
  return nome.toLowerCase();
}

function emailValida(email) {
  email = String(email || "").trim();
  if (!email) return "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 120) return null;
  return email;
}

function sha256hex(s) {
  var b = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8);
  var h = "";
  for (var i = 0; i < b.length; i++) h += ("0" + ((b[i] + 256) % 256).toString(16)).slice(-2);
  return h;
}

function hashPassword(password, sale) {
  var h = sha256hex(sale + ":" + password);
  for (var i = 0; i < ITERAZIONI_HASH; i++) h = sha256hex(h + sale);
  return h;
}

function nuovoToken() { return Utilities.getUuid().replace(/-/g, "") + Utilities.getUuid().replace(/-/g, "").slice(0, 16); }

function leggiToken(riga) { try { return JSON.parse(riga[C.token_json] || "[]") || []; } catch (e) { return []; } }
function leggiDati(riga) { try { return JSON.parse(riga[C.dati_json] || "{}") || {}; } catch (e) { return {}; } }

function aggiungiToken(u) {
  var lista = leggiToken(u.riga);
  var tok = nuovoToken();
  lista.push({ t: tok, d: new Date().toISOString() });
  while (lista.length > MAX_TOKEN) lista.shift();
  scriviCella(u, "token_json", JSON.stringify(lista));
  scriviCella(u, "ultimo_accesso", new Date().toISOString());
  return tok;
}

function registra(r) {
  var nm = normalizzaNome(r.nome);
  if (!nm) return err("Il nome utente deve avere da 3 a 20 caratteri: lettere, numeri, punto, trattino o trattino basso.");
  var pw = String(r.password || "");
  if (pw.length < 4 || pw.length > 100) return err("La password deve avere almeno 4 caratteri.");
  var email = emailValida(r.email);
  if (email === null) return err("L'email non sembra valida (puoi anche lasciarla vuota).");
  if (perNome(nm)) return err("Questo nome utente è già preso: scegline un altro.");
  var s = schedaUtenti();
  var sale = nuovoToken().slice(0, 24);
  var riga = [];
  for (var i = 0; i < INTESTAZIONE.length; i++) riga.push("");
  riga[C.nome_min] = nm; riga[C.nome] = String(r.nome).trim(); riga[C.hash] = hashPassword(pw, sale); riga[C.sale] = sale;
  riga[C.email] = email; riga[C.creato] = new Date().toISOString(); riga[C.token_json] = "[]";
  riga[C.dati_json] = "{}"; riga[C.tentativi] = 0;
  s.appendRow(riga);
  var u = { scheda: s, riga: riga, n: s.getLastRow() };
  var tok = aggiungiToken(u);
  return ok({ token: tok, nome: riga[C.nome], email: !!email, dati: {} });
}

function accedi(r) {
  var u = perNome(r.nome);
  var pw = String(r.password || "");
  if (!u) return err("Nome utente o password sbagliati.");
  var blocco = u.riga[C.blocco_fino] ? new Date(u.riga[C.blocco_fino]).getTime() : 0;
  if (blocco && blocco > Date.now()) return err("Troppi tentativi: aspetta " + Math.ceil((blocco - Date.now()) / 60000) + " minuti.");
  if (hashPassword(pw, String(u.riga[C.sale])) !== String(u.riga[C.hash])) {
    var t = (parseInt(u.riga[C.tentativi], 10) || 0) + 1;
    scriviCella(u, "tentativi", t);
    if (t >= MAX_TENTATIVI) { scriviCella(u, "tentativi", 0); scriviCella(u, "blocco_fino", new Date(Date.now() + 15 * 60000).toISOString()); }
    return err("Nome utente o password sbagliati.");
  }
  scriviCella(u, "tentativi", 0);
  var tok = aggiungiToken(u);
  return ok({ token: tok, nome: u.riga[C.nome], email: !!u.riga[C.email], dati: leggiDati(u.riga) });
}

// Unisce i dati del dispositivo con quelli salvati: per ogni chiave vince il valore più recente (t = ms).
function salva(u, r) {
  var nuovi = (r.dati && typeof r.dati === "object") ? r.dati : {};
  var dati = leggiDati(u.riga);
  for (var k in nuovi) {
    if (!Object.prototype.hasOwnProperty.call(nuovi, k)) continue;
    var n = nuovi[k];
    if (!n || typeof n !== "object" || typeof n.t !== "number") continue;
    if (!dati[k] || typeof dati[k].t !== "number" || n.t > dati[k].t) dati[k] = { v: n.v == null ? null : String(n.v), t: n.t };
  }
  var s = JSON.stringify(dati);
  if (s.length > MAX_DATI) return err("Profilo troppo grande per essere salvato.", "troppo_grande");
  scriviCella(u, "dati_json", s);
  if (r.email !== undefined) {
    var email = emailValida(r.email);
    if (email === null) return err("L'email non sembra valida.");
    scriviCella(u, "email", email);
  }
  return ok({ dati: dati, email: !!u.riga[C.email] });
}

function esci(u, r) {
  var lista = leggiToken(u.riga).filter(function (x) { return x.t !== String(r.token); });
  scriviCella(u, "token_json", JSON.stringify(lista));
  return ok();
}

function cambiaPassword(u, r) {
  if (hashPassword(String(r.vecchia || ""), String(u.riga[C.sale])) !== String(u.riga[C.hash])) return err("La password attuale non è giusta.");
  var nuova = String(r.nuova || "");
  if (nuova.length < 4 || nuova.length > 100) return err("La nuova password deve avere almeno 4 caratteri.");
  scriviCella(u, "hash", hashPassword(nuova, String(u.riga[C.sale])));
  scriviCella(u, "token_json", JSON.stringify([{ t: String(r.token), d: new Date().toISOString() }]));
  return ok();
}

function recupera(r) {
  var u = perNome(r.nome);
  // Risposta uguale in ogni caso, per non rivelare quali nomi esistono.
  var msg = "Se l'account ha un'email, ti abbiamo mandato un codice (controlla anche lo spam).";
  if (!u || !u.riga[C.email]) return ok({ messaggio: msg });
  var scade = u.riga[C.codice_scade] ? new Date(u.riga[C.codice_scade]).getTime() : 0;
  if (scade && scade > Date.now() + 25 * 60000) return ok({ messaggio: msg }); // un codice ogni 5 minuti
  var codice = String(Math.floor(100000 + Math.random() * 900000));
  scriviCella(u, "codice_recupero", sha256hex(codice + u.riga[C.sale]));
  scriviCella(u, "codice_scade", new Date(Date.now() + 30 * 60000).toISOString());
  MailApp.sendEmail({
    to: String(u.riga[C.email]),
    subject: "Test QI: codice per cambiare la password",
    body: "Ciao " + u.riga[C.nome] + ",\n\nil tuo codice per impostare una nuova password è: " + codice +
      "\n\nVale 30 minuti. Se non l'hai chiesto tu, ignora questa email.\n"
  });
  return ok({ messaggio: msg });
}

function reimposta(r) {
  var u = perNome(r.nome);
  var codice = String(r.codice || "").trim();
  var nuova = String(r.nuova || "");
  if (!u || !codice || !u.riga[C.codice_recupero]) return err("Codice non valido o scaduto.");
  var scade = u.riga[C.codice_scade] ? new Date(u.riga[C.codice_scade]).getTime() : 0;
  if (!scade || scade < Date.now() || sha256hex(codice + u.riga[C.sale]) !== String(u.riga[C.codice_recupero])) {
    return err("Codice non valido o scaduto.");
  }
  if (nuova.length < 4 || nuova.length > 100) return err("La nuova password deve avere almeno 4 caratteri.");
  scriviCella(u, "hash", hashPassword(nuova, String(u.riga[C.sale])));
  scriviCella(u, "codice_recupero", ""); scriviCella(u, "codice_scade", "");
  scriviCella(u, "token_json", "[]"); scriviCella(u, "tentativi", 0); scriviCella(u, "blocco_fino", "");
  var tok = aggiungiToken(u);
  return ok({ token: tok, nome: u.riga[C.nome], email: true, dati: leggiDati(u.riga) });
}

function elimina(u, r) {
  if (hashPassword(String(r.password || ""), String(u.riga[C.sale])) !== String(u.riga[C.hash])) return err("Password sbagliata.");
  u.scheda.deleteRow(u.n);
  return ok();
}

// ============================ 3. segnalazioni di bug ============================
// POST {azione:"bug", messaggio, pagina, contesto, utente, dispositivo, schermo, titolo, errori_js, extra, ...}
//   -> {ok:true, id}. Chiunque può inviare (come la raccolta). Niente token salvato.
// POST {azione:"bug_lista", token}            -> {ok:true, bug:[...]} (solo amministratori)
// POST {azione:"bug_stato", token, id, stato, nota} -> {ok:true}     stato: "nuovo" | "in_corso" | "risolto"
var BUG_INTESTAZIONE = ["id", "ricevuto", "stato", "messaggio", "pagina", "contesto", "utente", "dispositivo",
  "schermo", "titolo", "errori_js", "extra_json", "nota", "lingua", "ua", "ora_dispositivo", "ref"];
var B = {}; BUG_INTESTAZIONE.forEach(function (n, i) { B[n] = i; });

function schedaBug() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var s = ss.getSheetByName(NOME_SCHEDA_BUG);
  if (!s) {
    s = ss.insertSheet(NOME_SCHEDA_BUG);
    s.appendRow(BUG_INTESTAZIONE);
    s.setFrozenRows(1);
  }
  return s;
}

function bug(r) {
  var az = String(r.azione);
  if (az === "bug") return bugNuovo(r);
  var u = perToken(r.token);
  if (!u || AMMINISTRATORI_BUG.indexOf(String(u.riga[C.nome_min])) < 0) return err("Solo gli amministratori possono vedere le segnalazioni.", "token");
  if (az === "bug_lista") return bugLista();
  if (az === "bug_stato") return bugStato(r);
  return err("Azione sconosciuta.");
}

function s300(v, n) { return String(v == null ? "" : v).slice(0, n || 300); }

function bugNuovo(r) {
  var msg = s300(r.messaggio, 2000).trim();
  if (msg.length < 3) return err("Scrivi almeno qualche parola.");
  var lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch (e) { return err("Server occupato, riprova tra un attimo."); }
  try {
    var s = schedaBug();
    var id = s300(r.id, 40) || ("b" + new Date().getTime().toString(36));
    // stessa segnalazione rispedita dalla coda del dispositivo: non duplicarla
    var n = s.getLastRow();
    if (n > 1) {
      var ids = s.getRange(2, 1, n - 1, 1).getValues();
      for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === id) return ok({ id: id, doppione: true });
    }
    var riga = [];
    for (var k = 0; k < BUG_INTESTAZIONE.length; k++) riga.push("");
    riga[B.id] = id; riga[B.ricevuto] = new Date().toISOString(); riga[B.stato] = "nuovo";
    riga[B.messaggio] = msg; riga[B.pagina] = s300(r.pagina); riga[B.contesto] = s300(r.contesto);
    riga[B.utente] = s300(r.utente, 40); riga[B.dispositivo] = s300(r.dispositivo, 120); riga[B.schermo] = s300(r.schermo, 40);
    riga[B.titolo] = s300(r.titolo, 120);
    riga[B.errori_js] = (r.errori_js && r.errori_js.length) ? s300(r.errori_js.join("\n"), 2000) : "";
    riga[B.extra_json] = r.extra ? s300(JSON.stringify(r.extra), 5000) : "";
    riga[B.lingua] = s300(r.lingua, 20); riga[B.ua] = s300(r.ua); riga[B.ora_dispositivo] = s300(r.ora, 40); riga[B.ref] = s300(r.ref, 200);
    s.appendRow(riga);
    return ok({ id: id });
  } finally {
    lock.releaseLock();
  }
}

function bugLista() {
  var s = schedaBug();
  var n = s.getLastRow();
  if (n < 2) return ok({ bug: [] });
  var da = Math.max(2, n - MAX_BUG_LISTA + 1);
  var righe = s.getRange(da, 1, n - da + 1, BUG_INTESTAZIONE.length).getValues();
  var out = [];
  for (var i = righe.length - 1; i >= 0; i--) {
    var o = {};
    for (var k = 0; k < BUG_INTESTAZIONE.length; k++) {
      if (k === B.ua) continue;
      var v = righe[i][k];
      o[BUG_INTESTAZIONE[k]] = (v instanceof Date) ? v.toISOString() : v;
    }
    out.push(o);
  }
  return ok({ bug: out });
}

function bugStato(r) {
  var stato = String(r.stato || "");
  if (["nuovo", "in_corso", "risolto"].indexOf(stato) < 0) return err("Stato non valido.");
  var s = schedaBug();
  var n = s.getLastRow();
  if (n < 2) return err("Segnalazione non trovata.");
  var ids = s.getRange(2, 1, n - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(r.id)) {
      s.getRange(i + 2, B.stato + 1).setValue(stato);
      if (r.nota !== undefined) s.getRange(i + 2, B.nota + 1).setValue(s300(r.nota, 1000));
      return ok();
    }
  }
  return err("Segnalazione non trovata.");
}
