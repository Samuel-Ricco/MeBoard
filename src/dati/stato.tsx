import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { SEMI } from './semi'
import { perIdi } from './catalogo'
import type { Gioco } from './gioco'
import { CELLE } from '../scene/mobile'
import { coloreValido, type Ordine } from '../scene/finiture'

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
  data: string
  giocatori: string[]
  vincitore?: string
  durata?: number
}

export type Recensione = { voto: number; testo: string; quando: string }
export type Etichetta = { id: string; nome: string }
export type Profilo = { nick: string; tinta: string }

/* UNA LIBRERIA E' UN MOBILE CON LE SUE COSE.
 *
 * Nome, legno, luce e criterio di disposizione stanno QUI e non nella
 * stanza: due mobili nella stessa stanza possono essere di legno diverso,
 * ed e' il motivo per cui se ne tiene piu' d'uno. Muro e pavimento invece
 * sono della stanza, che e' una sola. */
export type Libreria = {
  id: string
  nome: string
  /** null = segue la tavolozza dell'app */
  legno: string | null
  forza: number
  ordine: Ordine
  /** gli id dei giochi, nell'ordine delle caselle */
  caselle: number[]
}

type Stato = {
  collezione: number[]
  desideri: number[]
  partite: Partita[]
  recensioni: Record<number, Recensione>
  etichette: Etichetta[]
  etichetteDi: Record<number, string[]>
  giocatori: string[]
  profilo: Profilo
  librerie: Libreria[]
  /** quale si sta guardando */
  attiva: number
  // ---- della stanza, non del singolo mobile ----
  muro: string | null
  pavimento: string | null
  /** gli ultimi colori scelti col selettore libero */
  mieiColori: string[]
}

/* v3: le librerie sono diventate piu' d'una, e `scaffale` non esiste
   piu'. Uno stato vecchio non e' traducibile senza inventare, quindi si
   riparte pulito. */
const CHIAVE = 'meboard.stato.v3'

const idSemi = SEMI.map((g) => g.id)

const nuovaLibreria = (nome: string, caselle: number[] = []): Libreria => ({
  id: 'l' + Date.now() + Math.random().toString(36).slice(2, 6),
  nome,
  legno: null,
  forza: 1,
  ordine: 'mano',
  caselle,
})

const INIZIALE: Stato = {
  collezione: idSemi.slice(0, 14),
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
  librerie: [{ ...nuovaLibreria('Salotto', idSemi.slice(0, 10)), id: 'l1' }],
  attiva: 0,
  muro: null,
  pavimento: null,
  mieiColori: [],
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
    const librerie = arr<Libreria>(s.librerie, INIZIALE.librerie)
      .filter((l) => l && typeof l.id === 'string')
      .map((l) => ({
        ...l,
        legno: coloreValido(l.legno) ? l.legno : null,
        forza: Math.min(2, Math.max(0, Number(l.forza) || 1)),
        caselle: Array.isArray(l.caselle) ? l.caselle.slice(0, CELLE) : [],
      }))
    return {
      collezione: arr(s.collezione, INIZIALE.collezione),
      desideri: arr(s.desideri, INIZIALE.desideri),
      partite: arr(s.partite, INIZIALE.partite),
      recensioni: chiaviNumeriche<Recensione>(s.recensioni),
      etichette: arr(s.etichette, INIZIALE.etichette),
      etichetteDi: chiaviNumeriche<string[]>(s.etichetteDi),
      giocatori: arr(s.giocatori, INIZIALE.giocatori),
      profilo: { ...INIZIALE.profilo, ...(s.profilo ?? {}) },
      librerie: librerie.length ? librerie : INIZIALE.librerie,
      attiva: Math.min(Math.max(0, Number(s.attiva) || 0), Math.max(0, librerie.length - 1)),
      muro: coloreValido(s.muro) ? s.muro : null,
      pavimento: coloreValido(s.pavimento) ? s.pavimento : null,
      mieiColori: arr<string>(s.mieiColori, []).filter(coloreValido).slice(-12),
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

/* COME SI DISPONGONO LE SCATOLE.
 *
 * "Come li metto io" e' l'ordine delle caselle e non si tocca. Un gioco
 * senza il dato su cui si ordina va IN FONDO, non davanti: un gioco mai
 * giocato non e' "giocato tantissimo tempo fa", e uno senza rank non e'
 * il migliore di tutti. */
function disponi(giochi: Gioco[], ordine: Ordine, s: Stato): Gioco[] {
  if (ordine === 'mano') return giochi
  const v = giochi.slice()
  const inFondo = (x: number | null | undefined) => (x === null || x === undefined ? Infinity : x)

  if (ordine === 'nome') return v.sort((a, b) => a.nome.localeCompare(b.nome, 'it'))
  if (ordine === 'rank') return v.sort((a, b) => inFondo(a.posizione) - inFondo(b.posizione))
  if (ordine === 'voto') {
    return v.sort((a, b) => (s.recensioni[b.id]?.voto ?? -1) - (s.recensioni[a.id]?.voto ?? -1))
  }
  const ultima = new Map<number, string>()
  s.partite.forEach((p) => {
    const c = ultima.get(p.giocoId)
    if (!c || p.data > c) ultima.set(p.giocoId, p.data)
  })
  return v.sort((a, b) => (ultima.get(b.id) ?? '').localeCompare(ultima.get(a.id) ?? ''))
}

type Azioni = {
  stato: Stato
  celle: number
  libreria: Libreria
  pieno: boolean
  giochi: Map<number, Gioco>
  giochiLibreria: Gioco[]
  giochiCollezione: Gioco[]
  giochiDesiderati: Gioco[]
  /** in quale libreria sta un gioco, se c'e' */
  dovEsta: (id: number) => Libreria | null
  metti: (giocoId: number, casella?: number) => void
  togli: (giocoId: number) => void
  scambia: (da: number, a: number) => void
  /** sposta un gioco in un'altra libreria, nella casella data */
  trasloca: (giocoId: number, libreriaId: string, casella: number) => void
  vaiA: (indice: number) => void
  creaLibreria: (nome?: string) => void
  eliminaLibreria: (id: string) => void
  cambiaLibreria: (id: string, p: Partial<Omit<Libreria, 'id' | 'caselle'>>) => void
  cambiaStanza: (p: { muro?: string | null; pavimento?: string | null }) => void
  ricordaColore: (v: string) => void
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
  registraPartita: (p: Omit<Partita, 'id'>) => void
  eliminaPartita: (id: string) => void
  partiteDelGioco: (giocoId: number) => Partita[]
}

const Ctx = createContext<Azioni | null>(null)

export function ProvvedoreStato({ children }: { children: React.ReactNode }) {
  const [stato, setStato] = useState<Stato>(leggi)
  const [giochi, setGiochi] = useState<Map<number, Gioco>>(
    () => new Map(SEMI.map((g) => [g.id, g])))

  useEffect(() => {
    try { localStorage.setItem(CHIAVE, JSON.stringify(stato)) } catch { /* niente da fare */ }
  }, [stato])

  const citati = useMemo(() => {
    const s = new Set<number>([...stato.collezione, ...stato.desideri])
    stato.librerie.forEach((l) => l.caselle.forEach((id) => s.add(id)))
    stato.partite.forEach((p) => s.add(p.giocoId))
    Object.keys(stato.recensioni).forEach((k) => s.add(Number(k)))
    return [...s]
  }, [stato.collezione, stato.desideri, stato.librerie, stato.partite, stato.recensioni])

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

  /** Cambia la libreria che si sta guardando, lasciando stare le altre. */
  const suAttiva = useCallback((f: (l: Libreria) => Libreria) => {
    setStato((s) => ({
      ...s,
      librerie: s.librerie.map((l, i) => (i === s.attiva ? f(l) : l)),
    }))
  }, [])

  const metti = useCallback((giocoId: number, casella?: number) => {
    suAttiva((l) => {
      if (l.caselle.includes(giocoId) || l.caselle.length >= CELLE) return l
      if (casella === undefined || casella >= l.caselle.length) {
        return { ...l, caselle: [...l.caselle, giocoId] }
      }
      const v = l.caselle.slice()
      v.splice(casella, 0, giocoId)
      return { ...l, caselle: v.slice(0, CELLE) }
    })
  }, [suAttiva])

  const togli = useCallback((giocoId: number) => {
    suAttiva((l) => ({ ...l, caselle: l.caselle.filter((x) => x !== giocoId) }))
  }, [suAttiva])

  /* SCAMBIO, non scorrimento: su una griglia far scalare gli altri
     rimescolerebbe tutte le caselle successive. */
  const scambia = useCallback((da: number, a: number) => {
    suAttiva((l) => {
      if (da === a || da < 0 || a < 0 || da >= l.caselle.length || a >= l.caselle.length) return l
      const v = l.caselle.slice()
      ;[v[da], v[a]] = [v[a], v[da]]
      return { ...l, caselle: v }
    })
  }, [suAttiva])

  /* Da una libreria all'altra: si toglie di la' e si mette di qua, in una
     sola scrittura -- se fossero due, fra l'una e l'altra il gioco non
     starebbe da nessuna parte. */
  const trasloca = useCallback((giocoId: number, libreriaId: string, casella: number) => {
    setStato((s) => {
      const arrivo = s.librerie.find((l) => l.id === libreriaId)
      if (!arrivo || arrivo.caselle.length >= CELLE) return s
      return {
        ...s,
        librerie: s.librerie.map((l) => {
          if (l.id === libreriaId) {
            const v = l.caselle.filter((x) => x !== giocoId)
            v.splice(Math.min(casella, v.length), 0, giocoId)
            return { ...l, caselle: v.slice(0, CELLE) }
          }
          return { ...l, caselle: l.caselle.filter((x) => x !== giocoId) }
        }),
      }
    })
  }, [])

  const vaiA = useCallback((indice: number) => {
    setStato((s) => ({
      ...s,
      attiva: Math.min(Math.max(0, indice), s.librerie.length - 1),
    }))
  }, [])

  const creaLibreria = useCallback((nome?: string) => {
    setStato((s) => {
      const l = nuovaLibreria(nome?.trim() || `Libreria ${s.librerie.length + 1}`)
      // si va subito sulla nuova: e' quello che ci si aspetta dopo averla creata
      return { ...s, librerie: [...s.librerie, l], attiva: s.librerie.length }
    })
  }, [])

  const eliminaLibreria = useCallback((id: string) => {
    setStato((s) => {
      // l'ultima non si elimina: senza mobili la schermata non ha senso
      if (s.librerie.length <= 1) return s
      const librerie = s.librerie.filter((l) => l.id !== id)
      return { ...s, librerie, attiva: Math.min(s.attiva, librerie.length - 1) }
    })
  }, [])

  const cambiaLibreria = useCallback((id: string, p: Partial<Omit<Libreria, 'id' | 'caselle'>>) => {
    setStato((s) => ({
      ...s,
      librerie: s.librerie.map((l) => (l.id === id ? { ...l, ...p } : l)),
    }))
  }, [])

  const cambiaStanza = useCallback((p: { muro?: string | null; pavimento?: string | null }) => {
    setStato((s) => ({ ...s, ...p }))
  }, [])

  /* L'ultimo colore scelto resta fra i predefiniti: chi ne trova uno che
     gli piace lo ritrova, senza doverlo ricomporre a memoria. */
  const ricordaColore = useCallback((v: string) => {
    if (!coloreValido(v)) return
    setStato((s) => ({
      ...s,
      mieiColori: [...s.mieiColori.filter((c) => c.toLowerCase() !== v.toLowerCase()), v].slice(-12),
    }))
  }, [])

  const cambiaPossesso = useCallback((id: number, posseduto: boolean) => {
    setStato((s) => ({
      ...s,
      collezione: posseduto
        ? (s.collezione.includes(id) ? s.collezione : [...s.collezione, id])
        : s.collezione.filter((x) => x !== id),
      // un ripiano con sopra roba che non hai piu' non ha senso
      librerie: posseduto
        ? s.librerie
        : s.librerie.map((l) => ({ ...l, caselle: l.caselle.filter((x) => x !== id) })),
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

  const registraPartita = useCallback((p: Omit<Partita, 'id'>) => {
    setStato((s) => ({ ...s, partite: [{ ...p, id: `p${Date.now()}` }, ...s.partite] }))
  }, [])

  const eliminaPartita = useCallback((id: string) => {
    setStato((s) => ({ ...s, partite: s.partite.filter((p) => p.id !== id) }))
  }, [])

  const libreria = stato.librerie[stato.attiva] ?? stato.librerie[0]

  const valore = useMemo<Azioni>(() => ({
    stato,
    celle: CELLE,
    libreria,
    pieno: libreria.caselle.length >= CELLE,
    giochi,
    giochiLibreria: disponi(risolvi(libreria.caselle), libreria.ordine, stato),
    giochiCollezione: risolvi(stato.collezione)
      .sort((a, b) => a.nome.localeCompare(b.nome, 'it')),
    giochiDesiderati: risolvi(stato.desideri),
    dovEsta: (id) => stato.librerie.find((l) => l.caselle.includes(id)) ?? null,
    etichetteDelGioco: (giocoId) => {
      const ids = stato.etichetteDi[giocoId] ?? []
      return stato.etichette.filter((e) => ids.includes(e.id))
    },
    partiteDelGioco: (giocoId) => stato.partite.filter((p) => p.giocoId === giocoId),
    metti, togli, scambia, trasloca,
    vaiA, creaLibreria, eliminaLibreria, cambiaLibreria, cambiaStanza, ricordaColore,
    cambiaPossesso, cambiaDesiderio,
    salvaRecensione, eliminaRecensione,
    creaEtichetta, eliminaEtichetta, cambiaEtichettaGioco,
    aggiungiGiocatore, togliGiocatore, salvaProfilo,
    registraPartita, eliminaPartita,
  }), [stato, libreria, giochi, risolvi, metti, togli, scambia, trasloca,
       vaiA, creaLibreria, eliminaLibreria, cambiaLibreria, cambiaStanza, ricordaColore,
       cambiaPossesso, cambiaDesiderio, salvaRecensione, eliminaRecensione,
       creaEtichetta, eliminaEtichetta, cambiaEtichettaGioco,
       aggiungiGiocatore, togliGiocatore, salvaProfilo,
       registraPartita, eliminaPartita])

  return <Ctx.Provider value={valore}>{children}</Ctx.Provider>
}

export function useStato() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useStato fuori dal ProvvedoreStato')
  return v
}
