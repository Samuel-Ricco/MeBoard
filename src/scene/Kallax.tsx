import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import {
  CM, CASELLA, MONTANTE, FONDO, RIGHE, COLONNE, PASSO,
  LARGHEZZA, ALTEZZA, RIENTRO, casella,
} from './mobile'
import { coloreDiTema } from '../ui/tema'
import { costruisciAtlante, LATO_PAGINA, type Atlante } from './atlante'

import { COPERTINA_PX } from './budget'

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
  /** l'indirizzo su BGG; null se di questo gioco non si sa ancora nulla */
  copertinaUrl: string | null
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

/** Scurisce una tinta: la schiena di un mobile non e' del colore delle
 *  ante, e senza differenza le caselle vuote non leggono come vani. */
function scurisci(hex: string, quanto: number) {
  const c = new THREE.Color(hex)
  c.multiplyScalar(quanto)
  return '#' + c.getHexString()
}

/* IL MOBILE: dieci parallelepipedi, una sola draw call.
   Montanti verticali, ripiani orizzontali e la schiena, tutti dallo stesso
   cubo unitario con scale diverse. */
export type Aspetto = {
  legno: string | null
  muro: string | null
  pavimento: string | null
  forza: number
}

function Mobile({ tema, aspetto }: { tema: string; aspetto: Aspetto }) {
  const ref = useRef<THREE.InstancedMesh>(null!)
  const invalidate = useThree((s) => s.invalidate)
  const geo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), [])
  const mat = useMemo(() => new THREE.MeshLambertMaterial(), [])

  const pezzi = useMemo(() => {
    const t = tinte()
    /* Il legno scelto vince sulla tavolozza; se non se n'e' scelto uno,
       il mobile continua a tingersi dal tema come tutto il resto. */
    const legno = aspetto.legno ?? t.mobile
    const v: Array<{ p: [number, number, number]; s: [number, number, number]; c: string }> = []
    // montanti verticali, compresi i due esterni
    for (let i = 0; i <= COLONNE; i++) {
      v.push({
        p: [-LARGHEZZA / 2 + MONTANTE / 2 + i * PASSO, ALTEZZA / 2, 0],
        s: [MONTANTE, ALTEZZA, FONDO],
        c: legno,
      })
    }
    // ripiani orizzontali, compresi cielo e base
    for (let i = 0; i <= RIGHE; i++) {
      v.push({
        p: [0, MONTANTE / 2 + i * PASSO, 0],
        s: [LARGHEZZA, MONTANTE, FONDO],
        c: legno,
      })
    }
    /* La schiena e' piu' scura del mobile: senza, le caselle vuote leggono
       come quadrati pieni invece che come vani. */
    v.push({
      p: [0, ALTEZZA / 2, -FONDO / 2 + 0.6],
      s: [LARGHEZZA, ALTEZZA, 1.2],
      c: aspetto.legno ? scurisci(aspetto.legno, .55) : t.schiena,
    })

    /* LA STANZA, SE LA VUOI.
     *
     * Pavimento e muro sono due parallelepipedi in piu' nella STESSA
     * InstancedMesh del mobile: restano una draw call, non due. Nulli
     * vuol dire "niente stanza", e il mobile galleggia sul fondo
     * dell'app -- che e' il predefinito, e non e' un ripiego: uno
     * scaffale senza contorno e' piu' pulito su uno schermo piccolo. */
    if (aspetto.pavimento) {
      v.push({
        p: [0, -2, FONDO / 2 - 140],
        s: [520, 4, 320],
        c: aspetto.pavimento,
      })
    }
    if (aspetto.muro) {
      v.push({
        p: [0, 190, -FONDO / 2 - 3],
        s: [520, 420, 6],
        c: aspetto.muro,
      })
    }
    return v
  }, [tema, aspetto.legno, aspetto.muro, aspetto.pavimento])

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

/* COSTRUISCE L'ATLANTE QUANDO CAMBIA IL RIPIANO.
 *
 * Si rifa' solo se cambia l'ELENCO delle copertine, non a ogni render:
 * scaricare dodici immagini perche' e' cambiata la selezione sarebbe
 * assurdo. La firma e' la lista degli indirizzi, in ordine.
 *
 * L'AbortSignal non e' pignoleria: togliendo una scatola mentre i
 * download sono in volo, senza di quello le immagini vecchie finirebbero
 * disegnate nelle tessere nuove -- una copertina sulla scatola sbagliata,
 * e nessun errore a dirlo. */
function useAtlante(scatole: Scatola[]) {
  const [atlante, setAtlante] = useState<Atlante | null>(null)
  /* Chi e' in uso ADESSO. Serve un riferimento e non lo stato: la
     liberazione deve avvenire nell'istante esatto della sostituzione, non
     alla pulizia dell'effetto -- e quella arriva un giro dopo. Con la
     versione sfasata restava sempre un atlante indietro: ventun megabyte
     di memoria video che non tornavano mai. */
  const inUso = useRef<Atlante | null>(null)
  const firma = scatole.map((s) => s.copertinaUrl ?? '-').join('|')

  useEffect(() => {
    /* Cambiando libreria le scatole sono altre, ma l'atlante e' ancora
       quello di prima: senza questo, per il secondo che serve a scaricare
       le nuove copertine si vedrebbero le VECCHIE sulle scatole nuove.
       Meglio un attimo di tinte piatte che un attimo di bugie. */
    setAtlante(null)
    if (!scatole.length) return
    const taglia = new AbortController()

    costruisciAtlante(
      scatole.map((s) => ({ copertinaUrl: s.copertinaUrl, tinta: s.tinta })),
      taglia.signal,
    ).then((a) => {
      // un atlante arrivato dopo che l'elenco e' cambiato non serve piu'
      if (taglia.signal.aborted) { a.texture.dispose(); return }
      /* Qui NON si libera niente: la vecchia texture e' ancora attaccata
         al materiale, e liberarla adesso la farebbe ricaricare al primo
         fotogramma. Se ne occupa l'effetto che monta la nuova. */
      inUso.current = a
      setAtlante(a)
    })

    /* L'AbortSignal non e' pignoleria: togliendo una scatola mentre i
       download sono in volo, senza di quello le immagini vecchie
       finirebbero disegnate nelle tessere nuove -- una copertina sulla
       scatola sbagliata, e nessun errore a dirlo. */
    return () => taglia.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firma])

  // e alla chiusura non resta niente in memoria
  useEffect(() => () => {
    inUso.current?.texture.dispose()
    inUso.current = null
  }, [])

  return atlante
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
function Scatole({ scatole, evidenziato, tema, meshRef }: {
  scatole: Scatola[]
  /** l'indice della scatola che si sta portando, se ce n'e' una */
  evidenziato: number | null
  tema: string
  meshRef: React.RefObject<THREE.InstancedMesh | null>
}) {
  const ref = meshRef
  const invalidate = useThree((s) => s.invalidate)
  const geo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), [])
  const atlante = useAtlante(scatole)

  /* UNA TEXTURE SOLA, DODICI IMMAGINI DIVERSE.
   *
   * E' il pezzo che l'instancing non regala: il materiale e' uno, quindi
   * la texture e' una. Ogni istanza porta un attributo con l'angolo della
   * sua tessera nell'atlante, e lo shader lo somma alle UV. Cosi' dodici
   * copertine diverse restano UNA draw call.
   *
   * Si tocca `vMapUv` -- la varying che three riempie per il canale
   * `map` -- subito dopo che e' stata calcolata. */
  const mat = useMemo(() => {
    /* Lambert e non Standard: il PBR su GPU mobile costa e, con la luce
       gia' dentro la copertina, non si distingue. */
    const m = new THREE.MeshLambertMaterial()
    m.onBeforeCompile = (shader) => {
      shader.vertexShader = `attribute vec2 offsetUv;
${shader.vertexShader}`
      shader.vertexShader = shader.vertexShader.replace(
        '#include <uv_vertex>',
        `#include <uv_vertex>
        #ifdef USE_MAP
          vMapUv = vMapUv * SCALA_TESSERA + offsetUv;
        #endif`,
      )
      shader.defines = { ...shader.defines, SCALA_TESSERA: (COPERTINA_PX / LATO_PAGINA).toFixed(6) }
    }
    return m
  }, [])

  /* L'atlante entra in scena quando e' pronto: prima le scatole sono
     tinte piatte, poi diventano copertine. Nessuna schermata di attesa,
     nessun salto. */
  /* LA VECCHIA SI LIBERA DOPO AVER MONTATO LA NUOVA, NON PRIMA.
   *
   * Liberandola prima resta comunque attaccata al materiale finche' React
   * non riesegue questo effetto, e un fotogramma disegnato nel frattempo
   * la fa RICARICARE alla GPU: torna in memoria da sola, senza piu'
   * nessuno che la possa liberare. Misurato: il contatore delle texture
   * saliva di uno a ogni ricostruzione anche con la liberazione al posto
   * giusto nel codice ma nel momento sbagliato. */
  const montata = useRef<THREE.Texture | null>(null)

  useEffect(() => {
    if (atlante) {
      geo.setAttribute('offsetUv', new THREE.InstancedBufferAttribute(atlante.offset, 2))
      mat.map = atlante.texture
    } else {
      geo.deleteAttribute('offsetUv')
      mat.map = null
    }
    /* Cambiare la presenza di `map` cambia i #define dello shader: senza
       questo il programma resta quello vecchio e la texture non si vede. */
    mat.needsUpdate = true

    const prima = montata.current
    montata.current = atlante?.texture ?? null
    if (prima && prima !== montata.current) prima.dispose()

    invalidate()
  }, [atlante, geo, mat, invalidate])

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
      /* Il colore per istanza MOLTIPLICA la texture. Con l'atlante addosso
         deve quindi essere bianco, se no ogni copertina uscirebbe tinta
         del colore di ripiego. Resta la tinta finche' le immagini non ci
         sono, e resta il lime sulla scatola scelta -- una copertina
         virata di lime si riconosce a colpo d'occhio, ed e' l'unico modo
         per legare la riga dell'elenco all'oggetto nel mobile. */
      const tinta = i === evidenziato ? scelta : (atlante ? '#ffffff' : g.tinta)
      mesh.setColorAt(i, col.set(tinta))
    })

    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
    /* In "demand" nessuno ridisegna da solo: dopo aver cambiato le matrici
       il fotogramma va chiesto a mano. */
    invalidate()
  }, [scatole, evidenziato, tema, atlante, invalidate, ref])

  return (
    <instancedMesh
      ref={ref}
      args={[geo, mat, Math.max(1, scatole.length)]}
      count={scatole.length}
    />
  )
}

export function Kallax(props: {
  scatole: Scatola[]
  evidenziato: number | null
  tema: string
  aspetto: Aspetto
  meshRef: React.RefObject<THREE.InstancedMesh | null>
}) {
  return (
    <>
      <Mobile tema={props.tema} aspetto={props.aspetto} />
      <Scatole
        scatole={props.scatole}
        evidenziato={props.evidenziato}
        tema={props.tema}
        meshRef={props.meshRef}
      />
    </>
  )
}
