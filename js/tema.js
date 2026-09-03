/* ===============================================================
   LE TAVOLOZZE

   Il sito ha sempre avuto SEI TINTE E BASTA, e quella disciplina non
   cambia: cambia quali sono le sei. Una tavolozza e' un ricambio
   completo -- fondo, scheda, inchiostro, le due tinte quiete, il legno
   e l'accento -- e tutto il resto si DERIVA, come `--ink` si derivava
   gia' dall'oliva.

   Derivare invece di elencare non e' pigrizia: i fili, le ombre e il
   velo della testata sono l'inchiostro e la carta a percentuali
   diverse, e se una tavolozza dovesse dichiararli a mano prima o poi
   uno resterebbe indietro e si vedrebbe un'ombra verde su un fondo
   lilla.

   COSA NON CAMBIA:

   - il ROSSO di quello che distrugge. Non e' decorazione, e' un
     segnale, e un rosso "coordinato" con la tavolozza smette di dire
     quello che deve dire.
   - le SCELTE della stanza. Legno, muro, pavimento e faretti stanno sul
     profilo di chi ci abita e non si toccano: quello che cambia con la
     tavolozza e' come vengono DISEGNATE, non quali sono. Sul database
     resta un identificativo -- "il legno" -- e che legno sia lo decide
     la tavolozza.
   - e in casa d'altri decide LA SUA. La tavolozza viaggia dentro
     `profili.stanza`, quindi la libreria di un amico si vede con i
     colori del suo tema: se no sarebbe la tua ridipinta, e il legno che
     ha scelto lui non vorrebbe piu' dire niente. Il sito attorno
     invece resta vestito come piace a te.

   Sta nel `<head>` apposta, e non in fondo al body con gli altri: le
   variabili vanno scritte PRIMA che la pagina si dipinga, se no si
   vede il sito partire di un colore e cambiare un attimo dopo.
   =============================================================== */
const TEMA = (function(){

const CHIAVE = 'meboard-tavolozza';     // la base: 'chiaro' o 'scuro'
const CHIAVE_ACC = 'meboard-accento';   // l'accento scelto, o vuoto

/* DUE MATERIALI E UN ACCENTO.

   La base dice su che cosa e' stampato il sito -- CARTONE o CARTA -- e
   l'accento e' l'inchiostro che ci si posa sopra. Sono sempre otto
   tinte e tutto il resto derivato: quella disciplina non cambia, cambia
   quali sono le otto.

   La fustella e' una plancia di cartone prima che tu ne stacchi i
   pezzi: fondo di cartone bagnato, blocchi di carta cruda, e tre
   inchiostri da stampa -- rosso, ocra, verde. Il DEFAULT e' il cartone,
   ed e' per questo che sta per primo: `leggiBase()` prende `BASI[0]`
   quando non c'e' niente di salvato.

   GLI IDENTIFICATIVI RESTANO `chiaro` e `scuro`. Sono un ruolo, non un
   colore, e viaggiano dentro `profili.stanza.tavolozza`: cambiarli
   vorrebbe dire che ogni tavolozza gia' salvata da qualcuno smette di
   essere leggibile. Che materiale sia quel ruolo lo decide questo file,
   che e' esattamente il patto gia' scritto per il legno della stanza. */
const BASI = [
  {
    /* IL CARTONE, che e' la casa della fustella. `bg` e' il cartone
       bagnato -- il piu' scuro, perche' e' il fondo su cui tutto poggia
       -- e `card` e' il cartone tagliato, un gradino sopra. La carta
       cruda non e' qui fra le superfici: e' l'INCHIOSTRO, ed e' per
       questo che il blocco pieno di un comando si scrive
       `background:var(--ink); color:var(--card)` e si rovescia da solo
       quando si passa all'altro materiale.

       IL NERO E' SCESO DI TRE QUARTI. Era #16130f, un marrone molto
       scuro che a schermo si legge come marrone e non come nero: su un
       pannello acceso in una stanza illuminata la sfumatura calda si
       vede benissimo, e la plancia sembrava fotografata di sera invece
       che stampata. Adesso il fondo sta a #0a0806, un terzo della
       chiarezza di prima (L* da 6,0 a 2,3), e il caldo resta come
       traccia invece che come tinta.

       LO SCALINO FRA I DUE E' RIMASTO QUELLO. Il cartone tagliato scende
       insieme al fondo -- da #241f18 a #1c1813 -- e non perche' sia
       simmetrico: il rapporto di contrasto fra i due era 1,13 e adesso
       e' 1,13. E' quel gradino a far leggere un pannello come un pezzo
       staccato dal fondo, e abbassando solo il fondo si sarebbe rotto
       il verso della plancia per guadagnare un nero che nessuno guarda
       da solo. */
    v: 'scuro', n: 'tema.cartone',
    c: { bg:'#0a0806', card:'#1c1813', ink:'#efe3cd', inkSoft:'#a2937c',
         sage:'#6d6252', sand:'#b8a184', wood:'#b0824c', accent:'#f0b429',
         woodDark:'#6b4d2b' }
  },
  {
    /* LA CARTA. Non e' il cartone rovesciato: e' la stessa plancia
       guardata dall'altra parte, con il fondo appena piu' sporco della
       carta cruda perche' i blocchi ci si stacchino sopra. */
    v: 'chiaro', n: 'tema.carta',
    c: { bg:'#d9c9aa', card:'#efe3cd', ink:'#0a0806', inkSoft:'#6b5f4c',
         sage:'#a0906f', sand:'#c9b394', wood:'#7f5528', accent:'#f0b429',
         woodDark:'#54371a' }
  }
];

/* I TRE INCHIOSTRI DA STAMPA. Non sono la tavolozza: sono i colori con
   cui la plancia e' stampata, e restano gli stessi su tutte e due i
   materiali -- e' il materiale sotto a cambiare, non l'inchiostro.

     rosso  il filetto della barra, il bordo di quello che distrugge
     ocra   quello che e' scelto adesso
     verde  quello che e' gia' fatto

   Su carta un ocra da fondo scuro sparisce, quindi `stampa()` li tira
   verso il buio finche' non si leggono. E' lo stesso conto dell'accento
   e per lo stesso motivo: qui non si dichiara un valore per ogni
   materiale, si dichiara l'inchiostro e si lascia che il materiale se
   lo adatti. */
const STAMPA = { rosso:'#e23d28', ocra:'#f0b429', verde:'#2f9e6b' };

/* I predefiniti. Non sono un ripiego per chi non sa usare la ruota:
   sono otto colori che su tutti e due i materiali funzionano, e chi non
   ha un colore in mente ne tocca uno e ha finito.

   L'ocra sta per primo perche' e' quello della fustella. Il rosso non
   c'e' e non ci sara': non e' decorazione, e' il segnale di quello che
   distrugge, e un accento rosso lo renderebbe muto. */
const ACCENTI = [
  '#f0b429', '#2f9e6b', '#2a63c4', '#7350a6',
  '#0f7d86', '#bf2f80', '#c86a3c', '#4a6b8a'
];

const ESA = /^#[0-9a-fA-F]{6}$/;
const iscritti = [];

/* Le vecchie tavolozze non si buttano via: si traducono. Chi aveva
   `notte` si ritrova la base scura; chi aveva bosco, china o vaporwave
   si ritrova il chiaro -- e il loro accento e' fra i predefiniti,
   quindi non e' andato perso, e' diventato una scelta invece che un
   pacchetto. */
const VECCHIE = {
  stanza:    { b: 'chiaro', a: '' },
  vaporwave: { b: 'chiaro', a: '#bf2f80' },
  bosco:     { b: 'chiaro', a: '#2f6b43' },
  china:     { b: 'chiaro', a: '#2a63c4' },
  notte:     { b: 'scuro',  a: '' }
};

let base = leggiBase();
let accento = leggiAccento();

function leggiBase(){
  let v = '';
  try { v = localStorage.getItem(CHIAVE) || ''; } catch (e) {}
  if (BASI.some(function(t){ return t.v === v; })) return v;
  if (VECCHIE[v]) return VECCHIE[v].b;
  return BASI[0].v;
}

function leggiAccento(){
  let v = '', vecchia = '';
  try {
    v = localStorage.getItem(CHIAVE_ACC) || '';
    vecchia = localStorage.getItem(CHIAVE) || '';
  } catch (e) {}
  if (ESA.test(v)) return v.toLowerCase();
  if (VECCHIE[vecchia]) return VECCHIE[vecchia].a;
  return '';
}

function quale(v){
  for (let i = 0; i < BASI.length; i++) if (BASI[i].v === v) return BASI[i];
  return BASI[0];
}

/* Una tavolozza si scrive in una stringa sola -- `scuro~#2f6b43` --
   perche' e' cosi' che viaggia: dentro `profili.stanza.tavolozza`, che
   e' quello che un amico legge per vedere la tua libreria con i tuoi
   colori. Il separatore e' `~` come per le celle degli arredi, e non
   `:` che qui vorrebbe dire un'altra cosa. */
function componi(b, a){ return a ? (b + '~' + a) : b; }

function scomponi(v){
  const t = String(v || '').split('~');
  const b = BASI.some(function(x){ return x.v === t[0]; }) ? t[0]
          : (VECCHIE[t[0]] ? VECCHIE[t[0]].b : null);
  if (!b) return null;
  const a = ESA.test(t[1] || '') ? t[1].toLowerCase()
          : (VECCHIE[t[0]] ? VECCHIE[t[0]].a : '');
  return { base: b, accento: a };
}

/* Le otto tinte gia' risolte: la base, con l'accento al posto del suo.
   Su fondo scuro un accento scelto per il chiaro diventa fango, quindi
   si schiarisce quanto basta -- non e' un vezzo, e' che l'accento fa
   anche da FONDO per del testo, e sotto un certo contrasto quel testo
   non si legge piu'. */
function tinteDi(b, a){
  const t = quale(b);
  const c = Object.assign({}, t.c);
  /* Anche l'accento DI SERIE passa da `stampa()`, non solo quello
     scelto con la ruota: l'ocra della fustella e' uno solo, ed e' il
     materiale sotto a dire di che ocra si tratta. Scriverne due nelle
     basi vorrebbe dire tenerli allineati a mano per sempre. */
  c.accent = stampa(a || t.c.accent, t.c);
  return c;
}

/* UN INCHIOSTRO SI ADATTA AL MATERIALE, NON VICEVERSA.

   Lo stesso ocra su cartone e su carta non e' lo stesso colore: sul
   fondo scuro brilla, sulla carta cruda sparisce. `stampa()` lo tira
   verso la carta o verso il buio -- a seconda di dove sta -- finche' non
   si legge, e questo vale per l'accento come per i tre inchiostri.

   Il riferimento e' `card` e non il fondo: sui due materiali e' la
   superficie che sta piu' vicina all'inchiostro, quindi e' la prova
   piu' severa delle due, e chi passa quella passa anche l'altra. */
function stampa(hex, c){
  const scuroFondo = lum(c.bg) <= .18;
  let v = hex;
  for (let i = 0; i < 20 && contrasto(v, c.card) < 4.5; i++){
    v = scala(v, scuroFondo ? .06 : -.06);
  }
  return v;
}

/* QUELLO CHE SI SCRIVE SOPRA UN INCHIOSTRO. Un blocco di colore porta
   quasi sempre una parola, e quale delle due tinte del materiale ci
   stia sopra non lo si puo' decidere una volta per tutte: sull'ocra ci
   va il cartone, sul rosso ci va la carta. Si misurano tutte e due e
   vince quella che si legge -- che e' anche l'unico modo perche' un
   colore scelto con la ruota non lasci una scritta illeggibile. */
function sopra(hex, c){
  return contrasto(c.ink, hex) >= contrasto(c.card, hex) ? c.ink : c.card;
}

function contrasto(a, b){
  const x = lum(a), y = lum(b);
  return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}

/* --- i conti sui colori ---------------------------------------- */

function rgb(hex){
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
}
function esa(r){
  return '#' + r.map(function(v){
    const n = Math.max(0, Math.min(255, Math.round(v)));
    return (n < 16 ? '0' : '') + n.toString(16);
  }).join('');
}
function tri(hex){ return rgb(hex).join(','); }

/* Verso il nero (q negativo) o verso il bianco: serve per l'accento
   premuto e per il velo, che e' la carta un filo tirata verso il fondo. */
function scala(hex, q){
  const c = rgb(hex);
  const verso = q < 0 ? 0 : 255;
  const p = Math.abs(q);
  return esa(c.map(function(v){ return v + (verso - v) * p; }));
}
/* Luminanza relativa, quella vera di WCAG: serve a sapere se una
   tavolozza e' chiara o scura senza doverglielo chiedere. Una
   bandierina nella tavolozza si potrebbe dimenticare; questa no. */
function lum(hex){
  const c = rgb(hex).map(function(v){
    v /= 255;
    return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4);
  });
  return .2126 * c[0] + .7152 * c[1] + .0722 * c[2];
}

function mescola(a, b, p){
  const x = rgb(a), y = rgb(b);
  return esa([0,1,2].map(function(i){ return x[i] + (y[i] - x[i]) * p; }));
}

/* --- applicare --------------------------------------------------- */

/* SCRIVE UN MATERIALE. Il prefisso serve al ROVESCIO: le stesse
   variabili, scritte una seconda volta con `--r-` davanti, sono l'altro
   materiale gia' pronto -- e una regola sola (`.rovescio`, in fondo al
   foglio di stile) ci sposta sopra un pezzo di pagina.

   Serve perche' la fustella e' fatta di due materiali insieme: la
   recensione e' un foglio di CARTA appoggiato sul cartone, e dentro
   quel foglio l'inchiostro, i fili, i veli e perfino l'ocra devono
   essere quelli della carta. Rovesciare a mano `--ink` e `--card`
   basterebbe per il testo e lascerebbe indietro tutto il resto: l'ocra
   del cartone, sulla carta, fa 1,4 a 1.

   Il rovescio del cartone e' LA CARTA, cioe' l'altra base: non c'e' un
   conto nuovo da fare, sono gia' scritte tutte e due qui sopra. */
function scrivi(s, c, pre){
  const inkT = tri(c.ink);
  /* Se un materiale e' chiaro o scuro non lo dichiara il materiale, lo
     dice la luminanza del suo fondo: una bandierina si dimentica, un
     conto no. Serve al verso in cui si adattano gli inchiostri e al
     colore dell'ombra, quindi si calcola una volta sola qui in cima. */
  const chiaro = lum(c.bg) > .18;
  const v = function(nome, valore){ s.setProperty('--' + pre + nome, valore); };

  v('bg', c.bg);
  v('card', c.card);
  v('ink', c.ink);
  v('ink-soft', c.inkSoft);
  v('sage', c.sage);
  v('sand', c.sand);
  v('wood', c.wood);
  v('accent', c.accent);

  /* I tripli: mezzo foglio di stile scrive l'inchiostro e la carta a
     decine di opacita' diverse, e senza questi resterebbero i numeri
     della tavolozza di partenza -- un filo oliva su un fondo lilla. */
  v('ink-rgb', inkT);
  v('card-rgb', tri(c.card));
  v('bg-rgb', tri(c.bg));

  /* `--accent-su` e' l'accento premuto: verso la carta sul cartone,
     verso il buio sulla carta -- cioe' sempre nel verso in cui si
     stacca dal proprio fondo. */
  v('accent-su', scala(c.accent, chiaro ? -.12 : .12));
  v('accent-rgb', tri(c.accent));
  /* QUELLO CHE SI SCRIVE SOPRA L'ACCENTO. Mezzo foglio scriveva `#fff`
     su terracotta, e con la terracotta funzionava. Sull'ocra della
     fustella no: bianco su ocra fa 1,9 a 1, cioe' non si legge. Sopra
     l'ocra ci va il cartone, sopra il rosso ci va la carta, e a dirlo
     e' un conto invece di una scelta scritta a mano -- che e' anche
     l'unico modo perche' la ruota dei colori non lasci addosso al sito
     una scritta invisibile. */
  v('su-accent', sopra(c.accent, c));

  /* I TRE INCHIOSTRI DA STAMPA, adattati al materiale, con la tinta che
     ci si scrive sopra. Il rosso NON e' l'accento e non lo diventa mai:
     e' il filetto della barra e il bordo di quello che distrugge. */
  const rosso = stampa(STAMPA.rosso, c);
  const verde = stampa(STAMPA.verde, c);
  const ocra  = stampa(STAMPA.ocra,  c);
  v('rosso', rosso);
  v('rosso-rgb', tri(rosso));
  v('su-rosso', sopra(rosso, c));
  v('verde', verde);
  v('su-verde', sopra(verde, c));
  v('ocra', ocra);
  v('su-ocra', sopra(ocra, c));

  /* Il fondo delle schermate piatte: un terzo di strada dalla carta
     verso la stanza. La frazione non e' scelta a caso -- e' quella che
     ridA' esattamente la tinta che c'era scritta a mano prima. */
  v('fondo', mescola(c.card, c.bg, .33));
  const velo = mescola(c.card, c.bg, .22);
  v('velo', 'rgba(' + tri(velo) + ',.82)');
  v('velo-lieve', 'rgba(' + tri(velo) + ',.55)');
  v('velo-pieno', 'rgba(' + tri(velo) + ',.94)');
  /* Il filo e' TRATTEGGIATO, come le fustelle di una plancia, e un
     tratteggio a .14 di opacita' non si vede: sono buchi in un segno
     gia' tenue. Sta a .26, che e' il valore su cui il tratteggio della
     fustella e' disegnato. */
  v('line', 'rgba(' + inkT + ',.26)');

  /* LE OMBRE SONO PIENE E NON SFOCATE, che e' meta' della fustella: un
     pezzo di cartone appoggiato fa un'ombra con un bordo, non un alone.
     Restano quello che erano gia' -- il BUIO e non l'inchiostro, perche'
     un'ombra chiara su fondo scuro e' un pannello retroilluminato -- ma
     lo scarto ha preso il posto della sfocatura.

     Le due misure sono la stessa cosa a due altezze: `--ombra-lieve` e'
     un pezzo appoggiato (3 px), `--shadow` e' un pannello che sta sopra
     a tutto (6 px). Il gesto di premere le consuma, e quello sta in
     fondo al foglio di stile con gli altri comandi. */
  /* SU UN FONDO QUASI NERO L'OMBRA DEVE ESSERE NERA PIENA.

     L'ombra della fustella e' uno scarto pieno, e si vede perche' e'
     PIU' SCURA di quello su cui cade. Sul cartone stava al 55% di nero,
     che sul vecchio #16130f lasciava un gradino netto; sul nuovo fondo
     lo stesso 55% cade a un passo dal fondo stesso e i pannelli
     smettono di sembrare appoggiati.

     Sotto il nero non c'e' niente da prendere, quindi si prende tutto
     quello che c'e': 0,78 sul cartone. Sulla carta resta 0,34 -- li' di
     spazio verso il buio ce n'e' quanto se ne vuole, e un'ombra piu'
     pesante sarebbe solo una macchia. */
  const ombT = chiaro ? inkT : '0,0,0';
  const f = chiaro ? .34 : .78;
  v('ombra-rgb', ombT);
  v('shadow', '6px 6px 0 rgba(' + ombT + ',' + f.toFixed(2) + ')');
  v('ombra-lieve', '3px 3px 0 rgba(' + ombT + ',' + (f * .82).toFixed(2) + ')');
  v('posa', 'drop-shadow(3px 3px 0 rgba(' + ombT + ',' + (f * .82).toFixed(2) + '))');
  v('posa-giu', 'drop-shadow(1px 1px 0 rgba(' + ombT + ',' + (f * .82).toFixed(2) + '))');
}

/* L'ALTRO MATERIALE, con lo STESSO accento. L'accento scelto e' una
   scelta della persona e non del materiale: passa di la' com'e', ed e'
   `stampa()` dentro `tinteDi` a dire di che ocra si tratta su carta. */
function rovescioDi(b){
  for (let i = 0; i < BASI.length; i++) if (BASI[i].v !== b) return BASI[i].v;
  return b;
}

function applica(){
  const t = quale(base);
  const c = tinteDi(base, accento);
  const r = document.documentElement;
  const s = r.style;

  scrivi(s, c, '');
  scrivi(s, tinteDi(rovescioDi(base), accento), 'r-');

  /* La barra del browser sui telefoni: e' la prima cosa che si vede
     accanto al sito, e lasciata indietro stona piu' di qualunque
     dettaglio dentro la pagina. */
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', c.bg);

  r.setAttribute('data-tema', base);
  iscritti.forEach(function(f){ try { f({ v: base, n: t.n, c: c }); } catch (e) {} });
}

function scegli(v){
  /* Accetta anche la forma composta e le tavolozze vecchie: e' quello
     che arriva da `profili.stanza.tavolozza`. */
  const q = scomponi(v);
  if (!q) return;
  base = q.base;
  if (q.accento) accento = q.accento;
  salva();
  applica();
}

/* `soloVista` applica senza salvare. La ruota manda `input` a ogni
   pixel di trascinamento, ed e' giusto che il sito cambi colore sotto
   il cursore -- e' meta' del senso di avere una ruota. Ma scrivere a
   ogni pixel vuol dire che un tocco di sfuggita lascia addosso un
   colore che nessuno ha scelto davvero, e da li' finisce in
   `localStorage` e poi in `profili.stanza`, cioe' anche negli occhi
   degli amici. Si guarda dal vivo, si salva al rilascio. */
function scegliAccento(v, soloVista){
  accento = ESA.test(v || '') ? String(v).toLowerCase() : '';
  if (!soloVista) salva();
  applica();
}

function salva(){
  try {
    localStorage.setItem(CHIAVE, base);
    localStorage.setItem(CHIAVE_ACC, accento);
  } catch (e) {}
}

/* Chi ha gia' disegnato qualcosa con un colore in mano -- la scena 3D,
   i canvas -- si iscrive e si rimette in pari da se'. E' lo stesso
   gancio di `I18N.suCambio`. */
function suCambio(f){ if (typeof f === 'function') iscritti.push(f); }

/* IL SELETTORE SE LO MONTA QUESTO FILE, come fa `js/i18n.js` con quello
   della lingua. Non e' simmetria per il gusto della simmetria: se un
   giorno `app.js` non si aggancia -- ed e' successo -- la tavolozza
   deve restare cambiabile lo stesso.

   Il nome passa da `T()` se c'e', ma questo file gira PRIMA di i18n
   (sta nel `<head>`), quindi si legge al momento di disegnare e non
   prima. Chi tiene una parola se la tiene per sempre. */
function nome(chiave){
  return (typeof T === 'function') ? T(chiave) : chiave;
}

/* IL SELETTORE. Due domande, in quest'ordine: chiaro o scuro -- che e'
   quella che decide se il sito si legge -- e poi di che colore.

   I predefiniti stanno in fila e la RUOTA e' l'ultima, come nel
   pannello della libreria: la stessa forma per la stessa scelta, e chi
   ha capito una volta ha capito. */
function bollino(hex, scelto){
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'tav-acc' + (scelto ? ' on' : '');
  b.setAttribute('data-acc', hex);
  b.style.background = hex;
  b.setAttribute('aria-pressed', scelto ? 'true' : 'false');
  return b;
}

function disegnaSelettore(){
  const lista = document.getElementById('pro-tema-lista');
  if (!lista) return;
  const t = quale(base);
  const c = tinteDi(base, accento);

  const ora_n = document.getElementById('pro-tema-ora');
  if (ora_n) ora_n.textContent = nome(t.n);
  const mostra = document.getElementById('pro-tema-mostra');
  if (mostra){
    mostra.innerHTML = '';
    const i = document.createElement('i');
    i.style.background = c.accent;
    mostra.appendChild(i);
  }

  lista.innerHTML = '';

  // le due basi
  const basi = document.createElement('div');
  basi.className = 'tav-basi';
  BASI.forEach(function(x){
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tav-base' + (x.v === base ? ' on' : '');
    b.setAttribute('data-tav', x.v);
    b.setAttribute('aria-pressed', x.v === base ? 'true' : 'false');
    const p = document.createElement('span');
    p.className = 'tav-prova';
    p.style.background = x.c.bg;
    p.style.color = x.c.ink;
    p.textContent = 'Aa';
    b.appendChild(p);
    const n = document.createElement('span');
    n.className = 'tav-nome';
    n.textContent = nome(x.n);
    b.appendChild(n);
    basi.appendChild(b);
  });
  lista.appendChild(basi);

  // l'accento: i predefiniti, poi la ruota
  const acc = document.createElement('div');
  acc.className = 'tav-accenti';
  const suo = accento || quale(base).c.accent;
  ACCENTI.forEach(function(hex){
    acc.appendChild(bollino(hex, accento === hex));
  });
  const r = document.createElement('input');
  r.type = 'color';
  r.className = 'ruota' + (accento && ACCENTI.indexOf(accento) < 0 ? ' on' : '');
  r.value = suo;
  r.setAttribute('data-acc-ruota', '1');
  const tit = (typeof T === 'function') ? T('stanza.ruota') : 'colore';
  r.title = tit; r.setAttribute('aria-label', tit);
  acc.appendChild(r);
  lista.appendChild(acc);
}

function montaSelettore(){
  const lista = document.getElementById('pro-tema-lista');
  if (!lista) return;
  disegnaSelettore();
  /* Un ascoltatore solo sull'elenco: i pulsanti si rifanno a ogni
     scelta, e attaccarne uno per voce vorrebbe dire rimetterli tutti
     ogni volta. */
  lista.addEventListener('click', function(e){
    const b = e.target.closest('button[data-tav]');
    if (b){ scegli(b.getAttribute('data-tav')); return; }
    const a = e.target.closest('button[data-acc]');
    if (a) scegliAccento(a.getAttribute('data-acc'));
  });
  /* La ruota manda `input` mentre si trascina: qui si vuole vedere il
     sito cambiare colore sotto il cursore, non dopo. E' la stessa
     scelta del meeple, e per lo stesso motivo -- qui non si scrive
     niente sul database, si riscrivono delle variabili CSS. */
  lista.addEventListener('input', function(e){
    const r = e.target.closest('input[data-acc-ruota]');
    if (r) scegliAccento(r.value, true);      // si vede, non si scrive
  });
  lista.addEventListener('change', function(e){
    const r = e.target.closest('input[data-acc-ruota]');
    if (r) scegliAccento(r.value);            // al rilascio si salva
  });
  if (typeof I18N !== 'undefined' && I18N.suCambio) I18N.suCambio(disegnaSelettore);
}

suCambio(disegnaSelettore);
if (document.readyState === 'loading')
  document.addEventListener('DOMContentLoaded', montaSelettore);
else montaSelettore();

applica();

/* IL COLORE DI UN RUOLO, per chi non e' un foglio di stile.

   Le tavolozze della STANZA -- legni, muri, pavimenti, colore del nome
   -- non sono mai state altro che le sei tinte del sito messe in un
   altro ordine: il noce e' `wood`, l'oliva e' `inkSoft`, il cotto e'
   `accent`. Scritte a mano restavano quelle di partenza qualunque
   tavolozza si scegliesse, e nel pannello si finiva a scegliere un
   marrone caldo per una stanza lilla.

   `legnoScuro` e' l'unico ruolo derivato, ed e' lo stesso conto che
   dava il `#5c4530` scritto a mano: il legno tirato al buio di un
   terzo abbondante. */
function ruolo(nome, tavolozza){
  /* La tavolozza si puo' chiedere: serve a disegnare la stanza di un
     amico con la SUA, che e' l'unica cosa che rende quella libreria la
     sua invece di una copia della tua ridipinta. */
  const q = tavolozza ? scomponi(tavolozza) : null;
  const c = q ? tinteDi(q.base, q.accento) : tinteDi(base, accento);
  /* Il legno scuro e' SCRITTO, non scalato. Una scalatura del noce da'
     un colore vicinissimo ma non quello: il `#5c4530` di sempre non e'
     una percentuale del `#8e6a4b`, e' una tinta scelta. Derivarlo
     vorrebbe dire che chi non cambia tavolozza si vede lo scaffale
     spostarsi di un paio di unita' -- invisibile, ma per niente. */
  if (nome === 'legnoScuro') return c.woodDark || scala(c.wood, -.35);
  return c[nome] || c.accent;
}

return {
  BASI: BASI, ACCENTI: ACCENTI, ruolo: ruolo,
  /* `corrente()` torna la forma composta: e' quella che si salva, ed e'
     quella che un amico legge. */
  corrente: function(){ return componi(base, accento); },
  base: function(){ return base; },
  accento: function(){ return accento; },
  esiste: function(v){ return !!scomponi(v); },
  tinte: function(){ return tinteDi(base, accento); },
  scegli: scegli, scegliAccento: scegliAccento, suCambio: suCambio
};
})();
