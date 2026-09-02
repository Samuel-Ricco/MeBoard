import { useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { Kallax, LARGHEZZA, ALTEZZA, FONDO, CM, type Scatola, type Aspetto } from './Kallax'
import { Inquadratura } from './Inquadratura'
import { Gesti } from './Gesti'
import { Sonda } from './Sonda'
import { LUCE } from './finiture'
import { DPR_MAX } from './budget'

const L = LARGHEZZA * CM
const A = ALTEZZA * CM
const P = FONDO * CM

export function Scena({
  scatole, evidenziato, tema, aspetto, sopra = 0, sotto = 0,
  apri, prendi, trascina, lascia, scorri,
}: {
  scatole: Scatola[]
  /** l'indice della scatola in mano, se se ne sta portando una */
  evidenziato: number | null
  /** la tavolozza in uso: il mobile si tinge da quella */
  tema: string
  aspetto: Aspetto
  /** pixel CSS coperti dall'interfaccia, sopra e sotto la scena */
  sopra?: number
  sotto?: number
  apri: (indice: number) => void
  prendi: (indice: number) => void
  trascina: (casella: number | null) => void
  lascia: () => void
  scorri: (verso: 1 | -1) => void
}) {
  const mesh = useRef<THREE.InstancedMesh | null>(null)

  return (
    <Canvas
      /* "demand" disegna solo quando qualcosa cambia. Un mobile e' fermo
         finche' non lo tocchi: da fermo il consumo GPU va a zero, e su un
         telefono questo e' insieme batteria e temperatura -- cioe' anche
         throttling che non arriva. */
      frameloop="demand"

      /* Il tetto al pixel ratio e' il parametro che pesa di piu'. */
      dpr={[1, DPR_MAX]}

      /* Antialias off: costa una passata di risoluzione e su questi bordi
         non si vede. Ombre off del tutto -- una shadow map e' una seconda
         passata della scena intera. */
      gl={{ antialias: false, powerPreference: 'high-performance' }}
      shadows={false}

      /* L'inquadratura e' fissa e frontale: le copertine si guardano in
         piano. Niente OrbitControls, perche' trascinare NON deve girare
         il mobile -- quel gesto serve a sfogliare le librerie, che si usa
         molto piu' spesso di una rotazione. */
      camera={{ fov: 40 }}
    >
      {/* DUE LUCI, e una sola temperatura: quella di una stanza.
          C'erano dodici colori fra cui scegliere, neon compresi. Erano
          una decisione in piu' per un guadagno che non c'era: una luce
          colorata tinge le copertine, e vedere le copertine e' il punto
          dello scaffale.

          La direzionale viene da sinistra e un po' dall'alto: serve a
          staccare i montanti dal fondo delle caselle, se no un mobile
          visto di faccia e' una tinta piatta. */}
      <ambientLight intensity={0.62 + aspetto.forza * 0.42} />
      <directionalLight
        position={[-3, 5, 7]}
        intensity={0.45 + aspetto.forza * 0.7}
        color={LUCE}
      />

      <Kallax
        scatole={scatole}
        evidenziato={evidenziato}
        tema={tema}
        aspetto={aspetto}
        meshRef={mesh}
      />
      <Inquadratura larghezza={L} altezza={A} profondita={P} sopra={sopra} sotto={sotto} />
      <Gesti
        mesh={mesh}
        apri={apri}
        prendi={prendi}
        trascina={trascina}
        lascia={lascia}
        scorri={scorri}
      />
      {import.meta.env.DEV && <Sonda />}
    </Canvas>
  )
}
