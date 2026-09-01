import { useState } from 'react'
import { useStato } from '../dati/stato'
import { Foglio } from './Foglio'
import { Ghirigoro, IcoPiu, IcoMeno, IcoSu, IcoGiu } from './icone'

/* LA LIBRERIA.
 *
 * E' l'unica schermata che non copre la scena: lo scaffale 3D sta dietro e
 * si vede. I comandi galleggiano sopra, vicino al pollice.
 *
 * Si sceglie una scatola toccandola direttamente sullo scaffale -- il
 * raycast su InstancedMesh restituisce l'indice dell'istanza, che e' anche
 * la posizione sul ripiano. Scelta una scatola, la si sposta, la si toglie,
 * oppure se ne aggiunge un'altra dalla collezione.
 */
export function Libreria({ selezionato, seleziona }: {
  selezionato: string | null
  seleziona: (id: string | null) => void
}) {
  const { giochiScaffale, giochiCollezione, stato,
          aggiungiAScaffale, togliDaScaffale, spostaSuScaffale } = useStato()
  const [foglioAperto, setFoglioAperto] = useState(false)

  const posto = giochiScaffale.findIndex((g) => g.id === selezionato)
  const scelto = posto >= 0 ? giochiScaffale[posto] : null

  /* Si possono mettere sullo scaffale solo i giochi che possiedi e che non
     ci sono gia': lo scaffale e' un sottoinsieme della collezione. */
  const aggiungibili = giochiCollezione.filter((g) => !stato.scaffale.includes(g.id))

  const sposta = (verso: -1 | 1) => {
    if (posto < 0) return
    spostaSuScaffale(posto, posto + verso)
  }

  return (
    <div className="schermo schermo-vetro">
      <header className="intestazione">
        <div className="occhiello">la tua libreria</div>
        <div className="intestazione-riga">
          <span className="numerone">{giochiScaffale.length}</span>
          <span className="coda">scatole sul ripiano</span>
        </div>
        <Ghirigoro w={104} h={22} />
      </header>

      <div className="pannello">
        {scelto ? (
          <>
            <div className="pannello-titolo">
              <span className="pannello-nome">{scelto.nome}</span>
              <span className="pannello-posto">
                {posto + 1} / {giochiScaffale.length}
              </span>
            </div>
            <div className="pannello-comandi">
              <button
                className="pillola pillola-fantasma"
                onClick={() => sposta(-1)}
                disabled={posto === 0}
                aria-label="Sposta a sinistra"
              >
                <IcoSu size={16} /> Sposta
              </button>
              <button
                className="pillola pillola-fantasma"
                onClick={() => sposta(1)}
                disabled={posto === giochiScaffale.length - 1}
                aria-label="Sposta a destra"
              >
                <IcoGiu size={16} /> Sposta
              </button>
              <button
                className="pillola pillola-fantasma"
                onClick={() => { togliDaScaffale(scelto.id); seleziona(null) }}
              >
                <IcoMeno size={16} /> Togli
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="suggerimento">
              Tocca una scatola sullo scaffale per spostarla o toglierla.
            </p>
            <div className="pannello-comandi" style={{ marginTop: 11 }}>
              <button
                className="pillola pillola-piena"
                onClick={() => setFoglioAperto(true)}
                disabled={aggiungibili.length === 0}
              >
                <IcoPiu size={16} />
                {aggiungibili.length ? 'Aggiungi un gioco' : 'Sono tutti sul ripiano'}
              </button>
            </div>
          </>
        )}
      </div>

      {foglioAperto && (
        <Foglio titolo="Metti sul ripiano" chiudi={() => setFoglioAperto(false)}>
          <div className="elenco">
            {aggiungibili.map((g) => (
              <div className="riga" key={g.id}>
                <span className="dorso" style={{ background: g.tinta }} />
                <div className="riga-corpo">
                  <div className="riga-nome">{g.nome}</div>
                  <div className="riga-sotto">
                    {g.editore} · {g.anno} · {g.larghezza}×{g.altezza}×{g.spessore} cm
                  </div>
                </div>
                <div className="riga-azioni">
                  <button
                    className="bottoncino bottoncino-acceso"
                    aria-label={'Metti ' + g.nome + ' sul ripiano'}
                    onClick={() => { aggiungiAScaffale(g.id); seleziona(g.id) }}
                  >
                    <IcoPiu size={17} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Foglio>
      )}
    </div>
  )
}
