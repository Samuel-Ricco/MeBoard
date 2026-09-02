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

Il **profilo** non e' un quinto tab: in basso ci stanno i posti dove si passa il tempo, e
le impostazioni non sono uno di quelli. Sta dietro al meeple in alto a destra.

## Le funzioni prese da `new_dado-e-trap`

| | dove sta |
|---|---|
| **scheda del gioco** | toccando una riga in collezione, catalogo o partite, o il nome nel pannello della libreria |
| **recensioni** con voto 1-10 | dentro la scheda |
| **desideri** | stella nel catalogo, piu' il filtro "li voglio" |
| **etichette** (i "gruppi" dell'altra app) | si creano nel profilo, si applicano nella scheda, filtrano la collezione |
| **giocatori** | si scrivono una volta nel profilo e poi si scelgono segnando una partita |
| **tavolozza** | profilo: chiaro, scuro, o come il telefono |

Restano **fuori di proposito**: amici e codice amico (vogliono un backend, e senza sarebbero
bottoni che non portano da nessuna parte), le recensioni degli altri, la stanza arredabile,
i suoni e la doppia lingua IT/EN. L'i18n non e' difficile, e' solo lunga: va fatta quando le
stringhe smettono di cambiare tutti i giorni.

Due scelte di sostanza, non di forma:

- **i giocatori si scelgono, non si riscrivono.** A testo libero "Giulia", "giulia" e
  "Giuli" diventano tre persone e le statistiche smettono di tornare. E il vincitore si
  sceglie solo fra chi era al tavolo.
- **le contraddizioni non si lasciano possibili**: un gioco che possiedi non puo' stare nei
  desideri, e comprarne uno lo toglie da li' da solo. Se no l'app si smentisce da sola in
  due schermate diverse.

## Le due tavolozze

Chiaro e scuro non sono due disegni: sono **gli stessi ruoli con altri valori**, dichiarati
per intero in `ui/tokens.css`. La tavolozza chiara li riassegna tutti, nessuno escluso — se
ne restasse indietro uno si vedrebbe un'ombra scura su un fondo di carta.

- Il **lime scende di un gradino** sul chiaro: su carta il `#CCFF4D` si stacca appena dal
  fondo e le pillole perdono il contorno. Sotto resta sempre scritto scuro: il lime non e'
  mai un fondo per testo chiaro.
- Il **rosso di cio' che distrugge non segue la tavolozza**. Non e' decorazione, e' un
  segnale: un rosso "coordinato" smette di dire quello che deve dire.
- Anche il **mobile 3D si tinge dalla tavolozza**: la scena legge `--mobile` e
  `--mobile-schiena` invece di avere colori suoi, e sul chiaro il Kallax diventa rovere
  sbiancato senza che nessuno lo dica due volte.
- La scelta **auto** e' il predefinito: su un telefono il tema di sistema cambia da solo la
  sera, e un'app che resta scura a mezzogiorno sembra sempre sbagliata.

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

- **La tavolozza va scritta prima del primo pixel.** Se lo facesse React, l'app partirebbe
  col tema predefinito e cambierebbe colore un attimo dopo — un lampo che si vede benissimo
  passando a chiaro. Per questo c'e' uno scriptino in linea nel `<head>` di `index.html`:
  quello decide il primo fotogramma, il modulo `ui/tema.tsx` tiene il resto. Sono due
  copie della stessa logica, ed e' voluto.
- **Un hook con stato locale non e' una sorgente sola.** La tavolozza la cambia il profilo
  ma la deve sapere anche la scena 3D: con `useState` dentro l'hook ognuno aveva la sua
  copia e il Kallax restava cioccolato dentro un'app diventata di carta. Sta in un
  contesto.
- **`<span>` e' inline.** Trasformando le righe in bottoni, nome e sottotitolo sono passati
  da `<div>` a `<span>` e sono finiti sulla stessa riga. I `display: block` che i `<div>`
  regalavano vanno riscritti a mano.

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

## Le misure della scatola

BGG le pubblica, ma **non nel gioco**: stanno dentro le EDIZIONI
(`/thing?versions=1`), una per ristampa, e **in pollici**. Si tiene l'ultima -- anno piu'
alto, a parita' l'ultima elencata -- perche' e' la scatola che si compra oggi.

Erano stimate, e la stima sbagliava di brutto: Gloomhaven veniva 29,5 quadrato ed e'
**41,3 x 29,8 x 20,2**. E' proprio il gioco famoso per non stare in un Kallax. La scheda
dice da quale edizione viene la misura -- un numero senza provenienza, quando sembra
sbagliato, non si puo' nemmeno controllare -- e avvisa quando la scatola non entra nella
casella da 33.

Due trappole nel parser, entrambe gia' pagate:

- **anche le edizioni sono `<item>`**, annidate dentro `<versions>`: spezzare su `<item ` le
  prende per giochi. Serve il ritaglio di primo livello con `(?!version)`;
- **`'\d'` in una stringa TypeScript diventa `d`**. L'espressione cercava lettere invece di
  cifre e tornava zero risultati, senza un errore. Si usa `String.raw`.

## I gesti sul mobile

Tre, e non si pestano i piedi:

| | |
|---|---|
| **tocco corto** | apre la scheda del gioco |
| **tieni premuto** | prendi la scatola e la porti in un'altra casella |
| **scorri di lato** | cambi libreria; con una scatola in mano, **trascinarla fuori dal mobile** la porta con te |

Trascinare **non gira il mobile**: c'erano gli OrbitControls e sono via. Girarlo era comodo
per guardarlo, ma mangiava il gesto piu' usato di tutti -- sfogliare le librerie -- e su un
telefono un gesto vale piu' di una rotazione.

Tutto sta in `scene/Gesti.tsx`: DOM puro sul canvas piu' un raycast a mano, cosi' non serve
un piano invisibile per intercettare i movimenti -- che sarebbe una draw call in piu' per
non disegnare niente.

Mentre si trascina, **il mobile mostra gia' il risultato**: le due scatole si scambiano
subito di posto, cosi' si vede dove andra' a finire invece di doverlo immaginare.

## Piu' librerie

Ogni libreria ha nome, legno, luce e criterio di disposizione **suoi**: due mobili nella
stessa stanza possono essere di legno diverso, ed e' il motivo per cui se ne tiene piu'
d'uno. **Muro e pavimento no**: la stanza e' una sola.

L'ultima libreria non si elimina -- senza mobili la schermata non ha senso.

## Personalizzare

Pannello a **tendine**, in `ui/Aspetto.tsx`, aperto dal tasto in alto a sinistra. Aperte
tutte insieme erano sette blocchi da scorrere per cambiare una cosa sola; chiuse mostrano
comunque cosa c'e' scelto, che e' meta' del motivo per cui si aprirebbero.

L'ordine va dal **particolare al generale**, e finisce con cio' che distrugge: nome, legno,
luce, disposizione, poi la stanza, poi l'eliminazione.

- **I colori predefiniti sono una proposta, non una gabbia.** Sei tinte scelte perche'
  stiano bene fra loro e col tema, piu' un bottone che apre il selettore di sistema; il
  colore scelto entra in coda ai predefiniti, cosi' si ritrova senza ricomporlo a memoria.
- **La luce ha una temperatura sola.** C'erano dodici colori, neon compresi: una decisione
  in piu' per un guadagno che non c'era, perche' una luce colorata tinge le copertine.
- **Muro e pavimento nulli sono il predefinito**, non un ripiego: su uno schermo piccolo un
  mobile senza contorno e' piu' pulito.
- **I faretti non aggiungono una luce**: restano due. Una terza sarebbe un moltiplicatore
  su ogni frammento, il conto che nella versione precedente valeva il 28% del tempo GPU.

## Cose tolte perche' brutte

- Il **pannello fisso** in fondo alla libreria, con "tocca una scatola" e due bottoni:
  occupava un quinto dello schermo per spiegare un gesto e offrire un comando che stava
  gia' altrove.
- Il **`<select>` di sistema** per scegliere il gioco di una partita: su Android e' un menu
  grigio che non somiglia a niente del resto, e senza copertine un gioco non si riconosce a
  colpo d'occhio.

## L'atlante delle copertine

`scene/atlante.ts`. Ogni copertina si riduce a **512 durante la decodifica**
(`createImageBitmap` con `resizeWidth`), quindi l'immagine grande non arriva mai in memoria
video. Tutte finiscono in **una pagina 2048x2048** — ~21 MB comprese le mipmap, per tutto
il mobile, non per copertina. Nella versione precedente erano 6-12 MB **l'una**.

2048 e non 4096: le caselle sono dodici, in una pagina 4x4 ce ne stanno sedici, e 2048 e' il
lato che *qualunque* GPU garantisce.

Ogni istanza porta il suo angolo di tessera in un `InstancedBufferAttribute`, sommato a
`vMapUv` con `onBeforeCompile`. E' l'unico modo di avere dodici immagini diverse su un solo
mesh: **una texture, una draw call**.

Due dettagli che costano cari se sbagliati:

- **il colore per istanza MOLTIPLICA la texture**, quindi con l'atlante addosso deve essere
  bianco. Resta la tinta finche' le immagini non ci sono, e il lime sulla scatola scelta;
- **la texture vecchia si libera DOPO aver montato la nuova, mai prima.** Liberandola
  prima resta comunque attaccata al materiale finche' React non riesegue l'effetto, e un
  fotogramma disegnato nel frattempo la fa RICARICARE alla GPU: torna in memoria da sola e
  nessuno puo' piu' liberarla. Misurato due volte -- il contatore saliva di uno a ogni
  ricostruzione anche con la liberazione al posto giusto nel codice ma nel momento
  sbagliato. Con l'ordine corretto resta a `1 tex` su sei ricostruzioni.

## Da fare

In ordine di quanto sbloccano, non di quanto costano.

1. **L'atlante delle copertine** (e le coste) con offset UV per istanza. Le scatole sono
   ancora tinte piatte, ed e' insieme il buco visivo piu' evidente e la pipeline che
   risolve il problema che aveva affondato la versione precedente. Serve pero' il punto 2:
   senza immagini vere non c'e' niente da impacchettare.
2. **I dati veri.** Il catalogo sono 28 giochi scritti a mano. Qui si decide se pescare da
   BGG, se serve Supabase, e dove nascono le miniature — che vanno **generate a monte**,
   non sul telefono: ridimensionare in locale vuol dire aver gia' pagato download e
   decodifica. E' la decisione che apre tutto il resto ed e' ancora fuori perimetro.
3. **Capacitor: `cap add android`** e la coda della checklist WebView — tasto indietro
   agganciato alla navigazione (il tradimento numero uno), splash nascosto dopo il primo
   paint, `@capacitor/keyboard`. Finora l'app non e' mai stata impacchettata: e' il primo
   momento in cui si scopre come si comporta davvero su un telefono.
4. **Cosa fare quando le dodici caselle non bastano**: un secondo Kallax accanto, oppure
   scatole impilate in profondita' nella stessa casella (come si fa davvero) — ma quelle
   dietro diventano invisibili e non toccabili, quindi va pensato prima di scriverlo.
5. **Le misure dell'interfaccia passate all'inquadratura** (`sopra`/`sotto` in `App.tsx`)
   rispecchiano `ui/app.css` a mano. Se il pannello cambia altezza vanno cambiate anche
   li': misurarle a runtime sarebbe piu' solido.
6. **L'i18n IT/EN.** Non e' difficile, e' lunga: si fa quando le stringhe smettono di
   cambiare tutti i giorni, se no si traduce due volte.
7. **iOS**, quando si vorra': build in cloud (Codemagic o Actions con runner macOS) piu'
   Apple Developer Program. Il buco vero non e' compilare ma **collaudare** senza un
   iPhone.

Restano fuori per scelta finche' non c'e' un backend: amici e codice amico, le recensioni
degli altri, la stanza arredabile. E i suoni, che vogliono un lavoro di sound design a
parte.
