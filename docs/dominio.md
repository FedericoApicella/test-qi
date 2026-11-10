# Pubblicazione e dominio: qi.stafftech.it

Il sito è pubblicato su **https://qi.stafftech.it** con **Cloudflare Pages**, collegato al
repository GitHub `FedericoApicella/test-qi` (privato). Ogni merge su `main` viene pubblicato
da solo in un minuto circa; le altre branch ricevono un indirizzo di anteprima `*.pages.dev`.

Il codice è proprietario (vedi `LICENSE`): il repository privato nasconde il sorgente,
ma quello che il browser scarica (HTML, CSS, JS) resta per forza leggibile da chi lo apre.
La protezione vera è il copyright, il dominio, i dati raccolti e la versione sugli store.

## Come è collegato

1. **Cloudflare Pages** (dashboard Cloudflare → *Workers & Pages* → progetto `test-qi`):
   sorgente GitHub, branch di produzione `main`, nessun comando di build, cartella di
   output `/` (il sito è statico, si pubblica così com'è).
2. **Dominio**: nel progetto Pages, *Custom domains* → `qi.stafftech.it`. Siccome il DNS di
   stafftech.it è già su Cloudflare, il record CNAME `qi` punta a `test-qi.pages.dev`
   (proxy attivo, nuvoletta arancione) e il certificato HTTPS è automatico.
3. Il file `CNAME` nella radice del repo resta per compatibilità, Cloudflare non lo usa.

## Migrazione da GitHub Pages (novembre 2026)

Ordine sicuro, senza interruzioni del sito:

1. Creare il progetto su Cloudflare Pages e verificare l'anteprima `test-qi.pages.dev`.
2. Aggiungere il dominio `qi.stafftech.it` al progetto Pages: Cloudflare aggiorna da solo il
   record CNAME (prima puntava a `federicoapicella.github.io`).
3. Su GitHub: *Settings → Pages*, togliere il dominio personalizzato; poi *Settings →
   General → Danger Zone → Change visibility → Private*. GitHub Pages si spegne da solo.
4. Rimuovere `.github/workflows/pages.yml` (non serve più e fallirebbe sul repo privato).

## Se il dominio smette di funzionare

Controllare nel progetto Pages che il dominio risulti *Active*, e in *DNS → Records* che il
record CNAME `qi` punti a `test-qi.pages.dev`. Dopo una modifica, chiudere e riaprire l'app o
toccare «Aggiorna» (il service worker tiene la versione precedente per qualche minuto).

## Nota su Cloudflare Pages e gli indirizzi `.html`

Cloudflare Pages reindirizza `/test.html` a `/test` (308). I link interni continuano a funzionare;
il service worker (`sw.js`) sa gestire le risposte reindirizzate anche offline.
