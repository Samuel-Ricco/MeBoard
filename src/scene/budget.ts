/* IL BUDGET DI RENDERING.
 *
 * Tutte le costanti che decidono quanto costa un fotogramma stanno qui, e
 * sono decise UNA VOLTA all'avvio -- non abbassate a posteriori da un freno
 * che entra in funzione dopo che l'utente ha gia' visto gli scatti.
 *
 * I numeri vengono dall'analisi della versione precedente: la lentezza non
 * era il numero di poligoni ne' le draw call, era la memoria video occupata
 * da copertine a risoluzione nativa (fino a 27 MB l'una).
 */

/** Tetto al pixel ratio. A 2 si renderizzano quattro volte i frammenti che
 *  a 1, e su un pannello da telefono la differenza non si vede: e' il
 *  singolo parametro che sposta di piu' il frame rate. */
export const DPR_MAX = 1.5

/** Lato della copertina nell'atlante dello scaffale.
 *  Una texture serve a coprire i pixel che occupa a schermo: 512 texel
 *  bastano fino a quando la scatola riempie meta' schermo su un 1080p.
 *  Oltre quello si passa al livello "scheda aperta". */
export const COPERTINA_PX = 512

/** Lato di una pagina d'atlante. */
export const ATLANTE_PX = 4096

/** Quante copertine entrano in una pagina: 8 x 8 = 64. */
export const PER_PAGINA = (ATLANTE_PX / COPERTINA_PX) ** 2

/** Lato della costa, che e' disegnata e non fotografata: colore piu' titolo.
 *  Va nel suo atlante insieme alle altre, se no sono due CanvasTexture per
 *  gioco -- cioe' 100 MB su duecento giochi, spesi senza accorgersene. */
export const COSTA_PX = 256

/* PROMEMORIA SUI MATERIALI.
 *
 * Niente MeshStandardMaterial: il PBR su GPU mobile e' un lusso, e con
 * l'illuminazione cotta nella texture non si distingue. Lambert, o Basic
 * dove non serve nemmeno la luce.
 *
 * Niente ombre proiettate: solo l'ellisse di contatto sotto ogni oggetto,
 * dimensionata sull'impronta reale. Una shadow map da 2048 costa una
 * seconda passata della scena intera.
 *
 * Due luci al massimo -- una direzionale piu' un'ambient. Ogni luce
 * dinamica in piu' e' un moltiplicatore su OGNI frammento. */
export const LUCI_MAX = 2
