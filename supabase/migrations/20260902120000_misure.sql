-- ============================================================
-- LE MISURE VERE DELLA SCATOLA.
--
-- Erano stimate, e la stima si vedeva: un gioco piccolo disegnato
-- grande quanto uno scatolone. BGG le pubblica davvero, ma non nel
-- gioco: stanno dentro le EDIZIONI (`/thing?versions=1`), una per
-- ristampa, e in POLLICI.
--
-- Si tiene l'ULTIMA EDIZIONE -- anno piu' alto, a parita' l'ultima
-- elencata -- perche' e' la scatola che si compra oggi. Le ristampe
-- cambiano formato piu' spesso di quanto si creda, e la prima edizione
-- del 2005 non e' quella che hai sullo scaffale.
--
-- `edizione` serve a poter DIRE da dove viene la misura. Un numero senza
-- provenienza, quando sembra sbagliato, non si puo' nemmeno controllare.
-- ============================================================

alter table public.giochi
  add column if not exists larghezza_cm numeric(5,1),   -- il lato lungo della faccia
  add column if not exists altezza_cm   numeric(5,1),   -- l'altro lato della faccia
  add column if not exists spessore_cm  numeric(5,1),   -- quanto e' spessa
  add column if not exists edizione     text,           -- da quale ristampa viene la misura
  -- null = mai chieste; serve a non richiedere all'infinito i giochi
  -- che su BGG le misure non le hanno proprio
  add column if not exists misure_il    timestamptz;

comment on column public.giochi.larghezza_cm is
  'Dalla piu'' recente edizione su BGG, convertita dai pollici. Null = BGG non le ha.';
comment on column public.giochi.edizione is
  'Il nome dell''edizione da cui vengono le misure: senza, un numero che sembra sbagliato non si puo'' controllare.';
