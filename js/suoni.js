/* ===============================================================
   IL SUONO

   Il sito non carica una sola risorsa esterna, e per il suono vale
   quello che vale per le superfici: legno, cartone, parquet e facce
   dei dadi sono DISEGNATI da codice su canvas, non scaricati. Qui e'
   lo stesso -- non c'e' nessun file audio nel repo, e non ce ne
   sara' nessuno: i suoni si SINTETIZZANO con Web Audio, un rumore
   filtrato e due sinusoidi per volta.

   IL MATERIALE E' IL CARTONE, e non e' un dettaglio di gusto: e' la
   stessa scelta della pelle del sito. Una plancia punzonata non
   risuona -- fa un colpo secco e finisce -- e il suo suono
   caratteristico e' uno solo, il PEZZO CHE SI STACCA. Tutta
   l'interfaccia e' costruita su quello.

   Non e' solo coerenza. Una manciata di .mp3 anche corti pesa piu' di
   tutto il resto del sito messo insieme, e a rete staccata la libreria
   deve continuare a funzionare -- compreso il tonfo della scatola che
   torna sullo scaffale.

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
let master = null;
let rumore = null;                 // un secondo di rumore bianco, riusato
let vol = leggi();
let spento = false;                // Web Audio non c'e': si smette di provarci
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

function scrivi(){
  try { localStorage.setItem(CHIAVE, String(vol)); } catch (e) {}
}

/* Il contesto nasce al primo suono chiesto, non al caricamento: chi
   apre il sito per guardare la propria libreria e non tocca niente non
   ha nessun motivo di avere una scheda audio accesa. */
function assicura(){
  if (spento) return null;
  if (!ctx){
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC){ spento = true; return null; }
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = vol;
      /* UN FILTRO SOLO PER TUTTI, che e' il materiale.

         Il cartone in alto e' SORDO: non ha il vetro di un clic di
         sistema ne' lo squillo del metallo. Tagliare li' una volta
         sola, sull'uscita, fa piu' per la coerenza che tarare dieci
         volte lo stesso passabanda -- ed e' la stessa idea del
         `comune()` delle geometrie e del rumore bianco riusato.

         6.500 Hz e' il punto in cui una scheggia di rumore smette di
         sembrare vetro e comincia a sembrare fibra. */
      const sordina = ctx.createBiquadFilter();
      sordina.type = 'lowpass';
      sordina.frequency.value = 6500;
      sordina.Q.value = .7;
      master.connect(sordina);
      sordina.connect(ctx.destination);
    } catch (e){ spento = true; ctx = null; return null; }
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

/* Una busta che parte subito e si spegne: `exponentialRamp` non
   arriva mai a zero, quindi si scende a un valore minuscolo e poi si
   ferma il nodo. */
function busta(g, t, picco, attacco, durata){
  g.gain.setValueAtTime(.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(.0002, picco), t + attacco);
  g.gain.exponentialRampToValueAtTime(.0001, t + durata);
}

/* IL CARTONE NON E' LEGNO, E NON SUONA COME IL LEGNO.

   I mattoni di prima erano tarati su una libreria di rovere: un colpo
   con un corpo di sinusoide che RISUONA, uno strofinio caldo, una nota
   morbida dentro un passabasso. Su una plancia di cartone punzonato non
   c'e' niente che risuoni. Il cartone e' SMORZATO -- fa un colpo secco
   e finisce li' -- e quello che si sente davvero, su una plancia, e'
   uno solo: il PEZZO CHE SI STACCA.

   Quindi i mattoni sono quattro e non tre:

     batti     il colpo secco: contatto, e un corpo che muore subito
     sfrega    carta che scorre su carta, non cartone su legno
     scatto    IL PUNZONE: il pezzo che esce dalla fustella
     strappo   il cartone che cede: quello che distrugge

   e tutti passano da un filtro comune che toglie il vetro dall'acuto,
   perche' il cartone in alto e' sordo.
   =============================================================== */

/* IL COLPO SECCO. Due cose insieme, come prima, ma con le proporzioni
   rovesciate: il rumore -- il CONTATTO -- e' la parte che si sente, e
   la sinusoide sotto e' solo il tonfo del materiale, tenuta corta
   perche' un foglio di cartone non ha una cassa armonica.

   Il passabanda sta piu' in alto e piu' stretto di prima: un colpo su
   cartone e' piu' vicino a un battito di dita su una scatola che a una
   nocca su una tavola. */
function batti(c, t, corpo, forza, durata){
  const s = c.createBufferSource();
  s.buffer = bufRumore(c);
  s.playbackRate.value = .9 + Math.random() * .3;
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = corpo * 14;
  bp.Q.value = .8;
  const gn = c.createGain();
  busta(gn, t, forza * .8, .0015, .028);
  s.connect(bp); bp.connect(gn); gn.connect(master);
  s.start(t); s.stop(t + .05);

  /* Il corpo dura la META' di quanto durava: e' la differenza fra un
     ripiano di rovere che continua a vibrare e una scatola che no. */
  const o = c.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(corpo * 1.35, t);
  o.frequency.exponentialRampToValueAtTime(corpo * .82, t + durata * .5);
  const go = c.createGain();
  busta(go, t, forza * .55, .002, durata * .55);
  o.connect(go); go.connect(master);
  o.start(t); o.stop(t + durata + .02);
}

/* CARTA CHE SCORRE SU CARTA. Era uno strofinio caldo dentro un
   passabanda largo; qui la banda e' piu' alta e piu' stretta, e sopra
   c'e' un filo di frizione in acuto -- e' quella la differenza fra il
   cartoncino e il legno. Anche questo piu' corto: la carta scorre e si
   ferma, non slitta. */
function sfrega(c, t, f0, f1, forza, durata){
  const s = c.createBufferSource();
  s.buffer = bufRumore(c);
  s.playbackRate.value = .95 + Math.random() * .25;
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(f0, t);
  bp.frequency.exponentialRampToValueAtTime(f1, t + durata);
  bp.Q.value = 1.6;
  const gn = c.createGain();
  busta(gn, t, forza, durata * .22, durata);
  s.connect(bp); bp.connect(gn); gn.connect(master);
  s.start(t); s.stop(t + durata + .02);
}

/* IL PUNZONE, che e' il suono di questo sito.

   Un pezzo che esce dalla fustella fa due cose in venti millisecondi:
   la fibra cede -- una scheggia di rumore altissima e cortissima -- e
   il pezzo si stacca, che e' un piccolo scatto intonato che scende.
   Messi insieme fanno il "toc" secco di una plancia nuova.

   E' il mattone piu' usato dell'interfaccia: e' il tocco, e' meta'
   della conferma, ed e' l'inizio di quasi tutto quello che succede
   sulla scena. Per questo e' anche il piu' corto -- trenta millisecondi
   in tutto -- e il piu' silenzioso a parita' di forza. */
function scatto(c, t, alt, forza){
  const s = c.createBufferSource();
  s.buffer = bufRumore(c);
  s.playbackRate.value = 1.1 + Math.random() * .3;
  const hp = c.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = alt * 2.2;
  const gn = c.createGain();
  busta(gn, t, forza * .7, .001, .012);
  s.connect(hp); hp.connect(gn); gn.connect(master);
  s.start(t); s.stop(t + .03);

  const o = c.createOscillator();
  o.type = 'triangle';
  o.frequency.setValueAtTime(alt * 1.5, t);
  o.frequency.exponentialRampToValueAtTime(alt * .7, t + .02);
  const go = c.createGain();
  busta(go, t, forza, .001, .022);
  o.connect(go); go.connect(master);
  o.start(t); o.stop(t + .04);
}

/* IL CARTONE CHE CEDE. Serve a una cosa sola -- quello che distrugge --
   e non e' un colpo: e' un rumore che DURA e che sale, con la banda che
   si apre mentre la fibra si apre. Un tonfo dice "fatto"; uno strappo
   dice "non torna indietro", che e' esattamente la differenza fra
   togliere una cosa dallo scaffale e cancellarla. */
function strappo(c, t, forza, durata){
  const s = c.createBufferSource();
  s.buffer = bufRumore(c);
  s.playbackRate.value = .55 + Math.random() * .15;
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(320, t);
  bp.frequency.exponentialRampToValueAtTime(1800, t + durata);
  bp.Q.value = .7;
  const gn = c.createGain();
  /* Non una busta liscia: lo strappo e' fatto di fibre che cedono una
     dopo l'altra, e a orecchio la differenza fra un fruscio e uno
     strappo e' tutta li'. Tre gradini bastano. */
  gn.gain.setValueAtTime(.0001, t);
  gn.gain.exponentialRampToValueAtTime(forza, t + .006);
  gn.gain.exponentialRampToValueAtTime(forza * .45, t + durata * .35);
  gn.gain.exponentialRampToValueAtTime(forza * .8, t + durata * .55);
  gn.gain.exponentialRampToValueAtTime(.0001, t + durata);
  s.connect(bp); bp.connect(gn); gn.connect(master);
  s.start(t); s.stop(t + durata + .02);
}

/* LA NOTA, che qui e' un TIMBRO e non un canto.

   Serve dove non c'e' un oggetto che ne tocca un altro ma un cambio di
   stato, e a dirne il verso e' l'altezza: sale accendendo, scende
   spegnendo. Era una nota morbida e lunga; adesso e' meta' piu' corta e
   passa da un passabasso piu' chiuso, cosi' sta sotto al punzone invece
   di cantarci sopra. Su una plancia niente canta. */
function tono(c, t, f0, f1, forza, durata){
  const o = c.createOscillator();
  o.type = 'triangle';
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(f1, t + durata * .7);
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 1700;
  const g = c.createGain();
  busta(g, t, forza, .004, durata);
  o.connect(lp); lp.connect(g); g.connect(master);
  o.start(t); o.stop(t + durata + .02);
}

/* I SUONI.

   I primi sei sono la SCENA: i sei momenti in cui si tocca qualcosa di
   fisico. Gli altri sono l'INTERFACCIA, e stanno tutti piu' in basso --
   un tocco succede cento volte piu' spesso di una scatola che si apre,
   e quello che si sente spesso va tenuto sotto o diventa l'unica cosa
   che si sente.

   I nomi non sono cambiati: li chiama `gioca(nome)` da mezzo sito, e
   sono i GESTI, che sono gli stessi. E' cambiato di che materiale sono
   fatti. */
const VOCI = {
  /* La scatola esce dallo scaffale: si stacca, e poi striscia. Il
     distacco adesso e' un punzone e non un colpo -- e' lo stesso gesto
     di un pezzo che esce dalla plancia. */
  esce: function(c, t){
    scatto(c, t, 300, .10);
    sfrega(c, t + .015, 1400, 620, .13, .26);
  },
  /* Il coperchio che si alza. Cartone su cartone: tutto in alto, e
     corto -- nessuno alza un coperchio piano. */
  coperchio: function(c, t){
    sfrega(c, t, 3000, 1900, .11, .13);
    scatto(c, t + .10, 520, .07);
  },
  /* Torna al suo posto: lo strofinio al contrario, e il tonfo alla
     fine invece che all'inizio -- e' il momento in cui tocca il fondo
     del cubo. Smorzato, che e' come tocca il cartone. */
  chiude: function(c, t){
    sfrega(c, t, 700, 1100, .11, .20);
    batti(c, t + .19, 140, .18, .10);
  },
  /* Presa in mano: solo il distacco, niente corpo. Si alza una
     scatola, non si posa. */
  presa: function(c, t){
    scatto(c, t, 380, .055);
  },
  /* Posata in un cubo. E' il suono piu' pieno dei sei, ed e' giusto:
     e' l'unico che conferma che una cosa e' andata dove volevi. */
  posa: function(c, t){
    batti(c, t, 115, .26, .13);
    sfrega(c, t + .01, 900, 500, .09, .10);
  },
  /* Fermarsi su un mobile scorrendo. Molto sotto gli altri: succede
     spesso, e un suono che succede spesso va tenuto basso o diventa
     la cosa che si sente di piu'. */
  mobile: function(c, t){
    batti(c, t, 90, .09, .08);
  },

  /* --- l'interfaccia ------------------------------------------- */

  /* IL TOCCO E' IL PUNZONE. E' il suono piu' frequente del sito e il
     piu' corto: trenta millisecondi di fibra che cede. E' anche quello
     che da' al sito il suo materiale -- se se ne cambia uno solo, si
     cambia questo, e si cambia tutto il resto con lui. */
  tocco: function(c, t){
    /* MISURATO, non stimato. A forza .05 il punzone usciva a 0,093 di
       picco -- piu' forte del mobile su cui ci si ferma, dell'avviso e
       del coperchio -- e la regola qui sopra dice il contrario. Il
       punzone e' corto e alto, e a parita' di numero si sente molto piu'
       di un tonfo: la forza va letta sull'uscita, non sulla carta. */
    scatto(c, t, 620, .022);
  },
  /* Un interruttore che si accende: il punzone piu' un timbro che
     SALE. L'altezza e' quello che dice il verso, e senza si
     sentirebbero due accensioni identiche per acceso e spento. */
  acceso: function(c, t){
    scatto(c, t, 700, .022);
    tono(c, t + .006, 660, 990, .04, .07);
  },
  /* E che si spegne: la stessa cosa al contrario, un filo sotto --
     spegnere e' il gesto che toglie, non quello che aggiunge. */
  spento: function(c, t){
    scatto(c, t, 480, .022);
    tono(c, t + .006, 740, 460, .035, .08);
  },
  /* Qualcosa che si apre: carta che scorre, corta. */
  apre: function(c, t){
    sfrega(c, t, 1300, 2400, .07, .11);
  },
  /* E che si chiude: al contrario, e alla fine si posa. */
  serra: function(c, t){
    sfrega(c, t, 2200, 1100, .065, .10);
    scatto(c, t + .085, 340, .05);
  },
  /* Andata: due punzoni che salgono, come due pezzi che entrano nel
     loro posto. Non e' una fanfara -- e' il rumore di una cosa che si
     incastra dove doveva. */
  conferma: function(c, t){
    scatto(c, t, 460, .07);
    scatto(c, t + .07, 720, .06);
    tono(c, t + .07, 760, 1140, .04, .09);
  },
  /* Un comando che distrugge si e' armato: un colpo sordo e basso, che
     e' come suona "attento". Nessun timbro: non c'e' niente da
     festeggiare, e niente e' ancora successo. */
  avviso: function(c, t){
    batti(c, t, 130, .11, .13);
  },
  /* E ha distrutto: il cartone che cede. E' l'unico suono del sito che
     DURA, ed e' voluto -- e' anche l'unica cosa che non torna
     indietro. */
  via: function(c, t){
    strappo(c, t, .13, .30);
    batti(c, t + .26, 80, .10, .12);
  },
  /* Il sito ha qualcosa da dire (il flash). Un timbro solo: serve a
     far alzare gli occhi, non a spaventare. */
  nota: function(c, t){
    tono(c, t, 820, 700, .05, .11);
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
