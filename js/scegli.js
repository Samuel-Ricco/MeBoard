/* ===============================================================
   SCEGLIERE UN COLORE E SCEGLIERE UN GIORNO

   Due finestrelle, ed esistono per lo stesso motivo: erano le uniche
   due cose del sito disegnate da qualcun altro.

   `<input type="color">` apre il selettore del sistema operativo --
   su Windows un rettangolo grigio con gli angoli tondi e i cursori
   azzurri -- e `<input type="date">` apre il calendario di Chrome, con
   il suo carattere, le sue ombre sfumate e il suo azzurro. Su una
   plancia di cartone punzonato sono due finestre di un altro
   programma: non c'e' niente di rotto, ma tutto quello che c'e'
   attorno e' stato disegnato e loro no.

   COME SI AGGANCIANO. Il campo vero RESTA, e diventa `type="hidden"`:
   tiene il valore, tiene la sua classe, e chi lo ascoltava continua ad
   ascoltarlo -- questo file gli manda `input` mentre si sceglie e
   `change` quando si chiude, che e' esattamente quello che mandava il
   selettore del sistema. Accanto c'e' un pulsante vero, che e' quello
   che si vede.

   Cosi' nessuno dei tre posti che avevano una ruota -- le tinte della
   stanza, il meeple del profilo, l'accento della tavolozza -- ha
   dovuto cambiare una riga di logica: hanno cambiato il markup che
   disegnano, e basta.

   E l'aggancio e' UNO SOLO, delegato sul documento. I pulsanti si
   rifanno di continuo (ogni scelta ridisegna la sua fila), e attaccarne
   uno per pulsante vorrebbe dire rimetterli tutti ogni volta. E' la
   stessa regola gia' scritta per l'elenco della collezione e per il
   tavolo di una partita.

   `js/tema.js` sta nel `<head>` e disegna la sua ruota PRIMA che questo
   file esista: e' un altro motivo per cui qui non c'e' niente da
   chiamare per costruire un pulsante. Un pulsante e' markup; questo
   file serve solo quando lo si preme.
   =============================================================== */
const SCEGLI = (function(){
'use strict';

/* --- i conti sui colori ------------------------------------------
   HSL e non RGB, e non e' un gusto: una tavolozza si sfoglia per
   TINTA, e la tinta in RGB non e' un numero -- e' il rapporto fra
   tre. In HSL e' un giro, e un giro si puo' mettere in fila. */

function due(n){
  n = Math.max(0, Math.min(255, Math.round(n)));
  return (n < 16 ? '0' : '') + n.toString(16);
}

function daHsl(h, s, l){
  h = ((h % 360) + 360) % 360; s /= 100; l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60)       { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else              { r = c; b = x; }
  return '#' + due((r + m) * 255) + due((g + m) * 255) + due((b + m) * 255);
}

function aHsl(hex){
  const t = String(hex || '').replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(t)) return { h: 0, s: 0, l: 50 };
  const r = parseInt(t.slice(0, 2), 16) / 255;
  const g = parseInt(t.slice(2, 4), 16) / 255;
  const b = parseInt(t.slice(4, 6), 16) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d){
    if (mx === r) h = 60 * (((g - b) / d) % 6);
    else if (mx === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  const l = (mx + mn) / 2;
  const s = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
  return { h: ((h % 360) + 360) % 360, s: Math.round(s * 100), l: Math.round(l * 100) };
}

const ESA = /^#[0-9a-fA-F]{6}$/;

/* La carta dei colori: dodici tinte a trenta gradi l'una dall'altra,
   piu' il neutro. Non e' una ruota continua e non deve esserlo -- su
   una plancia i colori sono FUSTELLATI, sono pezzi, e dodici tinte
   sono quello che ci sta in una riga senza diventare una striscia di
   pixel da centrare col dito. Il colore esatto, se uno ce l'ha, si
   scrive in esadecimale li' sotto. */
const TINTE = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
/* La griglia della tinta scelta: sei saturazioni per cinque
   chiarezze. Trenta pezzi, che e' quanto se ne guarda in un colpo
   d'occhio -- oltre si comincia a cercare invece che a vedere. */
const SATURA = [100, 82, 64, 46, 28, 12];
const CHIARO = [86, 70, 54, 38, 22];

/* --- la finestrella ---------------------------------------------- */

let pop = null;          // il pannello, uno solo e riusato
let aperto = null;       // { tipo, ancora, campo, ... } o niente
const T_ = function(k){ return (typeof TP === 'function') ? TP(k) : k; };

function fai(){
  if (pop) return pop;
  pop = document.createElement('div');
  pop.id = 'scegli';
  pop.className = 'scegli';
  pop.setAttribute('role', 'dialog');
  pop.hidden = true;
  document.body.appendChild(pop);
  return pop;
}

/* Si apre SOTTO al suo pulsante e allineata al suo lato, come ogni
   altra finestrella del sito, e se sotto non ci sta va sopra: e' un
   pannello ancorato, non una schermata. Le misure si prendono dopo
   averlo riempito -- prima non ha ancora un'altezza. */
function posiziona(ancora){
  const r = ancora.getBoundingClientRect();
  const w = pop.offsetWidth, h = pop.offsetHeight;
  let x = r.left;
  let y = r.bottom + 8;
  if (x + w > window.innerWidth - 8) x = window.innerWidth - 8 - w;
  if (x < 8) x = 8;
  if (y + h > window.innerHeight - 8){
    const sopra = r.top - 8 - h;
    y = sopra > 8 ? sopra : Math.max(8, window.innerHeight - 8 - h);
  }
  pop.style.left = Math.round(x) + 'px';
  pop.style.top = Math.round(y) + 'px';
}

function chiudi(annulla){
  if (!aperto) return;
  const a = aperto;
  aperto = null;
  pop.hidden = true;
  pop.innerHTML = '';
  document.removeEventListener('pointerdown', fuori, true);
  document.removeEventListener('keydown', tasto, true);
  window.removeEventListener('resize', suResize);
  if (a.ancora){
    a.ancora.setAttribute('aria-expanded', 'false');
    try { a.ancora.focus(); } catch(e){}
  }
  /* Il `change` si manda alla CHIUSURA e non a ogni tocco, ed e'
     quello che faceva anche il selettore del sistema: dietro a un
     `change` c'e' una scrittura sul profilo, e salvarne una per ogni
     pezzo toccato vorrebbe dire una scrittura al secondo. */
  if (!annulla && a.campo && a.cambiato) manda(a.campo, 'change');
  if (typeof SUONI !== 'undefined') SUONI.gioca('serra');
}

function fuori(e){
  if (!aperto) return;
  if (pop.contains(e.target)) return;
  if (aperto.ancora && aperto.ancora.contains(e.target)) return;
  chiudi();
}

function tasto(e){
  if (!aperto) return;
  if (e.key === 'Escape'){ e.stopPropagation(); e.preventDefault(); chiudi(); }
}

function suResize(){ if (aperto) posiziona(aperto.ancora); }

function apri(ancora, riempi){
  if (aperto && aperto.ancora === ancora){ chiudi(); return; }
  chiudi();
  fai();
  pop.innerHTML = '';
  aperto = { ancora: ancora, campo: null, cambiato: false };
  riempi();
  pop.hidden = false;
  posiziona(ancora);
  ancora.setAttribute('aria-expanded', 'true');
  document.addEventListener('pointerdown', fuori, true);
  document.addEventListener('keydown', tasto, true);
  window.addEventListener('resize', suResize);
  if (typeof SUONI !== 'undefined') SUONI.gioca('apre');
  const primo = pop.querySelector('button, input');
  if (primo) try { primo.focus(); } catch(e){}
}

/* Il campo nascosto e' quello vero: qui si scrive dentro e si avvisa
   chi lo ascoltava. `bubbles` serve -- tutti e tre i posti ascoltano
   sul contenitore, non sul campo. */
function manda(campo, tipo){
  campo.dispatchEvent(new Event(tipo, { bubbles: true }));
}

/* ===============================================================
   IL COLORE
   =============================================================== */

function apriColore(bottone){
  const campo = compagno(bottone);
  if (!campo) return;

  apri(bottone, function(){
    let hsl = aHsl(campo.value || '#808080');
    aperto.campo = campo;

    pop.classList.add('scegli-colore');
    pop.classList.remove('scegli-data');

    const fila = document.createElement('div');
    fila.className = 'sc-tinte';
    const griglia = document.createElement('div');
    griglia.className = 'sc-griglia';
    const piede = document.createElement('div');
    piede.className = 'sc-piede';
    const prova = document.createElement('span');
    prova.className = 'sc-prova';
    const esa = document.createElement('input');
    esa.type = 'text';
    esa.className = 'sc-esa';
    esa.maxLength = 7;
    esa.spellcheck = false;
    esa.setAttribute('autocomplete', 'off');
    esa.setAttribute('aria-label', T_('scegli.esa'));
    piede.appendChild(prova);
    piede.appendChild(esa);

    const scrivi = function(hex, dallEsa){
      campo.value = hex;
      bottone.style.backgroundColor = hex;
      bottone.classList.add('on');
      prova.style.background = hex;
      if (!dallEsa) esa.value = hex;
      aperto.cambiato = true;
      /* `input` a ogni pezzo toccato: qui si VEDE il sito cambiare
         colore mentre si sceglie, ed e' meta' del senso di avere una
         tavolozza aperta davanti. E' la stessa scelta del meeple. */
      manda(campo, 'input');
    };

    const rifaiGriglia = function(){
      griglia.innerHTML = '';
      CHIARO.forEach(function(l){
        SATURA.forEach(function(s){
          const hex = daHsl(hsl.h, s, l);
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'sc-cella';
          b.style.background = hex;
          b.title = hex;
          b.setAttribute('aria-label', hex);
          b.addEventListener('click', function(){
            hsl = aHsl(hex);
            scrivi(hex);
            segna();
            if (typeof SUONI !== 'undefined') SUONI.gioca('tocco');
          });
          griglia.appendChild(b);
        });
      });
      segna();
    };

    /* Quale pezzo e' quello scelto: si confronta il COLORE e non la
       posizione, cosi' un colore che arriva da fuori -- scritto in
       esadecimale, o salvato da prima -- si accende lo stesso se sta
       nella carta. */
    const segna = function(){
      const ora = (campo.value || '').toLowerCase();
      Array.prototype.forEach.call(griglia.children, function(b){
        b.classList.toggle('on', (b.title || '').toLowerCase() === ora);
      });
      Array.prototype.forEach.call(fila.children, function(b){
        const h = b.getAttribute('data-h');
        b.classList.toggle('on',
          h === 'neutro' ? hsl.s <= 6 : (hsl.s > 6 && parseInt(h, 10) === arrotonda(hsl.h)));
      });
    };

    const tinta = function(h, etichetta){
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'sc-tinta';
      b.setAttribute('data-h', h === null ? 'neutro' : String(h));
      b.style.background = h === null ? daHsl(0, 0, 62) : daHsl(h, 78, 52);
      b.title = etichetta;
      b.setAttribute('aria-label', etichetta);
      b.addEventListener('click', function(){
        /* Cambiare tinta non cambia quanto e' carico ne' quanto e'
           chiaro: si gira la ruota, non si riparte da capo. Se pero'
           si veniva dal neutro una saturazione non ce n'era, e
           ripartire da zero vorrebbe dire restare sul grigio. */
        if (h === null){ hsl.s = 0; }
        else { hsl.h = h; if (hsl.s <= 6) hsl.s = 64; }
        rifaiGriglia();
        if (typeof SUONI !== 'undefined') SUONI.gioca('tocco');
      });
      return b;
    };

    TINTE.forEach(function(h){ fila.appendChild(tinta(h, daHsl(h, 78, 52))); });
    fila.appendChild(tinta(null, T_('scegli.neutro')));

    esa.value = campo.value || '';
    esa.addEventListener('input', function(){
      let v = esa.value.trim();
      if (v && v.charAt(0) !== '#') v = '#' + v;
      if (!ESA.test(v)) return;              // mentre si scrive non e' ancora un colore
      hsl = aHsl(v);
      scrivi(v.toLowerCase(), true);
      rifaiGriglia();
    });
    esa.addEventListener('keydown', function(e){
      e.stopPropagation();                   // le cifre non vanno alle scorciatoie della scena
      if (e.key === 'Enter'){ e.preventDefault(); chiudi(); }
    });

    prova.style.background = campo.value || '';

    pop.appendChild(fila);
    pop.appendChild(griglia);
    pop.appendChild(piede);
    pop.setAttribute('aria-label', T_('scegli.colore'));
    rifaiGriglia();
  });
}

/* La tinta piu' vicina fra le dodici: serve solo ad accendere il
   pezzo giusto nella fila, non a cambiare il colore. */
function arrotonda(h){
  return (Math.round(h / 30) * 30) % 360;
}

/* ===============================================================
   IL GIORNO
   =============================================================== */

function pad(n){ return (n < 10 ? '0' : '') + n; }
function isoDi(a, m, g){ return a + '-' + pad(m + 1) + '-' + pad(g); }

function oggiIso(){
  const d = new Date();
  return isoDi(d.getFullYear(), d.getMonth(), d.getDate());
}

function mesi(){ return T_('cal.mesi').split(','); }

/* La data scritta per esteso, che e' come uno se la dice: "4 settembre
   2026" e non "04/09/2026". I mesi vengono dal dizionario, quindi in
   inglese la stessa funzione scrive "4 September 2026". */
function perEsteso(iso){
  const p = String(iso || '').split('-');
  if (p.length !== 3) return '';
  return parseInt(p[2], 10) + ' ' + (mesi()[parseInt(p[1], 10) - 1] || '') + ' ' + p[0];
}

/* Sul PULSANTE il mese si abbrevia. Il campo della data sta in mezza
   riga accanto alla durata, e "4 settembre 2026" ci va a capo: due
   righe dentro un campo alto una riga, accanto a un campo che resta
   alto una riga. Tre lettere e' la stessa abbreviazione che il grafico
   dei mesi usa gia'. Per esteso resta nel `title` e nell'etichetta per
   chi legge con la voce, dove lo spazio non manca. */
function breve(iso){
  const p = String(iso || '').split('-');
  if (p.length !== 3) return '';
  const m = mesi()[parseInt(p[1], 10) - 1] || '';
  return parseInt(p[2], 10) + ' ' + m.slice(0, 3) + ' ' + p[0];
}

/* Il pulsante mostra quello che il campo nascosto tiene. Sta qui e non
   in chi lo usa perche' il campo si riempie anche da fuori -- aprendo
   una partita gia' segnata -- e la scritta deve seguirlo comunque. */
function mostraData(chi){
  const campo = (typeof chi === 'string') ? document.getElementById(chi) : chi;
  if (!campo) return;
  const b = document.querySelector('button[data-quando="' + campo.id + '"]');
  if (!b) return;
  const t = b.querySelector('.sc-quando');
  if (!t) return;
  const v = campo.value;
  t.textContent = v ? breve(v) : T_('scegli.senzaData');
  b.title = v ? perEsteso(v) : T_('scegli.data');
  b.classList.toggle('vuota', !v);
}

function apriData(bottone){
  const campo = document.getElementById(bottone.getAttribute('data-quando'));
  if (!campo) return;

  apri(bottone, function(){
    aperto.campo = campo;
    pop.classList.add('scegli-data');
    pop.classList.remove('scegli-colore');

    const base = ESA_DATA.test(campo.value) ? campo.value : oggiIso();
    let a = parseInt(base.slice(0, 4), 10);
    let m = parseInt(base.slice(5, 7), 10) - 1;

    const testa = document.createElement('div');
    testa.className = 'sc-testa';
    const titolo = document.createElement('b');
    const prima = document.createElement('button');
    const dopo = document.createElement('button');
    prima.type = dopo.type = 'button';
    prima.className = dopo.className = 'sc-mese';
    prima.innerHTML = '&lsaquo;'; dopo.innerHTML = '&rsaquo;';
    prima.setAttribute('aria-label', T_('cal.prima'));
    dopo.setAttribute('aria-label', T_('cal.dopo'));
    testa.appendChild(prima); testa.appendChild(titolo); testa.appendChild(dopo);

    const sett = document.createElement('div');
    sett.className = 'sc-sett';
    T_('cal.giorni').split(',').forEach(function(g){
      const s = document.createElement('span');
      s.textContent = g.charAt(0).toUpperCase();
      s.title = g;
      sett.appendChild(s);
    });

    const griglia = document.createElement('div');
    griglia.className = 'sc-giorni';

    const piede = document.createElement('div');
    piede.className = 'sc-piede';
    const oggiB = document.createElement('button');
    oggiB.type = 'button'; oggiB.className = 'secondario';
    oggiB.textContent = T_('cal.oggi');
    const vuotaB = document.createElement('button');
    vuotaB.type = 'button'; vuotaB.className = 'secondario';
    vuotaB.textContent = T_('scegli.svuota');
    piede.appendChild(oggiB); piede.appendChild(vuotaB);

    const scegliGiorno = function(iso){
      campo.value = iso || '';
      aperto.cambiato = true;
      mostraData(campo);
      manda(campo, 'input');
      if (typeof SUONI !== 'undefined') SUONI.gioca('tocco');
      chiudi();
    };

    const disegna = function(){
      titolo.textContent = (mesi()[m] || '') + ' ' + a;
      griglia.innerHTML = '';
      // la settimana comincia di lunedi': `getDay()` parte dalla domenica
      const vuoti = (new Date(a, m, 1).getDay() + 6) % 7;
      const quanti = new Date(a, m + 1, 0).getDate();
      const oggi = oggiIso();
      for (let i = 0; i < vuoti; i++){
        const s = document.createElement('span');
        s.className = 'sc-g vuoto';
        griglia.appendChild(s);
      }
      for (let g = 1; g <= quanti; g++){
        const iso = isoDi(a, m, g);
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'sc-g' + (iso === oggi ? ' oggi' : '') +
                      (iso === campo.value ? ' scelto' : '');
        b.textContent = g;
        b.setAttribute('aria-label', perEsteso(iso));
        if (iso === campo.value) b.setAttribute('aria-current', 'date');
        b.addEventListener('click', function(){ scegliGiorno(iso); });
        griglia.appendChild(b);
      }
    };

    const sposta = function(d){
      m += d;
      if (m < 0){ m = 11; a--; }
      else if (m > 11){ m = 0; a++; }
      disegna();
      if (typeof SUONI !== 'undefined') SUONI.gioca('tocco');
    };
    prima.addEventListener('click', function(){ sposta(-1); });
    dopo.addEventListener('click', function(){ sposta(1); });
    oggiB.addEventListener('click', function(){ scegliGiorno(oggiIso()); });
    vuotaB.addEventListener('click', function(){ scegliGiorno(''); });

    pop.appendChild(testa);
    pop.appendChild(sett);
    pop.appendChild(griglia);
    pop.appendChild(piede);
    pop.setAttribute('aria-label', T_('scegli.data'));
    disegna();
  });
}

const ESA_DATA = /^\d{4}-\d{2}-\d{2}$/;

/* --- l'aggancio, uno solo -------------------------------------- */

/* Il campo nascosto e' il fratello del pulsante. Si cerca dentro al
   contenitore e non per id: le ruote sono tante e si rifanno di
   continuo, e dare un id a ognuna vorrebbe dire inventarne uno per
   ogni fila di tinte del sito. Il giorno invece l'id ce l'ha, perche'
   e' uno solo e chi lo legge lo legge per nome. */
function compagno(bottone){
  const casa = bottone.parentElement;
  return casa ? casa.querySelector('input.ruota') : null;
}

document.addEventListener('click', function(e){
  const r = e.target.closest && e.target.closest('button.ruota');
  if (r){ e.preventDefault(); apriColore(r); return; }
  const d = e.target.closest && e.target.closest('button[data-quando]');
  if (d){ e.preventDefault(); apriData(d); }
});

/* Cambiando lingua cambiano i mesi, e la data scritta per esteso e'
   fatta di un mese: senza questo resterebbe "4 settembre 2026" in
   mezzo a una pagina in inglese. */
if (typeof I18N !== 'undefined' && I18N.suCambio){
  I18N.suCambio(function(){
    Array.prototype.forEach.call(
      document.querySelectorAll('button[data-quando]'),
      function(b){ mostraData(b.getAttribute('data-quando')); });
    if (aperto) chiudi();
  });
}

/* Le date scritte sui pulsanti all'apertura della pagina. Il campo si
   riempie quando si apre una partita, ma un pulsante che nasce senza
   scritta e' un pulsante vuoto per un fotogramma, e si vede. */
function tuttiIQuando(){
  Array.prototype.forEach.call(
    document.querySelectorAll('button[data-quando]'),
    function(b){ mostraData(b.getAttribute('data-quando')); });
}

if (document.readyState === 'loading')
  document.addEventListener('DOMContentLoaded', tuttiIQuando);
else tuttiIQuando();

function aperta(){ return !!aperto; }

return {
  mostraData: mostraData,
  perEsteso: perEsteso,
  aperta: aperta,
  chiudi: chiudi
};
})();
