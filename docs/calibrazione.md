# Taratura reale del test QI

Questo documento fissa le soglie di affidabilità da raggiungere, dice cosa si può
riutilizzare dai dati pubblici (verificato il 7 novembre 2026) e descrive come
raccogliere i dati nostri. Le cifre sulle norme commerciali vengono dai manuali
tecnici; le stime sul nostro test vengono dai parametri pubblicati in `data/mars-ib/`.

## 1. Soglie di affidabilità

| Misura | Soglia | Cosa significa in punti QI |
|---|---|---|
| Coerenza interna del totale (alfa o omega) | ≥ 0,90 | errore standard di misura (SEM) ≤ 4,7; intervallo al 95% ≈ ±9 |
| Test-retest del totale a 2-4 settimane | ≥ 0,85 | stesso ordine di grandezza di stabilità dei test clinici brevi |
| Coerenza interna di ogni dominio | ≥ 0,75 | SEM ≤ 7,5 per i punteggi di dominio |
| Correlazione item-totale corretta (r_it) | ≥ 0,30 | sotto, l'item non misura la stessa cosa degli altri |
| Quota di risposte corrette per item (p) | tra 0,10 e 0,95 | fuori da questo intervallo l'item non discrimina |

Per confronto: il WAIS-IV ha coerenza interna del QI totale 0,98 e test-retest 0,96
(SEM circa 2 punti), gli indici 0,90-0,96. Sotto 0,80 un punteggio va presentato come
indicativo; sotto 0,70 non va presentato come QI.

SEM = 15 × √(1 − affidabilità). Con 0,90 → 4,7; con 0,85 → 5,8; con 0,80 → 6,7; con 0,70 → 8,2.

## 2. Cosa si può prendere online e cosa no

Le norme dei test commerciali (WAIS, Raven, Cattell) sono proprietarie e valgono solo
per i loro item: non si trasferiscono a item diversi. Un item nuovo ha una difficoltà
sua, che si conosce solo misurandola. Le fonti aperte verificate:

| Fonte | Cosa contiene | Licenza verificata | Uso nel nostro test |
|---|---|---|---|
| ICAR (International Cognitive Ability Resource) | 60 item: serie di lettere/numeri, matrici, ragionamento verbale, rotazione 3D; dati SAPA su ~97.000 persone | Dal 2024 "Scientific Use License" su PsychArchives: solo ricerca accademica, vietato pubblicare gli item su una pagina web, vietato l'uso commerciale | **Escluso.** Né gli item né i parametri sono usabili in un test pubblico |
| MaRs-IB (Matrix Reasoning Item Bank) | 80 matrici in 384 varianti, parametri 3PL stimati su un campione di calibrazione; tre forme brevi | Codice e parametri: MIT (github.com/ndawlab/mars-irt). Immagini: "solo scopi accademici e non commerciali" (Gorilla Open Materials, Blakemore Lab) | **Parametri e struttura sì, immagini no.** Generiamo matrici nostre con le stesse regole; i parametri danno la difficoltà attesa per struttura e i prior per l'IRT |
| Figure 3D di Ganis & Kievit (2015, *J. Open Psychology Data*) | 384 stimoli di rotazione mentale (coppie uguali/speculari a 0-150°), dati di 54 persone (accuratezza, tempi) | Figshare, riuso libero con citazione | **Sì** per il dominio spaziale |
| IMak (R, CRAN) | Generatore automatico di analogie figurali con regole note (Blum & Holling) | GPL-3 | **Sì** per le analogie, con taratura nostra |
| Open Psychometrics, `IQ1.zip` | 25 matrici "sperimentali", 400 risposte, senza immagini, "qualità mediocre" per ammissione loro | Non dichiarata | No |
| Item Response Warehouse | Migliaia di dataset di risposte a item, licenza per dataset, serve account Redivis | Varia | Utile solo come confronto metodologico |

Serie numeriche e memoria (span di cifre, Corsi) non hanno item proprietari: si generano
da regole e si tarano con i dati nostri. Per lo span esistono norme pubblicate in
letteratura da usare come confronto di plausibilità, non come norma del nostro test.

## 3. Affidabilità attesa dai parametri pubblicati

Usando i parametri 3PL di MaRs-IB (`data/mars-ib/parametri_3pl.csv`, discriminazione
media 1,30, difficoltà media 0,22 con DS 1,5) e una popolazione normale, l'affidabilità
marginale di un dominio di matrici è:

| Item per dominio | Affidabilità attesa |
|---|---|
| 12 (forme brevi pubblicate) | 0,69 |
| 16 | 0,70 |
| 20 | 0,73 |
| 24 | 0,78 |
| 30 | 0,81 |

Gli altri domini, con item generati da regole e di qualità simile, dovrebbero stare
nello stesso intervallo. Con cinque domini da 20-24 item (100-120 item, 45-55 minuti)
e correlazioni fra domini intorno a 0,45, l'affidabilità composita del totale supera
0,90. Con 8 item per dominio (40 item) il totale resta intorno a 0,80-0,85: va bene per
un'anteprima, non per un punteggio da mostrare come QI.

Queste sono previsioni. Diventano affidabilità "certa" solo con i dati del punto 5.

## 4. Struttura degli item per dominio

- **Matrici (mat_)**: 3×3, 1-4 elementi, 1-6 regole fra colore, forma, dimensione,
  posizione; distrattori di tipo MD (cambia una regola) e PD (cambia una proprietà).
  `data/mars-ib/struttura_item.csv` dice quali combinazioni esistono e
  `parametri_3pl.csv` quanto sono difficili: più elementi e più regole → più difficile.
- **Serie numeriche (ser_)**: regole aritmetiche a uno, due e tre livelli (differenze
  costanti, differenze crescenti, alternanza, ricorrenza). Difficoltà prevista dal
  numero di livelli e dall'ampiezza dei numeri.
- **Analogie (ana_)**: figurali, come IMak: A : B = C : ?, con 1-5 regole (rotazione,
  riflessione, aggiunta/sottrazione di elementi, cambio di dimensione).
- **Memoria (mem_)**: span di cifre diretto e inverso, span spaziale (Corsi), da 3 a 9
  elementi, due prove per lunghezza.
- **Spaziale (spa_)**: coppie di figure 3D di Ganis & Kievit, uguali o speculari, a
  50°, 100°, 150°; difficoltà cresce con l'angolo.

Ogni item ha un id stabile `<dominio>_<numero>` (es. `mat_07`): lo script di analisi
raggruppa per prefisso. Un item cambiato prende un id nuovo, mai lo stesso.

## 5. Raccolta anonima dei risultati

Il modulo `js/raccolta.js` salva per ogni sessione un record JSON (schema 1):

```json
{
  "schema": 1, "test_version": "1.0",
  "pid": "uuid casuale salvato nel browser",
  "sessione": 2, "giorni_dalla_precedente": 21.3,
  "iniziato": "...", "concluso": "...",
  "consenso": true,
  "item": [{"id": "mat_07", "dominio": "matrici", "corretto": 1, "risposta": "C", "rt_ms": 12345, "scaduto": 0}],
  "punteggio_grezzo": 71, "qi_stimato": 108,
  "demo": {"eta_fascia": "25-34", "studio": "laurea", "lingua": "it"}
}
```

Non contiene nome, email, IP né altro identificativo. Il `pid` serve solo a riconoscere
una seconda sessione dello stesso browser per il test-retest. Il consenso è chiesto
una volta sola; chi rifiuta fa il test lo stesso.

Dove finiscono i dati: il modulo fa una POST JSON all'indirizzo in
`window.RACCOLTA_ENDPOINT`. L'opzione più semplice e gratuita è un foglio Google con
uno script Apps Script pubblicato come web app (`analisi/endpoint-apps-script.gs`,
istruzioni nel file). Alternative: Supabase o un Cloudflare Worker. Senza endpoint
resta il pulsante "scarica i miei dati" che produce il file JSON.

Nel test vanno aggiunte, alla fine e facoltative, tre domande: fascia d'età, titolo di
studio, lingua madre. Servono per le norme e per controllare che gli item non
funzionino diversamente per gruppi diversi (DIF).

## 6. Quante persone servono

| Obiettivo | Persone | Perché |
|---|---|---|
| Alfa del totale con intervallo ±0,02 | 200 sessioni complete | errore standard dell'alfa ≈ 0,01 con 100 item |
| Test-retest con limite inferiore ≥ 0,80 | 150 con seconda sessione a 2-4 settimane | errore standard di r ≈ 0,023 a r = 0,85 |
| Parametri IRT (2PL/3PL) stabili per item | 500 | sotto, difficoltà e discriminazione oscillano |
| Norme QI con percentili decenti fino a ±2 DS | 1000 con età e titolo di studio | ±2 DS è il 2,3% del campione: 23 persone per coda |

Chi fa il test online non è un campione rappresentativo della popolazione: le norme
che ne escono sono "norme di chi fa test online", più istruite e più giovani della
media. Vanno dichiarate come tali nella pagina dei risultati finché non c'è un
campione stratificato.

## 7. Analisi

```
python3 analisi/affidabilita.py dati.jsonl
```

Stampa p e r_it per item, alfa con intervallo e SEM per dominio e totale, test-retest
con effetto pratica, e la lista degli item da rivedere. Solo libreria standard.

## 8. Ordine dei lavori

1. Portare il test a 20-24 item per dominio con id stabili (thread "Rendere più affidabile il test del QI").
2. Collegare `js/raccolta.js` e pubblicare l'endpoint.
3. A 200 sessioni: prima analisi, sostituzione degli item con r_it < 0,30 o p fuori intervallo.
4. A 150 retest: pubblicare l'affidabilità misurata nella pagina dei risultati, con SEM e intervallo.
5. A 500 sessioni: stima IRT, punteggio su scala theta, norme provvisorie per fascia d'età.
6. Ogni modifica agli item riparte dal punto 3 per gli item nuovi.

## Riferimenti

- Condon, D. M., & Revelle, W. (2014). The International Cognitive Ability Resource. *Intelligence, 43*, 52-64.
- Chierchia, G., et al. (2019). The matrix reasoning item bank (MaRs-IB). *Royal Society Open Science, 6*, 190232.
- Zorowitz, S., Chierchia, G., Blakemore, S.-J., & Daw, N. D. (2023). An item response theory analysis of the MaRs-IB. *Behavior Research Methods*. doi:10.3758/s13428-023-02067-8
- Ganis, G., & Kievit, R. A. (2015). A new set of three-dimensional shapes for investigating mental rotation processes. *Journal of Open Psychology Data, 3*(1), e3.
- Blum, D., & Holling, H. (2018). Automatic generation of figural analogies with the IMak package. *Frontiers in Psychology, 9*, 1286.
- Nunnally, J. C., & Bernstein, I. H. (1994). *Psychometric theory* (soglie 0,70 / 0,80 / 0,90).
