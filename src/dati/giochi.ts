/* IL CATALOGO.
 *
 * Dati finti ma misure vere: servono a verificare che lo scaffale regga
 * scatole tutte diverse. Quando ci saranno le API, cambia solo la
 * provenienza -- le misure vivono gia' nella matrice per istanza.
 *
 * Nessun database e nessun accesso: quello che l'utente cambia sta in
 * memoria e in localStorage.
 */

export type Gioco = {
  id: string
  nome: string
  editore: string
  anno: number
  /* misure reali della scatola, in centimetri */
  larghezza: number
  altezza: number
  spessore: number
  giocatori: [number, number]
  durata: number          // minuti, indicativi
  peso: number            // 1..5, quanto e' impegnativo
  tinta: string           // il colore della scatola sullo scaffale
}

/* tinte prese dal sistema: lime e i suoi vicini, piu' i neutri caldi.
   Sullo scaffale servono a distinguere le scatole finche' non ci sono
   le copertine vere. */
const T = {
  lime: '#CCFF4D',
  oliva: '#9FCC30',
  salvia: '#7FA65C',
  crema: '#F4EFE6',
  sabbia: '#D8C9A8',
  ruggine: '#C4623C',
  prugna: '#7A3B57',
  ardesia: '#4A5560',
  cacao: '#5C3A2E',
}

const G = (
  id: string, nome: string, editore: string, anno: number,
  larghezza: number, altezza: number, spessore: number,
  gmin: number, gmax: number, durata: number, peso: number, tinta: string,
): Gioco => ({
  id, nome, editore, anno, larghezza, altezza, spessore,
  giocatori: [gmin, gmax], durata, peso, tinta,
})

export const CATALOGO: Gioco[] = [
  G('gloomhaven',  'Gloomhaven',           'Cephalofair',   2017, 30,   30,   15,  1, 4, 120, 5, T.cacao),
  G('wingspan',    'Wingspan',             'Stonemaier',    2019, 29.5, 29.5,  7,  1, 5,  60, 3, T.salvia),
  G('azul',        'Azul',                 'Next Move',     2017, 29,   29,    7,  2, 4,  40, 2, T.ardesia),
  G('ticket',      'Ticket to Ride',       'Days of Wonder', 2004, 30,  30,    6,  2, 5,  60, 2, T.ruggine),
  G('7wonders',    '7 Wonders',            'Repos',         2010, 30,   23,    7,  3, 7,  30, 2, T.sabbia),
  G('carcassonne', 'Carcassonne',          'Hans im Gluck',  2000, 29,  29,    6,  2, 5,  35, 2, T.salvia),
  G('scythe',      'Scythe',               'Stonemaier',    2016, 30,   36,    8,  1, 5, 115, 4, T.cacao),
  G('root',        'Root',                 'Leder Games',   2018, 29.5, 29.5,  8,  2, 4,  90, 4, T.ruggine),
  G('hive',        'Hive',                 'Gen42',         2001, 20,   20,    5,  2, 2,  20, 2, T.sabbia),
  G('loveletter',  'Love Letter',          'Z-Man',         2012, 12,    9,    3,  2, 4,  20, 1, T.prugna),
  G('patchwork',   'Patchwork',            'Lookout',       2014, 22,   22,    5,  2, 2,  30, 2, T.prugna),
  G('brass',       'Brass: Birmingham',    'Roxley',        2018, 30,   30,    9,  2, 4, 120, 5, T.ardesia),
  G('terraforming','Terraforming Mars',    'FryxGames',     2016, 30,   30,    7,  1, 5, 120, 4, T.ruggine),
  G('splendor',    'Splendor',             'Space Cowboys', 2014, 27,   27,    7,  2, 4,  30, 2, T.sabbia),
  G('cascadia',    'Cascadia',             'Flatout',       2021, 29,   29,    7,  1, 4,  45, 2, T.salvia),
  G('dune',        'Dune: Imperium',       'Dire Wolf',     2020, 29.5, 29.5,  8,  1, 4,  75, 4, T.cacao),
  G('everdell',    'Everdell',             'Starling',      2018, 30,   30,   10,  1, 4,  70, 3, T.salvia),
  G('pandemic',    'Pandemic',             'Z-Man',         2008, 26,   26,    7,  2, 4,  45, 2, T.ardesia),
  G('sagrada',     'Sagrada',              'Floodgate',     2017, 24,   24,    6,  1, 4,  35, 2, T.prugna),
  G('kingdomino',  'Kingdomino',           'Blue Orange',   2016, 20,   20,    5,  2, 4,  20, 1, T.lime),
  G('barrage',     'Barrage',              'Cranio',        2019, 30,   30,    8,  1, 4, 100, 5, T.ardesia),
  G('spirit',      'Spirit Island',        'Greater Than',  2017, 30,   30,   10,  1, 4, 120, 5, T.salvia),
  G('marco',       'Marco Polo II',        'Hans im Gluck',  2019, 30,  30,    7,  2, 4,  90, 4, T.sabbia),
  G('cartografi',  'Cartografi',           'Thunderworks',  2019, 15,   20,    4,  1, 6,  30, 1, T.crema),
  G('welcome',     'Welcome To...',        'Blue Cocker',   2018, 22,   22,    5,  1, 6,  25, 1, T.crema),
  G('nemesis',     'Nemesis',              'Awaken Realms', 2018, 30,   30,   12,  1, 5, 150, 4, T.cacao),
  G('ark',         'Ark Nova',             'Feuerland',     2021, 30,   30,    9,  1, 4, 120, 5, T.oliva),
  G('lorenzo',     'Lorenzo il Magnifico', 'Cranio',        2016, 29,   29,    7,  2, 4,  90, 4, T.prugna),
]

export const perId = (id: string) => CATALOGO.find((g) => g.id === id)
