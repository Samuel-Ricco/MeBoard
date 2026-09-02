import { useEffect, useState } from 'react'
import { type Gioco, scatolaDi } from '../dati/gioco'
import { assicuraDettagli } from '../dati/catalogo'
import { useStato } from '../dati/stato'
import { Foglio } from './Foglio'
import { CopertinaGrande } from './Copertina'
import { IcoSpunta, IcoStella, IcoPiu, IcoMeno, IcoMatita } from './icone'

const giorno = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })

/* IL VOTO, DA 1 A 10 COME SU BGG.
 *
 * Dieci bottoni in fila invece di un cursore: su un telefono un cursore da
 * dieci passi si azzecca al terzo tentativo, e il voto e' un numero
 * discreto, non una quantita' continua. Le tacche si toccano una per una e
 * si vede a colpo d'occhio dove si e' arrivati. */
function Voto({ valore, cambia }: { valore: number; cambia: (n: number) => void }) {
  return (
    <div className="voto">
      <div className="voto-tacche">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            className={'tacca' + (n <= valore ? ' tacca-piena' : '')}
            aria-label={'voto ' + n}
            aria-pressed={n === valore}
            onClick={() => cambia(n === valore ? 0 : n)}
          />
        ))}
      </div>
      <span className="voto-numero">{valore || '–'}</span>
    </div>
  )
}

export function SchedaGioco({ gioco: iniziale, chiudi }: { gioco: Gioco; chiudi: () => void }) {
  /* APRIRE LA SCHEDA E' IL MOMENTO IN CUI VALE LA PENA DISTURBARE BGG.
     Del catalogo si conoscono nome, anno e rank per tutti; giocatori,
     durata, peso e copertina arrivano solo per i giochi che qualcuno apre
     davvero. Chiederli per centottantamila giochi in anticipo sarebbe
     sbagliato; chiederli qui, una volta e per tutti, e' il punto giusto. */
  const [gioco, setGioco] = useState(iniziale)

  useEffect(() => {
    setGioco(iniziale)
    if (iniziale.giocatoriMin !== null) return   // gia' completo
    let vivo = true
    assicuraDettagli([iniziale]).then(([pieno]) => {
      if (vivo && pieno) setGioco(pieno)
    })
    return () => { vivo = false }
  }, [iniziale])

  const {
    stato, etichetteDelGioco, partiteDelGioco,
    cambiaPossesso, cambiaDesiderio, aggiungiAScaffale, togliDaScaffale, pieno,
    salvaRecensione, eliminaRecensione, cambiaEtichettaGioco,
  } = useStato()

  const posseduto = stato.collezione.includes(gioco.id)
  const desiderato = stato.desideri.includes(gioco.id)
  const suRipiano = stato.scaffale.includes(gioco.id)
  const recensione = stato.recensioni[gioco.id]
  const mie = etichetteDelGioco(gioco.id).map((e) => e.id)
  const partite = partiteDelGioco(gioco.id)

  const [scrivo, setScrivo] = useState(false)
  const [voto, setVoto] = useState(recensione?.voto ?? 0)
  const [testo, setTesto] = useState(recensione?.testo ?? '')

  return (
    <Foglio titolo={gioco.nome} chiudi={chiudi}>
      <div className="scheda">
        <CopertinaGrande gioco={gioco} />
        <p className="scheda-sotto">
          {gioco.editore} · {gioco.anno}
        </p>

        <div className="statistiche" style={{ padding: '0 0 16px' }}>
          <div className="statistica">
            <div className="valore">{gioco.giocatoriMin ?? '?'}–{gioco.giocatoriMax ?? '?'}</div>
            <div className="nome">giocatori</div>
          </div>
          <div className="statistica">
            <div className="valore">{gioco.durataMax ?? gioco.durataMin ?? '?'}&apos;</div>
            <div className="nome">durata</div>
          </div>
          <div className="statistica">
            <div className="valore">{gioco.peso ? gioco.peso.toFixed(1) : '?'}<span style={{ opacity: .4 }}>/5</span></div>
            <div className="nome">peso</div>
          </div>
        </div>

        {/* ---- cosa ne fai ---- */}
        <div className="scheda-comandi">
          <button
            className={'pillola' + (posseduto ? ' pillola-piena' : ' pillola-fantasma')}
            onClick={() => cambiaPossesso(gioco.id, !posseduto)}
          >
            {posseduto ? <IcoSpunta size={16} /> : <IcoPiu size={16} />}
            {posseduto ? "Ce l'ho" : 'Aggiungi'}
          </button>
          <button
            className={'pillola' + (desiderato ? ' pillola-piena' : ' pillola-fantasma')}
            onClick={() => cambiaDesiderio(gioco.id, !desiderato)}
            /* Un gioco che possiedi non puo' essere un desiderio: sarebbe
               l'app a contraddirsi da sola in due schermate diverse. */
            disabled={posseduto}
          >
            <IcoStella size={16} />
            {desiderato ? 'Nei desideri' : 'Lo voglio'}
          </button>
          {posseduto && (
            <button
              className={'pillola' + (suRipiano ? ' pillola-piena' : ' pillola-fantasma')}
              onClick={() => suRipiano ? togliDaScaffale(gioco.id) : aggiungiAScaffale(gioco.id)}
              disabled={!suRipiano && pieno}
            >
              {suRipiano ? <IcoMeno size={16} /> : <IcoPiu size={16} />}
              {suRipiano ? 'Nel mobile' : pieno ? 'Mobile pieno' : 'Metti nel mobile'}
            </button>
          )}
        </div>

        {/* ---- etichette ---- */}
        {stato.etichette.length > 0 && (
          <section className="scheda-sezione">
            <h3 className="scheda-titolo">Etichette</h3>
            <div className="scheda-comandi">
              {stato.etichette.map((e) => {
                const dentro = mie.includes(e.id)
                return (
                  <button
                    key={e.id}
                    className={'pillola' + (dentro ? ' pillola-piena' : ' pillola-fantasma')}
                    onClick={() => cambiaEtichettaGioco(gioco.id, e.id, !dentro)}
                  >
                    {e.nome}
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {/* ---- la tua recensione ---- */}
        <section className="scheda-sezione">
          <h3 className="scheda-titolo">Quello che ne pensi tu</h3>

          {scrivo ? (
            <>
              <Voto valore={voto} cambia={setVoto} />
              <textarea
                className="scrittoio"
                value={testo}
                onChange={(e) => setTesto(e.target.value)}
                placeholder="Poche righe bastano."
                rows={4}
                aria-label="La tua recensione"
              />
              <div className="scheda-comandi">
                <button
                  className="pillola pillola-piena"
                  onClick={() => { salvaRecensione(gioco.id, voto, testo); setScrivo(false) }}
                  disabled={!voto && !testo.trim()}
                >
                  Salva
                </button>
                <button className="pillola pillola-fantasma" onClick={() => {
                  setVoto(recensione?.voto ?? 0)
                  setTesto(recensione?.testo ?? '')
                  setScrivo(false)
                }}>
                  Lascia perdere
                </button>
              </div>
            </>
          ) : recensione ? (
            <>
              <div className="recensione">
                <span className="recensione-voto">{recensione.voto || '–'}</span>
                <div>
                  {recensione.testo && <p className="recensione-testo">{recensione.testo}</p>}
                  <p className="recensione-quando">scritta il {giorno(recensione.quando)}</p>
                </div>
              </div>
              <div className="scheda-comandi">
                <button className="pillola pillola-fantasma" onClick={() => setScrivo(true)}>
                  <IcoMatita size={16} /> Cambia
                </button>
                <button className="pillola pillola-allarme" onClick={() => {
                  eliminaRecensione(gioco.id)
                  setVoto(0); setTesto('')
                }}>
                  Cancella
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="scheda-nota">Non hai ancora scritto niente su questo.</p>
              <button className="pillola pillola-piena" onClick={() => setScrivo(true)}>
                <IcoMatita size={16} /> Scrivi una recensione
              </button>
            </>
          )}
        </section>

        {/* ---- partite ---- */}
        <section className="scheda-sezione">
          <h3 className="scheda-titolo">
            Partite {partite.length > 0 && <span className="scheda-conta">{partite.length}</span>}
          </h3>
          {partite.length === 0 ? (
            <p className="scheda-nota">Mai segnata una partita a questo.</p>
          ) : (
            <ul className="scheda-partite">
              {partite.map((p) => (
                <li key={p.id}>
                  <span>{giorno(p.data)}</span>
                  <span>{p.vincitore ? 'vince ' + p.vincitore : p.giocatori.length + ' al tavolo'}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="scheda-misure">
          Scatola stimata {scatolaDi(gioco).larghezza}×{scatolaDi(gioco).altezza}×{scatolaDi(gioco).spessore} cm
        </p>
      </div>
    </Foglio>
  )
}
