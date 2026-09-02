import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { CM, FONDO, RIENTRO, casellaDa } from './mobile'

/* I GESTI SULLA SCENA.
 *
 * Tre, e non si pestano i piedi:
 *
 *   tocco corto      apre la scheda del gioco
 *   tieni premuto    prendi la scatola e la porti in un'altra casella
 *   scorri di lato   cambi libreria
 *
 * Trascinare NON gira il mobile. Girarlo era comodo per guardarlo, ma
 * mangiava il gesto piu' usato di tutti -- scorrere fra le librerie -- e
 * su un telefono un gesto vale piu' di una rotazione.
 *
 * Tutto qui dentro e' DOM puro sul canvas piu' un raycast a mano: cosi'
 * non serve un piano invisibile per intercettare i movimenti, che
 * sarebbe una draw call in piu' per non disegnare niente.
 */

const TEMPO_PRESA = 420     // ms per "tieni premuto"
const MOSSA_MINIMA = 12     // px oltre i quali non e' piu' un tocco
const SCORRIMENTO = 60      // px per cambiare libreria
const FUORI = 80            // px di lato, con una scatola in mano, per cambiarla di mobile

export type Gesti = {
  /** la mesh delle scatole, per sapere quale si e' toccata */
  mesh: React.RefObject<THREE.InstancedMesh | null>
  apri: (indice: number) => void
  prendi: (indice: number) => void
  trascina: (casella: number | null) => void
  lascia: () => void
  scorri: (verso: 1 | -1) => void
}

export function Gesti({ mesh, apri, prendi, trascina, lascia, scorri }: Gesti) {
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)

  /* Le funzioni cambiano a ogni render; l'ascoltatore no. Tenerle in una
     ref evita di staccare e riattaccare i listener di continuo, che su
     un pointerdown in corso vorrebbe dire perdere il gesto a meta'. */
  const ora = useRef({ apri, prendi, trascina, lascia, scorri })
  ora.current = { apri, prendi, trascina, lascia, scorri }

  useEffect(() => {
    const tela = gl.domElement
    const raggio = new THREE.Raycaster()
    const punto = new THREE.Vector2()
    /* Il piano delle facce: le scatole stanno tutte li' sopra, quindi
       trascinare vuol dire scorrere su quello. */
    const piano = new THREE.Plane(
      new THREE.Vector3(0, 0, 1),
      -(FONDO / 2 - RIENTRO) * CM)
    const dove = new THREE.Vector3()

    let giu: { x: number; y: number; t: number; indice: number | null } | null = null
    let presa: ReturnType<typeof setTimeout> | null = null
    let preso = false
    let scorso = false

    const ndc = (e: PointerEvent) => {
      const r = tela.getBoundingClientRect()
      punto.set(
        ((e.clientX - r.left) / r.width) * 2 - 1,
        -((e.clientY - r.top) / r.height) * 2 + 1)
      return punto
    }

    const scatolaSotto = (e: PointerEvent) => {
      const m = mesh.current
      if (!m) return null
      raggio.setFromCamera(ndc(e), camera)
      const colpi = raggio.intersectObject(m, false)
      const i = colpi[0]?.instanceId
      return i === undefined ? null : i
    }

    const casellaSotto = (e: PointerEvent) => {
      raggio.setFromCamera(ndc(e), camera)
      if (!raggio.ray.intersectPlane(piano, dove)) return null
      return casellaDa(dove.x / CM, dove.y / CM)
    }

    const suGiu = (e: PointerEvent) => {
      if (!e.isPrimary) return
      scorso = false
      preso = false
      giu = { x: e.clientX, y: e.clientY, t: performance.now(), indice: scatolaSotto(e) }

      // il "tieni premuto" parte solo se si e' premuto su una scatola
      if (giu.indice !== null) {
        presa = setTimeout(() => {
          preso = true
          ora.current.prendi(giu!.indice!)
        }, TEMPO_PRESA)
      }
    }

    const suMuovi = (e: PointerEvent) => {
      if (!giu || !e.isPrimary) return
      const dx = e.clientX - giu.x
      const dy = e.clientY - giu.y

      if (preso) {
        const casella = casellaSotto(e)
        ora.current.trascina(casella)

        /* PORTARLA IN UN'ALTRA LIBRERIA: la si trascina FUORI dal mobile,
           di lato. Non basta uno spostamento orizzontale grande, perche'
           trascinando da una casella all'altra se ne fanno di continuo:
           deve essere uscita dal mobile, e allora il gesto vuol dire
           davvero "questa qui non ci sta piu'". */
        if (!scorso && casella === null
            && Math.abs(dx) > FUORI && Math.abs(dx) > Math.abs(dy)) {
          scorso = true
          ora.current.scorri(dx < 0 ? 1 : -1)
        }
        return
      }

      // mosso abbastanza: non e' piu' un tocco, e la presa si annulla
      if (Math.hypot(dx, dy) > MOSSA_MINIMA && presa) {
        clearTimeout(presa)
        presa = null
      }

      /* Scorrere di lato cambia libreria, ma una volta sola per gesto:
         senza questo, un dito che continua a muoversi ne sfoglierebbe
         cinque. */
      if (!scorso && Math.abs(dx) > SCORRIMENTO && Math.abs(dx) > Math.abs(dy)) {
        scorso = true
        ora.current.scorri(dx < 0 ? 1 : -1)
      }
    }

    const suSu = (e: PointerEvent) => {
      if (!e.isPrimary) return
      if (presa) { clearTimeout(presa); presa = null }

      if (preso) {
        ora.current.lascia()
      } else if (giu && giu.indice !== null && !scorso) {
        const dx = e.clientX - giu.x
        const dy = e.clientY - giu.y
        // un tocco corto e fermo: si apre la scheda
        if (Math.hypot(dx, dy) <= MOSSA_MINIMA) ora.current.apri(giu.indice)
      }
      giu = null
      preso = false
    }

    const suAnnulla = () => {
      if (presa) { clearTimeout(presa); presa = null }
      if (preso) ora.current.lascia()
      giu = null
      preso = false
    }

    tela.addEventListener('pointerdown', suGiu)
    tela.addEventListener('pointermove', suMuovi)
    tela.addEventListener('pointerup', suSu)
    tela.addEventListener('pointercancel', suAnnulla)
    return () => {
      if (presa) clearTimeout(presa)
      tela.removeEventListener('pointerdown', suGiu)
      tela.removeEventListener('pointermove', suMuovi)
      tela.removeEventListener('pointerup', suSu)
      tela.removeEventListener('pointercancel', suAnnulla)
    }
  }, [gl, camera, mesh])

  return null
}
