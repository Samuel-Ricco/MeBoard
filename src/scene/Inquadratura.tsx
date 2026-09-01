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
 * La distanza si ricava dalla larghezza da inquadrare, dal rapporto dello
 * schermo e dalla PROFONDITA' delle scatole: la loro faccia anteriore e'
 * piu' vicina alla camera del piano su cui si misura la larghezza, e in
 * prospettiva appare piu' grande. Senza quel termine le scatole agli
 * estremi restano tagliate.
 */
export function Inquadratura({ larghezza, profondita = 0, altezzaOcchio = 2.2, margine = 1.1 }: {
  larghezza: number
  profondita?: number
  altezzaOcchio?: number
  margine?: number
}) {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const invalidate = useThree((s) => s.invalidate)

  useLayoutEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return
    /* Le misure possono valere 0 -- pannello non ancora disposto, tab
       nascosto, canvas appena montata. Senza questa guardia la distanza
       diventa infinita e la scena sparisce senza dare un errore. */
    if (!size.width || !size.height || larghezza <= 0) return

    const aspetto = size.width / size.height
    const fovV = THREE.MathUtils.degToRad(camera.fov)
    // l'apertura orizzontale deriva da quella verticale e dal rapporto
    const fovO = 2 * Math.atan(Math.tan(fovV / 2) * aspetto)
    const distanza = (larghezza / 2) / Math.tan(fovO / 2) * margine + profondita / 2

    camera.position.set(0, altezzaOcchio, distanza)
    camera.updateProjectionMatrix()
    invalidate()
  }, [camera, size, larghezza, profondita, altezzaOcchio, margine, invalidate])

  return null
}
