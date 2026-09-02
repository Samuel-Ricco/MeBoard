/* Icone disegnate a mano in SVG: nessuna dipendenza, nessun font di
   icone da scaricare, e il tratto si accorda al resto. */

type P = { size?: number }
const base = (size: number) => ({
  width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', strokeWidth: 1.9,
  strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
})

/** Libreria: scatole di costa su un ripiano, di altezze diverse. */
export const IcoLibreria = ({ size = 20 }: P) => (
  <svg {...base(size)}>
    <path d="M4 20h16" />
    <rect x="5" y="8" width="3" height="12" rx="1" />
    <rect x="9.5" y="5" width="3.5" height="15" rx="1" />
    <rect x="14.5" y="10" width="2.5" height="10" rx="1" />
  </svg>
)

/** Collezione: una pila di scatole viste di taglio. */
export const IcoCollezione = ({ size = 20 }: P) => (
  <svg {...base(size)}>
    <rect x="3.5" y="4.5" width="17" height="5" rx="1.5" />
    <rect x="3.5" y="11.5" width="17" height="5" rx="1.5" />
    <path d="M6.5 19.5h11" />
  </svg>
)

/** Catalogo: una lente sopra una griglia. */
export const IcoCatalogo = ({ size = 20 }: P) => (
  <svg {...base(size)}>
    <circle cx="11" cy="11" r="6.2" />
    <path d="M15.6 15.6 20.5 20.5" />
    <path d="M8.6 11h4.8M11 8.6v4.8" />
  </svg>
)

/** Partite: un dado. */
export const IcoPartite = ({ size = 20 }: P) => (
  <svg {...base(size)}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
    <circle cx="8.5" cy="8.5" r="1.15" fill="currentColor" stroke="none" />
    <circle cx="15.5" cy="15.5" r="1.15" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.15" fill="currentColor" stroke="none" />
  </svg>
)

export const IcoPiu = ({ size = 20 }: P) => (
  <svg {...base(size)}><path d="M12 5v14M5 12h14" /></svg>
)

export const IcoMeno = ({ size = 20 }: P) => (
  <svg {...base(size)}><path d="M5 12h14" /></svg>
)

export const IcoSu = ({ size = 20 }: P) => (
  <svg {...base(size)}><path d="M12 19V5M6 11l6-6 6 6" /></svg>
)

export const IcoGiu = ({ size = 20 }: P) => (
  <svg {...base(size)}><path d="M12 5v14M6 13l6 6 6-6" /></svg>
)

/** Desiderio: una stella, non un cuore -- il cuore vuol dire "mi piace",
 *  e qui si tratta di roba che non hai ancora. */
export const IcoStella = ({ size = 20 }: P) => (
  <svg {...base(size)}>
    <path d="m12 4 2.5 5.1 5.6.8-4 3.9 1 5.6L12 16.8 6.9 19.4l1-5.6-4-3.9 5.6-.8z" />
  </svg>
)

export const IcoProfilo = ({ size = 20 }: P) => (
  <svg {...base(size)}>
    <circle cx="12" cy="8.5" r="3.6" />
    <path d="M5 20c.9-3.4 3.6-5.2 7-5.2s6.1 1.8 7 5.2" />
  </svg>
)

export const IcoEtichetta = ({ size = 20 }: P) => (
  <svg {...base(size)}>
    <path d="M4 11.2V5a1 1 0 0 1 1-1h6.2a1 1 0 0 1 .7.3l7.6 7.6a1 1 0 0 1 0 1.4l-6.2 6.2a1 1 0 0 1-1.4 0L4.3 11.9a1 1 0 0 1-.3-.7Z" />
    <circle cx="8.4" cy="8.4" r="1.2" fill="currentColor" stroke="none" />
  </svg>
)

export const IcoMatita = ({ size = 20 }: P) => (
  <svg {...base(size)}>
    <path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17v3Z" />
    <path d="m14.5 6.5 3 3" />
  </svg>
)

export const IcoSinistra = ({ size = 20 }: P) => (
  <svg {...base(size)}><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
)

export const IcoDestra = ({ size = 20 }: P) => (
  <svg {...base(size)}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
)

export const IcoSpunta = ({ size = 20 }: P) => (
  <svg {...base(size)}><path d="m5 12.5 4.5 4.5L19 7" /></svg>
)

/* Lo zigzag disegnato a mano del riferimento: serve a rompere una
   griglia altrimenti tutta ad angoli retti. */
export const Ghirigoro = ({ w = 120, h = 26 }: { w?: number; h?: number }) => (
  <svg className="ghirigoro" width={w} height={h} viewBox="0 0 120 26" fill="none"
       stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 20 14 6l11 14L36 6l11 14L58 6l11 14L80 6l11 14L102 6l11 14" />
  </svg>
)
