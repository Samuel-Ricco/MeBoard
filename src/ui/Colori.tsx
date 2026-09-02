import { useRef } from 'react'
import { useStato } from '../dati/stato'
import { conIMiei, type Finitura } from '../scene/finiture'

/* UNA RIGA DI COLORI, CON LA VIA D'USCITA.
 *
 * I predefiniti sono pochi e scelti perche' stiano bene insieme e col
 * tema. Ma sei tinte sono una proposta, non una gabbia: l'ultimo bottone
 * apre il selettore del sistema e il colore scelto entra in coda ai
 * predefiniti, cosi' si ritrova senza doverlo ricomporre a memoria.
 *
 * Il selettore e' quello nativo di proposito: su Android e' il pannello
 * di sistema, che la gente conosce gia' e che funziona col pollice
 * meglio di qualunque ruota disegnata da noi.
 */
export function Colori({ lista, scelto, cambia, senza }: {
  lista: Finitura[]
  scelto: string | null
  cambia: (v: string | null) => void
  /** l'etichetta della scelta "nessuno", quando ha senso averla */
  senza?: string
}) {
  const { stato, ricordaColore } = useStato()
  const campo = useRef<HTMLInputElement>(null)
  const tutti = conIMiei(lista, stato.mieiColori)

  return (
    <div className="colori">
      {senza && (
        <button
          className={'colore colore-nessuno' + (scelto === null ? ' colore-scelto' : '')}
          onClick={() => cambia(null)}
          aria-pressed={scelto === null}
        >
          {senza}
        </button>
      )}

      {tutti.map((f) => (
        <button
          key={f.v}
          className={'colore' + (scelto?.toLowerCase() === f.v.toLowerCase() ? ' colore-scelto' : '')}
          style={{ background: f.v }}
          onClick={() => cambia(f.v)}
          aria-pressed={scelto?.toLowerCase() === f.v.toLowerCase()}
          aria-label={f.n}
          title={f.n}
        />
      ))}

      <button
        className="colore colore-scegli"
        onClick={() => campo.current?.click()}
        aria-label="Scegli un colore qualsiasi"
        title="Scegli un colore qualsiasi"
      >
        <span aria-hidden="true">+</span>
        <input
          ref={campo}
          type="color"
          value={scelto ?? '#8e6a4b'}
          onChange={(e) => { cambia(e.target.value); ricordaColore(e.target.value) }}
          tabIndex={-1}
        />
      </button>
    </div>
  )
}
