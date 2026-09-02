import { supabase, funzione } from './supabase'
import { SEMI } from './semi'
import type { Gioco } from './gioco'

/* L'ACCESSO AL CATALOGO.
 *
 * Una sola porta: le schermate chiedono qui e non sanno se la risposta
 * arriva dal database o dai ventotto giochi di scorta. Senza collegamento
 * l'app resta usabile, con un catalogo piccolo invece che vuoto.
 *
 * QUALI FILTRI ESISTONO LO DECIDONO I DATI, non i gusti. Il dump dei
 * ranking porta nome, anno, rank e voto per tutti e 180.000 i giochi; non
 * porta durata, giocatori e peso, che stanno in `/thing` e arrivano solo
 * per i giochi che qualcuno ha davvero aperto. Filtrare il catalogo per
 * durata mostrerebbe quindi una manciata di titoli e sembrerebbe rotto.
 * Le CATEGORIE invece ci sono per tutti, ed e' anche il modo in cui si
 * sfoglia davvero: "i migliori strategici", non "quelli da 40 minuti".
 */

export type Categoria =
  | 'tutti' | 'strategia' | 'famiglia' | 'festa'
  | 'astratti' | 'tematici' | 'guerra'

export const CATEGORIE: Array<{ id: Categoria; nome: string; colonna?: string }> = [
  { id: 'tutti',     nome: 'Tutti' },
  { id: 'strategia', nome: 'Strategici',  colonna: 'rank_strategia' },
  { id: 'famiglia',  nome: 'Famiglia',    colonna: 'rank_famiglia' },
  { id: 'festa',     nome: 'Da tavolata', colonna: 'rank_festa' },
  { id: 'astratti',  nome: 'Astratti',    colonna: 'rank_astratti' },
  { id: 'tematici',  nome: 'Tematici',    colonna: 'rank_tematici' },
  { id: 'guerra',    nome: 'Guerra',      colonna: 'rank_guerra' },
]

/* Le colonne del database sono in snake_case, il resto dell'app in
   camelCase: la traduzione avviene qui, una volta sola, e le schermate
   non sanno che esista una differenza. */
type Riga = {
  id: number; nome: string; anno: number | null; editore: string | null
  giocatori_min: number | null; giocatori_max: number | null
  durata_min: number | null; durata_max: number | null
  peso: string | number | null; posizione: number | null
  voto_medio: string | number | null
  copertina_url: string | null; miniatura_url: string | null
  larghezza_cm: string | number | null; altezza_cm: string | number | null
  spessore_cm: string | number | null; edizione: string | null
}

const num = (v: string | number | null) =>
  v === null || v === '' ? null : Number(v)

const daRiga = (r: Riga): Gioco => ({
  id: r.id,
  nome: r.nome,
  anno: r.anno,
  editore: r.editore,
  giocatoriMin: r.giocatori_min,
  giocatoriMax: r.giocatori_max,
  durataMin: r.durata_min,
  durataMax: r.durata_max,
  peso: num(r.peso),
  posizione: r.posizione,
  votoMedio: num(r.voto_medio),
  copertinaUrl: r.copertina_url,
  miniaturaUrl: r.miniatura_url,
  larghezzaCm: num(r.larghezza_cm),
  altezzaCm: num(r.altezza_cm),
  spessoreCm: num(r.spessore_cm),
  edizione: r.edizione,
})

const CAMPI = 'id,nome,anno,editore,giocatori_min,giocatori_max,' +
  'durata_min,durata_max,peso,posizione,voto_medio,copertina_url,miniatura_url,' +
  'larghezza_cm,altezza_cm,spessore_cm,edizione'

/** Il ripiego locale, quando non c'e' collegamento. */
function daiSemi(cerca: string, limite: number) {
  const q = cerca.trim().toLowerCase()
  /* La categoria si ignora di proposito: i semi non portano i rank per
     categoria, e filtrarli darebbe sempre zero risultati -- peggio che
     non filtrare affatto. Con ventotto giochi si vede tutto comunque. */
  return SEMI
    .filter((g) => !q || g.nome.toLowerCase().includes(q))
    .slice(0, limite)
}

export async function sfoglia({ cerca = '', categoria = 'tutti' as Categoria, limite = 60 } = {}):
  Promise<{ giochi: Gioco[]; daDatabase: boolean }> {
  if (!supabase) return { giochi: daiSemi(cerca, limite), daDatabase: false }

  let q = supabase.from('giochi').select(CAMPI).limit(limite)

  const cat = CATEGORIE.find((c) => c.id === categoria)
  if (cat?.colonna) {
    // dentro una categoria l'ordine e' il rank DI QUELLA categoria
    q = q.not(cat.colonna, 'is', null).order(cat.colonna, { ascending: true })
  } else {
    q = q.order('posizione', { ascending: true, nullsFirst: false })
  }

  const testo = cerca.trim()
  if (testo) {
    q = q.ilike('nome', `%${testo}%`)
    /* Cercando si vuole trovare, anche cio' che non e' classificato: il
       vincolo sul rank resta solo quando si sfoglia. */
    if (!cat?.colonna) q = q.order('votanti', { ascending: false, nullsFirst: false })
  } else if (!cat?.colonna) {
    q = q.not('posizione', 'is', null)
  }

  // le espansioni non sono giochi da mettere sul ripiano
  q = q.eq('espansione', false)

  const { data, error } = await q
  if (error || !data) {
    console.warn('catalogo non raggiungibile, uso i semi:', error?.message)
    return { giochi: daiSemi(cerca, limite), daDatabase: false }
  }
  return { giochi: (data as unknown as Riga[]).map(daRiga), daDatabase: true }
}

/** I giochi di cui l'app ha bisogno per nome proprio: collezione,
 *  ripiano, partite. Si chiedono tutti insieme, non uno alla volta. */
export async function perIdi(ids: number[]): Promise<Gioco[]> {
  if (!ids.length) return []
  if (!supabase) return SEMI.filter((g) => ids.includes(g.id))

  const { data, error } = await supabase.from('giochi').select(CAMPI).in('id', ids)
  if (error || !data) return SEMI.filter((g) => ids.includes(g.id))
  return (data as unknown as Riga[]).map(daRiga)
}

/* CHIEDE I DETTAGLI A BGG SOLO SE MANCANO.
 *
 * `giocatoriMin` nullo vuol dire che di questo gioco sappiamo solo cio'
 * che c'era nel dump. La function li recupera, li scrive in cache per
 * tutti, e da quel momento nessuno li richiede piu'. */
export async function assicuraDettagli(giochi: Gioco[]): Promise<Gioco[]> {
  if (!supabase) return giochi
  const mancanti = giochi.filter((g) => g.giocatoriMin === null).map((g) => g.id)
  if (!mancanti.length) return giochi

  try {
    const { data: { session } } = await supabase.auth.getSession()
    const chiave = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
    // il limite di venti e' di BGG, non nostro
    const r = await fetch(funzione('dettagli') + '?ids=' + mancanti.slice(0, 10).join(','), {
      headers: {
        apikey: chiave,
        Authorization: 'Bearer ' + (session?.access_token || chiave),
      },
    })
    if (!r.ok) return giochi
    const { schede } = await r.json() as { schede: Array<Riga & { nome: string }> }
    const per = new Map(schede.map((s) => [s.id, s]))
    return giochi.map((g) => {
      const s = per.get(g.id)
      return s ? { ...g, ...daRiga({ ...s, posizione: g.posizione, voto_medio: g.votoMedio }) } : g
    })
  } catch (e) {
    /* Un dettaglio mancante non deve impedire di vedere il gioco: si
       mostra quel che si sa. */
    console.warn('dettagli non recuperati:', e)
    return giochi
  }
}
