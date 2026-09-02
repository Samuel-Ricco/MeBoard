import * as THREE from 'three'
import { copertinaPerTexture } from '../dati/supabase'
import { COPERTINA_PX } from './budget'

/* L'ATLANTE DELLE COPERTINE.
 *
 * E' il pezzo che chiude il problema che aveva affondato la versione
 * precedente. La' ogni copertina diventava una texture alla RISOLUZIONE
 * NATIVA dell'immagine: con file da 1200 o 1750 pixel sono 6-12 MB di
 * memoria video l'uno, e su duecento giochi si arrivava a gigabyte. Il
 * driver sfrattava e ricaricava texture di continuo, la GPU scaldava, e
 * il "freno" adattivo curava un sintomo che non c'entrava.
 *
 * Qui invece:
 *
 *  - ogni copertina si riduce a 512 DURANTE la decodifica, con
 *    `createImageBitmap`: l'immagine grande non arriva mai in memoria
 *    video, e nemmeno in una canvas a piena misura;
 *  - tutte finiscono in UNA pagina 2048x2048, che sono ~21 MB comprese le
 *    mipmap -- per tutto il mobile, non per copertina;
 *  - una texture sola vuol dire che l'InstancedMesh resta a UNA draw call:
 *    e' l'unico modo di avere dodici immagini diverse su un solo mesh.
 *
 * 2048 e non 4096: le caselle sono dodici, in una pagina 4x4 ce ne stanno
 * sedici, e 2048 e' il lato massimo che QUALUNQUE GPU garantisce. Il 4096
 * lo reggono quasi tutte, ma "quasi" su un telefono altrui non si sa mai.
 */

export const LATO_PAGINA = 2048
export const PER_LATO = Math.floor(LATO_PAGINA / COPERTINA_PX)   // 4
export const CAPIENZA = PER_LATO * PER_LATO                      // 16

export type Atlante = {
  texture: THREE.Texture
  /** per ogni scatola, l'angolo in basso a sinistra della sua tessera */
  offset: Float32Array
  /** quanto vale una tessera in coordinate UV */
  scala: number
  /** quante copertine sono arrivate davvero */
  arrivate: number
}

/** Dove sta la tessera `i` nella pagina, in pixel. */
function tessera(i: number) {
  const col = i % PER_LATO
  const riga = Math.floor(i / PER_LATO)
  return { x: col * COPERTINA_PX, y: riga * COPERTINA_PX, col, riga }
}

/* Scarica una copertina e la riduce a 512 mentre la decodifica.
 *
 * Passa dalla nostra function e non dall'indirizzo diretto: le immagini
 * di BGG non mandano header CORS, e una canvas che ne disegna una diventa
 * "contaminata" -- da quel momento `texImage2D` la rifiuta e la texture
 * resta vuota. E' la lezione gia' pagata nella versione precedente. */
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
   rete mobile si ostacolano fra loro, e il primo a servire e' quello che
   si vede per primo. */
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

export type Tessera = { copertinaUrl: string | null; tinta: string }

/**
 * Costruisce la pagina e la texture. Le tessere oltre la capienza vengono
 * ignorate: il mobile ha dodici caselle, la pagina ne tiene sedici.
 */
export async function costruisciAtlante(
  tessere: Tessera[],
  segnale: AbortSignal,
): Promise<Atlante> {
  const quante = Math.min(tessere.length, CAPIENZA)
  const tela = document.createElement('canvas')
  tela.width = LATO_PAGINA
  tela.height = LATO_PAGINA
  const p = tela.getContext('2d')!

  /* Prima la tinta, poi -- se arriva -- la copertina sopra. Cosi' una
     copertina che non arriva non lascia un buco nero ma il colore che la
     scatola aveva prima, e il mobile resta leggibile mentre le immagini
     entrano una per una. */
  for (let i = 0; i < quante; i++) {
    const { x, y } = tessera(i)
    p.fillStyle = tessere[i].tinta
    p.fillRect(x, y, COPERTINA_PX, COPERTINA_PX)
  }

  const texture = new THREE.CanvasTexture(tela)
  texture.colorSpace = THREE.SRGBColorSpace
  /* L'anisotropia costa a ogni campione e qui non si vede: le scatole si
     guardano quasi di faccia, non di scorcio. Nella versione precedente
     era a 8 su ogni copertina, spesa senza accorgersene. */
  texture.anisotropy = 1
  texture.generateMipmaps = true
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
    // ogni copertina che arriva si vede subito, non si aspetta l'ultima
    texture.needsUpdate = true
  })

  const scala = COPERTINA_PX / LATO_PAGINA
  const offset = new Float32Array(quante * 2)
  for (let i = 0; i < quante; i++) {
    const { col, riga } = tessera(i)
    offset[i * 2] = col * scala
    /* Le UV hanno l'origine in basso, la canvas in alto: la riga si
       specchia, se no le copertine escono capovolte di posizione. */
    offset[i * 2 + 1] = (PER_LATO - 1 - riga) * scala
  }

  return { texture, offset, scala, arrivate }
}
