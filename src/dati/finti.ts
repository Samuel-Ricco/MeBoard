import type { Scatola } from '../scene/Scaffale'

/* Misure vere di scatole vere, in centimetri: servono a verificare che
   l'instancing regga scatole TUTTE DIVERSE, che era il dubbio di partenza.
   Quando ci sara' BGG, questi numeri arriveranno da li' e null'altro
   cambiera': le misure vivono nella matrice per istanza. */
const CATALOGO: Array<[string, number, number, number]> = [
  // nome,            larghezza, altezza, spessore
  ['Gloomhaven',            30,      30,     15],
  ['Wingspan',            29.5,    29.5,      7],
  ['Azul',                  29,      29,      7],
  ['Ticket to Ride',        30,      30,      6],
  ['7 Wonders',             30,      23,      7],
  ['Carcassonne',           29,      29,      6],
  ['Scythe',                30,      36,      8],
  ['Root',                29.5,    29.5,      8],
  ['Hive',                  20,      20,      5],
  ['Love Letter',           12,       9,      3],
  ['Patchwork',             22,      22,      5],
  ['Brass Birmingham',      30,      30,      9],
]

const TINTE = ['#b98cf7', '#ff5f9e', '#49f2e0', '#7cf0a8', '#f7c26b', '#8f7bd8']

export function scaffaleFinto(quanti = 28): Scatola[] {
  return Array.from({ length: quanti }, (_, i) => {
    const [nome, larghezza, altezza, spessore] = CATALOGO[i % CATALOGO.length]
    return {
      id: String(i),
      nome,
      larghezza,
      altezza,
      spessore,
      tinta: TINTE[i % TINTE.length],
    }
  })
}
