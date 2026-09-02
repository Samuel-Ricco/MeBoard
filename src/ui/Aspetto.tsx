import { useState } from 'react'
import { useStato } from '../dati/stato'
import { LEGNI, MURI, PAVIMENTI, ORDINI, FORZE } from '../scene/finiture'
import { Foglio } from './Foglio'
import { Colori } from './Colori'

/* COM'E' FATTA QUESTA LIBRERIA.
 *
 * A tendine, e chiuse: aperte tutte insieme erano sette blocchi da
 * scorrere per cambiare una cosa sola.
 *
 * L'ordine va dal PARTICOLARE al GENERALE, e finisce con cio' che
 * distrugge: prima come si chiama questo mobile, poi com'e' fatto, poi
 * come dispone i giochi; sotto la stanza, che e' una sola e vale per
 * tutti i mobili; e in fondo l'eliminazione, dove non ci si finisce per
 * sbaglio.
 */

function Tendina({ titolo, valore, aperta, children }: {
  titolo: string
  /** cosa c'e' scelto adesso: si legge senza aprire */
  valore: string
  aperta?: boolean
  children: React.ReactNode
}) {
  return (
    <details className="tendina" open={aperta}>
      <summary>
        <span className="tendina-titolo">{titolo}</span>
        <span className="tendina-valore">{valore}</span>
      </summary>
      <div className="tendina-corpo">{children}</div>
    </details>
  )
}

const nomeDi = (lista: { v: string; n: string }[], v: string | null, senza: string) =>
  v === null ? senza : lista.find((f) => f.v.toLowerCase() === v.toLowerCase())?.n ?? 'il tuo'

export function Aspetto({ chiudi }: { chiudi: () => void }) {
  const {
    stato, libreria, cambiaLibreria, cambiaStanza, eliminaLibreria,
  } = useStato()
  const [confermaElimina, setConfermaElimina] = useState(false)
  const sola = stato.librerie.length <= 1

  return (
    <Foglio titolo={libreria.nome || 'La libreria'} chiudi={chiudi}>
      <div className="scheda">

        <Tendina titolo="Nome" valore={libreria.nome} aperta>
          <input
            className="campo"
            style={{ width: '100%' }}
            value={libreria.nome}
            onChange={(e) => cambiaLibreria(libreria.id, { nome: e.target.value })}
            placeholder="Salotto, studio, cantina&hellip;"
            aria-label="Nome della libreria"
            maxLength={32}
          />
        </Tendina>

        <Tendina titolo="Legno" valore={nomeDi(LEGNI, libreria.legno, 'come il tema')}>
          <Colori
            lista={LEGNI}
            scelto={libreria.legno}
            cambia={(v) => cambiaLibreria(libreria.id, { legno: v })}
            senza="Come il tema"
          />
        </Tendina>

        <Tendina
          titolo="Luce"
          valore={FORZE.find((f) => f.v === libreria.forza)?.n ?? 'normale'}
        >
          <div className="scheda-comandi">
            {FORZE.map((f) => (
              <button
                key={f.n}
                className={'pillola' + (libreria.forza === f.v ? ' pillola-piena' : ' pillola-fantasma')}
                onClick={() => cambiaLibreria(libreria.id, { forza: f.v })}
              >
                {f.n}
              </button>
            ))}
          </div>
        </Tendina>

        <Tendina
          titolo="Disposizione"
          valore={ORDINI.find((o) => o.id === libreria.ordine)?.nome ?? ''}
        >
          <p className="scheda-nota">
            Con un criterio diverso da &laquo;come li metto io&raquo; le scatole si
            riordinano da sole, e tenerle premute per spostarle non serve piu&apos;.
          </p>
          <div className="scheda-comandi">
            {ORDINI.map((o) => (
              <button
                key={o.id}
                className={'pillola' + (libreria.ordine === o.id ? ' pillola-piena' : ' pillola-fantasma')}
                onClick={() => cambiaLibreria(libreria.id, { ordine: o.id })}
              >
                {o.nome}
              </button>
            ))}
          </div>
        </Tendina>

        <p className="scheda-divisorio">
          La stanza e&apos; una sola: muro e pavimento valgono per tutte le librerie.
        </p>

        <Tendina titolo="Muro" valore={nomeDi(MURI, stato.muro, 'niente')}>
          <Colori
            lista={MURI}
            scelto={stato.muro}
            cambia={(v) => cambiaStanza({ muro: v })}
            senza="Niente"
          />
        </Tendina>

        <Tendina titolo="Pavimento" valore={nomeDi(PAVIMENTI, stato.pavimento, 'niente')}>
          <Colori
            lista={PAVIMENTI}
            scelto={stato.pavimento}
            cambia={(v) => cambiaStanza({ pavimento: v })}
            senza="Niente"
          />
        </Tendina>

        <section className="scheda-sezione">
          {sola ? (
            <p className="scheda-nota">
              Questa e&apos; la tua unica libreria: per eliminarla, prima creane
              un&apos;altra.
            </p>
          ) : (
            <button
              className="pillola pillola-allarme"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => {
                if (!confermaElimina) { setConfermaElimina(true); return }
                eliminaLibreria(libreria.id)
                chiudi()
              }}
            >
              {confermaElimina
                ? 'Sicuro? Tocca ancora'
                : 'Elimina ' + (libreria.nome || 'questa libreria')}
            </button>
          )}
        </section>

      </div>
    </Foglio>
  )
}
