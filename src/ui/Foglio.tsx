import { useEffect } from 'react'
import { createPortal } from 'react-dom'

/* Il foglio che sale dal basso: e' il gesto giusto su un telefono, perche'
   nasce vicino al pollice invece che al centro dello schermo.

   VA IN UN PORTALE, e non e' un dettaglio. Nato dentro `.schermo` finirebbe
   nel contesto di impilamento di quello (che ha gia' il suo z-index), e il
   suo z-index non competerebbe piu' con quello della barra dei tab: la
   barra gli passerebbe sopra e coprirebbe il bottone di conferma. Appeso al
   body, i livelli tornano a confrontarsi fra pari.

   Il velo dietro e' un <button> vero e non un <div> con onClick: cosi' si
   chiude anche da tastiera e i lettori di schermo lo annunciano. */
export function Foglio({ titolo, chiudi, children }: {
  titolo: string
  chiudi: () => void
  children: React.ReactNode
}) {
  useEffect(() => {
    const suTasto = (e: KeyboardEvent) => { if (e.key === 'Escape') chiudi() }
    window.addEventListener('keydown', suTasto)
    return () => window.removeEventListener('keydown', suTasto)
  }, [chiudi])

  return createPortal(
    <>
      <button className="velo" aria-label="Chiudi" onClick={chiudi} />
      <div className="foglio" role="dialog" aria-modal="true" aria-label={titolo}>
        <div className="foglio-testa">
          <span className="foglio-titolo">{titolo}</span>
          <button className="pillola pillola-fantasma" onClick={chiudi}>Chiudi</button>
        </div>
        <div className="foglio-corpo">{children}</div>
      </div>
    </>,
    document.body,
  )
}
