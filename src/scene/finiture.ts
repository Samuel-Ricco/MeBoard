/* LE FINITURE DELLA LIBRERIA.
 *
 * Numeri puri, senza three.js e senza React: li leggono la scena, che
 * dipinge, e il pannello, che li mostra.
 *
 * Le tavolozze vengono da `new_dado-e-trap`, con le loro ragioni:
 *
 *  - i MURI hanno un colore vero. Le prime tinte erano tutte a mezzo
 *    passo dal bianco e sotto una luce diffusa si leggevano tutte
 *    uguali. Restano intonaci, non fluorescenze, ma si distinguono.
 *  - i FARETTI non seguono la tavolozza degli intonaci: una lampadina
 *    non e' un muro. Sono le temperature che una luce puo' davvero
 *    avere, piu' i neon -- e i neon sono l'unica cosa che esce dalla
 *    tavolozza, perche' un LED sotto un ripiano non deve andare
 *    d'accordo col muro, deve staccarsene.
 *  - le liste sono CHIUSE. Un selettore libero dava scaffali fucsia.
 */

export type Finitura = { v: string; n: string }

export const LEGNI: Finitura[] = [
  { v: '#8e6a4b', n: 'noce' },
  { v: '#5c4530', n: 'noce scuro' },
  { v: '#747760', n: 'oliva' },
  { v: '#a6a89c', n: 'salvia' },
  { v: '#c7af98', n: 'sabbia' },
  { v: '#c86a3c', n: 'terracotta' },
]

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

export const LUCI: Finitura[] = [
  { v: '#ffb877', n: 'caldo' },
  { v: '#ff8a3d', n: 'ambra' },
  { v: '#fff1dc', n: 'bianco caldo' },
  { v: '#e6eeff', n: 'bianco freddo' },
  { v: '#a9c8ff', n: 'azzurro' },
  { v: '#c86a3c', n: 'terracotta' },
  // i neon: luce, non intonaco, e a stanza piena si vedono appena
  { v: '#ff2f9e', n: 'neon rosa' },
  { v: '#a24bff', n: 'neon viola' },
  { v: '#2ee6ff', n: 'neon ciano' },
  { v: '#39ff88', n: 'neon verde' },
  { v: '#ffe93c', n: 'neon giallo' },
  { v: '#3b6cff', n: 'neon blu' },
]

/** Come si dispongono le scatole nelle caselle. */
export type Ordine = 'mano' | 'nome' | 'rank' | 'voto' | 'recente'

export const ORDINI: Array<{ id: Ordine; nome: string }> = [
  { id: 'mano',    nome: 'Come li metto io' },
  { id: 'nome',    nome: 'Per nome' },
  { id: 'rank',    nome: 'Per rank BGG' },
  { id: 'voto',    nome: 'Per il mio voto' },
  { id: 'recente', nome: 'Giocati di recente' },
]

export type Aspetto = {
  nome: string
  /** null = segue la tavolozza dell'app */
  legno: string | null
  muro: string | null
  pavimento: string | null
  luce: string
  /** 0..2, quanto e' forte la luce */
  forza: number
  ordine: Ordine
}

export const ASPETTO_INIZIALE: Aspetto = {
  nome: 'La mia libreria',
  legno: null,
  muro: null,
  pavimento: null,
  luce: '#fff1dc',
  forza: 1,
  ordine: 'mano',
}

/** Tiene un valore dentro la sua lista: un colore arrivato da uno stato
 *  vecchio, o scritto a mano, non deve poter dipingere niente. */
export const dentro = (lista: Finitura[], v: string | null, ripiego: string | null) =>
  v === null || lista.some((f) => f.v === v) ? v : ripiego
