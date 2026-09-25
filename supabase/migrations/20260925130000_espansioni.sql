-- ============================================================
--  LE ESPANSIONI: CHI ESPANDE CHI, E CHI STA SOTTO A CHI
-- ============================================================
--
--  Due cose diverse, e stanno in due posti diversi apposta.
--
--  1. QUALI ESPANSIONI HA UN GIOCO e' un fatto SUL GIOCO, uguale per
--     tutti, e lo sa BGG: sta in `schede_bgg`, accanto alle misure e
--     alla copertina, per la stessa ragione gia' scritta li' -- l'API
--     va interrogata una volta per gioco, non una per utente.
--
--  2. SE UN'ESPANSIONE STA SOTTO AL SUO GIOCO BASE e' una scelta DI
--     CHI POSSIEDE la collezione, e cambia da persona a persona: sta su
--     `giochi`, che e' la tabella delle copie personali.
--
--  Confonderle vorrebbe dire o imporre a tutti il raggruppamento di
--  uno, o rifare a ogni utente una domanda a BGG che ha gia' avuto
--  risposta.
-- ------------------------------------------------------------

-- --- 1. il legame, che e' di BGG -----------------------------
--
--  Un jsonb solo e non due colonne, con dentro esattamente quello che
--  torna l'endpoint `/espansioni`:
--
--    { "espansioni": [{"id": 363757, "nome": "..."}],
--      "base":       [{"id": 237182, "nome": "Root"}] }
--
--  `espansioni` sono quelle DI questo gioco; `base` e' il gioco che
--  QUESTO espande, ed e' pieno solo quando la riga e' a sua volta
--  un'espansione. A distinguerli nell'XML e' `inbound="true"` sul
--  `<link>`, non il tipo dell'item: lo stesso `boardgameexpansion`
--  compare su tutt'e due i lati.
--
--  Una forma sola, scritta una volta, che attraversa proxy, edge
--  function, database e client senza essere tradotta: le traduzioni in
--  mezzo sono il posto dove i campi si perdono.
alter table public.schede_bgg
  add column if not exists legami jsonb;

comment on column public.schede_bgg.legami is
  'Da /espansioni: {espansioni:[{id,nome}], base:[{id,nome}]}. base e'' pieno solo se questa riga e'' a sua volta un''espansione.';

-- --- 2. scriverli, che nessuno puo' fare a mano ---------------
--
--  Come `scheda_bgg_registra`: chi chiama non ha il diritto di scrivere
--  sulla tabella e non deve averlo. E' una funzione a se' invece di un
--  parametro in piu' su quella -- cambiare la firma di una funzione
--  vuol dire crearne una seconda e revocare la prima, e per una colonna
--  si paga troppo.
--
--  QUI SI SOVRASCRIVE, e non e' una svista: negli altri campi vale il
--  COALESCE perche' chi arriva con una scheda incompleta non deve
--  cancellare quella completa. I legami invece arrivano da BGG interi o
--  non arrivano affatto, e una lettura piu' recente e' migliore di una
--  vecchia -- le espansioni di un gioco si aggiungono nel tempo. Si
--  scrive solo se c'e' davvero qualcosa da scrivere.
create or replace function public.scheda_bgg_legami(
  p_bgg    integer,
  p_legami jsonb
) returns public.schede_bgg
language plpgsql
security definer
set search_path = public
as $$
declare r public.schede_bgg;
begin
  if p_bgg is null or p_bgg <= 0 then
    raise exception 'id BGG mancante';
  end if;
  if p_legami is null or jsonb_typeof(p_legami) <> 'object' then
    raise exception 'i legami devono essere un oggetto';
  end if;

  insert into public.schede_bgg as s (bgg, legami)
  values (p_bgg, p_legami)
  on conflict (bgg) do update set
    legami     = excluded.legami,
    aggiornato = now()
  returning * into r;

  return r;
end
$$;

revoke all on function public.scheda_bgg_legami(integer, jsonb) from public;
grant execute on function public.scheda_bgg_legami(integer, jsonb) to authenticated;

-- --- 3. il raggruppamento, che e' di chi possiede -------------
--
--  `sotto` tiene l'id BGG del gioco base sotto cui questa copia sta
--  raggruppata. NULL vuol dire "sta da sola sullo scaffale", ed e' il
--  valore di partenza: di serie un'espansione occupa un cubo come un
--  gioco, ed e' cosi' che si comporta oggi -- questa migrazione non
--  cambia niente a nessuno finche' nessuno tocca l'interruttore.
--
--  E' l'id BGG e non l'id della riga del gioco base: una persona puo'
--  avere l'espansione e NON avere il gioco base, e in quel caso non
--  c'e' nessuna riga a cui puntare. L'id BGG esiste comunque, ed e' la
--  stessa chiave su cui gira tutto il resto -- recensioni, partite,
--  wishlist, schede.
alter table public.giochi
  add column if not exists sotto integer;

comment on column public.giochi.sotto is
  'Id BGG del gioco base sotto cui questa copia e'' raggruppata. NULL = sta da sola sullo scaffale.';

--  Serve a una domanda sola e la si fa spesso: "di questo gioco, cosa
--  ho raggruppato sotto?". Per proprietario, perche' e' sempre dentro
--  una collezione.
create index if not exists giochi_sotto_idx
  on public.giochi (proprietario, sotto)
  where sotto is not null;
