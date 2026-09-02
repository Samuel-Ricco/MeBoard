/* L'UNICO PUNTO CHE PARLA CON BGG.
 *
 * Tre ragioni per cui il client non ci arriva mai da solo:
 *
 *  1. l'API XML risponde 401 senza token, e il token non puo' stare in un
 *     bundle che chiunque puo' leggere;
 *  2. le immagini di cf.geekdo-images.com NON mandano header CORS, quindi
 *     una texture WebGL presa da li' resta vuota -- lezione gia' pagata
 *     nella versione precedente;
 *  3. il catalogo va scritto solo da qui: e' condiviso fra tutti gli
 *     utenti, e nessun client deve poterlo sporcare.
 *
 * Tre rotte:
 *   GET /bgg/cerca?q=root
 *   GET /bgg/dettagli?ids=224517,342942     -> normalizza E scrive in `giochi`
 *   GET /bgg/copertina?u=<url di geekdo>    -> rilancia i byte con CORS
 */

import { createClient } from 'npm:@supabase/supabase-js@2'

const BASE = 'https://boardgamegeek.com/xmlapi2'

/* Il token sta nei segreti della function e da nessun'altra parte:
 *   supabase secrets set BGG_TOKEN=... */
const token = () => Deno.env.get('BGG_TOKEN') || ''

const origini = (Deno.env.get('BGG_ORIGINI') || '')
  .split(',').map((s) => s.trim()).filter(Boolean)

/* Il CDN di BGG e nient'altro. Senza questo elenco `copertina` sarebbe un
   proxy aperto: chiunque potrebbe farsi scaricare qualunque indirizzo
   dalla nostra function, a spese nostre e col nostro indirizzo IP. */
const CDN_AMMESSI = ['cf.geekdo-images.com', 'geekdo-images.com']

function intestazioni(origine: string | null) {
  /* In sviluppo si lavora da localhost su porte che cambiano: se non e'
     configurata nessuna origine si lascia passare tutto, in produzione si
     mette BGG_ORIGINI e si stringe. */
  const ok = !origini.length || (origine && origini.includes(origine))
  return {
    'Access-Control-Allow-Origin': ok ? (origine || '*') : 'null',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Vary': 'Origin',
  }
}

const json = (stato: number, corpo: unknown, cors: HeadersInit) =>
  new Response(JSON.stringify(corpo), {
    status: stato,
    headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' },
  })

/* BGG mette in coda le richieste pesanti e risponde 202 "riprova fra
   poco". Non e' un errore: e' il suo modo di dire aspetta. */
async function api(percorso: string, tentativi = 4): Promise<string> {
  for (let i = 0; i < tentativi; i++) {
    const r = await fetch(BASE + percorso, {
      headers: {
        'Authorization': 'Bearer ' + token(),
        'User-Agent': 'meboard/1.0 (edge function)',
        'Accept': 'application/xml',
      },
    })
    if (r.status === 202 || r.status === 429) {
      await new Promise((ok) => setTimeout(ok, 700 * (i + 1)))
      continue
    }
    if (!r.ok) throw new Error('BGG ' + r.status)
    return await r.text()
  }
  throw new Error('BGG in coda: troppi tentativi')
}

/* ---- lettura dell'XML ----
 * Niente parser DOM: servono cinque attributi per gioco e le espressioni
 * regolari bastano. Se un campo manca resta null, che e' esattamente cio'
 * che va scritto in tabella. */

const attr = (xml: string, tag: string, chiave = 'value') => {
  const m = xml.match(new RegExp(`<${tag}[^>]*\\s${chiave}="([^"]*)"`))
  return m ? decodifica(m[1]) : null
}
const testo = (xml: string, tag: string) => {
  const m = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))
  return m ? decodifica(m[1].trim()) : null
}
const numero = (v: string | null) => {
  if (v === null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}
const decodifica = (s: string) =>
  s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
   .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'")
   .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))

type Scheda = {
  id: number
  nome: string | null
  anno: number | null
  editore: string | null
  giocatori_min: number | null
  giocatori_max: number | null
  durata_min: number | null
  durata_max: number | null
  peso: number | null
  copertina_url: string | null
  miniatura_url: string | null
}

function leggiSchede(xml: string): Scheda[] {
  const schede: Scheda[] = []
  for (const pezzo of xml.split('<item ').slice(1)) {
    const id = numero((pezzo.match(/^[^>]*\sid="(\d+)"/) || [])[1] ?? null)
    if (id === null) continue

    // il nome primario, non il primo alias in lingua straniera
    const primario = pezzo.match(/<name[^>]*type="primary"[^>]*value="([^"]*)"/)
    // il primo editore elencato: gli altri sono edizioni e ristampe
    const editore = pezzo.match(/<link[^>]*type="boardgamepublisher"[^>]*value="([^"]*)"/)

    schede.push({
      id,
      nome: primario ? decodifica(primario[1]) : null,
      anno: numero(attr(pezzo, 'yearpublished')),
      editore: editore ? decodifica(editore[1]) : null,
      giocatori_min: numero(attr(pezzo, 'minplayers')),
      giocatori_max: numero(attr(pezzo, 'maxplayers')),
      durata_min: numero(attr(pezzo, 'minplaytime')),
      durata_max: numero(attr(pezzo, 'maxplaytime')),
      peso: numero(attr(pezzo, 'averageweight')),   // vuole &stats=1
      copertina_url: testo(pezzo, 'image'),
      miniatura_url: testo(pezzo, 'thumbnail'),
    })
  }
  return schede
}

/* Il client scrive solo le proprie righe, protette da RLS. Il catalogo e'
   di tutti e lo scrive soltanto la function, con la chiave di servizio. */
const servizio = () => createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } },
)

Deno.serve(async (req) => {
  const url = new URL(req.url)
  const cors = intestazioni(req.headers.get('origin'))

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (req.method !== 'GET') return json(405, { errore: 'solo GET' }, cors)
  if (!token()) return json(500, { errore: 'BGG_TOKEN non configurato' }, cors)

  const dove = url.pathname.split('/').filter(Boolean).pop()

  try {
    /* ---- cercare per nome ---- */
    if (dove === 'cerca') {
      const q = (url.searchParams.get('q') || '').trim()
      if (q.length < 2) return json(400, { errore: 'query troppo corta' }, cors)

      const xml = await api('/search?type=boardgame&query=' + encodeURIComponent(q))
      const esiti = xml.split('<item ').slice(1).map((p) => ({
        id: numero((p.match(/^[^>]*\sid="(\d+)"/) || [])[1] ?? null),
        nome: (p.match(/<name[^>]*value="([^"]*)"/) || [])[1] ?? null,
        anno: numero(attr(p, 'yearpublished')),
      })).filter((e) => e.id !== null)

      return json(200, { esiti: esiti.slice(0, 40) }, cors)
    }

    /* ---- i dettagli, e la scrittura in cache ---- */
    if (dove === 'dettagli') {
      const ids = (url.searchParams.get('ids') || '')
        .split(',').map((s) => s.trim()).filter((s) => /^\d+$/.test(s))
      if (!ids.length) return json(400, { errore: 'manca ids' }, cors)
      // il limite e' di BGG, non nostro
      if (ids.length > 20) return json(400, { errore: 'al massimo 20 id' }, cors)

      const xml = await api('/thing?stats=1&id=' + ids.join(','))
      const schede = leggiSchede(xml)

      /* Si scrive anche se il client non lo chiede: un gioco chiesto una
         volta non si richiede piu', per nessuno. E' tutto il senso della
         cache. Il nome NON si sovrascrive se BGG non lo da': quello del
         dump e' gia' buono. */
      if (schede.length) {
        const { error } = await servizio().from('giochi').upsert(
          schede.map((s) => ({
            id: s.id,
            ...(s.nome ? { nome: s.nome } : {}),
            ...(s.anno ? { anno: s.anno } : {}),
            editore: s.editore,
            giocatori_min: s.giocatori_min,
            giocatori_max: s.giocatori_max,
            durata_min: s.durata_min,
            durata_max: s.durata_max,
            peso: s.peso,
            copertina_url: s.copertina_url,
            miniatura_url: s.miniatura_url,
            dettagli_il: new Date().toISOString(),
            aggiornato: new Date().toISOString(),
          })),
          { onConflict: 'id' },
        )
        // se la scrittura fallisce il client ha comunque i suoi dati:
        // la cache e' un'ottimizzazione, non la sorgente
        if (error) console.error('upsert giochi:', error.message)
      }

      return json(200, { schede }, cors)
    }

    /* ---- la copertina, rilanciata byte per byte ----
     * Prende l'INDIRIZZO, non l'id: quello ce l'abbiamo gia' in tabella
     * dai dettagli, e ripartire dall'id vorrebbe dire un secondo giro su
     * un'API a consumo. */
    if (dove === 'copertina') {
      const grezzo = url.searchParams.get('u')
      if (!grezzo) return json(400, { errore: 'manca u' }, cors)

      let immagine: URL
      try { immagine = new URL(grezzo) } catch { return json(400, { errore: 'indirizzo non valido' }, cors) }

      const host = immagine.hostname.toLowerCase()
      const ammesso = CDN_AMMESSI.some((d) => host === d || host.endsWith('.' + d))
      if (immagine.protocol !== 'https:' || !ammesso) {
        return json(403, { errore: 'indirizzo non ammesso: ' + host }, cors)
      }

      const im = await fetch(immagine, {
        headers: { 'User-Agent': 'meboard/1.0 (edge function)' },
      })
      if (!im.ok) return json(502, { errore: 'immagine ' + im.status }, cors)

      return new Response(im.body, {
        status: 200,
        headers: {
          ...cors,
          'Content-Type': im.headers.get('content-type') || 'image/jpeg',
          // le copertine non cambiano: si tengono un mese
          'Cache-Control': 'public, max-age=2592000, immutable',
        },
      })
    }

    return json(404, { errore: 'rotta sconosciuta: ' + dove }, cors)
  } catch (e) {
    return json(502, { errore: String((e as Error).message || e) }, cors)
  }
})
