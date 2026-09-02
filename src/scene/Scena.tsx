import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Kallax, LARGHEZZA, ALTEZZA, FONDO, CM, type Scatola } from './Kallax'
import { Inquadratura } from './Inquadratura'
import { Sonda } from './Sonda'
import { DPR_MAX } from './budget'

const L = LARGHEZZA * CM
const A = ALTEZZA * CM
const P = FONDO * CM

export function Scena({ scatole, selezionato, onSeleziona, tema, sopra = 0, sotto = 0 }: {
  scatole: Scatola[]
  selezionato: string | null
  onSeleziona: (id: string | null) => void
  /** la tavolozza in uso: il mobile si tinge da quella */
  tema: string
  /** pixel CSS coperti dall'interfaccia, sopra e sotto la scena */
  sopra?: number
  sotto?: number
}) {
  return (
    <Canvas
      /* "demand" disegna solo quando qualcosa cambia. Un mobile e' fermo
         finche' non lo tocchi: da fermo il consumo GPU va a zero, e su un
         telefono questo e' insieme batteria e temperatura -- cioe' anche
         throttling che non arriva. Durante il gesto ogni evento chiede il
         suo fotogramma, quindi l'interazione resta continua.

         E' anche cio' che rende sostenibile tenere la scena montata sotto
         gli altri tab invece di ricrearla ogni volta. */
      frameloop="demand"

      /* Il tetto al pixel ratio e' il parametro che pesa di piu'. */
      dpr={[1, DPR_MAX]}

      /* Antialias off: costa una passata di risoluzione e su questi bordi
         non si vede. Ombre off del tutto -- una shadow map e' una seconda
         passata della scena intera. */
      gl={{ antialias: false, powerPreference: 'high-performance' }}
      shadows={false}

      camera={{ fov: 40 }}
      /* toccare il vuoto deseleziona */
      onPointerMissed={() => onSeleziona(null)}
    >
      {/* DUE LUCI. Ogni luce dinamica in piu' e' un moltiplicatore su ogni
          frammento: nella versione precedente quel conto valeva, da solo,
          il 28% del tempo GPU.

          La direzionale viene da sinistra e un po' dall'alto: serve a
          staccare i montanti dal fondo delle caselle, se no un mobile
          visto di faccia e' una tinta piatta. */}
      <ambientLight intensity={1.05} />
      <directionalLight position={[-3, 5, 7]} intensity={1.25} />

      <Kallax scatole={scatole} selezionato={selezionato} onSeleziona={onSeleziona} tema={tema} />
      <Inquadratura larghezza={L} altezza={A} profondita={P} sopra={sopra} sotto={sotto} />
      {import.meta.env.DEV && <Sonda />}

      <OrbitControls
        /* makeDefault: cosi' l'inquadratura puo' riallineare il bersaglio
           alla quota dell'occhio dopo averla calcolata. */
        makeDefault
        enablePan={false}
        minDistance={A * 0.35}
        /* Generoso: se il massimo fosse piu' corto della distanza che serve
           a far entrare tutto, i controlli tirerebbero la camera avanti e
           taglierebbero i lati del mobile -- ed e' esattamente quello che
           succedeva. */
        maxDistance={A * 6}
        /* Le copertine si guardano di faccia: si concede un po' di
           parallasse per dare volume, non un giro completo che
           mostrerebbe il retro del mobile. */
        minPolarAngle={Math.PI / 2 - 0.42}
        maxPolarAngle={Math.PI / 2 + 0.30}
        minAzimuthAngle={-0.55}
        maxAzimuthAngle={0.55}
      />
    </Canvas>
  )
}
