#!/usr/bin/env python3
"""Analisi di affidabilità dei record raccolti da js/raccolta.js.

Uso:
    python3 analisi/affidabilita.py cartella_o_file.jsonl [--min-item 0.8]

Legge record JSON (schema 1): file .json singoli in una cartella, oppure un
file .jsonl con un record per riga (è il formato che l'endpoint dovrebbe
produrre). Solo la libreria standard, niente da installare.

Calcola e stampa:
  - numero di sessioni valide e di persone distinte;
  - per ogni item: proporzione di risposte corrette (p), correlazione item-totale
    corretta (r_it), tempo mediano;
  - per ogni dominio e per il totale: alfa di Cronbach con intervallo al 95%,
    deviazione standard, errore standard di misura in punti QI;
  - test-retest: correlazione fra prima e seconda sessione della stessa persona,
    con distanza in giorni;
  - un giudizio contro le soglie di docs/calibrazione.md.
"""
import json
import math
import os
import statistics
import sys
from collections import defaultdict

SOGLIE = {"totale": 0.90, "dominio": 0.75, "retest": 0.85, "r_it": 0.30}
DOMINI = ["matrici", "serie", "analogie", "memoria", "spaziale"]
PREFISSI = {"mat": "matrici", "ser": "serie", "ana": "analogie", "mem": "memoria", "spa": "spaziale"}


def carica(percorso):
    record = []
    if os.path.isdir(percorso):
        for nome in sorted(os.listdir(percorso)):
            if nome.endswith(".json"):
                with open(os.path.join(percorso, nome), encoding="utf-8") as f:
                    try:
                        record.append(json.load(f))
                    except json.JSONDecodeError:
                        print(f"salto {nome}: JSON non valido", file=sys.stderr)
    else:
        with open(percorso, encoding="utf-8") as f:
            for riga in f:
                riga = riga.strip()
                if riga:
                    try:
                        record.append(json.loads(riga))
                    except json.JSONDecodeError:
                        print("salto una riga non valida", file=sys.stderr)
    return [r for r in record if r.get("schema") == 1 and r.get("consenso") and r.get("item")]


def dominio_di(item):
    return item.get("dominio") or PREFISSI.get(item["id"].split("_")[0], "altro")


def matrice(record, min_item):
    """Matrice persone x item (solo item presenti in almeno min_item delle sessioni)."""
    conteggio = defaultdict(int)
    for r in record:
        for it in r["item"]:
            conteggio[it["id"]] += 1
    soglia = min_item * len(record)
    ids = sorted(i for i, c in conteggio.items() if c >= soglia)
    righe = []
    for r in record:
        risposte = {it["id"]: it["corretto"] for it in r["item"]}
        if all(i in risposte for i in ids):
            righe.append([risposte[i] for i in ids])
    return ids, righe


def alfa(righe):
    k = len(righe[0])
    if k < 2 or len(righe) < 3:
        return None
    colonne = list(zip(*righe))
    var_item = sum(statistics.pvariance(c) for c in colonne)
    tot = [sum(r) for r in righe]
    var_tot = statistics.pvariance(tot)
    if var_tot == 0:
        return None
    return k / (k - 1) * (1 - var_item / var_tot)


def ic_alfa(a, k, n):
    """Intervallo al 95% per alfa (Feldt 1965, approssimazione con F)."""
    if a is None or n < 3:
        return (None, None)
    # Approssimazione: SE(alfa) ~ sqrt(2k(1-alfa)^2 / ((k-1)(n-2)))
    se = math.sqrt(2 * k * (1 - a) ** 2 / ((k - 1) * (n - 2)))
    return (a - 1.96 * se, min(1.0, a + 1.96 * se))


def correlazione(x, y):
    if len(x) < 3:
        return None
    mx, my = statistics.mean(x), statistics.mean(y)
    sx = math.sqrt(sum((v - mx) ** 2 for v in x))
    sy = math.sqrt(sum((v - my) ** 2 for v in y))
    if sx == 0 or sy == 0:
        return None
    return sum((a - mx) * (b - my) for a, b in zip(x, y)) / (sx * sy)


def statistiche_item(ids, righe, record):
    tot = [sum(r) for r in righe]
    tempi = defaultdict(list)
    for r in record:
        for it in r["item"]:
            if it.get("rt_ms") is not None:
                tempi[it["id"]].append(it["rt_ms"])
    out = []
    for j, i in enumerate(ids):
        col = [r[j] for r in righe]
        p = statistics.mean(col)
        resto = [t - c for t, c in zip(tot, col)]
        r_it = correlazione(col, resto)
        med = statistics.median(tempi[i]) / 1000 if tempi[i] else None
        out.append((i, p, r_it, med))
    return out


def blocco(nome, ids, righe, soglia):
    a = alfa(righe)
    n, k = len(righe), len(ids)
    if a is None:
        print(f"  {nome:10s} n={n:4d} k={k:3d}  alfa: non calcolabile")
        return
    lo, hi = ic_alfa(a, k, n)
    sd = statistics.pstdev([sum(r) for r in righe])
    sem_qi = 15 * math.sqrt(max(0.0, 1 - a))
    ok = "OK" if lo is not None and lo >= soglia else ("quasi" if a >= soglia else "NO")
    print(f"  {nome:10s} n={n:4d} k={k:3d}  alfa={a:.3f} [{lo:.3f}, {hi:.3f}]  SD={sd:.2f}  SEM={sem_qi:.1f} QI  soglia {soglia:.2f}: {ok}")


def test_retest(record):
    per_pid = defaultdict(list)
    for r in record:
        per_pid[r["pid"]].append(r)
    coppie = []
    for pid, sessioni in per_pid.items():
        sessioni.sort(key=lambda r: r.get("iniziato") or "")
        if len(sessioni) >= 2:
            a, b = sessioni[0], sessioni[1]
            pa, pb = a.get("punteggio_grezzo"), b.get("punteggio_grezzo")
            if pa is None:
                pa = sum(it["corretto"] for it in a["item"])
            if pb is None:
                pb = sum(it["corretto"] for it in b["item"])
            coppie.append((pa, pb, b.get("giorni_dalla_precedente")))
    return coppie


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    min_item = 0.8
    if "--min-item" in sys.argv:
        min_item = float(sys.argv[sys.argv.index("--min-item") + 1])
    if not args:
        print(__doc__)
        sys.exit(1)

    record = carica(args[0])
    persone = {r["pid"] for r in record}
    print(f"Sessioni valide: {len(record)}   persone distinte: {len(persone)}")
    if len(record) < 3:
        print("Troppo pochi dati per qualsiasi stima.")
        return

    ids, righe = matrice(record, min_item)
    print(f"Item presenti in almeno {min_item:.0%} delle sessioni: {len(ids)}; sessioni complete: {len(righe)}\n")

    print("Item (p = quota corretti, r_it = correlazione item-totale corretta, t = tempo mediano):")
    deboli = []
    for i, p, r_it, med in statistiche_item(ids, righe, record):
        flag = ""
        if r_it is not None and r_it < SOGLIE["r_it"]:
            flag = "  <- r_it bassa"
            deboli.append(i)
        if p < 0.10 or p > 0.95:
            flag += "  <- troppo facile/difficile"
        rt = f"{r_it:.2f}" if r_it is not None else " n/d"
        t = f"{med:5.1f}s" if med is not None else "  n/d"
        print(f"  {i:10s} p={p:.2f} r_it={rt} t={t}{flag}")

    print("\nCoerenza interna:")
    blocco("totale", ids, righe, SOGLIE["totale"])
    for d in DOMINI:
        idx = [j for j, i in enumerate(ids) if PREFISSI.get(i.split("_")[0]) == d]
        if len(idx) >= 2:
            blocco(d, [ids[j] for j in idx], [[r[j] for j in idx] for r in righe], SOGLIE["dominio"])

    print("\nTest-retest (prima vs seconda sessione della stessa persona):")
    coppie = test_retest(record)
    if len(coppie) < 3:
        print(f"  solo {len(coppie)} persone con due sessioni: servono almeno 150.")
    else:
        r = correlazione([c[0] for c in coppie], [c[1] for c in coppie])
        giorni = [c[2] for c in coppie if c[2] is not None]
        med = statistics.median(giorni) if giorni else None
        se = (1 - r * r) / math.sqrt(len(coppie) - 1) if r is not None else None
        g = f", distanza mediana {med:.0f} giorni" if med is not None else ""
        if r is None:
            print("  correlazione non calcolabile")
        else:
            ok = "OK" if r - 1.96 * se >= SOGLIE["retest"] else "NO"
            print(f"  n={len(coppie)}  r={r:.3f} [{r - 1.96 * se:.3f}, {min(1, r + 1.96 * se):.3f}]{g}  soglia {SOGLIE['retest']:.2f}: {ok}")
            pratica = [c[1] - c[0] for c in coppie]
            print(f"  effetto pratica: +{statistics.mean(pratica):.1f} punti grezzi in media")

    print("\nProssimi passi:")
    if deboli:
        print(f"  - rivedere o sostituire {len(deboli)} item con r_it < {SOGLIE['r_it']}: {', '.join(deboli)}")
    if len(righe) < 200:
        print(f"  - servono almeno 200 sessioni complete per un alfa stabile (ora {len(righe)})")
    if len(coppie) < 150:
        print(f"  - servono almeno 150 persone con seconda sessione a 2-4 settimane (ora {len(coppie)})")


if __name__ == "__main__":
    main()
