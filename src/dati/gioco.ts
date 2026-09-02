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
  /* Le misure VERE della scatola, in centimetri, dall'ultima edizione su
     BGG. Null quando BGG non le ha: e' un'assenza, non uno zero. */
  larghezzaCm: number | null
  altezzaCm: number | null
  spessoreCm: number | null
  /** da quale ristampa vengono: senza, un numero strano non si controlla */
  edizione: string | null
}

/* ---------- da gioco a scatola ---------- */

/* LE MISURE SONO QUELLE VERE, QUANDO CI SONO.
 *
 * BGG le pubblica, ma non nel gioco: stanno dentro le EDIZIONI, in
 * pollici, e la function tiene quella piu' recente -- la scatola che si
 * compra oggi. Erano stimate e la stima sbagliava di brutto: Gloomhaven
 * veniva 29,5 quadrato, ed e' 41,3 x 29,8 x 20,2. E' proprio il gioco
 * famoso per NON stare in un Kallax.
 *
 * Il ripiego resta per i giochi di cui BGG non sa le misure, e va detto
 * che e' un ripiego: `stimata` serve a poterlo scrivere nella scheda
 * invece di spacciare una stima per un dato.
 */
export type Scatola = {
  larghezza: number
  altezza: number
  spessore: number
  stimata: boolean
}

export function scatolaDi(g: Gioco): Scatola {
  if (g.larghezzaCm && g.altezzaCm) {
    return {
      larghezza: g.larghezzaCm,
      altezza: g.altezzaCm,
      /* Lo spessore manca piu' spesso degli altri due: BGG lo lascia a
         zero in parecchie edizioni. Li' si stima solo quello. */
      spessore: g.spessoreCm ?? spessoreStimato(g),
      stimata: false,
    }
  }

  const durata = g.durataMax ?? g.durataMin ?? 45
  const peso = g.peso ?? 2
  // i filler stanno in scatole piccole, il resto nel quadrato standard
  const piccolo = durata <= 25 && peso <= 1.6
  const lato = piccolo ? 19 : 29.5
  return { larghezza: lato, altezza: lato, spessore: spessoreStimato(g), stimata: true }
}

/* Lo spessore segue il peso: da 4 cm di un gioco di carte ai 15 di uno
   scatolone. Un gioco impegnativo ha piu' materiale dentro, non una
   faccia piu' grande. Arrotondato al mezzo centimetro perche' una
   precisione maggiore sarebbe finta. */
function spessoreStimato(g: Gioco) {
  const peso = g.peso ?? 2
  return Math.round(Math.min(15, Math.max(3.5, 2 + peso * 2.2)) * 2) / 2
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
