# Parametri MaRs-IB

File copiati da <https://github.com/ndawlab/mars-irt> (cartella `tutorials`, licenza MIT, vedi `LICENSE`).
Sono i parametri stimati in Zorowitz, Chierchia, Blakemore & Daw (2023), *Behavior Research Methods*,
"An item response theory analysis of the Matrix Reasoning Item Bank (MaRs-IB)", doi:10.3758/s13428-023-02067-8.

| File | Contenuto |
|---|---|
| `parametri_3pl.csv` | 384 varianti (64 modelli di item): `beta` difficoltà, `alpha` discriminazione, `gamma` indovinamento (fisso 0,25), numero di elementi e di regole, tipo di distrattore |
| `struttura_item.csv` | per ogni variante, quali regole cambiano (colore, forma, posizione, dimensione) per ciascun elemento |
| `forma_breve_1..3.csv` | le tre forme brevi da 12 item validate nello studio |

Cosa si può fare con questi file: usare la relazione tra struttura (numero di elementi, numero di regole,
tipo di distrattore) e difficoltà per generare matrici nostre con difficoltà prevedibile, e come prior
per l'analisi IRT dei nostri dati.

Cosa **non** si può fare: copiare le immagini originali MaRs-IB nel test. Gli item sono distribuiti
"per scopi accademici e non commerciali" (Gorilla Open Materials, pagina del Blakemore Lab), non con una
licenza aperta. I parametri qui sopra sono invece sotto MIT.
