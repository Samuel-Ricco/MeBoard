import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { SEMI } from './semi'
import { perIdi } from './catalogo'
import type { Gioco } from './gioco'
import { CELLE } from '../scene/mobile'
import { ASPETTO_INIZIALE, dentro, LEGNI, MURI, PAVIMENTI, LUCI, type Aspetto } from '../scene/finiture'

/* LO STATO DELL'APP.
 *
 * Qui dentro si tengono solo ID, mai copie dei giochi. Il nome, l'anno e
 * la copertina stanno nel catalogo -- che e' la cache di BGG -- e si
 * ricompongono al bisogno. Copiarli qui vorrebbe dire avere due verita'
 * che col tempo divergono, e la seconda sarebbe sempre quella vecchia.
 *
 * Tutto e' specchiato in localStorage. Quando arrivera' la
 * sincronizzazione col database cambia solo questo file: le schermate
 * parlano con le azioni, non con la persistenza.
 */

export type Partita = {
  id: string
  giocoId: number
  data: string            // ISO, solo giorno
  giocatori: string[]
  vincitore?: string
  durata?: number         // minuti
}

export type Recensione = {
  voto: number            // 1..10, come su BGG
  testo: string
  quando: string
}

export type Etichetta = { id: string; nome: string }

export type Profilo = {
  nick: string
  /** il colore del meeple: e' tutta l'identita' che serve senza un account */
  tinta: string
}

type Stato = {
  collezione: number[]
  scaffale: number[]      // nell'ORDINE delle caselle
  desideri: number[]
  partite: Partita[]
  recensioni: Record<number, Recensione>
  etichette: Etichetta[]
  etichetteDi: Record<number, string[]>
  giocatori: string[]
  profilo: Profilo
  /** com'e' fatta e come si dispone la libreria */
  aspetto: Aspetto
}

/* La versione sale perche' gli id sono cambiati: erano slug inventati
   ('wingspan'), ora sono quelli di BGG (266192). Uno stato vecchio non e'
   recuperabile -- meglio ripartire pulito che mostrare uno scaffale di
   giochi che non si risolvono. */
const CHIAVE = 'meboard.stato.v2'

const idSemi = SEMI.map((g) => g.id)

const INIZIALE: Stato = {
  collezione: idSemi.slice(0, 14),
  /* meno del ripiano che della collezione: cosi' il gesto "aggiungi"
     e' subito disponibile invece di nascere disabilitato */
  scaffale: idSemi.slice(0, 10),
  desideri: idSemi.slice(14, 17),
  partite: [],
  recensioni: {},
  etichette: [
    { id: 'e1', nome: 'in due' },
    { id: 'e2', nome: 'strategici' },
    { id: 'e3', nome: 'da tavolata' },
  ],
  etichetteDi: {},
  giocatori: ['Samuel', 'Giulia', 'Marco', 'Elia'],
  profilo: { nick: 'Samuel', tinta: '#CCFF4D' },
  aspetto: ASPETTO_INIZIALE,
}

/* JSON non conosce le chiavi numeriche: `{266192: ...}` torna indietro
   come `{"266192": ...}`. Senza questa conversione le recensioni
   risulterebbero tutte assenti, e in silenzio. */
function chiaviNumeriche<T>(v: unknown): Record<number, T> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {}
  const fuori: Record<number, T> = {}
  Object.entries(v as Record<string, T>).forEach(([k, val]) => {
    const n = Number(k)
    if (Number.isFinite(n)) fuori[n] = val
  })
  return fuori
}

function leggi(): Stato {
  try {
    const grezzo = localStorage.getItem(CHIAVE)
    if (!grezzo) return INIZIALE
    const s = JSON.parse(grezzo) as Partial<Stato>
    const arr = <T,>(v: unknown, r: T[]) => (Array.isArray(v) ? (v as T[]) : r)
    return {
      collezione: arr(s.collezione, INIZIALE.collezione),
      scaffale: arr(s.scaffale, INIZIALE.scaffale),
      desideri: arr(s.desideri, INIZIALE.desideri),
      partite: arr(s.partite, INIZIALE.partite),
      recensioni: chiaviNumeriche<Recensione>(s.recensioni),
      etichette: arr(s.etichette, INIZIALE.etichette),
      etichetteDi: chiaviNumeriche<string[]>(s.etichetteDi),
      giocatori: arr(s.giocatori, INIZIALE.giocatori),
      profilo: { ...INIZIALE.profilo, ...(s.profilo ?? {}) },
      /* Le finiture si ripassano dalle liste: un colore arrivato da uno
         stato vecchio, o scritto a mano, non deve poter dipingere. */
      aspetto: (() => {
        const a = { ...ASPETTO_INIZIALE, ...((s.aspetto ?? {}) as Partial<Aspetto>) }
        return {
          ...a,
          legno: dentro(LEGNI, a.legno, null),
          muro: dentro(MURI, a.muro, null),
          pavimento: dentro(PAVIMENTI, a.pavimento, null),
          luce: dentro(LUCI, a.luce, ASPETTO_INIZIALE.luce) ?? ASPETTO_INIZIALE.luce,
          forza: Math.min(2, Math.max(0, Number(a.forza) || 1)),
        }
      })(),
    }
  } catch {
    return INIZIALE
  }
}

const oggi = () => {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

type Azioni = {
  stato: Stato
  celle: number
  pieno: boolean
  /** i giochi risolti dal catalogo, per id */
  giochi: Map<number, Gioco>
  giochiScaffale: Gioco[]
  giochiCollezione: Gioco[]
  giochiDesiderati: Gioco[]
  aggiungiAScaffale: (id: number) => void
  togliDaScaffale: (id: number) => void
  scambiaSuScaffale: (da: number, a: number) => void
  cambiaPossesso: (id: number, posseduto: boolean) => void
  cambiaDesiderio: (id: number, voluto: boolean) => void
  salvaRecensione: (giocoId: number, voto: number, testo: string) => void
  eliminaRecensione: (giocoId: number) => void
  creaEtichetta: (nome: string) => void
  eliminaEtichetta: (id: string) => void
  cambiaEtichettaGioco: (giocoId: number, etichettaId: string, dentro: boolean) => void
  etichetteDelGioco: (giocoId: number) => Etichetta[]
  aggiungiGiocatore: (nome: string) => void
  togliGiocatore: (nome: string) => void
  salvaProfilo: (p: Partial<Profilo>) => void
  cambiaAspetto: (p: Partial<Aspetto>) => void
  registraPartita: (p: Omit<Partita, 'id'>) => void
  eliminaPartita: (id: string) => void
  partiteDelGioco: (giocoId: number) => Partita[]
}

/* COME SI DISPONGONO LE SCATOLE NELLE CASELLE.
 *
 * "Come li metto io" e' l'ordine dell'elenco e non si tocca. Gli altri
 * sono criteri: finche' sono attivi, spostare a mano non ha senso e il
 * pannello lo dice invece di lasciare frecce che non fanno niente.
 *
 * Un gioco senza il dato su cui si ordina va IN FONDO, non davanti: un
 * gioco mai giocato non e' "giocato tantissimo tempo fa", e un gioco
 * senza rank non e' il migliore di tutti. */
function disponi(giochi: Gioco[], ordine: Aspetto['ordine'], s: Stato): Gioco[] {
  if (ordine === 'mano') return giochi
  const v = giochi.slice()
  const inFondo = (x: number | null | undefined) => (x === null || x === undefined ? Infinity : x)

  if (ordine === 'nome') return v.sort((a, b) => a.nome.localeCompare(b.nome, 'it'))
  if (ordine === 'rank') return v.sort((a, b) => inFondo(a.posizione) - inFondo(b.posizione))
  if (ordine === 'voto') {
    return v.sort((a, b) =>
      (s.recensioni[b.id]?.voto ?? -1) - (s.recensioni[a.id]?.voto ?? -1))
  }
  // giocati di recente: l'ultima partita di ciascuno
  const ultima = new Map<number, string>()
  s.partite.forEach((p) => {
    const c = ultima.get(p.giocoId)
    if (!c || p.data > c) ultima.set(p.giocoId, p.data)
  })
  return v.sort((a, b) => (ultima.get(b.id) ?? '').localeCompare(ultima.get(a.id) ?? ''))
}

const Ctx = createContext<Azioni | null>(null)

export function ProvvedoreStato({ children }: { children: React.ReactNode }) {
  const [stato, setStato] = useState<Stato>(leggi)
  /* I giochi citati dagli id, risolti dal catalogo. Parte dai semi cosi'
     la prima schermata ha gia' qualcosa da disegnare invece di apparire
     vuota per un istante. */
  const [giochi, setGiochi] = useState<Map<number, Gioco>>(
    () => new Map(SEMI.map((g) => [g.id, g])))

  useEffect(() => {
    try { localStorage.setItem(CHIAVE, JSON.stringify(stato)) } catch { /* niente da fare */ }
  }, [stato])

  /* Tutti gli id che l'app deve saper mostrare. Quelli che non conosce
     ancora si chiedono al catalogo in un colpo solo, non uno per volta. */
  const citati = useMemo(() => {
    const s = new Set<number>([...stato.collezione, ...stato.scaffale, ...stato.desideri])
    stato.partite.forEach((p) => s.add(p.giocoId))
    Object.keys(stato.recensioni).forEach((k) => s.add(Number(k)))
    return [...s]
  }, [stato.collezione, stato.scaffale, stato.desideri, stato.partite, stato.recensioni])

  useEffect(() => {
    const mancanti = citati.filter((id) => !giochi.has(id))
    if (!mancanti.length) return
    let vivo = true
    perIdi(mancanti).then((trovati) => {
      if (!vivo || !trovati.length) return
      setGiochi((prima) => {
        const dopo = new Map(prima)
        trovati.forEach((g) => dopo.set(g.id, g))
        return dopo
      })
    })
    return () => { vivo = false }
  }, [citati, giochi])

  const risolvi = useCallback(
    (ids: number[]) => ids.map((id) => giochi.get(id)).filter((g): g is Gioco => !!g),
    [giochi])

  const aggiungiAScaffale = useCallback((id: number) => {
    setStato((s) => (s.scaffale.includes(id) || s.scaffale.length >= CELLE)
      ? s
      : { ...s, scaffale: [...s.scaffale, id] })
  }, [])

  const togliDaScaffale = useCallback((id: number) => {
    setStato((s) => ({ ...s, scaffale: s.scaffale.filter((x) => x !== id) }))
  }, [])

  /* SCAMBIO, non scorrimento: su una griglia far scalare gli altri
     rimescolerebbe tutte le caselle successive. */
  const scambiaSuScaffale = useCallback((da: number, a: number) => {
    setStato((s) => {
      if (da === a || da < 0 || a < 0 || da >= s.scaffale.length || a >= s.scaffale.length) return s
      const v = s.scaffale.slice()
      ;[v[da], v[a]] = [v[a], v[da]]
      return { ...s, scaffale: v }
    })
  }, [])

  const cambiaPossesso = useCallback((id: number, posseduto: boolean) => {
    setStato((s) => ({
      ...s,
      collezione: posseduto
        ? (s.collezione.includes(id) ? s.collezione : [...s.collezione, id])
        : s.collezione.filter((x) => x !== id),
      // un ripiano con sopra roba che non hai piu' non ha senso
      scaffale: posseduto ? s.scaffale : s.scaffale.filter((x) => x !== id),
      // e comprarlo lo toglie dai desideri: e' lo stesso gesto da due lati
      desideri: posseduto ? s.desideri.filter((x) => x !== id) : s.desideri,
    }))
  }, [])

  const cambiaDesiderio = useCallback((id: number, voluto: boolean) => {
    setStato((s) => ({
      ...s,
      desideri: voluto
        ? (s.desideri.includes(id) ? s.desideri : [...s.desideri, id])
        : s.desideri.filter((x) => x !== id),
    }))
  }, [])

  const salvaRecensione = useCallback((giocoId: number, voto: number, testo: string) => {
    setStato((s) => ({
      ...s,
      recensioni: { ...s.recensioni, [giocoId]: { voto, testo: testo.trim(), quando: oggi() } },
    }))
  }, [])

  const eliminaRecensione = useCallback((giocoId: number) => {
    setStato((s) => {
      const r = { ...s.recensioni }
      delete r[giocoId]
      return { ...s, recensioni: r }
    })
  }, [])

  const creaEtichetta = useCallback((nome: string) => {
    const pulito = nome.trim()
    if (!pulito) return
    setStato((s) => s.etichette.some((e) => e.nome.toLowerCase() === pulito.toLowerCase())
      ? s
      : { ...s, etichette: [...s.etichette, { id: 'e' + Date.now(), nome: pulito }] })
  }, [])

  const eliminaEtichetta = useCallback((id: string) => {
    setStato((s) => {
      /* Via l'etichetta, via i riferimenti: se no restano puntatori a
         un'etichetta che non esiste e i filtri smettono di trovare
         senza spiegare perche'. */
      const etichetteDi: Record<number, string[]> = {}
      Object.entries(s.etichetteDi).forEach(([g, v]) => {
        const resto = v.filter((x) => x !== id)
        if (resto.length) etichetteDi[Number(g)] = resto
      })
      return { ...s, etichette: s.etichette.filter((e) => e.id !== id), etichetteDi }
    })
  }, [])

  const cambiaEtichettaGioco = useCallback((giocoId: number, etichettaId: string, dentro: boolean) => {
    setStato((s) => {
      const ora = s.etichetteDi[giocoId] ?? []
      const dopo = dentro
        ? (ora.includes(etichettaId) ? ora : [...ora, etichettaId])
        : ora.filter((x) => x !== etichettaId)
      const etichetteDi = { ...s.etichetteDi }
      if (dopo.length) etichetteDi[giocoId] = dopo
      else delete etichetteDi[giocoId]
      return { ...s, etichetteDi }
    })
  }, [])

  const aggiungiGiocatore = useCallback((nome: string) => {
    const pulito = nome.trim()
    if (!pulito) return
    setStato((s) => s.giocatori.some((g) => g.toLowerCase() === pulito.toLowerCase())
      ? s
      : { ...s, giocatori: [...s.giocatori, pulito] })
  }, [])

  const togliGiocatore = useCallback((nome: string) => {
    /* Le partite gia' segnate NON si toccano: erano vere quando sono
       state scritte, e riscrivere il passato per far quadrare un elenco
       e' il modo migliore per perdere dati. */
    setStato((s) => ({ ...s, giocatori: s.giocatori.filter((g) => g !== nome) }))
  }, [])

  const salvaProfilo = useCallback((p: Partial<Profilo>) => {
    setStato((s) => ({ ...s, profilo: { ...s.profilo, ...p } }))
  }, [])

  const cambiaAspetto = useCallback((p: Partial<Aspetto>) => {
    setStato((s) => ({ ...s, aspetto: { ...s.aspetto, ...p } }))
  }, [])

  const registraPartita = useCallback((p: Omit<Partita, 'id'>) => {
    setStato((s) => ({ ...s, partite: [{ ...p, id: `p${Date.now()}` }, ...s.partite] }))
  }, [])

  const eliminaPartita = useCallback((id: string) => {
    setStato((s) => ({ ...s, partite: s.partite.filter((p) => p.id !== id) }))
  }, [])

  const valore = useMemo<Azioni>(() => ({
    stato,
    celle: CELLE,
    pieno: stato.scaffale.length >= CELLE,
    giochi,
    /* L'ordine del mobile e' quello dell'elenco -- cioe' come le hai
       messe tu -- a meno che non si sia scelto un criterio. */
    giochiScaffale: disponi(risolvi(stato.scaffale), stato.aspetto.ordine, stato),
    giochiCollezione: risolvi(stato.collezione)
      .sort((a, b) => a.nome.localeCompare(b.nome, 'it')),
    giochiDesiderati: risolvi(stato.desideri),
    etichetteDelGioco: (giocoId) => {
      const ids = stato.etichetteDi[giocoId] ?? []
      return stato.etichette.filter((e) => ids.includes(e.id))
    },
    partiteDelGioco: (giocoId) => stato.partite.filter((p) => p.giocoId === giocoId),
    aggiungiAScaffale, togliDaScaffale, scambiaSuScaffale,
    cambiaPossesso, cambiaDesiderio,
    salvaRecensione, eliminaRecensione,
    creaEtichetta, eliminaEtichetta, cambiaEtichettaGioco,
    aggiungiGiocatore, togliGiocatore, salvaProfilo, cambiaAspetto,
    registraPartita, eliminaPartita,
  }), [stato, giochi, risolvi, aggiungiAScaffale, togliDaScaffale, scambiaSuScaffale,
       cambiaPossesso, cambiaDesiderio, salvaRecensione, eliminaRecensione,
       creaEtichetta, eliminaEtichetta, cambiaEtichettaGioco,
       aggiungiGiocatore, togliGiocatore, salvaProfilo, cambiaAspetto,
       registraPartita, eliminaPartita])

  return <Ctx.Provider value={valore}>{children}</Ctx.Provider>
}

export function useStato() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useStato fuori dal ProvvedoreStato')
  return v
}
