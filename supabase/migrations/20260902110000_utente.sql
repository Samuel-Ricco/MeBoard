-- ============================================================
-- I DATI DELL'UTENTE.
--
-- Qui non si copia niente di BGG: si tengono solo RIFERIMENTI, cioe'
-- l'id del gioco. Nome, anno, durata e copertina stanno nella cache
-- del catalogo e si ricompongono all'avvio con una join. Duplicarli
-- qui vorrebbe dire avere due verita' che col tempo divergono.
--
-- L'identita' e' quella di Supabase, ottenuta con l'accesso ANONIMO:
-- al primo avvio l'app crea un utente vero e silenzioso, senza
-- schermate di accesso. `auth.uid()` funziona come per un utente
-- registrato, e piu' avanti ci si potra' collegare un'email per non
-- perdere tutto cambiando telefono.
-- ============================================================

-- ------------------------------------------------------------
-- IL PROFILO
-- ------------------------------------------------------------
create table if not exists public.profili (
  utente  uuid primary key references auth.users on delete cascade,
  nick    text not null default '',
  tinta   text not null default '#CCFF4D',   -- il colore del meeple
  creato  timestamptz not null default now()
);

alter table public.profili enable row level security;

drop policy if exists "profili: solo il mio" on public.profili;
create policy "profili: solo il mio" on public.profili
  for all to authenticated
  using (utente = auth.uid()) with check (utente = auth.uid());

-- ------------------------------------------------------------
-- POSSEDUTI E DESIDERATI: UNA TABELLA SOLA
--
-- Non due tabelle ma una con uno stato, e non e' un risparmio: e' che
-- con due tabelle un gioco potrebbe stare in tutte e due, cioe'
-- posseduto E desiderato insieme, e l'app si smentirebbe da sola in
-- due schermate diverse. Cosi' la chiave primaria lo rende
-- IMPOSSIBILE invece che sconsigliato -- e comprare un gioco e' un
-- update dello stato, non due scritture da tenere in sincrono.
-- ------------------------------------------------------------
create type stato_gioco as enum ('posseduto', 'desiderato');

create table if not exists public.giochi_utente (
  utente   uuid not null references auth.users on delete cascade,
  gioco    integer not null references public.giochi on delete cascade,
  stato    stato_gioco not null,
  aggiunto timestamptz not null default now(),
  primary key (utente, gioco)
);

alter table public.giochi_utente enable row level security;
create index if not exists giochi_utente_idx on public.giochi_utente (utente, stato);

drop policy if exists "giochi utente: solo i miei" on public.giochi_utente;
create policy "giochi utente: solo i miei" on public.giochi_utente
  for all to authenticated
  using (utente = auth.uid()) with check (utente = auth.uid());

-- ------------------------------------------------------------
-- IL MOBILE
--
-- Il vincolo che il database fa rispettare e' "una casella, un gioco".
-- QUANTE caselle ci siano non lo sa e non deve saperlo: quella e' la
-- forma del mobile, sta in `scene/mobile.ts` ed e' li' che deve
-- restare. Scriverla anche qui vorrebbe dire tenerne due copie
-- allineate a mano, e cambiando formato al Kallax se ne dimenticherebbe
-- una.
-- ------------------------------------------------------------
create table if not exists public.scaffale (
  utente  uuid not null references auth.users on delete cascade,
  gioco   integer not null references public.giochi on delete cascade,
  casella integer not null check (casella >= 0),
  primary key (utente, gioco),
  -- una casella tiene un gioco solo
  unique (utente, casella),
  -- e ci si mette solo roba che si ha (o si vuole): niente scatole
  -- fantasma sul ripiano
  foreign key (utente, gioco) references public.giochi_utente (utente, gioco) on delete cascade
);

alter table public.scaffale enable row level security;

drop policy if exists "scaffale: solo il mio" on public.scaffale;
create policy "scaffale: solo il mio" on public.scaffale
  for all to authenticated
  using (utente = auth.uid()) with check (utente = auth.uid());

-- ------------------------------------------------------------
-- LE RECENSIONI
-- ------------------------------------------------------------
create table if not exists public.recensioni (
  utente uuid not null references auth.users on delete cascade,
  gioco  integer not null references public.giochi on delete cascade,
  voto   smallint check (voto between 1 and 10),   -- come su BGG
  testo  text not null default '',
  quando date not null default current_date,
  primary key (utente, gioco),
  -- una recensione senza voto ne' testo non e' una recensione
  check (voto is not null or length(btrim(testo)) > 0)
);

alter table public.recensioni enable row level security;

drop policy if exists "recensioni: solo le mie" on public.recensioni;
create policy "recensioni: solo le mie" on public.recensioni
  for all to authenticated
  using (utente = auth.uid()) with check (utente = auth.uid());

-- ------------------------------------------------------------
-- LE ETICHETTE (i "gruppi" della versione precedente)
-- ------------------------------------------------------------
create table if not exists public.etichette (
  id     uuid primary key default gen_random_uuid(),
  utente uuid not null references auth.users on delete cascade,
  nome   text not null check (length(btrim(nome)) > 0)
);

-- Due etichette che differiscono solo per le maiuscole sono la stessa
-- etichetta scritta male: l'unicita' va su `lower`, se no ci si ritrova
-- "Strategici" e "strategici" a dividersi gli stessi giochi.
create unique index if not exists etichette_nome_idx
  on public.etichette (utente, lower(nome));

create table if not exists public.giochi_etichette (
  utente    uuid not null references auth.users on delete cascade,
  gioco     integer not null references public.giochi on delete cascade,
  etichetta uuid not null references public.etichette on delete cascade,
  primary key (utente, gioco, etichetta)
);

alter table public.etichette enable row level security;
alter table public.giochi_etichette enable row level security;

drop policy if exists "etichette: solo le mie" on public.etichette;
create policy "etichette: solo le mie" on public.etichette
  for all to authenticated
  using (utente = auth.uid()) with check (utente = auth.uid());

drop policy if exists "giochi etichette: solo i miei" on public.giochi_etichette;
create policy "giochi etichette: solo i miei" on public.giochi_etichette
  for all to authenticated
  using (utente = auth.uid()) with check (utente = auth.uid());

-- ------------------------------------------------------------
-- I GIOCATORI E LE PARTITE
--
-- I giocatori sono righe, non testo libero dentro la partita. A testo
-- libero "Giulia", "giulia" e "Giuli" diventano tre persone e le
-- statistiche smettono di tornare senza che si capisca perche'.
-- ------------------------------------------------------------
create table if not exists public.giocatori (
  id     uuid primary key default gen_random_uuid(),
  utente uuid not null references auth.users on delete cascade,
  nome   text not null check (length(btrim(nome)) > 0)
);

create unique index if not exists giocatori_nome_idx
  on public.giocatori (utente, lower(nome));

create table if not exists public.partite (
  id        uuid primary key default gen_random_uuid(),
  utente    uuid not null references auth.users on delete cascade,
  gioco     integer not null references public.giochi on delete restrict,
  data      date not null default current_date,
  durata    integer check (durata is null or durata > 0),   -- minuti
  -- il vincitore si cancella insieme al giocatore, ma la partita resta:
  -- era vera quando e' stata scritta
  vincitore uuid references public.giocatori on delete set null,
  creato    timestamptz not null default now()
);

create index if not exists partite_utente_idx on public.partite (utente, data desc);

create table if not exists public.partecipanti (
  partita   uuid not null references public.partite on delete cascade,
  giocatore uuid not null references public.giocatori on delete cascade,
  primary key (partita, giocatore)
);

alter table public.giocatori enable row level security;
alter table public.partite enable row level security;
alter table public.partecipanti enable row level security;

drop policy if exists "giocatori: solo i miei" on public.giocatori;
create policy "giocatori: solo i miei" on public.giocatori
  for all to authenticated
  using (utente = auth.uid()) with check (utente = auth.uid());

drop policy if exists "partite: solo le mie" on public.partite;
create policy "partite: solo le mie" on public.partite
  for all to authenticated
  using (utente = auth.uid()) with check (utente = auth.uid());

-- I partecipanti non hanno una colonna `utente`: appartengono alla
-- partita, e il permesso si eredita da quella. Duplicare l'utente qui
-- sarebbe una terza copia della stessa informazione da tenere
-- allineata.
drop policy if exists "partecipanti: quelli delle mie partite" on public.partecipanti;
create policy "partecipanti: quelli delle mie partite" on public.partecipanti
  for all to authenticated
  using (exists (
    select 1 from public.partite p
    where p.id = partecipanti.partita and p.utente = auth.uid()
  ))
  with check (exists (
    select 1 from public.partite p
    where p.id = partecipanti.partita and p.utente = auth.uid()
  ));

-- ------------------------------------------------------------
-- COSA RESTA AFFIDATO ALL'APP, E PERCHE'
--
--  - "il vincitore era al tavolo": vorrebbe un trigger che rilegge i
--    partecipanti a ogni scrittura. L'interfaccia lo rende gia'
--    impossibile (il vincitore si sceglie fra i presenti) e il costo
--    di un errore qui e' una statistica storta, non dati corrotti.
--  - "sul ripiano solo cio' che possiedi": la chiave esterna garantisce
--    che il gioco sia fra i tuoi, non che lo stato sia `posseduto`. Un
--    desiderio messo sul ripiano sarebbe strano ma non rotto.
--
-- Le regole che invece NON possono dipendere dalla buona volonta' --
-- una casella un gioco, un gioco un solo stato, un'etichetta un solo
-- nome -- sono vincoli veri qui sopra.
-- ------------------------------------------------------------
