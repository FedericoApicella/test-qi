# Lingue del sito

L'italiano è la lingua del codice e delle pagine. Le altre lingue sono **dizionari**: `lang/en.js` contiene coppie `"testo italiano": "testo inglese"`. `js/lingua.js` (incluso in ogni pagina prima di `js/menu.js`) applica il dizionario a tutta la pagina: ai testi, agli attributi (`title`, `aria-label`, `placeholder`, `alt`), al titolo della scheda e alla descrizione. Un osservatore traduce anche ciò che i giochi disegnano dopo, quindi non serve toccare il codice dei giochi.

## Come si sceglie la lingua

- `?lang=en` nell'indirizzo, oppure il selettore **🌍 Lingua** nel menu ⚙️ (salvato in `testqi.lingua`).
- Senza scelta: lingua del browser. Italiano → italiano, tutto il resto → inglese.

## Come si aggiunge una frase

1. Apri `lang/en.js` e aggiungi una riga `"frase italiana": "frase inglese",`.
2. La chiave è il testo **esattamente come appare sullo schermo** (un nodo di testo alla volta: se una frase ha una parte in grassetto, sono due chiavi).
3. I numeri si scrivono `{}` e tornano al loro posto nello stesso ordine (`{1}`, `{2}`… per cambiare ordine). Una parola che cambia si scrive `{*}`.

Per trovare le frasi mancanti: apri la pagina con `?lang=en` e guarda cosa è rimasto in italiano.

## Come si aggiunge una lingua

1. Copia `lang/en.js` in `lang/es.js` (o `fr`, `de`, `pt`), cambia `window.LINGUE.en` in `window.LINGUE.es` e traduci i valori.
2. In `js/lingua.js` aggiungi il codice a `DISPONIBILI` e il nome a `NOMI`.
3. In `sw.js` aggiungi `/lang/es.js` alla lista da precaricare.

## Cosa resta in italiano (da rifare per lingua, non da tradurre)

- Le parole crociate (`parole/`): il dizionario delle parole è italiano. Per un'altra lingua serve un dizionario di parole e definizioni in quella lingua.
- I quesiti verbali del test del QI e dei mini-test (analogie): vanno riscritti e ritarati per lingua. Matrici, serie, memoria e rotazioni sono già senza parole.
- Il resto del sito (test, misura, sfide, allenamento, abilità) usa lo stesso meccanismo: basta aggiungere le frasi al dizionario (seconda parte del lavoro).
