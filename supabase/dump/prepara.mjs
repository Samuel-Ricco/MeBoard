#!/usr/bin/env node
/* PREPARA IL DUMP DEI RANKING PER IL CARICAMENTO.
 *
 * BGG pubblica un CSV con TUTTI i giochi conosciuti -- circa 180.000 --
 * con id, nome, anno, rank e voti. E' l'unico modo per avere un catalogo
 * sfogliabile: l'API sa cercare per nome e restituire un gioco per id, e
 * basta. Un elenco ordinato per rank e filtrato per categoria non lo sa
 * dare.
 *
 * Questo script non parla col database: traduce e basta. L'esito e' un CSV
 * pronto per `\copy`, che e' il modo veloce di mettere 180.000 righe in
 * Postgres -- una INSERT per riga ci metterebbe minuti.
 *
 *   node supabase/dump/prepara.mjs [ingresso.csv] [uscita.csv]
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const qui = dirname(fileURLToPath(import.meta.url))
const ingresso = process.argv[2] || resolve(qui, 'boardgames_ranks.csv')
const uscita = process.argv[3] || resolve(qui, 'giochi.csv')

/* UN PARSER VERO, NON UNO SPLIT SULLE VIRGOLE.
 *
 * Nel dump 4.231 nomi contengono una virgola -- "Unmatched: Battle of
 * Legends, Volume One" -- e uno split ingenuo li spezzerebbe spostando
 * tutte le colonne successive di un posto. Il danno sarebbe silenzioso:
 * anni che diventano rank, rank che diventano voti. */
function leggiCsv(testo) {
  const righe = []
  let campo = ''
  let riga = []
  let dentroVirgolette = false

  for (let i = 0; i < testo.length; i++) {
    const c = testo[i]

    if (dentroVirgolette) {
      if (c === '"') {
        // due virgolette di fila sono una virgoletta letterale
        if (testo[i + 1] === '"') { campo += '"'; i++ }
        else dentroVirgolette = false
      } else campo += c
      continue
    }

    if (c === '"') { dentroVirgolette = true; continue }
    if (c === ',') { riga.push(campo); campo = ''; continue }
    if (c === '\n' || c === '\r') {
      if (c === '\r' && testo[i + 1] === '\n') i++
      riga.push(campo)
      if (riga.length > 1 || riga[0] !== '') righe.push(riga)
      riga = []
      campo = ''
      continue
    }
    campo += c
  }
  if (campo !== '' || riga.length) { riga.push(campo); righe.push(riga) }
  return righe
}

/** Vuoto per Postgres significa NULL, ed e' quello che vogliamo per i
 *  campi che nel dump valgono zero come "non pervenuto". */
const zeroEVuoto = (v) => (!v || v === '0' ? '' : v)

/** Regole di virgolettatura di COPY ... WITH (FORMAT csv). */
function citaSeServe(v) {
  if (v === '') return ''
  return /[",\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v
}

const COLONNE = [
  'id', 'nome', 'anno', 'posizione', 'voto_medio', 'votanti', 'espansione',
  'rank_astratti', 'rank_famiglia', 'rank_festa',
  'rank_strategia', 'rank_tematici', 'rank_guerra',
]

const righe = leggiCsv(readFileSync(ingresso, 'utf8'))
const testata = righe.shift()
const col = Object.fromEntries(testata.map((n, i) => [n.trim(), i]))

for (const atteso of ['id', 'name', 'yearpublished', 'rank', 'average', 'usersrated']) {
  if (col[atteso] === undefined) {
    console.error(`Il dump non ha la colonna "${atteso}". Colonne trovate: ${testata.join(', ')}`)
    process.exit(1)
  }
}

const fuori = [COLONNE.join(',')]
let classificati = 0
let scartate = 0

for (const r of righe) {
  const id = r[col.id]
  const nome = (r[col.name] || '').trim()
  // senza id o senza nome la riga non serve a niente e romperebbe la chiave
  if (!id || !/^\d+$/.test(id) || !nome) { scartate++; continue }

  const votanti = r[col.usersrated] || '0'
  /* Un gioco senza voti ha "media 0", che non e' un voto basso: e'
     l'assenza di un voto. Mostrarlo come 0 direbbe una falsita'. */
  const media = votanti === '0' ? '' : zeroEVuoto(r[col.average])
  const rank = zeroEVuoto(r[col.rank])          // 0 = non classificato
  if (rank) classificati++

  fuori.push([
    id,
    citaSeServe(nome),
    zeroEVuoto(r[col.yearpublished]),           // 0 = anno ignoto
    rank,
    media,
    votanti,
    r[col.is_expansion] === '1' ? 'true' : 'false',
    zeroEVuoto(r[col.abstracts_rank]),
    zeroEVuoto(r[col.familygames_rank]),
    zeroEVuoto(r[col.partygames_rank]),
    zeroEVuoto(r[col.strategygames_rank]),
    zeroEVuoto(r[col.thematic_rank]),
    zeroEVuoto(r[col.wargames_rank]),
  ].join(','))
}

writeFileSync(uscita, fuori.join('\n') + '\n')

console.log(`righe lette:      ${righe.length}`)
console.log(`righe scritte:    ${fuori.length - 1}`)
console.log(`scartate:         ${scartate}`)
console.log(`classificate:     ${classificati}`)
console.log(`scritto in:       ${uscita}`)
console.log()
console.log('Per caricarlo, da psql collegato al progetto:')
console.log(`  \\copy public.giochi (${COLONNE.join(', ')}) from '${uscita}' with (format csv, header)`)
