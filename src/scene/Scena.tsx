import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Scaffale, larghezzaScaffale, type Scatola } from './Scaffale'
import { Inquadratura } from './Inquadratura'
import { Sonda } from './Sonda'
import { DPR_MAX } from './budget'

export function Scena({ scatole }: { scatole: Scatola[] }) {
  const larghezza = larghezzaScaffale(scatole)

  return (
    <Canvas
      /* "demand" disegna solo quando qualcosa cambia. Uno scaffale e' fermo
         finche' non lo tocchi: da fermo il consumo GPU va a zero, e su un
         telefono questo e' insieme batteria e temperatura -- cioe' anche
         throttling che non arriva. Durante il gesto ogni evento chiede il
         suo fotogramma, quindi l'interazione resta continua. */
      frameloop="demand"

      /* Il tetto al pixel ratio e' il parametro che pesa di piu'. */
      dpr={[1, DPR_MAX]}

      /* Antialias off: costa una passata di risoluzione e su questi bordi
         non si vede. Ombre off del tutto -- una shadow map e' una seconda
         passata della scena intera. */
      gl={{ antialias: false, powerPreference: 'high-performance' }}
      shadows={false}

      camera={{ fov: 40 }}
    >
      {/* DUE LUCI. Ogni luce dinamica in piu' e' un moltiplicatore su ogni
          frammento: nella versione precedente quel conto valeva, da solo,
          il 28% del tempo GPU. */}
      <ambientLight intensity={1.1} />
      <directionalLight position={[4, 8, 6]} intensity={1.4} />

      <Scaffale scatole={scatole} />
      <Inquadratura larghezza={larghezza} />
      <Sonda />

      <OrbitControls
        target={[0, 1.5, 0]}
        enablePan={false}
        minDistance={3}
        maxDistance={40}
        maxPolarAngle={Math.PI / 2}
      />
    </Canvas>
  )
}
