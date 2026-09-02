#!/usr/bin/env node
/* GENERA IL CARICAMENTO DEL CATALOGO, A LOTTI.
 *
 * `\copy` sarebbe piu' veloce ma vuole una connessione psql, cioe' la
 * password del database. La Management API accetta SQL e si autentica col
 * token di `supabase login`: nessuna password da maneggiare, in cambio di
 * qualche lotto in piu'.
 *
 * LA REGOLA CHE CONTA: il dump si aggiorna ogni tanto, e rieseguirlo NON
 * deve cancellare quello che `/thing` ha aggiunto. Percio' l'upsert tocca
 * solo le colonne che vengono dal dump e lascia stare editore, giocatori,
 * durata, peso e indirizzi delle copertine. Un aggiornamento del catalogo
 * che azzerasse le copertine costringerebbe a richiederle tutte a BGG.
 *
 *   node supabase/dump/carica.mjs [giochi.csv] [cartella-uscita] [righe-per-lotto]
 */

import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'

const qui = dirname(fileURLToPath(import.meta.url))
const ingresso = process.argv[2] || resolve(qui, 'giochi.csv')
const cartella = process.argv[3] || resolve(qui, 'lotti')
const perLotto = Number(process.argv[4] || 5000)

const COLONNE = [
  'id', 'nome', 'anno', 'posizione', 'voto_medio', 'votanti', 'espansione',
  'rank_astratti', 'rank_famiglia', 'rank_festa',
  'rank_strategia', 'rank_tematici', 'rank_guerra',
]

/* Stesso parser di `prepara.mjs`: i nomi contengono virgole, e uno split
   ingenuo sposterebbe silenziosamente tutte le colonne successive. */
function leggiCsv(testo) {
  const righe = []
  let campo = '', riga = [], dentro = false
  for (let i = 0; i < testo.length; i++) {
    const c = testo[i]
    if (dentro) {
      if (c === '"') { if (testo[i + 1] === '"') { campo += '"'; i++ } else dentro = false }
      else campo += c
      continue
    }
    if (c === '"') { dentro = true; continue }
    if (c === ',') { riga.push(campo); campo = ''; continue }
    if (c === '\n' || c === '\r') {
      if (c === '\r' && testo[i + 1] === '\n') i++
      riga.push(campo)
      if (riga.length > 1 || riga[0] !== '') righe.push(riga)
      riga = []; campo = ''
      continue
    }
    campo += c
  }
  if (campo !== '' || riga.length) { riga.push(campo); righe.push(riga) }
  return righe
}

/** Un valore per SQL: vuoto diventa NULL, gli apici si raddoppiano. */
const val = (v, testo = false) => {
  if (v === '' || v === undefined || v === null) return 'null'
  return testo ? "'" + v.replace(/'/g, "''") + "'" : v
}

const righe = leggiCsv(readFileSync(ingresso, 'utf8'))
righe.shift()   // testata

rmSync(cartella, { recursive: true, force: true })
mkdirSync(cartella, { recursive: true })

/* Solo le colonne del dump: gli altri campi restano quelli che sono. */
const daAggiornare = COLONNE.filter((c) => c !== 'id')
  .map((c) => `${c} = excluded.${c}`).join(', ')

let lotti = 0
for (let i = 0; i < righe.length; i += perLotto) {
  const pezzo = righe.slice(i, i + perLotto)
  const valori = pezzo.map((r) => '(' + [
    val(r[0]), val(r[1], true), val(r[2]), val(r[3]), val(r[4]), val(r[5]),
    r[6] === 'true' ? 'true' : 'false',
    val(r[7]), val(r[8]), val(r[9]), val(r[10]), val(r[11]), val(r[12]),
  ].join(',') + ')').join(',\n')

  const sql =
    `insert into public.giochi (${COLONNE.join(', ')}) values\n${valori}\n` +
    `on conflict (id) do update set ${daAggiornare}, aggiornato = now();\n`

  writeFileSync(join(cartella, String(lotti).padStart(3, '0') + '.sql'), sql)
  lotti++
}

console.log(`righe:  ${righe.length}`)
console.log(`lotti:  ${lotti} da ${perLotto}`)
console.log(`in:     ${cartella}`)
