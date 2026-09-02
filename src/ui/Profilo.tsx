import { useState } from 'react'
import { useStato } from '../dati/stato'
import { useTavolozza, type Tavolozza } from './tema'
import { Foglio } from './Foglio'
import { IcoPiu, IcoEtichetta } from './icone'

const TINTE = ['#CCFF4D', '#E4674A', '#49C7F2', '#B98CF7', '#7CF0A8', '#F2B33D']

const TAVOLOZZE: Array<{ id: Tavolozza; nome: string }> = [
  { id: 'auto',   nome: 'Come il telefono' },
  { id: 'chiaro', nome: 'Chiaro' },
  { id: 'scuro',  nome: 'Scuro' },
]

/* IL PROFILO.
 *
 * Non e' un tab: le quattro sezioni in basso sono i posti dove si passa il
 * tempo, e le impostazioni non sono uno di quelli. Sta dietro al meeple in
 * alto a destra, come in tutte le app dove il profilo e' una cosa che si
 * apre e si chiude.
 *
 * Niente account, niente codice amico: senza un backend sarebbero bottoni
 * che non portano da nessuna parte.
 */
export function Profilo({ chiudi }: { chiudi: () => void }) {
  const { stato, salvaProfilo, aggiungiGiocatore, togliGiocatore,
          creaEtichetta, eliminaEtichetta } = useStato()
  const { scelta, cambia } = useTavolozza()

  const [nuovoGiocatore, setNuovoGiocatore] = useState('')
  const [nuovaEtichetta, setNuovaEtichetta] = useState('')

  return (
    <Foglio titolo="Il tuo profilo" chiudi={chiudi}>
      <div className="scheda">

        <section className="scheda-sezione" style={{ borderTop: 0, paddingTop: 0 }}>
          <h3 className="scheda-titolo">La tua faccia</h3>
          <div className="faccia">
            <span className="meeple-grande" style={{ background: stato.profilo.tinta }} />
            <input
              className="campo"
              value={stato.profilo.nick}
              onChange={(e) => salvaProfilo({ nick: e.target.value })}
              placeholder="Come ti chiamiamo?"
              aria-label="Il tuo nome"
              maxLength={24}
            />
          </div>
          <div className="tinte">
            {TINTE.map((t) => (
              <button
                key={t}
                className={'tinta' + (t === stato.profilo.tinta ? ' tinta-scelta' : '')}
                style={{ background: t }}
                aria-label={'colore ' + t}
                aria-pressed={t === stato.profilo.tinta}
                onClick={() => salvaProfilo({ tinta: t })}
              />
            ))}
          </div>
        </section>

        <section className="scheda-sezione">
          <h3 className="scheda-titolo">Tavolozza</h3>
          <div className="scheda-comandi">
            {TAVOLOZZE.map((t) => (
              <button
                key={t.id}
                className={'pillola' + (scelta === t.id ? ' pillola-piena' : ' pillola-fantasma')}
                onClick={() => cambia(t.id)}
              >
                {t.nome}
              </button>
            ))}
          </div>
          <p className="scheda-nota">
            Su &laquo;come il telefono&raquo; l&apos;app segue il sistema, che di sera passa
            a scuro da solo.
          </p>
        </section>

        <section className="scheda-sezione">
          <h3 className="scheda-titolo">
            Giocatori {stato.giocatori.length > 0 && <span className="scheda-conta">{stato.giocatori.length}</span>}
          </h3>
          <p className="scheda-nota">
            Chi si siede al tavolo. Si scrivono una volta e poi si scelgono
            segnando una partita.
          </p>
          <div className="scheda-comandi">
            {stato.giocatori.map((g) => (
              <span className="gettone" key={g}>
                {g}
                <button
                  className="gettone-via"
                  aria-label={'Togli ' + g}
                  onClick={() => togliGiocatore(g)}
                >×</button>
              </span>
            ))}
          </div>
          <form
            className="aggiungi"
            onSubmit={(e) => { e.preventDefault(); aggiungiGiocatore(nuovoGiocatore); setNuovoGiocatore('') }}
          >
            <input
              className="campo"
              value={nuovoGiocatore}
              onChange={(e) => setNuovoGiocatore(e.target.value)}
              placeholder="Un nome"
              aria-label="Nome del giocatore"
              maxLength={24}
            />
            <button className="bottoncino bottoncino-acceso" aria-label="Aggiungi il giocatore" disabled={!nuovoGiocatore.trim()}>
              <IcoPiu size={17} />
            </button>
          </form>
        </section>

        <section className="scheda-sezione">
          <h3 className="scheda-titolo">
            <IcoEtichetta size={16} /> Etichette
            {stato.etichette.length > 0 && <span className="scheda-conta">{stato.etichette.length}</span>}
          </h3>
          <p className="scheda-nota">
            Come dividi i tuoi giochi: party, strategici, quelli in due&hellip;
          </p>
          <div className="scheda-comandi">
            {stato.etichette.map((e) => (
              <span className="gettone" key={e.id}>
                {e.nome}
                <button
                  className="gettone-via"
                  aria-label={'Elimina ' + e.nome}
                  onClick={() => eliminaEtichetta(e.id)}
                >×</button>
              </span>
            ))}
          </div>
          <form
            className="aggiungi"
            onSubmit={(e) => { e.preventDefault(); creaEtichetta(nuovaEtichetta); setNuovaEtichetta('') }}
          >
            <input
              className="campo"
              value={nuovaEtichetta}
              onChange={(e) => setNuovaEtichetta(e.target.value)}
              placeholder="party games, strategici&hellip;"
              aria-label="Nome dell&apos;etichetta"
              maxLength={24}
            />
            <button className="bottoncino bottoncino-acceso" aria-label="Crea l&apos;etichetta" disabled={!nuovaEtichetta.trim()}>
              <IcoPiu size={17} />
            </button>
          </form>
        </section>

      </div>
    </Foglio>
  )
}
