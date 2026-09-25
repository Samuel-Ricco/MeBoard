-- ============================================================
--  DUE LIBRERIE NON POSSONO CHIAMARSI UGUALE
-- ============================================================
--
--  Il divieto c'e' gia' e regge: `js/store.js` controlla il nome prima
--  di crearlo o rinominarlo (`nomeLibPreso`), e da li' non passa un
--  doppione. Ma un controllo nel client e' una cortesia, non una
--  garanzia: vive dentro UNA finestra, e due schede aperte sullo stesso
--  account -- o una richiesta partita due volte perche' la rete ha
--  esitato -- non si vedono fra loro.
--
--  E un doppione qui non e' un fastidio estetico. Il nome del mobile e'
--  quello che si legge sopra lo scaffale e quello che si sceglie quando
--  si sposta una scatola: due voci identiche nello stesso elenco sono
--  una scelta che non si puo' fare.
--
--  L'indice e' PER PROPRIETARIO, non globale: "Libreria 5" di due
--  persone diverse sono due mobili diversi, ed e' la stessa regola gia'
--  scritta per lo slug dei giochi -- unico dentro una collezione, non
--  nel mondo.
--
--  IL NOME SI CONFRONTA SENZA MAIUSCOLE E SENZA SPAZI AI BORDI.
--  `nomeLibPreso` fa gia' cosi' nel client, e un indice che distinguesse
--  "salotto" da "Salotto " lascerebbe passare proprio i doppioni che
--  una persona scrive davvero. Per questo l'indice e' su
--  un'ESPRESSIONE, non sulla colonna.
--
--  ------------------------------------------------------------
--  SE QUESTA MIGRAZIONE FALLISCE, non e' un errore di scrittura: vuol
--  dire che i doppioni ci sono gia'. Si trovano cosi' --
--
--    select proprietario, lower(btrim(nome)) as nome, count(*)
--    from public.librerie
--    group by 1, 2 having count(*) > 1;
--
--  -- e si rinominano dal Table Editor prima di riprovare. Non li
--  rinomina questa migrazione: quale delle due tenga il nome lo sa solo
--  chi le ha create, e una migrazione che sceglie da sola sceglie
--  sbagliato meta' delle volte.
-- ------------------------------------------------------------

create unique index if not exists librerie_proprietario_nome_uniq
  on public.librerie (proprietario, lower(btrim(nome)));

comment on index public.librerie_proprietario_nome_uniq is
  'Due mobili della stessa persona non possono chiamarsi uguale: il confronto ignora maiuscole e spazi ai bordi, come nomeLibPreso in js/store.js.';
