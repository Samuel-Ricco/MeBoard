import { useEffect, useMemo, useRef, useState } from 'react'
import type { Gioco } from '../dati/gioco'
import { sfoglia, CATEGORIE, type Categoria } from '../dati/catalogo'
import { useStato } from '../dati/stato'
import { SchedaGioco } from './SchedaGioco'
import { descriviInCatalogo } from './descrizione'
import { Copertina } from './Copertina'
import { Ghirigoro, IcoCatalogo, IcoSpunta, IcoPiu, IcoStella } from './icone'

/* IL CATALOGO: centottantamila giochi, non piu' ventotto scritti a mano.
 *
 * Le righe arrivano dal database, che e' la cache di BGG. Due conseguenze
 * che si vedono:
 *
 *  - non si carica tutto: si mostra una pagina per volta, ordinata per
 *    rank. Sfogliare centottantamila righe su un telefono non e' una
 *    funzione, e' un modo di finire la memoria;
 *  - la ricerca va fatta dal database e non in memoria, per lo stesso
 *    motivo. Quindi si aspetta che l'utente smetta di digitare invece di
 *    interrogare a ogni lettera.
 */
export function Catalogo() {
  const { stato, cambiaPossesso, cambiaDesiderio } = useStato()
  const [cerca, setCerca] = useState('')
  const [categoria, setCategoria] = useState<Categoria>('tutti')
  const [giochi, setGiochi] = useState<Gioco[]>([])
  const [caricando, setCaricando] = useState(true)
  const [daDatabase, setDaDatabase] = useState(false)
  const [aperto, setAperto] = useState<Gioco | null>(null)
  /* Solo i miei: filtri che vivono nell'elenco gia' scaricato, non nella
     query -- riguardano te, non il catalogo. */
  const [solo, setSolo] = useState<'niente' | 'mancanti' | 'desideri'>('niente')

  const richiesta = useRef(0)

  useEffect(() => {
    /* Si aspetta che il dito si fermi: una query per lettera digitata
       sarebbe una raffica di richieste, e l'ultima a rispondere non e'
       detto sia l'ultima partita. Il contatore risolve anche quello. */
    const mio = ++richiesta.current
    setCaricando(true)
    const attesa = setTimeout(async () => {
      const { giochi: esiti, daDatabase: vero } = await sfoglia({ cerca, categoria, limite: 60 })
      if (richiesta.current !== mio) return   // ne e' partita una piu' recente
      setGiochi(esiti)
      setDaDatabase(vero)
      setCaricando(false)
    }, cerca ? 350 : 0)
    return () => clearTimeout(attesa)
  }, [cerca, categoria])

  const visibili = useMemo(() => giochi.filter((g) => {
    if (solo === 'mancanti') return !stato.collezione.includes(g.id)
    if (solo === 'desideri') return stato.desideri.includes(g.id)
    return true
  }), [giochi, solo, stato.collezione, stato.desideri])

  return (
    <div className="schermo">
      <header className="intestazione">
        <div className="occhiello">il catalogo</div>
        <div className="intestazione-riga">
          <span className="numerone">{stato.collezione.length}</span>
          <span className="coda">
            giochi tuoi{daDatabase ? ', su 180 mila' : ''}
          </span>
        </div>
        <Ghirigoro w={96} h={20} />
      </header>

      <label className="cerca">
        <IcoCatalogo size={17} />
        <input
          value={cerca}
          onChange={(e) => setCerca(e.target.value)}
          placeholder="Cerca fra 180.000 giochi"
          aria-label="Cerca nel catalogo"
        />
      </label>

      <div className="filtri">
        {CATEGORIE.map((c) => (
          <button
            key={c.id}
            className={'pillola' + (categoria === c.id ? ' pillola-piena' : ' pillola-fantasma')}
            onClick={() => setCategoria(c.id)}
          >
            {c.nome}
          </button>
        ))}
      </div>

      <div className="filtri">
        <button
          className={'pillola' + (solo === 'mancanti' ? ' pillola-piena' : ' pillola-fantasma')}
          onClick={() => setSolo(solo === 'mancanti' ? 'niente' : 'mancanti')}
        >
          Non ho
        </button>
        <button
          className={'pillola' + (solo === 'desideri' ? ' pillola-piena' : ' pillola-fantasma')}
          onClick={() => setSolo(solo === 'desideri' ? 'niente' : 'desideri')}
        >
          <IcoStella size={15} /> Li voglio ({stato.desideri.length})
        </button>
      </div>

      {caricando ? (
        <div className="vuoto"><p>Sto guardando&hellip;</p></div>
      ) : visibili.length === 0 ? (
        <div className="vuoto">
          <Ghirigoro w={84} h={18} />
          <p>{cerca ? `Niente che somigli a "${cerca}".` : 'Niente con questi criteri.'}</p>
        </div>
      ) : (
        <div className="elenco">
          {visibili.map((g) => {
            const posseduto = stato.collezione.includes(g.id)
            const voluto = stato.desideri.includes(g.id)
            return (
              <div className="riga" key={g.id}>
                <button className="riga-apri" onClick={() => setAperto(g)}>
                  <Copertina gioco={g} />
                  <span className="riga-corpo">
                    <span className="riga-nome">{g.nome}</span>
                    <span className="riga-sotto">{descriviInCatalogo(g)}</span>
                  </span>
                </button>
                <div className="riga-azioni">
                  {/* La stella compare solo su cio' che non hai: sui giochi
                      in collezione sarebbe un comando senza senso. */}
                  {!posseduto && (
                    <button
                      className={'bottoncino' + (voluto ? ' bottoncino-acceso' : '')}
                      aria-label={voluto ? 'Togli dai desideri' : 'Mettilo nei desideri'}
                      onClick={() => cambiaDesiderio(g.id, !voluto)}
                    >
                      <IcoStella size={17} />
                    </button>
                  )}
                  <button
                    className={'bottoncino' + (posseduto ? ' bottoncino-acceso' : '')}
                    aria-label={posseduto ? "Ce l'ho" : 'Aggiungi alla collezione'}
                    onClick={() => cambiaPossesso(g.id, !posseduto)}
                  >
                    {posseduto ? <IcoSpunta size={17} /> : <IcoPiu size={17} />}
                  </button>
                </div>
              </div>
            )
          })}
          {daDatabase && visibili.length >= 60 && (
            <p className="scheda-nota" style={{ textAlign: 'center', padding: '4px 0 0' }}>
              I primi 60. Cerca per nome per trovare il resto.
            </p>
          )}
        </div>
      )}

      {aperto && <SchedaGioco gioco={aperto} chiudi={() => setAperto(null)} />}
    </div>
  )
}
