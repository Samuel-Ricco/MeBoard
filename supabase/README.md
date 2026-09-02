# Supabase: cosa c'è e cosa devi fare tu

Le migrazioni sono file e le scrivo io. Creare il progetto e mettere i segreti
richiede il tuo account, quindi quella parte è tua — e i segreti **non devono
passare da questa conversazione né finire nel repo**.

## Com'è diviso

| | dove |
|---|---|
| catalogo (180k giochi, solo testo) | tabella `giochi`, riempita dal dump dei ranking |
| dettagli di un gioco (giocatori, durata, peso, indirizzo copertina) | `/thing` via edge function, **su richiesta**, scritti nella stessa riga |
| i **byte** delle copertine | **da nessuna parte**: li serve il CDN di BGG, li tiene in cache il telefono |
| i tuoi dati | `giochi_utente`, `scaffale`, `recensioni`, `etichette`, `giocatori`, `partite`, `profili` |

La regola che tiene in piedi il disegno: **nel database non entrano immagini**.
Ci entra l'indirizzo, che sono cento byte. Archiviare duecentomila copertine
vorrebbe dire ricopiare una cosa che il CDN di BGG serve già.

L'unica avvertenza, e l'abbiamo già pagata una volta: le immagini di
`cf.geekdo-images.com` **non mandano header CORS**. In un `<img>` vanno bene
con l'indirizzo diretto; per finire in una texture WebGL devono passare dalla
edge function, che le rilancia byte per byte aggiungendo l'header. La function
fa da **passacarte, non da magazzino**.

## I passi che devi fare tu

1. **Il progetto**: <https://supabase.com> → nuovo progetto, region `Central EU
   (Frankfurt)`. Segnati la password del database, non si rivede più.

2. **Le migrazioni**: si applicano da sole con l'integrazione GitHub (*Project
   Settings → Integrations → GitHub*, working directory `.`), oppure a mano con
   `supabase link` e `supabase db push`.

3. **L'accesso anonimo**: *Authentication → Providers → Anonymous sign-ins*,
   acceso. È quello che dà un `auth.uid()` senza schermate di accesso.

4. **Il token BGG**, senza farlo passare da nessun'altra parte:

   ```bash
   supabase secrets set BGG_TOKEN=...
   ```

   L'API XML di BGG risponde **401** senza. Per questo il client non la chiama
   mai direttamente: la chiave sta nella function e basta.

5. **Le chiavi del client** in un `.env.local` che resta fuori da git:

   ```
   VITE_SUPABASE_URL=https://<ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=...
   ```

   La `anon key` è pubblica per disegno — a proteggere i dati è RLS, che è
   attivo su ogni tabella di queste migrazioni. Ma va comunque tenuta fuori dai
   commit, perché legarla al repo rende impossibile ruotarla senza riscrivere
   la storia.

## Il primo riempimento del catalogo

Il dump dei ranking di BGG rende il catalogo sfogliabile e filtrabile, cosa che
l'API non sa fare: quella cerca per nome e restituisce un gioco per id, e basta.

```bash
# 1. tradurre il dump nel formato della tabella
node supabase/dump/prepara.mjs percorso/del/boardgames_ranks.csv

# 2. caricarlo, da psql collegato al progetto
\copy public.giochi (id, nome, anno, posizione, voto_medio, votanti, espansione, rank_astratti, rank_famiglia, rank_festa, rank_strategia, rank_tematici, rank_guerra) from 'supabase/dump/giochi.csv' with (format csv, header)
```

Verificato sul dump vero: **180.226 righe**, nessuna scartata, 31.183
classificate. Lo script usa un parser CSV completo e non uno split sulle
virgole, perché **4.231 nomi contengono una virgola** — *"Unmatched: Battle of
Legends, Volume One"* — e uno split ingenuo sposterebbe tutte le colonne
successive di un posto: anni che diventano rank, rank che diventano voti, e
nessun errore a segnalarlo.

I `.csv` non entrano nel repo: sono dati, si riscaricano e si rigenerano.

## La edge function

Tre rotte, in `functions/bgg/`:

| | |
|---|---|
| `GET /bgg/cerca?q=` | cerca per nome su BGG |
| `GET /bgg/dettagli?ids=` | fino a 20 id per volta; normalizza **e scrive in `giochi`** con la chiave di servizio |
| `GET /bgg/copertina?u=` | rilancia i byte dell'immagine aggiungendo l'header CORS |

Due dettagli che contano. `copertina` prende **l'indirizzo, non l'id**: quello
ce l'abbiamo già in tabella dai dettagli, e ripartire dall'id vorrebbe dire un
secondo giro su un'API a consumo. E accetta **solo gli host del CDN di BGG** —
senza quel controllo sarebbe un proxy aperto, e chiunque potrebbe farsi
scaricare qualsiasi indirizzo a spese nostre e col nostro IP.

BGG mette in coda le richieste pesanti e risponde `202`: non è un errore, è
"riprova fra poco". La function riprova con attese crescenti.
