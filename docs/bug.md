# Segnalazioni di bug ed errori

Ogni pagina del sito ha nel menu ⚙️ la voce **🐞 Segnala un errore**. Chi la tocca scrive cosa è successo e invia. Insieme al testo partono da soli: pagina, gioco/livello (se la pagina lo dichiara), nome utente se loggato, dispositivo e browser, misura dello schermo, lingua, app installata o browser, gli ultimi errori JavaScript visti nella pagina e l'ora.

Le segnalazioni finiscono nella scheda **bug** del foglio Google `testqi-dati` (lo stesso della raccolta dati e degli account), una riga ciascuna. Se il telefono è offline o il server non risponde, la segnalazione resta sul dispositivo e viene rispedita alla prossima apertura del sito.

## Dove si leggono

1. **Dal sito**: https://qi.stafftech.it/bug/ (voce «🛠 Segnalazioni ricevute» nel menu ⚙️, visibile solo a chi è loggato come amministratore, cioè l'utente `Fede`). Si possono mettere «In corso», «Risolto», aggiungere una nota e **copiare l'elenco** con un tasto per incollarlo a Claude.
2. **Dal foglio Google**: https://docs.google.com/spreadsheets/d/1sy031ZZ6Ud9xe3q3OU05WlgcgaPAic3HGC7ZZwIsNjc/edit → scheda `bug`.
3. **Da un thread Claude**: connettore Google Sheets, `get_values` con intervallo `bug!A:Q` (colonne: id, ricevuto, stato, messaggio, pagina, contesto, utente, dispositivo, schermo, titolo, errori_js, extra_json, nota, lingua, ua, ora_dispositivo, ref). Dopo la correzione, scrivere `risolto` nella colonna `stato` (C) della riga, oppure farlo dalla pagina /bug/.

Stati: `nuovo` → `in_corso` → `risolto`.

## Aggiornare l'Apps Script (serve una volta, dopo questa modifica)

Senza questo passo le segnalazioni restano in coda sui telefoni (il server risponde «Azione sconosciuta») e la pagina /bug/ dice che non riesce a leggere.

1. Apri il foglio Google `testqi-dati` → menu **Estensioni** → **Apps Script**.
2. Cancella tutto il codice che vedi e incolla il contenuto di `analisi/endpoint-apps-script.gs` (versione su main). Salva (icona del dischetto).
3. In alto a destra **Distribuisci** → **Gestisci distribuzioni** → matita ✏️ → **Versione**: «Nuova versione» → **Distribuisci**. L'URL resta lo stesso: il sito non va toccato.
4. Se Google chiede un'autorizzazione, accettala (è lo stesso progetto di prima).
5. Prova: apri il sito, menu ⚙️ → Segnala un errore → scrivi «prova» → Invia. Deve comparire «Segnalazione inviata» e nel foglio nasce la scheda `bug` con la riga.

Per aggiungere un altro amministratore basta mettere il suo nome utente (minuscolo) in `AMMINISTRATORI_BUG` nello script e, nel sito, in `AMMINISTRATORI` dentro `js/segnala.js` (quello del sito serve solo a mostrare la voce nel menu).

## Per le pagine (sviluppo)

`js/segnala.js` va incluso dopo `js/menu.js`. Per allegare il contesto:

- `window.SEGNALA_CONTESTO = "Sudoku · livello 12 · Difficile"` (stringa o funzione) nella pagina;
- oppure un elemento con `data-segnala-contesto="..."` (se manca, viene preso il testo del primo `.eyebrow`);
- `Segnala.apri({ contesto, extra })` apre la finestra già compilata (es. «errore in questa domanda» con il quesito in `extra`);
- `Segnala.bottoneHtml("Errore in questa domanda", contesto, extra)` restituisce un pulsantino pronto.
