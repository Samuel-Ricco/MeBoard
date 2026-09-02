import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { CATALOGO, perId, type Gioco } from './giochi'
import { CELLE } from '../scene/mobile'

/* LO STATO DELL'APP, SENZA DATABASE.
 *
 * Tutto vive in memoria e viene specchiato in localStorage. Quando
 * arrivera' un backend cambia solo questo file: le schermate parlano con
 * le azioni, non con la persistenza.
 */

export type Partita = {
  id: string
  giocoId: string
  data: string            // ISO, solo giorno
  giocatori: string[]
  vincitore?: string
  durata?: number         // minuti
}

type Stato = {
  collezione: string[]    // id dei giochi posseduti
  scaffale: string[]      // id sullo scaffale 3D, NELL'ORDINE in cui stanno
  partite: Partita[]
}

const CHIAVE = 'meboard.stato.v1'

const INIZIALE: Stato = {
  collezione: ['wingspan', 'azul', 'ticket', 'carcassonne', 'root', 'hive', 'patchwork',
               'brass', 'splendor', 'cascadia', 'everdell', 'kingdomino', 'ark', 'scythe'],
  /* meno dello scaffale che della collezione: cosi' il gesto "aggiungi"
     e' subito disponibile invece di nascere disabilitato */
  scaffale: ['scythe', 'wingspan', 'root', 'azul', 'brass', 'everdell', 'ticket',
             'cascadia', 'carcassonne', 'ark'],
  partite: [
    { id: 'p1', giocoId: 'wingspan',  data: '2026-08-29', giocatori: ['Samuel', 'Giulia'], vincitore: 'Giulia', durata: 55 },
    { id: 'p2', giocoId: 'brass',     data: '2026-08-24', giocatori: ['Samuel', 'Marco', 'Elia'], vincitore: 'Samuel', durata: 135 },
    { id: 'p3', giocoId: 'azul',      data: '2026-08-21', giocatori: ['Samuel', 'Giulia'], vincitore: 'Samuel', durata: 38 },
    { id: 'p4', giocoId: 'root',      data: '2026-08-15', giocatori: ['Samuel', 'Marco', 'Elia', 'Giulia'], vincitore: 'Elia', durata: 95 },
  ],
}

function leggi(): Stato {
  try {
    const grezzo = localStorage.getItem(CHIAVE)
    if (!grezzo) return INIZIALE
    const s = JSON.parse(grezzo) as Partial<Stato>
    return {
      collezione: Array.isArray(s.collezione) ? s.collezione : INIZIALE.collezione,
      scaffale: Array.isArray(s.scaffale) ? s.scaffale : INIZIALE.scaffale,
      partite: Array.isArray(s.partite) ? s.partite : INIZIALE.partite,
    }
  } catch {
    /* finestra privata, spazio esaurito, dati corrotti: si riparte dal
       predefinito invece di lasciare l'app in bianco */
    return INIZIALE
  }
}

type Azioni = {
  stato: Stato
  /** quante caselle ha il mobile */
  celle: number
  /** se il mobile e' pieno non si aggiunge piu' niente */
  pieno: boolean
  giochiScaffale: Gioco[]
  giochiCollezione: Gioco[]
  aggiungiAScaffale: (id: string) => void
  togliDaScaffale: (id: string) => void
  scambiaSuScaffale: (da: number, a: number) => void
  cambiaPossesso: (id: string, posseduto: boolean) => void
  registraPartita: (p: Omit<Partita, 'id'>) => void
  eliminaPartita: (id: string) => void
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
      /* togliere un gioco dalla collezione lo toglie anche dallo scaffale:
         uno scaffale con sopra roba che non hai piu' non ha senso */
      const scaffale = posseduto ? s.scaffale : s.scaffale.filter((x) => x !== id)
      return { ...s, collezione, scaffale }
    })
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
    /* l'ordine dello scaffale e' quello dell'elenco, non quello del catalogo */
    giochiScaffale: stato.scaffale.map(perId).filter((g): g is Gioco => !!g),
    giochiCollezione: CATALOGO.filter((g) => stato.collezione.includes(g.id)),
    aggiungiAScaffale, togliDaScaffale, scambiaSuScaffale,
    cambiaPossesso, registraPartita, eliminaPartita,
  }), [stato, aggiungiAScaffale, togliDaScaffale, scambiaSuScaffale,
       cambiaPossesso, registraPartita, eliminaPartita])

  return <Ctx.Provider value={valore}>{children}</Ctx.Provider>
}

export function useStato() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useStato fuori dal ProvvedoreStato')
  return v
}
