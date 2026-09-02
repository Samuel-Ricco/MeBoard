import { useMemo, useState } from 'react'
import type { Gioco } from '../dati/gioco'
import { useStato } from '../dati/stato'
import { Aspetto } from './Aspetto'
import { Foglio } from './Foglio'
import { Copertina } from './Copertina'
import { Ghirigoro, IcoPiu, IcoAspetto } from './icone'

/* LA LIBRERIA.
 *
 * L'unica schermata che non copre la scena: il mobile sta dietro e si
 * vede. Sopra ci sono solo il nome e due bottoni, perche' i comandi veri
 * sono i GESTI sul mobile -- toccare per aprire, tenere premuto per
 * spostare, scorrere per cambiare libreria.
 *
 * C'era un pannello fisso in basso con "tocca una scatola" e due
 * bottoni: occupava un quinto dello schermo per spiegare un gesto e per
 * offrire un comando che sta gia' altrove.
 */
export function Libreria({ apriScheda }: { apriScheda: (g: Gioco) => void }) {
  const {
    stato, libreria, giochiCollezione, celle, pieno,
    metti, vaiA, creaLibreria,
  } = useStato()

  const [foglioAperto, setFoglioAperto] = useState(false)
  const [aspettoAperto, setAspettoAperto] = useState(false)

  /* Si possono mettere nel mobile solo i giochi che possiedi e che non ci
     sono gia': il ripiano e' un sottoinsieme della collezione. */
  const aggiungibili = useMemo(
    () => giochiCollezione.filter((g) => !libreria.caselle.includes(g.id)),
    [giochiCollezione, libreria.caselle])

  return (
    <div className="schermo schermo-vetro">
      <div className="attrezzi">
        <button
          className="bottoncino"
          onClick={() => setAspettoAperto(true)}
          aria-label="Modifica questa libreria"
          title="Nome, legno, luce, ordine"
        >
          <IcoAspetto size={17} />
        </button>
        <button
          className="bottoncino"
          onClick={() => setFoglioAperto(true)}
          disabled={pieno || aggiungibili.length === 0}
          aria-label="Metti un gioco in questa libreria"
          title={pieno ? 'Nessuna casella libera' : 'Metti un gioco'}
        >
          <IcoPiu size={17} />
        </button>
      </div>

      <header className="intestazione intestazione-libreria">
        <div className="occhiello">{libreria.nome}</div>
        <div className="intestazione-riga">
          <span className="numerone">{libreria.caselle.length}</span>
          <span className="coda">giochi su {celle} caselle</span>
        </div>
        <Ghirigoro w={104} h={22} />
      </header>

      {/* Le librerie: quale stai guardando e come si passa alle altre.
          Il gesto e' lo scorrimento sul mobile; questi servono a chi
          preferisce toccare, e a sapere quante ce ne sono. */}
      <div className="librerie">
        {stato.librerie.map((l, i) => (
          <button
            key={l.id}
            className={'segno' + (i === stato.attiva ? ' segno-qui' : '')}
            onClick={() => vaiA(i)}
            aria-label={'Vai a ' + l.nome}
            aria-current={i === stato.attiva}
            title={l.nome}
          />
        ))}
        <button
          className="segno segno-piu"
          onClick={() => creaLibreria()}
          aria-label="Crea una libreria"
          title="Crea una libreria"
        >
          +
        </button>
      </div>

      {aspettoAperto && <Aspetto chiudi={() => setAspettoAperto(false)} />}

      {foglioAperto && (
        <Foglio titolo="Metti nel mobile" chiudi={() => setFoglioAperto(false)}>
          <div className="elenco">
            {aggiungibili.map((g) => (
              <div className="riga" key={g.id}>
                <button
                  className="riga-apri"
                  onClick={() => { apriScheda(g); setFoglioAperto(false) }}
                >
                  <Copertina gioco={g} />
                  <span className="riga-corpo">
                    <span className="riga-nome">{g.nome}</span>
                    <span className="riga-sotto">
                      {g.editore ?? '—'} · {g.anno ?? '—'}
                    </span>
                  </span>
                </button>
                <div className="riga-azioni">
                  <button
                    className="bottoncino bottoncino-acceso"
                    aria-label={'Metti ' + g.nome + ' nel mobile'}
                    onClick={() => { metti(g.id); setFoglioAperto(false) }}
                  >
                    <IcoPiu size={17} />
                  </button>
                </div>
              </div>
            ))}
            {aggiungibili.length === 0 && (
              <p className="scheda-nota" style={{ padding: '0 18px' }}>
                Non hai altri giochi da mettere qui.
              </p>
            )}
          </div>
        </Foglio>
      )}
    </div>
  )
}
