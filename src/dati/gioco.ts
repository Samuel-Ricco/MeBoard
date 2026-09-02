/* UN GIOCO, COM'E' FATTO DAVVERO.
 *
 * I campi rispecchiano la tabella `giochi`, che e' la cache di BGG: stessi
 * nomi, stesso significato. L'id e' quello di BGG e non uno slug
 * inventato -- e' la chiave che condividiamo con la sorgente, e con la
 * sorgente si deve poter tornare a parlare.
 *
 * `copertinaUrl` e `miniaturaUrl` sono INDIRIZZI. L'immagine non passa mai
 * da qui.
 */
export type Gioco = {
  id: number
  nome: string
  anno: number | null
  editore: string | null
  giocatoriMin: number | null
  giocatoriMax: number | null
  durataMin: number | null
  durataMax: number | null
  /** la "weight" di BGG, 1..5 */
  peso: number | null
  /** il rank generale; null = non classificato */
  posizione: number | null
  votoMedio: number | null
  copertinaUrl: string | null
  miniaturaUrl: string | null
}

/* ---------- da gioco a scatola ---------- */

/* LE MISURE DELLA SCATOLA SONO UNA STIMA, E VA DETTO.
 *
 * BGG non pubblica le dimensioni in `/thing`: stanno nei dati delle
 * singole EDIZIONI (`versions=1`), che sono tanti, incoerenti e spesso
 * mancanti. Finche' non le andremo a prendere davvero, si stimano da
 * quello che sappiamo -- e si stimano in modo DETERMINISTICO, cosi' una
 * scatola non cambia misura fra un avvio e l'altro.
 *
 * La regola di fondo e' quella vera del settore: la scatola quadrata da
 * ~29,5 cm esiste perche' deve entrare in un Kallax. Da li' si scende per
 * i giochi brevi e leggeri, e si sale di SPESSORE per quelli pesanti,
 * che e' come funziona davvero: un gioco impegnativo ha piu' materiale
 * dentro, non una faccia piu' grande.
 */
export function scatolaDi(g: Gioco): { larghezza: number; altezza: number; spessore: number } {
  const peso = g.peso ?? 2
  const durata = g.durataMax ?? g.durataMin ?? 45

  // i filler stanno in scatole piccole, il resto nel quadrato standard
  const piccolo = durata <= 25 && peso <= 1.6
  const lato = piccolo ? 19 : 29.5

  /* Lo spessore segue il peso: da 4 cm di un gioco di carte ai 15 di uno
     scatolone. Arrotondato al mezzo centimetro perche' una precisione
     maggiore sarebbe finta. */
  const spessore = Math.round(Math.min(15, Math.max(3.5, 2 + peso * 2.2)) * 2) / 2

  return { larghezza: lato, altezza: lato, spessore }
}

/* IL COLORE DELLA SCATOLA, FINCHE' NON C'E' LA COPERTINA.
 *
 * Serve solo a distinguere le scatole sul ripiano prima che l'atlante
 * porti le immagini vere. Deriva dall'id, quindi lo stesso gioco ha
 * sempre la stessa tinta -- se fosse casuale, il tuo scaffale
 * cambierebbe colori a ogni avvio e sembrerebbe rotto.
 *
 * Le tinte stanno lontane dal lime: quello e' l'accento dell'interfaccia,
 * e una scatola color lime sembrerebbe selezionata.
 */
const TINTE = [
  '#7FA65C', '#4A5560', '#C4623C', '#7A3B57', '#5C3A2E',
  '#D8C9A8', '#3E6B63', '#8C6A3F', '#5A4E7C', '#96543F',
]

export const tintaDi = (id: number) => TINTE[Math.abs(id) % TINTE.length]
