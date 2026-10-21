import { useEffect } from 'react'

const SITE_NAME = 'Rota151'

/** Título da aba por página: "Pikachu (#0025) · Rota151". */
export function useDocumentTitle(title: string | null) {
  useEffect(() => {
    document.title = title ? `${title} · ${SITE_NAME}` : SITE_NAME
  }, [title])
}
