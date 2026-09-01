import { useLayoutEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'

/* L'INQUADRATURA SI CALCOLA DAL CONTENUTO, NON SI SCRIVE A MANO.
 *
 * Un telefono e' in verticale: con una camera prospettica il campo visivo
 * dichiarato e' quello VERTICALE, quindi in ritratto l'apertura orizzontale
 * si stringe e uno scaffale largo esce dai bordi. Con una posizione fissa
 * funziona sul monitor e non sul telefono -- cioe' esattamente al contrario
 * di quello che serve.
 *
 * Qui la distanza si ricava dalla larghezza da inquadrare e dal rapporto
 * dello schermo, e si rifa' a ogni rotazione o ridimensionamento.
 */
export function Inquadratura({ larghezza, altezzaOcchio = 2.2, margine = 1.12 }: {
  larghezza: number
  altezzaOcchio?: number
  margine?: number
}) {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const invalidate = useThree((s) => s.invalidate)

  useLayoutEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return
    const aspetto = size.width / Math.max(1, size.height)
    const fovV = THREE.MathUtils.degToRad(camera.fov)
    // l'apertura orizzontale deriva da quella verticale e dal rapporto
    const fovO = 2 * Math.atan(Math.tan(fovV / 2) * aspetto)
    const distanza = (larghezza / 2) / Math.tan(fovO / 2)

    camera.position.set(0, altezzaOcchio, distanza * margine)
    camera.updateProjectionMatrix()
    invalidate()
  }, [camera, size, larghezza, altezzaOcchio, margine, invalidate])

  return null
}
