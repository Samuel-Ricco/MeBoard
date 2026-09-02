import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { CATALOGO, perId, type Gioco } from './giochi'
import { CELLE } from '../scene/mobile'

/* LO STATO DELL'APP, SENZA DATABASE.
 *
 * Tutto vive in memoria e viene specchiato in localStorage. Quando
 * arrivera' un backend cambia solo questo file: le schermate parlano con
 * le azioni, non con la persistenza.
 *
 * Restano fuori, perche' un backend lo vogliono per forza: amici, codice
 * amico, e le recensioni degli altri. Quelle proprie invece sono dati
 * personali e stanno benissimo qui.
 */

export type Partita = {
  id: string
  giocoId: string
  data: string            // ISO, solo giorno
  giocatori: string[]
  vincitore?: string
  durata?: number         // minuti
}

export type Recensione = {
  voto: number            // 1..10, come su BGG
  testo: string
  quando: string          // ISO, solo giorno
}

export type Etichetta = { id: string; nome: string }

export type Profilo = {
  nick: string
  /** il colore del meeple: e' tutta l'identita' che serve senza un account */
  tinta: string
}

type Stato = {
  collezione: string[]    // id dei giochi posseduti
  scaffale: string[]      // id nel mobile, NELL'ORDINE delle caselle
  desideri: string[]      // id che vorresti ma non hai
  partite: Partita[]
  recensioni: Record<string, Recensione>
  etichette: Etichetta[]
  etichetteDi: Record<string, string[]>   // giocoId -> id delle etichette
  giocatori: string[]     // chi si siede al tavolo, per non riscriverlo ogni volta
  profilo: Profilo
}

const CHIAVE = 'meboard.stato.v1'

const INIZIALE: Stato = {
  collezione: ['wingspan', 'azul', 'ticket', 'carcassonne', 'root', 'hive', 'patchwork',
               'brass', 'splendor', 'cascadia', 'everdell', 'kingdomino', 'ark', 'scythe'],
  /* meno dello scaffale che della collezione: cosi' il gesto "aggiungi"
     e' subito disponibile invece di nascere disabilitato */
  scaffale: ['scythe', 'wingspan', 'root', 'azul', 'brass', 'everdell', 'ticket',
             'cascadia', 'carcassonne', 'ark'],
  desideri: ['spirit', 'dune'],
  partite: [
    { id: 'p1', giocoId: 'wingspan',  data: '2026-08-29', giocatori: ['Samuel', 'Giulia'], vincitore: 'Giulia', durata: 55 },
    { id: 'p2', giocoId: 'brass',     data: '2026-08-24', giocatori: ['Samuel', 'Marco', 'Elia'], vincitore: 'Samuel', durata: 135 },
    { id: 'p3', giocoId: 'azul',      data: '2026-08-21', giocatori: ['Samuel', 'Giulia'], vincitore: 'Samuel', durata: 38 },
    { id: 'p4', giocoId: 'root',      data: '2026-08-15', giocatori: ['Samuel', 'Marco', 'Elia', 'Giulia'], vincitore: 'Elia', durata: 95 },
  ],
  recensioni: {
    brass: { voto: 9, testo: 'Il migliore per chi ha voglia di pensare. Pesante ma mai noioso.', quando: '2026-08-25' },
    azul:  { voto: 7, testo: 'Elegante e velocissimo. Funziona con chiunque.', quando: '2026-08-22' },
  },
  etichette: [
    { id: 'e1', nome: 'in due' },
    { id: 'e2', nome: 'strategici' },
    { id: 'e3', nome: 'da tavolata' },
  ],
  etichetteDi: {
    brass: ['e2'], root: ['e2'], scythe: ['e2'], ark: ['e2'],
    patchwork: ['e1'], hive: ['e1'], azul: ['e1'],
    ticket: ['e3'], carcassonne: ['e3'], kingdomino: ['e3'],
  },
  giocatori: ['Samuel', 'Giulia', 'Marco', 'Elia'],
  profilo: { nick: 'Samuel', tinta: '#CCFF4D' },
}

/* Si legge campo per campo con un ripiego per ciascuno, invece di fidarsi
   dell'oggetto salvato: cosi' una versione vecchia in localStorage --
   senza recensioni, senza etichette -- non lascia l'app in bianco ma si
   riempie coi valori nuovi. */
function leggi(): Stato {
  try {
    const grezzo = localStorage.getItem(CHIAVE)
    if (!grezzo) return INIZIALE
    const s = JSON.parse(grezzo) as Partial<Stato>
    const arr = <T,>(v: unknown, r: T[]) => (Array.isArray(v) ? (v as T[]) : r)
    const ogg = <T,>(v: unknown, r: T) =>
      (v && typeof v === 'object' && !Array.isArray(v) ? (v as T) : r)
    return {
      collezione: arr(s.collezione, INIZIALE.collezione),
      scaffale: arr(s.scaffale, INIZIALE.scaffale),
      desideri: arr(s.desideri, INIZIALE.desideri),
      partite: arr(s.partite, INIZIALE.partite),
      recensioni: ogg(s.recensioni, INIZIALE.recensioni),
      etichette: arr(s.etichette, INIZIALE.etichette),
      etichetteDi: ogg(s.etichetteDi, INIZIALE.etichetteDi),
      giocatori: arr(s.giocatori, INIZIALE.giocatori),
      profilo: { ...INIZIALE.profilo, ...ogg(s.profilo, {}) },
    }
  } catch {
    /* finestra privata, spazio esaurito, dati corrotti: si riparte dal
       predefinito invece di lasciare l'app in bianco */
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
  /** quante caselle ha il mobile */
  celle: number
  /** se il mobile e' pieno non si aggiunge piu' niente */
  pieno: boolean
  giochiScaffale: Gioco[]
  giochiCollezione: Gioco[]
  giochiDesiderati: Gioco[]
  aggiungiAScaffale: (id: string) => void
  togliDaScaffale: (id: string) => void
  scambiaSuScaffale: (da: number, a: number) => void
  cambiaPossesso: (id: string, posseduto: boolean) => void
  cambiaDesiderio: (id: string, voluto: boolean) => void
  salvaRecensione: (giocoId: string, voto: number, testo: string) => void
  eliminaRecensione: (giocoId: string) => void
  creaEtichetta: (nome: string) => void
  eliminaEtichetta: (id: string) => void
  cambiaEtichettaGioco: (giocoId: string, etichettaId: string, dentro: boolean) => void
  etichetteDelGioco: (giocoId: string) => Etichetta[]
  aggiungiGiocatore: (nome: string) => void
  togliGiocatore: (nome: string) => void
  salvaProfilo: (p: Partial<Profilo>) => void
  registraPartita: (p: Omit<Partita, 'id'>) => void
  eliminaPartita: (id: string) => void
  partiteDelGioco: (giocoId: string) => Partita[]
}

const Ctx = createContext<Azioni | null>(null)

export function ProvvedoreStato({ children }: { children: React.ReactNode }) {
  const [stato, setStato] = useState<Stato>(leggi)

  useEffect(() => {
    try { localStorage.setItem(CHIAVE, JSON.stringify(stato)) } catch { /* niente da fare */ }
  }, [stato])

  /* Il mobile ha un numero FINITO di caselle, e quello e' il punto di
     avere un mobile invece di un elenco: quando e' pieno bisogna scegliere
     cosa togliere. La capienza la detta la scena, non un numero scritto
     qui: se il Kallax cambia formato, cambia da sola. */
  const aggiungiAScaffale = useCallback((id: string) => {
    setStato((s) => (s.scaffale.includes(id) || s.scaffale.length >= CELLE)
      ? s
      : { ...s, scaffale: [...s.scaffale, id] })
  }, [])

  const togliDaScaffale = useCallback((id: string) => {
    setStato((s) => ({ ...s, scaffale: s.scaffale.filter((x) => x !== id) }))
  }, [])

  /* SCAMBIO, non scorrimento.
     Su una fila spostare un elemento e far scalare gli altri e' naturale;
     su una GRIGLIA no -- muovendo una scatola di una riga, uno splice
     rimescolerebbe tutte le caselle successive e l'utente vedrebbe saltare
     mezzo mobile. Due caselle si scambiano il contenuto, e basta. */
  const scambiaSuScaffale = useCallback((da: number, a: number) => {
    setStato((s) => {
      if (da === a || da < 0 || a < 0 || da >= s.scaffale.length || a >= s.scaffale.length) return s
      const v = s.scaffale.slice()
      ;[v[da], v[a]] = [v[a], v[da]]
      return { ...s, scaffale: v }
    })
  }, [])

  const cambiaPossesso = useCallback((id: string, posseduto: boolean) => {
    setStato((s) => {
      const collezione = posseduto
        ? (s.collezione.includes(id) ? s.collezione : [...s.collezione, id])
        : s.collezione.filter((x) => x !== id)
      /* togliere un gioco dalla collezione lo toglie anche dal mobile:
         un ripiano con sopra roba che non hai piu' non ha senso */
      const scaffale = posseduto ? s.scaffale : s.scaffale.filter((x) => x !== id)
      /* e se lo compri smette di essere un desiderio: e' lo stesso gesto
         visto da due parti */
      const desideri = posseduto ? s.desideri.filter((x) => x !== id) : s.desideri
      return { ...s, collezione, scaffale, desideri }
    })
  }, [])

  const cambiaDesiderio = useCallback((id: string, voluto: boolean) => {
    setStato((s) => ({
      ...s,
      desideri: voluto
        ? (s.desideri.includes(id) ? s.desideri : [...s.desideri, id])
        : s.desideri.filter((x) => x !== id),
    }))
  }, [])

  const salvaRecensione = useCallback((giocoId: string, voto: number, testo: string) => {
    setStato((s) => ({
      ...s,
      recensioni: { ...s.recensioni, [giocoId]: { voto, testo: testo.trim(), quando: oggi() } },
    }))
  }, [])

  const eliminaRecensione = useCallback((giocoId: string) => {
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
      /* Sparita l'etichetta, vanno tolti anche i riferimenti: se no
         restano puntatori a un'etichetta che non esiste e i filtri
         cominciano a non trovare niente senza spiegare perche'. */
      const etichetteDi: Record<string, string[]> = {}
      Object.entries(s.etichetteDi).forEach(([g, v]) => {
        const resto = v.filter((x) => x !== id)
        if (resto.length) etichetteDi[g] = resto
      })
      return { ...s, etichette: s.etichette.filter((e) => e.id !== id), etichetteDi }
    })
  }, [])

  const cambiaEtichettaGioco = useCallback((giocoId: string, etichettaId: string, dentro: boolean) => {
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

  const valore = useMemo<Azioni>(() => ({
    stato,
    celle: CELLE,
    pieno: stato.scaffale.length >= CELLE,
    /* l'ordine del mobile e' quello dell'elenco, non quello del catalogo */
    giochiScaffale: stato.scaffale.map(perId).filter((g): g is Gioco => !!g),
    giochiCollezione: CATALOGO.filter((g) => stato.collezione.includes(g.id)),
    giochiDesiderati: CATALOGO.filter((g) => stato.desideri.includes(g.id)),
    etichetteDelGioco: (giocoId) => {
      const ids = stato.etichetteDi[giocoId] ?? []
      return stato.etichette.filter((e) => ids.includes(e.id))
    },
    partiteDelGioco: (giocoId) => stato.partite.filter((p) => p.giocoId === giocoId),
    aggiungiAScaffale, togliDaScaffale, scambiaSuScaffale,
    cambiaPossesso, cambiaDesiderio,
    salvaRecensione, eliminaRecensione,
    creaEtichetta, eliminaEtichetta, cambiaEtichettaGioco,
    aggiungiGiocatore, togliGiocatore, salvaProfilo,
    registraPartita, eliminaPartita,
  }), [stato, aggiungiAScaffale, togliDaScaffale, scambiaSuScaffale,
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
