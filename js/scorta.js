/* ===============================================================
   LA SCORTA DELLE COPERTINE

   Il bucket manda le copertine con `cache-control: max-age=3600`: dopo
   un'ora la cache del browser le lascia scadere, e a rete staccata la
   libreria si apre con le scatole disegnate al posto delle copertine
   vere. Un'ora e' il tempo di un viaggio in treno.

   Questa e' una scorta DAVANTI al bucket, non al posto suo, e la
   differenza e' tutta nei numeri gia' misurati: la stessa copertina
   pesa 107 KB dal bucket e 706 KB chiesta all'origine di BGG attraverso
   la edge function, perche' li' arriva l'originale da due megapixel.
   Senza bucket ogni dispositivo nuovo -- e ogni amico in visita --
   pagherebbe cinque volte i byte piu' un'invocazione. Il bucket resta
   la fonte; qui c'e' solo una copia di quello che si e' gia' scaricato.

   PERCHE' INDEXEDDB E NON localStorage: localStorage tiene stringhe,
   quindi una copertina andrebbe in base64 -- un terzo di byte in piu' --
   dentro un magazzino da cinque megabyte totali, condiviso con la
   libreria, il tema e il volume. Quattordici copertine lo riempirebbero
   da sole. IndexedDB tiene i Blob come sono e non ha quel tetto.

   E IL CANVAS RESTA PULITO. E' la cosa che rende praticabile tutto il
   resto, ed e' stata misurata: un blob riletto da qui diventa un
   indirizzo `blob:` **dello stesso dominio del sito**, quindi la texture
   WebGL si costruisce e `senzaBande` puo' leggere i pixel. Un'immagine
   presa dal CDN di BGG, che non manda gli header CORS, contaminerebbe
   il canvas -- ed e' esattamente il motivo per cui le copertine passano
   dal bucket invece che da BGG.

   Se IndexedDB non c'e' -- finestra anonima, impostazioni strette --
   tutte le funzioni qui sotto rispondono "niente" e il sito carica
   dalla rete come ha sempre fatto. Una scorta che manca non e' un
   guasto.
   =============================================================== */
const SCORTA = (function(){
'use strict';

const NOME = 'meboard-copertine';
const NEGOZIO = 'immagini';
const VERSIONE = 1;

let apertura = null;        // la promessa dell'apertura, per non farne due
let spenta = false;         // IndexedDB non c'e': si smette di provarci

function apri(){
  if (spenta) return Promise.resolve(null);
  if (apertura) return apertura;
  apertura = new Promise(function(risolvi){
    let req;
    try { req = indexedDB.open(NOME, VERSIONE); }
    catch (e){ spenta = true; return risolvi(null); }
    req.onupgradeneeded = function(){
      const db = req.result;
      if (!db.objectStoreNames.contains(NEGOZIO)) db.createObjectStore(NEGOZIO);
    };
    req.onsuccess = function(){ risolvi(req.result); };
    req.onerror = function(){ spenta = true; risolvi(null); };
    /* Bloccata da un'altra scheda che tiene aperta una versione
       precedente: non si aspetta all'infinito, si rinuncia. */
    req.onblocked = function(){ spenta = true; risolvi(null); };
  });
  return apertura;
}

function transazione(db, modo){
  try { return db.transaction(NEGOZIO, modo).objectStore(NEGOZIO); }
  catch (e){ return null; }
}

/* Quello che c'e' in casa per questo indirizzo, o niente. La chiave e'
   l'indirizzo intero: da quando le copertine stanno in `bgg/p<id>.jpg`
   quell'indirizzo e' lo stesso per tutti, quindi la scorta di un gioco
   vale anche dopo che l'ha aggiunto qualcun altro. */
function prendi(url){
  if (!url || url.slice(0, 5) === 'data:') return Promise.resolve(null);
  return apri().then(function(db){
    if (!db) return null;
    return new Promise(function(risolvi){
      const n = transazione(db, 'readonly');
      if (!n) return risolvi(null);
      const r = n.get(url);
      r.onsuccess = function(){
        const v = r.result;
        risolvi(v && v.size ? v : null);
      };
      r.onerror = function(){ risolvi(null); };
    });
  }).catch(function(){ return null; });
}

/* Si scrive e non si aspetta: chi chiama sta gia' mostrando
   l'immagine, e se la scrittura non passa l'unica conseguenza e' che al
   prossimo giro si ripassa dalla rete. */
function metti(url, blob){
  if (!url || !blob || !blob.size) return Promise.resolve(false);
  return apri().then(function(db){
    if (!db) return false;
    const n = transazione(db, 'readwrite');
    if (!n) return false;
    try { n.put(blob, url); } catch (e){ return false; }
    return true;
  }).catch(function(){ return false; });
}

/* VIA QUELLO CHE NON SERVE PIU'.

   Una copertina che cambia -- BGG pubblica la figura di una ristampa,
   oppure si sceglie un file a mano -- lascia in casa la vecchia, che da
   quel momento non la chiede piu' nessuno. Senza potatura la scorta
   cresce e basta.

   Si tiene quello che la collezione usa ADESSO, e si butta il resto: e'
   l'unico criterio che non ha bisogno di ricordare niente. Gira
   all'avvio, quando la libreria e' appena stata letta. */
function pota(vivi){
  const tieni = {};
  (vivi || []).forEach(function(u){ if (u) tieni[u] = true; });
  return apri().then(function(db){
    if (!db) return 0;
    return new Promise(function(risolvi){
      const n = transazione(db, 'readwrite');
      if (!n) return risolvi(0);
      const r = n.getAllKeys();
      r.onsuccess = function(){
        let via = 0;
        (r.result || []).forEach(function(k){
          if (!tieni[k]){ try { n.delete(k); via++; } catch (e){} }
        });
        risolvi(via);
      };
      r.onerror = function(){ risolvi(0); };
    });
  }).catch(function(){ return 0; });
}

/* L'indirizzo da dare a un `<img>`: la copia di casa se c'e', se no
   quella della rete -- e in quel caso si mette da parte mentre passa.

   Torna sempre qualcosa di usabile. Se la rete non risponde e in casa
   non c'e' niente si torna l'indirizzo originale: il `<img>` ci
   riprovera' da solo, e con la sua cache puo' anche riuscire dove
   `fetch` ha fallito. */
function indirizzo(url){
  if (!url || url.slice(0, 5) === 'data:') return Promise.resolve(url);
  return prendi(url).then(function(blob){
    if (blob) return URL.createObjectURL(blob);
    return fetch(url, { mode: 'cors', credentials: 'omit' })
      .then(function(r){ return r.ok ? r.blob() : null; })
      .then(function(b){
        if (!b || !b.size) return url;
        metti(url, b);
        return URL.createObjectURL(b);
      })
      .catch(function(){ return url; });
  });
}

return { prendi: prendi, metti: metti, pota: pota, indirizzo: indirizzo };
})();
