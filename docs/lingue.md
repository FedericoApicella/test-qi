# Lingue del sito

L'italiano è la lingua del codice e delle pagine. Le altre lingue sono **dizionari**: `lang/en.js` contiene coppie `"testo italiano": "testo inglese"`; allo stesso modo `lang/es.js` (spagnolo), `lang/fr.js` (francese), `lang/de.js` (tedesco) e `lang/pt.js` (portoghese), tutti con le stesse 1123 chiavi. `js/lingua.js` (incluso in ogni pagina prima di `js/menu.js`) applica il dizionario a tutta la pagina: ai testi, agli attributi (`title`, `aria-label`, `placeholder`, `alt`), al titolo della scheda e alla descrizione. Un osservatore traduce anche ciò che i giochi disegnano dopo, quindi non serve toccare il codice dei giochi.

## Come si sceglie la lingua

- `?lang=en` nell'indirizzo, oppure il selettore **🌍 Lingua** nel menu ⚙️ (salvato in `testqi.lingua`).
- Senza scelta: lingua del browser. Italiano, inglese, spagnolo, francese, tedesco e portoghese usano il loro dizionario; tutte le altre lingue → inglese.

## Come si aggiunge una frase

1. Apri `lang/en.js` e aggiungi una riga `"frase italiana": "frase inglese",`; poi la stessa chiave in `es.js`, `fr.js`, `de.js`, `pt.js` (se manca, in quella lingua la frase resta in italiano).
2. La chiave è il testo **esattamente come appare sullo schermo** (un nodo di testo alla volta: se una frase ha una parte in grassetto, sono due chiavi).
3. I numeri si scrivono `{}` e tornano al loro posto nello stesso ordine (`{1}`, `{2}`… per cambiare ordine). Una parola che cambia si scrive `{*}`; se quella parola è a sua volta nel dizionario (per esempio il nome di un'area o di un mese) viene tradotta anche lei.

Per trovare le frasi mancanti: apri la pagina con `?lang=en` e guarda cosa è rimasto in italiano.

## Come si aggiunge una lingua

1. Copia `lang/en.js` in `lang/xx.js` (codice a due lettere), cambia `window.LINGUE.en` in `window.LINGUE.xx` e traduci i valori.
2. In `js/lingua.js` aggiungi il codice a `DISPONIBILI` e il nome a `NOMI`.
3. In `sw.js` aggiungi `/lang/xx.js` alla lista da precaricare e cambia `VERSIONE`.
4. Controllo: `node -e` che confronti `Object.keys` di `en` e `xx` (devono coincidere).

## Cosa resta in italiano (da rifare per lingua, non da tradurre)

- Le parole crociate (`parole/`): il dizionario delle parole è italiano. Per un'altra lingua serve un dizionario di parole e definizioni in quella lingua.
- I quesiti verbali del test del QI e dei mini-test (analogie): vanno riscritti e ritarati per lingua. Matrici, serie, memoria e rotazioni sono già senza parole.
- Tutte le pagine (test, misura, sfide, allenamento, abilità, segnalazioni) sono coperte dal dizionario; se compare una frase nuova in italiano, va aggiunta a `lang/en.js`.
