import { useMemo, useState } from 'react'
import { useStato } from '../dati/stato'
import { Ghirigoro, IcoPiu, IcoMeno, IcoCatalogo } from './icone'

/* LA COLLEZIONE: i giochi che possiedi, scaffale o no.
   Da qui si decide cosa sale sul ripiano e cosa ne scende. */
export function Collezione() {
  const { giochiCollezione, stato, aggiungiAScaffale, togliDaScaffale, cambiaPossesso } = useStato()
  const [cerca, setCerca] = useState('')

  const visibili = useMemo(() => {
    const q = cerca.trim().toLowerCase()
    const v = q
      ? giochiCollezione.filter((g) =>
          g.nome.toLowerCase().includes(q) || g.editore.toLowerCase().includes(q))
      : giochiCollezione
    return [...v].sort((a, b) => a.nome.localeCompare(b.nome, 'it'))
  }, [giochiCollezione, cerca])

  const sulRipiano = giochiCollezione.filter((g) => stato.scaffale.includes(g.id)).length

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
          <div className="nome">sul ripiano</div>
        </div>
        <div className="statistica">
          <div className="valore">{giochiCollezione.length - sulRipiano}</div>
          <div className="nome">in scatola</div>
        </div>
        <div className="statistica">
          <div className="valore">
            {giochiCollezione.length
              ? Math.round(giochiCollezione.reduce((s, g) => s + g.durata, 0) / giochiCollezione.length)
              : 0}
          </div>
          <div className="nome">min medi</div>
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

      {visibili.length === 0 ? (
        <div className="vuoto">
          <Ghirigoro w={84} h={18} />
          <p>Nessun gioco corrisponde. Prova dal catalogo.</p>
        </div>
      ) : (
        <div className="elenco">
          {visibili.map((g) => {
            const suRipiano = stato.scaffale.includes(g.id)
            /* Lo stato lo dice il bottone: raddoppiarlo col bordo lime
               riempirebbe la schermata di accento e toglierebbe forza
               proprio a quello che conta. */
            return (
              <div className="riga" key={g.id}>
                <span className="dorso" style={{ background: g.tinta }} />
                <div className="riga-corpo">
                  <div className="riga-nome">{g.nome}</div>
                  <div className="riga-sotto">
                    {g.giocatori[0]}–{g.giocatori[1]} giocatori · {g.durata} min · {g.editore}
                  </div>
                </div>
                <div className="riga-azioni">
                  <button
                    className={'bottoncino' + (suRipiano ? ' bottoncino-acceso' : '')}
                    aria-label={suRipiano ? 'Togli dal ripiano' : 'Metti sul ripiano'}
                    title={suRipiano ? 'Togli dal ripiano' : 'Metti sul ripiano'}
                    onClick={() => suRipiano ? togliDaScaffale(g.id) : aggiungiAScaffale(g.id)}
                  >
                    {suRipiano ? <IcoMeno size={17} /> : <IcoPiu size={17} />}
                  </button>
                  <button
                    className="bottoncino"
                    aria-label={'Togli ' + g.nome + ' dalla collezione'}
                    title="Non lo possiedo piu'"
                    onClick={() => cambiaPossesso(g.id, false)}
                  >
                    <span style={{ fontSize: 17, lineHeight: 1 }}>×</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
