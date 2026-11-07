# Dominio personalizzato: qi.stafftech.com

Il sito è pubblicato con GitHub Pages sull'indirizzo **https://qi.stafftech.com**.

## Come è collegato

1. Il DNS di stafftech.com è su Cloudflare. In *DNS → Records* c'è un record
   **CNAME** con nome `qi` che punta a `federicoapicella.github.io`, con il proxy
   Cloudflare (nuvoletta arancione) **disattivato** ("DNS only").
2. Su GitHub, in *Settings → Pages → Custom domain*, è impostato `qi.stafftech.com`
   con *Enforce HTTPS* attivo.
3. Il file `CNAME` nella radice del repo contiene lo stesso dominio (GitHub lo usa
   quando si pubblica da un branch; con la pubblicazione via Actions conta
   l'impostazione in Settings).

Dopo il collegamento il vecchio indirizzo `https://federicoapicella.github.io/test-qi/`
reindirizza da solo al nuovo.

## Se il dominio smette di funzionare

Controllare che il record CNAME su Cloudflare sia ancora presente e non proxato, e che
in *Settings → Pages* il dominio risulti verificato ("DNS check successful").
