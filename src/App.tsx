import { useMemo } from 'react'
import { Scena } from './scene/Scena'
import { scaffaleFinto } from './dati/finti'

export default function App() {
  /* LO STATO CHE ANIMA NON PASSA MAI DA REACT.
     Qui i dati sono statici, ma la regola vale da subito: quello che cambia
     a ogni fotogramma vive dentro useFrame e nelle ref. Un setState per
     fotogramma ricrea, in forma nuova, il problema di prestazioni da cui
     stiamo scappando. */
  const scatole = useMemo(() => scaffaleFinto(28), [])

  return (
    <>
      <Scena scatole={scatole} />
      <div className="hud sicura">
        <div className="barra">
          MeBoard
          <span id="sonda" className="sonda" />
        </div>
        <div className="nota">
          {scatole.length} scatole, misure tutte diverse — una sola draw call.
          Trascina per ruotare, pizzica per avvicinarti.
        </div>
      </div>
    </>
  )
}
