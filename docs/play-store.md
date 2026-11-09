# Pubblicare Mente Allenata sul Google Play Store

L'app del Play Store è il sito https://qi.stafftech.it "impacchettato" (Trusted Web Activity): stessa grafica, stessi progressi, un solo codice. Ogni modifica al sito arriva da sola anche nell'app, senza ricaricare nulla sul Play Store.

Quello che è già pronto nel repo:

- `privacy/` — informativa sulla privacy (obbligatoria: va messa nella scheda del Play Store), online su https://qi.stafftech.it/privacy/.
- `.well-known/assetlinks.json` — il file che dice ad Android "questa app e questo sito sono della stessa persona". Contiene un segnaposto da sostituire con l'impronta SHA-256 che dà la Play Console (passo 5). Finché è sbagliato, l'app mostra la barra dell'indirizzo in alto.
- `manifest.webmanifest` — nome, colori, icone, schermate (`app/screenshot-*.png`) e scorciatoie.
- `app/play-feature-1024x500.png` — l'immagine grande della scheda (feature graphic). Gli screenshot a 1080×1920 sono in `app/screenshot-*.png`.
- `?da=play` — l'app si apre con questo parametro; il sito se lo ricorda (`testqi.canale`) e solo in quel caso accende, quando le faremo, pubblicità, cuori e acquisti. Il sito web resta pulito.

## Passi per Federico (uno alla volta)

### 1. Account sviluppatore Google Play (25 $ una tantum)
1. Vai su https://play.google.com/console/signup con il tuo account Google.
2. Scegli **Te stesso** (account personale), compila nome e indirizzo, paga 25 $.
3. Google ti chiede di verificare l'identità (documento + telefono): si fa dal telefono, ci vogliono pochi giorni.

### 2. Creare il pacchetto dell'app (gratis, online, 5 minuti)
1. Vai su https://www.pwabuilder.com e incolla `https://qi.stafftech.it`, poi **Start**.
2. Tocca **Package for stores** → **Android** → **Generate package**.
3. Nella finestra, imposta:
   - **Package ID**: `it.stafftech.qi`
   - **App name**: `Mente Allenata`
   - **Launcher name**: `Mente Allenata`
   - **Start URL**: `/?da=play`
   - **Signing key**: lascia **Create new** (PWABuilder crea la chiave per te).
4. Scarica lo zip. Dentro ci sono: `app-release-bundle.aab` (il file da caricare), `signing.keystore` + `signing-key-info.txt` (**conservali**: servono per ogni aggiornamento futuro) e `assetlinks.json`.
5. Mandami qui in chat il contenuto di `assetlinks.json` (o il valore `sha256_cert_fingerprints`): lo metto nel sito.

### 3. Creare l'app nella Play Console
1. In https://play.google.com/console tocca **Crea app**: nome `Mente Allenata`, lingua predefinita italiano, **App**, **Gratis**.
2. Nel pannello **Dashboard** segui la lista "Configura la tua app". Risposte da dare:
   - Informativa sulla privacy: `https://qi.stafftech.it/privacy/`
   - Accesso all'app: tutte le funzioni disponibili senza accesso speciale.
   - Annunci: per ora **No, non contiene annunci** (cambieremo a Sì quando li aggiungeremo).
   - Classificazione dei contenuti: compila il questionario come **Gioco** / Puzzle, senza violenza, senza acquisti (per ora).
   - Pubblico di destinazione: **13 anni e oltre** (le app web non possono rivolgersi ai bambini).
   - App di notizie: No. App COVID: No. Sicurezza dei dati: vedi la tabella sotto.
   - Categoria: **Gioco → Puzzle**; email di contatto: la tua.
3. **Scheda dello store principale**: testi, icona 512×512 (`app/icona-512.png`), feature graphic (`app/play-feature-1024x500.png`), almeno 4 screenshot (`app/screenshot-*.png`). I testi sono nel paragrafo "Testi della scheda".

### 4. Caricare l'app e fare il test chiuso
Gli account personali nuovi devono prima fare un **test chiuso con almeno 12 persone per 14 giorni** prima di poter pubblicare.
1. **Test → Test chiuso → Crea versione**: carica `app-release-bundle.aab`, nome versione `1.0`.
2. Nella scheda **Tester** crea una lista di email (amici, parenti): almeno 12 account Google. Salva e copia il **link di adesione** da mandare ai tester.
3. Ognuno apre il link, tocca "Diventa tester" e installa l'app dal Play Store. Devono restare iscritti 14 giorni (basta che non si cancellino).
4. Dopo i 14 giorni, nella Dashboard compare **Richiedi l'accesso alla produzione**: rispondi alle domande (chi ha testato, cosa hanno detto) e invia.

### 5. L'impronta SHA-256 (per togliere la barra dell'indirizzo)
1. Nella Play Console: **Configurazione → Integrità dell'app → Firma dell'app** (App signing).
2. Copia l'**impronta del certificato SHA-256** della sezione "Certificato della chiave di firma dell'app" (non quella di caricamento).
3. Mandamela: la metto in `.well-known/assetlinks.json` al posto del segnaposto. Da quel momento l'app si apre a tutto schermo.

### 6. Pubblicare
Quando Google approva l'accesso alla produzione: **Produzione → Crea versione** → stesso `.aab` → **Avvia l'implementazione in produzione**. La revisione di Google richiede da poche ore a qualche giorno.

## Testi della scheda (italiano)

- **Nome (30 caratteri)**: `Mente Allenata: QI e puzzle`
- **Descrizione breve (80 caratteri)**: `Test del QI attendibile, sfide a due e puzzle a livelli infiniti.`
- **Descrizione lunga**:

```
Quanto è allenata la tua mente? Mente Allenata unisce un test del QI serio a giochi di logica che non finiscono mai.

MISURA
• Test completo in 5 aree (matrici, serie, analogie, memoria, rotazioni) con punteggio QI e intervallo di confidenza
• Stima rapida da 20 minuti e mini-test per area
• Profilo delle tue abilità che cresce nel tempo

GIOCA
• Sudoku, Mahjong in 3D e Regine a livelli infiniti, con la difficoltà che scegli tu
• Parola nascosta, cruciverba e crittografati in italiano, con la sfida del giorno
• Modalità storia: mondi da sbloccare, boss e stelle

SFIDA
• Sfida un amico in tempo reale: stessi quesiti, stesso tempo
• Partite classificate con leghe e stagioni

ALLENATI
• Percorsi adattivi per area, n-back, rotazione mentale, Sprint 60 secondi
• Serie di giorni, livelli e medaglie

Gratis, senza registrazione, funziona anche offline. Il punteggio del test è una stima a scopo indicativo, non una valutazione clinica.
```

## Sicurezza dei dati (questionario della Play Console)

| Domanda | Risposta |
| --- | --- |
| L'app raccoglie o condivide dati utente? | Sì, raccoglie |
| Dati criptati in transito? | Sì (HTTPS) |
| L'utente può chiederne la cancellazione? | Sì (email in privacy) |
| Tipi di dati | Informazioni personali: nome utente, email (facoltativa, solo con account). Attività nell'app: risposte ai test e progressi di gioco (anonimi). |
| Scopo | Funzionalità dell'app, analisi (taratura del test) |
| Condivisi con terzi? | No |

## Aggiornare l'app in futuro

Il contenuto si aggiorna da solo (è il sito). Serve un nuovo `.aab` solo se cambiano nome, icona, colori o versione minima di Android: si rigenera su PWABuilder caricando la **stessa** chiave (`signing.keystore`), si alza il numero di versione e si carica in Produzione.
