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
  server: { host: true },   // per aprire il dev server dal telefono in rete locale
})
