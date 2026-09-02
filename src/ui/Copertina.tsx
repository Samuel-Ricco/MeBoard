import { useState } from 'react'
import { type Gioco, tintaDi } from '../dati/gioco'

/* LA COPERTINA IN UN ELENCO.
 *
 * Qui l'indirizzo di BGG si usa DIRETTO: in un `<img>` non serve nessun
 * CORS, e passare dalla nostra function costerebbe un salto in piu' per
 * niente. Il giro dalla function serve solo quando l'immagine deve
 * diventare una texture WebGL -- li' senza header la texture resta vuota.
 *
 * Sotto c'e' sempre la tinta del gioco: si vede mentre l'immagine arriva,
 * e resta se non arriva affatto. Un rettangolo colorato e' un'assenza
 * decorosa; un riquadro rotto no.
 */
export function Copertina({ gioco, lato = 46 }: { gioco: Gioco; lato?: number }) {
  const [rotta, setRotta] = useState(false)
  /* La miniatura di BGG e' circa 200x150: giusta per una riga, e un
     ventesimo del peso della copertina intera. */
  const src = gioco.miniaturaUrl ?? gioco.copertinaUrl

  return (
    <span
      className="copertina"
      style={{ background: tintaDi(gioco.id), width: lato, height: lato }}
      aria-hidden="true"
    >
      {src && !rotta && (
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setRotta(true)}
        />
      )}
    </span>
  )
}

/* La copertina grande, in cima alla scheda. Qui si prende quella intera:
   e' l'unico posto dove il dettaglio si vede davvero, ed e' una sola
   immagine per volta. */
export function CopertinaGrande({ gioco }: { gioco: Gioco }) {
  const [rotta, setRotta] = useState(false)
  const src = gioco.copertinaUrl ?? gioco.miniaturaUrl
  if (!src || rotta) return null

  return (
    <div className="copertina-grande" style={{ background: tintaDi(gioco.id) }}>
      <img src={src} alt={'Copertina di ' + gioco.nome} decoding="async"
           onError={() => setRotta(true)} />
    </div>
  )
}
