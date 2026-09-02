import { useStato } from '../dati/stato'
import {
  LEGNI, MURI, PAVIMENTI, LUCI, ORDINI, type Finitura,
} from '../scene/finiture'
import { Foglio } from './Foglio'

/* COM'E' FATTA LA TUA LIBRERIA.
 *
 * Le liste sono chiuse, e non per pigrizia: un selettore di colore
 * libero, nell'altra app, dava scaffali al neon fucsia. Sei legni, sei
 * intonaci, sei pavimenti -- e per la luce dodici, perche' una lampadina
 * non e' un intonaco e le sue temperature sono un'altra cosa.
 */

function Tavolozza({ titolo, nota, lista, scelto, cambia, senza }: {
  titolo: string
  nota?: string
  lista: Finitura[]
  scelto: string | null
  cambia: (v: string | null) => void
  /** l'etichetta della scelta "nessuno", se ha senso averla */
  senza?: string
}) {
  return (
    <section className="scheda-sezione">
      <h3 className="scheda-titolo">{titolo}</h3>
      {nota && <p className="scheda-nota">{nota}</p>}
      <div className="finiture">
        {senza && (
          <button
            className={'finitura finitura-nessuna' + (scelto === null ? ' finitura-scelta' : '')}
            onClick={() => cambia(null)}
            aria-pressed={scelto === null}
            title={senza}
          >
            <span className="finitura-nome">{senza}</span>
          </button>
        )}
        {lista.map((f) => (
          <button
            key={f.v + f.n}
            className={'finitura' + (scelto === f.v ? ' finitura-scelta' : '')}
            style={{ background: f.v }}
            onClick={() => cambia(f.v)}
            aria-pressed={scelto === f.v}
            aria-label={f.n}
            title={f.n}
          />
        ))}
      </div>
    </section>
  )
}

const FORZE = [
  { v: 0.5, n: 'Soffusa' },
  { v: 1, n: 'Normale' },
  { v: 1.7, n: 'Piena' },
]

export function Aspetto({ chiudi }: { chiudi: () => void }) {
  const { stato, cambiaAspetto } = useStato()
  const a = stato.aspetto

  return (
    <Foglio titolo="La tua libreria" chiudi={chiudi}>
      <div className="scheda">

        <section className="scheda-sezione" style={{ borderTop: 0, paddingTop: 0 }}>
          <h3 className="scheda-titolo">Come si chiama</h3>
          <input
            className="campo"
            style={{ width: '100%' }}
            value={a.nome}
            onChange={(e) => cambiaAspetto({ nome: e.target.value })}
            placeholder="La mia libreria"
            aria-label="Nome della libreria"
            maxLength={32}
          />
        </section>

        <Tavolozza
          titolo="Il legno"
          lista={LEGNI}
          scelto={a.legno}
          cambia={(v) => cambiaAspetto({ legno: v })}
          senza="Come il tema"
        />

        <Tavolozza
          titolo="Il muro"
          nota="Senza muro e senza pavimento il mobile galleggia sul fondo dell&apos;app: su uno schermo piccolo e&apos; anche piu&apos; pulito."
          lista={MURI}
          scelto={a.muro}
          cambia={(v) => cambiaAspetto({ muro: v })}
          senza="Niente"
        />

        <Tavolozza
          titolo="Il pavimento"
          lista={PAVIMENTI}
          scelto={a.pavimento}
          cambia={(v) => cambiaAspetto({ pavimento: v })}
          senza="Niente"
        />

        <Tavolozza
          titolo="La luce"
          nota="Le prime sei sono temperature vere; le altre sono neon, e a luce piena si vedono appena."
          lista={LUCI}
          scelto={a.luce}
          cambia={(v) => v && cambiaAspetto({ luce: v })}
        />

        <section className="scheda-sezione">
          <h3 className="scheda-titolo">Quanta luce</h3>
          <div className="scheda-comandi">
            {FORZE.map((f) => (
              <button
                key={f.n}
                className={'pillola' + (a.forza === f.v ? ' pillola-piena' : ' pillola-fantasma')}
                onClick={() => cambiaAspetto({ forza: f.v })}
              >
                {f.n}
              </button>
            ))}
          </div>
        </section>

        <section className="scheda-sezione">
          <h3 className="scheda-titolo">Come si dispongono</h3>
          <p className="scheda-nota">
            Con un criterio attivo le scatole si riordinano da sole, e
            spostarle a mano non ha piu&apos; senso: le frecce si spengono.
          </p>
          <div className="scheda-comandi">
            {ORDINI.map((o) => (
              <button
                key={o.id}
                className={'pillola' + (a.ordine === o.id ? ' pillola-piena' : ' pillola-fantasma')}
                onClick={() => cambiaAspetto({ ordine: o.id })}
              >
                {o.nome}
              </button>
            ))}
          </div>
        </section>

      </div>
    </Foglio>
  )
}
