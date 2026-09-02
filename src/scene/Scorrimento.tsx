import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { LARGHEZZA, CM } from './mobile'

/* IL PASSAGGIO DA UNA LIBRERIA ALL'ALTRA.
 *
 * Il mobile esce da un lato, il contenuto cambia mentre e' fuori
 * campo, e rientra dall'altro. Non ci sono due mobili in scena: ce n'e'
 * sempre uno solo che va e torna, e questo vale due cose --
 *
 *  - niente secondo atlante durante il passaggio, cioe' niente ventun
 *    megabyte di memoria video in piu' proprio nel momento in cui si sta
 *    gia' lavorando;
 *  - restano due draw call anche a meta' animazione.
 *
 * LO STATO CHE ANIMA NON PASSA DA REACT. Vive in una ref e si applica
 * dentro `useFrame`: un `setState` per fotogramma ricostruirebbe, in
 * forma nuova, il problema di prestazioni da cui scappiamo.
 *
 * In "demand" i fotogrammi non arrivano da soli: finche' l'animazione
 * corre, ognuno chiede il successivo. Finita, si smette -- e la scena
 * torna a costare zero.
 */

const DURATA = 190          // ms per meta' viaggio: uscita, poi entrata
const FUORI = LARGHEZZA * CM * 1.25   // quanto lontano deve andare per sparire

/** Partenza svelta e arrivo morbido: e' il movimento di una cosa che si
 *  spinge di lato, non di una che rimbalza. */
const dolce = (t: number) => 1 - Math.pow(1 - t, 3)

export type Comando = { verso: 1 | -1 } | null

export function Scorrimento({ gruppo, comando, aMeta }: {
  gruppo: React.RefObject<THREE.Group | null>
  /** dove si scrive la richiesta di scorrere; il componente la consuma */
  comando: React.MutableRefObject<Comando>
  /** si chiama a mobile fuori campo: e' li' che il contenuto cambia */
  aMeta: (verso: 1 | -1) => void
}) {
  const invalidate = useThree((s) => s.invalidate)
  /* `fase` 0 = fermo, 1 = sta uscendo, 2 = sta rientrando. */
  const corsa = useRef<{ fase: 0 | 1 | 2; verso: 1 | -1; da: number }>({
    fase: 0, verso: 1, da: 0,
  })

  useEffect(() => {
    /* Se il componente sparisce a meta' viaggio il mobile resterebbe
       fuori campo per sempre. */
    const g = gruppo.current
    return () => { if (g) g.position.x = 0 }
  }, [gruppo])

  useFrame(() => {
    const g = gruppo.current
    if (!g) return
    const c = corsa.current

    // una richiesta nuova parte solo se non ce n'e' gia' una in corso
    if (c.fase === 0 && comando.current) {
      c.fase = 1
      c.verso = comando.current.verso
      c.da = performance.now()
      comando.current = null
    }
    if (c.fase === 0) return

    const t = Math.min(1, (performance.now() - c.da) / DURATA)
    /* Scorrendo verso la libreria successiva il mobile se ne va a
       sinistra, e il nuovo arriva da destra: e' il verso che ci si
       aspetta, lo stesso di una pagina che si volta. */
    const largo = FUORI * -c.verso

    if (c.fase === 1) {
      g.position.x = largo * dolce(t)
      if (t >= 1) {
        // fuori campo: qui il contenuto cambia senza che si veda
        aMeta(c.verso)
        c.fase = 2
        c.da = performance.now()
        g.position.x = -largo
      }
    } else {
      g.position.x = -largo * (1 - dolce(t))
      if (t >= 1) {
        g.position.x = 0
        c.fase = 0
      }
    }

    // finche' si muove, ogni fotogramma chiede il prossimo
    if (c.fase !== 0) invalidate()
  })

  return null
}
