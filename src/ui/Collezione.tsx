import { useMemo, useState } from 'react'
import { type Gioco, tintaDi } from '../dati/gioco'
import { useStato } from '../dati/stato'
import { SchedaGioco } from './SchedaGioco'
import { descriviGioco } from './descrizione'
import { Ghirigoro, IcoPiu, IcoMeno, IcoCatalogo } from './icone'

/* LA COLLEZIONE: i giochi che possiedi, nel mobile o no.
   Da qui si decide cosa ci sale e cosa ne scende, e si filtra per
   etichetta. Toccare una riga apre la scheda. */
export function Collezione() {
  const { giochiCollezione, stato, aggiungiAScaffale, togliDaScaffale, pieno,
          etichetteDelGioco } = useStato()
  const [cerca, setCerca] = useState('')
  const [etichetta, setEtichetta] = useState<string | null>(null)
  const [aperto, setAperto] = useState<Gioco | null>(null)

  const visibili = useMemo(() => {
    const q = cerca.trim().toLowerCase()
    return giochiCollezione
      .filter((g) => {
        if (q && !g.nome.toLowerCase().includes(q) && !(g.editore ?? '').toLowerCase().includes(q)) return false
        if (etichetta && !(stato.etichetteDi[g.id] ?? []).includes(etichetta)) return false
        return true
      })
      .sort((a, b) => a.nome.localeCompare(b.nome, 'it'))
  }, [giochiCollezione, cerca, etichetta, stato.etichetteDi])

  const sulRipiano = giochiCollezione.filter((g) => stato.scaffale.includes(g.id)).length
  const recensiti = giochiCollezione.filter((g) => stato.recensioni[g.id]).length

  return (
    <div className="schermo">
      <header className="intestazione">
        <div className="occhiello">la tua collezione</div>
        <div className="intestazione-riga">
          <span className="numerone">{giochiCollezione.length}</span>
          <span className="coda">giochi posseduti</span>
        </div>
        <Ghirigoro w={92} h={20} />
      </header>

      <div className="statistiche">
        <div className="statistica statistica-lime">
          <div className="valore">{sulRipiano}</div>
          <div className="nome">nel mobile</div>
        </div>
        <div className="statistica">
          <div className="valore">{giochiCollezione.length - sulRipiano}</div>
          <div className="nome">in scatola</div>
        </div>
        <div className="statistica">
          <div className="valore">{recensiti}</div>
          <div className="nome">recensiti</div>
        </div>
      </div>

      <label className="cerca">
        <IcoCatalogo size={17} />
        <input
          value={cerca}
          onChange={(e) => setCerca(e.target.value)}
          placeholder="Cerca nella collezione"
          aria-label="Cerca nella collezione"
        />
      </label>

      {stato.etichette.length > 0 && (
        <div className="filtri">
          <button
            className={'pillola' + (etichetta === null ? ' pillola-piena' : ' pillola-fantasma')}
            onClick={() => setEtichetta(null)}
          >
            Tutti
          </button>
          {stato.etichette.map((e) => (
            <button
              key={e.id}
              className={'pillola' + (etichetta === e.id ? ' pillola-piena' : ' pillola-fantasma')}
              onClick={() => setEtichetta(etichetta === e.id ? null : e.id)}
            >
              {e.nome}
            </button>
          ))}
        </div>
      )}

      {visibili.length === 0 ? (
        <div className="vuoto">
          <Ghirigoro w={84} h={18} />
          <p>Nessun gioco con questi criteri. Prova dal catalogo.</p>
        </div>
      ) : (
        <div className="elenco">
          {visibili.map((g) => {
            const suRipiano = stato.scaffale.includes(g.id)
            const rec = stato.recensioni[g.id]
            const sue = etichetteDelGioco(g.id)
            return (
              <div className="riga" key={g.id}>
                <button className="riga-apri" onClick={() => setAperto(g)}>
                  <span className="dorso" style={{ background: tintaDi(g.id) }} />
                  <span className="riga-corpo">
                    <span className="riga-nome">{g.nome}</span>
                    <span className="riga-sotto">
                      {sue.length
                        ? sue.map((e) => e.nome).join(' · ')
                        : descriviGioco(g)}
                    </span>
                  </span>
                  {rec && <span className="riga-voto">{rec.voto || '–'}</span>}
                </button>
                <div className="riga-azioni">
                  <button
                    className={'bottoncino' + (suRipiano ? ' bottoncino-acceso' : '')}
                    aria-label={suRipiano ? 'Togli dal mobile' : 'Metti nel mobile'}
                    disabled={!suRipiano && pieno}
                    onClick={() => suRipiano ? togliDaScaffale(g.id) : aggiungiAScaffale(g.id)}
                  >
                    {suRipiano ? <IcoMeno size={17} /> : <IcoPiu size={17} />}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {aperto && <SchedaGioco gioco={aperto} chiudi={() => setAperto(null)} />}
    </div>
  )
}
