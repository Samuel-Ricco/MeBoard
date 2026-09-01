import { useMemo, useState } from 'react'
import { perId } from '../dati/giochi'
import { useStato } from '../dati/stato'
import { Foglio } from './Foglio'
import { Ghirigoro, IcoPiu } from './icone'

const giorno = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })

/* La data di OGGI, nel fuso di chi guarda.
   `toISOString()` risponde in UTC: in Italia, fra mezzanotte e le due, darebbe
   il giorno prima -- e una partita si segna proprio a quell'ora. */
function oggi() {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/* LE PARTITE: il registro di cosa avete giocato e come e' finita. */
export function Partite() {
  const { stato, giochiCollezione, registraPartita, eliminaPartita } = useStato()
  const [aperto, setAperto] = useState(false)

  const [giocoId, setGiocoId] = useState('')
  const [data, setData] = useState(oggi)
  const [giocatori, setGiocatori] = useState('')
  const [vincitore, setVincitore] = useState('')

  const oreTotali = useMemo(
    () => Math.round(stato.partite.reduce((s, p) => s + (p.durata ?? 0), 0) / 60),
    [stato.partite])

  const giocoPiuVisto = useMemo(() => {
    const conta = new Map<string, number>()
    stato.partite.forEach((p) => conta.set(p.giocoId, (conta.get(p.giocoId) ?? 0) + 1))
    let vinto = ''
    let max = 0
    conta.forEach((n, id) => { if (n > max) { max = n; vinto = id } })
    return vinto ? perId(vinto)?.nome ?? '—' : '—'
  }, [stato.partite])

  const salva = () => {
    if (!giocoId) return
    const elenco = giocatori.split(',').map((s) => s.trim()).filter(Boolean)
    registraPartita({
      giocoId,
      data,
      giocatori: elenco,
      vincitore: vincitore.trim() || undefined,
    })
    setGiocoId(''); setGiocatori(''); setVincitore('')
    setAperto(false)
  }

  return (
    <div className="schermo">
      <header className="intestazione">
        <div className="occhiello">le tue partite</div>
        <div className="intestazione-riga">
          <span className="numerone">{stato.partite.length}</span>
          <span className="coda">serate messe a verbale</span>
        </div>
        <Ghirigoro w={100} h={21} />
      </header>

      <div className="statistiche">
        <div className="statistica statistica-lime">
          <div className="valore">{oreTotali}h</div>
          <div className="nome">al tavolo</div>
        </div>
        <div className="statistica">
          <div className="valore" style={{ fontSize: 15, lineHeight: 1.25 }}>{giocoPiuVisto}</div>
          <div className="nome">il piu&apos; giocato</div>
        </div>
      </div>

      <div className="filtri">
        <button className="pillola pillola-piena" onClick={() => setAperto(true)}>
          <IcoPiu size={16} /> Segna una partita
        </button>
      </div>

      {stato.partite.length === 0 ? (
        <div className="vuoto">
          <Ghirigoro w={84} h={18} />
          <p>Nessuna partita ancora. Segnane una appena finite.</p>
        </div>
      ) : (
        <div className="elenco">
          {stato.partite.map((p) => {
            const g = perId(p.giocoId)
            return (
              <div className="riga" key={p.id}>
                <span className="dorso" style={{ background: g?.tinta ?? '#555' }} />
                <div className="riga-corpo">
                  <div className="riga-nome">{g?.nome ?? 'Gioco sconosciuto'}</div>
                  <div className="riga-sotto">
                    {giorno(p.data)} · {p.giocatori.length || '?'} al tavolo
                    {p.vincitore ? ' · vince ' + p.vincitore : ''}
                    {p.durata ? ' · ' + p.durata + ' min' : ''}
                  </div>
                </div>
                <div className="riga-azioni">
                  <button
                    className="bottoncino"
                    aria-label="Elimina la partita"
                    onClick={() => eliminaPartita(p.id)}
                  >
                    <span style={{ fontSize: 17, lineHeight: 1 }}>×</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {aperto && (
        <Foglio titolo="Segna una partita" chiudi={() => setAperto(false)}>
          <div className="elenco">
            <label className="cerca" style={{ margin: 0 }}>
              <select
                value={giocoId}
                onChange={(e) => setGiocoId(e.target.value)}
                aria-label="Gioco"
                style={{
                  flex: 1, border: 0, outline: 0, background: 'transparent',
                  color: giocoId ? 'var(--crema)' : 'var(--fioco)',
                  fontFamily: 'var(--testo)', fontSize: 15,
                }}
              >
                <option value="">Quale gioco?</option>
                {giochiCollezione.map((g) => (
                  <option key={g.id} value={g.id} style={{ color: '#111' }}>{g.nome}</option>
                ))}
              </select>
            </label>

            <label className="cerca" style={{ margin: 0 }}>
              <input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                aria-label="Data"
              />
            </label>

            <label className="cerca" style={{ margin: 0 }}>
              <input
                value={giocatori}
                onChange={(e) => setGiocatori(e.target.value)}
                placeholder="Chi c&apos;era, separati da virgola"
                aria-label="Giocatori"
              />
            </label>

            <label className="cerca" style={{ margin: 0 }}>
              <input
                value={vincitore}
                onChange={(e) => setVincitore(e.target.value)}
                placeholder="Chi ha vinto"
                aria-label="Vincitore"
              />
            </label>

            <button
              className="pillola pillola-piena"
              style={{ justifyContent: 'center', height: 46 }}
              onClick={salva}
              disabled={!giocoId}
            >
              Salva la partita
            </button>
          </div>
        </Foglio>
      )}
    </div>
  )
}
