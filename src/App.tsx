import { useMemo, useState } from 'react'
import { Scena } from './scene/Scena'
import { ProvvedoreStato, useStato } from './dati/stato'
import { scatolaDi, tintaDi } from './dati/gioco'
import { TabBar, type Tab } from './ui/TabBar'
import { Libreria } from './ui/Libreria'
import { Collezione } from './ui/Collezione'
import { Catalogo } from './ui/Catalogo'
import { Partite } from './ui/Partite'
import { Profilo } from './ui/Profilo'
import { ProvvedoreTema, useTavolozza } from './ui/tema'

function Guscio() {
  const { giochiScaffale, stato } = useStato()
  const { attiva } = useTavolozza()
  const [tab, setTab] = useState<Tab>('libreria')
  /* La scelta vive qui e non dentro la libreria: la tengono sia il pannello
     dei comandi sia il mobile 3D, che stanno in due rami diversi
     dell'albero. */
  const [selezionato, setSelezionato] = useState<number | null>(null)
  const [profiloAperto, setProfiloAperto] = useState(false)

  /* Da gioco a scatola: le misure sono una stima (BGG non pubblica le
     dimensioni) e la tinta deriva dall'id, finche' l'atlante non portera'
     le copertine vere. */
  const scatole = useMemo(
    () => giochiScaffale.map((g) => ({
      id: g.id, nome: g.nome, tinta: tintaDi(g.id),
      copertinaUrl: g.copertinaUrl, ...scatolaDi(g),
    })),
    [giochiScaffale])

  return (
    <>
      {/* Il fondale 3D e' sempre montato: cambiare tab lo copre, non lo
          distrugge. Ricreare il contesto WebGL vorrebbe dire ricaricare
          tutte le texture a ogni passaggio. */}
      <div className="fondale">
        {/* `sopra`/`sotto`: quanto l'interfaccia copre della scena, in pixel
            CSS -- testata in alto, pannello dei comandi piu' barra dei tab in
            basso. Servono all'inquadratura, che senno' nasconde la riga di
            sotto dietro ai comandi, e una scatola nascosta non si puo'
            toccare. Rispecchiano ui/app.css: se cambiano quelle misure,
            vanno cambiate qui. */}
        <Scena
          scatole={scatole}
          selezionato={selezionato}
          onSeleziona={setSelezionato}
          tema={attiva}
          sopra={tab === 'libreria' ? 150 : 0}
          sotto={tab === 'libreria' ? 210 : 0}
        />
      </div>

      {tab === 'libreria'   && <Libreria selezionato={selezionato} seleziona={setSelezionato} />}
      {tab === 'collezione' && <Collezione />}
      {tab === 'catalogo'   && <Catalogo />}
      {tab === 'partite'    && <Partite />}

      {/* Il profilo non e' un quinto tab: in basso ci stanno i posti dove si
          passa il tempo, e le impostazioni non sono uno di quelli. */}
      <button
        className="meeple"
        aria-label={'Il profilo di ' + (stato.profilo.nick || 'chi sei')}
        onClick={() => setProfiloAperto(true)}
      >
        <span style={{ background: stato.profilo.tinta }} />
      </button>

      <TabBar attivo={tab} cambia={setTab} />

      {profiloAperto && <Profilo chiudi={() => setProfiloAperto(false)} />}

      {/* La sonda scrive qui dentro, senza passare da React. */}
      <span id="sonda" className="sonda" />
    </>
  )
}

export default function App() {
  return (
    <ProvvedoreTema>
      <ProvvedoreStato>
        <Guscio />
      </ProvvedoreStato>
    </ProvvedoreTema>
  )
}
