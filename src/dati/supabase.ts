import { createClient, type SupabaseClient, type Session } from '@supabase/supabase-js'

/* IL COLLEGAMENTO AL DATABASE.
 *
 * Due regole che tengono in piedi il resto:
 *
 * 1. SENZA CHIAVI L'APP FUNZIONA LO STESSO. Chi clona il repo e fa
 *    `npm run dev` non deve trovarsi una schermata bianca perche' manca un
 *    `.env.local`: `collegato` resta falso, lo stato vive in locale come ha
 *    sempre fatto, e non si rompe niente.
 *
 * 2. SENZA ACCESSO L'APP FUNZIONA LO STESSO. L'accesso serve a
 *    SINCRONIZZARE, non a usare l'app: chi non entra tiene i suoi dati sul
 *    telefono. Un'app che ti sbatte un login in faccia prima di farti
 *    vedere lo scaffale sarebbe peggiore di quella che sostituisce.
 *
 * La chiave qui e' quella PUBBLICABILE (`sb_publishable_...`): e' fatta per
 * stare in un browser, e a proteggere i dati e' RLS. La chiave segreta non
 * deve mai comparire da questa parte.
 */

const INDIRIZZO = import.meta.env.VITE_SUPABASE_URL
const CHIAVE = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

/** Se le chiavi non ci sono si lavora in locale e basta. */
export const collegato = Boolean(INDIRIZZO && CHIAVE)

export const supabase: SupabaseClient | null = collegato
  ? createClient(INDIRIZZO, CHIAVE, {
      auth: {
        // la sessione sopravvive alla chiusura dell'app
        persistSession: true,
        autoRefreshToken: true,
        /* Serve acceso: dopo il giro su Google si torna con il token
           nell'indirizzo, ed e' da li' che va raccolto. */
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    })
  : null

export async function sessione(): Promise<Session | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session
}

/* IL GIRO SU GOOGLE, E QUELLO CHE COMPORTA SU UN TELEFONO.
 *
 * Nel browser questo funziona e basta. Dentro Capacitor no, e va saputo
 * prima di impacchettare: l'app vive su un'origine sua, Google rimanda a
 * un indirizzo `https://` e quel ritorno non rientra da solo nella
 * WebView. Serve `@capacitor/browser` per aprire il giro fuori, un
 * redirect verso uno schema dell'app, e l'aggancio del deep link per
 * riportare dentro il token.
 *
 * Finche' si sta nel browser, `redirectTo` puo' restare l'indirizzo
 * corrente; per l'app andra' cambiato -- e l'indirizzo di ritorno va
 * autorizzato anche nel pannello Supabase, sotto le URL di redirect.
 */
export async function entraConGoogle(): Promise<{ errore?: string }> {
  if (!supabase) return { errore: 'nessun collegamento configurato' }
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  })
  return error ? { errore: error.message } : {}
}

export async function esci(): Promise<void> {
  await supabase?.auth.signOut()
}

/** Avvisa quando si entra o si esce. Restituisce come smettere di
 *  ascoltare: senza, ogni rimontaggio lascerebbe dietro un ascoltatore. */
export function osservaAccesso(quando: (s: Session | null) => void): () => void {
  if (!supabase) return () => {}
  const { data } = supabase.auth.onAuthStateChange((_evento, s) => quando(s))
  return () => data.subscription.unsubscribe()
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
