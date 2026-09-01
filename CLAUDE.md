# MeBoard — note di progetto

Riscrittura **mobile-first** di `MOBILE_dado-e-trap`. Quella era nata sito web e poi
impacchettata; questa parte dal telefono. Libreria di giochi da tavolo in 3D: lo scaffale
e' il prodotto, quindi le scatole devono essere belle **e** scorrere lisce.

```
src/scene/    la scena three.js (budget, scaffale, inquadratura, sonda)
src/dati/     dati (per ora finti, poi le API)
src/ui/       interfaccia React (catalogo, schede, filtri) — da fare
www/          output della build, e' quello che Capacitor impacchetta
```

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
- **L'inquadratura si calcola dal contenuto.** Il `fov` di una camera prospettica e' quello
  *verticale*: in ritratto l'apertura orizzontale si stringe e uno scaffale largo esce dai
  bordi. Con una posizione fissa funzionava sul monitor e non sul telefono.

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

## Trappole dell'ambiente

- **Vite puo' servire una trasformazione vecchia.** E' successo: il file su disco importava
  un modulo, quello servito no, e il componente semplicemente non si montava — senza errori.
  Le modifiche fatte con `sed` sfuggono al watcher. In caso di stranezze, `curl` sul modulo
  servito e confronto col disco, poi **riavvio del server**.
- Con la pagina non visibile `requestAnimationFrame` e' sospeso, e in `demand` i fotogrammi
  sono radi comunque: un fps letto li' non significa niente.

## Da fare

1. La pipeline dell'atlante (copertine e coste) con offset UV per istanza.
2. Le miniature **generate a monte**, non sul telefono: ridimensionare in locale vuol dire
   aver gia' pagato download e decodifica. Supabase puo' servirle gia' piccole, oppure si
   genera la miniatura al caricamento del gioco.
3. Il perimetro delle funzioni: da decidere se resta quello di `dado-e-trap` (catalogo,
   partite, recensioni, profilo, desideri, auth) o cambia.
4. Capacitor: `cap add android`, e la coda della checklist WebView.
