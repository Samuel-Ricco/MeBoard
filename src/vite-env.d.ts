/// <reference types="vite/client" />

/* Le variabili d'ambiente dichiarate: senza questo `import.meta.env.VITE_...`
   e' `any`, e un nome scritto male non lo segnala nessuno. */
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
