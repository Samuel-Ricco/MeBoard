import { useMemo, useState } from 'react'
import { CATALOGO } from '../dati/giochi'
import { useStato } from '../dati/stato'
import { Ghirigoro, IcoCatalogo, IcoSpunta, IcoPiu } from './icone'

type Filtro = 'tutti' | 'brevi' | 'lunghi' | 'duetto' | 'gruppo' | 'mancanti'

const FILTRI: Array<{ id: Filtro; nome: string }> = [
  { id: 'tutti',    nome: 'Tutti' },
  { id: 'mancanti', nome: 'Non ho' },
  { id: 'brevi',    nome: 'Sotto i 45 min' },
  { id: 'lunghi',   nome: 'Oltre i 90 min' },
  { id: 'duetto',   nome: 'In due' },
  { id: 'gruppo',   nome: 'Da 5 in su' },
]

/* IL CATALOGO: tutti i giochi conosciuti, posseduti o no.
   E' il posto da cui si dichiara "questo ce l'ho", e da li' finisce in
   collezione e diventa candidato per il ripiano. */
export function Catalogo() {
  const { stato, cambiaPossesso } = useStato()
  const [cerca, setCerca] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('tutti')

  const visibili = useMemo(() => {
    const q = cerca.trim().toLowerCase()
    return CATALOGO.filter((g) => {
      if (q && !g.nome.toLowerCase().includes(q) && !g.editore.toLowerCase().includes(q)) return false
      switch (filtro) {
        case 'mancanti': return !stato.collezione.includes(g.id)
        case 'brevi':    return g.durata <= 45
        case 'lunghi':   return g.durata >= 90
        case 'duetto':   return g.giocatori[0] <= 2 && g.giocatori[1] >= 2
        case 'gruppo':   return g.giocatori[1] >= 5
        default:         return true
      }
    }).sort((a, b) => a.nome.localeCompare(b.nome, 'it'))
  }, [cerca, filtro, stato.collezione])

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
            /* Lo stato lo dice il bottone: raddoppiarlo col bordo lime
               riempirebbe la schermata di accento e toglierebbe forza
               proprio a quello che conta. */
            return (
              <div className="riga" key={g.id}>
                <span className="dorso" style={{ background: g.tinta }} />
                <div className="riga-corpo">
                  <div className="riga-nome">{g.nome}</div>
                  <div className="riga-sotto">
                    {g.anno} · {g.giocatori[0]}–{g.giocatori[1]} gioc. · {g.durata} min · peso {g.peso}/5
                  </div>
                </div>
                <div className="riga-azioni">
                  <button
                    className={'bottoncino' + (posseduto ? ' bottoncino-acceso' : '')}
                    aria-label={posseduto ? "Ce l'ho" : 'Aggiungi alla collezione'}
                    title={posseduto ? "Ce l'ho" : 'Aggiungi alla collezione'}
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
    </div>
  )
}
