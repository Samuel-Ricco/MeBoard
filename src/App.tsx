import { useState } from 'react'
import { Scena } from './scene/Scena'
import { ProvvedoreStato, useStato } from './dati/stato'
import { TabBar, type Tab } from './ui/TabBar'
import { Libreria } from './ui/Libreria'
import { Collezione } from './ui/Collezione'
import { Catalogo } from './ui/Catalogo'
import { Partite } from './ui/Partite'

function Guscio() {
  const { giochiScaffale } = useStato()
  const [tab, setTab] = useState<Tab>('libreria')
  /* La scelta vive qui e non dentro la libreria: la tiene sia il pannello
     dei comandi sia lo scaffale 3D, che stanno in due rami diversi
     dell'albero. */
  const [selezionato, setSelezionato] = useState<string | null>(null)

  return (
    <>
      {/* Il fondale 3D e' sempre montato: cambiare tab lo copre, non lo
          distrugge. Ricreare il contesto WebGL vorrebbe dire ricaricare
          tutte le texture a ogni passaggio. */}
      <div className="fondale">
        {/* Quanto l'interfaccia copre della scena, in pixel CSS: testata in
            alto, pannello dei comandi piu' barra dei tab in basso. Servono
            all'inquadratura, che senno' nasconde la riga di sotto dietro ai
            comandi -- e una scatola nascosta non si puo' toccare.
            Rispecchiano ui/app.css: se cambiano quelle misure, vanno
            cambiate qui. */}
        <Scena
          scatole={giochiScaffale}
          selezionato={selezionato}
          onSeleziona={setSelezionato}
          sopra={tab === 'libreria' ? 150 : 0}
          sotto={tab === 'libreria' ? 210 : 0}
        />
      </div>

      {tab === 'libreria'   && <Libreria selezionato={selezionato} seleziona={setSelezionato} />}
      {tab === 'collezione' && <Collezione />}
      {tab === 'catalogo'   && <Catalogo />}
      {tab === 'partite'    && <Partite />}

      <TabBar attivo={tab} cambia={setTab} />

      {/* La sonda scrive qui dentro, senza passare da React. */}
      <span id="sonda" className="sonda" />
    </>
  )
}

export default function App() {
  return (
    <ProvvedoreStato>
      <Guscio />
    </ProvvedoreStato>
  )
}
