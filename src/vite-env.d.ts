/// <reference types="vite/client" />

/* Le variabili d'ambiente dichiarate: senza questo `import.meta.env.VITE_...`
   e' `any`, e un nome scritto male non lo segnala nessuno. */
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  /* La chiave PUBBLICABILE del formato nuovo (`sb_publishable_...`), non la
     vecchia anon key e men che meno quella segreta. */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
