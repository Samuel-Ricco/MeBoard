/* I COLORI DELLA LIBRERIA.
 *
 * Numeri puri, senza three.js e senza React: li leggono la scena, che
 * dipinge, e il pannello, che li mostra.
 *
 * I predefiniti sono COERENTI COL TEMA -- legni e intonaci nella stessa
 * famiglia calda del fondo dell'app -- ma non sono una gabbia: da ogni
 * sezione si apre un selettore libero, e il colore scelto entra in coda
 * ai predefiniti. Cosi' chi vuole il suo verde non deve accontentarsi, e
 * chi non vuole pensarci trova sei tinte che stanno bene insieme.
 */

export type Finitura = { v: string; n: string }

/* I LEGNI. Vanno d'accordo col cioccolato del tema scuro e con la carta
   di quello chiaro: sono tutti caldi, nessuno vira al blu. */
export const LEGNI: Finitura[] = [
  { v: '#8e6a4b', n: 'noce' },
  { v: '#5c4530', n: 'noce scuro' },
  { v: '#c7af98', n: 'sabbia' },
  { v: '#747760', n: 'oliva' },
  { v: '#a6a89c', n: 'salvia' },
  { v: '#c86a3c', n: 'terracotta' },
]

/* I MURI hanno un colore vero. Le prime tinte erano tutte a mezzo passo
   dal bianco e sotto una luce diffusa si leggevano tutte uguali: restano
   intonaci, non fluorescenze, ma si distinguono. */
export const MURI: Finitura[] = [
  { v: '#cfccc8', n: 'grigio caldo' },
  { v: '#c7af98', n: 'sabbia' },
  { v: '#a6a89c', n: 'salvia' },
  { v: '#747760', n: 'oliva' },
  { v: '#c86a3c', n: 'terracotta' },
  { v: '#33352b', n: 'oliva scuro' },
]

export const PAVIMENTI: Finitura[] = [
  { v: '#c7af98', n: 'sabbia' },
  { v: '#cfccc8', n: 'cemento chiaro' },
  { v: '#a6a89c', n: 'salvia' },
  { v: '#8e6a4b', n: 'noce' },
  { v: '#747760', n: 'oliva' },
  { v: '#c86a3c', n: 'cotto' },
]

/* LA LUCE E' UNA SOLA, ED E' NATURALE.
 *
 * C'erano dodici temperature fra cui scegliere, neon compresi. Erano una
 * decisione in piu' da prendere per un guadagno che non c'era: una luce
 * colorata tinge le copertine, e vedere le copertine e' il punto dello
 * scaffale. Resta un bianco appena caldo, quello di una stanza. */
export const LUCE = '#fff1dc'

/** Come si dispongono le scatole nelle caselle. */
export type Ordine = 'mano' | 'nome' | 'rank' | 'voto' | 'recente'

export const ORDINI: Array<{ id: Ordine; nome: string }> = [
  { id: 'mano',    nome: 'Come li metto io' },
  { id: 'nome',    nome: 'Per nome' },
  { id: 'rank',    nome: 'Per rank BGG' },
  { id: 'voto',    nome: 'Per il mio voto' },
  { id: 'recente', nome: 'Giocati di recente' },
]

export const FORZE = [
  { v: 0.5, n: 'Soffusa' },
  { v: 1, n: 'Normale' },
  { v: 1.7, n: 'Piena' },
]

/** Un esadecimale valido, scritto per esteso. Serve a non far entrare
 *  spazzatura nei colori salvati da chi arriva da uno stato vecchio. */
export const coloreValido = (v: unknown): v is string =>
  typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v)

/** I predefiniti piu' quelli che hai scelto tu, senza doppioni e senza
 *  crescere all'infinito: gli ultimi sei bastano a ritrovarli. */
export function conIMiei(base: Finitura[], miei: string[]): Finitura[] {
  const gia = new Set(base.map((f) => f.v.toLowerCase()))
  const aggiunti = miei
    .filter((v) => coloreValido(v) && !gia.has(v.toLowerCase()))
    .slice(-6)
    .map((v) => ({ v, n: 'il tuo' }))
  return [...base, ...aggiunti]
}
