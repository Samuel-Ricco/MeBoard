import * as THREE from 'three'
import { copertinaPerTexture } from '../dati/supabase'
import { COPERTINA_PX } from './budget'
import { CELLE, COLONNE } from './mobile'

/* L'ATLANTE DELLE COPERTINE.
 *
 * E' il pezzo che chiude il problema che aveva affondato la versione
 * precedente. La' ogni copertina diventava una texture alla RISOLUZIONE
 * NATIVA dell'immagine: con file da 1200 o 1750 pixel sono 6-12 MB l'uno,
 * e su duecento giochi si arrivava a gigabyte.
 *
 * Qui ogni copertina si riduce DURANTE la decodifica, con
 * `createImageBitmap`: l'immagine grande non arriva mai in memoria video.
 * E tutte finiscono in una pagina sola, quindi l'InstancedMesh resta a
 * UNA draw call -- l'unico modo di avere dodici immagini diverse su un
 * solo mesh.
 *
 * LA PAGINA E' ESATTAMENTE DODICI TESSERE, quante sono le caselle: quattro
 * per tre. Non si sprecano righe per arrivare a una potenza di due, e con
 * le copertine a 256 sono quattro megabyte -- contro i ventuno di prima.
 */

/** quante tessere per riga: le stesse colonne del mobile */
export const PER_RIGA = COLONNE + 1                    // 4
export const PER_COLONNA = Math.ceil(CELLE / PER_RIGA) // 3
export const LARGO = PER_RIGA * COPERTINA_PX           // 1024
export const ALTO = PER_COLONNA * COPERTINA_PX         // 768
export const CAPIENZA = PER_RIGA * PER_COLONNA         // 12

export type Atlante = {
  texture: THREE.Texture
  /** per ogni scatola, l'angolo in basso a sinistra della sua tessera */
  offset: Float32Array
  /** quanto vale una tessera in coordinate UV */
  scalaX: number
  scalaY: number
  arrivate: number
}

export type Tessera = { copertinaUrl: string | null; tinta: string }

function tessera(i: number) {
  const col = i % PER_RIGA
  const riga = Math.floor(i / PER_RIGA)
  return { x: col * COPERTINA_PX, y: riga * COPERTINA_PX, col, riga }
}

/* Scarica una copertina e la riduce mentre la decodifica.
 *
 * Passa dalla nostra function e non dall'indirizzo diretto: le immagini
 * di BGG non mandano header CORS, e una canvas che ne disegna una diventa
 * "contaminata" -- da quel momento la texture resta vuota. E' la lezione
 * gia' pagata nella versione precedente. */
async function scarica(url: string, segnale: AbortSignal): Promise<ImageBitmap | null> {
  try {
    const r = await fetch(copertinaPerTexture(url), { signal: segnale })
    if (!r.ok) return null
    const blob = await r.blob()
    return await createImageBitmap(blob, {
      resizeWidth: COPERTINA_PX,
      resizeHeight: COPERTINA_PX,
      resizeQuality: 'high',
    })
  } catch {
    /* Rete assente, immagine sparita, richiesta annullata: nessuno di
       questi casi deve impedire di vedere il mobile. */
    return null
  }
}

/* Le richieste in parallelo si limitano: dodici download insieme su una
   rete mobile si ostacolano fra loro. */
async function aGruppi<T>(cose: T[], quanti: number, fai: (c: T, i: number) => Promise<void>) {
  let prossimo = 0
  const operai = Array.from({ length: Math.min(quanti, cose.length) }, async () => {
    while (prossimo < cose.length) {
      const i = prossimo++
      await fai(cose[i], i)
    }
  })
  await Promise.all(operai)
}

async function costruisci(tessere: Tessera[], segnale: AbortSignal): Promise<Atlante> {
  const quante = Math.min(tessere.length, CAPIENZA)
  const tela = document.createElement('canvas')
  tela.width = LARGO
  tela.height = ALTO
  const p = tela.getContext('2d')!

  /* Prima la tinta, poi -- se arriva -- la copertina sopra. Cosi' una
     copertina che non arriva non lascia un buco nero, e il mobile resta
     leggibile mentre le immagini entrano una per una. */
  for (let i = 0; i < quante; i++) {
    const { x, y } = tessera(i)
    p.fillStyle = tessere[i].tinta
    p.fillRect(x, y, COPERTINA_PX, COPERTINA_PX)
  }

  const texture = new THREE.CanvasTexture(tela)
  texture.colorSpace = THREE.SRGBColorSpace
  /* L'anisotropia costa a ogni campione e qui non si vede: le scatole si
     guardano di faccia, non di scorcio. Nella versione precedente era a 8
     su ogni copertina, spesa senza accorgersene. */
  texture.anisotropy = 1
  texture.minFilter = THREE.LinearMipmapLinearFilter

  let arrivate = 0
  const indici = Array.from({ length: quante }, (_, i) => i)
  await aGruppi(indici, 4, async (i) => {
    const url = tessere[i].copertinaUrl
    if (!url) return
    const bmp = await scarica(url, segnale)
    if (!bmp || segnale.aborted) return
    const { x, y } = tessera(i)
    p.drawImage(bmp, x, y, COPERTINA_PX, COPERTINA_PX)
    bmp.close()
    arrivate++
    texture.needsUpdate = true
  })

  const scalaX = COPERTINA_PX / LARGO
  const scalaY = COPERTINA_PX / ALTO
  const offset = new Float32Array(quante * 2)
  for (let i = 0; i < quante; i++) {
    const { col, riga } = tessera(i)
    offset[i * 2] = col * scalaX
    /* Le UV hanno l'origine in basso, la canvas in alto: la riga si
       specchia, se no le copertine escono di posizione. */
    offset[i * 2 + 1] = (PER_COLONNA - 1 - riga) * scalaY
  }

  return { texture, offset, scalaX, scalaY, arrivate }
}

/* ---------------------------------------------------------------- */

/* LA DISPENSA.
 *
 * Il lampo cambiando libreria era la RETE: l'atlante nuovo si scaricava
 * da zero, e per un secondo si vedevano tinte piatte. Qui gli atlanti si
 * tengono da parte, e le librerie vicine si costruiscono in anticipo:
 * arrivando, la texture c'e' gia' e non si vede nessun passaggio.
 *
 * Il conto della memoria e' il motivo per cui si puo' fare. Una scatola
 * a schermo e' 146 pixel reali; le copertine erano a 512, cioe' tre volte
 * e mezzo il necessario -- avanzo dei tempi in cui si poteva zoomare.
 * A 256 una pagina costa quattro megabyte, e cinquene stanno in venti:
 * MENO del singolo atlante da 512 di prima.
 */

const dispensa = new Map<string, Atlante>()
const inCorso = new Map<string, Promise<Atlante>>()

/** L'atlante di questa firma: pronto se c'e', altrimenti costruito. */
export function ottieni(
  firma: string,
  tessere: Tessera[],
  segnale: AbortSignal,
): Atlante | Promise<Atlante> {
  const gia = dispensa.get(firma)
  if (gia) return gia

  const inVolo = inCorso.get(firma)
  if (inVolo) return inVolo

  const lavoro = costruisci(tessere, segnale).then((a) => {
    inCorso.delete(firma)
    /* Se e' stato annullato non si conserva: sarebbe una pagina a meta',
       e resterebbe cosi' per sempre. */
    if (segnale.aborted) { a.texture.dispose(); return a }
    dispensa.set(firma, a)
    return a
  })
  inCorso.set(firma, lavoro)
  return lavoro
}

/** Costruisce in anticipo, senza fretta e senza far aspettare nessuno. */
export function prepara(firma: string, tessere: Tessera[]) {
  if (dispensa.has(firma) || inCorso.has(firma)) return
  ottieni(firma, tessere, new AbortController().signal)
}

/* Fuori dalla finestra si libera. Il garbage collector di JavaScript non
   sa niente della memoria video: una texture abbandonata resta li'
   finche' non si chiude la pagina. */
export function tieniSolo(firme: string[]) {
  const salve = new Set(firme)
  dispensa.forEach((a, f) => {
    if (!salve.has(f)) {
      a.texture.dispose()
      dispensa.delete(f)
    }
  })
}

export function svuotaDispensa() {
  dispensa.forEach((a) => a.texture.dispose())
  dispensa.clear()
  inCorso.clear()
}
