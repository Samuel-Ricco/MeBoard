/* ============================================================
   ASSOTTIGLIA UNA WEBP ANIMATA, e toglie i metadati.

   Non ricodifica niente: una webp animata e' una sequenza di chunk
   `ANMF`, e questo ne butta via un po' e allunga la durata di quelli
   che restano. Il risultato e' la stessa animazione con meno
   fotogrammi al secondo e lo stesso identico aspetto di ogni singolo
   fotogramma -- nessuna perdita di qualita', solo di fluidita'.

   SI PUO' FARE SOLO SE I FOTOGRAMMI SONO INDIPENDENTI, e lo strumento
   lo verifica invece di fidarsi: ogni `ANMF` deve coprire la tela
   intera ed essere marcato "non fondere" (il fotogramma SOSTITUISCE
   quello che c'e' sotto invece di disegnarci sopra). Se uno solo non
   lo e', buttarne via uno romperebbe tutti quelli dopo, e il programma
   si ferma invece di consegnare un'animazione sbagliata.

   Toglie anche i chunk di metadati (`C2PA`, `EXIF`, `XMP `): dicono
   come il file e' stato fatto, che e' una cosa dell'archivio e non del
   sito, e viaggiano a ogni visita.

   Uso:
     node tools/webp-dimagrisci.mjs <dentro.webp> <fuori.webp> [tieni1ogni]

   `tieni1ogni` sta a 2 di suo: la meta' dei fotogrammi, cioe' 30 al
   secondo partendo da 60.
   ============================================================ */

import { readFileSync, writeFileSync } from 'node:fs';

const [, , dentro, fuori, ogniTxt] = process.argv;
if (!dentro || !fuori) {
  console.error('uso: node tools/webp-dimagrisci.mjs <dentro.webp> <fuori.webp> [tieni1ogni]');
  process.exit(1);
}
const ogni = Math.max(1, parseInt(ogniTxt || '2', 10));

const d = readFileSync(dentro);
if (d.toString('latin1', 0, 4) !== 'RIFF' || d.toString('latin1', 8, 12) !== 'WEBP') {
  console.error('non e\' una webp');
  process.exit(1);
}

/* I chunk, in ordine. Ognuno e' quattro lettere, quattro byte di
   lunghezza, il corpo, e un byte di riempimento se la lunghezza e'
   dispari -- quel riempimento e' la parte che si dimentica. */
const pezzi = [];
for (let i = 12; i + 8 <= d.length; ) {
  const tipo = d.toString('latin1', i, i + 4);
  const n = d.readUInt32LE(i + 4);
  pezzi.push({ tipo, corpo: d.subarray(i + 8, i + 8 + n) });
  i += 8 + n + (n & 1);
}

const tela = pezzi.find(p => p.tipo === 'VP8X');
if (!tela) { console.error('manca VP8X: non e\' animata'); process.exit(1); }
const larg = (tela.corpo[4] | (tela.corpo[5] << 8) | (tela.corpo[6] << 16)) + 1;
const alt = (tela.corpo[7] | (tela.corpo[8] << 8) | (tela.corpo[9] << 16)) + 1;

const frame = pezzi.filter(p => p.tipo === 'ANMF');
if (!frame.length) { console.error('nessun fotogramma'); process.exit(1); }

/* La verifica che rende lecito buttarne via. */
for (let k = 0; k < frame.length; k++) {
  const c = frame[k].corpo;
  const fw = (c[6] | (c[7] << 8) | (c[8] << 16)) + 1;
  const fh = (c[9] | (c[10] << 8) | (c[11] << 16)) + 1;
  const x = (c[0] | (c[1] << 8) | (c[2] << 16)) * 2;
  const y = (c[3] | (c[4] << 8) | (c[5] << 16)) * 2;
  const nonFonde = !!(c[15] & 2);
  if (x !== 0 || y !== 0 || fw !== larg || fh !== alt || !nonFonde) {
    console.error('il fotogramma ' + k + ' non e\' indipendente ' +
      '(riquadro ' + x + ',' + y + ' ' + fw + 'x' + fh + ', ' +
      (nonFonde ? 'non fonde' : 'FONDE') + '): assottigliare lo romperebbe.');
    process.exit(1);
  }
}

const durataDi = c => c[12] | (c[13] << 8) | (c[14] << 16);
const scriviDurata = (c, ms) => {
  c[12] = ms & 0xff; c[13] = (ms >> 8) & 0xff; c[14] = (ms >> 16) & 0xff;
};

/* Si tiene un fotogramma ogni `ogni`, e quello tenuto si prende la
   durata di tutti quelli che ha mangiato: l'animazione dura uguale e
   va alla stessa velocita', solo a scatti piu' larghi. */
const tenuti = [];
for (let k = 0; k < frame.length; k += ogni) {
  let ms = 0;
  for (let j = k; j < Math.min(k + ogni, frame.length); j++) ms += durataDi(frame[j].corpo);
  const copia = Buffer.from(frame[k].corpo);
  scriviDurata(copia, ms);
  tenuti.push({ tipo: 'ANMF', corpo: copia });
}

/* Rimonta: tutto quello che non e' un fotogramma ne' un metadato resta
   dov'era, e i fotogrammi tenuti vanno al posto del primo. */
const METADATI = new Set(['C2PA', 'EXIF', 'XMP ']);
const uscita = [];
let messi = false;
for (const p of pezzi) {
  if (METADATI.has(p.tipo)) continue;
  if (p.tipo === 'ANMF') {
    if (!messi) { uscita.push(...tenuti); messi = true; }
    continue;
  }
  uscita.push(p);
}

const corpo = [];
for (const p of uscita) {
  const testa = Buffer.alloc(8);
  testa.write(p.tipo, 0, 'latin1');
  testa.writeUInt32LE(p.corpo.length, 4);
  corpo.push(testa, p.corpo);
  if (p.corpo.length & 1) corpo.push(Buffer.alloc(1));   // il riempimento
}
const dati = Buffer.concat(corpo);
const testa = Buffer.alloc(12);
testa.write('RIFF', 0, 'latin1');
testa.writeUInt32LE(4 + dati.length, 4);
testa.write('WEBP', 8, 'latin1');
writeFileSync(fuori, Buffer.concat([testa, dati]));

const durata = tenuti.reduce((a, f) => a + durataDi(f.corpo), 0);
const kb = n => (n / 1024).toFixed(1) + ' KB';
console.log(dentro + ' -> ' + fuori);
console.log('  fotogrammi: ' + frame.length + ' -> ' + tenuti.length +
  '  (' + Math.round(tenuti.length / (durata / 1000)) + ' al secondo)');
console.log('  peso:       ' + kb(d.length) + ' -> ' + kb(testa.length + dati.length) +
  '  (' + Math.round(100 - (testa.length + dati.length) * 100 / d.length) + '% in meno)');
console.log('  durata:     ' + (durata / 1000).toFixed(2) + ' s');
