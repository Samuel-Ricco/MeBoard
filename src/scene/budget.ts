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

/** Lato della copertina nell'atlante del mobile.
 *
 *  Una texture serve a coprire i pixel che occupa A SCHERMO, e da quando
 *  l'inquadratura e' fissa quel numero si sa: dodici caselle su un
 *  ritratto da 375 px fanno una scatola di 97 px CSS, cioe' 146 reali a
 *  dpr 1.5. A 512 se ne spendevano tre volte e mezzo il necessario --
 *  avanzo dei tempi in cui si poteva zoomare. A 256 se ne spendono 1,8
 *  volte, che e' il margine giusto, e una pagina passa da 21 MB a 4.
 *
 *  E' quel risparmio che rende possibile tenere in memoria anche le
 *  librerie vicine, invece del lampo a ogni cambio. */
export const COPERTINA_PX = 256

/* La pagina d'atlante e' esattamente dodici tessere -- quante sono le
   caselle -- e le sue misure stanno in `atlante.ts`, che sa il formato
   del mobile. */

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
