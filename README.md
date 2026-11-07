# Test QI

Un test del QI in una sola pagina HTML, pensato per essere il più affidabile possibile: cinque domini cognitivi con 20 item ciascuno (100 in tutto, oppure una stima rapida da 40), item di difficoltà crescente, limiti di tempo per sezione e punteggio su scala QI (media 100, deviazione standard 15).

**Non è un test clinico.** Il punteggio è indicativo e non sostituisce una valutazione psicometrica svolta da un professionista.

## Come si usa

Il test è pubblicato con GitHub Pages: apri la pagina del repository e fai il test dal browser, senza installare nulla.

In locale basta aprire `index.html` con un browser.

## Struttura

- `index.html`: l'intero test (domande, timer, calcolo del punteggio).
- `js/raccolta.js`: raccolta anonima e facoltativa dei risultati, per misurare l'affidabilità.
- `analisi/`: script di analisi (alfa, test-retest, statistiche per item) ed endpoint di esempio.
- `data/mars-ib/`: parametri pubblici di difficoltà delle matrici MaRs-IB (licenza MIT).
- `docs/calibrazione.md`: soglie di affidabilità, fonti aperte verificate e piano di taratura.

## Come proporre modifiche

Ogni modifica arriva come pull request su `main`, così può essere rivista prima di andare online.
