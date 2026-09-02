import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

/* LA TAVOLOZZA.
 *
 * Tre scelte: chiaro, scuro, o "come il telefono". La terza e' il
 * predefinito perche' su un telefono il tema di sistema cambia da solo la
 * sera, e un'app che resta scura a mezzogiorno o chiara di notte sembra
 * sempre sbagliata.
 *
 * STA IN UN CONTESTO, e non e' pedanteria: la tavolozza la cambia il
 * profilo ma la deve sapere anche la scena 3D, che ci tinge il mobile. Con
 * un hook a stato locale ognuno avrebbe la sua copia, e il Kallax
 * resterebbe cioccolato dentro un'app diventata di carta.
 *
 * ATTENZIONE ALL'ORDINE: l'attributo va scritto PRIMA che la pagina si
 * dipinga, se no si vede l'app partire di un colore e cambiare un attimo
 * dopo. Per questo esiste anche lo scriptino in `index.html`: quello decide
 * il colore del primo fotogramma, questo modulo tiene il resto.
 */

export type Tavolozza = 'chiaro' | 'scuro' | 'auto'

export const CHIAVE_TEMA = 'meboard.tavolozza'

const scuroDiSistema = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches

function leggiTavolozza(): Tavolozza {
  try {
    const v = localStorage.getItem(CHIAVE_TEMA)
    if (v === 'chiaro' || v === 'scuro' || v === 'auto') return v
  } catch { /* finestra privata o spazio esaurito */ }
  return 'auto'
}

/** Quale delle due tavolozze e' effettivamente in uso adesso. */
export function risolvi(t: Tavolozza): 'chiaro' | 'scuro' {
  return t === 'auto' ? (scuroDiSistema() ? 'scuro' : 'chiaro') : t
}

type Ctx = {
  scelta: Tavolozza
  attiva: 'chiaro' | 'scuro'
  cambia: (t: Tavolozza) => void
}

const C = createContext<Ctx | null>(null)

export function ProvvedoreTema({ children }: { children: React.ReactNode }) {
  const [scelta, setScelta] = useState<Tavolozza>(leggiTavolozza)
  const [attiva, setAttiva] = useState<'chiaro' | 'scuro'>(() => risolvi(leggiTavolozza()))

  const applica = useCallback((t: Tavolozza) => {
    const r = risolvi(t)
    document.documentElement.setAttribute('data-tema', r)
    setAttiva(r)
  }, [])

  const cambia = useCallback((t: Tavolozza) => {
    setScelta(t)
    applica(t)
    try { localStorage.setItem(CHIAVE_TEMA, t) } catch { /* niente da fare */ }
  }, [applica])

  /* Su "auto" bisogna stare in ascolto: il telefono passa a scuro da solo
     al tramonto, e l'app deve seguirlo senza che si riapra. */
  useEffect(() => {
    applica(scelta)
    if (scelta !== 'auto' || typeof matchMedia !== 'function') return
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const suCambio = () => applica('auto')
    mq.addEventListener('change', suCambio)
    return () => mq.removeEventListener('change', suCambio)
  }, [scelta, applica])

  const valore = useMemo(() => ({ scelta, attiva, cambia }), [scelta, attiva, cambia])
  return <C.Provider value={valore}>{children}</C.Provider>
}

export function useTavolozza() {
  const v = useContext(C)
  if (!v) throw new Error('useTavolozza fuori dal ProvvedoreTema')
  return v
}

/** Legge un colore dichiarato dalla tavolozza. Serve alla scena 3D, che
 *  deve tingersi come il resto invece di avere i suoi colori a parte. */
export function coloreDiTema(nome: string, ripiego: string) {
  if (typeof getComputedStyle !== 'function') return ripiego
  const v = getComputedStyle(document.documentElement).getPropertyValue(nome).trim()
  return v || ripiego
}
