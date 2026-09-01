import { useLayoutEffect, useMemo, useRef } from 'react'
import { useThree, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'

export type Scatola = {
  id: string
  nome: string
  /* Misure reali in centimetri, come arrivano dalle API. */
  larghezza: number
  altezza: number
  spessore: number
  tinta: string
}

export const CM = 0.1   // da centimetri a unita' di scena

/** Larghezza totale dello scaffale in unita' di scena. Serve a inquadrare:
 *  la camera si calcola dal contenuto, non da un numero scritto a mano. */
export function larghezzaScaffale(scatole: Scatola[]) {
  return scatole.reduce((s, g) => s + g.spessore * CM, 0)
}

/** Profondita' massima dello scaffale: la faccia anteriore delle scatole e'
 *  piu' VICINA alla camera del piano su cui si calcola la larghezza, e in
 *  prospettiva quindi appare piu' grande. Senza tenerne conto le scatole
 *  agli estremi escono dai bordi. */
export function profonditaScaffale(scatole: Scatola[]) {
  return scatole.reduce((m, g) => Math.max(m, g.larghezza * CM), 0)
}

const LIME = '#CCFF4D'

/* TUTTE LE SCATOLE IN UNA SOLA DRAW CALL, PUR ESSENDO TUTTE DIVERSE.
 *
 * Il dubbio era: se le misure arrivano dalle API e ogni scatola e' diversa,
 * l'instancing non serve. Serve eccome -- ogni istanza ha la sua matrice
 * 4x4, scala non uniforme inclusa. Un cubo unitario scalato 0.7 x 3 x 3 e
 * uno scalato 1.5 x 3 x 3 sono lo stesso mesh disegnato una volta sola.
 *
 * Cio' che l'instancing NON regala e' una texture diversa per scatola: il
 * materiale e' uno solo. Quello lo risolve l'atlante (vedi budget.ts), con
 * l'offset UV portato per istanza in un InstancedBufferAttribute. Qui, per
 * ora, c'e' il colore per istanza.
 */
export function Scaffale({ scatole, selezionato, onSeleziona }: {
  scatole: Scatola[]
  selezionato?: string | null
  onSeleziona?: (id: string | null) => void
}) {
  const ref = useRef<THREE.InstancedMesh>(null!)
  const invalidate = useThree((s) => s.invalidate)

  const geo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), [])
  /* Lambert e non Standard: il PBR su GPU mobile costa e, con la luce cotta
     nella copertina, non si distingue. */
  const mat = useMemo(() => new THREE.MeshLambertMaterial(), [])

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const m = new THREE.Matrix4()
    const rot = new THREE.Quaternion()
    const pos = new THREE.Vector3()
    const sca = new THREE.Vector3()
    const col = new THREE.Color()

    // le scatole stanno di costa, appoggiate una all'altra: si accumula lo
    // spessore e si centra il tutto sull'origine
    const totale = larghezzaScaffale(scatole)
    let x = -totale / 2

    scatole.forEach((g, i) => {
      const sp = g.spessore * CM
      const al = g.altezza * CM
      const la = g.larghezza * CM

      sca.set(sp, al, la)                 // <- le misure da API vivono qui
      pos.set(x + sp / 2, al / 2, 0)      // appoggiate a terra, non centrate
      x += sp

      m.compose(pos, rot, sca)
      mesh.setMatrixAt(i, m)
      /* La scatola scelta si accende di lime: e' l'unico modo per legare
         la riga dell'elenco all'oggetto sullo scaffale. */
      mesh.setColorAt(i, col.set(g.id === selezionato ? LIME : g.tinta))
    })

    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
    /* In "demand" nessuno ridisegna da solo: dopo aver cambiato le matrici
       il fotogramma va chiesto a mano. */
    invalidate()
  }, [scatole, selezionato, invalidate])

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
