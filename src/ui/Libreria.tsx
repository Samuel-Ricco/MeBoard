import { useState } from 'react'
import type { Gioco } from '../dati/giochi'
import { useStato } from '../dati/stato'
import { SchedaGioco } from './SchedaGioco'
import { COLONNE, RIGHE, casella } from '../scene/mobile'
import { Foglio } from './Foglio'
import { Ghirigoro, IcoPiu, IcoMeno, IcoSu, IcoGiu, IcoSinistra, IcoDestra } from './icone'

/* LA LIBRERIA.
 *
 * E' l'unica schermata che non copre la scena: il Kallax sta dietro e si
 * vede. I comandi galleggiano sopra, vicino al pollice.
 *
 * Si sceglie una scatola toccandola direttamente nel mobile -- il raycast
 * su InstancedMesh restituisce `instanceId`, che e' anche il numero della
 * casella. Scelta una scatola, la si sposta di casella, la si toglie,
 * oppure se ne aggiunge un'altra dalla collezione.
 */
export function Libreria({ selezionato, seleziona }: {
  selezionato: string | null
  seleziona: (id: string | null) => void
}) {
  const { giochiScaffale, giochiCollezione, stato, celle, pieno,
          aggiungiAScaffale, togliDaScaffale, scambiaSuScaffale } = useStato()
  const [foglioAperto, setFoglioAperto] = useState(false)
  const [scheda, setScheda] = useState<Gioco | null>(null)

  const posto = giochiScaffale.findIndex((g) => g.id === selezionato)
  const scelto = posto >= 0 ? giochiScaffale[posto] : null
  const dove = posto >= 0 ? casella(posto) : null

  /* Si possono mettere nel mobile solo i giochi che possiedi e che non ci
     sono gia': il ripiano e' un sottoinsieme della collezione. */
  const aggiungibili = giochiCollezione.filter((g) => !stato.scaffale.includes(g.id))

  /* Una casella e' raggiungibile solo se esiste E se e' occupata: scambiare
     con il vuoto vorrebbe dire lasciare un buco in mezzo alla griglia. */
  const puo = (delta: number) => {
    const a = posto + delta
    return posto >= 0 && a >= 0 && a < giochiScaffale.length
  }
  const muovi = (delta: number) => { if (puo(delta)) scambiaSuScaffale(posto, posto + delta) }

  return (
    <div className="schermo schermo-vetro">
      <header className="intestazione">
        <div className="occhiello">la tua libreria</div>
        <div className="intestazione-riga">
          <span className="numerone">{giochiScaffale.length}</span>
          <span className="coda">giochi su {celle} caselle</span>
        </div>
        <Ghirigoro w={104} h={22} />
      </header>

      <div className="pannello">
        {scelto && dove ? (
          <>
            <div className="pannello-titolo">
              {/* Il nome apre la scheda: un bersaglio che c'e' gia', invece
                  di un sesto bottone in una fila gia' piena. */}
              <button className="pannello-nome" onClick={() => setScheda(scelto)}>
                {scelto.nome}
              </button>
              <span className="pannello-posto">
                riga {dove.riga + 1} · col {dove.colonna + 1}
              </span>
            </div>
            {/* Le quattro direzioni come icone sole, e l'unica azione con
                conseguenza -- togliere -- scritta a parole. */}
            <div className="frecce">
              <button className="bottoncino" aria-label="Sposta a sinistra"
                      onClick={() => muovi(-1)} disabled={!puo(-1)}>
                <IcoSinistra size={17} />
              </button>
              <button className="bottoncino" aria-label="Sposta in alto"
                      onClick={() => muovi(-COLONNE)} disabled={!puo(-COLONNE)}>
                <IcoSu size={17} />
              </button>
              <button className="bottoncino" aria-label="Sposta in basso"
                      onClick={() => muovi(COLONNE)} disabled={!puo(COLONNE)}>
                <IcoGiu size={17} />
              </button>
              <button className="bottoncino" aria-label="Sposta a destra"
                      onClick={() => muovi(1)} disabled={!puo(1)}>
                <IcoDestra size={17} />
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
              {pieno
                ? `Il mobile e' pieno: ${RIGHE}×${COLONNE} caselle. Togline uno per farne entrare un altro.`
                : 'Tocca una scatola nel mobile per spostarla o toglierla.'}
            </p>
            <div className="pannello-comandi" style={{ marginTop: 11 }}>
              <button
                className="pillola pillola-piena"
                onClick={() => setFoglioAperto(true)}
                disabled={pieno || aggiungibili.length === 0}
              >
                <IcoPiu size={16} />
                {pieno ? 'Nessuna casella libera'
                  : aggiungibili.length ? 'Aggiungi un gioco'
                  : 'Sono tutti nel mobile'}
              </button>
            </div>
          </>
        )}
      </div>

      {scheda && <SchedaGioco gioco={scheda} chiudi={() => setScheda(null)} />}

      {foglioAperto && (
        <Foglio titolo="Metti nel mobile" chiudi={() => setFoglioAperto(false)}>
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
                    aria-label={'Metti ' + g.nome + ' nel mobile'}
                    onClick={() => {
                      aggiungiAScaffale(g.id)
                      seleziona(g.id)
                      setFoglioAperto(false)
                    }}
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
