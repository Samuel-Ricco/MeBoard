import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Kallax, LARGHEZZA, ALTEZZA, FONDO, CM, type Scatola } from './Kallax'
import type { Aspetto } from './finiture'
import { Inquadratura } from './Inquadratura'
import { Sonda } from './Sonda'
import { DPR_MAX } from './budget'

const L = LARGHEZZA * CM
const A = ALTEZZA * CM
const P = FONDO * CM

export function Scena({ scatole, selezionato, onSeleziona, tema, aspetto, sopra = 0, sotto = 0 }: {
  scatole: Scatola[]
  selezionato: number | null
  onSeleziona: (id: number | null) => void
  /** la tavolozza in uso: il mobile si tinge da quella */
  tema: string
  /** finiture e luce scelte per la libreria */
  aspetto: Aspetto
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
      {/* SEMPRE DUE LUCI, anche coi faretti.
          Il colore scelto tinge quella che c'e' gia': aggiungerne una
          terza costerebbe un moltiplicatore su OGNI frammento, ed e' il
          conto che nella versione precedente valeva da solo il 28% del
          tempo GPU. Un faretto e' un colore, non una lampadina in piu'.

          La direzionale viene da sinistra e un po' dall'alto: serve a
          staccare i montanti dal fondo delle caselle, se no un mobile
          visto di faccia e' una tinta piatta. */}
      {/* IL COLORE STA SUL FARETTO, NON SULL'AMBIENTE.
          Tingendo anche l'ambiente un'ambra a piena forza sommergeva
          tutto, copertine comprese -- e vedere le copertine e' il punto
          dello scaffale. Cosi' invece la luce da' carattere da un lato e
          lascia leggibile il resto, che e' anche come funziona una
          lampada in una stanza. */}
      <ambientLight intensity={0.62 + aspetto.forza * 0.42} />
      <directionalLight
        position={[-3, 5, 7]}
        intensity={0.45 + aspetto.forza * 0.7}
        color={aspetto.luce}
      />

      <Kallax scatole={scatole} selezionato={selezionato} onSeleziona={onSeleziona}
              tema={tema} aspetto={aspetto} />
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
