import { useMemo, useState } from 'react'
import { CATALOGO, type Gioco } from '../dati/giochi'
import { useStato } from '../dati/stato'
import { SchedaGioco } from './SchedaGioco'
import { Ghirigoro, IcoCatalogo, IcoSpunta, IcoPiu, IcoStella } from './icone'

type Filtro = 'tutti' | 'mancanti' | 'desideri' | 'brevi' | 'lunghi' | 'duetto' | 'gruppo'

const FILTRI: Array<{ id: Filtro; nome: string }> = [
  { id: 'tutti',    nome: 'Tutti' },
  { id: 'mancanti', nome: 'Non ho' },
  { id: 'desideri', nome: 'Li voglio' },
  { id: 'brevi',    nome: 'Sotto i 45 min' },
  { id: 'lunghi',   nome: 'Oltre i 90 min' },
  { id: 'duetto',   nome: 'In due' },
  { id: 'gruppo',   nome: 'Da 5 in su' },
]

/* IL CATALOGO: tutti i giochi conosciuti, posseduti o no.
   E' il posto da cui si dichiara "questo ce l'ho" oppure "questo lo
   voglio", e da li' finisce in collezione o nei desideri. */
export function Catalogo() {
  const { stato, cambiaPossesso, cambiaDesiderio } = useStato()
  const [cerca, setCerca] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('tutti')
  const [aperto, setAperto] = useState<Gioco | null>(null)

  const visibili = useMemo(() => {
    const q = cerca.trim().toLowerCase()
    return CATALOGO.filter((g) => {
      if (q && !g.nome.toLowerCase().includes(q) && !g.editore.toLowerCase().includes(q)) return false
      switch (filtro) {
        case 'mancanti': return !stato.collezione.includes(g.id)
        case 'desideri': return stato.desideri.includes(g.id)
        case 'brevi':    return g.durata <= 45
        case 'lunghi':   return g.durata >= 90
        case 'duetto':   return g.giocatori[0] <= 2 && g.giocatori[1] >= 2
        case 'gruppo':   return g.giocatori[1] >= 5
        default:         return true
      }
    }).sort((a, b) => a.nome.localeCompare(b.nome, 'it'))
  }, [cerca, filtro, stato.collezione, stato.desideri])

  return (
    <div className="schermo">
      <header className="intestazione">
        <div className="occhiello">il catalogo</div>
        <div className="intestazione-riga">
          <span className="numerone">{CATALOGO.length}</span>
          <span className="coda">giochi da cui pescare</span>
        </div>
        <Ghirigoro w={96} h={20} />
      </header>

      <div className="statistiche">
        <div className="statistica">
          <div className="valore">{stato.collezione.length}</div>
          <div className="nome">ce li ho</div>
        </div>
        <div className="statistica statistica-lime">
          <div className="valore">{stato.desideri.length}</div>
          <div className="nome">li voglio</div>
        </div>
      </div>

      <label className="cerca">
        <IcoCatalogo size={17} />
        <input
          value={cerca}
          onChange={(e) => setCerca(e.target.value)}
          placeholder="Cerca un gioco o un editore"
          aria-label="Cerca nel catalogo"
        />
      </label>

      <div className="filtri">
        {FILTRI.map((f) => (
          <button
            key={f.id}
            className={'pillola' + (filtro === f.id ? ' pillola-piena' : ' pillola-fantasma')}
            onClick={() => setFiltro(f.id)}
          >
            {f.nome}
          </button>
        ))}
      </div>

      {visibili.length === 0 ? (
        <div className="vuoto">
          <Ghirigoro w={84} h={18} />
          <p>Niente con questi criteri.</p>
        </div>
      ) : (
        <div className="elenco">
          {visibili.map((g) => {
            const posseduto = stato.collezione.includes(g.id)
            const voluto = stato.desideri.includes(g.id)
            return (
              <div className="riga" key={g.id}>
                <button className="riga-apri" onClick={() => setAperto(g)}>
                  <span className="dorso" style={{ background: g.tinta }} />
                  <span className="riga-corpo">
                    <span className="riga-nome">{g.nome}</span>
                    <span className="riga-sotto">
                      {g.anno} · {g.giocatori[0]}–{g.giocatori[1]} gioc. · {g.durata} min · peso {g.peso}/5
                    </span>
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
        </div>
      )}

      {aperto && <SchedaGioco gioco={aperto} chiudi={() => setAperto(null)} />}
    </div>
  )
}
