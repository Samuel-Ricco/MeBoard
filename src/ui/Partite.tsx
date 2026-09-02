import { useMemo, useState } from 'react'
import { perId, type Gioco } from '../dati/giochi'
import { useStato } from '../dati/stato'
import { Foglio } from './Foglio'
import { SchedaGioco } from './SchedaGioco'
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
  const [scheda, setScheda] = useState<Gioco | null>(null)

  const [giocoId, setGiocoId] = useState('')
  const [data, setData] = useState(oggi)
  const [alTavolo, setAlTavolo] = useState<string[]>([])
  const [vincitore, setVincitore] = useState('')
  const [durata, setDurata] = useState('')

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

  const azzera = () => {
    setGiocoId(''); setAlTavolo([]); setVincitore(''); setDurata(''); setData(oggi())
  }

  const cambiaAlTavolo = (nome: string) => {
    setAlTavolo((v) => {
      const dopo = v.includes(nome) ? v.filter((x) => x !== nome) : [...v, nome]
      /* Chi si alza dal tavolo non puo' restare il vincitore: sarebbe una
         partita vinta da qualcuno che non c'era. */
      if (!dopo.includes(vincitore)) setVincitore('')
      return dopo
    })
  }

  const salva = () => {
    if (!giocoId) return
    const min = parseInt(durata, 10)
    registraPartita({
      giocoId,
      data,
      giocatori: alTavolo,
      vincitore: vincitore || undefined,
      durata: Number.isFinite(min) && min > 0 ? min : undefined,
    })
    azzera()
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
                <button className="riga-apri" onClick={() => g && setScheda(g)} disabled={!g}>
                  <span className="dorso" style={{ background: g?.tinta ?? 'var(--fioco)' }} />
                  <span className="riga-corpo">
                    <span className="riga-nome">{g?.nome ?? 'Gioco sconosciuto'}</span>
                    <span className="riga-sotto">
                      {giorno(p.data)} · {p.giocatori.length || '?'} al tavolo
                      {p.vincitore ? ' · vince ' + p.vincitore : ''}
                      {p.durata ? ' · ' + p.durata + ' min' : ''}
                    </span>
                  </span>
                </button>
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
        <Foglio titolo="Segna una partita" chiudi={() => { azzera(); setAperto(false) }}>
          <div className="scheda">
            <label className="cerca" style={{ margin: '0 0 14px' }}>
              <select
                value={giocoId}
                onChange={(e) => setGiocoId(e.target.value)}
                aria-label="Gioco"
                style={{
                  flex: 1, border: 0, outline: 0, background: 'transparent',
                  color: giocoId ? 'var(--inchiostro)' : 'var(--fioco)',
                  fontFamily: 'var(--testo)', fontSize: 15,
                }}
              >
                <option value="">Quale gioco?</option>
                {giochiCollezione.map((g) => (
                  <option key={g.id} value={g.id} style={{ color: '#111' }}>{g.nome}</option>
                ))}
              </select>
            </label>

            <div className="aggiungi" style={{ marginTop: 0 }}>
              <input
                className="campo" type="date" value={data}
                onChange={(e) => setData(e.target.value)} aria-label="Data"
              />
              <input
                className="campo" type="number" inputMode="numeric" min={1} max={600}
                value={durata} onChange={(e) => setDurata(e.target.value)}
                placeholder="minuti" aria-label="Durata in minuti"
                style={{ maxWidth: 110 }}
              />
            </div>

            {/* I giocatori SI SCELGONO, non si riscrivono ogni volta.
                Il testo libero produceva "Giulia", "giulia" e "Giuli" come
                tre persone diverse, e le statistiche non tornavano piu'. */}
            <section className="scheda-sezione">
              <h3 className="scheda-titolo">Chi c&apos;era</h3>
              {stato.giocatori.length === 0 ? (
                <p className="scheda-nota">
                  Nessun giocatore ancora: aggiungili dal profilo, in alto a destra.
                </p>
              ) : (
                <div className="scheda-comandi">
                  {stato.giocatori.map((g) => (
                    <button
                      key={g}
                      className={'pillola' + (alTavolo.includes(g) ? ' pillola-piena' : ' pillola-fantasma')}
                      onClick={() => cambiaAlTavolo(g)}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              )}
            </section>

            {alTavolo.length > 0 && (
              <section className="scheda-sezione">
                <h3 className="scheda-titolo">Chi ha vinto</h3>
                <div className="scheda-comandi">
                  {alTavolo.map((g) => (
                    <button
                      key={g}
                      className={'pillola' + (vincitore === g ? ' pillola-piena' : ' pillola-fantasma')}
                      onClick={() => setVincitore(vincitore === g ? '' : g)}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </section>
            )}

            <button
              className="pillola pillola-piena"
              style={{ justifyContent: 'center', height: 46, width: '100%', marginTop: 20 }}
              onClick={salva}
              disabled={!giocoId}
            >
              Salva la partita
            </button>
          </div>
        </Foglio>
      )}

      {scheda && <SchedaGioco gioco={scheda} chiudi={() => setScheda(null)} />}
    </div>
  )
}
