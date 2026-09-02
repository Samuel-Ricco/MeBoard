import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'

/* LA SONDA.
 *
 * La versione precedente era lenta e non si capiva perche': mancava il
 * numero. Questo lo mette a schermo -- e soprattutto mette QUANTE TEXTURE
 * sono in memoria video, che e' la voce che l'aveva affondata.
 *
 * DUE FAMIGLIE DI NUMERI, DUE TEMPI DIVERSI.
 *
 * Draw call, triangoli e fotogrammi si possono sapere solo DISEGNANDO:
 * `gl.info.render` si azzera a ogni fotogramma. Ma in "demand" da fermi
 * non si disegna, quindi quei numeri restano quelli dell'ultimo
 * fotogramma -- e vanno detti per quello che sono, non spacciati per
 * attuali.
 *
 * Texture, geometrie e programmi invece sono CONTATORI VIVI: valgono
 * sempre, anche a scena ferma. Leggerli solo dentro un fotogramma faceva
 * mostrare "0 tex" per sempre a un atlante caricato un istante dopo
 * l'ultimo disegno -- cioe' una bugia proprio sul numero che conta di
 * piu'.
 *
 * Scrive nel DOM direttamente, senza setState: e' anche l'esempio della
 * regola da rispettare con r3f.
 */
export function Sonda() {
  const gl = useThree((s) => s.gl)
  const invalidate = useThree((s) => s.invalidate)

  // quel che si sa dell'ultimo fotogramma disegnato
  const ultimoFotogramma = useRef(0)
  const passo = useRef(0)
  const disegno = useRef({ calls: 0, triangles: 0 })

  useEffect(() => {
    /* Comodo per interrogare `gl.info` a mano da DevTools quando l'app
       gira sul telefono vero. */
    ;(window as unknown as { meboard?: unknown }).meboard = { gl, info: () => gl.info }

    const scrivi = () => {
      const el = document.getElementById('sonda')
      if (!el) return
      const m = gl.info.memory
      const fermoDa = performance.now() - ultimoFotogramma.current

      /* Sopra il mezzo secondo senza disegnare la scena e' ferma, ed e'
         il comportamento voluto: si dice "fermo" invece di un fps
         inventato sull'ultimo intervallo. */
      const ritmo = !ultimoFotogramma.current ? '--'
        : fermoDa > 500 ? 'fermo'
        : Math.round(1000 / Math.max(1, passo.current)) + ' fps'

      el.textContent =
        `${ritmo} · ${disegno.current.calls} draw · ` +
        `${(disegno.current.triangles / 1000).toFixed(1)}k tri · ` +
        `${m.textures} tex · ${m.geometries} geo · ` +
        `${gl.info.programs?.length ?? 0} shader · dpr ${gl.getPixelRatio().toFixed(2)}`
    }

    scrivi()
    /* I contatori di memoria cambiano anche a scena ferma -- un atlante
       che finisce di caricarsi, una texture liberata -- quindi si
       rileggono a tempo, non a fotogramma. */
    const battito = setInterval(scrivi, 500)
    /* Un fotogramma all'avvio: senza, `gl.info.render` non e' mai stato
       riempito e i draw call resterebbero a zero su un'app sanissima. */
    invalidate()
    return () => clearInterval(battito)
  }, [gl, invalidate])

  useFrame(() => {
    const ora = performance.now()
    if (ultimoFotogramma.current) passo.current = ora - ultimoFotogramma.current
    ultimoFotogramma.current = ora
    /* `gl.info.render` si azzera all'inizio di ogni disegno: quel che si
       legge qui e' il fotogramma PRECEDENTE, ed e' l'unico modo di
       vederlo. */
    disegno.current = {
      calls: gl.info.render.calls,
      triangles: gl.info.render.triangles,
    }
  })

  return null
}
