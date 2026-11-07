# Test QI

Un test del QI in una sola pagina HTML, pensato per essere il più affidabile possibile: cinque domini cognitivi con 20 item ciascuno (100 in tutto), item di difficoltà crescente, limiti di tempo per sezione e punteggio su scala QI (media 100, deviazione standard 15).

**Non è un test clinico.** Il punteggio è indicativo e non sostituisce una valutazione psicometrica svolta da un professionista.

## Come si usa

Il test è pubblicato con GitHub Pages: apri la pagina del repository e fai il test dal browser, senza installare nulla. Le sfide a due sono alla pagina `sfide/` dello stesso sito.

In locale basta aprire `index.html` con un browser.

## Struttura

- `index.html`: l'intero test (domande, timer, calcolo del punteggio).
- `sfide/`: le sfide di logica a due (pagina `sfide/index.html`): un giocatore crea una stanza e manda il codice, l'altro entra, si risponde agli stessi quesiti a tempo e vince chi fa più punti. I quesiti sono generati da `sfide/quesiti.js` (matrici, serie, analogie, rotazioni, derivati dal test); il collegamento tra i due browser è diretto (WebRTC tramite PeerJS, libreria inclusa con licenza MIT).
- `js/raccolta.js`: raccolta anonima e facoltativa dei risultati, per misurare l'affidabilità.
- `analisi/`: script di analisi (alfa, test-retest, statistiche per item) ed endpoint di esempio.
- `data/mars-ib/`: parametri pubblici di difficoltà delle matrici MaRs-IB (licenza MIT).
- `docs/calibrazione.md`: soglie di affidabilità, fonti aperte verificate e piano di taratura.

## Come proporre modifiche

Ogni modifica arriva come pull request su `main`, così può essere rivista prima di andare online.
