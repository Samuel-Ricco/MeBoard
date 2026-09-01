import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'

/* LA SONDA.
 *
 * La versione precedente dell'app era lenta e non si capiva perche':
 * mancava il numero. Questo lo mette a schermo -- fotogrammi, draw call,
 * triangoli, e soprattutto QUANTE TEXTURE sono in memoria video, che e'
 * la voce che aveva affondato lo scaffale di prima.
 *
 * Scrive nel DOM direttamente, senza setState: e' anche l'esempio della
 * regola da rispettare con r3f. Un setState per fotogramma qui
 * ricostruirebbe da capo il problema che stiamo evitando.
 *
 * Nota sui fotogrammi: con frameloop="demand" da fermi non se ne disegna
 * nessuno -- e' voluto, e' il risparmio. Percio' l'aggiornamento e' legato
 * al TEMPO e non al conteggio, se no da fermi la sonda resterebbe muta.
 */
export function Sonda() {
  const gl = useThree((s) => s.gl)
  const acc = useRef(0)
  const n = useRef(0)
  const ultimo = useRef(performance.now())
  /* Finche' non si e' scritto un valore vero, quello a schermo sono gli
     zeri del montaggio -- e "0 draw" letto a riposo sembra un guasto.
     Costa gia' un'ora di diagnosi una volta: la prima misura utile va
     pubblicata appena c'e', senza aspettare la cadenza. */
  const maiScritto = useRef(true)

  const scrivi = (fps: number | null) => {
    const el = document.getElementById('sonda')
    if (!el) return
    const r = gl.info.render
    el.textContent =
      `${fps === null ? 'fermo' : fps + ' fps'} · ${r.calls} draw · ` +
      `${(r.triangles / 1000).toFixed(1)}k tri · ` +
      `${gl.info.memory.textures} tex · ${gl.info.programs?.length ?? 0} shader · ` +
      `dpr ${gl.getPixelRatio().toFixed(2)}`
  }

  useEffect(() => {
    /* Appeso a window per poterlo interrogare a mano da DevTools quando
       l'app gira sul telefono vero: e' li' che servono i numeri. */
    ;(window as unknown as { meboard?: unknown }).meboard = { gl, info: () => gl.info }
    scrivi(null)
  })

  useFrame(() => {
    const ora = performance.now()
    acc.current += ora - ultimo.current
    ultimo.current = ora
    n.current++
    if (acc.current < 250 && !(maiScritto.current && n.current >= 2)) return
    maiScritto.current = false
    const medio = acc.current / n.current
    /* In modalita' "demand" da fermi i fotogrammi sono radi: un fps
       calcolato su quelli direbbe "1" e sembrerebbe un guasto. Sopra i
       100 ms di intervallo medio non stiamo disegnando davvero, stiamo
       risparmiando: si scrive "fermo". */
    scrivi(medio > 100 ? null : Math.round(1000 / medio))
    acc.current = 0
    n.current = 0
  })

  return null
}
