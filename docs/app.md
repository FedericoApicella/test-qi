# L'app Mente Allenata (PWA)

Il sito https://qi.stafftech.it è anche un'app installabile ("Progressive Web App"): niente negozio, niente aggiornamenti da scaricare, stessa cosa su Android, iPhone e computer.

## Come si installa

**Android (Chrome, Edge, Samsung Internet)**
1. Apri https://qi.stafftech.it.
2. In home tocca **Installa l'app** nel riquadro viola (oppure menu ⋮ → *Installa app* / *Aggiungi a schermata Home*).
3. Conferma: l'icona compare tra le app del telefono.

**iPhone e iPad (solo Safari)**
1. Apri https://qi.stafftech.it in Safari.
2. Tocca **Condividi** (il quadrato con la freccia in su, in basso).
3. Scorri e tocca **Aggiungi alla schermata Home**, poi **Aggiungi**.

**Computer (Chrome o Edge)**: icona "installa" a destra nella barra dell'indirizzo, oppure menu → *Installa Mente Allenata*.

## Cosa fa

- Si apre a tutto schermo, senza la barra del browser, con l'icona del cervello col fulmine.
- Funziona anche senza connessione: le pagine e i file del sito sono salvati sul dispositivo (`sw.js`). L'invio dei risultati al foglio Google, l'accesso con nome utente e le sfide a due (PeerJS) hanno bisogno della rete e non vengono toccati dalla cache.
- Quando pubblichiamo una nuova versione, compare in basso l'avviso "C'è una nuova versione · Aggiorna". Non ricarica mai da sola, così non interrompe un test o una sfida in corso.
- Scorciatoie (pressione lunga sull'icona su Android): Fai il test, Allenati, Sfida un amico, Modalità storia.

## File

- `manifest.webmanifest`: nome, colori, icone, scorciatoie.
- `sw.js`: service worker. Per far scaricare a tutti la nuova versione, cambia la costante `VERSIONE` (basta cambiare la data). Senza cambiarla, le pagine HTML si aggiornano comunque alla prima apertura con rete (strategia "prima la rete"), i file statici (css/js) possono restare vecchi finché non cambia la versione.
- `js/pwa.js`: registra il service worker, mostra il banner "Installa l'app" in home e l'avviso di aggiornamento. Incluso in tutte le pagine.
- `app/`: icone. `icona.svg` è l'originale; i PNG (192, 512, maskable, apple-touch-icon 180, favicon) sono rasterizzati da quello. Per cambiare icona: modifica l'SVG e rigenera i PNG (ad esempio con Playwright o Inkscape), mantenendo il soggetto nel 80% centrale per la versione "maskable".
- `app/offline.html`: pagina mostrata se si apre offline una pagina mai visitata.
