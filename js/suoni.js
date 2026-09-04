/* ===============================================================
   IL SUONO

   Il sito non carica una sola risorsa esterna, e per il suono vale
   quello che vale per le superfici: legno, cartone, parquet e facce
   dei dadi sono DISEGNATI da codice su canvas, non scaricati. Qui e'
   lo stesso -- non c'e' nessun file audio nel repo, e non ce ne
   sara' nessuno: i suoni si SINTETIZZANO con Web Audio.

   Non e' un vincolo che ci si porta dietro, e' quello che serve. Una
   manciata di .mp3 anche corti pesa piu' di tutto il resto del sito
   messo insieme, va scaricata prima di potersi sentire, e a rete
   staccata la libreria deve continuare a funzionare. Un suono
   d'interfaccia dura quaranta millisecondi: farne un file e' come
   scaricare un'immagine per disegnare un quadrato.

   -----------------------------------------------------------------
   COM'E' FATTO IL SUONO DI QUESTO SITO

   Prima era CARTONE: colpi secchi, smorzati, un punzone che stacca il
   pezzo dalla plancia. Era coerente con la pelle e suonava vecchio --
   un'interfaccia che imita un materiale sordo si sente sorda. Adesso
   e' costruito come si costruisce oggi il suono di un'applicazione, e
   sono quattro scelte:

   1. E' INTONATO. Ogni voce e' una nota di una pentatonica di DO, non
      un rumore: due suoni che capitano vicini non possono stonare fra
      loro, perche' sono dello stesso accordo. E' il motivo per cui il
      suono di un telefono non stanca dopo il decimo tocco.

   2. E' PULITO. Il corpo e' una sinusoide con un filo di ottava sopra
      -- l'ottava e' quello che fa "digitale" invece che "sinusoide
      nuda" -- e il rumore serve solo come SCHEGGIA D'ATTACCO, il
      millesimo di secondo che dice "e' successo adesso".

   3. HA ARIA. Il vecchio taglio a 6.500 Hz smorzava tutto per imitare
      il cartone; qui c'e' una campana alta appena aperta, che e' la
      differenza fra un suono nella stanza e un suono dentro una
      scatola.

   4. HA UNO SPAZIO. Una coda di trecentoventi millisecondi, costruita
      a mano come rumore che si spegne, presa in mandata al 16%. Poco,
      e non e' un effetto: e' quello che toglie a un suono sintetico
      l'aria di provino. Asciutto suona come un beep del 1998.

   TUTTO SU QUATTRO MATTONI: `blip` (la nota), `aria` (il fruscio in
   banda che si sposta), `punta` (la scheggia d'attacco), `peso` (il
   corpo basso). Ogni voce e' due o tre di questi, sfalsati.

   -----------------------------------------------------------------
   DUE FAMIGLIE. La SCENA ha sei suoni -- la scatola che esce, il
   coperchio che si alza, quella che torna a posto, quella che si
   prende in mano, quella che si posa in un cubo, il mobile su cui ci
   si ferma scorrendo -- e sono i sei momenti in cui si tocca qualcosa
   di fisico. L'INTERFACCIA ne ha nove, e stanno tutti piu' in basso:
   un tocco succede cento volte piu' spesso di una scatola che si apre,
   e quello che si sente spesso va tenuto sotto o diventa l'unica cosa
   che si sente.

   All'inizio l'interfaccia era muta apposta -- un sito che fa clic a
   ogni tocco stanca in un minuto -- e il suono su tutto e' stato
   chiesto dopo. La risposta non e' un clic solo riusato ovunque: e' un
   vocabolario, fatto degli stessi mattoni, dove ogni suono dice COSA
   e' successo e non CHE e' successo qualcosa.

   TUTTO PARTE DA UN GESTO. Il browser tiene l'AudioContext sospeso
   finche' non c'e' un'interazione vera, e va benissimo cosi': il
   primo gesto e' la scelta al cancello, e da li' in poi c'e' suono.
   Nessuno si ritrova un sito che parla da solo appena aperto.

   -----------------------------------------------------------------
   LA FORZA SULLA CARTA NON E' IL VOLUME NELL'ORECCHIO, e questa e' la
   lezione che vale per ogni suono che verra' dopo: due voci scritte
   con lo stesso numero escono a picchi diversi, perche' una nota corta
   e alta si sente molto piu' di un tonfo lungo e basso. I numeri qui
   sotto sono MISURATI sull'uscita a volume 1, non stimati.

   Come si misura: si aggancia il primo `createBiquadFilter` creato dal
   contesto -- quello e' la campana alta, cioe' l'ultimo nodo prima
   dell'uscita, e prende anche la coda -- ci si attacca un
   `AnalyserNode` come rubinetto (non tocca il segnale) e si campiona
   il picco mentre la voce suona. Il campionamento NON si fa con
   `requestAnimationFrame`: col pannello dell'anteprima nascosto e'
   sospeso, e il ciclo resta appeso. Si usa `setTimeout`.

     tocco                       0,017   61 ms
     apre, mobile                0,022   71-121
     spento, serra, acceso       0,027-0,032
     coperchio, nota             0,037-0,041
     conferma, presa, avviso     0,049-0,054
     esce, chiude                0,058-0,070
     posa                        0,099  164 ms
     via                         0,104  289 ms

   Il tocco e' il piu' basso e il piu' corto perche' e' quello che si
   sente cento volte piu' spesso di ogni altro. `posa` e' il piu' pieno
   -- e' l'unico che conferma che una cosa e' andata dove volevi -- e
   `via` e' il piu' pesante e il piu' lungo.

   Se Web Audio non c'e', `gioca()` non fa niente e non lo dice: un
   suono che manca non e' un guasto.
   =============================================================== */
const SUONI = (function(){

/* Il volume sta in localStorage e NON nel jsonb della stanza, dove
   pure starebbe comodo accanto a luce e faretti. Il motivo e' che
   quelli sono della STANZA -- un amico che viene a guardare la tua
   libreria la vede illuminata com'e' da te -- mentre il volume e' di
   chi ascolta, e ereditare quello di un altro entrando in casa sua
   sarebbe la cosa piu' sbagliata possibile. */
const CHIAVE = 'meboard-suono';
const VOL_DEF = .6;

let ctx = null;
let master = null;                 // il volume: tutte le voci passano di qui
let rumore = null;                 // un secondo di rumore bianco, riusato
let vol = leggi();
let niente = false;                // Web Audio non c'e': si smette di provarci
const ultimo = Object.create(null);

function leggi(){
  try {
    const v = localStorage.getItem(CHIAVE);
    if (v === null) return VOL_DEF;
    /* Zero e' un valore vero -- "muto" -- quindi non si puo' scrivere
       `parseFloat(v) || VOL_DEF`: e' lo stesso inciampo dei faretti e
       dei punti di una partita. */
    const n = parseFloat(v);
    return isFinite(n) ? Math.max(0, Math.min(1, n)) : VOL_DEF;
  } catch (e) { return VOL_DEF; }
}

/* SCRIVERE SU DISCO NON SI FA A OGNI PIXEL DI TRASCINAMENTO.

   Il cursore del volume manda `input` a ogni movimento -- decine di
   volte al secondo -- e ognuno finiva in un `localStorage.setItem`, che
   e' una scrittura SINCRONA: blocca il thread principale, cioe' proprio
   quello che sta disegnando la scena mentre si trascina.

   Il valore vive gia' in memoria e il volume vero e' `master.gain`, che
   cambia subito. Su disco basta che ci arrivi quando ci si ferma. Un
   quarto di secondo dopo l'ultimo movimento e' impercettibile a chi
   trascina e trasforma sessanta scritture in una.

   E' la stessa forma di `salvaStanzaTraPoco`, che per il database fa
   gia' esattamente questo per la stessa ragione. */
let scritturaFraPoco = 0;
function scrivi(){
  clearTimeout(scritturaFraPoco);
  scritturaFraPoco = setTimeout(function(){
    try { localStorage.setItem(CHIAVE, String(vol)); } catch (e) {}
  }, 250);
}

/* LA CODA, costruita a mano.

   Un riverbero e' una convoluzione con la risposta all'impulso di un
   posto, e una risposta all'impulso e' -- semplificando quanto basta --
   rumore che si spegne. Trecentoventi millisecondi e una curva ripida:
   non e' una sala, e' quel filo di stanza che separa un suono
   registrato da un suono generato.

   Si costruisce una volta e la tiene il convolutore: e' la stessa idea
   del rumore bianco riusato da tutte le voci e di `comune()` per le
   geometrie. */
function coda(c, durata, curva){
  const n = Math.floor(c.sampleRate * durata);
  const buf = c.createBuffer(2, n, c.sampleRate);
  for (let ch = 0; ch < 2; ch++){
    const d = buf.getChannelData(ch);
    for (let i = 0; i < n; i++){
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, curva);
    }
  }
  return buf;
}

/* Il contesto nasce al primo suono chiesto, non al caricamento: chi
   apre il sito per guardare la propria libreria e non tocca niente non
   ha nessun motivo di avere una scheda audio accesa. */
function assicura(){
  if (niente) return null;
  if (!ctx){
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC){ niente = true; return null; }
    try {
      ctx = new AC();

      /* LA CATENA, e la costruiscono tutte le voci insieme:

           voci -> master -> secco -----------------\
                          -> mandata -> eco -> alto -> uscita

         `master` e' il volume. `alto` e' una campana alta appena
         aperta: due decibel e mezzo sopra i 3 kHz, quanto basta perche'
         una sinusoide corta smetta di sembrare ovattata senza diventare
         stridula. Ed e' l'ULTIMO nodo, cosi' prende anche la coda: uno
         spazio piu' scuro del suono che lo genera si sente come un
         velo. */
      master = ctx.createGain();
      master.gain.value = vol;

      const alto = ctx.createBiquadFilter();
      alto.type = 'highshelf';
      alto.frequency.value = 3200;
      alto.gain.value = 2.5;

      const secco = ctx.createGain();
      secco.gain.value = 1;

      const eco = ctx.createConvolver();
      eco.buffer = coda(ctx, .32, 2.6);
      const mandata = ctx.createGain();
      /* Sedici per cento. Piu' su, ogni tocco lascia un alone e
         scorrendo un elenco si impasta; piu' giu' non si sente la
         differenza con l'asciutto, e allora tanto vale non averlo. */
      mandata.gain.value = .16;

      master.connect(secco);
      master.connect(mandata);
      mandata.connect(eco);
      eco.connect(alto);
      secco.connect(alto);
      alto.connect(ctx.destination);
    } catch (e){ niente = true; ctx = null; return null; }
  }
  /* Sospeso e' lo stato normale finche' non c'e' stato un gesto vero.
     Si prova a ogni suono: costa niente e il primo che passa dopo il
     gesto riaccende tutto. */
  if (ctx.state === 'suspended' && ctx.resume) { try { ctx.resume(); } catch (e) {} }
  return ctx;
}

/* Un secondo di rumore bianco, costruito una volta e riusato da tutti
   i suoni: e' l'equivalente audio di `comune()` per le geometrie. */
function bufRumore(c){
  if (rumore) return rumore;
  const n = Math.floor(c.sampleRate);
  rumore = c.createBuffer(1, n, c.sampleRate);
  const d = rumore.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  return rumore;
}

/* Una busta che parte e si spegne: `exponentialRamp` non arriva mai a
   zero, quindi si scende a un valore minuscolo e poi si ferma il nodo.
   L'attacco non e' mai istantaneo -- un gradino su una sinusoide fa un
   clic, e quel clic e' il rumore piu' vecchio che ci sia. */
function busta(g, t, picco, attacco, durata){
  g.gain.setValueAtTime(.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(.0002, picco), t + attacco);
  g.gain.exponentialRampToValueAtTime(.0001, t + durata);
}

/* --- i quattro mattoni ------------------------------------------ */

/* LA NOTA. Una sinusoide che si posa sulla sua altezza da un filo
   sopra -- non ci arriva dal nulla, ci CADE, ed e' quello che la fa
   sembrare suonata invece che accesa -- piu' un'ottava tenue sopra.

   L'ottava non e' un abbellimento: una sinusoide sola, a queste
   durate, si sente come un test dell'udito. Al 18% diventa un timbro. */
function blip(c, t, hz, forza, durata, tipo){
  const o = c.createOscillator();
  o.type = tipo || 'sine';
  o.frequency.setValueAtTime(hz * 1.035, t);
  o.frequency.exponentialRampToValueAtTime(hz, t + Math.min(.05, durata * .45));
  const g = c.createGain();
  busta(g, t, forza, .005, durata);
  o.connect(g); g.connect(master);
  o.start(t); o.stop(t + durata + .04);

  const h = c.createOscillator();
  h.type = 'sine';
  h.frequency.setValueAtTime(hz * 2, t);
  const gh = c.createGain();
  busta(gh, t, forza * .18, .004, durata * .55);
  h.connect(gh); gh.connect(master);
  h.start(t); h.stop(t + durata + .04);
}

/* IL FRUSCIO IN BANDA CHE SI SPOSTA. Serve dove qualcosa scorre: una
   scatola che esce, un pannello che si apre. La direzione della banda
   e' la direzione del gesto, e si sente anche senza guardare. */
function aria(c, t, f0, f1, forza, durata, q){
  const s = c.createBufferSource();
  s.buffer = bufRumore(c);
  s.playbackRate.value = .9 + Math.random() * .2;
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = q || 1.1;
  bp.frequency.setValueAtTime(f0, t);
  bp.frequency.exponentialRampToValueAtTime(f1, t + durata);
  const g = c.createGain();
  busta(g, t, forza, durata * .25, durata);
  s.connect(bp); bp.connect(g); g.connect(master);
  s.start(t); s.stop(t + durata + .04);
}

/* LA SCHEGGIA D'ATTACCO. Dodici millisecondi di rumore alto: da sola
   non e' niente, ma davanti a una nota e' quello che dice esattamente
   QUANDO e' successo. Senza, le note sembrano accendersi. */
function punta(c, t, forza){
  const s = c.createBufferSource();
  s.buffer = bufRumore(c);
  const hp = c.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 2600;
  const g = c.createGain();
  busta(g, t, forza, .001, .012);
  s.connect(hp); hp.connect(g); g.connect(master);
  s.start(t); s.stop(t + .04);
}

/* IL CORPO BASSO. E' peso, non nota: scende mentre suona, come tutto
   quello che tocca terra. Serve a tre cose sole -- una scatola che si
   posa, una che si chiude, quello che si cancella -- e sono le tre in
   cui qualcosa ha una massa. */
function peso(c, t, hz, forza, durata){
  const o = c.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(hz * 1.7, t);
  o.frequency.exponentialRampToValueAtTime(hz * .72, t + durata * .6);
  const g = c.createGain();
  busta(g, t, forza, .006, durata);
  o.connect(g); g.connect(master);
  o.start(t); o.stop(t + durata + .04);
}

/* LA SCALA. Pentatonica di DO, ed e' tutta la teoria che serve: fra
   queste cinque note non esistono intervalli che stonano, quindi due
   suoni che capitano insieme -- un tocco mentre un pannello si apre --
   non possono fare una dissonanza. L'unica nota fuori scala di tutto
   il sito e' dichiarata dove serve, e serve a mettere a disagio. */
const N = {
  sol2: 196.00, do3: 261.63, mi3: 329.63, sol3: 392.00,
  la3:  440.00, do4: 523.25, re4: 587.33, mi4: 659.25,
  sol4: 783.99, la4: 880.00, do5: 1046.50, re5: 1174.66, mi5: 1318.51
};

/* I SUONI.

   I primi sei sono la SCENA: i sei momenti in cui si tocca qualcosa di
   fisico. Gli altri sono l'INTERFACCIA, e stanno tutti piu' in basso --
   un tocco succede cento volte piu' spesso di una scatola che si apre,
   e quello che si sente spesso va tenuto sotto o diventa l'unica cosa
   che si sente.

   I nomi non cambiano mai: li chiama `gioca(nome)` da mezzo sito, e
   sono i GESTI, che sono gli stessi da sempre. Cambia di che cosa sono
   fatti. */
const VOCI = {
  /* La scatola esce dallo scaffale: la scheggia del distacco, il
     fruscio che sale mentre scorre fuori, e una nota bassa sotto. */
  esce: function(c, t){
    punta(c, t, .040);
    aria(c, t + .008, 900, 2600, .038, .20, 1.4);
    blip(c, t + .02, N.mi3, .038, .17);
  },
  /* Il coperchio che si alza: tutto in alto e corto, e una nota chiara
     quando e' su. Nessuno alza un coperchio piano. */
  coperchio: function(c, t){
    aria(c, t, 2200, 4600, .042, .14, 1.8);
    blip(c, t + .085, N.la4, .034, .11);
  },
  /* Torna al suo posto: il fruscio al contrario, e il peso alla fine
     invece che all'inizio -- e' il momento in cui tocca il fondo. */
  chiude: function(c, t){
    aria(c, t, 2600, 900, .034, .18, 1.2);
    peso(c, t + .15, 120, .070, .18);
  },
  /* Presa in mano: la scheggia e una nota corta, niente corpo. Si alza
     una scatola, non si posa. */
  presa: function(c, t){
    punta(c, t, .034);
    blip(c, t, N.sol4, .034, .075);
  },
  /* Posata in un cubo. E' il suono piu' pieno dei sei, ed e' giusto:
     e' l'unico che conferma che una cosa e' andata dove volevi. */
  posa: function(c, t){
    peso(c, t, 110, .090, .19);
    blip(c, t + .008, N.do4, .042, .14);
  },
  /* Fermarsi su un mobile scorrendo. Molto sotto gli altri: succede
     spesso, e un suono che succede spesso va tenuto basso o diventa la
     cosa che si sente di piu'. */
  mobile: function(c, t){
    blip(c, t, N.sol3, .020, .065);
  },

  /* --- l'interfaccia ------------------------------------------- */

  /* IL TOCCO. E' il suono piu' frequente del sito e quindi il piu'
     corto e il piu' basso: quarantacinque millisecondi di una nota
     sola, in alto, senza scheggia e senza corpo. Se se ne cambia uno
     solo si cambia questo, e si cambia il carattere di tutto il
     resto. */
  tocco: function(c, t){
    blip(c, t, N.do5, .016, .045);
  },
  /* Un interruttore che si accende: due note che SALGONO. La direzione
     e' l'unica cosa che distingue accendere da spegnere, ed e' anche
     l'unica che si capisce senza averla imparata. */
  acceso: function(c, t){
    blip(c, t, N.mi4, .026, .07);
    blip(c, t + .05, N.la4, .028, .12);
  },
  /* E che si spegne: le stesse due al contrario, un filo sotto --
     spegnere e' il gesto che toglie, non quello che aggiunge. */
  spento: function(c, t){
    blip(c, t, N.la4, .026, .07);
    blip(c, t + .05, N.mi4, .024, .12);
  },
  /* Qualcosa che si apre: la banda sale, corta. */
  apre: function(c, t){
    aria(c, t, 1200, 3400, .030, .13, 1.6);
    blip(c, t + .02, N.re4, .020, .10);
  },
  /* E che si chiude: la banda scende, e si posa su una nota piu' bassa
     di quella con cui si era aperta. */
  serra: function(c, t){
    aria(c, t, 3200, 1100, .030, .12, 1.6);
    blip(c, t + .04, N.la3, .020, .10);
  },
  /* Andata. Tre note della scala che salgono, l'ultima piu' lunga: e'
     l'unico arpeggio del sito, e sta qui perche' e' l'unico momento in
     cui una cosa e' andata a buon fine e vale la pena dirlo. Non e' una
     fanfara -- sono tre note in centosessanta millisecondi. */
  conferma: function(c, t){
    blip(c, t,        N.do4,  .042, .10);
    blip(c, t + .075, N.sol4, .042, .13);
    blip(c, t + .15,  N.do5,  .038, .22);
  },
  /* Un comando che distrugge si e' armato. E' l'unico suono FUORI
     SCALA del sito: 233 Hz e' un semitono sotto la nota della scala
     che gli sta vicino, e a orecchio non torna. E' voluto -- niente e'
     ancora successo, e il suono deve dire "attento", non "fatto". */
  avviso: function(c, t){
    peso(c, t, 155, .055, .15);
    blip(c, t + .01, 233.08, .022, .17, 'triangle');
  },
  /* E ha distrutto: la banda precipita da 2.600 a 300 in quattro
     decimi di secondo, con il peso sotto. E' il suono piu' PIENO
     dell'interfaccia e quello che dura di piu', ed e' voluto: e' anche
     l'unica cosa qui dentro che non torna indietro. Un tonfo dice
     "fatto", questo dice "non torna indietro", che e' esattamente la
     differenza fra togliere una cosa dallo scaffale e cancellarla. */
  via: function(c, t){
    aria(c, t, 2600, 300, .060, .40, .8);
    peso(c, t + .02, 88, .100, .36);
    blip(c, t + .02, N.sol2, .030, .34, 'triangle');
  },
  /* Il sito ha qualcosa da dire (il flash). Una nota alta con la sua
     quinta sotto, tenuta: serve a far alzare gli occhi, non a
     spaventare. */
  nota: function(c, t){
    blip(c, t, N.mi5, .032, .20);
    blip(c, t + .012, N.la4, .016, .26);
  }
};

/* Due volte lo stesso suono a distanza di niente e' un raddoppio che
   si sente come un difetto, non come due cose. */
const TROPPO_PRESTO = 45;

function gioca(nome){
  if (!vol) return;                       // muto: non si accende nemmeno il contesto
  const fn = VOCI[nome];
  if (!fn) return;
  const ora = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  if (ultimo[nome] && ora - ultimo[nome] < TROPPO_PRESTO) return;
  ultimo[nome] = ora;
  const c = assicura();
  if (!c || c.state !== 'running') return;
  try { fn(c, c.currentTime + .005); } catch (e) {}
}

function volume(){ return vol; }

function setVolume(v){
  const n = Math.max(0, Math.min(1, parseFloat(v)));
  vol = isFinite(n) ? n : VOL_DEF;
  if (master) master.gain.value = vol;
  scrivi();
}

/* Il primo gesto della pagina sblocca l'audio: il browser tiene il
   contesto sospeso finche' non ne arriva uno, e senza questo il primo
   suono chiesto sarebbe silenzioso anche a volume alto. Si ascolta in
   cattura e una volta sola. */
function sblocca(){
  const via = function(){
    ['pointerdown', 'keydown', 'touchstart'].forEach(function(e){
      document.removeEventListener(e, via, true);
    });
    if (vol) assicura();
  };
  ['pointerdown', 'keydown', 'touchstart'].forEach(function(e){
    document.addEventListener(e, via, true);
  });
}
sblocca();

/* L'INTERRUTTORE NEL PROFILO.

   Il volume vero sta nel pannello della libreria, accanto a luce e
   faretti, perche' li' e' la stessa domanda -- com'e' questo posto.
   Nel profilo invece sta la domanda che ci si fa da fermi: lo voglio o
   no. Sono due comandi sullo stesso stato, e restano d'accordo perche'
   leggono tutti e due `volume()` quando si aprono.

   Spegnendo si riparte da dove si era: `prima` tiene l'ultimo volume
   udibile, se no riaccendere vorrebbe dire ritrovarsi al valore di
   fabbrica ogni volta. */
let prima = vol || VOL_DEF;

function disegnaInterruttore(){
  const b = document.getElementById('pro-suono');
  if (!b) return;
  const su = vol > 0;
  b.setAttribute('aria-pressed', su ? 'true' : 'false');
  b.textContent = (typeof T === 'function') ? T(su ? 'pro.suonoOn' : 'pro.suonoOff')
                                           : (su ? 'acceso' : 'spento');
}

function montaInterruttore(){
  const b = document.getElementById('pro-suono');
  if (!b) return;
  disegnaInterruttore();
  b.addEventListener('click', function(){
    if (vol > 0){ prima = vol; setVolume(0); }
    else {
      setVolume(prima || VOL_DEF);
      /* Riaccendendo il suono va SUONATO: il clic e' gia' passato con
         il volume ancora a zero, quindi senza questo l'unico gesto del
         sito che non si sente sarebbe proprio quello che riaccende il
         suono. */
      gioca('acceso');
    }
    disegnaInterruttore();
  });
  if (typeof I18N !== 'undefined' && I18N.suCambio) I18N.suCambio(disegnaInterruttore);
}

if (document.readyState === 'loading')
  document.addEventListener('DOMContentLoaded', montaInterruttore);
else montaInterruttore();

return { gioca: gioca, volume: volume, setVolume: setVolume,
         rinfresca: disegnaInterruttore };
})();
