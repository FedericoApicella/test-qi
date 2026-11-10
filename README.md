# Test QI

Un test del QI in una sola pagina HTML, pensato per essere il più affidabile possibile: cinque domini cognitivi con 20 item ciascuno (100 in tutto, oppure una stima rapida da 40), item di difficoltà crescente, limiti di tempo per sezione e punteggio su scala QI (media 100, deviazione standard 15).

**Non è un test clinico.** Il punteggio è indicativo e non sostituisce una valutazione psicometrica svolta da un professionista.

## Come si usa

Il sito è pubblicato su **https://qi.stafftech.it** (Cloudflare Pages, vedi `docs/dominio.md`): si usa dal browser, senza installare nulla. Le sfide a due sono alla pagina `sfide/` dello stesso sito, la modalità storia a livelli alla pagina `storia/`.

In locale basta aprire `index.html` con un browser.

## Struttura

- `index.html`: la home del sito (test, sfide, allenamento, profilo per area).
- `test.html`: l'intero test (domande, timer, calcolo del punteggio).
- `stile.css`: tema grafico comune a tutte le pagine (un solo colore di marca, nessun tema scuro di sistema).
- `sfide/allenamento.html`: allenamento per area con difficoltà adattiva, spiegazioni, livelli, medaglie e Sprint 60 secondi; progressi salvati nel browser.
- `js/difficolta.js`: difficoltà fissa 1–10 condivisa (stessa curva di `giochi/comune.js`: livello 1 = d, livello 1000 ≈ d+0,99), scelta salvata per gioco in `testqi.difficolta` con i livelli separati per difficoltà; selettore pronto con `Difficolta.selettoreHtml(id)`.
- `sfide/`: le sfide di logica a due (pagina `sfide/index.html`): un giocatore crea una stanza e manda il codice, l'altro entra, si risponde agli stessi quesiti a tempo e vince chi fa più punti. I quesiti sono generati da `sfide/quesiti.js` (matrici, serie, analogie, rotazioni, derivati dal test); il collegamento tra i due browser passa da un «ponte» (server MQTT pubblici gratuiti via WebSocket sicuro, client minimo in `sfide/rete.js`, funziona da qualunque rete) e, solo se nessun ponte risponde, dal collegamento diretto WebRTC tramite PeerJS (libreria inclusa con licenza MIT). La pagina ha un riquadro «Diagnostica del collegamento» da copiare in caso di problemi; `?via=ponte` o `?via=diretto` forzano una strada.
- `storia/`: la modalità storia (pagina `storia/index.html`): livelli infiniti divisi in mondi da dieci, con tre cuori, stelle e un boss ogni dieci livelli. I primi mondi sono mini-giochi facili (`storia/minigiochi.js`: intruso, conta le forme, memoria lampo, colore della parola, calcolo lampo, il più grande); salendo compaiono i quesiti del test generati da `sfide/quesiti.js` e i tempi si stringono. Progressi nel browser (chiave `testqi.storia`).
- `js/raccolta.js`: raccolta anonima e facoltativa dei risultati, per misurare l'affidabilità.
- `js/account.js`: mini accesso facoltativo con nome utente e password (email solo per recuperare la password): per chi ha l'account, risultati, progressi e badge (le chiavi `testqi.*` di localStorage) si ritrovano su tutti i dispositivi. Usa lo stesso Apps Script della raccolta, in una scheda separata del foglio.
- `analisi/`: script di analisi (alfa, test-retest, statistiche per item) ed endpoint di esempio.
- `data/mars-ib/`: parametri pubblici di difficoltà delle matrici MaRs-IB (licenza MIT).
- `docs/calibrazione.md`: soglie di affidabilità, fonti aperte verificate e piano di taratura.
- `docs/app.md`: app installabile (PWA): come si installa su telefono, icone, service worker e cache offline.
- `docs/bug.md`: segnalazioni di bug («🐞 Segnala un errore» nel menu ⚙️): dove si leggono e come aggiornare l'Apps Script.

## Licenza

© 2026 Federico Apicella, tutti i diritti riservati. Il codice e i contenuti sono proprietari: non è concessa alcuna licenza d'uso, copia o modifica (vedi `LICENSE`). Restano con le loro licenze i componenti di terze parti indicati sopra.

## Come proporre modifiche

Ogni modifica arriva come pull request su `main`, così può essere rivista prima di andare online.
