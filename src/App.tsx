import { useCallback, useMemo, useState } from 'react'
import { Scena } from './scene/Scena'
import { ProvvedoreStato, useStato } from './dati/stato'
import { scatolaDi, tintaDi, type Gioco } from './dati/gioco'
import { TabBar, type Tab } from './ui/TabBar'
import { Libreria } from './ui/Libreria'
import { Collezione } from './ui/Collezione'
import { Catalogo } from './ui/Catalogo'
import { Partite } from './ui/Partite'
import { Profilo } from './ui/Profilo'
import { SchedaGioco } from './ui/SchedaGioco'
import { ProvvedoreTema, useTavolozza } from './ui/tema'

function Guscio() {
  const {
    stato, libreria, giochiLibreria, giochi,
    scambia, trasloca, vaiA,
  } = useStato()
  const { attiva } = useTavolozza()
  const [tab, setTab] = useState<Tab>('libreria')
  const [profiloAperto, setProfiloAperto] = useState(false)
  /* La scheda vive qui e non nelle schermate: la aprono sia il mobile 3D
     sia le righe degli elenchi, che stanno in rami diversi dell'albero. */
  const [scheda, setScheda] = useState<Gioco | null>(null)

  /* La scatola che si sta portando, e la casella sotto il dito. Stanno
     qui perche' le legge la scena e le scrive il gesto. */
  const [inMano, setInMano] = useState<number | null>(null)
  const [bersaglio, setBersaglio] = useState<number | null>(null)

  /* MENTRE SI TRASCINA, IL MOBILE MOSTRA GIA' IL RISULTATO.
     Le due scatole si scambiano subito di posto: cosi' si vede dove
     andra' a finire invece di doverlo immaginare, e alzando il dito non
     succede piu' niente di nuovo. */
  const mostrate = useMemo(() => {
    const v = giochiLibreria.map((g) => ({
      id: g.id,
      nome: g.nome,
      tinta: tintaDi(g.id),
      copertinaUrl: g.copertinaUrl,
      ...scatolaDi(g),
    }))
    if (inMano === null || bersaglio === null) return v
    if (bersaglio >= v.length || bersaglio === inMano) return v
    ;[v[inMano], v[bersaglio]] = [v[bersaglio], v[inMano]]
    return v
  }, [giochiLibreria, inMano, bersaglio])

  const apri = useCallback((indice: number) => {
    const g = giochiLibreria[indice]
    if (g) setScheda(g)
  }, [giochiLibreria])

  const lascia = useCallback(() => {
    if (inMano !== null && bersaglio !== null && bersaglio !== inMano
        && bersaglio < giochiLibreria.length) {
      scambia(inMano, bersaglio)
    }
    setInMano(null)
    setBersaglio(null)
  }, [inMano, bersaglio, giochiLibreria.length, scambia])

  /* Scorrere cambia libreria. Se si sta portando una scatola, la scatola
     VIENE CON TE: e' il modo naturale di spostarla da un mobile
     all'altro, ed e' anche l'unico che non chiede un'altra schermata. */
  const scorri = useCallback((verso: 1 | -1) => {
    const prossima = stato.attiva + verso
    if (prossima < 0 || prossima >= stato.librerie.length) return

    if (inMano !== null) {
      const g = giochiLibreria[inMano]
      if (g) trasloca(g.id, stato.librerie[prossima].id, 0)
      setInMano(null)
      setBersaglio(null)
    }
    vaiA(prossima)
  }, [stato.attiva, stato.librerie, inMano, giochiLibreria, trasloca, vaiA])

  const aspetto = useMemo(() => ({
    legno: libreria.legno,
    muro: stato.muro,
    pavimento: stato.pavimento,
    forza: libreria.forza,
  }), [libreria.legno, libreria.forza, stato.muro, stato.pavimento])

  return (
    <>
      {/* Il fondale 3D e' sempre montato: cambiare tab lo copre, non lo
          distrugge. Ricreare il contesto WebGL vorrebbe dire ricaricare
          tutte le texture a ogni passaggio. */}
      <div className="fondale">
        {/* `sopra`/`sotto`: quanto l'interfaccia copre della scena, in
            pixel CSS. Servono all'inquadratura, che senno' nasconde la
            riga di sotto dietro ai comandi, e una scatola nascosta non si
            puo' toccare. Rispecchiano ui/app.css. */}
        <Scena
          scatole={mostrate}
          evidenziato={inMano === null ? null : (bersaglio ?? inMano)}
          tema={attiva}
          aspetto={aspetto}
          sopra={tab === 'libreria' ? 170 : 0}
          sotto={tab === 'libreria' ? 120 : 0}
          apri={apri}
          prendi={setInMano}
          trascina={setBersaglio}
          lascia={lascia}
          scorri={scorri}
        />
      </div>

      {tab === 'libreria'   && <Libreria apriScheda={setScheda} />}
      {tab === 'collezione' && <Collezione apriScheda={setScheda} />}
      {tab === 'catalogo'   && <Catalogo apriScheda={setScheda} />}
      {tab === 'partite'    && <Partite apriScheda={setScheda} />}

      {/* Il profilo non e' un quinto tab: in basso ci stanno i posti dove
          si passa il tempo, e le impostazioni non sono uno di quelli. */}
      <button
        className="meeple"
        aria-label={'Il profilo di ' + (stato.profilo.nick || 'chi sei')}
        onClick={() => setProfiloAperto(true)}
      >
        <span style={{ background: stato.profilo.tinta }} />
      </button>

      <TabBar attivo={tab} cambia={setTab} />

      {profiloAperto && <Profilo chiudi={() => setProfiloAperto(false)} />}
      {scheda && (
        <SchedaGioco
          gioco={giochi.get(scheda.id) ?? scheda}
          chiudi={() => setScheda(null)}
        />
      )}

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
