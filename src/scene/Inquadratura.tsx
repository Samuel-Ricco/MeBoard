import { useLayoutEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'

type Controlli = { target: THREE.Vector3; update: () => void }

/* L'INQUADRATURA SI CALCOLA DAL CONTENUTO, NON SI SCRIVE A MANO.
 *
 * Tre cose che una posizione fissa sbaglia sempre:
 *
 * 1. Il `fov` di una camera prospettica e' quello VERTICALE. In ritratto
 *    l'apertura orizzontale si stringe, su un monitor e' il contrario:
 *    quale delle due dimensioni "stringe" dipende dallo schermo, quindi
 *    vanno calcolate entrambe e si tiene la distanza maggiore.
 *
 * 2. La faccia anteriore del mobile e' piu' vicina della sua mezzeria, e in
 *    prospettiva appare piu' grande: va sommata mezza profondita'.
 *
 * 3. LO SCHERMO NON E' TUTTO LIBERO. Testata sopra e pannello sotto
 *    coprono una fetta dell'altezza: inquadrare sul viewport intero
 *    significa nascondere la riga in basso dietro ai comandi -- e una
 *    scatola nascosta non si puo' nemmeno toccare. Si inquadra sulla
 *    BANDA visibile, e si sposta la camera perche' il mobile finisca al
 *    centro di quella, non al centro dello schermo.
 */
export function Inquadratura({
  larghezza, altezza, profondita = 0, sopra = 0, sotto = 0, margine = 1.06,
}: {
  larghezza: number
  altezza: number
  profondita?: number
  /** pixel CSS coperti dall'interfaccia in alto */
  sopra?: number
  /** pixel CSS coperti dall'interfaccia in basso */
  sotto?: number
  margine?: number
}) {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const invalidate = useThree((s) => s.invalidate)
  const controls = useThree((s) => s.controls) as Controlli | null

  useLayoutEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return
    /* Le misure possono valere 0 -- pannello non ancora disposto, tab
       nascosto, canvas appena montata. Senza questa guardia la distanza
       diventa infinita e la scena sparisce senza dare un errore. */
    if (!size.width || !size.height || larghezza <= 0 || altezza <= 0) return

    /* Se i comandi si mangiassero quasi tutto lo schermo, il fattore
       esploderebbe: si tiene almeno un terzo di altezza utile. */
    const banda = Math.max(size.height * 0.34, size.height - sopra - sotto)
    const fattore = size.height / banda

    const aspetto = size.width / size.height
    const fovV = THREE.MathUtils.degToRad(camera.fov)
    const fovO = 2 * Math.atan(Math.tan(fovV / 2) * aspetto)

    const perAltezza = (altezza / 2) / Math.tan(fovV / 2) * fattore
    const perLarghezza = (larghezza / 2) / Math.tan(fovO / 2)
    const distanza = Math.max(perAltezza, perLarghezza) * margine + profondita / 2

    /* Quanto vale un pixel, in unita' di scena, sul piano del mobile.
       Serve a tradurre lo scarto fra centro della banda e centro dello
       schermo in uno spostamento della camera. */
    const perPixel = (2 * distanza * Math.tan(fovV / 2)) / size.height
    const centroBanda = sopra + banda / 2
    // alzare la camera abbassa l'immagine, da cui il segno
    const occhio = altezza / 2 + (centroBanda - size.height / 2) * perPixel

    /* Di faccia e in piano: le copertine si guardano senza scorcio. */
    camera.position.set(0, occhio, distanza)
    camera.updateProjectionMatrix()

    /* Il bersaglio dei controlli deve stare alla STESSA quota dell'occhio,
       se no si guarda in obliquo e l'inquadratura appena calcolata salta. */
    if (controls) {
      controls.target.set(0, occhio, 0)
      controls.update()
    }
    invalidate()
  }, [camera, size, larghezza, altezza, profondita, sopra, sotto, margine, controls, invalidate])

  return null
}
