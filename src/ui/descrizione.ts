import type { Gioco } from '../dati/gioco'

/* LA RIGA SOTTO IL NOME.
 *
 * Del catalogo si sa sempre nome, anno e rank -- vengono dal dump. Il
 * resto arriva da `/thing` solo per i giochi che qualcuno ha aperto, e
 * finche' non e' arrivato NON si inventa: scrivere "0-0 giocatori" o
 * "0 min" sarebbe peggio che tacere, perche' sembrerebbe un dato vero.
 */
export function descriviGioco(g: Gioco): string {
  const pezzi: string[] = []

  if (g.giocatoriMin && g.giocatoriMax) {
    pezzi.push(g.giocatoriMin === g.giocatoriMax
      ? `${g.giocatoriMin} giocatori`
      : `${g.giocatoriMin}–${g.giocatoriMax} giocatori`)
  }

  const durata = g.durataMax ?? g.durataMin
  if (durata) pezzi.push(`${durata} min`)

  if (g.peso) pezzi.push(`peso ${g.peso.toFixed(1)}/5`)

  // quando non si sa nulla si dice quel poco che si sa
  if (!pezzi.length) {
    if (g.anno) pezzi.push(String(g.anno))
    if (g.editore) pezzi.push(g.editore)
  }

  return pezzi.join(' · ') || 'dettagli non ancora scaricati'
}

/** La riga per il catalogo: li' contano rank e voto, che ci sono per tutti. */
export function descriviInCatalogo(g: Gioco): string {
  const pezzi: string[] = []
  if (g.posizione) pezzi.push(`#${g.posizione}`)
  if (g.anno) pezzi.push(String(g.anno))
  if (g.votoMedio) pezzi.push(`${g.votoMedio.toFixed(1)}/10`)
  if (g.giocatoriMin && g.giocatoriMax) pezzi.push(`${g.giocatoriMin}–${g.giocatoriMax} gioc.`)
  return pezzi.join(' · ') || '—'
}
