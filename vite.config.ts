import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  /* Capacitor serve i file da un'origine locale: i percorsi devono essere
     relativi, se no dentro l'app non risolve piu' niente. */
  base: './',
  build: {
    outDir: 'www',
    // il WebView di Android e' Chrome aggiornato, quello di iOS segue il
    // sistema: questo e' il minimo comune ragionevole, e lascia passare
    // le feature moderne senza trasformarle
    target: 'es2022',
    sourcemap: true,
  },
  server: {
    host: true,             // per aprire il dev server dal telefono in rete locale
    /* IL WATCHER SU WINDOWS SI PERDE LE SCRITTURE.
       Sintomo: il file su disco e' aggiornato, il modulo servito no, e il
       componente semplicemente non si monta -- senza nessun errore. E'
       costato piu' di un'ora di diagnosi. Il polling e' meno elegante ma
       non sbaglia, e su un progetto di questa taglia non si sente. */
    watch: { usePolling: true, interval: 250 },
  },
})
