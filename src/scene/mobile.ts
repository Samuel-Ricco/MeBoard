/* LA SPECIFICA DEL MOBILE, IN CENTIMETRI VERI.
 *
 * Numeri puri, senza three.js: li leggono sia la scena sia lo stato
 * dell'app, che deve sapere quante caselle esistono per non accettare piu'
 * giochi di quanti ce ne stiano.
 *
 * Un Kallax ha caselle interne da 33 cm e montanti da 3.9: e' quella misura
 * che decide quali scatole ci stanno, quindi vale la pena tenerla vera
 * invece di inventare proporzioni. Le scatole dei giochi da tavolo sono
 * quadrate da ~29.5 proprio perche' devono entrare li'.
 */

export const CM = 0.1          // da centimetri a unita' di scena

export const CASELLA = 33      // lato interno di una casella
export const MONTANTE = 3.9    // spessore di montanti e ripiani
export const FONDO = 39        // profondita' del mobile
export const RIGHE = 4
export const COLONNE = 3
export const CELLE = RIGHE * COLONNE

/** da centro casella a centro casella */
export const PASSO = CASELLA + MONTANTE                                  // 36.9
export const LARGHEZZA = COLONNE * CASELLA + (COLONNE + 1) * MONTANTE    // 114.6
export const ALTEZZA = RIGHE * CASELLA + (RIGHE + 1) * MONTANTE          // 151.5

/** Quanto la scatola sta indietro rispetto al filo del mobile. */
export const RIENTRO = 2.5

/** Centro della casella `i`, contando da sinistra a destra e dall'alto in
 *  basso -- l'ordine in cui si legge, e in cui si riempie uno scaffale. */
export function casella(i: number) {
  const riga = Math.floor(i / COLONNE)          // 0 = in alto
  const colonna = i % COLONNE
  const dalBasso = RIGHE - 1 - riga
  return {
    x: (colonna - (COLONNE - 1) / 2) * PASSO,
    /* il pavimento della casella, non il centro: le scatole ci si
       appoggiano sopra, non ci galleggiano in mezzo */
    pavimento: MONTANTE + dalBasso * PASSO,
    riga, colonna,
  }
}

/** L'inverso di `casella`: da un punto sul piano del mobile, in
 *  centimetri, alla casella che lo contiene. Serve a capire dove si sta
 *  trascinando una scatola. `null` fuori dal mobile. */
export function casellaDa(x: number, y: number): number | null {
  const colonna = Math.round(x / PASSO + (COLONNE - 1) / 2)
  if (colonna < 0 || colonna >= COLONNE) return null

  const dalBasso = Math.floor((y - MONTANTE / 2) / PASSO)
  if (dalBasso < 0 || dalBasso >= RIGHE) return null

  const riga = RIGHE - 1 - dalBasso
  return riga * COLONNE + colonna
}
