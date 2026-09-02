import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/* IL COLLEGAMENTO AL DATABASE.
 *
 * Due regole che tengono in piedi il resto:
 *
 * 1. SENZA CHIAVI L'APP FUNZIONA LO STESSO. Chi clona il repo e fa
 *    `npm run dev` non deve trovarsi una schermata bianca perche' manca un
 *    `.env.local`: `collegato` resta falso, lo stato vive in locale come ha
 *    sempre fatto, e non si rompe niente. Il database e' un'aggiunta, non
 *    un requisito per accendere l'app.
 *
 * 2. L'ACCESSO E' ANONIMO E SILENZIOSO. Nessuna schermata di login: al
 *    primo avvio si crea un utente vero, che serve solo a dare un
 *    `auth.uid()` alle policy. Piu' avanti ci si potra' collegare un'email
 *    per non perdere tutto cambiando telefono -- ed e' bene dirlo
 *    all'utente prima che il telefono lo perda, non dopo.
 */

const INDIRIZZO = import.meta.env.VITE_SUPABASE_URL
const CHIAVE = import.meta.env.VITE_SUPABASE_ANON_KEY

/** Se le chiavi non ci sono si lavora in locale e basta. */
export const collegato = Boolean(INDIRIZZO && CHIAVE)

export const supabase: SupabaseClient | null = collegato
  ? createClient(INDIRIZZO, CHIAVE, {
      auth: {
        // la sessione sopravvive alla chiusura dell'app
        persistSession: true,
        autoRefreshToken: true,
        // non c'e' nessun ritorno da OAuth da cui pescare un token
        detectSessionInUrl: false,
      },
    })
  : null

/** L'identita' in uso, o null se si sta lavorando senza database. */
export async function entra(): Promise<string | null> {
  if (!supabase) return null

  const { data: { session } } = await supabase.auth.getSession()
  if (session?.user) return session.user.id

  const { data, error } = await supabase.auth.signInAnonymously()
  if (error) {
    /* Il caso piu' probabile e' l'accesso anonimo non acceso nel pannello.
       Non e' motivo per fermare l'app: si continua in locale. */
    console.warn('accesso anonimo non riuscito, si resta in locale:', error.message)
    return null
  }
  return data.user?.id ?? null
}

/** L'indirizzo della edge function, per cercare e leggere da BGG. */
export const funzione = (rotta: string) =>
  `${INDIRIZZO}/functions/v1/bgg/${rotta}`

/* La copertina NON si punta mai direttamente al CDN di BGG quando deve
   finire in una texture WebGL: quelle immagini non mandano header CORS e
   la texture resterebbe vuota. In un <img> invece l'indirizzo diretto va
   benissimo, ed e' anche piu' veloce. Due usi, due strade. */
export const copertinaPerTexture = (url: string) =>
  `${funzione('copertina')}?u=${encodeURIComponent(url)}`
