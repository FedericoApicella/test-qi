/*
 * Endpoint gratuito per js/raccolta.js: un foglio Google + Apps Script.
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
 * Ogni sessione diventa una riga: colonna A il JSON completo, le altre i campi
 * principali. Per l'analisi: File → Scarica → CSV, poi
 *   python3 analisi/affidabilita.py dati.jsonl
 * dopo aver estratto la colonna A in un file con un record per riga.
 */
function doPost(e) {
  var foglio = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  var testo = e.postData && e.postData.contents;
  var r;
  try { r = JSON.parse(testo); } catch (err) {
    return ContentService.createTextOutput("json non valido").setMimeType(ContentService.MimeType.TEXT);
  }
  if (!r || r.schema !== 1 || !r.consenso || !r.item || !r.item.length) {
    return ContentService.createTextOutput("scartato").setMimeType(ContentService.MimeType.TEXT);
  }
  if (testo.length > 200000) {
    return ContentService.createTextOutput("troppo grande").setMimeType(ContentService.MimeType.TEXT);
  }
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
  return ContentService.createTextOutput("ok").setMimeType(ContentService.MimeType.TEXT);
}

function doGet() {
  return ContentService.createTextOutput("testqi endpoint attivo").setMimeType(ContentService.MimeType.TEXT);
}
