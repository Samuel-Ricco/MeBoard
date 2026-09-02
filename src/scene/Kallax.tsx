import { useLayoutEffect, useMemo, useRef } from 'react'
import { useThree, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import {
  CM, CASELLA, MONTANTE, FONDO, RIGHE, COLONNE, PASSO,
  LARGHEZZA, ALTEZZA, RIENTRO, casella,
} from './mobile'
import { coloreDiTema } from '../ui/tema'

export { CM, LARGHEZZA, ALTEZZA, FONDO, CELLE } from './mobile'

export type Scatola = {
  /** l'id BGG del gioco: la scatola non ha un'identita' sua */
  id: number
  nome: string
  /* Misure reali in centimetri, come arrivano dalle API. */
  larghezza: number
  altezza: number
  spessore: number
  tinta: string
}

/* I colori del mobile NON stanno qui: stanno nella tavolozza, come tutto
   il resto. La scena li legge dalle variabili CSS, cosi' passando a chiaro
   il Kallax diventa rovere sbiancato senza che nessuno lo dica due volte.
   `tema` non si usa nel corpo: serve a far rieseguire l'effetto quando la
   tavolozza cambia. */
const tinte = () => ({
  mobile: coloreDiTema('--mobile', '#3A2A32'),
  schiena: coloreDiTema('--mobile-schiena', '#241820'),
  scelta: coloreDiTema('--lime', '#CCFF4D'),
})

/* IL MOBILE: dieci parallelepipedi, una sola draw call.
   Montanti verticali, ripiani orizzontali e la schiena, tutti dallo stesso
   cubo unitario con scale diverse. */
function Mobile({ tema }: { tema: string }) {
  const ref = useRef<THREE.InstancedMesh>(null!)
  const invalidate = useThree((s) => s.invalidate)
  const geo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), [])
  const mat = useMemo(() => new THREE.MeshLambertMaterial(), [])

  const pezzi = useMemo(() => {
    const t = tinte()
    const v: Array<{ p: [number, number, number]; s: [number, number, number]; c: string }> = []
    // montanti verticali, compresi i due esterni
    for (let i = 0; i <= COLONNE; i++) {
      v.push({
        p: [-LARGHEZZA / 2 + MONTANTE / 2 + i * PASSO, ALTEZZA / 2, 0],
        s: [MONTANTE, ALTEZZA, FONDO],
        c: t.mobile,
      })
    }
    // ripiani orizzontali, compresi cielo e base
    for (let i = 0; i <= RIGHE; i++) {
      v.push({
        p: [0, MONTANTE / 2 + i * PASSO, 0],
        s: [LARGHEZZA, MONTANTE, FONDO],
        c: t.mobile,
      })
    }
    /* La schiena e' piu' scura del mobile: senza, le caselle vuote leggono
       come quadrati pieni invece che come vani. */
    v.push({
      p: [0, ALTEZZA / 2, -FONDO / 2 + 0.6],
      s: [LARGHEZZA, ALTEZZA, 1.2],
      c: t.schiena,
    })
    return v
  }, [tema])

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const m = new THREE.Matrix4()
    const rot = new THREE.Quaternion()
    const pos = new THREE.Vector3()
    const sca = new THREE.Vector3()
    const col = new THREE.Color()

    pezzi.forEach((z, i) => {
      pos.set(z.p[0] * CM, z.p[1] * CM, z.p[2] * CM)
      sca.set(z.s[0] * CM, z.s[1] * CM, z.s[2] * CM)
      m.compose(pos, rot, sca)
      mesh.setMatrixAt(i, m)
      mesh.setColorAt(i, col.set(z.c))
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
    invalidate()
  }, [pezzi, invalidate])

  return <instancedMesh ref={ref} args={[geo, mat, pezzi.length]} count={pezzi.length} />
}

/* LE SCATOLE, DI FACCIA, UNA PER CASELLA.
 *
 * Di faccia vuol dire che il cubo unitario si scala (larghezza, altezza,
 * spessore): la copertina guarda la camera. Di costa erano
 * (spessore, altezza, larghezza) -- stessa geometria, altra matrice.
 *
 * Restano tutte in UNA draw call anche se sono tutte di misura diversa:
 * ogni istanza ha la sua matrice, scala non uniforme inclusa. Cio' che
 * l'instancing non regala e' una texture per scatola, ed e' li' che
 * entrera' l'atlante con l'offset UV per istanza.
 */
function Scatole({ scatole, selezionato, onSeleziona, tema }: {
  scatole: Scatola[]
  selezionato?: number | null
  onSeleziona?: (id: number | null) => void
  tema: string
}) {
  const ref = useRef<THREE.InstancedMesh>(null!)
  const invalidate = useThree((s) => s.invalidate)
  const geo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), [])
  /* Lambert e non Standard: il PBR su GPU mobile costa e, con la luce cotta
     nella copertina, non si distingue. */
  const mat = useMemo(() => new THREE.MeshLambertMaterial(), [])

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh || scatole.length === 0) return
    const m = new THREE.Matrix4()
    const rot = new THREE.Quaternion()
    const pos = new THREE.Vector3()
    const sca = new THREE.Vector3()
    const col = new THREE.Color()
    const scelta = tinte().scelta

    scatole.forEach((g, i) => {
      const { x, pavimento } = casella(i)
      /* Una scatola piu' larga della casella non ci starebbe: si stringe.
         Capita coi giochi grossi, ed e' meglio di vederla sbordare dal
         montante. */
      const k = Math.min(1, CASELLA / Math.max(g.larghezza, g.altezza))
      const la = g.larghezza * k
      const al = g.altezza * k

      sca.set(la * CM, al * CM, g.spessore * CM)
      pos.set(
        x * CM,
        (pavimento + al / 2) * CM,                       // appoggiata, non centrata
        (FONDO / 2 - RIENTRO - g.spessore / 2) * CM,     // spinta verso il filo
      )
      m.compose(pos, rot, sca)
      mesh.setMatrixAt(i, m)
      /* La scatola scelta si accende di lime: e' l'unico modo per legare
         la riga dell'elenco all'oggetto nel mobile. */
      mesh.setColorAt(i, col.set(g.id === selezionato ? scelta : g.tinta))
    })

    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
    /* In "demand" nessuno ridisegna da solo: dopo aver cambiato le matrici
       il fotogramma va chiesto a mano. */
    invalidate()
  }, [scatole, selezionato, tema, invalidate])

  const tocca = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    const i = e.instanceId
    if (i === undefined || !scatole[i]) return
    // ritoccare la scatola gia' scelta la deseleziona
    onSeleziona?.(scatole[i].id === selezionato ? null : scatole[i].id)
  }

  return (
    <instancedMesh
      ref={ref}
      args={[geo, mat, Math.max(1, scatole.length)]}
      count={scatole.length}
      onClick={tocca}
    />
  )
}

export function Kallax(props: {
  scatole: Scatola[]
  selezionato?: number | null
  onSeleziona?: (id: number | null) => void
  tema: string
}) {
  return (
    <>
      <Mobile tema={props.tema} />
      <Scatole {...props} />
    </>
  )
}
