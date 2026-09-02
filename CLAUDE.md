# MeBoard — note di progetto

Riscrittura **mobile-first** di `MOBILE_dado-e-trap`. Quella era nata sito web e poi
impacchettata; questa parte dal telefono. Libreria di giochi da tavolo in 3D: lo scaffale
e' il prodotto, quindi le scatole devono essere belle **e** scorrere lisce.

```
src/scene/    la scena three.js (budget, scaffale, inquadratura, sonda)
src/dati/     catalogo finto e stato locale (niente database)
src/ui/       sistema visivo, barra dei tab e le quattro schermate
www/          output della build, e' quello che Capacitor impacchetta
```

## Le quattro sezioni

In `new_dado-e-trap` erano *collezione, catalogo, partite, profilo*, e la "libreria" era
lo scaffale 3D dentro la collezione. Qui lo scaffale diventa **una sezione sua e
modificabile**, e il profilo per ora non c'e'.

| tab | cos'e' |
|---|---|
| **Libreria** | il Kallax 3D. Si tocca una scatola per sceglierla, poi la si sposta di casella o la si toglie; se ne aggiungono dalla collezione |
| **Collezione** | i giochi che possiedi. Da qui si decide cosa sale sul ripiano |
| **Catalogo** | tutti i giochi conosciuti, da cui si dichiara "questo ce l'ho" |
| **Partite** | il registro delle serate |

Lo scaffale e' un **sottoinsieme della collezione**: togliere un gioco dalla collezione lo
toglie anche dal ripiano.

## Il mobile

Un **Kallax 4x3**, in centimetri veri: caselle interne da 33, montanti da 3.9, fondo 39 —
115 x 152 cm in tutto. La specifica sta in `scene/mobile.ts`, numeri puri senza three.js,
perche' la leggono sia la scena sia lo stato: **il mobile ha dodici caselle e finiscono**.
Quando e' pieno bisogna scegliere cosa togliere, ed e' proprio il punto di avere un mobile
invece di un elenco. La capienza non e' scritta a mano da nessuna parte: se il Kallax
cambia formato, cambia da sola.

Le misure vere non sono vezzo: le scatole dei giochi da tavolo sono quadrate da ~29.5
**proprio perche'** devono entrare in un Kallax. Una scatola piu' grande della casella si
stringe invece di sbordare dal montante.

Le scatole stanno **di faccia**: il cubo unitario si scala `(larghezza, altezza, spessore)`
invece di `(spessore, altezza, larghezza)`. Stessa geometria, altra matrice. Si appoggiano
al pavimento della casella e sono spinte verso il filo del mobile.

Due `InstancedMesh`, quindi **due draw call**: il mobile (dieci parallelepipedi fra
montanti, ripiani e schiena) e le scatole. Un solo programma shader per entrambi, perche'
il materiale e' lo stesso.

Spostare una scatola e' uno **scambio di casella**, non uno scorrimento: su una fila far
scalare gli altri e' naturale, su una griglia rimescolerebbe tutte le caselle successive e
si vedrebbe saltare mezzo mobile.

La scelta della scatola si fa col **raycast su InstancedMesh**: r3f restituisce
`instanceId`, che e' anche la posizione sul ripiano. Vive in `App`, non dentro la libreria,
perche' la condividono il pannello dei comandi e la scena 3D -- due rami diversi.

## Il sistema visivo

Riferimento: uno shot Dribbble di app finanziaria (Purrweb) -- **cioccolato fondente piu'
un accento elettrico**, tipografia condensata pesante, numeri enormi, contenitori
delimitati dal **bordo** e non dal riempimento, controlli a pillola, etichette minuscole,
zigzag disegnati a mano a rompere la griglia. L'accento del riferimento e' viola; qui e'
**lime**.

Token in `src/ui/tokens.css`. Fondo `#170E13`, lime `#CCFF4D`, crema `#F4EFE6`.
Display **Anton**, testo **Archivo** -- entrambi da `@fontsource`, quindi **impacchettati
nel bundle**: niente Google Fonts, niente sfarfallio all'avvio, niente app rotta offline.

Regole che tengono in piedi il tutto:

- **il lime e' un evidenziatore**: tab acceso, numeri che contano, un bordo alla volta.
  Grandi superfici lime stancano l'occhio;
- **un solo segnale per stato**: il bordo lime sulla riga *piu'* il bottone lime erano due
  volte la stessa informazione, e toglievano forza a entrambi. Parla il bottone;
- **il tab acceso e' l'unico riempito ed e' l'unico con l'etichetta**: gli altri restano
  sole icone. Dice dove sei senza mettere quattro parole in fila.

## Stack, e perche'

**Vite + React + TypeScript + three.js/react-three-fiber + Capacitor.** Android primo
bersaglio, iOS eventualmente dopo.

Perche' **non Expo/React Native**, deciso dopo averlo valutato sul serio:

- **Hermes non implementa WebAssembly.** Il transcoder KTX2 (Basis Universal) e' WASM, e
  cosi' i decoder Draco e meshopt e la fisica Rapier. Cioe' tutta la pipeline delle texture
  compresse — la soluzione al problema che ha affondato la versione precedente — su RN non
  gira. Da sola questa chiude il discorso.
- Il WebView di Android e' **Chrome con V8 e JIT**; Hermes non ha un JIT ottimizzante. Per
  un loop three.js pieno di matrici, il WebView e' probabilmente il piu' veloce dei due.
- **DevTools completo sul dispositivo vero** via `chrome://inspect`. Visto che il problema
  della prima versione e' stato non riuscire a vederlo, non e' un comfort: e' lo strumento.
- Tre quarti dell'app sono un **catalogo** — liste, filtri, schede, form. HTML e CSS restano
  lo strumento migliore per quello.

Il Mac **non serve** per compilare: Codemagic o GitHub Actions con runner macOS producono
l'`.ipa`. Serve l'Apple Developer Program (99 $/anno). Il buco vero senza Mac e' il
**collaudo**: senza un iPhone si va di device farm, oppure di WebKit via Playwright su
Windows, che intercetta gran parte delle differenze di motore.

Regola da tenere: **niente plugin Capacitor senza implementazione iOS**.

## Cosa aveva affondato la versione precedente

Misurato, non supposto: `imgTex()` costruiva `new THREE.Texture(im)` **alla risoluzione
nativa dell'immagine**. Con copertine fino a 5 megapixel sono ~27 MB di memoria video
l'una, cioe' **1–5 GB su duecento giochi**. Un telefono ne regge forse 300 MB: da li' in
poi il driver sfratta e ricarica texture di continuo, la GPU scalda, il throttling entra, e
il "freno" adattivo scendeva di qualita' curando un sintomo che non c'entrava.

Contorno: 6 luci dinamiche con 12 `MeshStandardMaterial`, `PCFSoftShadowMap`, zero
instancing, `anisotropy = 8` su ogni copertina, e due `CanvasTexture` per gioco per le coste
(~100 MB su duecento giochi, spesi senza accorgersene).

**Il framework non c'entrava niente.** Gli stessi shader sulla stessa GPU sarebbero stati
lenti uguale ovunque.

## Il budget di rendering

Deciso **all'avvio**, non rincorso da un freno che entra dopo che l'utente ha gia' visto
gli scatti. Le costanti stanno tutte in `src/scene/budget.ts`.

| | |
|---|---|
| pixel ratio | tetto a **1.5** — il parametro che pesa di piu' |
| copertine | **512×512** nell'atlante dello scaffale |
| atlante | pagine **4096×4096**, 64 copertine l'una |
| luci | **due**: una direzionale e un'ambient |
| materiali | Lambert o Basic, **mai** Standard/PBR |
| ombre | **nessuna proiettata**, solo l'ellisse di contatto |
| antialias | off |

Una texture serve a coprire i pixel che occupa a schermo: a 512 texel una scatola resta
nitida finche' non riempie meta' schermo su un 1080p. Con KTX2/ASTC duecento copertine
stanno in **~66 MB** invece di 1–5 GB.

**Tre livelli**, da fare: atlante per lo scaffale, copertina a piena risoluzione solo per la
scheda aperta (una sola texture, liberata all'uscita), ed eventualmente uno scaglione
intermedio in streaming per lo zoom profondo.

## Cose gia' verificate a schermo

- **Instancing con scatole tutte diverse: funziona.** Il dubbio era che misure da API
  rendessero inutile l'instancing. Non e' cosi': ogni istanza ha la sua matrice 4x4, scala
  non uniforme inclusa. 28 scatole di misure reali diverse = **1 draw call**, letto dalla
  sonda. Cio' che l'instancing non regala e' una texture per scatola — quello lo risolve
  l'atlante con l'offset UV per istanza.
- **`frameloop="demand"`**: da fermi non si disegna nulla. Su un telefono e' batteria e
  temperatura, quindi throttling che non arriva. Durante il gesto ogni evento chiede il suo
  fotogramma, l'interazione resta continua.
- **L'inquadratura si calcola dal contenuto**, e sbaglia in tre modi diversi se e' fissa:
  il `fov` di una camera prospettica e' quello *verticale*, quindi quale dimensione
  "stringe" dipende dallo schermo e vanno calcolate entrambe; la faccia anteriore del
  mobile e' piu' vicina della sua mezzeria e va sommata mezza profondita'; e **lo schermo
  non e' tutto libero** — testata e pannello coprono una fetta dell'altezza, e inquadrare
  sul viewport intero nasconde la riga in basso dietro ai comandi. Una scatola nascosta non
  si puo' nemmeno toccare. Si inquadra sulla **banda visibile** e si sposta la camera
  perche' il mobile finisca al centro di quella.
- **`maxDistance` di OrbitControls puo' combattere l'inquadratura.** Se e' piu' corto della
  distanza che serve a far entrare tutto, i controlli tirano la camera avanti e i lati
  restano tagliati — senza nessun errore, e col calcolo giusto.

## La regola di React con r3f

**Lo stato che anima non passa mai da React.** Vive dentro `useFrame` e nelle ref. Un
`setState` per fotogramma ricrea, in forma nuova, il problema di prestazioni da cui stiamo
scappando. `Sonda.tsx` e' l'esempio: scrive nel DOM direttamente.

## La sonda

`src/scene/Sonda.tsx` tiene a schermo fotogrammi, draw call, triangoli, **texture in memoria**
e programmi shader. La voce delle texture e' quella che aveva affondato lo scaffale di prima
e non si vedeva. Appende anche `window.meboard` per interrogare `gl.info` a mano da DevTools
quando l'app gira sul telefono vero.

## La checklist WebView

In `src/stile.css`, tutte obbligatorie e tutte messe subito: documento che non scrolla e non
rimbalza, `overscroll-behavior: none`, `touch-action: manipulation`,
`-webkit-tap-highlight-color: transparent`, `touch-action: none` sul canvas, safe area da
`env()`. Mancano ancora, quando ci sara' Capacitor: **tasto indietro di Android** agganciato
alla navigazione (il tradimento numero uno), splash nascosto dopo il primo paint, **font
impacchettati in locale**, e `@capacitor/keyboard`.

## Trappole gia' pagate

- **Il watcher di Vite su Windows si perde le scritture.** Il file su disco e' aggiornato,
  il modulo servito no, e il componente non si monta — senza nessun errore. Risolto alla
  radice con `server.watch.usePolling` in `vite.config.ts`. Se ricapita: `curl` sul modulo
  servito e confronto col disco.
- **Due copie di React in pagina.** Sintomo: `useStato fuori dal ProvvedoreStato` su un
  albero palesemente corretto. Causa: gli hash delle dipendenze ottimizzate non
  coincidevano (`react.js?v=A` contro `react-dom_client.js?v=B`) perche' `vite --force`
  rioptimizza a ogni avvio mentre il browser teneva i vecchi URL. Due React, due contesti,
  provider invisibile. **Non usare `--force`**; semmai `rm -rf node_modules/.vite` e
  riavvio.
- **Contesti di impilamento.** Un foglio modale nato dentro `.schermo` (che ha gia' un suo
  `z-index`) non compete piu' con la barra dei tab, per quanto alto lo si faccia: la barra
  gli passa sopra e copre il bottone di conferma. Va in un **portale sul body**.
- **La sonda a riposo mostrava gli zeri del montaggio.** `gl.info` si azzera a ogni render,
  quindi letto prima del primo disegno dice "0 draw" — che su un'app perfettamente sana
  sembra un guasto, ed e' costato un'ora di diagnosi. Due volte, per giunta: la prima
  correzione non bastava perche' in `demand` un solo fotogramma lascia ancora il contatore
  a zero. Ora la sonda **si chiede da sola il secondo fotogramma** e fino ad allora scrive
  un trattino invece di un numero falso.
- **`toISOString()` risponde in UTC.** Per la data di oggi in Italia, fra mezzanotte e le
  due, darebbe il giorno prima — e una partita si segna proprio a quell'ora.
- Con la pagina non visibile `requestAnimationFrame` e' sospeso, e in `demand` i fotogrammi
  sono radi comunque: un fps letto li' non significa niente. Per la stessa ragione gli
  strumenti di input del pannello di anteprima vanno in timeout mentre aspettano un
  fotogramma: l'app si guida dal DOM.

## Da fare

1. La pipeline dell'atlante (copertine e coste) con offset UV per istanza. Le scatole sono
   ancora tinte piatte.
2. Le miniature **generate a monte**, non sul telefono: ridimensionare in locale vuol dire
   aver gia' pagato download e decodifica. Supabase puo' servirle gia' piccole, oppure si
   genera la miniatura al caricamento del gioco.
3. Quel che manca rispetto a `dado-e-trap`: profilo, recensioni, desideri, gruppi. Fuori
   perimetro per ora anche database e accessi.
4. Capacitor: `cap add android`, e la coda della checklist WebView.
5. Cosa fare quando le dodici caselle non bastano: un secondo Kallax accanto, oppure
   scatole impilate in profondita' nella stessa casella (come si fa davvero) — ma quelle
   dietro diventano invisibili e non toccabili, quindi va pensato.
6. Le misure dell'interfaccia passate all'inquadratura (`sopra`/`sotto` in `App.tsx`) sono
   numeri che rispecchiano `ui/app.css` a mano. Se il pannello cambia altezza vanno
   cambiate anche li'; misurarle a runtime sarebbe piu' solido.
