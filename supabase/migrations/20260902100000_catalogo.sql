-- ============================================================
-- IL CATALOGO: UNA CACHE DI BGG, NON UN MAGAZZINO NOSTRO.
--
-- Due sorgenti, due momenti diversi:
--
--  1. il DUMP dei ranking di BGG (`boardgames_ranks.csv`, ~180.000
--     righe) riempie nome, anno, rank e voti. E' quello che rende
--     sfogliabile e filtrabile il catalogo, cosa che l'API di BGG non
--     sa fare: sa cercare per nome e restituire un gioco per id, e
--     basta;
--  2. `/thing`, chiesto SU RICHIESTA quando un gioco serve davvero,
--     aggiunge giocatori, durata, peso e l'indirizzo della copertina.
--     Chiesto una volta, vale per tutti: `dettagli_il` dice se e'
--     gia' stato fatto.
--
-- QUI DENTRO NON ENTRANO IMMAGINI. Ci sta l'INDIRIZZO della copertina
-- su BGG, che e' una stringa da un centinaio di byte; i byte veri li
-- serve il CDN di BGG e li tiene in cache il telefono. Archiviare
-- duecentomila copertine sarebbe saturare lo spazio per ricopiare una
-- cosa che qualcun altro serve gia'.
--
-- L'unica avvertenza, e l'abbiamo gia' pagata una volta: le immagini
-- di cf.geekdo-images.com NON mandano header CORS. In un <img> vanno
-- benissimo con l'indirizzo diretto; per finire in una texture WebGL
-- devono passare dalla edge function, che le rilancia byte per byte
-- aggiungendo l'header. La function fa da passacarte, non da
-- magazzino: non resta niente su Supabase.
-- ============================================================

create table if not exists public.giochi (
  -- l'id di BGG, non uno slug inventato: e' la chiave che condividiamo
  -- con la sorgente, e con la sorgente si deve poter tornare a parlare
  id             integer primary key,

  -- ---- dal dump dei ranking ----
  nome           text    not null,
  anno           integer,
  posizione      integer,          -- il rank generale; null = non classificato
  voto_medio     numeric(5,3),
  votanti        integer,
  espansione     boolean not null default false,
  -- i rank per categoria: sono i filtri del tab Catalogo, e vengono
  -- gratis col dump invece di dover essere dedotti
  rank_astratti  integer,
  rank_famiglia  integer,
  rank_festa     integer,
  rank_strategia integer,
  rank_tematici  integer,
  rank_guerra    integer,

  -- ---- da /thing, solo quando il gioco serve davvero ----
  editore        text,
  giocatori_min  integer,
  giocatori_max  integer,
  durata_min     integer,          -- minuti
  durata_max     integer,
  peso           numeric(4,2),     -- 1..5, la "weight" di BGG
  copertina_url  text,             -- INDIRIZZO su BGG, mai l'immagine
  miniatura_url  text,
  -- null vuol dire "mai chiesto a /thing": e' la sola cosa che decide
  -- se vale la pena disturbare BGG per questo gioco
  dettagli_il    timestamptz,

  aggiornato     timestamptz not null default now()
);

comment on table public.giochi is
  'Cache di BGG. Il dump dei ranking riempie le colonne di base, /thing '
  'aggiunge il resto su richiesta. Nessuna immagine: solo indirizzi.';

comment on column public.giochi.dettagli_il is
  'Quando /thing e'' stato chiesto per questo gioco. Null = mai.';

-- La ricerca per nome e' il gesto piu' frequente del catalogo, su
-- centottantamila righe. Questo indice serve i confronti esatti e i
-- prefissi.
--
-- Per cercare DENTRO il titolo servirebbe pg_trgm, e non lo prendiamo
-- ora: su Supabase le estensioni stanno nello schema `extensions`, e
-- `gin_trgm_ops` si risolve solo se quello e' nel search_path con cui
-- gira la migrazione. E' una dipendenza che puo' far fallire il deploy
-- per una ricerca che ancora non esiste. Su 180.000 righe una scansione
-- costa decine di millisecondi; quando servira' davvero, l'indice
-- trigram arrivera' con la sua migrazione.
create index if not exists giochi_nome_idx on public.giochi (lower(nome));

-- Sfogliare vuol dire "i migliori per categoria": l'ordine per rank e'
-- l'ordinamento predefinito di ognuna di quelle liste.
create index if not exists giochi_posizione_idx  on public.giochi (posizione) where posizione is not null;
create index if not exists giochi_strategia_idx  on public.giochi (rank_strategia) where rank_strategia is not null;
create index if not exists giochi_famiglia_idx   on public.giochi (rank_famiglia) where rank_famiglia is not null;
create index if not exists giochi_festa_idx      on public.giochi (rank_festa) where rank_festa is not null;

alter table public.giochi enable row level security;

-- IL CATALOGO LO LEGGONO TUTTI, ANCHE CHI NON HA ANCORA UN ACCOUNT:
-- e' informazione pubblica di BGG, e serve gia' alla prima schermata,
-- prima che l'accesso anonimo sia andato a buon fine.
drop policy if exists "giochi: li legge chiunque" on public.giochi;
create policy "giochi: li legge chiunque" on public.giochi
  for select to anon, authenticated using (true);

-- SCRIVE SOLO LA EDGE FUNCTION, che gira con la service key e scavalca
-- RLS: nessuna policy di scrittura, quindi nessun client puo' toccare
-- il catalogo. Un utente che potesse correggere una riga la
-- correggerebbe per tutti.
