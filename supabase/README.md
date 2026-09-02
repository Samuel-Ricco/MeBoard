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

Il dump dei ranking di BGG (`boardgames_ranks.csv`, ~180.000 righe, 11 MB) si
carica una volta e si aggiorna ogni tanto. È quello che rende il catalogo
sfogliabile e filtrabile: l'API di BGG sa cercare per nome e restituire un
gioco per id, e basta — un elenco ordinato per rank e filtrato per categoria
non lo sa dare.
