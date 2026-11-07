# Dominio personalizzato: stafftech.com

Il sito è pubblicato con GitHub Pages sul dominio **stafftech.com** (e `www.stafftech.com`).

## Come è collegato

1. Nel pannello del registrar di stafftech.com ci sono questi record DNS:
   - 4 record **A** su `@` (dominio nudo) verso gli indirizzi di GitHub Pages:
     `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - 1 record **CNAME** su `www` verso `federicoapicella.github.io`
2. Su GitHub, in *Settings → Pages → Custom domain*, è impostato `stafftech.com` con *Enforce HTTPS* attivo.
3. Il file `CNAME` in questa cartella contiene il dominio (usato da GitHub Pages quando si pubblica da un branch; con la pubblicazione via Actions conta l'impostazione in Settings).

Dopo il collegamento il vecchio indirizzo `https://federicoapicella.github.io/test-qi/` reindirizza da solo al nuovo dominio.

## Se il dominio smette di funzionare

Controllare che i record DNS qui sopra siano ancora presenti e che in *Settings → Pages* il dominio risulti verificato ("DNS check successful").
