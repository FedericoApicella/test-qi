# Test QI

Un test del QI in una sola pagina HTML, pensato per essere il più affidabile possibile: cinque domini cognitivi con 20 item ciascuno (100 in tutto, oppure una stima rapida da 40), item di difficoltà crescente, limiti di tempo per sezione e punteggio su scala QI (media 100, deviazione standard 15).

**Non è un test clinico.** Il punteggio è indicativo e non sostituisce una valutazione psicometrica svolta da un professionista.

## Come si usa

Il test è pubblicato con GitHub Pages: apri la pagina del repository e fai il test dal browser, senza installare nulla. Le sfide a due sono alla pagina `sfide/` dello stesso sito, la modalità storia a livelli alla pagina `storia/`.

In locale basta aprire `index.html` con un browser.

## Struttura

- `index.html`: la home del sito (test, sfide, allenamento, profilo per area).
- `test.html`: l'intero test (domande, timer, calcolo del punteggio).
- `stile.css`: tema grafico comune a tutte le pagine (un solo colore di marca, nessun tema scuro di sistema).
- `sfide/allenamento.html`: allenamento per area con difficoltà adattiva, spiegazioni, livelli, medaglie e Sprint 60 secondi; progressi salvati nel browser.
- `sfide/`: le sfide di logica a due (pagina `sfide/index.html`): un giocatore crea una stanza e manda il codice, l'altro entra, si risponde agli stessi quesiti a tempo e vince chi fa più punti. I quesiti sono generati da `sfide/quesiti.js` (matrici, serie, analogie, rotazioni, derivati dal test); il collegamento tra i due browser è diretto (WebRTC tramite PeerJS, libreria inclusa con licenza MIT).
- `storia/`: la modalità storia (pagina `storia/index.html`): livelli infiniti divisi in mondi da dieci, con tre cuori, stelle e un boss ogni dieci livelli. I primi mondi sono mini-giochi facili (`storia/minigiochi.js`: intruso, conta le forme, memoria lampo, colore della parola, calcolo lampo, il più grande); salendo compaiono i quesiti del test generati da `sfide/quesiti.js` e i tempi si stringono. Progressi nel browser (chiave `testqi.storia`).
- `js/raccolta.js`: raccolta anonima e facoltativa dei risultati, per misurare l'affidabilità.
- `js/account.js`: mini accesso facoltativo con nome utente e password (email solo per recuperare la password): per chi ha l'account, risultati, progressi e badge (le chiavi `testqi.*` di localStorage) si ritrovano su tutti i dispositivi. Usa lo stesso Apps Script della raccolta, in una scheda separata del foglio.
- `analisi/`: script di analisi (alfa, test-retest, statistiche per item) ed endpoint di esempio.
- `data/mars-ib/`: parametri pubblici di difficoltà delle matrici MaRs-IB (licenza MIT).
- `docs/calibrazione.md`: soglie di affidabilità, fonti aperte verificate e piano di taratura.

## Come proporre modifiche

Ogni modifica arriva come pull request su `main`, così può essere rivista prima di andare online.
