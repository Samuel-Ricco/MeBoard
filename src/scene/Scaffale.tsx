import { useLayoutEffect, useMemo, useRef } from 'react'
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

/* TUTTE LE SCATOLE IN UNA SOLA DRAW CALL, PUR ESSENDO TUTTE DIVERSE.
 *
 * Il dubbio era: se le misure arrivano dalle API e ogni scatola e' diversa,
 * l'instancing non serve. Serve eccome -- ogni istanza ha la sua matrice
 * 4x4, scala non uniforme inclusa. Un cubo unitario scalato 0.7 x 3 x 3 e
 * uno scalato 1.5 x 3 x 3 sono lo stesso mesh disegnato una volta sola.
 *
 * Cio' che l'instancing NON regala e' una texture diversa per scatola:
 * il materiale e' uno solo. Quello lo risolve l'atlante (vedi budget.ts),
 * con l'offset UV portato per istanza in un InstancedBufferAttribute.
 * Qui, per ora, c'e' solo il colore per istanza.
 */
export function Scaffale({ scatole }: { scatole: Scatola[] }) {
  const ref = useRef<THREE.InstancedMesh>(null!)

  const geo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), [])
  /* Lambert e non Standard: il PBR su GPU mobile costa e, con la luce cotta
     nella copertina, non si distingue. */
  const mat = useMemo(() => new THREE.MeshLambertMaterial(), [])

  useLayoutEffect(() => {
    const mesh = ref.current
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
      mesh.setColorAt(i, col.set(g.tinta))
    })

    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [scatole])

  return <instancedMesh ref={ref} args={[geo, mat, scatole.length]} />
}
