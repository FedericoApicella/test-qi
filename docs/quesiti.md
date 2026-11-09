# Famiglie di quesiti (allenamento, storia, sfide)

I quesiti sono generati da `sfide/quesiti.js` (famiglie base: matrice, serie numerica, analogia, rotazione, memoria) e da `sfide/famiglie.js` (famiglie aggiunte il 9 novembre 2026). Ogni famiglia è registrata con `Quesiti.registra(area, {id, nome, d:[min,max], w, gen})`: `d` è la fascia di livello (0–1) in cui compare, `w` il peso nella scelta casuale, `gen(rng, level, used)` il generatore. Tutto è deterministico dal seme: nelle sfide i due giocatori generano gli stessi quesiti.

La difficoltà cresce col livello dentro ogni famiglia (più regole insieme, numeri più grandi, più pieghe, più nomi da ordinare, distrattori più vicini) e tra famiglie (quelle difficili compaiono solo ai livelli alti).

| Area | Famiglie |
|---|---|
| Figure (mat) | Matrice 3×3, Serie di figure, Analogia di figure (A : B = C : ?), Intruso tra figure |
| Numeri (num) | Serie numerica, Serie di lettere, Matrice di numeri, Equazioni con simboli, Operazione nascosta, Piramide di numeri |
| Parole e logica (verb) | Analogia, Parola intrusa, Sillogismo, Chi è il più…? (ordinamenti), Parole in codice, Se… allora (deduzione), Contrari e sinonimi |
| Spazio (rot) | Rotazione, Allo specchio, Conta i cubi, Il pezzo mancante, Foglio piegato, Orientamento |
| Memoria (mem) | cifre al contrario, cifre in ordine crescente, cifra mancante, simbolo in una posizione, somma delle cifre, cifre e lettere da riordinare |

Il test del QI (`test.html`, Misurati) non usa queste famiglie: i suoi item restano quelli tarati, per non alterare il punteggio.

Per aggiungere una famiglia: scrivere il generatore in `famiglie.js` restituendo `{q, sub?, stim (html), options, fig?, mono?, answer, rule}`; `itemHtml` e `spiegazione` lo mostrano da soli. Collaudo: generare qualche migliaio di quesiti per famiglia e controllare opzioni uniche, indice della risposta valido e spiegazione presente.
