import { IcoLibreria, IcoCollezione, IcoCatalogo, IcoPartite } from './icone'

export type Tab = 'libreria' | 'collezione' | 'catalogo' | 'partite'

const TAB: Array<{ id: Tab; nome: string; Ico: (p: { size?: number }) => React.ReactElement }> = [
  { id: 'libreria',   nome: 'Libreria',   Ico: IcoLibreria },
  { id: 'collezione', nome: 'Collezione', Ico: IcoCollezione },
  { id: 'catalogo',   nome: 'Catalogo',   Ico: IcoCatalogo },
  { id: 'partite',    nome: 'Partite',    Ico: IcoPartite },
]

/* LA BARRA DEI TAB.
 *
 * Il gesto preso dal riferimento: una barra flottante col BORDO invece che
 * riempita, e un solo tab "acceso" come pillola piena con icona ed
 * etichetta in maiuscolo -- gli altri restano sole icone. Cosi' la barra
 * dice sempre dove sei senza aver bisogno di quattro etichette.
 */
export function TabBar({ attivo, cambia }: { attivo: Tab; cambia: (t: Tab) => void }) {
  return (
    <nav className="tabbar" role="tablist" aria-label="Sezioni">
      {TAB.map(({ id, nome, Ico }) => {
        const acceso = id === attivo
        return (
          <button
            key={id}
            role="tab"
            aria-selected={acceso}
            aria-label={nome}
            className={'tab' + (acceso ? ' tab-acceso' : '')}
            onClick={() => cambia(id)}
          >
            <Ico size={19} />
            {/* l'etichetta esiste solo sul tab acceso: e' il modo del
                riferimento di dare gerarchia senza aggiungere rumore */}
            {acceso && <span className="tab-nome">{nome}</span>}
          </button>
        )
      })}
    </nav>
  )
}
